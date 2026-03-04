import { useState, useEffect } from 'react';
import { TrendingUp, Plus, DollarSign, Wallet, CreditCard, ChevronRight, PieChart, X } from 'lucide-react';
import { Persona, RevenueEntry } from '../types';

interface RevenueViewProps {
  persona: Persona;
}

export default function RevenueView({ persona }: RevenueViewProps) {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    amount: '',
    source: 'Brand Deal',
    platform: persona.platform,
    notes: ''
  });

  useEffect(() => {
    const saved = localStorage.getItem(`revenue_entries_${persona.id}`);
    if (saved) {
      try {
        setEntries(JSON.parse(saved));
      } catch {
        setEntries([]);
      }
    } else {
      setEntries([]);
    }
  }, [persona.id]);

  useEffect(() => {
    localStorage.setItem(`revenue_entries_${persona.id}`, JSON.stringify(entries));
  }, [entries, persona.id]);

  const totalPersonaRevenue = entries.reduce((acc, curr) => acc + curr.amount, 0);

  const handleAddEntry = () => {
    const amount = parseFloat(newEntry.amount);
    if (isNaN(amount) || amount <= 0) return;

    const entry: RevenueEntry = {
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount,
      source: newEntry.source,
      platform: newEntry.platform,
      personaId: persona.id,
      notes: newEntry.notes
    };

    setEntries(prev => [entry, ...prev]);
    setNewEntry({ amount: '', source: 'Brand Deal', platform: persona.platform, notes: '' });
    setShowAddForm(false);
  };

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue</h1>
          <p className="text-gray-400 text-sm mt-1">Earnings for {persona.name}</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 hover:bg-indigo-500 p-2.5 rounded-full shadow-lg transition-all active:scale-95"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="bg-indigo-600 rounded-[32px] p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp size={120} />
        </div>
        <div className="relative z-10">
          <span className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Total Earnings ({persona.name})</span>
          <h2 className="text-4xl font-black mt-2 mb-6 tracking-tight">${totalPersonaRevenue.toLocaleString()}.00</h2>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="text-[10px] text-indigo-100 block opacity-70 uppercase font-bold">Projected</span>
                <span className="font-bold text-lg">${(totalPersonaRevenue * 1.5).toLocaleString()}</span>
             </div>
             <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <span className="text-[10px] text-indigo-100 block opacity-70 uppercase font-bold">Growth</span>
                <span className="font-bold text-lg">+14.2%</span>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button className="flex flex-col items-center justify-center gap-2 bg-[#1A1A1A] border border-white/5 rounded-3xl p-5 hover:border-indigo-500/30 transition-all group">
          <div className="bg-indigo-500/10 p-3 rounded-2xl group-hover:bg-indigo-500/20 transition-colors">
            <PieChart className="text-indigo-400" size={24} />
          </div>
          <span className="text-sm font-medium">By Persona</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-2 bg-[#1A1A1A] border border-white/5 rounded-3xl p-5 hover:border-indigo-500/30 transition-all group">
          <div className="bg-indigo-500/10 p-3 rounded-2xl group-hover:bg-indigo-500/20 transition-colors">
            <Wallet className="text-indigo-400" size={24} />
          </div>
          <span className="text-sm font-medium">Withdraw</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2 px-1">
          <h3 className="font-bold text-lg">Transactions</h3>
        </div>

        {entries.length > 0 ? entries.map((entry) => (
          <div key={entry.id} className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                {entry.source === 'Brand Deal' ? <CreditCard size={20} className="text-indigo-400" /> : <DollarSign size={20} className="text-green-400" />}
              </div>
              <div>
                <h4 className="font-bold text-sm">{entry.source}</h4>
                <p className="text-[11px] text-gray-500">{entry.platform} • {entry.date}</p>
                {entry.notes && <p className="text-[11px] text-gray-600 mt-0.5">{entry.notes}</p>}
              </div>
            </div>
            <div className="text-right">
              <span className="font-black text-sm text-white">+${entry.amount}</span>
              <ChevronRight size={14} className="text-gray-700 ml-auto mt-1" />
            </div>
          </div>
        )) : (
          <div className="text-center py-10 bg-[#1A1A1A] rounded-2xl border border-white/5">
            <p className="text-gray-500 text-sm italic">No entries for this persona yet.</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-indigo-400 text-xs font-bold uppercase tracking-wider"
            >
              Add your first entry
            </button>
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#1A1A1A] w-full max-w-sm rounded-[32px] border border-white/10 p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Add Revenue</h3>
              <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-400">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Amount ($)</label>
                <input 
                  type="number"
                  value={newEntry.amount}
                  onChange={e => setNewEntry({...newEntry, amount: e.target.value})}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Source</label>
                <select 
                  value={newEntry.source}
                  onChange={e => setNewEntry({...newEntry, source: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white appearance-none"
                >
                  <option value="Brand Deal">Brand Deal</option>
                  <option value="Subscription">Subscription</option>
                  <option value="Affiliate">Affiliate</option>
                  <option value="Sponsorship">Sponsorship</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Platform</label>
                <input 
                  value={newEntry.platform}
                  onChange={e => setNewEntry({...newEntry, platform: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white"
                  placeholder="e.g. Instagram"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-gray-500 ml-1">Notes</label>
                <input 
                  value={newEntry.notes}
                  onChange={e => setNewEntry({...newEntry, notes: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white"
                  placeholder="Optional description"
                />
              </div>
              <button 
                onClick={handleAddEntry}
                className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 mt-2"
              >
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
