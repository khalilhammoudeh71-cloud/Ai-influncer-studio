const SCRAPE_CREATORS_BASE_URL = 'https://api.scrapecreators.com';
const SOCIAL_CACHE_TTL_MS = 10 * 60 * 1000;
const SOCIAL_REQUEST_TIMEOUT_MS = 15_000;

export type SocialPlatform = 'instagram' | 'tiktok';

export interface SocialTrend {
  id: string;
  platform: SocialPlatform;
  title: string;
  description: string;
  sourceUrl: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  authorName: string;
  authorHandle: string;
  authorAvatarUrl: string | null;
  publishedAt: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  engagementRate: number | null;
  trendScore: number;
  region: string | null;
}

export interface SocialCreatorSignal {
  id: string;
  platform: SocialPlatform;
  name: string;
  handle: string;
  avatarUrl: string | null;
  profileUrl: string;
  postsObserved: number;
  averageViews: number | null;
  averageEngagementRate: number | null;
  topPostUrl: string;
}

export interface SocialTrendsPayload {
  trends: SocialTrend[];
  creators: SocialCreatorSignal[];
  collectedAt: string;
  cached: boolean;
  partial: boolean;
  sources: SocialPlatform[];
  errors: Array<{ platform: SocialPlatform; message: string }>;
  credits: Partial<Record<SocialPlatform, { charged: number | null; remaining: number | null }>>;
  methodology: string;
}

export type ChannelPostPerformance = 'top' | 'typical' | 'needs-attention';

export interface SocialChannelPost extends SocialTrend {
  performance: ChannelPostPerformance;
  performanceVsMedian: number | null;
}

export interface SocialChannelAnalysisPayload {
  platform: SocialPlatform;
  handle: string;
  profileUrl: string;
  collectedAt: string;
  cached: boolean;
  postsAnalyzed: number;
  averageViews: number | null;
  medianViews: number | null;
  averageLikes: number | null;
  averageComments: number | null;
  averageShares: number | null;
  averageEngagementRate: number | null;
  posts: SocialChannelPost[];
  topPosts: SocialChannelPost[];
  opportunityPosts: SocialChannelPost[];
  insights: string[];
  credits: { charged: number | null; remaining: number | null };
  methodology: string;
}

interface CacheEntry {
  expiresAt: number;
  payload: SocialTrendsPayload;
}

interface ChannelCacheEntry {
  expiresAt: number;
  payload: SocialChannelAnalysisPayload;
}

interface ProviderResult {
  platform: SocialPlatform;
  trends: Omit<SocialTrend, 'trendScore' | 'engagementRate'>[];
  charged: number | null;
  remaining: number | null;
}

const cache = new Map<string, CacheEntry>();
const channelCache = new Map<string, ChannelCacheEntry>();

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function finiteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function contentText(value: unknown): string {
  if (typeof value === 'string') return cleanText(value);
  const record = asRecord(value);
  return cleanText(record.text || record.caption || record.description);
}

function compactTitle(text: string, fallback: string): string {
  if (!text) return fallback;
  const firstLine = text.split(/[\n\r]/)[0]?.trim() || text;
  return firstLine.length > 96 ? `${firstLine.slice(0, 93).trim()}…` : firstLine;
}

