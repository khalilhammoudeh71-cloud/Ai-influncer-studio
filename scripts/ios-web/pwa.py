import asyncio,json,threading
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from playwright.async_api import async_playwright,expect
ROOT=Path(__file__).resolve().parents[2]
class Handler(SimpleHTTPRequestHandler):
 version=1
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'work/ios-web/build-final'),**kwargs)
 def do_GET(self):
  if self.path.startswith('/sw.js'):
   body=(ROOT/'public/sw.js').read_text().replace('offline-v1','offline-v'+str(self.version)).encode()
   self.send_response(200);self.send_header('Content-Type','application/javascript');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
  else:super().do_GET()
 def log_message(self,*args):pass
async def main():
 server=ThreadingHTTPServer(('127.0.0.1',5222),Handler);threading.Thread(target=server.serve_forever,daemon=True).start()
 async with async_playwright() as p:
  browser=await p.chromium.launch();context=await browser.new_context()
  await context.route('**/*',lambda r:r.continue_() if r.request.url.startswith('http://127.0.0.1:5222') else r.abort())
  page=await context.new_page();await page.goto('http://127.0.0.1:5222/')
  await page.evaluate('navigator.serviceWorker.ready.then(()=>true)')
  await page.reload();await page.wait_for_function('navigator.serviceWorker.controller !== null')
  await page.evaluate("fetch('/api/private-fixture').catch(()=>{})")
  keys=await page.evaluate("async()=>{const c=await caches.open('ai-studio-offline-v1');return (await c.keys()).map(r=>new URL(r.url).pathname)}")
  assert keys==['/offline.html'],keys
  await context.set_offline(True);await page.reload()
  await expect(page.get_by_role('heading',name='Connect to open your studio')).to_be_visible()
  await page.screenshot(path=str(ROOT/'work/ios-web/offline-browser.png'))
  await context.set_offline(False);await page.get_by_role('link',name='Try again').click()
  await expect(page.locator('.studio-public-theme').first).to_be_visible()
  Handler.version=2
  await page.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.update())")
  await page.wait_for_function("navigator.serviceWorker.getRegistration().then(r=>r.waiting?.state === 'installed')")
  assert await page.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.active !== r.waiting)")
  print(json.dumps({'offlineFallback':'pass','reconnect':'pass','cacheOnly':keys,'updateWaitsForOpenTabs':'pass','engine':browser.version}))
  await browser.close()
 server.shutdown()
asyncio.run(main())
