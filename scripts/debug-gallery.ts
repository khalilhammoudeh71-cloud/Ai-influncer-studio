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
  console.log('Starting headless Chrome with remote debugging on port 9222...');
  const chromeProcess = exec('"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --headless --disable-gpu http://localhost:5001');
  
  await new Promise(r => setTimeout(r, 4000));

  try {
    const pages = await getChromePages();
    const targetPage = pages.find((p: any) => p.url.includes('localhost:5001'));
    if (!targetPage) {
      console.error('Failed to find page for localhost:5001');
      chromeProcess.kill();
      return;
    }

    console.log('Connecting to WebSocket debugger:', targetPage.webSocketDebuggerUrl);
    const ws = new WebSocket(targetPage.webSocketDebuggerUrl);

    ws.on('open', () => {
      console.log('Connected! Enabling Console and Runtime APIs...');
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      
      // Listen to console messages
      ws.on('message', (data: string) => {
        const msg = JSON.parse(data);
        if (msg.method === 'Console.messageAdded') {
          console.log('[Console]', msg.params.message.level, msg.params.message.text);
        }
        if (msg.method === 'Runtime.exceptionThrown') {
          console.error('[Runtime Exception]', msg.params.exceptionDetails.exception.description);
        }
      });

      // Click the Gallery Vault button after 2 seconds
      setTimeout(() => {
        console.log('Attempting to click Gallery Vault button...');
        const clickExpr = `(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const galleryBtn = buttons.find(b => b.textContent.includes('Gallery Vault'));
          if (galleryBtn) {
            galleryBtn.click();
            return 'Clicked Gallery Vault';
          }
          return 'Gallery Vault button not found';
        })()`;
        
        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: { expression: clickExpr, returnByValue: true }
        }));
      }, 2000);

      // Check DOM and print outerHTML after 4 seconds
      setTimeout(() => {
        console.log('Checking DOM content...');
        const getDomExpr = `document.body.innerHTML`;
        ws.send(JSON.stringify({
          id: 11,
          method: 'Runtime.evaluate',
          params: { expression: getDomExpr, returnByValue: true }
        }));
      }, 4000);

      // Close after 6 seconds
      setTimeout(() => {
        console.log('Closing debug session...');
        ws.close();
        chromeProcess.kill();
      }, 6000);
    });

    ws.on('message', (data: string) => {
      const msg = JSON.parse(data);
      if (msg.id === 10) {
        console.log('Click result:', msg.result?.result?.value);
      }
      if (msg.id === 11) {
        const val = msg.result?.result?.value;
        console.log('=== DOM CONTENT ===');
        console.log(val ? val.substring(0, 1000) : 'Empty');
      }
    });

  } catch (err) {
    console.error('Debug error:', err);
    chromeProcess.kill();
  }
}

main();
