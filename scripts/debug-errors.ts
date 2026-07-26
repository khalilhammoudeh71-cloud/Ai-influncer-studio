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
  console.log('Starting headless Chrome...');
  const chromeProcess = exec('"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --headless --disable-gpu http://localhost:5001');
  
  await new Promise(r => setTimeout(r, 4000));

  try {
    const pages = await getChromePages();
    const targetPage = pages.find((p: any) => p.url.includes('localhost:5001'));
    if (!targetPage) {
      chromeProcess.kill();
      return;
    }

    const ws = new WebSocket(targetPage.webSocketDebuggerUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Log.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Console.enable' }));

      // Step 1: Skip landing and reload
      setTimeout(() => {
        const skipLandingScript = `(() => {
          localStorage.setItem('force_landing', 'false');
          localStorage.setItem('ai_influencer_selected_id', 'user-luna-mock-user-id');
          location.reload();
        })()`;
        ws.send(JSON.stringify({ id: 8, method: 'Runtime.evaluate', params: { expression: skipLandingScript, returnByValue: true } }));
      }, 500);

      // Step 2: Inject mock and click Voice Clone
      setTimeout(() => {
        const checkVoiceScript = `(() => {
          const voiceBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Voice Clone'));
          if (voiceBtn) voiceBtn.click();
          return 'Clicked Voice Clone';
        })()`;
        ws.send(JSON.stringify({ id: 10, method: 'Runtime.evaluate', params: { expression: checkVoiceScript, returnByValue: true } }));
      }, 4000);

      // Close debug session after 8 seconds
      setTimeout(() => {
        ws.close();
        chromeProcess.kill();
      }, 8000);
    });

    ws.on('message', (data: string) => {
      const msg = JSON.parse(data);
      if (msg.method === 'Console.messageAdded' || msg.method === 'Log.entryAdded' || msg.method === 'Runtime.exceptionThrown') {
        console.log('Browser Event:', JSON.stringify(msg, null, 2));
      }
      if (msg.id === 10) console.log('Step 2 result:', msg.result?.result?.value);
    });

  } catch (err) {
    chromeProcess.kill();
  }
}

main();
