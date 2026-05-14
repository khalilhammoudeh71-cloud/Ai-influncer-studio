import React, { useRef, useState, useCallback, useEffect } from 'react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
}

export default function BeforeAfterSlider({ beforeImage, afterImage }: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPos, setSliderPos] = useState(50); // percentage
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setSliderPos(pct);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    updatePosition(e.touches[0].clientX);
  }, [updatePosition]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => updatePosition(e.clientX);
    const handleTouchMove = (e: TouchEvent) => updatePosition(e.touches[0].clientX);
    const handleEnd = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, updatePosition]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden rounded-2xl border border-white/20 shadow-2xl bg-black cursor-col-resize"
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* After (full background) */}
      <img
        src={afterImage}
        alt="After"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Before (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt="Before"
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Divider Line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] z-20 pointer-events-none"
        style={{ left: `${sliderPos}%`, transform: 'translateX(-50%)' }}
      >
        <div className="w-full h-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,0.5)]" />
      </div>

      {/* Handle */}
      <div
        className="absolute top-1/2 z-30 pointer-events-none"
        style={{ left: `${sliderPos}%`, transform: 'translate(-50%, -50%)' }}
      >
        <div className={`w-10 h-10 rounded-full bg-white/15 backdrop-blur-xl border-2 border-white/60 flex items-center justify-center shadow-[0_0_20px_rgba(0,212,255,0.4)] transition-transform duration-150 ${isDragging ? 'scale-110' : ''}`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8l4 4-4 4" />
            <path d="M6 8l-4 4 4 4" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 z-20 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-widest border border-white/10 shadow-lg pointer-events-none">
        Before
      </div>
      <div className="absolute top-3 right-3 z-20 px-2.5 py-1 bg-gradient-to-r from-cyan-600/80 to-blue-600/80 backdrop-blur-md rounded-lg text-[10px] font-black text-white uppercase tracking-widest border border-white/20 shadow-lg pointer-events-none">
        After
      </div>
    </div>
  );
}
