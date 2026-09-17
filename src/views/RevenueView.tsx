import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Plus, 
  DollarSign, 
  Wallet, 
  CreditCard, 
  ChevronRight, 
  PieChart, 
  X,
  Calendar,
  Activity,
  Award,
  Users,
  Target,
  Percent,
  Eye,
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Persona, RevenueEntry } from '../types';
import { api } from '../services/apiService';
import toast from 'react-hot-toast';

interface RevenueViewProps {
  persona: Persona;
}

export default function RevenueView({ persona }: RevenueViewProps) {
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'financials' | 'performance'>('financials');
  const [isSaving, setIsSaving] = useState(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    amount: '',
    source: 'Brand Deal',
    platform: persona.platform || 'Instagram',
    notes: ''
  });
  const [newEntryDate, setNewEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Interactive line chart tooltip state
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; date: string; amount: number; index: number } | null>(null);

  // Load revenue entries on mount or when persona change
  const loadEntries = () => {
    api.revenue.listByPersona(persona.id)
      .then(data => setEntries(data))
      .catch(() => { setEntries([]); toast.error('Could not load recorded income. Please try again.'); });
  };

  useEffect(() => {
    loadEntries();
  }, [persona.id]);

  const totalPersonaRevenue = useMemo(() => {
    return entries.reduce((acc, curr) => acc + curr.amount, 0);
  }, [entries]);

  // SVG Area Chart Coordinates Calculation
  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries]);

  const chartData = useMemo(() => {
    let runningTotal = 0;
    return sortedEntries.map(entry => {
      runningTotal += entry.amount;
      return {
        date: entry.date,
        amount: runningTotal,
        rawAmount: entry.amount,
        source: entry.source
      };
    });
  }, [sortedEntries]);

  // Platform Breakdown percentages
  const platformBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.forEach(e => {
      const p = e.platform || 'Other';
      totals[p] = (totals[p] || 0) + e.amount;
    });
    
    return Object.entries(totals)
      .map(([name, val]) => ({ name, value: val }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);

  // SVG coordinate mapper
  const svgWidth = 550;
  const svgHeight = 180;
  const paddingX = 40;
  const paddingY = 25;

  const chartCoords = useMemo(() => {
    if (chartData.length === 0) return [];
    const maxAmt = Math.max(...chartData.map(d => d.amount)) * 1.15 || 1000;
    const minAmt = 0;

    return chartData.map((d, i) => {
      const x = paddingX + (i / Math.max(chartData.length - 1, 1)) * (svgWidth - paddingX * 2);
      const y = svgHeight - paddingY - ((d.amount - minAmt) / Math.max(maxAmt - minAmt, 1)) * (svgHeight - paddingY * 2);
      return { x, y };
    });
  }, [chartData]);

  // SVG path definitions
  const { strokePath, fillPath } = useMemo(() => {
    if (chartCoords.length === 0) return { strokePath: '', fillPath: '' };
    
    const stroke = `M ${chartCoords[0].x} ${chartCoords[0].y} ` + chartCoords.slice(1).map(c => `L ${c.x} ${c.y}`).join(' ');
    const fill = `${stroke} L ${chartCoords[chartCoords.length - 1].x} ${svgHeight - paddingY} L ${chartCoords[0].x} ${svgHeight - paddingY} Z`;
    
    return { strokePath: stroke, fillPath: fill };
  }, [chartCoords]);

  // Form submit handler
  const handleAddEntry = async () => {
    if (isSaving) return;
    const amount = Number(newEntry.amount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter an amount greater than zero.'); return; }

    const entry: RevenueEntry = {
      id: `rev-${Date.now()}`,
      date: newEntryDate,
      amount,
      source: newEntry.source,
      platform: newEntry.platform,
      personaId: persona.id,
      notes: newEntry.notes
    };


    setIsSaving(true);
    try {
      await api.revenue.create(entry);
      setNewEntry({ amount: '', source: 'Brand Deal', platform: persona.platform || 'Instagram', notes: '' });
      setShowAddForm(false);
      toast.success('💰 Revenue transaction added successfully!');
      loadEntries(); // Refresh
    } catch (err) {
      console.error('[Revenue] Save error:', err);
      toast.error('Failed to save transaction');
    } finally { setIsSaving(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto pb-32">
      {/* ── HEADER ── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pt-6 pb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#94A3B8]">Income overview</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="gradient-text">Revenue</span>
          </h1>
          <p className="text-[var(--text-tertiary)] text-xs mt-1.5 font-medium">
            Track recorded income for <span className="text-[var(--accent-primary)] font-bold">{persona.name}</span>
          </p>
        </div>

        {/* Tab Controls (Segment control style) */}
        <div className="flex items-center gap-3">
          <div className="segment-control flex items-center">
            <button
              onClick={() => setActiveTab('financials')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'financials'
                  ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              Financials
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'performance'
                  ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20'
                  : 'text-[var(--text-muted)] hover:text-white'
              }`}
            >
              Performance
            </button>
          </div>

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)] hover:brightness-110 p-2.5 rounded-xl shadow-lg shadow-[var(--accent-primary)]/20 transition-all cursor-pointer text-[#141416] flex items-center gap-1.5 text-xs font-bold"
          >
            <Plus size={16} /> Add Earnings
          </motion.button>
        </div>
      </header>

      {/* ── FINANCIAL OVERVIEW CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-[var(--bg-elevated)] border border-[var(--accent-primary)]/20 rounded-3xl p-6 mb-8 relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <TrendingUp size={140} />
        </div>
        
        {/* Glow orb */}
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 blur-3xl rounded-full" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-[var(--accent-primary)] text-[10px] font-black uppercase tracking-[0.2em]">Total Cumulative Earnings</span>
            <h2 className="text-4xl font-black mt-2 mb-1.5 tracking-tight text-white">${totalPersonaRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <p className="text-xs text-white/70">Based on income entries recorded in this studio</p>
          </div>
          
          <div className="grid grid-cols-1 gap-3 shrink-0">
             <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 min-w-[130px]">
                <span className="text-[9px] text-[var(--accent-primary)] block opacity-70 uppercase font-black tracking-wider">Avg Deal Value</span>
                <span className="font-extrabold text-lg text-white block mt-0.5">${entries.length > 0 ? (totalPersonaRevenue / entries.length).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}</span>
                <span className="text-[9px] text-[var(--accent-primary)] font-bold block mt-1">Per transaction</span>
             </div>
          </div>
        </div>
      </motion.div>

      {/* ── MAIN TAB SWITCH CONTENT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Visual SVG Chart or Performance Indicators */}
        <div className="lg:col-span-2 space-y-6">
          
          <AnimatePresence mode="wait">
            {activeTab === 'financials' ? (
              <motion.div
                key="financials-tab"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="premium-card p-6 rounded-3xl relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">Earnings Trend Curve</h3>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Timeline of cumulative growth</p>
                  </div>
                  <BarChart3 className="text-[var(--accent-primary)]/50" size={18} />
                </div>

                {chartData.length > 0 ? (
                  <div className="relative w-full aspect-[16/9] flex items-center justify-center mt-2">
                    {/* SVG Chart */}
                    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                      {/* Grid lines */}
                      <line x1={paddingX} y1={svgHeight - paddingY} x2={svgWidth - paddingX} y2={svgHeight - paddingY} className="stroke-white/10" strokeWidth={1} />
                      <line x1={paddingX} y1={paddingY} x2={svgWidth - paddingX} y2={paddingY} className="stroke-white/5" strokeWidth={1} strokeDasharray="4 4" />
                      <line x1={paddingX} y1={(svgHeight) / 2} x2={svgWidth - paddingX} y2={(svgHeight) / 2} className="stroke-white/5" strokeWidth={1} strokeDasharray="4 4" />

                      <defs>
                        {/* Stroke Gradient */}
                        <linearGradient id="chart-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="var(--accent-primary)" />
                          <stop offset="50%" stopColor="var(--accent-primary)" />
                          <stop offset="100%" stopColor="#D9B667" />
                        </linearGradient>
                        {/* Fill Area Gradient */}
                        <linearGradient id="chart-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity={0.16} />
                          <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>

                      {/* Area Fill */}
                      <path d={fillPath} fill="url(#chart-fill)" className="transition-all duration-300" />

                      {/* Stroke Line */}
                      <path d={strokePath} fill="none" stroke="url(#chart-stroke)" strokeWidth={2.5} className="transition-all duration-300" strokeLinecap="round" />

                      {/* Interactive Hover Point & Vertical Line Indicator */}
                      {hoveredPoint && (
                        <>
                          <line
                            x1={hoveredPoint.x}
                            y1={paddingY}
                            x2={hoveredPoint.x}
                            y2={svgHeight - paddingY}
                            className="stroke-[var(--accent-primary)]/30"
                            strokeWidth={1}
                            strokeDasharray="2 2"
                          />
                          <circle
                            cx={hoveredPoint.x}
                            cy={hoveredPoint.y + 12} // adjust slightly down to match hovered stroke Y
                            r={6}
                            className="fill-[var(--accent-primary)] stroke-[var(--accent-primary)]/50 stroke-4"
                          />
                        </>
                      )}

                      {/* Point Indicators (Small dots) */}
                      {chartCoords.map((coord, idx) => (
                        <circle
                          key={idx}
                          cx={coord.x}
                          cy={coord.y}
                          r={3.5}
                          className="fill-[var(--accent-primary)] stroke-[#0F172A] stroke-2 pointer-events-none"
                        />
                      ))}

                      {/* Transparent Hover Nodes */}
                      {chartCoords.map((coord, idx) => (
                        <circle
                          key={`hover-${idx}`}
                          cx={coord.x}
                          cy={coord.y}
                          r={16}
                          className="fill-transparent cursor-pointer"
                          onMouseEnter={() => {
                            setHoveredPoint({
                              x: coord.x,
                              y: coord.y - 12,
                              date: chartData[idx].date,
                              amount: chartData[idx].amount,
                              index: idx
                            });
                          }}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      ))}
                    </svg>

                    {/* SVG Floating Tooltip Overlay */}
                    {hoveredPoint && (
                      <div 
                        className="absolute bg-slate-950/90 border border-[var(--accent-primary)]/30 px-3 py-2 rounded-xl text-left pointer-events-none shadow-2xl z-20 backdrop-blur-md"
                        style={{ 
                          left: `${(hoveredPoint.x / svgWidth) * 100}%`, 
                          top: `${((hoveredPoint.y + 12) / svgHeight) * 100}%`,
                          transform: 'translate(-50%, -125%)'
                        }}
                      >
                        <p className="text-[8px] text-[#64748B] font-bold uppercase tracking-wider">{hoveredPoint.date}</p>
                        <p className="text-xs font-black text-white mt-0.5">${hoveredPoint.amount.toLocaleString()}</p>
                        <p className="text-[8px] text-[var(--accent-primary)] font-bold">Cumulative</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-48 border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center p-6 text-center">
                     <p className="text-xs text-[var(--text-tertiary)] italic">No financial data to render curve.</p>
                     <button onClick={() => setShowAddForm(true)} className="mt-3 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-primary)] hover:text-[var(--accent-primary)]">Add first transaction</button>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div key="performance-tab" className="premium-card rounded-2xl p-6">
                <h3 className="font-semibold">Performance analytics are not connected</h3>
                <p className="mt-2 text-sm text-[var(--text-muted)]">Followers, engagement, views, and campaign returns need verified account analytics. This page currently shows only income entries you record.</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transactions list */}
          <div className="space-y-3">
            <h3 className="font-extrabold text-sm text-white uppercase tracking-widest px-1">Transactions Record</h3>
            {entries.length > 0 ? (
              entries.map((entry, idx) => (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="premium-card rounded-2xl p-4 flex items-center justify-between bg-[var(--bg-input)]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="bg-gradient-to-br from-[var(--accent-primary)]/10 to-[var(--accent-primary)]/5 p-2.5 rounded-xl border border-white/5">
                      {entry.source === 'Brand Deal' ? <CreditCard size={18} className="text-[var(--accent-primary)]" /> : <DollarSign size={18} className="text-emerald-400" />}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-white">{entry.source}</h4>
                      <p className="text-[10px] text-[#64748B] font-semibold mt-0.5">
                        {entry.platform} • {entry.date}
                      </p>
                      {entry.notes && <p className="text-[10px] text-white/50 mt-1 italic">“{entry.notes}”</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-sm text-emerald-400">+${entry.amount.toLocaleString()}</span>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-10 bg-white/[0.01] rounded-2xl border border-white/5">
                <p className="text-[var(--text-tertiary)] text-xs italic">No financial ledger entries recorded.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Breakdown & ROI Circle widgets */}
        <div className="space-y-6">
          
          {/* Platform Breakdown horizontal bar chart */}
          <div className="premium-card p-6 rounded-3xl space-y-4">
             <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <PieChart className="text-[var(--accent-primary)]" size={14} />
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Platform Distribution</h4>
             </div>

             {platformBreakdown.length > 0 ? (
               <div className="space-y-4 pt-1">
                 {platformBreakdown.map((platform, idx) => {
                   const pct = totalPersonaRevenue > 0 ? (platform.value / totalPersonaRevenue) * 100 : 0;
                   const barGradients = [
                     'from-[var(--accent-primary)] to-[var(--accent-primary)]',
                     'from-[var(--accent-primary)] to-[var(--accent-primary)]',
                     'from-emerald-500 to-teal-500',
                     'from-amber-500 to-orange-500',
                   ];
                   const grad = barGradients[idx % barGradients.length];

                   return (
                     <div key={platform.name} className="space-y-1.5">
                       <div className="flex justify-between text-[11px] font-bold">
                         <span className="text-white">{platform.name}</span>
                         <span className="text-[var(--text-tertiary)]">{pct.toFixed(0)}% (${platform.value.toLocaleString()})</span>
                       </div>
                       <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                         <motion.div
                           initial={{ width: 0 }}
                           animate={{ width: `${pct}%` }}
                           transition={{ duration: 0.8, delay: idx * 0.1 }}
                           className={`h-full bg-gradient-to-r ${grad} rounded-full`}
                         />
                       </div>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="text-center py-6">
                  <p className="text-[10px] text-[var(--text-tertiary)] italic">No entries grouped by platform.</p>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* ── ADD REVENUE ENTRY MODAL ── */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="absolute inset-0"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-sm bg-[var(--bg-input)]/95 border border-[#334155] rounded-[28px] overflow-hidden shadow-2xl p-6 md:p-8 z-10"
            >
              {/* Glow top border line */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-[var(--accent-primary)]/10 blur-2xl rounded-full" />

              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-[var(--accent-primary)]" />
                  <h3 className="text-lg font-bold text-white">Record Payout</h3>
                </div>
                <button 
                  onClick={() => setShowAddForm(false)} 
                  className="p-1.5 bg-white/5 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white rounded-xl transition-all cursor-pointer border border-white/5"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form fields */}
              <div className="space-y-4">
                {/* Amount input */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest block ml-1">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-4 flex items-center text-[var(--text-muted)] font-black text-sm">$</span>
                    <input 
                      type="number"
                      value={newEntry.amount}
                      onChange={e => setNewEntry({...newEntry, amount: e.target.value})}
                      placeholder="0.00"
                      className="w-full bg-[var(--bg-input)]/80 border border-[#334155] rounded-2xl py-3 pl-8 pr-4 focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all text-sm text-white"
                    />
                  </div>
                </div>

                {/* Source Selection */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest block ml-1">
                    Revenue Source
                  </label>
                  <select 
                    value={newEntry.source}
                    onChange={e => setNewEntry({...newEntry, source: e.target.value})}
                    className="w-full bg-[var(--bg-input)]/80 border border-[#334155] rounded-2xl py-3 px-4 focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all text-xs text-white"
                  >
                    <option value="Brand Deal">Brand Deal</option>
                    <option value="Subscription">Subscription</option>
                    <option value="Affiliate">Affiliate Sales</option>
                    <option value="Sponsorship">Sponsorship Payout</option>
                    <option value="Other">Other Revenue</option>
                  </select>
                </div>

                {/* Platform Target */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest block ml-1">
                    Platform Channel
                  </label>
                  <input 
                    value={newEntry.platform}
                    onChange={e => setNewEntry({...newEntry, platform: e.target.value})}
                    className="w-full bg-[var(--bg-input)]/80 border border-[#334155] rounded-2xl py-3 px-4 focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all text-xs text-white"
                    placeholder="e.g. Instagram"
                  />
                </div>

                {/* Date Picker */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest block ml-1">
                    Payout Date
                  </label>
                  <div className="relative">
                    <input 
                      type="date"
                      value={newEntryDate}
                      onChange={e => setNewEntryDate(e.target.value)}
                      className="w-full bg-[var(--bg-input)]/80 border border-[#334155] rounded-2xl py-3 px-4 focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all text-xs text-white"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest block ml-1">
                    Internal Notes
                  </label>
                  <input 
                    value={newEntry.notes}
                    onChange={e => setNewEntry({...newEntry, notes: e.target.value})}
                    className="w-full bg-[var(--bg-input)]/80 border border-[#334155] rounded-2xl py-3 px-4 focus:ring-1 focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] outline-none transition-all text-xs text-white"
                    placeholder="e.g. Sponsored post #4"
                  />
                </div>

                {/* Submit button */}
                <motion.button 
                  whileTap={{ scale: 0.97 }}
                  onClick={handleAddEntry}
                  disabled={isSaving}
                  className="w-full bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-primary)] hover:brightness-110 py-3 rounded-2xl font-bold shadow-lg shadow-[var(--accent-primary)]/20 transition-all mt-4 text-xs text-[#141416] cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Saving…' : 'Confirm Entry'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
