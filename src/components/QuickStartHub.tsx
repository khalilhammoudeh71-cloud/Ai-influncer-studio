import { motion } from 'framer-motion';
import {
  ArrowRight,
  AudioLines,
  Film,
  Image as ImageIcon,
  Mic2,
  Scissors,
  Sparkles,
  UserRound,
  WandSparkles,
} from 'lucide-react';

export type CreationCapabilityId =
  | 'image'
  | 'video'
  | 'talking-avatar'
  | 'voice'
  | 'edit-upscale'
  | 'stitcher';

interface CreationCapability {
  id: CreationCapabilityId;
  label: string;
  eyebrow: string;
  description: string;
  action: string;
  icon: typeof ImageIcon;
}

const CAPABILITIES: CreationCapability[] = [
  {
    id: 'image',
    label: 'Images',
    eyebrow: 'Create a visual',
    description: 'Generate polished images with optional persona identity lock.',
    action: 'Open Image Studio',
    icon: ImageIcon,
  },
  {
    id: 'video',
    label: 'Videos',
    eyebrow: 'Bring a scene to life',
    description: 'Turn a prompt or reference image into cinematic motion.',
    action: 'Open Video Studio',
    icon: Film,
  },
  {
    id: 'talking-avatar',
    label: 'Talking Avatar',
    eyebrow: 'Make a persona speak',
    description: 'Combine a face, script, and voice into a speaking avatar.',
    action: 'Create an Avatar',
    icon: UserRound,
  },
  {
    id: 'voice',
    label: 'Voice & Audio',
    eyebrow: 'Generate speech',
    description: 'Create voiceovers, use saved voices, or clone a new voice.',
    action: 'Open Voice Studio',
    icon: Mic2,
  },
  {
    id: 'edit-upscale',
    label: 'Edit & Upscale',
    eyebrow: 'Improve existing media',
    description: 'Modify, enhance, repair, or upscale an image you already have.',
    action: 'Open AI Toolbox',
    icon: WandSparkles,
  },
  {
    id: 'stitcher',
    label: 'Video Editor',
    eyebrow: 'Assemble a finished cut',
    description: 'Stitch scenes together and shape them into one final video.',
    action: 'Open Video Editor',
    icon: Scissors,
  },
];

interface QuickStartHubProps {
  activeCapability: CreationCapabilityId;
  onSelectCapability: (capability: CreationCapabilityId) => void;
}

export default function QuickStartHub({ activeCapability, onSelectCapability }: QuickStartHubProps) {
  return (
    <section className="mb-5 overflow-hidden rounded-[24px] border border-[var(--border-default)] bg-[var(--bg-elevated)] shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] bg-[linear-gradient(135deg,rgba(231,196,119,0.11),transparent_58%)] px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-primary)]">
            <Sparkles size={13} /> Creation formats
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] sm:text-xl">
            What would you like to make?
          </h2>
          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-[var(--text-muted)]">
            Start with the outcome. The studio opens the right workflow, while Pro mode keeps every model and fine-tuning control available.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--gold-border-active)] bg-[var(--gold-bg-subtle)] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--gold-bright)]">
          <AudioLines size={12} /> All creation tools in one place
        </div>
      </div>

      <div className="grid gap-2.5 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3">
        {CAPABILITIES.map((capability, index) => {
          const Icon = capability.icon;
          const active = capability.id === activeCapability;

          return (
            <motion.button
              key={capability.id}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.035, duration: 0.2 }}
              onClick={() => onSelectCapability(capability.id)}
              aria-pressed={active}
              className={`group relative min-h-[148px] cursor-pointer overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] ${
                active
                  ? 'border-[var(--border-strong)] bg-[var(--accent-muted)] shadow-[0_16px_42px_rgba(0,0,0,0.28)]'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-input)] hover:-translate-y-0.5 hover:border-[var(--gold-border-active)] hover:bg-[var(--gold-bg-subtle)]'
              }`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(231,196,119,0.11),transparent_42%)] opacity-70" />
              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl border ${active ? 'border-[var(--gold-border-active)] bg-[var(--gold-bg-hover)] text-[var(--gold-bright)]' : 'border-[var(--border-default)] bg-black/20 text-[var(--text-tertiary)] group-hover:border-[var(--gold-border-active)] group-hover:text-[var(--gold-primary)]'}`}>
                    <Icon size={18} />
                  </span>
                  <span className={`rounded-full border px-2 py-1 text-[8px] font-bold uppercase tracking-[0.16em] ${active ? 'border-[var(--gold-border-active)] bg-[var(--gold-bg-subtle)] text-[var(--gold-bright)]' : 'border-[var(--border-subtle)] text-[var(--text-muted)]'}`}>
                    {active ? 'Selected' : capability.eyebrow}
                  </span>
                </div>

                <h3 className="mt-4 text-sm font-semibold text-[var(--text-primary)]">{capability.label}</h3>
                <p className="mt-1 text-[10px] leading-relaxed text-[var(--text-muted)]">{capability.description}</p>

                <span className={`mt-auto flex items-center gap-1.5 pt-3 text-[9px] font-bold uppercase tracking-[0.12em] transition-colors ${active ? 'text-[var(--gold-bright)]' : 'text-[var(--text-tertiary)] group-hover:text-[var(--gold-primary)]'}`}>
                  {capability.action}
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}
