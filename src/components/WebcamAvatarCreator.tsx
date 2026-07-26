import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Mic, Check, Loader2, RefreshCw, AlertTriangle, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

async function authFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = { ...options.headers as Record<string, string> };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, headers });
}

interface WebcamAvatarCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  personaName: string;
  onComplete: (avatarId: string, voiceId?: string, portraitBase64?: string) => void;
}

type RecordingState = 'idle' | 'requesting' | 'ready' | 'recording' | 'review' | 'saving';

export default function WebcamAvatarCreator({
  isOpen,
  onClose,
  personaName,
  onComplete,
}: WebcamAvatarCreatorProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [saveStep, setSaveStep] = useState('');
  const [micLevel, setMicLevel] = useState(0);
  const [isPlayingReview, setIsPlayingReview] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clean up media streams and animations on unmount
  useEffect(() => {
    return () => {
      stopTracks();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const stopTracks = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const startCamera = async () => {
    setState('requesting');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 640, facingMode: 'user' },
        audio: true,
      });

      setStream(mediaStream);
      setState('ready');

      // Set up video preview source
      if (videoElementRef.current) {
        videoElementRef.current.srcObject = mediaStream;
      }

      // Set up simple mic feedback
      setupMicFeedback(mediaStream);
    } catch (err: any) {
      console.error('[Webcam] Permission error:', err);
      toast.error('Failed to access webcam/microphone. Please check permissions.');
      setState('idle');
    }
  };

  const setupMicFeedback = (mediaStream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioCtx();
      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setMicLevel(average / 128); // Normalized level (approx 0 to 1)
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.warn('AudioContext visualization not supported:', e);
    }
  };

  const startRecording = () => {
    if (!stream) return;
    setRecordedChunks([]);
    setCountdown(10);
    setState('recording');

    // Specify MIME type support
    let options = { mimeType: 'video/webm;codecs=vp9,opus' };
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/webm;codecs=vp8,opus' };
    }
    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options = { mimeType: 'video/mp4' };
    }

    try {
      const recorder = new MediaRecorder(stream, options);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: chunks[0]?.type || 'video/webm' });
        setVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setState('review');
        stopTracks();
      };

      recorder.start(200);
      setMediaRecorder(recorder);

      // Start countdown timer
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            recorder.stop();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('[Webcam] Recording initialization failed:', err);
      toast.error('Failed to initialize recording.');
      setState('ready');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
  };

  const resetRecording = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoBlob(null);
    setRecordedChunks([]);
    setState('idle');
    startCamera();
  };

  const extractVideoFrame = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.src = URL.createObjectURL(blob);

      video.onloadeddata = () => {
        // Seek to 0.5s to get a stable open-eyed frame
        video.currentTime = 0.5;
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 640;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
            resolve(dataUrl);
          } else {
            reject(new Error('Canvas context unavailable'));
          }
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(video.src);
        }
      };

      video.onerror = (err) => {
        reject(new Error('Failed to load video for thumbnail extraction'));
        URL.revokeObjectURL(video.src);
      };
    });
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleConfirm = async () => {
    if (!videoBlob) return;
    setState('saving');
    setSaveStep('Extracting avatar frame...');

    try {
      // 1. Extract first frame for HeyGen avatar image
      const portraitBase64 = await extractVideoFrame(videoBlob);

      // 2. Convert recorded video to base64 for voice cloning
      setSaveStep('Converting video data...');
      const videoBase64 = await blobToBase64(videoBlob);

      // 3. Create HeyGen Photo Avatar
      setSaveStep('Uploading avatar to HeyGen...');
      const avatarRes = await authFetch('/api/heygen-create-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${personaName}'s Video Avatar`, imageBase64: portraitBase64 }),
      });
      const avatarData = await avatarRes.json();
      if (!avatarRes.ok) throw new Error(avatarData.error || 'Failed to create HeyGen avatar');
      const avatarId = avatarData.avatarId;

      // 4. Clone voice on ElevenLabs
      setSaveStep('Cloning voice on ElevenLabs...');
      let voiceId: string | undefined;
      try {
        const voiceRes = await authFetch('/api/elevenlabs-clone-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${personaName}'s Clone`,
            description: `Cloned voice recorded from webcam for persona ${personaName}`,
            sampleBase64: videoBase64,
          }),
        });
        if (voiceRes.ok) {
          const voiceData = await voiceRes.json();
          voiceId = voiceData.voiceId;
          toast.success('Voice cloned successfully!');
        } else {
          console.warn('ElevenLabs voice cloning bypassed or failed.');
        }
      } catch (err) {
        console.warn('Voice cloning error (non-fatal):', err);
      }

      setSaveStep('Done!');
      toast.success('Avatar and voice successfully created!');
      onComplete(avatarId, voiceId, portraitBase64);
      onClose();
    } catch (err: any) {
      console.error('[AvatarCreator] Error:', err);
      toast.error(err.message || 'Failed to compile and create avatar.');
      setState('review');
    }
  };

  const togglePlayReview = () => {
    if (reviewVideoRef.current) {
      if (isPlayingReview) {
        reviewVideoRef.current.pause();
      } else {
        reviewVideoRef.current.play();
      }
      setIsPlayingReview(!isPlayingReview);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col p-6 space-y-6 z-10 select-none text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 animate-pulse">
              <Video size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Create Video Avatar</h3>
              <p className="text-[10px] text-emerald-300/80">Record 10s video with voice for {personaName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Main Display Area */}
        <div className="aspect-square w-full max-w-[340px] mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500/20 bg-[#0B0F17] relative flex items-center justify-center shadow-inner">
          {state === 'idle' && (
            <div className="text-center p-6 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mx-auto">
                <Video size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">Camera Permission Required</h4>
                <p className="text-[10px] text-[var(--text-muted)] max-w-[200px] mx-auto leading-relaxed">
                  We need webcam and microphone access to record your custom talking avatar look and clone your voice.
                </p>
              </div>
              <button
                onClick={startCamera}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 font-bold text-xs text-white transition-colors"
              >
                Enable Camera & Mic
              </button>
            </div>
          )}

          {state === 'requesting' && (
            <div className="text-center space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
              <p className="text-[10px] text-[var(--text-muted)] animate-pulse">Initializing webcam...</p>
            </div>
          )}

          {/* Camera Streaming / Recording */}
          {(state === 'ready' || state === 'recording') && (
            <>
              <video
                ref={videoElementRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover -scale-x-100"
              />
              
              {/* Mic Visualizer Overlay */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center gap-1.5 px-3 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/5">
                <Mic size={12} className={state === 'recording' ? 'text-emerald-400 animate-pulse' : 'text-white/60'} />
                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, micLevel * 100)}%` }}
                  />
                </div>
              </div>

              {state === 'recording' && (
                <div className="absolute top-4 right-4 flex items-center gap-2 px-2.5 py-1 bg-rose-500/80 backdrop-blur-md rounded-lg border border-rose-500/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  <span className="text-[10px] font-black text-white uppercase tracking-widest tabular-nums">{countdown}s</span>
                </div>
              )}
            </>
          )}

          {/* Video Review Playback */}
          {state === 'review' && videoUrl && (
            <>
              <video
                ref={reviewVideoRef}
                src={videoUrl}
                playsInline
                className="w-full h-full object-cover"
                onEnded={() => setIsPlayingReview(false)}
              />
              <button
                onClick={togglePlayReview}
                className="absolute w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white backdrop-blur-md border border-white/10"
              >
                {isPlayingReview ? <Pause size={18} /> : <Play size={18} className="ml-1" />}
              </button>
            </>
          )}

          {/* Processing / Saving */}
          {state === 'saving' && (
            <div className="text-center p-6 space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mx-auto" />
              <div>
                <p className="text-xs font-bold text-white mb-1">Synthesizing Avatar & Voice</p>
                <p className="text-[10px] text-[var(--text-muted)] animate-pulse">{saveStep}</p>
              </div>
              <div className="w-48 h-1 bg-white/5 border border-white/10 rounded-full mx-auto overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 animate-[loading_2s_infinite]" />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5 shrink-0">
          {state === 'ready' && (
            <button
              onClick={startRecording}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 font-bold text-xs text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-lg"
            >
              <Video size={14} /> Start 10s Recording
            </button>
          )}

          {state === 'recording' && (
            <button
              onClick={stopRecording}
              className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
            >
              <Check size={14} /> Finish Recording
            </button>
          )}

          {state === 'review' && (
            <div className="flex gap-3 w-full">
              <button
                onClick={resetRecording}
                className="flex-1 py-3 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] font-bold text-xs text-[var(--text-secondary)] hover:text-white border border-[var(--border-default)] flex items-center justify-center gap-1.5 transition-colors"
              >
                <RefreshCw size={12} /> Retake Video
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-lg active:scale-[0.98] transition-all"
              >
                <Check size={14} /> Confirm & Create
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
