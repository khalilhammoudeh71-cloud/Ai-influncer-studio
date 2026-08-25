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

const STEP_LABELS = ['Choose', 'Shape', 'Create'];

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
  return (
    <section
      aria-labelledby="guided-create-heading"
      className="mb-5 overflow-hidden rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[0_24px_80px_rgba(0,0,0,0.24)]"
    >
      <div className="border-b border-[var(--border-subtle)] bg-[linear-gradient(135deg,rgba(231,196,119,0.10),transparent_55%)] px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
              <Sparkles size={13} /> Guided creation
            </div>
            <h2 id="guided-create-heading" className="text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
              Make something in three simple steps
            </h2>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">
              Tell us the result you want. The studio chooses the model and sensible defaults.
            </p>
          </div>
          <div className="flex items-center gap-1.5" aria-label="Creation progress">
            {STEP_LABELS.map((label, index) => (
              <div key={label} className="flex items-center gap-1.5">
                {index > 0 && <div className="h-px w-3 bg-[var(--border-default)] sm:w-5" />}
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--accent-muted)] text-[9px] font-bold text-[var(--accent-primary)]">
                  {index + 1}
                </span>
                <span className="hidden text-[9px] font-semibold text-[var(--text-tertiary)] sm:inline">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr_1.35fr]">
        <div className="border-b border-[var(--border-subtle)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">1. What are you making?</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
            {MODE_OPTIONS.map(option => {
              const Icon = option.icon;
              const active = option.id === mode;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onModeChange(option.id)}
                  aria-pressed={active}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${active ? 'border-[var(--border-strong)] bg-[var(--accent-muted)] shadow-[0_8px_24px_rgba(0,0,0,0.16)]' : 'border-[var(--border-subtle)] bg-[var(--bg-input)] hover:border-[var(--border-default)]'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Icon size={16} className={active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'} />
                    {active && <Check size={13} className="text-[var(--accent-primary)]" />}
                  </div>
                  <span className="mt-2 block text-[11px] font-semibold text-[var(--text-primary)]">{option.label}</span>
                  <span className="mt-0.5 block text-[9px] text-[var(--text-muted)]">{option.detail}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={onEnhance}
              className="cursor-pointer rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] p-3 text-left transition-all hover:border-[var(--border-default)]"
            >
              <WandSparkles size={16} className="text-[var(--text-tertiary)]" />
              <span className="mt-2 block text-[11px] font-semibold text-[var(--text-primary)]">Enhance</span>
              <span className="mt-0.5 block text-[9px] text-[var(--text-muted)]">Improve existing media</span>
            </button>
          </div>
        </div>

        <div className="border-b border-[var(--border-subtle)] p-4 sm:p-5 lg:border-b-0 lg:border-r">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">2. What should it feel like?</p>
          <div className="grid grid-cols-2 gap-2">
            {outcomes.map(option => {
              const active = option.id === outcome;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onOutcomeChange(option.id)}
                  aria-pressed={active}
                  className={`cursor-pointer rounded-xl border px-3 py-2.5 text-left transition-all ${active ? 'border-[var(--border-strong)] bg-[var(--accent-muted)]' : 'border-[var(--border-subtle)] bg-[var(--bg-input)] hover:border-[var(--border-default)]'}`}
                >
                  <span className={`block text-[10px] font-bold ${active ? 'text-[var(--accent-primary)]' : 'text-[var(--text-tertiary)]'}`}>{option.icon}</span>
                  <span className="mt-1 block text-[10px] font-semibold text-[var(--text-primary)]">{option.label}</span>
                  <span className="mt-0.5 block text-[8px] leading-3 text-[var(--text-muted)]">{option.detail}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">3. Describe the result</p>
          <label className="sr-only" htmlFor="guided-creation-prompt">{promptLabel}</label>
          <textarea
            id="guided-creation-prompt"
            value={prompt}
            onChange={event => onPromptChange(event.target.value)}
            placeholder={promptPlaceholder}
            rows={4}
            className="w-full resize-none rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] px-3.5 py-3 text-xs leading-relaxed text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--border-strong)]"
          />

          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            <label className="relative">
              <span className="sr-only">Format</span>
              <select
                value={format}
                onChange={event => onFormatChange(event.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2.5 pr-8 text-[10px] font-semibold text-[var(--text-secondary)] outline-none focus:border-[var(--border-strong)]"
              >
                {formatOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            </label>

            <label className="relative">
              <span className="sr-only">Persona or subject</span>
              <select
                value={selectedPersonaId}
                onChange={event => onPersonaChange(event.target.value)}
                className="w-full cursor-pointer appearance-none rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-input)] px-3 py-2.5 pr-8 text-[10px] font-semibold text-[var(--text-secondary)] outline-none focus:border-[var(--border-strong)]"
              >
                <option value="none">No persona — create freely</option>
                {personas.map(persona => <option key={persona.id} value={persona.id}>{persona.name}</option>)}
              </select>
              <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            </label>
          </div>

          <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-black/10 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold text-[var(--text-secondary)]">{estimate}</p>
              <p className="mt-0.5 text-[9px] text-[var(--text-muted)]">{timeEstimate} · You can keep working while it runs.</p>
            </div>
            <button
              type="button"
              onClick={onGenerate}
              disabled={!canGenerate || isGenerating}
              className="btn-gold-primary inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isGenerating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {isGenerating ? 'Creating…' : actionLabel}
              {!isGenerating && <ArrowRight size={14} />}
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleFineTune}
            className="mt-3 inline-flex cursor-pointer items-center gap-2 text-[10px] font-semibold text-[var(--text-tertiary)] transition-colors hover:text-[var(--accent-primary)]"
          >
            <SlidersHorizontal size={13} />
            {fineTuneOpen ? 'Hide fine-tuning controls' : 'Fine-tune style, references, and settings'}
          </button>
        </div>
      </div>
    </section>
  );
}
