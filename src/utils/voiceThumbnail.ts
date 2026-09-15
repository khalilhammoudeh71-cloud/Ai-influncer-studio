export type VoiceSample = { name: string; base64: string; thumbnail?: string };

/** Capture a small frame without retaining an object URL or uploading the video. */
export function videoThumbnail(file: File): Promise<string | undefined> {
  return new Promise(resolve => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let done = false;
    const finish = (value?: string) => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      video.removeAttribute('src'); video.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timeout = setTimeout(() => finish(), 12000);
    video.muted = true; video.preload = 'auto'; video.playsInline = true;
    video.onerror = () => finish();
    const capture = () => {
      try {
        if (!video.videoWidth || !video.videoHeight) return finish();
        const scale = Math.min(1, 360 / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) return finish();
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        finish(canvas.toDataURL('image/jpeg', 0.8));
      } catch { finish(); }
    };
    video.onloadeddata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0.2) video.currentTime = Math.min(1, video.duration / 2);
      else capture();
    };
    video.onseeked = capture;
    video.src = url;
  });
}
