import puppeteer from 'puppeteer';

async function main() {
  console.log('Launching browser to reproduce stuck page...');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error('[BROWSER EXCEPTION]', err.message);
  });

  await page.goto('http://localhost:5001', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Clear local storage and reload to ensure clean zero-persona state
  console.log('Clearing localStorage to force zero-persona state...');
  await page.evaluate(() => {
    localStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  // Click on "Photo Generation" card
  console.log('Clicking "Photo Generation" card...');
  const cards = await page.$$('.premium-card, .border-white\\/5');
  let photoGenCard = null;
  for (const card of cards) {
    const text = await page.evaluate(el => el.textContent, card);
    if (text && text.includes('Photo Generation')) {
      photoGenCard = card;
      break;
    }
  }

  if (!photoGenCard) {
    console.error('Could not find Photo Generation card');
    await browser.close();
    return;
  }

  await photoGenCard.click();
  await new Promise(r => setTimeout(r, 2000));

  console.log('Current URL/Breadcrumb state after click:', await page.evaluate(() => document.body.innerHTML.includes('Initializing Studio') ? 'Shows Loading Spinner' : 'Does not show spinner'));

  // Click the back button
  console.log('Clicking Back button...');
  const backButtons = await page.$$('button');
  let backBtn = null;
  for (const btn of backButtons) {
    const text = await page.evaluate(el => el.textContent, btn);
    if (text && text.toUpperCase().includes('BACK')) {
      backBtn = btn;
      break;
    }
  }

  if (!backBtn) {
    console.error('Could not find Back button');
  } else {
    await backBtn.click();
    await new Promise(r => setTimeout(r, 2000));
    console.log('Current URL/Breadcrumb state after Back click:', await page.evaluate(() => document.body.innerHTML.includes('Initializing Studio') ? 'STILL Shows Loading Spinner' : 'Successfully navigated back!'));
  }

  await browser.close();
}

main().catch(console.error);
