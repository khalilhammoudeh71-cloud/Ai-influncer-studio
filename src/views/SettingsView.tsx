import { User, Bell, Shield, LogOut, ChevronRight, Globe, Moon, Sparkles, HelpCircle } from 'lucide-react';

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
        { icon: LogOut, label: 'Sign Out', value: '', color: 'text-red-400' },
      ]
    }
  ];

  return (
    <div className="p-6">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Personalize your studio experience</p>
      </header>

      <div className="space-y-8">
        {sections.map((section) => (
          <div key={section.title} className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest ml-4">{section.title}</h3>
            <div className="bg-[#1A1A1A] border border-white/5 rounded-[32px] overflow-hidden">
              {section.items.map((item, idx) => (
                <div 
                  key={item.label} 
                  className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors cursor-pointer ${idx !== section.items.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#0A0A0A] border border-white/5 rounded-2xl flex items-center justify-center">
                       <item.icon size={20} className={item.color || 'text-gray-400'} />
                    </div>
                    <span className={`font-medium text-sm ${item.color || 'text-white'}`}>{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value && <span className="text-xs text-gray-500">{item.value}</span>}
                    <ChevronRight size={14} className="text-gray-700" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="pt-4 text-center">
           <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.2em]">AI Influencer Studio v1.0.4</p>
           <p className="text-[10px] text-gray-700 mt-1 italic">Made for the future of digital presence.</p>
        </div>
      </div>
    </div>
  );
}
