import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart2,
  Check,
  Clock3,
  Copy,
  Eye,
  ExternalLink,
  Heart,
  Instagram,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Persona, NavActions } from '../types';
import toast from 'react-hot-toast';
import { cn } from '../utils/cn';
import {
  api,
  type SocialChannelAnalysisResponse,
  type SocialChannelPost,
  type SocialCreatorSignal,
  type SocialPlatform,
  type SocialTrend,
  type SocialTrendsResponse,
} from '../services/apiService';

interface TrendViewProps {
  persona: Persona | null;
  nav: NavActions;
}

type PlatformFilter = 'all' | SocialPlatform;

interface TrendScriptResult {
  concept: string;
  hook: string;
  voiceoverScript: string;
  visualPrompts: string[];
  hashtags: string[];
}

const REGIONS = [
  { code: 'US', label: 'United States' },
  { code: 'CA', label: 'Canada' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'AU', label: 'Australia' },
  { code: 'AE', label: 'United Arab Emirates' },
];

function formatMetric(value: number | null): string {
  if (value === null) return 'Not returned';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function formatCollectedAt(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function platformLabel(platform: SocialPlatform): string {
  return platform === 'instagram' ? 'Instagram' : 'TikTok';
}

function PlatformMark({ platform }: { platform: SocialPlatform }) {
  if (platform === 'instagram') return <Instagram className="h-3.5 w-3.5" aria-hidden="true" />;
  return <span className="text-[11px] font-black" aria-hidden="true">TT</span>;
}

export default function TrendView({ persona: activePersona, nav }: TrendViewProps) {
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [region, setRegion] = useState('US');
  const [data, setData] = useState<SocialTrendsResponse | null>(null);
  const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptResult, setScriptResult] = useState<TrendScriptResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const loadTrends = useCallback(async (force = false) => {
    force ? setRefreshing(true) : setInitialLoading(true);
    setLoadError(null);
    try {
      const response = await api.social.getTrends({ platform, region, refresh: force });
      setData(response);
      setSelectedTrendId(current => response.trends.some(item => item.id === current) ? current : response.trends[0]?.id || null);
      setSelectedCreatorId(current => response.creators.some(item => item.id === current) ? current : response.creators[0]?.id || null);
      if (force) toast.success('Live social signals refreshed');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load live social data.';
      setLoadError(message);
      setData(null);
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  }, [platform, region]);

  useEffect(() => {
    void loadTrends(false);
  }, [loadTrends]);

  const selectedTrend = useMemo(
    () => data?.trends.find(item => item.id === selectedTrendId) || data?.trends[0] || null,
    [data, selectedTrendId],
  );

  const selectedCreator = useMemo(
    () => data?.creators.find(item => item.id === selectedCreatorId) || data?.creators[0] || null,
    [data, selectedCreatorId],
  );

  const handleGenerateBrief = async (trend: SocialTrend) => {
    setScriptLoading(true);
    setScriptResult(null);
    try {
      const result = await api.social.generateTrendScript({
        trendName: trend.title,
        trendDescription: `${trend.description}\nSource: ${trend.sourceUrl}\nObserved public metrics: ${formatMetric(trend.views)} views, ${formatMetric(trend.likes)} likes, ${formatMetric(trend.comments)} comments.`,
        trendNiche: `${platformLabel(trend.platform)}${trend.region ? ` · ${trend.region}` : ''}`,
        persona: activePersona,
      });
      setScriptResult(result);
      toast.success('Content brief created from the live signal');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create the content brief');
    } finally {
      setScriptLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success('Copied');
    window.setTimeout(() => setCopied(current => current === key ? null : current), 1_500);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-7 p-6 select-none">
      <header className="flex flex-col gap-4 border-b border-[#E7C477]/15 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#E7C477]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00F5C2]" />
            Public social intelligence
          </div>
          <h1 className="flex items-center gap-3 font-serif text-3xl tracking-tight text-[#F5F1E8] md:text-4xl">
            Trend Radar <span className="text-xl text-[#E7C477]">✨</span>
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-[#8C909A] md:text-sm">
            Live public Instagram and TikTok signals, ranked from the metrics actually returned by each platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={region}
            onChange={event => setRegion(event.target.value)}
            aria-label="Trend region"
            className="rounded-xl border border-white/10 bg-[#0B0F17] px-3 py-2.5 text-xs font-bold text-white outline-none focus:border-[#E7C477]/50"
          >
            {REGIONS.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
          </select>
          <button
            type="button"
            onClick={() => void loadTrends(true)}
            disabled={refreshing || initialLoading}
            className="flex items-center gap-2 rounded-xl border border-[#E7C477]/25 bg-[#E7C477]/10 px-4 py-2.5 text-xs font-black text-[#F0D48A] transition hover:bg-[#E7C477]/15 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
            Refresh live data
          </button>
        </div>
      </header>

      <section className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl bg-black/20 p-1">
          {(['all', 'instagram', 'tiktok'] as const).map(value => (
            <button
              type="button"
              key={value}
              onClick={() => setPlatform(value)}
              className={cn(
                'rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-wider transition',
                platform === value
                  ? 'border border-[#E7C477]/30 bg-[#E7C477]/12 text-[#F0D48A]'
                  : 'border border-transparent text-zinc-400 hover:text-white',
              )}
            >
              {value === 'all' ? 'All live signals' : value}
            </button>
          ))}
        </div>

        {data && (
          <div className="flex flex-wrap items-center gap-3 px-2 text-[10px] font-bold text-zinc-400">
            <span className="flex items-center gap-1.5 text-[#71E6C1]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00F5C2]" />
              {data.cached ? 'Cached live pull' : 'Fresh live pull'}
            </span>
            <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" /> {formatCollectedAt(data.collectedAt)}</span>
            <span>{data.trends.length} public posts</span>
          </div>
        )}
      </section>

      <ChannelAnalyzer region={region} />

      {initialLoading && (
        <div className="premium-card flex min-h-[420px] flex-col items-center justify-center gap-4 p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#E7C477]" />
          <div>
            <p className="font-bold text-white">Collecting live social signals</p>
            <p className="mt-1 text-xs text-zinc-400">Checking public Instagram Reels and TikTok trends…</p>
          </div>
        </div>
      )}

      {!initialLoading && loadError && (
        <div className="premium-card flex min-h-[360px] flex-col items-center justify-center gap-4 border border-amber-500/20 p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="max-w-lg">
            <h2 className="font-serif text-2xl text-white">Live data is not available yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{loadError}</p>
          </div>
          <button type="button" onClick={() => void loadTrends(true)} className="premium-button px-5 py-2.5 text-xs font-black">
            Try again
          </button>
        </div>
      )}

      {!initialLoading && data && (
        <>
          {data.partial && (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-100">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div>
                <p className="font-bold">Partial live results</p>
                <p className="mt-0.5 text-amber-100/70">{data.errors.map(item => `${platformLabel(item.platform)}: ${item.message}`).join(' ')}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-7 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="premium-card space-y-5 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
                      <TrendingUp className="h-4 w-4 text-[#00F5C2]" />
                      Live trend signals
                    </h2>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">Select a public post to inspect it and turn it into an original content brief.</p>
                  </div>
                  <span className="rounded-lg border border-[#E7C477]/20 bg-[#E7C477]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#F0D48A]">
                    No sample data
                  </span>
                </div>

                {data.trends.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-center text-sm text-zinc-400">
                    The provider returned no public trend posts for this selection. Try another region or platform.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {data.trends.slice(0, 16).map(trend => {
                      const isSelected = selectedTrend?.id === trend.id;
                      return (
                        <button
                          type="button"
                          key={trend.id}
                          onClick={() => { setSelectedTrendId(trend.id); setScriptResult(null); }}
                          className={cn(
                            'group relative overflow-hidden rounded-2xl border p-4 text-left transition',
                            isSelected
                              ? 'border-[#E7C477]/45 bg-[#E7C477]/[0.07] shadow-lg shadow-black/20'
                              : 'border-white/[0.07] bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.03]',
                          )}
                        >
                          {trend.thumbnailUrl && (
                            <img src={trend.thumbnailUrl} alt="" className="mb-4 h-32 w-full rounded-xl object-cover" loading="lazy" referrerPolicy="no-referrer" />
                          )}
                          <div className="flex items-start justify-between gap-3">
                            <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-black/20 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-zinc-200">
                              <PlatformMark platform={trend.platform} /> {platformLabel(trend.platform)}
                            </span>
                            <div className="text-right">
                              <p className="text-lg font-black text-[#00F5C2]">{trend.trendScore}</p>
                              <p className="text-[8px] font-black uppercase tracking-wider text-zinc-500">Signal score</p>
                            </div>
                          </div>
                          <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-snug text-white">{trend.title}</h3>
                          <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-zinc-400">{trend.description}</p>
                          <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[10px] font-bold text-zinc-400">
                            <span>@{trend.authorHandle}</span>
                            <span>{formatMetric(trend.views)} views</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedTrend && (
                <div className="premium-card space-y-6 border border-[#E7C477]/20 p-5">
                  <div className="flex flex-col gap-4 border-b border-white/[0.07] pb-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[#E7C477]">Selected live signal</span>
                      <h2 className="mt-1 text-lg font-bold text-white">{selectedTrend.title}</h2>
                      <p className="mt-1 text-xs text-zinc-400">By @{selectedTrend.authorHandle} · {formatMetric(selectedTrend.views)} views · {selectedTrend.engagementRate ?? '—'}% public engagement</p>
                    </div>
                    <div className="flex gap-2">
                      <a href={selectedTrend.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/5">
                        View source <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        disabled={scriptLoading}
                        onClick={() => void handleGenerateBrief(selectedTrend)}
                        className="premium-button flex items-center gap-2 px-5 py-2.5 text-xs font-black"
                      >
                        {scriptLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        Build my version
                      </button>
                    </div>
                  </div>

                  {scriptLoading && (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                      <Loader2 className="h-7 w-7 animate-spin text-[#E7C477]" />
                      <p className="text-xs font-bold text-zinc-400">Turning this live signal into an original brief for {activePersona?.name || 'your studio'}…</p>
                    </div>
                  )}

                  {!scriptLoading && scriptResult && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                      <div className="rounded-2xl border border-[#E7C477]/15 bg-[#E7C477]/[0.05] p-4">
                        <p className="text-[9px] font-black uppercase tracking-wider text-[#E7C477]">Concept</p>
                        <p className="mt-2 text-sm font-bold leading-relaxed text-[#F5F1E8]">{scriptResult.concept}</p>
                      </div>

                      <CopyBlock label="Opening hook" value={scriptResult.hook} copyKey="hook" copied={copied} onCopy={copyToClipboard} />
                      <CopyBlock label="Vertical video script" value={scriptResult.voiceoverScript} copyKey="script" copied={copied} onCopy={copyToClipboard} multiline />

                      <div>
                        <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-zinc-500">Visual prompts</p>
                        <div className="grid gap-3 md:grid-cols-3">
                          {scriptResult.visualPrompts?.map((prompt, index) => (
                            <CopyBlock key={`${prompt}-${index}`} label={`Scene ${index + 1}`} value={prompt} copyKey={`visual-${index}`} copied={copied} onCopy={copyToClipboard} />
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] pt-4">
                        <div className="flex flex-wrap gap-1.5">
                          {scriptResult.hashtags?.map(tag => <span key={tag} className="rounded-md border border-[#E7C477]/15 bg-[#E7C477]/[0.05] px-2.5 py-1 text-[10px] font-bold text-[#F0D48A]">{tag}</span>)}
                        </div>
                        <button type="button" onClick={() => nav.push({ view: 'create', subView: 'image' })} className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#E7C477]">
                          Open Create <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            <aside className="space-y-5">
              <div className="premium-card space-y-5 p-5">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wider text-white">
                    <Users className="h-4 w-4 text-[#E7C477]" />
                    Creator signals
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">Creators appearing in this live pull, ranked by average public views observed.</p>
                </div>

                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {data.creators.map(creator => (
                    <button
                      type="button"
                      key={creator.id}
                      onClick={() => setSelectedCreatorId(creator.id)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition',
                        selectedCreator?.id === creator.id
                          ? 'border-[#E7C477]/35 bg-[#E7C477]/[0.07]'
                          : 'border-white/[0.06] hover:border-white/15',
                      )}
                    >
                      {creator.avatarUrl ? (
                        <img src={creator.avatarUrl} alt="" className="h-10 w-10 rounded-xl object-cover" loading="lazy" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-xs font-black text-[#E7C477]">{creator.name.charAt(0)}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-white">{creator.name}</p>
                        <p className="truncate text-[10px] text-zinc-500">@{creator.handle}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-zinc-400"><PlatformMark platform={creator.platform} /></span>
                    </button>
                  ))}
                </div>

                {selectedCreator && <CreatorDetails creator={selectedCreator} />}
              </div>

              <div className="premium-card space-y-4 p-5">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white"><BarChart2 className="h-4 w-4 text-[#00F5C2]" /> How ranking works</h3>
                <p className="text-[11px] leading-relaxed text-zinc-400">{data.methodology}</p>
                <div className="rounded-xl border border-white/[0.06] bg-black/15 p-3 text-[10px] leading-relaxed text-zinc-500">
                  These are public-content signals—not private reach, retention, saves, demographics, income, or follower/non-follower insights. Connect official Meta and TikTok account analytics later for those private metrics.
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function ChannelAnalyzer({ region }: { region: string }) {
  const [platform, setPlatform] = useState<SocialPlatform>('instagram');
  const [handle, setHandle] = useState('');
  const [analysis, setAnalysis] = useState<SocialChannelAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (refresh = false) => {
    const cleanHandle = handle.trim();
    if (!cleanHandle) {
      setError('Enter an Instagram or TikTok username first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.social.getChannelAnalysis({ platform, handle: cleanHandle, region, refresh });
      setAnalysis(result);
      setHandle(result.handle);
      toast.success(`Analyzed ${result.postsAnalyzed} public posts`);
    } catch (requestError) {
      setAnalysis(null);
      setError(requestError instanceof Error ? requestError.message : 'Unable to analyze this public channel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="premium-card overflow-hidden border border-[#E7C477]/15">
      <div className="grid gap-5 border-b border-white/[0.07] p-5 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#E7C477]">
            <Target className="h-3.5 w-3.5" /> Your channel
          </div>
          <h2 className="font-serif text-2xl text-[#F5F1E8]">See what is actually working</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-400">
            Enter a public username to compare recent posts, find the strongest performers, and spot content that needs a new hook.
          </p>
        </div>

        <form
          onSubmit={event => { event.preventDefault(); void analyze(false); }}
          className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto"
        >
          <select
            value={platform}
            onChange={event => { setPlatform(event.target.value as SocialPlatform); setAnalysis(null); setError(null); }}
            aria-label="Channel platform"
            className="rounded-xl border border-white/10 bg-[#0B0F17] px-3 py-3 text-xs font-bold text-white outline-none focus:border-[#E7C477]/50"
          >
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
          </select>
          <label className="relative min-w-0 sm:w-64">
            <span className="sr-only">Public username</span>
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-500">@</span>
            <input
              value={handle}
              onChange={event => setHandle(event.target.value)}
              placeholder="username"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-white/10 bg-[#0B0F17] py-3 pl-8 pr-3 text-xs font-bold text-white outline-none placeholder:text-zinc-600 focus:border-[#E7C477]/50"
            />
          </label>
          <button type="submit" disabled={loading || !handle.trim()} className="premium-button flex items-center justify-center gap-2 px-5 py-3 text-xs font-black disabled:opacity-50">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {loading ? 'Analyzing…' : 'Analyze channel'}
          </button>
        </form>
      </div>

      {error && (
        <div className="flex items-start gap-3 border-b border-amber-500/15 bg-amber-500/[0.05] px-5 py-4 text-xs text-amber-100">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p>{error}</p>
        </div>
      )}

      {loading && !analysis && (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-[#E7C477]" />
          <p className="text-xs font-bold text-zinc-400">Reading recent public posts and comparing their performance…</p>
        </div>
      )}

      {analysis && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-black text-white">@{analysis.handle}</h3>
                <span className="flex items-center gap-1 rounded-md border border-[#00F5C2]/20 bg-[#00F5C2]/[0.06] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#71E6C1]">
                  <PlatformMark platform={analysis.platform} /> Live public data
                </span>
              </div>
              <p className="mt-1 text-[10px] font-bold text-zinc-500">
                {analysis.postsAnalyzed} posts analyzed · {analysis.cached ? 'Cached pull' : 'Fresh pull'} · {formatCollectedAt(analysis.collectedAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <a href={analysis.profileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-300 hover:text-white">
                Open profile <ExternalLink className="h-3 w-3" />
              </a>
              <button type="button" disabled={loading} onClick={() => void analyze(true)} className="flex items-center gap-1.5 rounded-xl border border-[#E7C477]/20 bg-[#E7C477]/[0.06] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#F0D48A] disabled:opacity-50">
                <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} /> Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <ChannelMetric label="Median views" value={formatMetric(analysis.medianViews)} icon={<BarChart2 className="h-4 w-4" />} />
            <ChannelMetric label="Average views" value={formatMetric(analysis.averageViews)} icon={<Eye className="h-4 w-4" />} />
            <ChannelMetric label="Average likes" value={formatMetric(analysis.averageLikes)} icon={<Heart className="h-4 w-4" />} />
            <ChannelMetric label="Engagement" value={analysis.averageEngagementRate === null ? 'Not returned' : `${analysis.averageEngagementRate}%`} icon={<MessageCircle className="h-4 w-4" />} />
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-2xl border border-[#E7C477]/15 bg-[#E7C477]/[0.04] p-4">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
                <Sparkles className="h-4 w-4 text-[#E7C477]" /> What the data says
              </h4>
              <ul className="mt-4 space-y-3">
                {analysis.insights.map(insight => (
                  <li key={insight} className="flex gap-2 text-[11px] leading-relaxed text-zinc-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00F5C2]" /> {insight}
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <ChannelPostList title="Top performers" subtitle="Repeat the winning format—not the exact post." posts={analysis.topPosts} tone="top" />
              <ChannelPostList title="Needs attention" subtitle="Test a stronger opening or clearer payoff." posts={analysis.opportunityPosts} tone="needs-attention" />
            </div>
          </div>

          <p className="border-t border-white/[0.06] pt-4 text-[10px] leading-relaxed text-zinc-500">{analysis.methodology}</p>
        </motion.div>
      )}

      {!loading && !analysis && !error && (
        <div className="flex items-center gap-3 px-5 py-4 text-[10px] leading-relaxed text-zinc-500">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00F5C2]" />
          Public profiles work without connecting the account. Private reach, retention, saves, demographics, and follower conversion require official account authorization.
        </div>
      )}
    </section>
  );
}

function ChannelMetric({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
      <div className="mb-3 text-[#E7C477]">{icon}</div>
      <p className="text-lg font-black text-white">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-zinc-500">{label}</p>
    </div>
  );
}

function ChannelPostList({
  title,
  subtitle,
  posts,
  tone,
}: {
  title: string;
  subtitle: string;
  posts: SocialChannelPost[];
  tone: 'top' | 'needs-attention';
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-black/15 p-4">
      <h4 className="text-xs font-black text-white">{title}</h4>
      <p className="mt-1 text-[9px] text-zinc-500">{subtitle}</p>
      <div className="mt-3 space-y-2">
        {posts.map(post => (
          <a key={post.id} href={post.sourceUrl} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-xl border border-white/[0.06] p-2 transition hover:border-white/15 hover:bg-white/[0.025]">
            {post.thumbnailUrl ? (
              <img src={post.thumbnailUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-500"><PlatformMark platform={post.platform} /></div>
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 text-[10px] font-bold text-zinc-200 group-hover:text-white">{post.title}</p>
              <p className="mt-1 text-[9px] font-black text-zinc-500">{formatMetric(post.views)} views</p>
            </div>
            <span className={cn(
              'text-[9px] font-black',
              tone === 'top' ? 'text-[#71E6C1]' : 'text-amber-300',
            )}>
              {post.performanceVsMedian === null ? '—' : `${post.performanceVsMedian > 0 ? '+' : ''}${post.performanceVsMedian}%`}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function CopyBlock({
  label,
  value,
  copyKey,
  copied,
  onCopy,
  multiline = false,
}: {
  label: string;
  value: string;
  copyKey: string;
  copied: string | null;
  onCopy: (value: string, key: string) => Promise<void>;
  multiline?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.015] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[9px] font-black uppercase tracking-wider text-zinc-500">{label}</p>
        <button type="button" onClick={() => void onCopy(value, copyKey)} className="flex items-center gap-1 text-[10px] font-bold text-[#E7C477]">
          {copied === copyKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied === copyKey ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className={cn('text-xs leading-relaxed text-zinc-200', !multiline && 'font-bold')}>{value}</p>
    </div>
  );
}

function CreatorDetails({ creator }: { creator: SocialCreatorSignal }) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-black/15 p-4">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-black uppercase tracking-wider text-zinc-500">Platform</span>
        <span className="font-bold text-white">{platformLabel(creator.platform)}</span>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-black uppercase tracking-wider text-zinc-500">Posts observed</span>
        <span className="font-bold text-white">{creator.postsObserved}</span>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-black uppercase tracking-wider text-zinc-500">Average public views</span>
        <span className="font-bold text-white">{formatMetric(creator.averageViews)}</span>
      </div>
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-black uppercase tracking-wider text-zinc-500">Observed engagement</span>
        <span className="font-bold text-white">{creator.averageEngagementRate === null ? 'Not returned' : `${creator.averageEngagementRate}%`}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-2">
        <a href={creator.profileUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2 py-2 text-[9px] font-black uppercase tracking-wider text-zinc-300 hover:text-white">
          Profile <ExternalLink className="h-3 w-3" />
        </a>
        <a href={creator.topPostUrl} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 rounded-lg border border-[#E7C477]/20 bg-[#E7C477]/[0.06] px-2 py-2 text-[9px] font-black uppercase tracking-wider text-[#F0D48A]">
          Top post <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
