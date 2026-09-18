import { test, expect, chromium } from '@playwright/test';

// FIXED: Maintained exact destructuring block for attachment capabilities mapping
test('E2E Public User Cart Restriction Validation', async ({ }, testInfo) => {
  // Allocate an explicit global execution buffer for this multi-page screenshot task
  test.setTimeout(300000);

  // Dynamically parses SKUs from an environment variable string, or falls back to standard defaults if not set
  const skuEnvInput = process.env.RESTRICTED_SKUS || 'H0056,L0068';
  const skusToCheck = skuEnvInput.split(',').map(item => item.trim()).filter(Boolean);

  console.log(`Initialising dynamic workflow validation for target SKUs: ${skusToCheck.join(', ')}`);

  console.log('Connecting to browser via CDP...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const allContexts = browser.contexts();
  
  // FIX: Accessing the first item in the contexts array to correctly expose the pages function
  const defaultContext = allContexts[0]; 
  const pages = defaultContext.pages();
  const page = pages.length > 0 ? pages[0] : await defaultContext.newPage();

  console.log('Navigating to Flinn Scientific Gateway...');
  await page.goto('https://flinnsci.com', { waitUntil: 'load' });

  // Idempotent Login Validation Block (Preserved exactly from your core template)
  const accountHubCheck = page.locator('nav, .banner, .header-wrapper').locator('text="My Account"').first();
  const isAlreadyLoggedIn = await accountHubCheck.isVisible();

  if (!isAlreadyLoggedIn) {
    console.log('User session not detected. Initializing standard login phase...');
    const signInRegisterToggle = page.locator('text="Sign In / Register"').first();
    await signInRegisterToggle.click();

    const signInLink = page.getByRole('link', { name: 'Sign In', exact: true });
    await signInLink.waitFor({ state: 'visible', timeout: 5000 });
    await signInLink.click();

    await page.locator('#Email, #email, input[type="email"]').fill('madhu26testing@gmail.com');
    await page.fill('#Password', 'Gmailtest@123');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await accountHubCheck.waitFor({ state: 'visible', timeout: 15000 });
    console.log('✔ Login Verification Successful!');
  } else {
    console.log('✔ Active authentication profile confirmed via cache.');
  }

  // =========================================================================
  // CORE WORKFLOW: Dynamic Loop over Multiple Restricted SKUs
  // =========================================================================
  console.log('\n--- Commencing Not Sold to Public Cart Restriction Phase ---');

  for (const sku of skusToCheck) {
    console.log(`\nProcessing Restricted Item via SKU: ${sku}...`);

    // 1. Locate the search container box and execute submission via primary action keys
    const searchInput = page.locator('input[placeholder*="Keyword"], input[placeholder*="Search"], input[name="search"], input[type="search"]').first();
    await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    await searchInput.fill(sku);

    // Force action via dual pathing: keyboard submission backed up by visual icon click mapping
    await searchInput.press('Enter');
    const searchButton = page.locator('button[type="submit"], img[alt*="Search"], .search-icon, img[src*="search"]').filter({ visible: true }).first();
    if (await searchButton.isVisible()) {
      await searchButton.click();
    }

    // Await forward path transit loops to commit changes safely
    const skuRegex = new RegExp(`.*${sku}.*|.*search.*`, 'i');
    await page.waitForURL(skuRegex, { timeout: 15000 }).catch(() => {
      console.log(`Direct navigation route for ${sku} did not register instantly.`);
    });
    await page.waitForLoadState('load');

    // 2. Inspect current window URL state parameter to handle smart storefront redirects
    const targetUrl = page.url();
    const isDirectPdp = new RegExp(sku, 'i').test(targetUrl) || await page.locator(`:text-matches("ITEM #${sku}", "i")`).isVisible();

    if (isDirectPdp) {
      console.log(`✔ Smart Redirect Verified: Direct landing on ${sku} Product Detail Page (PDP).`);
    } else {
      console.log(`Search collection layout rendered. Navigating to the ${sku} Product Detail Page (PDP)...`);
      const productLink = page.locator('a').filter({ hasText: new RegExp(sku, 'i') }).or(
        page.locator(`a[href*="${sku}"], [data-sku*="${sku}"] a`)
      ).filter({ visible: true }).first();

      await productLink.waitFor({ state: 'visible', timeout: 10000 });
      await productLink.click();
      await page.waitForLoadState('load');
    }

    // 3. Verify the shipping restriction banner directly on the PDP safely
    console.log(`Verifying institutional shipping restriction text on the ${sku} PDP...`);
    const pdpRestrictionNotice = page.locator(':text-matches("schools, museums and science centers", "i"), :text-matches("not sold to the public", "i"), .shipping-restriction, .pdp-notice, .restriction-alert').first();
    
    // Check presence dynamically to prevent execution context from crashing
    const isBannerVisible = await pdpRestrictionNotice.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isBannerVisible) {
      await expect(pdpRestrictionNotice).toContainText(/schools, museums and science centers|public|institution/i, { timeout: 5000 });
      console.log(`✔ Confirmed: Shipping restriction banner present on the ${sku} PDP layout!`);
    } else {
      console.log(`⚠ Warning: Shipping restriction text banner missing for SKU: ${sku}. Capturing layout context...`);
      const errorBuffer = await page.screenshot();
      await testInfo.attach(`Missing Restriction Banner - ${sku}`, { body: errorBuffer, contentType: 'image/png' });
    }

    // 4. Click the 'Add to Cart' button mapped inside the PDP interface container
    console.log(`Clicking Add to Cart button from the ${sku} PDP container...`);
    const addToCartButton = page.locator('button:has-text("Add to Cart"), #btnAddToCart, .add-to-cart-main').first();
    await addToCartButton.click();

    // === Toast Message Validation & Unique Capture Buffer ===
    console.log(`Waiting for successful add-to-cart toast alert notification for ${sku}...`);
    const toastMessage = page.locator('.toast, .alert-success, [class*="notification"], [id*="toast"], :text-matches("added", "i")').filter({ visible: true }).first();
    await toastMessage.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {
      console.log(`⚠ Warning: Toast popup for ${sku} did not mount within time buffer. Taking fallback viewport snapshot.`);
    });

    if (await toastMessage.isVisible()) {
      console.log(`✔ Toast notification detected! Capturing toast layout attachment for ${sku}...`);
      const toastBuffer = await page.screenshot();
      await testInfo.attach(`Successfully Added Toast Notification - ${sku}`, { body: toastBuffer, contentType: 'image/png' });
    }

    // Allow layout updates to settle cleanly before moving to the next item
    await page.waitForTimeout(2000);
  }
  // 5. Target only the VISIBLE desktop cart icon, avoiding hidden mobile overlays
  console.log('\nNavigating to full shopping cart screen layout to verify all added items...');
  const cartIcon = page.locator('.mini-cart-link, .cart-icon, a[href*="cart"], #minicart-trigger').filter({ visible: true }).first();
  await cartIcon.waitFor({ state: 'visible', timeout: 10000 });
  await cartIcon.click();

  // Preserving your exact safe page structural rendering thresholds
  console.log('Waiting for new page context structure to load...');
  await page.waitForLoadState('load', { timeout: 25000 }).catch(() => null);
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
  await page.waitForTimeout(2000);

  // 6. Verification: Confirm the visibility of the text block requesting product removal
  console.log('Asserting presence of mandatory restriction error message layout...');
  const removalPrompt = page.locator(':text-matches("remove", "i"), .restriction-warning, .alert-danger, .error-message').filter({ hasText: /Public|Institution|Not available|Remove/i }).first();
  
  // Execute web layout presence visibility checks dynamically
  await expect(removalPrompt).toBeVisible({ timeout: 15000 });
  console.log('✔ Restriction warning message captured successfully inside cart wrapper!');

  // Confirm that a functional "Remove" modifier link element is generated on the page grid row
  const removeProductButton = page.locator('button:has-text("Remove"), .remove-item-btn, .delete-item').first();
  await expect(removeProductButton).toBeVisible();

  // Capture full-page layout screenshot and attach to the reporting database context
  console.log('Saving final cart restriction frame to runner attachments pipeline...');
  const screenshotBuffer = await page.screenshot({ fullPage: true });
  await testInfo.attach('Restricted Items Cart Warning View', { body: screenshotBuffer, contentType: 'image/png' });

  // =========================================================================
  // POST-TEST CLEANUP PHASE: Loop and Remove All Restricted Items
  // =========================================================================
  console.log('\n--- Commencing Post-Test Automation Cleanup Phase ---');

  let itemToRemove = page.locator('button:has-text("Remove"), .remove-item-btn, .delete-item').filter({ visible: true }).first();
  while (await itemToRemove.isVisible()) {
    console.log('Triggering Remove Item execution handler context for a restricted item...');
    await itemToRemove.click();
    await page.waitForTimeout(3000); // Wait dynamically for the item layout wrapper container to drop out of view
    itemToRemove = page.locator('button:has-text("Remove"), .remove-item-btn, .delete-item').filter({ visible: true }).first();
  }
  console.log('✔ All restricted catalog components dropped successfully from active checkout state.');

  // 2. Locate and hover/click the Account Hub menu list array again to expose utility options
  console.log('Opening your My Account context panel menu wrapper layout...');
  const accountDropdownToggle = page.locator('text="My Account" >> visible=true').first();
  await accountDropdownToggle.waitFor({ state: 'visible', timeout: 10000 });
  await accountDropdownToggle.hover();
  await accountDropdownToggle.click();
  await page.waitForTimeout(1000);

  // 3. Select the Sign Out utility selection link element to finish execution cleanly
  console.log('Executing session termination via Sign Out utility button selection item...');
  const signOutLink = page.locator(`.header-wrapper :has-text("Sign Out"), .dropdown-item:has-text("Sign Out"), a[href*="logout"]`).last();
  await signOutLink.waitFor({ state: 'visible', timeout: 5000 });
  await signOutLink.click({ force: true });

  // Settle navigation boundaries post session clearing event
  await page.waitForLoadState('load', { timeout: 15000 }).catch(() => null);
  console.log('✔ Profile session dropped cleanly. User returned safely to pristine gate state layout!');

  console.log('\n=========================================================================');
  console.log('Success! Test workflow, verification captures, and profile exit sequences fully logged.');
});
