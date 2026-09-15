import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('/Users/Family/Documents/Codex/2026-09-14/ca/outputs/voice-repair')
manifest=json.loads((out/'samples.json').read_text())
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page()
    page.route('**/audit-sample/*',lambda route:route.fulfill(body=(out/'samples'/route.request.url.rsplit('/',1)[1]).read_bytes(),content_type='audio/mpeg'))
    page.goto('http://127.0.0.1:5175/reports/voice-library-fixture.html')
    for item in manifest:
        result=page.evaluate('''async file=>{const ctx=new AudioContext();const a=await (await fetch('/audit-sample/'+file)).arrayBuffer();const b=await ctx.decodeAudioData(a);let peak=0,sum=0;for(const x of b.getChannelData(0)){peak=Math.max(peak,Math.abs(x));sum+=x*x;}await ctx.close();return{durationSeconds:b.duration,sampleRate:b.sampleRate,peak,rms:Math.sqrt(sum/b.length)};}''',item['file'].split('/')[-1])
        assert result['durationSeconds']>1 and result['rms']>0,result
        item['decodedAudio']=result
    browser.close()
(out/'samples.json').write_text(json.dumps(manifest,indent=2))
print('PASS: all eight MP3 samples decode, contain nonzero audio, and have measurable duration. This is not a subjective quality rating.')
