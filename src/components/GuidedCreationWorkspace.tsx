import {
  ArrowRight,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Video,
  WandSparkles,
} from 'lucide-react';
import type { Persona } from '../types';
import type { CreationOutcome } from '../types/creation';

type GuidedMode = 'image' | 'video' | 'talking-avatar';

interface OutcomeOption {
  id: CreationOutcome;
  label: string;
  detail: string;
  icon: string;
}

interface FormatOption {
  value: string;
  label: string;
}

interface GuidedCreationWorkspaceProps {
  mode: GuidedMode;
  onModeChange: (mode: GuidedMode) => void;
  onEnhance: () => void;
  outcomes: OutcomeOption[];
  outcome: CreationOutcome;
  onOutcomeChange: (outcome: CreationOutcome) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  promptLabel: string;
  promptPlaceholder: string;
  format: string;
  formatOptions: FormatOption[];
  onFormatChange: (format: string) => void;
  personas: Persona[];
  selectedPersonaId: string;
  onPersonaChange: (personaId: string) => void;
  estimate: string;
  timeEstimate: string;
  isGenerating: boolean;
  canGenerate: boolean;
  actionLabel: string;
  onGenerate: () => void;
  fineTuneOpen: boolean;
  onToggleFineTune: () => void;
}

const MODE_OPTIONS = [
  { id: 'image' as const, label: 'Image', detail: 'Create a visual', icon: ImageIcon },
  { id: 'video' as const, label: 'Video', detail: 'Generate motion', icon: Video },
  { id: 'talking-avatar' as const, label: 'Talking avatar', detail: 'Photo + voice', icon: UserRound },
];

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-elevated)]';

