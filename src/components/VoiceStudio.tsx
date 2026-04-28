import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Play, Pause, Download, Loader2, Volume2, Send, Sparkles, AlertTriangle } from 'lucide-react';
import { Persona } from '../types';
import { textToSpeech, TTS_VOICES } from '../services/imageService';
import toast from 'react-hot-toast';

interface VoiceStudioProps {
  isOpen: boolean;
  onClose: () => void;
  persona?: Persona;
  initialScript?: string;
  onSendToTalkingHead?: (audioUrl: string, script: string) => void;
}

export default function VoiceStudio({ isOpen, onClose, persona, initialScript, onSendToTalkingHead }: VoiceStudioProps) {
  const [script, setScript] = useState(initialScript || '');
  const [selectedVoice, setSelectedVoice] = useState<string>(TTS_VOICES[3].id); // Kore default
  const [speed, setSpeed] = useState(1.0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptGenerating, setScriptGenerating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (initialScript) setScript(initialScript);
  }, [initialScript]);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (!script.trim()) return;
    setIsGenerating(true);
    setError(null);
    setAudioUrl(null);
    setIsPlaying(false);

    try {
      const result = await textToSpeech({ text: script, voiceName: selectedVoice, speed });
      setAudioUrl(result.audioUrl);
      toast.success(`Voice generated with ${result.voice}`);
    } catch (err: any) {
      setError(err.message || 'TTS generation failed');
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
        body: JSON.stringify({ topic: 'engaging social media voiceover', persona, length: '30-second' }),
      });
      const data = await res.json();
      if (data.script) setScript(data.script);
    } catch {
      toast.error('Failed to generate script');
    } finally {
      setScriptGenerating(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `voice_${persona?.name?.replace(/\s+/g, '_') || 'clip'}_${Date.now()}.wav`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 lg:left-16 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-gradient-to-r from-cyan-950/50 to-blue-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30">
              <Mic size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Voice Studio</h3>
              <p className="text-[10px] text-cyan-300/80">AI Text-to-Speech • Gemini TTS</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={18} className="text-[var(--text-secondary)]" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Script Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Script</label>
              {persona && (
                <button
                  onClick={handleGenerateScript}
                  disabled={scriptGenerating}
                  className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                >
                  {scriptGenerating ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                  {scriptGenerating ? 'Generating...' : 'AI Generate Script'}
                </button>
              )}
            </div>
            <textarea
              value={script}
              onChange={e => setScript(e.target.value)}
              placeholder="Type or paste your script here... The AI will convert it to natural speech."
              className="w-full h-32 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-white outline-none resize-none focus:ring-2 focus:ring-cyan-500/50"
            />
            <p className="text-[9px] text-[var(--text-muted)] text-right">{script.length} characters</p>
          </div>

          {/* Voice Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Voice</label>
            <div className="grid grid-cols-5 gap-2">
              {TTS_VOICES.map(voice => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    selectedVoice === voice.id
                      ? 'border-cyan-500 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                      : 'border-[var(--border-default)] hover:border-[var(--border-strong)] bg-[var(--bg-elevated)]'
                  }`}
                >
                  <p className="text-xs font-bold text-white">{voice.name}</p>
                  <p className="text-[8px] text-[var(--text-muted)] mt-0.5">{voice.gender}</p>
                  <p className="text-[7px] text-cyan-400/60 mt-0.5">{voice.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Speed Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-tertiary)]">Speed</label>
              <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-full">{speed.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.0}
              step={0.1}
              value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-cyan-500"
            />
            <div className="flex justify-between text-[9px] text-[var(--text-muted)]">
              <span>0.5x Slow</span>
              <span>1.0x Normal</span>
              <span>2.0x Fast</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              <AlertTriangle size={14} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Audio Player */}
          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/20 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Volume2 size={14} className="text-cyan-400" />
                  <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">Generated Audio</span>
                </div>
                <span className="text-[9px] text-[var(--text-muted)]">{TTS_VOICES.find(v => v.id === selectedVoice)?.name}</span>
              </div>

              {/* Waveform placeholder */}
              <div className="h-12 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center gap-0.5 px-3 overflow-hidden">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-300 ${isPlaying ? 'bg-cyan-400' : 'bg-cyan-500/30'}`}
                    style={{
                      height: `${Math.random() * 100}%`,
                      minHeight: '4px',
                      animationDelay: `${i * 50}ms`,
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayback}
                  className="w-10 h-10 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center text-white shadow-lg shadow-cyan-500/30 transition-all active:scale-95"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-xs font-bold text-white border border-[var(--border-default)] flex items-center gap-2 transition-colors"
                >
                  <Download size={14} /> Download
                </button>
                {onSendToTalkingHead && (
                  <button
                    onClick={() => onSendToTalkingHead(audioUrl, script)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-violet-500 text-xs font-bold text-white flex items-center gap-2 shadow-lg hover:brightness-110 transition-all"
                  >
                    <Send size={14} /> Send to Talking Head
                  </button>
                )}
              </div>

              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                preload="auto"
              />
            </motion.div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !script.trim()}
            className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
              isGenerating || !script.trim()
                ? 'bg-white/5 text-white/30'
                : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:brightness-110 text-white'
            }`}
          >
            {isGenerating ? (
              <><Loader2 size={18} className="animate-spin" /> Generating Speech...</>
            ) : (
              <><Mic size={18} /> Generate Voice</>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
