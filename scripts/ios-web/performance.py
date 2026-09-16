"""Repeated local production loading measurements, not field or device results."""
import asyncio,gzip,json,sys,threading,time
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2];stage=sys.argv[1];directory=ROOT/'work/ios-web'/('build-'+stage)
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kw):super().__init__(*args,directory=str(directory),**kw)
 def log_message(self,*args):pass
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',5221),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 results=[]
 async with async_playwright() as p:
  browser=await p.chromium.launch()
  for i in range(5):
   context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
   async def route(r):
    if r.request.url.startswith('http://127.0.0.1:5221'):await r.continue_()
    else:await r.abort()
   await context.route('**/*',route)
   page=await context.new_page()
   await page.add_init_script("window.longTasks=[];new PerformanceObserver(l=>window.longTasks.push(...l.getEntries().map(e=>e.duration))).observe({type:'longtask',buffered:true});")
   cdp=await context.new_cdp_session(page);await cdp.send('Emulation.setCPUThrottlingRate',{'rate':4})
   start=time.monotonic();await page.goto('http://127.0.0.1:5221/',wait_until='load',timeout=60000)
   await page.locator('.studio-public-theme').first.wait_for(timeout=30000)
   await page.evaluate('() => new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
   metrics=await page.evaluate("() => ({navigation:performance.getEntriesByType('navigation')[0].toJSON(),longTasks:window.longTasks,resources:performance.getEntriesByType('resource').filter(r=>r.name.startsWith(location.origin)).map(r=>({url:r.name,bytes:r.decodedBodySize}))})")
   metrics['readyMs']=round((time.monotonic()-start)*1000);results.append(metrics)
   await context.close()
  await browser.close()
 server.shutdown();(ROOT/f'work/ios-web/performance-{stage}.json').write_text(json.dumps(results,indent=2))
 print(json.dumps({'runs':len(results),'readyMs':[r['readyMs'] for r in results]}))
asyncio.run(main())
