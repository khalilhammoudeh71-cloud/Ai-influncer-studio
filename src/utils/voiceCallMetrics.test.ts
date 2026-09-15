import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeVoiceMetrics } from './voiceCallMetrics';
test('timing summaries keep measurement sources separate and ignore missing or invalid durations',()=>{
 const metrics:any[]=[100,200,300,400,900].map(ms=>({event:'reply',source:'browser-render',at:1,ms}));
 metrics.push({event:'reply',source:'provider-event',at:1,ms:50},{event:'reply',source:'browser-render',at:1,ms:NaN},{event:'reply',source:'browser-render',at:1,ms:-1},{event:'connected',source:'client-control',at:1});
 assert.deepEqual(summarizeVoiceMetrics(metrics),[
  {event:'reply',source:'browser-render',count:5,medianMs:300,p95Ms:900},
  {event:'reply',source:'provider-event',count:1,medianMs:50,p95Ms:50},
 ]);
});