function isoFromUnix(value: unknown): string | null {
  const seconds = finiteNumber(value);
  if (seconds === null) return null;
  const date = new Date(seconds > 10_000_000_000 ? seconds : seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function scrapeCreatorsGet(path: string, params: Record<string, string | boolean | undefined> = {}): Promise<Record<string, any>> {
  const apiKey = process.env.SCRAPECREATORS_API_KEY?.trim();
  if (!apiKey) {
    const error = new Error('Social Intelligence is not configured yet. Add SCRAPECREATORS_API_KEY to the server environment.');
    (error as any).statusCode = 503;
    throw error;
  }

  const url = new URL(path, SCRAPE_CREATORS_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOCIAL_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'accept': 'application/json',
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let body: Record<string, any> = {};
    try {
      body = text ? asRecord(JSON.parse(text)) : {};
    } catch {
      body = {};
    }

    if (!response.ok || body.success === false) {
      const providerMessage = cleanText(body.message || body.error || body.detail);
      throw new Error(providerMessage || `Scrape Creators returned ${response.status}.`);
    }
    return body;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Scrape Creators timed out. Please refresh in a moment.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeInstagramReels(body: Record<string, any>): ProviderResult {
  const data = asRecord(body.data);
  const reels = Array.isArray(data.reels) ? data.reels : Array.isArray(body.reels) ? body.reels : [];
  const trends = reels.map((raw: unknown, index: number) => {
    const reel = asRecord(raw);
    const user = asRecord(reel.user || reel.owner);
    const handle = cleanText(user.username || reel.username) || 'instagram_creator';
    const shortcode = cleanText(reel.shortcode || reel.code);
    const caption = cleanText(reel.caption || reel.caption_text || reel.description);
    const id = cleanText(reel.id || reel.pk || shortcode) || `instagram-${index}`;
    return {
      id: `instagram:${id}`,
      platform: 'instagram' as const,
      title: compactTitle(caption, `Trending Reel by @${handle}`),
      description: caption || `Trending public Instagram Reel from @${handle}.`,
      sourceUrl: cleanText(reel.url) || (shortcode ? `https://www.instagram.com/reel/${shortcode}/` : `https://www.instagram.com/${handle}/`),
      thumbnailUrl: cleanText(reel.image_url || reel.thumbnail_url || reel.display_url) || null,
      videoUrl: cleanText(reel.video_url) || null,
      authorName: cleanText(user.full_name || user.name) || handle,
      authorHandle: handle,
      authorAvatarUrl: cleanText(user.profile_pic_url || user.avatar_url) || null,
      publishedAt: isoFromUnix(reel.taken_at || reel.timestamp),
      views: finiteNumber(reel.play_count ?? reel.video_view_count ?? reel.view_count),
      likes: finiteNumber(reel.like_count),
      comments: finiteNumber(reel.comment_count),
      shares: finiteNumber(reel.share_count),
      region: null,
    };
  });

  return {
    platform: 'instagram',
    trends,
    charged: finiteNumber(body.credits_charged),
    remaining: finiteNumber(body.credits_remaining),
  };
}

function normalizeInstagramPosts(body: Record<string, any>, requestedHandle: string): ProviderResult {
  const items = Array.isArray(body.items) ? body.items : [];
  const trends = items.map((raw: unknown, index: number) => {
    const item = asRecord(raw);
    const user = asRecord(item.user || asRecord(item.caption).user);
    const handle = cleanText(user.username) || requestedHandle;
    const code = cleanText(item.code || item.shortcode);
    const caption = contentText(item.caption || item.caption_text || item.description);
    const id = cleanText(item.id || item.pk || code) || `instagram-channel-${index}`;
    return {
      id: `instagram:${id}`,
      platform: 'instagram' as const,
      title: compactTitle(caption, `Post by @${handle}`),
      description: caption || `Public Instagram post from @${handle}.`,
      sourceUrl: code ? `https://www.instagram.com/p/${code}/` : `https://www.instagram.com/${handle}/`,
      thumbnailUrl: cleanText(item.display_uri || item.image_url || item.thumbnail_url || item.display_url) || null,
      videoUrl: cleanText(item.video_url) || null,
      authorName: cleanText(user.full_name || user.name) || handle,
      authorHandle: handle,
      authorAvatarUrl: cleanText(user.profile_pic_url || user.avatar_url) || null,
      publishedAt: cleanText(item.created_at) || isoFromUnix(item.taken_at || item.timestamp),
      views: finiteNumber(item.play_count ?? item.ig_play_count ?? item.video_view_count ?? item.view_count),
      likes: finiteNumber(item.like_count),
      comments: finiteNumber(item.comment_count),
      shares: finiteNumber(item.share_count),
      region: null,
    };
  });

  return {
    platform: 'instagram',
    trends,
    charged: finiteNumber(body.credits_charged),
    remaining: finiteNumber(body.credits_remaining),
  };
}

function normalizeTikTokFeed(body: Record<string, any>, requestedRegion: string): ProviderResult {
  const videos = Array.isArray(body.aweme_list)
    ? body.aweme_list
    : Array.isArray(body.data)
      ? body.data
      : [];

  const trends = videos.map((raw: unknown, index: number) => {
    const item = asRecord(raw);
    const author = asRecord(item.author);
    const statistics = asRecord(item.statistics || item.stats);
    const video = asRecord(item.video);
    const play = asRecord(video.play_addr || video.play);
    const cover = asRecord(video.cover || video.origin_cover || video.dynamic_cover);
    const handle = cleanText(author.unique_id || author.uniqueId || author.sec_uid) || 'tiktok_creator';
    const caption = cleanText(item.desc || item.description);
    const id = cleanText(item.aweme_id || item.id) || `tiktok-${index}`;
    const canonicalUrl = cleanText(item.url || item.share_url) || `https://www.tiktok.com/@${handle}/video/${id}`;
    const videoUrl = cleanText(play.url_list?.[0] || video.play_url || video.download_addr?.url_list?.[0]);
    const thumbnailUrl = cleanText(cover.url_list?.[0] || video.cover_url || item.cover);
    const avatar = asRecord(author.avatar_medium || author.avatar_thumb || author.avatar_larger);

    return {
      id: `tiktok:${id}`,
      platform: 'tiktok' as const,
      title: compactTitle(caption, `Trending TikTok by @${handle}`),
      description: caption || `Trending public TikTok from @${handle}.`,
      sourceUrl: canonicalUrl,
      thumbnailUrl: thumbnailUrl || null,
      videoUrl: videoUrl || null,
      authorName: cleanText(author.nickname || author.name) || handle,
      authorHandle: handle,
      authorAvatarUrl: cleanText(avatar.url_list?.[0] || author.avatar_url) || null,
      publishedAt: cleanText(item.create_time_utc) || isoFromUnix(item.create_time),
      views: finiteNumber(statistics.play_count ?? statistics.view_count),
      likes: finiteNumber(statistics.digg_count ?? statistics.like_count),
      comments: finiteNumber(statistics.comment_count),
      shares: finiteNumber(statistics.share_count),
      region: cleanText(item.region) || requestedRegion,
    };
  });

  return {
    platform: 'tiktok',
    trends,
    charged: finiteNumber(body.credits_charged),
    remaining: finiteNumber(body.credits_remaining),
  };
}

function percentile(value: number | null, population: number[]): number {
  if (value === null || population.length === 0) return 0;
  const atOrBelow = population.filter(candidate => candidate <= value).length;
  return atOrBelow / population.length;
}

function average(values: Array<number | null>): number | null {
  const available = values.filter((value): value is number => value !== null);
  return available.length ? available.reduce((sum, value) => sum + value, 0) / available.length : null;
}

function median(values: Array<number | null>): number | null {
  const available = values.filter((value): value is number => value !== null).sort((a, b) => a - b);
  if (!available.length) return null;
  const middle = Math.floor(available.length / 2);
  return available.length % 2 ? available[middle] : (available[middle - 1] + available[middle]) / 2;
}

function rounded(value: number | null, digits = 0): number | null {
  if (value === null) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function sanitizeHandle(rawHandle: string, platform: SocialPlatform): string {
  const trimmed = rawHandle.trim();
  let candidate = trimmed;
  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (url.hostname.includes('instagram.com')) candidate = url.pathname.split('/').filter(Boolean)[0] || '';
    if (url.hostname.includes('tiktok.com')) candidate = (url.pathname.split('/').find(segment => segment.startsWith('@')) || '').slice(1);
  } catch {}
  const handle = candidate.replace(/^@/, '').split(/[/?#]/)[0]?.trim() || '';
  const validPattern = platform === 'instagram' ? /^[A-Za-z0-9._]{1,30}$/ : /^[A-Za-z0-9._-]{1,64}$/;
  if (!validPattern.test(handle)) {
    const error = new Error(`Enter a valid ${platform === 'instagram' ? 'Instagram' : 'TikTok'} username.`);
    (error as any).statusCode = 400;
    throw error;
  }
  return handle;
}

function extractHashtags(text: string): string[] {
  return (text.match(/#[\p{L}\p{N}_]+/gu) || []).map(tag => tag.toLowerCase());
}

function buildChannelInsights(posts: SocialChannelPost[], medianViews: number | null): string[] {
  if (!posts.length) return [];
  const insights: string[] = [];
  const byViews = [...posts].filter(post => post.views !== null).sort((a, b) => (b.views || 0) - (a.views || 0));
  const top = byViews[0];
  if (top?.views !== null && medianViews !== null && medianViews > 0) {
    const multiple = top.views / medianViews;
    insights.push(`Your strongest observed post reached ${formatCount(top.views)} views, ${multiple.toFixed(1)}x this channel's median.`);
  }

  const topHashtags = new Map<string, number>();
  byViews.slice(0, Math.min(5, Math.max(2, Math.ceil(byViews.length / 3)))).forEach(post => {
    extractHashtags(post.description).forEach(tag => topHashtags.set(tag, (topHashtags.get(tag) || 0) + 1));
  });
  const repeatedTags = [...topHashtags.entries()].filter(([, count]) => count > 1).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tag]) => tag);
  if (repeatedTags.length) insights.push(`Repeated hashtags in the strongest posts: ${repeatedTags.join(', ')}.`);

  const chronological = [...posts].filter(post => post.publishedAt).sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime());
  if (chronological.length >= 6) {
    const split = Math.floor(chronological.length / 2);
    const recentAverage = average(chronological.slice(0, split).map(post => post.views));
    const olderAverage = average(chronological.slice(split).map(post => post.views));
    if (recentAverage !== null && olderAverage !== null && olderAverage > 0) {
      const difference = ((recentAverage - olderAverage) / olderAverage) * 100;
      insights.push(`Recent observed posts average ${Math.abs(difference).toFixed(0)}% ${difference >= 0 ? 'more' : 'fewer'} views than the older posts in this sample.`);
    }
  }

  const averageEngagement = average(posts.map(post => post.engagementRate));
  if (averageEngagement !== null) insights.push(`Observed public engagement averages ${averageEngagement.toFixed(2)}% across posts with a view count.`);
  if (!insights.length) insights.push('The provider returned too few comparable public metrics for a reliable pattern. Refresh after more posts are available.');
  return insights;
}

function scoreTrends(rawTrends: ProviderResult['trends']): SocialTrend[] {
  const views = rawTrends.map(item => item.views).filter((value): value is number => value !== null);
  const engagementRates = rawTrends
    .map(item => {
      if (!item.views) return null;
      return ((item.likes || 0) + (item.comments || 0) + (item.shares || 0)) / item.views;
    })
    .filter((value): value is number => value !== null);
  const now = Date.now();

  return rawTrends.map(item => {
    const engagementRate = item.views
      ? (((item.likes || 0) + (item.comments || 0) + (item.shares || 0)) / item.views) * 100
      : null;
    const published = item.publishedAt ? new Date(item.publishedAt).getTime() : Number.NaN;
    const ageHours = Number.isFinite(published) ? Math.max(0, (now - published) / 3_600_000) : null;
    const recency = ageHours === null ? 0.5 : Math.max(0, Math.min(1, 1 - ageHours / (24 * 14)));
    const viewRank = percentile(item.views, views);
    const engagementRank = percentile(engagementRate === null ? null : engagementRate / 100, engagementRates);
    const trendScore = Math.round((viewRank * 55) + (engagementRank * 30) + (recency * 15));

    return {
      ...item,
      engagementRate: engagementRate === null ? null : Number(engagementRate.toFixed(2)),
      trendScore,
    };
  }).sort((a, b) => b.trendScore - a.trendScore);
}

function creatorSignals(trends: SocialTrend[]): SocialCreatorSignal[] {
  const groups = new Map<string, SocialTrend[]>();
  trends.forEach(trend => {
    const key = `${trend.platform}:${trend.authorHandle.toLowerCase()}`;
    groups.set(key, [...(groups.get(key) || []), trend]);
  });

  return Array.from(groups.entries()).map(([id, posts]) => {
    const first = posts[0];
    const viewValues = posts.map(post => post.views).filter((value): value is number => value !== null);
    const engagementValues = posts.map(post => post.engagementRate).filter((value): value is number => value !== null);
    const top = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
    return {
      id,
      platform: first.platform,
      name: first.authorName,
      handle: first.authorHandle,
      avatarUrl: first.authorAvatarUrl,
      profileUrl: first.platform === 'instagram'
        ? `https://www.instagram.com/${first.authorHandle}/`
        : `https://www.tiktok.com/@${first.authorHandle}`,
      postsObserved: posts.length,
      averageViews: viewValues.length ? Math.round(viewValues.reduce((sum, value) => sum + value, 0) / viewValues.length) : null,
      averageEngagementRate: engagementValues.length
        ? Number((engagementValues.reduce((sum, value) => sum + value, 0) / engagementValues.length).toFixed(2))
        : null,
      topPostUrl: top.sourceUrl,
    };
  }).sort((a, b) => (b.averageViews || 0) - (a.averageViews || 0));
}

export function isSocialIntelligenceConfigured(): boolean {
  return Boolean(process.env.SCRAPECREATORS_API_KEY?.trim());
}

export async function getSocialTrends(options: {
  platform: 'all' | SocialPlatform;
  region: string;
  refresh?: boolean;
}): Promise<SocialTrendsPayload> {
  const platform = options.platform;
  const region = options.region.toUpperCase();
  const cacheKey = `${platform}:${region}`;
  const cached = cache.get(cacheKey);
  if (!options.refresh && cached && cached.expiresAt > Date.now()) {
    return { ...cached.payload, cached: true };
  }

  const requests: Array<Promise<ProviderResult>> = [];
  if (platform === 'all' || platform === 'instagram') {
    requests.push(scrapeCreatorsGet('/v1/instagram/reels/trending').then(normalizeInstagramReels));
  }
  if (platform === 'all' || platform === 'tiktok') {
    requests.push(
      scrapeCreatorsGet('/v1/tiktok/get-trending-feed', { region, trim: true })
        .then(body => normalizeTikTokFeed(body, region)),
    );
  }

  const settled = await Promise.allSettled(requests);
  const results: ProviderResult[] = [];
  const errors: SocialTrendsPayload['errors'] = [];
  settled.forEach((result, index) => {
    const requestedPlatform: SocialPlatform = platform === 'all'
      ? (index === 0 ? 'instagram' : 'tiktok')
      : platform;
    if (result.status === 'fulfilled') results.push(result.value);
    else errors.push({ platform: requestedPlatform, message: result.reason instanceof Error ? result.reason.message : 'Provider request failed.' });
  });

  if (results.length === 0) {
    const error = new Error(errors.map(item => `${item.platform}: ${item.message}`).join(' ' ) || 'No social trend data was returned.');
    (error as any).statusCode = isSocialIntelligenceConfigured() ? 502 : 503;
    throw error;
  }

  const deduplicated = Array.from(new Map(
    results.flatMap(result => result.trends).map(trend => [trend.sourceUrl || trend.id, trend]),
  ).values());
  const trends = scoreTrends(deduplicated);
  const sources = results.map(result => result.platform);
  const credits: SocialTrendsPayload['credits'] = {};
  results.forEach(result => {
    credits[result.platform] = { charged: result.charged, remaining: result.remaining };
  });

  const payload: SocialTrendsPayload = {
    trends,
    creators: creatorSignals(trends).slice(0, 12),
    collectedAt: new Date().toISOString(),
    cached: false,
    partial: errors.length > 0,
    sources,
    errors,
    credits,
    methodology: 'Signal score ranks this collection by public views (55%), public engagement rate (30%), and recency (15%). It is not a platform-provided growth percentage.',
  };
  cache.set(cacheKey, { expiresAt: Date.now() + SOCIAL_CACHE_TTL_MS, payload });
  return payload;
}

export async function getSocialChannelAnalysis(options: {
  platform: SocialPlatform;
  handle: string;
  region?: string;
  refresh?: boolean;
}): Promise<SocialChannelAnalysisPayload> {
  const platform = options.platform;
  const handle = sanitizeHandle(options.handle, platform);
  const region = (options.region || 'US').toUpperCase();
  const cacheKey = `${platform}:${handle.toLowerCase()}:${region}`;
  const cached = channelCache.get(cacheKey);
  if (!options.refresh && cached && cached.expiresAt > Date.now()) {
    return { ...cached.payload, cached: true };
  }

  const provider = platform === 'instagram'
    ? normalizeInstagramPosts(
      await scrapeCreatorsGet('/v2/instagram/user/posts', { handle, trim: true }),
      handle,
    )
    : normalizeTikTokFeed(
      await scrapeCreatorsGet('/v3/tiktok/profile/videos', {
        handle,
        sort_by: 'latest',
        region,
        trim: true,
      }),
      region,
    );

  if (!provider.trends.length) {
    const error = new Error(`No public ${platform === 'instagram' ? 'Instagram' : 'TikTok'} posts were returned for @${handle}. Check the username and make sure the account is public.`);
    (error as any).statusCode = 404;
    throw error;
  }

  const scored = scoreTrends(provider.trends);
  const medianViews = median(scored.map(post => post.views));
  const posts: SocialChannelPost[] = scored.map(post => {
    const performanceVsMedian = post.views !== null && medianViews !== null && medianViews > 0
      ? ((post.views - medianViews) / medianViews) * 100
      : null;
    const performance: ChannelPostPerformance = performanceVsMedian === null
      ? (post.trendScore >= 70 ? 'top' : post.trendScore <= 30 ? 'needs-attention' : 'typical')
      : performanceVsMedian >= 20
        ? 'top'
        : performanceVsMedian <= -30
          ? 'needs-attention'
          : 'typical';
    return {
      ...post,
      performance,
      performanceVsMedian: rounded(performanceVsMedian),
    };
  });

  const byViews = [...posts].sort((a, b) => (b.views || 0) - (a.views || 0));
  const topPosts = byViews.slice(0, Math.min(3, byViews.length));
  const needsAttention = byViews.filter(post => post.performance === 'needs-attention').reverse();
  const opportunityPosts = (needsAttention.length ? needsAttention : [...byViews].reverse())
    .slice(0, Math.min(3, posts.length));
  const payload: SocialChannelAnalysisPayload = {
    platform,
    handle,
    profileUrl: platform === 'instagram'
      ? `https://www.instagram.com/${handle}/`
      : `https://www.tiktok.com/@${handle}`,
    collectedAt: new Date().toISOString(),
    cached: false,
    postsAnalyzed: posts.length,
    averageViews: rounded(average(posts.map(post => post.views))),
    medianViews: rounded(medianViews),
    averageLikes: rounded(average(posts.map(post => post.likes))),
    averageComments: rounded(average(posts.map(post => post.comments))),
    averageShares: rounded(average(posts.map(post => post.shares))),
    averageEngagementRate: rounded(average(posts.map(post => post.engagementRate)), 2),
    posts,
    topPosts,
    opportunityPosts,
    insights: buildChannelInsights(posts, medianViews),
    credits: { charged: provider.charged, remaining: provider.remaining },
    methodology: `This analysis compares the public metrics returned for ${posts.length} recent posts against this channel's observed median. It does not include private reach, retention, saves, demographics, or follower conversion.`,
  };

  channelCache.set(cacheKey, { expiresAt: Date.now() + SOCIAL_CACHE_TTL_MS, payload });
  return payload;
}
