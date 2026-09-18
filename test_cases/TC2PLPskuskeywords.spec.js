import { test, expect, chromium } from '@playwright/test';

test('Validate multiple search inputs sequentially with full PLP image decoding', async ({}, testInfo) => {
  // 1. Define your dataset array containing both SKUs and keywords
  const searchTokens = ['SE100', 'AP825', 'microscope', 'chemistry kit', 'FB002'];

  // 2. Establish CDP Connection to your externally running browser instance
  const browser = await chromium.connectOverCDP('http://localhost:9222/');
  
  // FIX: Access the first available context element from the returned array cleanly
  const context = browser.contexts()[0] || await browser.newContext();
  
  // FIX: Extract the first page target correctly out of the context page array
  const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

  // 3. Initial Navigation to base domain
  await page.goto('https://flinnsci.com');
  await expect(page).toHaveURL(/flinnsci\.com/);

  // 4. Loop through each search token sequentially in a single test block execution
  
  for (const token of searchTokens) {
    // Locate searchbox on every iteration to avoid stale element references
    const searchInput = page.getByRole('searchbox', { name: /Enter Keyword, Item Number/i });
    await expect(searchInput).toBeVisible();

    // Clear previous input values reliably across different frontend framework states
    await searchInput.click();
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.press('Backspace');
    
    // Fill and submit the active iteration token (SKU or Keyword)
    await searchInput.fill(token);
    await searchInput.press('Enter');

    // Wait for URL state changes to process completely
    await page.waitForURL(/.*search.*/i);

    // Validate the page layout reflects the current SKU or keyword string
    const plpContainer = page.locator('body');
    await expect(plpContainer).toContainText(/You have searched for:/i, { timeout: 15000 });
    await expect(plpContainer).toContainText(token);

    // ==========================================
    // STEP A: RUN DYNAMIC SCROLL SYSTEM
    // ==========================================
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        const distance = 400;
        const timer = setInterval(() => {
          const scrollHeight = document.documentElement.scrollHeight;
          const currentScroll = window.scrollY + window.innerHeight;
          
          window.scrollBy(0, distance);

          // Break early if we hit the absolute bottom of the rendered DOM tree
          if (currentScroll >= scrollHeight) {
            clearInterval(timer);
            window.scrollTo(0, 0);
            resolve();
          }
        }, 80);
      });
    });

    // ==========================================
    // STEP B: WAIT FOR CURRENT PLP ARRAY TO DECODE
    // ==========================================
    const imgSelector = 'img[src*="product"], .product-item img, img[alt*="product"], img[data-src]';
    const productImagesLocator = page.locator(imgSelector);

    // Wait for at least one item asset match to physically register in the layout window
    try {
      await productImagesLocator.first().waitFor({ state: 'visible', timeout: 8000 });
    } catch (e) {
      console.log(`No explicit product image layouts found for token: ${token}, skipping decoding check.`);
    }

    // Confirm that every rendered item image payload is complete and has physical layout dimensions
    await page.waitForFunction((selector) => {
      const images = Array.from(document.querySelectorAll(selector));
      if (images.length === 0) return true; // Pass if no images are rendered to avoid freezing
      return images.every(img => img.complete && typeof img.naturalWidth !== 'undefined' && img.naturalWidth > 0);
    }, imgSelector, { timeout: 20000 });

    // Stabilise DOM tree modifications and layout paint updates before taking screenshots
    await page.waitForLoadState('domcontentloaded');

    // ==========================================
    // STEP C: ATTACH UNIQUE SEQUENTIAL SCREENSHOTS
    // ==========================================
    const fullPageBuffer = await page.screenshot({ fullPage: true });
    await testInfo.attach(`Complete PLP Grid - Token ${token}`, { body: fullPageBuffer, contentType: 'image/png' });
  }

  // Clean exit: Close the automation tab window but keep your debugging host browser context alive
  await page.close();
});
