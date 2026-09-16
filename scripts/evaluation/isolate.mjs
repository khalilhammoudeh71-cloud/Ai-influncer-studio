// Deterministic evaluations never load application credentials or contact providers.
process.env.DOTENV_CONFIG_PATH = '/dev/null';
for (const key of Object.keys(process.env)) {
  if (/API_KEY|api_key|DATABASE_URL|SUPER_AGENT_|GEMINI|VENICE|RUNWARE|WIRO|WAVESPEED|ATLASCLOUD/.test(key)) delete process.env[key];
}
globalThis.fetch = async () => { throw new Error('Evaluation blocked unmocked network request'); };
