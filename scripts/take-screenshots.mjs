#!/usr/bin/env node
import { chromium, devices } from 'playwright';
import path from 'path';
import fs from 'fs';

const baseURL = 'http://localhost:3000/ChordRain/';
const screenshotDir = path.join('.github', 'screenshots');

const THEMES = ['8bit', '16bit', 'hibit', 'cool', 'warm', 'mono'];

const SCREENSHOT_DEVICES = [
  { name: 'Desktop', device: { viewport: { width: 1280, height: 800 } }, suffix: '' },
  { name: 'iPhone 13', device: devices['iPhone 13 landscape'], suffix: '-iphone' },
  { name: 'iPad Pro 11', device: devices['iPad Pro 11 landscape'], suffix: '-ipad' }
];

// Ensure screenshot directory exists
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function hideDevTools(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal, #next-dev-toolbar, #__next-build-watcher { display: none !important; visibility: hidden !important; }
      div[data-nextjs-toast="true"] { display: none !important; }
      div[class*="Toast_toast"] { display: none !important; }
      /* Hide scrollbars for cleaner screenshots */
      ::-webkit-scrollbar { display: none !important; }
      body { scrollbar-width: none !important; }
    `
  });
}

async function setThemeAndReload(page, theme) {
  console.log(`  - Applying ${theme} theme...`);
  // Ensure we are on the page origin first
  if (page.url() === 'about:blank') {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
  }
  await page.evaluate((t) => {
    localStorage.setItem('chord_rain_theme', t);
    // Pre-dismiss iOS hint overlays so they don't appear on screenshots
    localStorage.setItem('silent_mode_hint_dismissed', 'true');
    localStorage.setItem('pwa_hint_dismissed', 'true');
  }, theme);
  await page.goto(baseURL);
  await page.waitForLoadState('networkidle');
  await hideDevTools(page);
}

async function takeScreenshots() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({
    executablePath,
    args: ['--disable-gpu', '--disable-software-rasterizer', '--disable-dev-shm-usage'],
  });

  try {
    console.log('Taking screenshots for ChordRain...\n');

    for (const config of SCREENSHOT_DEVICES) {
      console.log(`Testing ${config.name}...`);
      const context = await browser.newContext({
        ...config.device,
        hasTouch: config.name !== 'Desktop',
      });
      const page = await context.newPage();

      // Establish origin
      await page.goto(baseURL);
      await page.waitForLoadState('networkidle');

      // 1. Landing Page & Themes (Desktop only for themes)
      if (config.name === 'Desktop') {
        for (const theme of THEMES) {
          await page.evaluate(() => localStorage.clear());
          await setThemeAndReload(page, theme);

          // Landing page for theme
          const screenshotPath = path.join(screenshotDir, `theme-${theme}.png`);
          await page.screenshot({ path: screenshotPath });

          // Also save 'cool' theme as landing.png for README
          if (theme === 'cool') {
            await page.screenshot({ path: path.join(screenshotDir, 'landing.png') });
          }

          // Active player screenshot for theme
          console.log(`  - Active player for ${theme}...`);
          const songCard = page.getByTestId('song-twinkle');
          await songCard.scrollIntoViewIfNeeded();
          await songCard.click();
          await page.waitForSelector('footer');
          await page.waitForTimeout(1000); // Wait for load

          // Play
          const playButton = page.getByTestId('play-button');
          await playButton.click();
          await page.waitForTimeout(4000); // Wait for notes
          await hideDevTools(page);

          await page.screenshot({ path: path.join(screenshotDir, `theme-${theme}-active.png`) });

          // Return to home for next loop
          await page.goto(baseURL);
          await page.waitForLoadState('networkidle');
        }
        // Reset to cool for main player screenshots
        await page.evaluate(() => localStorage.clear());
        await setThemeAndReload(page, 'cool');
      } else {
        // Just one landing screenshot for mobile (using default cool)
        await page.evaluate(() => localStorage.clear());
        await setThemeAndReload(page, 'cool');
        await page.screenshot({ path: path.join(screenshotDir, `landing${config.suffix}.png`) });
      }

      // 2. Player View
      console.log(`  - Player view (${config.name})...`);
      const songCard = page.getByTestId('song-twinkle');
      await songCard.scrollIntoViewIfNeeded();
      await songCard.click();

      await page.waitForSelector('footer');
      // Wait for everything to settle
      await page.waitForTimeout(3000);
      await hideDevTools(page);

      await page.screenshot({
        path: path.join(screenshotDir, `player-idle${config.suffix}.png`)
      });

      // 3. Active Playback
      console.log(`  - Active lesson (${config.name})...`);
      const playButton = page.getByTestId('play-button');
      await playButton.click();

      // Wait for some notes to fall
      await page.waitForTimeout(4000);
      await hideDevTools(page);

      await page.screenshot({
        path: path.join(screenshotDir, `player-active${config.suffix}.png`)
      });

      await context.close();
    }

    console.log(`\nScreenshots saved to ${screenshotDir}`);

  } catch (error) {
    console.error('Error taking screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);
