import { useState } from 'react';
import { CheckCircle2, Eye, EyeOff, KeyRound, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface PasswordRecoveryViewProps {
  onComplete: () => void;
  onCancel: () => void;
}

export default function PasswordRecoveryView({ onComplete, onCancel }: PasswordRecoveryViewProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldError, setFieldError] = useState<{ field: 'password' | 'confirm' | 'form'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 8) {
      setFieldError({ field: 'password', message: 'Use at least 8 characters for your new password.' });
      return;
    }

    if (password !== confirmPassword) {
      setFieldError({ field: 'confirm', message: 'The passwords do not match.' });
      return;
    }

    setFieldError(null);
    setIsSaving(true);
    let error;
    try { ({ error } = await supabase.auth.updateUser({ password })); }
    catch { error = { message: 'Could not connect. Check your connection and try again.' }; }
    setIsSaving(false);

    if (error) {
      setFieldError({ field: 'form', message: error.message || 'We could not update your password. Please request a new link.' });
      return;
    }

    setPassword('');
    setConfirmPassword('');
    setIsComplete(true);
  };

  return (
    <div className="studio-public-theme min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-20%] left-[-10%] w-[65%] h-[65%] rounded-full bg-[var(--accent-primary)]/[0.09] blur-[160px]" />
        <div className="absolute bottom-[-25%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--accent-secondary)]/[0.06] blur-[160px]" />
      </div>

      <main className="w-full max-w-md rounded-3xl border border-[var(--border-default)] bg-[var(--bg-modal)]/95 p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10">
        {isComplete ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 mb-6">
              <CheckCircle2 size={30} />
            </div>
            <h1 className="text-2xl font-black mb-3">Password updated</h1>
            <p className="text-sm text-white/60 leading-relaxed mb-7">
              Your new password is active. You can continue directly to your studio.
            </p>
            <button
              type="button"
              onClick={onComplete}
              className="btn-gold-primary w-full py-3.5 text-sm active:scale-[0.98] cursor-pointer"
            >
              Continue to Studio
            </button>
          </div>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/25 text-[var(--accent-primary)] mb-6">
              <KeyRound size={26} />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)] mb-3">Account recovery</p>
            <h1 className="text-2xl font-black mb-2">Create a new password</h1>
            <p className="text-sm text-white/60 leading-relaxed mb-7">
              Choose a password you have not used before. It must contain at least 8 characters.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block mb-1.5">
                  New password
                </label>
                <input
                  id="new-password"
                  aria-invalid={fieldError?.field === 'password'}
                  aria-describedby={fieldError?.field === 'password' ? 'password-error' : undefined}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="luxury-input w-full px-4 py-3.5 text-sm"
                />
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-[10px] font-bold text-[var(--accent-primary)] uppercase tracking-wider block mb-1.5">
                  Confirm new password
                </label>
                <input
                  id="confirm-password"
                  aria-invalid={fieldError?.field === 'confirm'}
                  aria-describedby={fieldError?.field === 'confirm' ? 'confirm-error' : undefined}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className="luxury-input w-full px-4 py-3.5 text-sm"
                />
              </div>
              {fieldError && <p id={fieldError.field === 'password' ? 'password-error' : fieldError.field === 'confirm' ? 'confirm-error' : 'recovery-error'} role="alert" className="text-sm text-rose-300">{fieldError.message}</p>}
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-pressed={showPassword} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}{showPassword ? 'Hide passwords' : 'Show passwords'}</button>
              <div className="flex items-center gap-2 text-xs text-white/45 pt-1">
                <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
                Your password is managed securely by your account provider.
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-gold-primary w-full py-3.5 text-sm active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>

            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="w-full mt-4 py-2.5 text-white/45 hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Back to Sign In
            </button>
          </>
        )}
      </main>
    </div>
  );
}
