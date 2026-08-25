import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bot,
  Clapperboard,
  Compass,
  Image,
  Layers3,
  Megaphone,
  ScanFace,
  Sparkles,
  WandSparkles,
} from 'lucide-react';

export type LaunchTask =
  | 'image'
  | 'video'
  | 'talking-avatar'
  | 'edit'
  | 'planner'
  | 'content-pack'
  | 'explore'
  | 'pro';

interface OnboardingTourProps {
  onComplete: (task: LaunchTask, proMode?: boolean) => void;
}

const TASKS: Array<{
  id: Exclude<LaunchTask, 'explore' | 'pro'>;
  title: string;
  description: string;
  icon: typeof Image;
}> = [
  { id: 'image', title: 'Generate an image', description: 'Create a polished visual from a simple idea.', icon: Image },
  { id: 'video', title: 'Create a video', description: 'Turn a concept or image into a short video.', icon: Clapperboard },
  { id: 'talking-avatar', title: 'Make a talking avatar', description: 'Bring a face and voice to life on camera.', icon: ScanFace },
  { id: 'edit', title: 'Edit or enhance media', description: 'Upscale, retouch, restyle, or transform a file.', icon: WandSparkles },
  { id: 'planner', title: 'Plan social content', description: 'Build ideas, captions, hooks, and a posting plan.', icon: Megaphone },
  { id: 'content-pack', title: 'Create a content pack', description: 'Generate a coordinated mix of creative assets.', icon: Layers3 },
];

export default function OnboardingTour({ onComplete }: OnboardingTourProps) {
  return (
    <div className="studio-public-theme fixed inset-0 z-[9999] overflow-y-auto bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[12%] top-[-18%] h-[520px] w-[520px] rounded-full bg-[#E7C477]/10 blur-[140px]" />
        <div className="absolute bottom-[-26%] right-[8%] h-[560px] w-[560px] rounded-full bg-cyan-500/[0.07] blur-[150px]" />
      </div>

      <main className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center px-5 py-10 sm:px-8 lg:py-14">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto mb-8 max-w-3xl text-center"
        >
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl border border-[var(--border-strong)] bg-[var(--accent-muted)] text-[var(--accent-primary)] shadow-[0_14px_44px_rgba(0,0,0,0.28)]">
            <Sparkles size={24} />
          </div>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.34em] text-[var(--accent-primary)]">Your studio is ready</p>
          <h1 className="font-['Cinzel',serif] text-3xl font-bold tracking-[-0.035em] sm:text-4xl lg:text-5xl">
            What would you like to make?
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
            Start with an outcome. We’ll choose the right tools and guide you through the rest—no AI experience needed.
          </p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          aria-label="Choose a task"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {TASKS.map((task, index) => {
            const Icon = task.icon;
            return (
              <motion.button
                key={task.id}
                type="button"
                onClick={() => onComplete(task.id, false)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.985 }}
                transition={{ delay: index * 0.025 }}
                className="group flex min-h-28 cursor-pointer items-center gap-4 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)]/90 p-4 text-left shadow-[0_16px_42px_rgba(0,0,0,0.16)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--accent-subtle)] sm:p-5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[var(--border-default)] bg-[var(--bg-input)] text-[var(--accent-primary)] transition-colors group-hover:border-[var(--border-strong)] group-hover:bg-[var(--accent-muted)]">
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold tracking-[-0.015em]">{task.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">{task.description}</span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:translate-x-1 group-hover:text-[var(--accent-primary)]" />
              </motion.button>
            );
          })}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-5 grid gap-3 lg:grid-cols-2"
        >
          <button
            type="button"
            onClick={() => onComplete('explore', false)}
            className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-[var(--border-strong)] bg-[linear-gradient(135deg,rgba(231,196,119,0.12),rgba(255,255,255,0.025))] p-5 text-left transition-all hover:bg-[linear-gradient(135deg,rgba(231,196,119,0.18),rgba(255,255,255,0.04))]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--accent-primary)] text-[#17130b] shadow-[0_10px_28px_rgba(231,196,119,0.24)]"><Compass size={21} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Not sure? Show me what’s possible</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">Explore recommended tools and examples without committing to a workflow.</span>
            </span>
            <ArrowRight size={17} className="text-[var(--accent-primary)] transition-transform group-hover:translate-x-1" />
          </button>

          <button
            type="button"
            onClick={() => onComplete('pro', true)}
            className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-cyan-400/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.1),rgba(255,255,255,0.025))] p-5 text-left transition-all hover:border-cyan-300/40 hover:bg-[linear-gradient(135deg,rgba(34,211,238,0.15),rgba(255,255,255,0.04))]"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-300/25 bg-cyan-400/10 text-cyan-300"><Bot size={21} /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">I’m a pro—show me everything</span>
              <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">Open the complete studio with every model, provider, and advanced control.</span>
            </span>
            <ArrowRight size={17} className="text-cyan-300 transition-transform group-hover:translate-x-1" />
          </button>
        </motion.section>

        <p className="mt-6 text-center text-[11px] text-[var(--text-muted)]">
          You can switch between Simple and Pro at any time. Nothing is permanently hidden.
        </p>
      </main>
    </div>
  );
}
