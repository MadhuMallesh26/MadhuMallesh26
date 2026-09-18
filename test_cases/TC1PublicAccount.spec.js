  import { test, expect, chromium } from '@playwright/test';

// FIXED: Added 'testInfo' as the second destructuring parameter to access attachment APIs
test('E2E Login and Dropdown Items Complete Page Screenshot Loop', async ({ }, testInfo) => {
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

  // Idempotent Login Validation Block
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

  const menuItemsToTest = [
    'My Dashboard',
    'My Account',
    'My Orders',
    'My Lists',
    'My Library',
    'My Credit Cards',
    'My Invoices',
    'Sign Out'
  ];

  console.log('\n--- Commencing Safe Sequential Page Load & Screenshot Loop ---');

  for (const itemName of menuItemsToTest) {
    console.log(`\n----------------------------------------`);
    console.log(`Processing Item: "${itemName}"`);

    // Reset back to the homepage first to ensure a pristine dropdown state context
    await page.goto('https://flinnsci.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000); 

    // Open the dropdown menu reliably
    const accountHub = page.locator('text="My Account" >> visible=true').first();
    await accountHub.waitFor({ state: 'visible', timeout: 10000 });
    await accountHub.hover();
    await accountHub.click();
    await page.waitForTimeout(800); 

    // Locate the dropdown item inside the container
    const menuItem = page.locator(`.header-wrapper :has-text("${itemName}"), .dropdown-item:has-text("${itemName}")`).last();
    await menuItem.waitFor({ state: 'visible', timeout: 5000 });

    console.log(`Triggering navigation for "${itemName}"...`);
    await menuItem.click({ force: true });
    
    console.log('Waiting for new page context structure to load...');
    await page.waitForLoadState('load', { timeout: 25000 }).catch(() => null);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => null);
    await page.waitForTimeout(2000);

    // Generate a strictly unique file name block unique to this specific loop pass iteration
    const sanitizedFileName = itemName.toLowerCase().replace(/\s+/g, '_');
    const screenshotPath = `screenshots/${sanitizedFileName}_complete.png`;
    
    console.log(`Saving unique file to destination: ${screenshotPath}`);
    
    // 1. Capture the image payload as a variable data buffer instead of just a raw file path
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    
    // 2. FIXED: Explicitly register the captured buffer asset into Playwright's test report data stream
    await testInfo.attach(`${itemName} View Layout`, {
      body: screenshotBuffer,
      contentType: 'image/png'
    });
    
    console.log(`✔ Successfully generated and attached report snapshot for: "${itemName}"`);
  }

  console.log('\n========================================');
  console.log('Success! All 7 distinct dropdown views logged separately in your test runner attachments.');
});
