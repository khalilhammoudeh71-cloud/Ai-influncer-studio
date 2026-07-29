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
      console.error('Failed to find page');
      chromeProcess.kill();
      return;
    }

    const ws = new WebSocket(targetPage.webSocketDebuggerUrl);

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));

      // Click "AI Toolbox" in the left sidebar
      setTimeout(() => {
        const clickToolboxScript = `(() => {
          const buttons = Array.from(document.querySelectorAll('button, div, span'));
          const btn = buttons.find(b => b.textContent.trim() === 'AI Toolbox');
          if (btn) {
            btn.click();
            return 'Clicked AI Toolbox';
          }
          return 'AI Toolbox button not found';
        })()`;
        ws.send(JSON.stringify({ id: 10, method: 'Runtime.evaluate', params: { expression: clickToolboxScript, returnByValue: true } }));
      }, 1500);

      // Click "AI Studios" tab
      setTimeout(() => {
        const clickStudiosScript = `(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent.includes('AI Studios'));
          if (btn) {
            btn.click();
            return 'Clicked AI Studios Tab';
          }
          return 'AI Studios Tab button not found';
        })()`;
        ws.send(JSON.stringify({ id: 11, method: 'Runtime.evaluate', params: { expression: clickStudiosScript, returnByValue: true } }));
      }, 3500);

      // Click "Motion Control" card
      setTimeout(() => {
        const clickMotionScript = `(() => {
          const headings = Array.from(document.querySelectorAll('h3'));
          const card = headings.find(h => h.textContent.includes('Motion Control'));
          if (card) {
            card.click();
            return 'Clicked Motion Control Card';
          }
          return 'Motion Control card not found';
        })()`;
        ws.send(JSON.stringify({ id: 12, method: 'Runtime.evaluate', params: { expression: clickMotionScript, returnByValue: true } }));
      }, 5500);

      // Verify Model selector options in Motion Control Studio modal
      setTimeout(() => {
        const verifyOptionsScript = `(() => {
          const select = document.querySelector('select');
          if (!select) return 'Select element not found';
          const options = Array.from(select.querySelectorAll('option')).map(o => o.textContent.trim());
          return options;
        })()`;
        ws.send(JSON.stringify({ id: 13, method: 'Runtime.evaluate', params: { expression: verifyOptionsScript, returnByValue: true } }));
      }, 7500);

      // Close debug session
      setTimeout(() => {
        ws.close();
        chromeProcess.kill();
      }, 9500);
    });

    ws.on('message', (data: string) => {
      const msg = JSON.parse(data);
      if (msg.id === 10) {
        console.log('Toolbox Click result:', msg.result?.result?.value);
      }
      if (msg.id === 11) {
        console.log('Studios Tab Click result:', msg.result?.result?.value);
      }
      if (msg.id === 12) {
        console.log('Motion Card Click result:', msg.result?.result?.value);
      }
      if (msg.id === 13) {
        console.log('Model dropdown options:', msg.result?.result?.value);
      }
    });

  } catch (err) {
    console.error('Debug error:', err);
    chromeProcess.kill();
  }
}

main();
