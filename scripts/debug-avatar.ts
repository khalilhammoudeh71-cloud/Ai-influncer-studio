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
      ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));

      // Click "Avatar Studio" in the left sidebar
      setTimeout(() => {
        const clickAvatarScript = `(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const avatarBtn = buttons.find(b => b.textContent.includes('Avatar Studio'));
          if (avatarBtn) {
            avatarBtn.click();
            return 'Clicked Avatar Studio';
          }
          return 'Avatar Studio button not found';
        })()`;
        ws.send(JSON.stringify({ id: 10, method: 'Runtime.evaluate', params: { expression: clickAvatarScript, returnByValue: true } }));
      }, 1500);

      // Verify the presence of the InfiniteTalk and LongCat 1.5 buttons under Avatar Engine
      setTimeout(() => {
        const verifyEnginesScript = `(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const hasInfiniteTalk = buttons.some(b => b.textContent.includes('InfiniteTalk'));
          const hasLongCat = buttons.some(b => b.textContent.includes('LongCat 1.5'));
          const hasWavespeed = buttons.some(b => b.textContent.includes('Wavespeed LTX'));
          const hasHeyGen = buttons.some(b => b.textContent.includes('HeyGen AI'));
          return { hasInfiniteTalk, hasLongCat, hasWavespeed, hasHeyGen };
        })()`;
        ws.send(JSON.stringify({ id: 11, method: 'Runtime.evaluate', params: { expression: verifyEnginesScript, returnByValue: true } }));
      }, 3500);

      // Close debug session
      setTimeout(() => {
        ws.close();
        chromeProcess.kill();
      }, 5000);
    });

    ws.on('message', (data: string) => {
      const msg = JSON.parse(data);
      if (msg.id === 10) {
        console.log('Click result:', msg.result?.result?.value);
      }
      if (msg.id === 11) {
        console.log('Engine buttons check result:', msg.result?.result?.value);
      }
    });

  } catch (err) {
    console.error('Debug error:', err);
    chromeProcess.kill();
  }
}

main();
