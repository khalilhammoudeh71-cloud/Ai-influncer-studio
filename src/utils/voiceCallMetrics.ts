import type { VoiceMetric } from './nativeVoiceCall';
export function summarizeVoiceMetrics(metrics: VoiceMetric[]) {
  const groups = new Map<string, { event: string; source: VoiceMetric['source']; values: number[] }>();
  for (const metric of metrics) {
    if (typeof metric.ms !== 'number' || !Number.isFinite(metric.ms) || metric.ms < 0) continue;
    const key = `${metric.source}:${metric.event}`;
    const group = groups.get(key) || { event: metric.event, source: metric.source, values: [] };
    group.values.push(metric.ms); groups.set(key, group);
  }
  return [...groups.values()].map(({ event, source, values }) => {
    values.sort((a, b) => a - b);
    const middle = Math.floor(values.length / 2);
    return { event, source, count: values.length,
      medianMs: Math.round(values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2),
      p95Ms: Math.round(values[Math.ceil(values.length * .95) - 1]),
    };
  });
}
