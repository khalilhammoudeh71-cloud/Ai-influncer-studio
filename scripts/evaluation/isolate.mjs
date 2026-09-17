// Deterministic evaluations never load application credentials or contact providers.
process.env.DOTENV_CONFIG_PATH = '/dev/null';
for (const key of Object.keys(process.env)) {
  if (/API_KEY|api_key|DATABASE_URL|SUPER_AGENT_|GEMINI|VENICE|RUNWARE|WIRO|WAVESPEED|ATLASCLOUD/.test(key)) delete process.env[key];
}
const localFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
  if (['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return localFetch(input, { ...init, redirect: 'error' });
  throw new Error('Evaluation blocked unmocked network request');
};
