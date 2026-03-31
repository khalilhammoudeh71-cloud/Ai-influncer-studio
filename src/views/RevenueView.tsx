import { useState, useEffect } from 'react';
import { TrendingUp, Plus, DollarSign, Wallet, CreditCard, ChevronRight, PieChart, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, RevenueEntry } from '../types';
import { api } from '../services/apiService';

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
    api.revenue.listByPersona(persona.id)
      .then(data => setEntries(data))
      .catch(() => setEntries([]));
  }, [persona.id]);

  const totalPersonaRevenue = entries.reduce((acc, curr) => acc + curr.amount, 0);

  const handleAddEntry = async () => {
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

    try {
      await api.revenue.create(entry);
    } catch (err) {
      console.error('[Revenue] Save error:', err);
    }
  };

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Revenue</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Earnings for {persona.name}</p>
        </div>
        <motion.button 
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-violet-600 to-fuchsia-600 p-2.5 rounded-full shadow-lg shadow-violet-500/20 transition-all"
        >
          <Plus size={24} className="text-white" />
        </motion.button>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-2xl p-6 mb-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp size={120} />
        </div>
        <div className="relative z-10">
          <span className="text-violet-200 text-xs font-bold uppercase tracking-[0.15em]">Total Earnings ({persona.name})</span>
          <h2 className="text-4xl font-black mt-2 mb-6 tracking-tight text-white">${totalPersonaRevenue.toLocaleString()}.00</h2>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                <span className="text-[10px] text-violet-100 block opacity-70 uppercase font-bold">Projected</span>
                <span className="font-bold text-lg text-white">${(totalPersonaRevenue * 1.5).toLocaleString()}</span>
             </div>
             <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10">
                <span className="text-[10px] text-violet-100 block opacity-70 uppercase font-bold">Growth</span>
                <span className="font-bold text-lg text-white">+14.2%</span>
             </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <button className="flex flex-col items-center justify-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 hover:border-violet-500/30 transition-all duration-200 group">
          <div className="bg-violet-500/10 p-3 rounded-xl group-hover:bg-violet-500/20 transition-colors">
            <PieChart className="text-violet-400" size={24} />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">By Persona</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-5 hover:border-violet-500/30 transition-all duration-200 group">
          <div className="bg-violet-500/10 p-3 rounded-xl group-hover:bg-violet-500/20 transition-colors">
            <Wallet className="text-violet-400" size={24} />
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">Withdraw</span>
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center mb-2 px-1">
          <h3 className="font-bold text-lg text-[var(--text-primary)]">Transactions</h3>
        </div>

        {entries.length > 0 ? entries.map((entry, idx) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-4 flex items-center justify-between hover:border-[var(--border-strong)] transition-colors duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="bg-[var(--bg-elevated)] p-3 rounded-xl border border-[var(--border-subtle)]">
                {entry.source === 'Brand Deal' ? <CreditCard size={20} className="text-violet-400" /> : <DollarSign size={20} className="text-emerald-400" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-[var(--text-primary)]">{entry.source}</h4>
                <p className="text-[11px] text-[var(--text-tertiary)]">{entry.platform} • {entry.date}</p>
                {entry.notes && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{entry.notes}</p>}
              </div>
            </div>
            <div className="text-right">
              <span className="font-black text-sm text-emerald-400">+${entry.amount}</span>
              <ChevronRight size={14} className="text-[var(--text-muted)] ml-auto mt-1" />
            </div>
          </motion.div>
        )) : (
          <div className="text-center py-10 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)]">
            <p className="text-[var(--text-tertiary)] text-sm italic">No entries for this persona yet.</p>
            <button 
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-violet-400 text-xs font-bold uppercase tracking-wider hover:text-violet-300 transition-colors"
            >
              Add your first entry
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-[var(--bg-surface)] w-full max-w-sm rounded-2xl border border-[var(--border-default)] p-8 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[var(--text-primary)]">Add Revenue</h3>
                <button onClick={() => setShowAddForm(false)} className="p-2 hover:bg-[var(--bg-elevated)] rounded-xl text-[var(--text-secondary)] transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[var(--text-muted)] ml-1">Amount ($)</label>
                  <input 
                    type="number"
                    value={newEntry.amount}
                    onChange={e => setNewEntry({...newEntry, amount: e.target.value})}
                    placeholder="0.00"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 outline-none transition-all text-[var(--text-primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[var(--text-muted)] ml-1">Source</label>
                  <select 
                    value={newEntry.source}
                    onChange={e => setNewEntry({...newEntry, source: e.target.value})}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 outline-none transition-all text-[var(--text-primary)] appearance-none"
                  >
                    <option value="Brand Deal">Brand Deal</option>
                    <option value="Subscription">Subscription</option>
                    <option value="Affiliate">Affiliate</option>
                    <option value="Sponsorship">Sponsorship</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[var(--text-muted)] ml-1">Platform</label>
                  <input 
                    value={newEntry.platform}
                    onChange={e => setNewEntry({...newEntry, platform: e.target.value})}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 outline-none transition-all text-[var(--text-primary)]"
                    placeholder="e.g. Instagram"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.15em] font-bold text-[var(--text-muted)] ml-1">Notes</label>
                  <input 
                    value={newEntry.notes}
                    onChange={e => setNewEntry({...newEntry, notes: e.target.value})}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl py-3 px-4 focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/50 outline-none transition-all text-[var(--text-primary)]"
                    placeholder="Optional description"
                  />
                </div>
                <motion.button 
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddEntry}
                  className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 py-4 rounded-xl font-bold shadow-lg shadow-violet-500/20 transition-all mt-2 text-white"
                >
                  Add Entry
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
