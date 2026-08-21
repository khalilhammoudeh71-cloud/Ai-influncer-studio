export async function processVoiceSampleFile(file: File): Promise<{ name: string; base64: string }> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      try {
        // Native Web Audio API decodes MP4, MOV, M4A, MP3, WAV, WebM directly in browser memory!
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
        
        // Extract 4 to 12 seconds of clean audio for optimal voice cloning
        const targetDuration = Math.max(3.0, Math.min(audioBuffer.duration, 12.0));
        const sampleRate = Math.min(audioBuffer.sampleRate, 44100);
        const frameCount = Math.floor(targetDuration * sampleRate);
        const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, frameCount, sampleRate);
        
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        if (audioBuffer.duration < 3.0) {
          source.loop = true;
        }
        source.connect(offlineCtx.destination);
        source.start(0);
        
        const renderedBuffer = await offlineCtx.startRendering();
        try { audioCtx.close(); } catch {}
        
        const wavBlob = audioBufferToWavBlob(renderedBuffer);
        const wavBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.readAsDataURL(wavBlob);
        });
        
        if (wavBase64 && wavBase64.startsWith('data:audio/')) {
          console.log(`[processVoiceSampleFile] ✅ Clean WAV extracted from ${file.name} (${Math.round(wavBase64.length / 1024)} KB)`);
          return {
            name: `${file.name.replace(/\.[^/.]+$/, '')}.wav`,
            base64: wavBase64
          };
        }
      } catch (decodeErr) {
        console.warn('[decodeAudioData error, falling back to direct FileReader]:', decodeErr);
        try { audioCtx.close(); } catch {}
      }
    }
  } catch (err) {
    console.warn('[processVoiceSampleFile read error]:', err);
  }

  // Fallback: read directly as DataURL
  return new Promise<{ name: string; base64: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve({
        name: file.name,
        base64: (reader.result as string) || ''
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function trimAudioBase64To10Sec(dataUrl: string): Promise<string> {
  if (!dataUrl) return '';
  try {
    const response = await fetch(dataUrl);
    const arrayBuffer = await response.arrayBuffer();
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return dataUrl;

    const audioCtx = new AudioCtx();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    // Minimum 5.0 seconds, maximum 10.0 seconds for optimal ElevenLabs & zero-shot voice cloning
    const targetDuration = audioBuffer.duration < 5.0 ? Math.max(5.0, audioBuffer.duration * Math.ceil(5.0 / audioBuffer.duration)) : Math.min(audioBuffer.duration, 10.0);
    const sampleRate = audioBuffer.sampleRate;
    const frameCount = Math.floor(targetDuration * sampleRate);
    const offlineCtx = new OfflineAudioContext(audioBuffer.numberOfChannels, frameCount, sampleRate);

    // Loop source if original audio is shorter than 5 seconds
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    if (audioBuffer.duration < 5.0) {
      source.loop = true;
    }
    source.connect(offlineCtx.destination);
    source.start(0);

    const renderedBuffer = await offlineCtx.startRendering();
    try { audioCtx.close(); } catch {}

    const wavBlob = audioBufferToWavBlob(renderedBuffer);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(wavBlob);
    });
  } catch (err) {
    console.warn('[AudioTrim] Could not slice audio in browser, using original:', err);
    return dataUrl;
  }
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  let result: Float32Array;
  if (numChannels === 2) {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    result = new Float32Array(left.length + right.length);
    for (let i = 0; i < left.length; i++) {
      result[i * 2] = left[i];
      result[i * 2 + 1] = right[i];
    }
  } else {
    result = buffer.getChannelData(0);
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const dataByteCount = result.length * bytesPerSample;
  const headerByteCount = 44;
  const totalByteCount = headerByteCount + dataByteCount;

  const arrayBuffer = new ArrayBuffer(totalByteCount);
  const dataView = new DataView(arrayBuffer);

  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      dataView.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  dataView.setUint32(4, totalByteCount - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, format, true);
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * blockAlign, true);
  dataView.setUint16(32, blockAlign, true);
  dataView.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  dataView.setUint32(40, dataByteCount, true);

  let offset = 44;
  for (let i = 0; i < result.length; i++) {
    const s = Math.max(-1, Math.min(1, result[i]));
    dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}
