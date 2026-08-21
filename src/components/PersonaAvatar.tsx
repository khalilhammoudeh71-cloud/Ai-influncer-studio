import { useEffect, useState } from 'react';

interface PersonaAvatarProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export default function PersonaAvatar({
  src,
  alt,
  className,
  fallbackSrc = '/demo/ai_sample_influencer.png',
}: PersonaAvatarProps) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  if (!currentSrc) return null;

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        setCurrentSrc(currentSrc === fallbackSrc ? '' : fallbackSrc);
      }}
    />
  );
}
