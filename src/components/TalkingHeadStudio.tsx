import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Pause, Download, Loader2, Upload, Mic, Camera, Video, AlertTriangle, Sparkles } from 'lucide-react';
import { Persona } from '../types';
import { generateTalkingHead, TTS_VOICES } from '../services/imageService';
import { processImageFile } from '../utils/imageProcessing';
import toast from 'react-hot-toast';

interface TalkingHeadStudioProps {
  isOpen: boolean;
  onClose: () => void;
  persona?: Persona;
  initialAudioUrl?: string;
  initialScript?: string;
  onSaveVideo?: (videoUrl: string) => void;
}

export default function TalkingHeadStudio({
  isOpen,
  onClose,
  persona,
  initialAudioUrl,
  initialScript,
  onSaveVideo,
}: TalkingHeadStudioProps) {
  const [portraitImage, setPortraitImage] = useState<string | null>(persona?.referenceImage || null);
  const [script, setScript] = useState(initialScript || '');
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [inputMode, setInputMode] = useState<'script' | 'audio'>(initialAudioUrl ? 'audio' : 'script');
  const [selectedVoice, setSelectedVoice] = useState<string>(TTS_VOICES[3].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const [scriptGenerating, setScriptGenerating] = useState(false);

  const portraitInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (initialAudioUrl) { setAudioUrl(initialAudioUrl); setInputMode('audio'); }
    if (initialScript) setScript(initialScript);
  }, [initialAudioUrl, initialScript]);

  useEffect(() => {
    if (persona?.referenceImage && !portraitImage) {
      setPortraitImage(persona.referenceImage);
    }
  }, [persona]);

  const handleGenerate = async () => {
    if (!portraitImage) return toast.error('Upload a portrait image first');
    if (inputMode === 'script' && !script.trim()) return toast.error('Enter a script');
    if (inputMode === 'audio' && !audioUrl) return toast.error('Upload an audio file');

    setIsGenerating(true);
    setError(null);
    setVideoUrl(null);
    setProgress('Preparing inputs...');

    try {
      const params: any = { portraitImage };

      if (inputMode === 'audio' && audioUrl) {
        params.audioUrl = audioUrl;
        setProgress('Sending to lipsync engine...');
      } else {
        params.script = script;
        params.voiceName = selectedVoice;
        setProgress('Generating voice from script...');
      }

      const result = await generateTalkingHead(params);
      setVideoUrl(result.videoUrl);
      setProgress('');
      toast.success('Talking head video generated!');
    } catch (err: any) {
      setError(err.message || 'Generation failed');
      setProgress('');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!persona) return;
    setScriptGenerating(true);
    try {
      const res = await fetch('/api/generate-voice-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'engaging social media voiceover', persona, length: '15-second' }),
      });
      const data = await res.json();
      if (data.script) setScript(data.script);
    } catch {
      toast.error('Failed to generate script');
    } finally {
      setScriptGenerating(false);
    }
  };

  const handleDownloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `talking_head_${Date.now()}.mp4`;
    a.target = '_blank';
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 lg:left-16 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-5xl max-h-[90vh] bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-gradient-to-r from-pink-950/50 to-violet-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/30">
              <Video size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Talking Head Studio</h3>
              <p className="text-[10px] text-pink-300/80">AI Lip-Sync Video • LTX Lipsync</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Left: Controls */}
          <div className="w-full lg:w-[420px] shrink-0 border-b lg:border-b-0 lg:border-r border-[var(--border-subtle)] overflow-y-auto p-5 space-y-5 bg-[var(--bg-base)]">

            {/* Portrait Upload */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Portrait Image</label>
              {portraitImage ? (
                <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden border-2 border-pink-500/30 group">
                  <img src={portraitImage} alt="Portrait" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <button onClick={() => portraitInputRef.current?.click()} className="p-2 bg-white/20 rounded-full text-white hover:bg-white/30"><Camera size={16} /></button>
                    <button onClick={() => setPortraitImage(null)} className="p-2 bg-rose-500/80 rounded-full text-white hover:bg-rose-500"><X size={16} /></button>
                  </div>
                  {persona?.referenceImage === portraitImage && (
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-purple-500/80 rounded-lg text-[8px] font-bold text-white">Persona</div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => portraitInputRef.current?.click()}
                  className="w-full aspect-video rounded-2xl border-2 border-dashed border-pink-500/30 flex flex-col items-center justify-center gap-3 text-pink-300 hover:text-white hover:border-pink-500/60 hover:bg-pink-500/5 transition-all"
                >
                  <Upload size={28} />
                  <span className="text-xs font-bold">Upload Portrait Photo</span>
                  <span className="text-[9px] text-[var(--text-muted)]">Clear face, front-facing works best</span>
                </button>
              )}
              <input
                type="file" ref={portraitInputRef} hidden accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try { setPortraitImage(await processImageFile(file)); } catch { toast.error('Failed to process image'); }
                  e.target.value = '';
                }}
              />
            </div>

            {/* Input Mode Toggle */}
            <div className="flex bg-[var(--bg-elevated)] rounded-xl p-1 gap-1">
              <button
                onClick={() => setInputMode('script')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  inputMode === 'script' ? 'bg-gradient-to-r from-pink-600 to-violet-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Sparkles size={13} /> Write Script
              </button>
              <button
                onClick={() => setInputMode('audio')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
                  inputMode === 'audio' ? 'bg-gradient-to-r from-pink-600 to-violet-600 text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                <Mic size={13} /> Upload Audio
              </button>
            </div>

            {inputMode === 'script' ? (
              <>
                {/* Script Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Script</label>
                    {persona && (
                      <button
                        onClick={handleGenerateScript}
                        disabled={scriptGenerating}
                        className="text-[10px] font-bold text-pink-400 hover:text-pink-300 flex items-center gap-1 transition-colors"
                      >
                        {scriptGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                        AI Generate
                      </button>
                    )}
                  </div>
                  <textarea
                    value={script}
                    onChange={e => setScript(e.target.value)}
                    placeholder="Type or paste the script your avatar will speak..."
                    className="w-full h-24 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white outline-none resize-none focus:ring-2 focus:ring-pink-500/50"
                  />
                </div>

                {/* Voice Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">TTS Voice</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {TTS_VOICES.map(voice => (
                      <button
                        key={voice.id}
                        onClick={() => setSelectedVoice(voice.id)}
                        className={`p-2 rounded-lg border transition-all text-center ${
                          selectedVoice === voice.id
                            ? 'border-pink-500 bg-pink-500/10'
                            : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                        }`}
                      >
                        <p className="text-[10px] font-bold text-white">{voice.name}</p>
                        <p className="text-[7px] text-[var(--text-muted)]">{voice.gender}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Audio File</label>
                {audioUrl ? (
                  <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-pink-500/20 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center">
                      <Mic size={14} className="text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">Audio loaded</p>
                      <audio src={audioUrl} controls className="w-full h-6 mt-1" />
                    </div>
                    <button onClick={() => setAudioUrl(null)} className="p-1.5 bg-rose-500/20 rounded-full hover:bg-rose-500/40 text-rose-400">
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => audioInputRef.current?.click()}
                    className="w-full py-6 rounded-2xl border-2 border-dashed border-pink-500/30 flex flex-col items-center gap-2 text-pink-300 hover:text-white hover:border-pink-500/60 transition-all"
                  >
                    <Upload size={24} />
                    <span className="text-xs font-bold">Upload Audio (.mp3, .wav)</span>
                  </button>
                )}
                <input
                  type="file" ref={audioInputRef} hidden accept="audio/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setAudioUrl(ev.target?.result as string);
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                <AlertTriangle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !portraitImage || (inputMode === 'script' ? !script.trim() : !audioUrl)}
              className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                isGenerating || !portraitImage || (inputMode === 'script' ? !script.trim() : !audioUrl)
                  ? 'bg-white/5 text-white/30'
                  : 'bg-gradient-to-r from-pink-500 to-violet-500 hover:brightness-110 text-white'
              }`}
            >
              {isGenerating ? (
                <><Loader2 size={18} className="animate-spin" /> {progress || 'Generating...'}</>
              ) : (
                <><Video size={18} /> Generate Talking Head</>
              )}
            </button>

            <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-muted)] text-[9px] leading-relaxed">
              <strong className="text-[var(--text-tertiary)]">How it works:</strong> Your portrait image will be animated with lip-sync movements matching the audio. For best results, use a clear front-facing photo with the mouth closed.
            </div>
          </div>

          {/* Right: Preview */}
          <div className="flex-1 bg-black flex items-center justify-center p-8 overflow-hidden">
            {isGenerating && (
              <div className="flex flex-col items-center gap-4 text-white">
                <div className="relative">
                  {portraitImage && (
                    <img src={portraitImage} alt="" className="w-48 h-48 rounded-2xl object-cover opacity-40 blur-sm" />
                  )}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 size={40} className="animate-spin text-pink-400" />
                  </div>
                </div>
                <div className="px-4 py-2 bg-black/60 backdrop-blur-md rounded-full text-sm font-bold text-pink-300">
                  {progress || 'Processing...'}
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">This may take 1-3 minutes</p>
              </div>
            )}

            {videoUrl && !isGenerating && (
              <div className="relative max-w-xl w-full">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  autoPlay
                  loop
                  className="w-full rounded-2xl border border-white/20 shadow-2xl"
                />
                <div className="flex items-center justify-center gap-3 mt-4">
                  <button
                    onClick={handleDownloadVideo}
                    className="px-5 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-xs font-bold text-white border border-[var(--border-default)] flex items-center gap-2 transition-colors"
                  >
                    <Download size={14} /> Download Video
                  </button>
                  {onSaveVideo && (
                    <button
                      onClick={() => { onSaveVideo(videoUrl); toast.success('Video saved!'); }}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-xs font-bold text-white flex items-center gap-2 shadow-lg hover:brightness-110 transition-all"
                    >
                      <Camera size={14} /> Save to Library
                    </button>
                  )}
                </div>
              </div>
            )}

            {!videoUrl && !isGenerating && (
              <div className="text-[var(--text-tertiary)] flex flex-col items-center gap-4 opacity-50">
                <Video size={56} />
                <p className="text-sm font-bold">Your talking head video will appear here</p>
                <p className="text-xs">Upload a portrait + provide audio or script</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
