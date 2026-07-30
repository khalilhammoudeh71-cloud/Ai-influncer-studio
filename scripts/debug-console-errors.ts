import puppeteer from 'puppeteer';

async function checkConsoleErrors() {
  console.log('[Debug] Launching headless browser to check http://localhost:3000/ ...');
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[Browser Console ${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error('[Browser PageError Stack]', err.stack || err.message);
  });

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('[Debug] Page loaded. Title:', await page.title());
  } catch (err: any) {
    console.error('[Debug] Navigation error:', err.message);
  } finally {
    await browser.close();
  }
}

checkConsoleErrors();
