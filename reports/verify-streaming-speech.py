from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,args=['--autoplay-policy=no-user-gesture-required'])
    page=browser.new_page()
    page.goto('http://127.0.0.1:5175/reports/voice-library-fixture.html')
    result=page.evaluate('''async()=>{
      const {createStreamingSpeech}=await import('/src/utils/streamingSpeech.ts');
      const bytes=new Uint8Array(await (await fetch('/reports/voice-stream-fixture.mp3')).arrayBuffer());
      const signal=new AbortController();let fullyReceived=false,cancelled=false;
      let timer;let position=0;
      const stream=new ReadableStream({start(controller){timer=setInterval(()=>{if(position>=bytes.length){clearInterval(timer);fullyReceived=true;controller.close();return;}controller.enqueue(bytes.slice(position,position+4096));position+=4096;},120);},cancel(){clearInterval(timer);cancelled=true;}});
      const response=new Response(stream,{headers:{'content-type':'audio/mpeg','x-voice-id':'fixture'}});
      const audio=await createStreamingSpeech(response,'fixture',signal.signal);audio.muted=true;
      await audio.play();await new Promise(r=>setTimeout(r,350));
      const early=audio.currentTime>0&&!fullyReceived;signal.abort();await new Promise(r=>setTimeout(r,100));
      return {mse:MediaSource.isTypeSupported('audio/mpeg'),earlyPlayback:early,paused:audio.paused,cancelled};
    }''')
    assert result['earlyPlayback'] and result['paused'] and result['cancelled'],result
    print('PASS: real MP3 starts before complete response; abort pauses playback and cancels stream.',result)
    browser.close()
