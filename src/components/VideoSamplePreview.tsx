import React from 'react';
import { Play, Film, Sparkles, Loader2 } from 'lucide-react';

interface VideoSamplePreviewProps {
  isLoading?: boolean;
  loadingText?: string;
  previewImage?: string;
}

/**
 * Premium cinematic video preview.
 * Shows a real AI-generated sample video (Veo 3.1) or a custom generated image.
 */
const VideoSamplePreview: React.FC<VideoSamplePreviewProps> = ({
  isLoading = false,
  loadingText = 'Generating cinematic video…',
  previewImage,
}) => {
  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0B0F19] z-10 select-none overflow-hidden rounded-2xl">
        {/* Animated background with image/video still */}
        <div className="absolute inset-0 overflow-hidden">
          {previewImage ? (
             <img src={previewImage} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110" alt="Loading backdrop" />
          ) : (
            <video
              src="/demo-assets/video-preview.mp4"
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19] via-[#0B0F19]/70 to-[#0B0F19]/50" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: 'linear-gradient(120deg, transparent 30%, rgba(0,212,255,0.08) 50%, transparent 70%)',
              animation: 'videoShimmer 2s ease-in-out infinite',
            }}
          />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-[#C084FC]/20 border border-[#00D4FF]/30 flex items-center justify-center shadow-[0_0_40px_rgba(0,212,255,0.25)]">
            <Loader2 className="w-8 h-8 text-[#00D4FF] animate-spin" />
          </div>
          <p className="text-sm font-black text-white/90 animate-pulse tracking-wide">
            {loadingText}
          </p>
          <p className="text-[10px] text-[#64748B] font-semibold">This may take up to a minute</p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 select-none overflow-hidden bg-[#0B0F19] rounded-2xl">
      {previewImage ? (
        <img 
          src={previewImage} 
          className="absolute inset-0 w-full h-full object-cover" 
          alt="Generated Preview"
        />
      ) : (
        <video
          src="/demo-assets/video-preview.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/studio_preview_default.jpg"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Subtle cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F19]/50 via-transparent to-[#0B0F19]/20 pointer-events-none" />

      {/* Letterbox bars for cinematic feel */}
      <div className="absolute top-0 left-0 right-0 h-[5%] bg-black/40 pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-[5%] bg-black/40 pointer-events-none" />

      {/* Corner frame accents */}
      <div className="absolute top-[6%] left-3 w-5 h-5 border-t border-l border-white/15 rounded-tl pointer-events-none opacity-40" />
      <div className="absolute top-[6%] right-3 w-5 h-5 border-t border-r border-white/15 rounded-tr pointer-events-none opacity-40" />
      <div className="absolute bottom-[6%] left-3 w-5 h-5 border-b border-l border-white/15 rounded-bl pointer-events-none opacity-40" />
      <div className="absolute bottom-[6%] right-3 w-5 h-5 border-b border-r border-white/15 rounded-br pointer-events-none opacity-40" />

      {/* Status badge - top left */}
      <div className="absolute top-[7%] left-7 z-20 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-1.5 shadow-lg">
        <span className={`w-1.5 h-1.5 rounded-full ${previewImage ? 'bg-emerald-500' : 'bg-[#C084FC]'} animate-pulse`} />
        <span className={`text-[9px] ${previewImage ? 'text-emerald-400' : 'text-[#C084FC]'} font-extrabold tracking-wide uppercase`}>
          {previewImage ? 'Live Preview' : 'Sample Preview'}
        </span>
      </div>

      {/* Metadata chips - top right */}
      <div className="absolute top-[7%] right-7 z-20 flex items-center gap-1">
        <span className="px-2 py-0.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-md text-[8px] font-bold text-white/60 uppercase tracking-wider">4K Cinematic</span>
        <span className={`px-2 py-0.5 bg-black/50 backdrop-blur-md border border-white/10 rounded-md text-[8px] font-bold ${previewImage ? 'text-emerald-400/70' : 'text-[#C084FC]/70'} uppercase tracking-wider flex items-center gap-0.5`}>
          <Sparkles className="w-2.5 h-2.5" /> AI Studio
        </span>
      </div>

      {/* Bottom info bar */}
      <div className="absolute bottom-[6%] left-0 right-0 z-20 px-4 pointer-events-none">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${previewImage ? 'bg-emerald-500' : 'bg-white/40'}`} />
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest">
              {previewImage ? 'Ready for export' : 'Demo Mode'}
            </span>
          </div>
          <span className="text-[9px] text-white/30 font-semibold uppercase tracking-tighter">Ultra-realistic rendering enabled</span>
        </div>
      </div>
    </div>
  );
};

export default VideoSamplePreview;
