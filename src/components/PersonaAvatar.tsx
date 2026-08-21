import { useEffect, useState } from 'react';

interface PersonaAvatarProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK = '/demo/ai_sample_influencer.png';

export default function PersonaAvatar({
  src,
  alt,
  className,
  fallbackSrc,
}: PersonaAvatarProps) {
  const sources = Array.from(new Set([src, fallbackSrc, DEFAULT_FALLBACK].filter(Boolean))) as string[];
  const sourceKey = sources.join('|');
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [sourceKey]);

  const currentSrc = sources[sourceIndex];
  if (!currentSrc) return null;

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      onError={() => {
        setSourceIndex(index => index + 1);
      }}
    />
  );
}
