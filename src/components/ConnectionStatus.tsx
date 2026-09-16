import { useEffect, useState } from 'react';

export default function ConnectionStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);
  return online ? null : (
    <div role="status" className="shrink-0 border-b border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-sm text-[var(--text-primary)]">
      You appear to be offline. Calls, AI replies and uploads need a connection.
    </div>
  );
}
