import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
  
  const gs = await page.evaluate(() => {
    return window.game.script[0];
  });
  
  console.log('gameScript[0]:', gs);
  
  await browser.close();
})();
