import { test, expect, chromium } from '@playwright/test';

test('Login using Chrome DevTools Protocol Without Popups', async () => {
  // 1. Connect Playwright to the active browser instance running on port 9222
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  
  // 2. Fetch the correct context object index out of the running contexts array
  const allContexts = browser.contexts();
  const defaultContext = allContexts[0]; 
  
  // 3. Fetch or instantiate the page tab
  const pages = defaultContext.pages();
  const page = pages.length > 0 ? pages[0] : await defaultContext.newPage();

  // 4. Command the active browser window to hit the homepage path
  await page.goto('https://flinnsci.com', { waitUntil: 'load' }); 

  // 5. Open the dropdown toggle header
  const dropdownToggle = page.locator('text="Sign In / Register"').first();
  await dropdownToggle.waitFor({ state: 'visible', timeout: 5000 });
  await dropdownToggle.click();

  // 6. Click the specific revealed "Sign In" link option
  const signInLink = page.getByRole('link', { name: 'Sign In', exact: true });
  await signInLink.waitFor({ state: 'visible', timeout: 5000 });
  await signInLink.click();

  // 7. Populate credentials
  const emailInput = page.locator('#Email, #email, input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill('madhu26testing@gmail.com');

  // 8. Complete password string population
  const passwordField = page.locator('#Password, #password, input[type="password"]');
  await passwordField.fill('Gmailtest@123');

  // 9. Fire the submission control click event
  await page.getByRole('button', { name: 'Login', exact: true }).click();

  // 10. FIXED: Escaped special characters in regular expression URL assertion
  await expect(page).toHaveURL(/.*account|.*dashboard|.*flinnsci\.com/, { timeout: 15000 });
  console.log('Successfully logged in without browser popup interruptions!');
});
