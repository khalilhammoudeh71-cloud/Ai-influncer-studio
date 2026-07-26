import 'dotenv/config';
import http from 'http';
import WebSocket from 'ws';
import { exec } from 'child_process';

function getChromePages(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/list', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function startDebug() {
  console.log('Starting headless Chrome with remote debugging on port 9222...');
  
  // Start headless chrome
  const chromeProcess = exec('"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222 --headless --disable-gpu http://localhost:5001');
  
  // Wait for Chrome to boot
  await new Promise(r => setTimeout(r, 4000));

  try {
    const pages = await getChromePages();
    const targetPage = pages.find((p: any) => p.url.includes('localhost:5001'));
    if (!targetPage) {
      console.error('Failed to find page for localhost:5001 in:', pages);
      chromeProcess.kill();
      return;
    }

    console.log('Connecting to WebSocket debugger:', targetPage.webSocketDebuggerUrl);
    const ws = new WebSocket(targetPage.webSocketDebuggerUrl);

    ws.on('open', () => {
      console.log('Connected! Enabling APIs...');
      ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
      ws.send(JSON.stringify({ id: 3, method: 'Log.enable' }));

      // Wait a moment for page rendering then query DOM
      setTimeout(() => {
        console.log('Evaluating DOM...');
        ws.send(JSON.stringify({
          id: 10,
          method: 'Runtime.evaluate',
          params: { expression: "document.getElementById('root')?.innerHTML || document.body.innerHTML" }
        }));
      }, 3000);
    });

    ws.on('message', (data: string) => {
      const msg = JSON.parse(data);
      
      if (msg.id === 10) {
        console.log('=== DOM CONTENT ===');
        console.log(msg.result?.result?.value);
        console.log('===================');
      }

      // Log Console messages
      if (msg.method === 'Console.messageAdded') {
        const text = msg.params.message.text;
        const level = msg.params.message.level;
        console.log(`[Console ${level}]:`, text);
      }
      
      // Log Runtime consoleAPICalled messages
      if (msg.method === 'Runtime.consoleAPICalled') {
        const type = msg.params.type;
        const args = msg.params.args.map((a: any) => a.value || a.description).join(' ');
        console.log(`[Console ${type}]:`, args);
      }

      // Log ExceptionThrown
      if (msg.method === 'Runtime.exceptionThrown') {
        const details = msg.params.exceptionDetails;
        console.error(`[Exception]:`, details.exception?.description || details.text, 'at', details.url, 'line', details.lineNumber);
      }
    });

    // Let it run for 10 seconds total
    await new Promise(r => setTimeout(r, 8000));
    
    console.log('Closing debug session...');
    ws.close();
    chromeProcess.kill();
  } catch (err: any) {
    console.error('Error during debugging:', err.message);
    chromeProcess.kill();
  }
}

startDebug();