export default function GuidedCreationWorkspace({
  mode,
  onModeChange,
  onEnhance,
  outcomes,
  outcome,
  onOutcomeChange,
  prompt,
  onPromptChange,
  promptLabel,
  promptPlaceholder,
  format,
  formatOptions,
  onFormatChange,
  personas,
  selectedPersonaId,
  onPersonaChange,
  estimate,
  timeEstimate,
  isGenerating,
  canGenerate,
  actionLabel,
  onGenerate,
  fineTuneOpen,
  onToggleFineTune,
}: GuidedCreationWorkspaceProps) {
  const selectedOutcome = outcomes.find(option => option.id === outcome);
  const selectedPersona = personas.find(persona => persona.id === selectedPersonaId);
  const selectedFormat = formatOptions.find(option => option.value === format);

  return (
    <section aria-labelledby="guided-create-heading" className="mb-6 overflow-hidden rounded-3xl border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-xl">
      <div className="border-b border-[var(--border-subtle)] bg-[var(--gradient-surface)] p-5 sm:p-7">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wide text-[var(--accent-primary)]">
          <Sparkles size={15} aria-hidden="true" /> Your creative workspace
        </div>
        <h2 id="guided-create-heading" className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">Bring your idea to life.</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-tertiary)]">Choose a format, set the style, and tell us what you imagine.</p>
        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" aria-label="Creation type">
          {MODE_OPTIONS.map(option => {
            const Icon = option.icon;
            const active = option.id === mode;
            return (
              <button key={option.id} type="button" onClick={() => onModeChange(option.id)} aria-pressed={active}
                className={`${FOCUS} flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${active ? 'border-[var(--gold-border-active)] bg-[var(--accent-muted)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-input)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'}`}>
                <Icon size={18} aria-hidden="true" /> {option.label}
                {active && <Check size={14} aria-hidden="true" />}
              </button>
            );
          })}
          <button type="button" onClick={onEnhance} className={`${FOCUS} flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-overlay)] sm:ml-auto`}>
            <WandSparkles size={18} aria-hidden="true" /> Enhance
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(240px,0.85fr)_minmax(0,1.6fr)]">
        <div className="min-w-0 border-b border-[var(--border-subtle)] p-5 sm:p-7 lg:border-b-0 lg:border-r">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Choose your style</h3>
          <p className="mb-4 mt-1 text-xs leading-5 text-[var(--text-tertiary)]">A starting point for the look and feel.</p>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="Creative style">
            {outcomes.map(option => {
              const active = option.id === outcome;
              return (
                <button key={option.id} type="button" onClick={() => onOutcomeChange(option.id)} aria-pressed={active}
                  className={`${FOCUS} flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition-colors ${active ? 'border-[var(--gold-border-active)] bg-[var(--accent-subtle)]' : 'border-transparent hover:border-[var(--border-subtle)] hover:bg-[var(--bg-input)]'}`}>
                  <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs ${active ? 'bg-[var(--accent-muted)] text-[var(--accent-primary)]' : 'bg-[var(--bg-overlay)] text-[var(--text-tertiary)]'}`}>{option.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-medium ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'}`}>{option.label}</span>
                    <span className="mt-1 hidden text-xs leading-5 text-[var(--text-tertiary)] sm:block">{option.detail}</span>
                  </span>
                  {active && <Check size={15} className="mt-2 hidden shrink-0 text-[var(--accent-primary)] sm:block" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 p-5 sm:p-7">
          <label htmlFor="guided-creation-prompt" className="block text-base font-semibold text-[var(--text-primary)]">{promptLabel}</label>
          <p id="guided-prompt-help" className="mb-4 mt-1 text-sm leading-6 text-[var(--text-tertiary)]">
            {mode === 'talking-avatar' ? 'Write naturally, as if you were speaking to your audience.' : 'Include the subject, setting, lighting, and mood. A little detail goes a long way.'}
          </p>
          <textarea id="guided-creation-prompt" value={prompt} onChange={event => onPromptChange(event.target.value)} placeholder={promptPlaceholder}
            aria-describedby="guided-prompt-help" rows={7}
            className={`${FOCUS} min-h-48 w-full resize-y rounded-2xl border border-[var(--border-default)] bg-[var(--bg-input)] p-4 text-base leading-7 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]`} />

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Format
              <span className="relative mt-2 block">
                <select value={format} onChange={event => onFormatChange(event.target.value)} className={`${FOCUS} min-h-12 w-full cursor-pointer appearance-none rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] py-3 pl-3 pr-9 text-sm text-[var(--text-primary)]`}>
                  {formatOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden="true" />
              </span>
            </label>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">
              Persona or subject
              <span className="relative mt-2 block">
                <select value={selectedPersonaId} onChange={event => onPersonaChange(event.target.value)} className={`${FOCUS} min-h-12 w-full cursor-pointer appearance-none rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] py-3 pl-3 pr-9 text-sm text-[var(--text-primary)]`}>
                  <option value="none">Create without a persona</option>
                  {personas.map(persona => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" aria-hidden="true" />
              </span>
            </label>
          </div>

          <button type="button" onClick={onToggleFineTune} aria-expanded={fineTuneOpen} aria-controls="advanced-creation-controls"
            className={`${FOCUS} mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-1 text-sm font-medium text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent-primary)]`}>
            <SlidersHorizontal size={16} aria-hidden="true" /> {fineTuneOpen ? 'Hide advanced settings' : 'References & advanced settings'}
            <ChevronDown size={14} aria-hidden="true" className={`transition-transform ${fineTuneOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap gap-2 text-xs text-[var(--text-secondary)]" aria-label="Creation summary">
              {[selectedOutcome?.label, selectedFormat?.label, selectedPersona?.name].filter(Boolean).map((label, index) => (
                <span key={index} className="rounded-md bg-[var(--bg-overlay)] px-2.5 py-1.5">{label}</span>
              ))}
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{estimate}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-tertiary)]">{timeEstimate} · Keep working while we create.</p>
            <button type="button" onClick={onGenerate} disabled={!canGenerate || isGenerating} aria-busy={isGenerating}
              className={`${FOCUS} btn-gold-primary mt-5 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-45`}>
              {isGenerating ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
              {isGenerating ? 'Creating…' : actionLabel}
              {!isGenerating && <ArrowRight size={16} aria-hidden="true" />}
            </button>
            {!prompt.trim() && <p className="mt-3 text-center text-xs text-[var(--text-tertiary)]">Add {mode === 'talking-avatar' ? 'a script' : 'a description'} to get started.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
