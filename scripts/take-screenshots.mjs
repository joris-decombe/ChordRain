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

// Timeout for waiting for audio to load (samples must be present in public/)
const AUDIO_LOAD_TIMEOUT = 15000;

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
  if (page.url() === 'about:blank') {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
  }
  await page.evaluate((t) => {
    localStorage.setItem('chord_rain_theme', t);
    localStorage.setItem('silent_mode_hint_dismissed', 'true');
    localStorage.setItem('pwa_hint_dismissed', 'true');
  }, theme);
  await page.goto(baseURL);
  await page.waitForLoadState('networkidle');
  await hideDevTools(page);
}

/**
 * After clicking a song card, wait for the loading overlay to disappear.
 * Returns true if the player is ready, false if loading timed out.
 */
async function waitForPlayerReady(page) {
  try {
    // The loading overlay has z-[80] and contains "Now Loading"
    // Wait for it to disappear (audio samples loaded)
    await page.waitForFunction(() => {
      const overlay = document.querySelector('[class*="z-[80]"]');
      return !overlay || overlay.closest('[style*="display: none"]') !== null ||
             getComputedStyle(overlay).opacity === '0';
    }, { timeout: AUDIO_LOAD_TIMEOUT });
    // Extra settle time after overlay fade
    await page.waitForTimeout(500);
    return true;
  } catch {
    console.log('    (audio loading timed out — samples may be missing from public/)');
    return false;
  }
}

async function takeScreenshots() {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined;
  const browser = await chromium.launch({
    executablePath,
    args: [
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-dev-shm-usage',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  let playerScreenshotsTaken = 0;

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

      // 1. Landing Page & Themes (Desktop only for all themes)
      if (config.name === 'Desktop') {
        for (const theme of THEMES) {
          await page.evaluate(() => localStorage.clear());
          await setThemeAndReload(page, theme);

          const screenshotPath = path.join(screenshotDir, `theme-${theme}.png`);
          await page.screenshot({ path: screenshotPath });

          // Save 'cool' theme as the main landing.png for README
          if (theme === 'cool') {
            await page.screenshot({ path: path.join(screenshotDir, 'landing.png') });
          }

          // Try active player screenshot for each theme
          console.log(`  - Active player for ${theme}...`);
          const songCard = page.getByTestId('song-amazing-grace');
          await songCard.scrollIntoViewIfNeeded();
          await songCard.click();
          await page.waitForSelector('footer');

          const ready = await waitForPlayerReady(page);
          if (ready) {
            await hideDevTools(page);
            const playButton = page.getByTestId('play-button');
            await playButton.click();
            await page.waitForTimeout(4000);
            await hideDevTools(page);
            await page.screenshot({ path: path.join(screenshotDir, `theme-${theme}-active.png`) });
            playerScreenshotsTaken++;
          } else {
            // Take screenshot of loading state as fallback
            await hideDevTools(page);
            await page.screenshot({ path: path.join(screenshotDir, `theme-${theme}-loading.png`) });
          }

          // Return to home for next loop
          await page.goto(baseURL);
          await page.waitForLoadState('networkidle');
        }
        // Reset to cool for main player screenshots
        await page.evaluate(() => localStorage.clear());
        await setThemeAndReload(page, 'cool');
      } else {
        // Mobile: one landing screenshot
        await page.evaluate(() => localStorage.clear());
        await setThemeAndReload(page, 'cool');
        await page.screenshot({ path: path.join(screenshotDir, `landing${config.suffix}.png`) });
      }

      // 2. Player View (idle / loading)
      console.log(`  - Player view (${config.name})...`);
      const songCard = page.getByTestId('song-amazing-grace');
      await songCard.scrollIntoViewIfNeeded();
      await songCard.click();
      await page.waitForSelector('footer');

      const ready = await waitForPlayerReady(page);
      await hideDevTools(page);

      await page.screenshot({
        path: path.join(screenshotDir, `player-idle${config.suffix}.png`)
      });

      // 3. Active Playback (only if audio loaded)
      if (ready) {
        console.log(`  - Active lesson (${config.name})...`);
        const playButton = page.getByTestId('play-button');
        await playButton.click();
        await page.waitForTimeout(4000);
        await hideDevTools(page);
        await page.screenshot({
          path: path.join(screenshotDir, `player-active${config.suffix}.png`)
        });
        playerScreenshotsTaken++;
      } else {
        console.log(`  - Skipping active lesson (${config.name}) — audio not loaded`);
      }

      await context.close();
    }

    const files = fs.readdirSync(screenshotDir).filter(f => f.endsWith('.png'));
    console.log(`\nScreenshots saved to ${screenshotDir} (${files.length} files)`);
    if (playerScreenshotsTaken === 0) {
      console.log('\nNote: No active-player screenshots were taken.');
      console.log('Ensure guitar samples exist in public/guitar-acoustic/ for full screenshots.');
    }

  } catch (error) {
    console.error('Error taking screenshots:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

takeScreenshots().catch(console.error);
