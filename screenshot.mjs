import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] || '';

const dir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const existing = fs.readdirSync(dir).filter(f => f.startsWith('screenshot-') && f.endsWith('.png'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || '0')).filter(n => !isNaN(n));
const next = nums.length ? Math.max(...nums) + 1 : 1;
const filename = label ? `screenshot-${next}-${label}.png` : `screenshot-${next}.png`;
const outPath = path.join(dir, filename);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/HP/.cache/puppeteer/chrome/win64-148.0.7778.167/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
await new Promise(r => setTimeout(r, 1500));
// Scroll the content area to bottom to see full calendar
await page.evaluate(() => {
  const scrollEl = document.querySelector('.content-scroll');
  if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
});
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: outPath, fullPage: false });
await browser.close();
console.log('Saved:', outPath);
