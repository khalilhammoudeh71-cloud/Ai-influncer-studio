import {spawnSync} from 'node:child_process';
const files = ['server/superAgent.test.ts','server/agentChat.integration.test.ts','server/agentRuns.integration.test.ts','server/agentResearch.test.ts','server/agentIdentity.test.ts','server/nativeVoice.test.ts','src/utils/nativeVoiceLifecycle.test.ts','src/utils/personaMemory.test.ts','shared/agentCampaign.test.ts'];
const result=spawnSync(process.execPath,['--import','./scripts/evaluation/isolate.mjs','--import','tsx','--test','--test-reporter=tap',...files],{stdio:'inherit',timeout:120000});
process.exit(result.status ?? 1);
