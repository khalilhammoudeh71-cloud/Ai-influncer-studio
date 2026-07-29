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

      // Inject fetch mock to bypass script generation network/API errors
      setTimeout(() => {
        const injectMockScript = `(() => {
          const originalFetch = window.fetch;
          window.fetch = async (url, options) => {
            const urlStr = typeof url === 'string' ? url : (url && url.url) || '';
            if (urlStr.includes('/generate-voice-script') || urlStr.includes('/generate-speech') || urlStr.includes('/text-to-speech')) {
              return {
                ok: true,
                headers: new Headers({ 'content-type': 'application/json' }),
                json: async () => ({ script: 'Mock script for voice cloning reference testing.', audioUrl: 'data:audio/mp3;base64,aaaa' })
              };
            }
            return originalFetch(url, options);
          };
          return 'Mocks injected successfully';
        })()`;
        ws.send(JSON.stringify({ id: 9, method: 'Runtime.evaluate', params: { expression: injectMockScript, returnByValue: true } }));
      }, 1000);

      // Click "Voice Clone" in left sidebar
      setTimeout(() => {
        const clickVoiceScript = `(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const btn = buttons.find(b => b.textContent.includes('Voice Clone'));
          if (btn) {
            btn.click();
            return 'Clicked Voice Clone';
          }
          return 'Voice Clone button not found';
        })()`;
        ws.send(JSON.stringify({ id: 10, method: 'Runtime.evaluate', params: { expression: clickVoiceScript, returnByValue: true } }));
      }, 2000);

      // Click "OmniVoice" tab
      setTimeout(() => {
        const clickOmniScript = `(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const omniBtn = buttons.find(b => b.textContent.includes('OmniVoice'));
          if (omniBtn) {
            omniBtn.click();
            return 'Clicked OmniVoice tab';
          }
          return 'OmniVoice tab not found';
        })()`;
        ws.send(JSON.stringify({ id: 11, method: 'Runtime.evaluate', params: { expression: clickOmniScript, returnByValue: true } }));
      }, 3500);

      // Click "Start Audio Studio" to trigger mocked script generation
      setTimeout(() => {
        const clickStartScript = `(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const startBtn = buttons.find(b => b.textContent.includes('Start Audio Studio'));
          if (startBtn) {
            startBtn.click();
            return 'Clicked Start Audio Studio';
          }
          return 'Start Audio Studio button not present';
        })()`;
        ws.send(JSON.stringify({ id: 12, method: 'Runtime.evaluate', params: { expression: clickStartScript, returnByValue: true } }));
      }, 5000);

      // Verify the presence of the OmniVoice upload reference button
      setTimeout(() => {
        const verifyUploadScript = `(() => {
          const labels = Array.from(document.querySelectorAll('label, span, p'));
          const hasUploadLabel = labels.some(l => l.textContent.includes('Upload Audio or Video'));
          const hasDesc = labels.some(l => l.textContent.includes('Upload any audio or video reference'));
          return { hasUploadLabel, hasDesc };
        })()`;
        ws.send(JSON.stringify({ id: 13, method: 'Runtime.evaluate', params: { expression: verifyUploadScript, returnByValue: true } }));
      }, 7000);

      // Close debug session
      setTimeout(() => {
        ws.close();
        chromeProcess.kill();
      }, 8500);
    });

    ws.on('message', (data: string) => {
      const msg = JSON.parse(data);
      if (msg.id === 9) console.log('Mock Inject result:', msg.result?.result?.value);
      if (msg.id === 10) console.log('Voice Clone Click:', msg.result?.result?.value);
      if (msg.id === 11) console.log('OmniVoice Click:', msg.result?.result?.value);
      if (msg.id === 12) console.log('Start Audio Studio Click:', msg.result?.result?.value);
      if (msg.id === 13) console.log('Upload controls check:', msg.result?.result?.value);
    });

  } catch (err) {
    console.error('Debug error:', err);
    chromeProcess.kill();
  }
}

main();
