import { User, Bell, Shield, LogOut, ChevronRight, Globe, Moon, Sparkles, HelpCircle, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SettingsView() {
  const sections = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Profile', value: 'Alex Creator' },
        { icon: Globe, label: 'Language', value: 'English' },
        { icon: Moon, label: 'Theme', value: 'Dark mode' },
      ]
    },
    {
      title: 'App Settings',
      items: [
        { icon: Bell, label: 'Notifications', value: 'Daily' },
        { icon: Shield, label: 'Security & Privacy', value: '' },
        { icon: Sparkles, label: 'AI Model Preferences', value: 'GPT-4 / Claude' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', value: '' },
        { icon: LogOut, label: 'Sign Out', value: '', color: 'text-rose-400' },
      ]
    }
  ];

  return (
    <div className="p-6">
      <header className="premium-header mb-6 pt-6 pb-2">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="gradient-text">Settings</span>
          </h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-1.5 font-medium">Personalize your studio experience</p>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="premium-card rounded-2xl p-4 mb-8 flex items-center gap-4 relative overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at top left, rgba(139,92,246,0.06) 0%, transparent 70%)' }} />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative"
          style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)', boxShadow: '0 4px 20px -4px rgba(139,92,246,0.5)' }}
        >
          <User size={24} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 relative z-10">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-[var(--text-primary)]">Alex Creator</h3>
            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
              <Crown size={9} className="text-amber-400" />
              <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">Pro</span>
            </div>
          </div>
          <p className="text-[var(--text-tertiary)] text-xs mt-0.5">creator@aistudio.app</p>
        </div>
        <ChevronRight size={16} className="text-[var(--text-muted)] shrink-0" />
      </motion.div>

      <div className="space-y-8">
        {sections.map((section, sectionIdx) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: sectionIdx * 0.08, duration: 0.3 }}
            className="space-y-3"
          >
            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.15em] ml-4">{section.title}</h3>
            <div className="premium-card rounded-2xl overflow-hidden">
              {section.items.map((item, idx) => (
                <div 
                  key={item.label} 
                  className={`flex items-center justify-between p-4 hover:bg-[var(--bg-elevated)] transition-all duration-200 cursor-pointer ${idx !== section.items.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/5 border border-[var(--border-subtle)] rounded-xl flex items-center justify-center">
                       <item.icon size={18} className={item.color || 'text-[var(--text-secondary)]'} />
                    </div>
                    <span className={`font-medium text-sm ${item.color || 'text-[var(--text-primary)]'}`}>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value && <span className="text-xs text-[var(--text-tertiary)]">{item.value}</span>}
                    <ChevronRight size={14} className="text-[var(--text-muted)]" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
        
        <div className="pt-4 text-center">
           <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-[0.2em]">AI Influencer Studio v1.0.4</p>
           <p className="text-[10px] text-[var(--text-muted)] mt-1 italic opacity-60">Made for the future of digital presence.</p>
        </div>
      </div>
    </div>
  );
}
