import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, ChevronDown, ChevronUp, Mic } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceNoteBubbleProps {
  audioUrl: string;
  duration?: number;
  transcript?: string;
  senderName: string;
  timestamp?: Date;
  isPersona?: boolean;
}

export default function VoiceNoteBubble({
  audioUrl,
  duration = 12,
  transcript,
  senderName,
  timestamp,
  isPersona = true
}: VoiceNoteBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration);
  const [showTranscript, setShowTranscript] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate 24 pseudo-waveform bar heights
  const bars = [25, 45, 75, 90, 60, 40, 80, 100, 70, 50, 65, 85, 95, 40, 60, 75, 90, 55, 35, 70, 85, 60, 45, 30];

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setTotalDuration(Math.round(audio.duration));
      }
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(err => {
        console.warn('Voice note playback failed:', err);
      });
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={`flex flex-col gap-1.5 max-w-sm sm:max-w-md ${isPersona ? 'items-start' : 'items-end'}`}>
      <div 
        className={`p-3.5 rounded-2xl border shadow-lg transition-all ${
          isPersona 
            ? 'bg-gradient-to-r from-[#141E30] to-[#0E1523] border-[#E7C477]/30 text-white' 
            : 'bg-[#1C283F] border-[#81D4FA]/30 text-white'
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 mb-2 text-[11px] text-[#8C909A]">
          <span className="flex items-center gap-1 font-semibold text-[#F2D58D]">
            <Mic size={12} /> Voice Note
          </span>
          <span className="font-mono text-[10px]">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        {/* Player Controls & Waveform */}
        <div className="flex items-center gap-3">
          {/* Play/Pause Button */}
          <button
            onClick={togglePlay}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-md cursor-pointer flex-shrink-0 ${
              isPersona 
                ? 'bg-gradient-to-br from-[#F2D58D] to-[#B99655] text-[#060A13] hover:scale-105 shadow-amber-950/40' 
                : 'bg-[#81D4FA] text-[#060A13] hover:scale-105'
            }`}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
          </button>

          {/* Equalizer Waveform Bars */}
          <div className="flex items-center gap-[3px] flex-1 h-8 px-1">
            {bars.map((height, i) => {
              const barProgress = (i / bars.length) * 100;
              const isPassed = barProgress <= progressPercent;

              return (
                <div
                  key={i}
                  className="flex-1 rounded-full transition-all duration-150"
                  style={{
                    height: isPlaying ? `${Math.max(20, Math.sin(Date.now() / 200 + i) * 30 + height)}%` : `${height}%`,
                    backgroundColor: isPassed 
                      ? (isPersona ? '#F2D58D' : '#81D4FA') 
                      : 'rgba(255, 255, 255, 0.15)'
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Optional Transcript Accordion */}
        {transcript && (
          <div className="mt-2.5 pt-2 border-t border-white/10">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="text-[10px] text-[#D9BA72] hover:text-[#F2D58D] flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              {showTranscript ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showTranscript ? 'Hide spoken transcript' : 'Show transcript'}
            </button>

            <AnimatePresence>
              {showTranscript && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-[#C4C7CF] italic mt-1.5 leading-relaxed bg-black/20 p-2 rounded-xl"
                >
                  "{transcript}"
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
