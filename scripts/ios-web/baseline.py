import asyncio,json,sys,time
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[2]
STAGE=sys.argv[1] if len(sys.argv)>1 else 'baseline'
OUT=ROOT/'work/ios-web'/STAGE;OUT.mkdir(parents=True,exist_ok=True)
PERSONA={'id':'fixture-persona','name':'Avery Example — long persona name','niche':'Education','tone':'Warm','platform':'Instagram','status':'Active','avatar':'','personalityTraits':[],'visualStyle':'Natural','audienceType':'Adults','contentBoundaries':'','bio':'A fictional test persona.','brandVoiceRules':'','contentGoals':'Teach clearly','personaNotes':'','voiceId':'fixture-voice','voiceEngine':'elevenlabs','generatedImages':[]}
AUTH="""const user={id:'ios-fixture',email:'fixture@example.invalid',email_confirmed_at:'2026-01-01',user_metadata:{}};const session={user,access_token:'fixture-not-a-credential'};export const supabase={auth:{getSession:async()=>({data:{session}}),getUser:async()=>({data:{user}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({error:null})}};"""
async def fixture(route):
 u=route.request.url
 if '/src/lib/supabase.ts' in u:return await route.fulfill(content_type='application/javascript',body=AUTH)
 if '/api/' in u:
  path=u.split('/api/')[1].split('?')[0]
  value=[]
  if path=='personas':value=[PERSONA]
  elif path=='billing':value={'credits':100,'subscriptionStatus':'active','email':'fixture@example.invalid'}
  elif path.startswith('agent-runs'):value={'runs':[]}
  elif path.startswith('media-jobs'):value={'jobs':[]}
  elif path=='agent/chat':value={'text':'Fixture response. No actions started.','suggestedSteps':[]}
  return await route.fulfill(content_type='application/json',body=json.dumps(value))
 if not u.startswith('http://127.0.0.1:5217'):return await route.abort()
 await route.continue_()
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.webkit.launch()
  for name,w,h in [('small-phone',375,667),('large-phone',430,932),('ipad-portrait',768,1024),('ipad-landscape',1024,768),('ipad-narrow',390,844),('desktop',1440,900)]:
   context=await browser.new_context(viewport={'width':w,'height':h},is_mobile=w<1024,has_touch=w<1440,device_scale_factor=1,reduced_motion='reduce')
   await context.route('**/*',fixture)
   page=await context.new_page()
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.add_init_script("localStorage.setItem('ai_influencer_active_tab',new URL(location.href).searchParams.get('fixtureTab') || 'personas');localStorage.removeItem('ai_influencer_nav_stack');localStorage.setItem('ai_influencer_selected_id:v1:ios-fixture','fixture-persona');")
   for tab in ['personas','agent','assistant','gallery','settings','create-persona']:
    start=time.monotonic()
    async with page.expect_response(lambda r:'/api/personas' in r.url) as loaded:
     await page.goto('http://127.0.0.1:5217/?fixtureTab='+tab,wait_until='domcontentloaded')
    await loaded.value
    try:
     await page.locator('#studio-content').wait_for(timeout=20000)
     await page.locator('[aria-label="Loading your studio"]').wait_for(state='hidden')
     await page.locator('#studio-content').wait_for()
     await page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')
     await page.wait_for_function("document.querySelector('#studio-content')?.innerText.length > 25 && !document.querySelector('#studio-content').innerText.includes('Loading view…')")
     await page.screenshot(path=str(OUT/f'{name}-{tab}.png'))
     metrics=await page.evaluate("""() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,mainWidth:document.querySelector('#studio-content').getBoundingClientRect().width,smallControls:[...document.querySelectorAll('button')].filter(b=>{let r=b.getBoundingClientRect();return r.width>0&&r.height>0&&(r.height<40||r.width<40)}).length,overflow:[...document.querySelectorAll('#studio-content *')].filter(e=>{let r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)}).slice(0,8).map(e=>({tag:e.tagName,text:e.textContent.slice(0,45),class:e.className})),text:document.querySelector('#studio-content').innerText.slice(0,180)})""")
     results.append({'viewport':name,'tab':tab,'elapsedMs':round((time.monotonic()-start)*1000),'metrics':metrics,'errors':errors[:]})
    except Exception as e:
     results.append({'viewport':name,'tab':tab,'failure':str(e),'errors':errors[:]})
     await page.screenshot(path=str(OUT/f'{name}-{tab}-failure.png'))
   await context.close()
  print(json.dumps({'engine':browser.version,'cases':len(results),'failures':sum('failure'in r for r in results)}))
  await browser.close()
 (OUT/'results.json').write_text(json.dumps(results,indent=2))
if __name__ == '__main__': asyncio.run(main())
