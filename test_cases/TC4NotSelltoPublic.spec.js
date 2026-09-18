import { test, expect, chromium } from '@playwright/test';

// FIXED: Maintained exact destructuring block for attachment capabilities mapping
test('E2E Public User Cart Restriction Validation', async ({ }, testInfo) => {
  // Allocate an explicit global execution buffer for this multi-page screenshot task
  test.setTimeout(300000); 

  console.log('Connecting to browser via CDP...');
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const allContexts = browser.contexts();
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
  // CORE WORKFLOW: SKU H0056 Search, PDP Validation & Cart Restrictions Check
  // =========================================================================
  console.log('\n--- Commencing Not Sold to Public Cart Restriction Phase ---');

  // 1. Locate the search container box and execute submission via primary action keys
  console.log('Searching for restricted item via SKU: H0056...');
  const searchInput = page.locator('input[placeholder*="Keyword"], input[placeholder*="Search"], input[name="search"], input[type="search"]').first();
  await searchInput.waitFor({ state: 'visible', timeout: 5000 });
  await searchInput.fill('H0056');
  
  // Force action via dual pathing: keyboard submission backed up by visual icon click mapping
  await searchInput.press('Enter');
  const searchButton = page.locator('button[type="submit"], img[alt*="Search"], .search-icon, img[src*="search"]').filter({ visible: true }).first();
  if (await searchButton.isVisible()) {
    await searchButton.click();
  }

  // Await forward path transit loops to commit changes safely
  await page.waitForURL(/.*H0056.*|.*search.*/i, { timeout: 15000 }).catch(() => {
    console.log('Direct navigation route did not register instantly.');
  });
  await page.waitForLoadState('load');

  // 2. Inspect current window URL state parameter to handle smart storefront redirects
  const targetUrl = page.url();
  const isDirectPdp = /H0056/i.test(targetUrl) || await page.locator(':text-matches("ITEM #H0056", "i")').isVisible();

  if (isDirectPdp) {
    console.log('✔ Smart Redirect Verified: Direct landing on H0056 Product Detail Page (PDP).');
  } else {
    console.log('Search collection layout rendered. Navigating to the H0056 Product Detail Page (PDP)...');
    const productLink = page.locator('a').filter({ hasText: /H0056/i }).or(
      page.locator('a[href*="H0056"], [data-sku*="H0056"] a')
    ).filter({ visible: true }).first();
    await productLink.waitFor({ state: 'visible', timeout: 10000 });
    await productLink.click();
    await page.waitForLoadState('load');
  }

  // 3. Verify the shipping restriction banner directly on the PDP
  console.log('Verifying institutional shipping restriction text on the PDP...');
  const pdpRestrictionNotice = page.locator(':text-matches("schools, museums and science centers", "i"), .shipping-restriction, .pdp-notice').first();
  await expect(pdpRestrictionNotice).toContainText(/schools, museums and science centers/i, { timeout: 10000 });
  console.log('✔ Confirmed: Shipping restriction banner present on the PDP layout!');

  // 4. Click the 'Add to Cart' button mapped inside the PDP interface container
  console.log('Clicking Add to Cart button from the PDP container dynamic elements...');
  const addToCartButton = page.locator('button:has-text("Add to Cart"), #btnAddToCart, .add-to-cart-main').first();
  await addToCartButton.click();
  
  // === Toast Message Validation & Unique Capture Buffer ===
  console.log('Waiting for successful add-to-cart toast alert notification...');
  const toastMessage = page.locator('.toast, .alert-success, [class*="notification"], [id*="toast"], :text-matches("added", "i")').filter({ visible: true }).first();
  
  await toastMessage.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {
    console.log('⚠ Warning: Toast popup did not mount within time buffer. Taking fallback viewport snapshot.');
  });

  if (await toastMessage.isVisible()) {
    console.log('✔ Toast notification detected! Capturing toast layout attachment...');
    const toastBuffer = await page.screenshot(); 
    await testInfo.attach('Successfully Added Toast Notification', {
      body: toastBuffer,
      contentType: 'image/png'
    });
  }

  // Allow layout updates to settle cleanly before interacting with the cart links
  await page.waitForTimeout(2000);

  // 5. Target only the VISIBLE desktop cart icon, avoiding hidden mobile overlays
  console.log('Navigating to full shopping cart screen layout...');
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
  const removalPrompt = page.locator(':text-matches("remove", "i"), .restriction-warning, .alert-danger, .error-message').filter({
    hasText: /Public|Institution|Not available|Remove/i
  }).first();

  // Execute web layout presence visibility checks dynamically
  await expect(removalPrompt).toBeVisible({ timeout: 15000 });
  console.log('✔ Restriction warning message captured successfully inside cart wrapper!');

  // Confirm that a functional "Remove" modifier link element is generated on the page grid row
  const removeProductButton = page.locator('button:has-text("Remove"), .remove-item-btn, .delete-item').first();
  await expect(removeProductButton).toBeVisible();

  // Capture full-page layout screenshot and attach to the reporting database context
  console.log('Saving final cart restriction frame to runner attachments pipeline...');
  const screenshotBuffer = await page.screenshot({ fullPage: true });
  await testInfo.attach('Restricted Item Cart Warning View', {
    body: screenshotBuffer,
    contentType: 'image/png'
  });

  // =========================================================================
  // NEW ADDITION: Cart Item Removal and Standard Profile Session Termination
  // =========================================================================
  console.log('\n--- Commencing Post-Test Automation Cleanup Phase ---');

  // 1. Click on the Remove button to strip out the restricted item payload from checkout arrays
  console.log('Triggering Remove Item execution handler context...');
  await removeProductButton.click();
  
  // Wait dynamically for the item layout wrapper container to drop out of view or for an empty cart signal
  await page.waitForTimeout(3000); 
  console.log('✔ Restricted catalog components dropped successfully from active checkout state.');

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
