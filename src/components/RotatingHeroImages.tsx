import { motion } from 'framer-motion';

interface RotatingHeroImagesProps {
  images: string[];
}

export function RotatingHeroImages({ images }: RotatingHeroImagesProps) {
  // Triple the images to ensure seamless infinite scroll with no gaps
  const continuousImages = [...images, ...images, ...images];

  return (
    <div 
      className="relative flex items-center h-[210px] w-full overflow-hidden mb-10"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)'
      }}
    >
      <motion.div
        className="flex gap-5 min-w-max"
        animate={{ x: ['0%', `-${100 / 3}%`] }}
        transition={{ 
          ease: 'linear', 
          duration: 25,
          repeat: Infinity,
          repeatType: 'loop',
        }}
      >
        {continuousImages.map((src, i) => (
          <div 
            key={`hero-${i}`} 
            className="flex-shrink-0 w-36 sm:w-44 h-[175px] sm:h-[195px] rounded-[24px] overflow-hidden shadow-2xl border-4 border-[var(--bg-base)] relative group"
            style={{
              transform: `rotate(${(i % images.length - images.length / 2) * 2.5}deg)`,
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 z-10" />
            <img 
              src={src} 
              alt="AI Showcase" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
              loading="lazy"
            />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
