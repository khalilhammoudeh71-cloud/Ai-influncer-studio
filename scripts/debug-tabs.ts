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
  console.log('Starting headless Chrome on port 9222...');
  const chromeProcess = exec('"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --headless --disable-gpu http://localhost:5001');
  
  await new Promise(r => setTimeout(r, 4000));

  try {
    const pages = await getChromePages();
    const targetPage = pages.find((p: any) => p.url.includes('localhost:5001'));
    if (!targetPage) {
      console.error('Failed to find page');
      chromeProcess.kill();
      return;
    }

    console.log('Connecting to WebSocket...');
    const ws = new WebSocket(targetPage.webSocketDebuggerUrl);

    ws.on('open', () => {
      console.log('Connected! Click sub-tab test...');
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));

      // Clicks "Video Generator" sub-tab and evaluates DOM state
      setTimeout(() => {
        const script = `(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const videoBtn = buttons.find(b => b.textContent.includes('Video Generator'));
          if (videoBtn) {
            videoBtn.click();
            return 'Clicked Video Generator';
          }
          return 'Video Generator button not found';
        })()`;
        ws.send(JSON.stringify({ id: 10, method: 'Runtime.evaluate', params: { expression: script, returnByValue: true } }));
      }, 1500);

      // Verify DOM content of the CreateView layout mode
      setTimeout(() => {
        const checkModeScript = `(() => {
          const activeCard = document.querySelector('.grid button.border-cyan-500, .grid div.border-cyan-500, [class*="border-cyan"]');
          return activeCard ? activeCard.textContent : 'No active card found';
        })()`;
        ws.send(JSON.stringify({ id: 11, method: 'Runtime.evaluate', params: { expression: checkModeScript, returnByValue: true } }));
      }, 3000);

      // Close
      setTimeout(() => {
        console.log('Closing debug session...');
        ws.close();
        chromeProcess.kill();
      }, 4500);
    });

    ws.on('message', (data: string) => {
      const msg = JSON.parse(data);
      if (msg.id === 10) {
        console.log('Click result:', msg.result?.result?.value);
      }
      if (msg.id === 11) {
        console.log('Active view card in Create Studio:', msg.result?.result?.value);
      }
    });

  } catch (err) {
    console.error('Debug error:', err);
    chromeProcess.kill();
  }
}

main();
