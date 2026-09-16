import asyncio,json,io,wave
from baseline import fixture,ROOT
from playwright.async_api import async_playwright,expect
async def main():
 results=[]
 async with async_playwright() as p:
  browser=await p.webkit.launch();context=await browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce');await context.route('**/*',fixture)
  await context.add_init_script("localStorage.setItem('ai_influencer_active_tab','agent');localStorage.removeItem('ai_influencer_nav_stack');")
  page=await context.new_page();await page.goto('http://127.0.0.1:5217/',wait_until='domcontentloaded');editor=page.get_by_placeholder('Message Super Agent...');await expect(editor).to_be_visible(timeout=30000)
  await editor.fill('Keep this draft while the network changes.')
  await context.set_offline(True)
  await expect(page.get_by_role('status').filter(has_text='You appear to be offline')).to_be_visible()
  await context.set_offline(False);await expect(editor).to_have_value('Keep this draft while the network changes.')
  results.append('offline/reconnect retains unsent draft')
  await page.get_by_role('button',name='Add attachments and research tools').click()
  audio=io.BytesIO()
  with wave.open(audio,'wb') as wav:wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(16000);wav.writeframes(b'\0\0'*1600)
  await page.locator('#plus-menu-file-input').set_input_files({'name':'fixture-silence.wav','mimeType':'audio/wav','buffer':audio.getvalue()})
  await expect(page.get_by_text('fixture-silence.wav',exact=True)).to_be_visible();results.append('synthetic audio attachment selected locally')
  await page.set_viewport_size({'width':390,'height':450});await editor.scroll_into_view_if_needed()
  await page.screenshot(path=str(ROOT/'work/ios-web/short-viewport.png'))
  results.append({'shortViewportEditor':await editor.bounding_box()})
  await page.set_viewport_size({'width':390,'height':844});await page.add_style_tag(content='html {font-size: 24px !important;}')
  await page.screenshot(path=str(ROOT/'work/ios-web/enlarged-text.png'))
  results.append({'enlargedTextScrollWidth':await page.evaluate('document.documentElement.scrollWidth')})
  await browser.close()
 print(json.dumps(results))
asyncio.run(main())
