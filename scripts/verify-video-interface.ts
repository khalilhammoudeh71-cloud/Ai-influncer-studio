import { exec } from 'child_process';
import WebSocket from 'ws';
import http from 'http';

function getChromePages(): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json', (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Starting video interface verification test...');
  const chromeProcess = exec('"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --headless --disable-gpu http://localhost:5001');
  
  await new Promise(r => setTimeout(r, 4000));

  try {
    const pages = await getChromePages();
    const targetPage = pages.find((p: any) => p.url.includes('localhost:5001'));
    if (!targetPage) {
      console.error('Failed to find target page');
      chromeProcess.kill();
      return;
    }

    const ws = new WebSocket(targetPage.webSocketDebuggerUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));

      // Prepare state
      setTimeout(() => {
        const prepareScript = `(() => {
          localStorage.setItem('force_landing', 'false');
          localStorage.setItem('ai_influencer_selected_id', 'empty');
          location.reload();
        })()`;
        ws.send(JSON.stringify({ id: 8, method: 'Runtime.evaluate', params: { expression: prepareScript, returnByValue: true } }));
      }, 500);

      // Verify layout
      setTimeout(() => {
        const verifyScript = `(() => {
          const videoBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Video Generator'));
          if (videoBtn) videoBtn.click();
          
          return new Promise(r => {
            setTimeout(() => {
              const bodyHTML = document.body.innerHTML;
              
              // Verify video slideshow contains Runway Gen-3 Alpha
              const hasVideoSlideshow = bodyHTML.includes('Runway Gen-3 Alpha');
              
              // Verify prompt box is curved and dark indigo
              const hasIndigoPrompt = bodyHTML.includes('rounded-[24px]') && bodyHTML.includes('bg-[#131b2e]/80');
              
              // Verify upload options
              const hasAudioToggle = bodyHTML.includes('Audio OFF') || bodyHTML.includes('Audio ON');
              
              r({
                hasVideoSlideshow,
                hasIndigoPrompt,
                hasAudioToggle
              });
            }, 2500);
          });
        })()`;
        ws.send(JSON.stringify({ id: 10, method: 'Runtime.evaluate', params: { expression: verifyScript, awaitPromise: true, returnByValue: true } }));
      }, 3500);

      // Close debug session
      setTimeout(() => {
        ws.close();
        chromeProcess.kill();
      }, 7000);
    });

    ws.on('message', (data: string) => {
      const msg = JSON.parse(data);
      if (msg.id === 10) console.log('Video interface results:', msg.result?.result?.value);
    });

  } catch (err) {
    console.error('Verify error:', err);
    chromeProcess.kill();
  }
}

main();
