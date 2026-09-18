import { test, chromium, expect } from '@playwright/test';

test.describe('Flinn Scientific Multi-Product E-Commerce Suite', () => {

  test('Should validate pricing and cart for a list of items', async () => {
    test.setTimeout(950000); 

    console.log('Connecting to open desktop Google Chrome instance...');
    const browser = await chromium.connectOverCDP('http://localhost:9222');
    
    // FIX: Safely retrieve and validate the first index element from the contexts array
    const contexts = browser.contexts();
    if (contexts.length === 0) {
      throw new Error("No active browser context found. Is your Chrome profile running on port 9222?");
    }
    const context = contexts[0]; // Extracted singular target instance

    // --- PRODUCT SUITE DATASET CONFIGURATION ---
    const testProducts = [
      {
        sku: 'SE1000',
        headingRegex: /Flinn Goggle UV Sanitizer Cabinet/i,
        expectedPrice: '$799.00'
      },
      {
        sku: 'OB2141',
        headingRegex: /Electronic Balance, 210/i,
        expectedPrice: '$439.00'
      },
      {
        sku: 'OB2142',
        headingRegex: /Electronic Balance, 410/i,
        expectedPrice: '$569.00'
      },
      {
        sku: 'OB2143',
        headingRegex: /Electronic Balance, 120/i,
        expectedPrice: '$669.00'
      },
      {
        sku: 'MS1123',
        headingRegex: /Compound Microscope, 4X/i,
        expectedPrice: '$379.00'
      },
      {
        sku: 'MS1121',
        headingRegex: /Flinn Standard Compound Microscope, 4X, 10X, 40X, Stage Clips/i,
        expectedPrice: '$319.00'
      },
      {
        sku: 'AP9805',
        headingRegex: /Flinn Scientific Hot Plate/i,
        expectedPrice: '$549.00'
      },
      {
        sku: 'AP9801',
        headingRegex: /Flinn Scientific Chemistry Hot Plate, 4" x 4"/i,
        expectedPrice: '$299.00'
      },
      {
        sku: 'AP9807',
        headingRegex: /Flinn Scientific Digital Chemistry Hot Plate, 7" x 7"/i,
        expectedPrice: '$399.00'
      },
      {
        sku: 'AP9802',
        headingRegex: /Flinn Scientific Chemistry Hot Plate, 7" x 7"/i,
        expectedPrice: '$349.00'
      },
      {
        sku: 'H0008',
        headingRegex: /Hydrogen Peroxide, 30%, Reagent, 500 mL/i,
        expectedPrice: '$29.99'
      },
      {
        sku: 'M0001',
        headingRegex: /Magnesium Metal Ribbon, 25 g/i,
        expectedPrice: '$16.99'
      },
       {
        sku: 'AP7079',
        headingRegex: /Nitrile Gloves, Disposable, Powder-Free, Medium/i,
        expectedPrice: '$24.99'
      },
      {
        sku: 'AP7080',
        headingRegex: /Nitrile Gloves, Disposable, Powder-Free, Large/i,
        expectedPrice: '$25.99'
      },
        {
        sku: 'AP1278',
        headingRegex: /Weighing Dishes, Disposable/i,
        expectedPrice: '$49.99'
      },
      {
        sku: 'AP1516',
        headingRegex: /Beral Pipets, Graduated/i,
        expectedPrice: '$39.99'
      },
      {
        sku: 'GP1015',
        headingRegex: /Beakers, Borosilicate Glass, 150/i,
        expectedPrice: '$5.79'
      },
      {
        sku: 'AP1493',
        headingRegex: /Flinn Scientific Conductivity Meter/i,
        expectedPrice: '$39.99'
      },
      {
        sku: 'GP1087',
        headingRegex: /Buret Chemistry, Flint Glass, with PTFE Stopcock/i,
        expectedPrice: '$84.99'
      },
      {
        sku: 'AP3309',
        headingRegex: /Chemical Splash Science Safety Goggles, Standard Size, Vented/i,
        expectedPrice: '$12.99'
      },
      {
        sku: 'WL1010',
        headingRegex: /WhiteBox Learning® Applied STEM System, Unlimited Student Access per Teacher for 1 Year/i,
        expectedPrice: '$3,929.00'
      },
      {
        sku: 'TC1646',
        headingRegex: /LabQuest® 3 Interface/i,
        expectedPrice: '$599.00'
      },
      {
        sku: 'AP7026',
        headingRegex: /Flinn Scientific Spectrophotometer/i,
        expectedPrice: '$1,729.00'
      },
      {
        sku: 'MS1205',
        headingRegex: /Flinn Advanced Trinocular Compound Microscope/i,
        expectedPrice: '$1,079.00'
      },
      {
        sku: 'AP9809',
        headingRegex: /Flinn Scientific Digital Hot Plate/i,
        expectedPrice: '$649.00'
      }
    ];

    // --- LOOP THROUGH PRODUCTS SUITE ---
    for (const product of testProducts) {
      console.log(`\n--------------------------------------------------`);
      console.log(`Starting validation lifecycle for SKU: ${product.sku}`);
      console.log(`--------------------------------------------------`);

      // Correctly opens a clean child tab instance using our individual context reference
      const page = await context.newPage();
      await page.setViewportSize({ width: 1440, height: 900 });

      try {
        console.log('Navigating to storefront entry point...');
        await page.goto('https://flinnsci.com', { waitUntil: 'load', timeout: 60000 });

        // 1. UI Search Submission Pipeline
        console.log('Locating and activating search input box...');
        const searchInput = page.getByRole('searchbox', { name: /Keyword|Enter/i });
        await searchInput.waitFor({ state: 'visible', timeout: 15000 });
        
        await searchInput.click({ force: true });
        await page.waitForTimeout(500); 
        
        console.log(`Typing search query sequentially for: ${product.sku}`);
        await searchInput.pressSequentially(product.sku, { delay: 150 });
        
        console.log('Executing native keyboard form submission...');
        await searchInput.focus();
        await page.keyboard.press('Enter');

        const searchButton = page.getByRole('img', { name: 'Search' }).nth(1);
        if (await searchButton.isVisible()) {
            await searchButton.click({ delay: 100 });
        }

        console.log('Awaiting document loading lifecycle stabilization...');
        await page.waitForLoadState('load');
        await page.waitForLoadState('networkidle').catch(() => console.log('Network idle timeout reached, proceeding...'));

        // 2. PDP Synchronization
        console.log('Waiting for Product Detail Page heading sync...');
        const productHeading = page.getByRole('heading', { name: product.headingRegex });
        await expect(productHeading).toBeVisible({ timeout: 900 });
        console.log('Navigation to correct PDP confirmed.');

        // 3. Price Validation
        console.log('Validating listed pricing structure...');
        const priceElement = page.locator(`p:has-text("ITEM #${product.sku}") + *`);
        await priceElement.waitFor({ state: 'visible', timeout: 900 });
        
        const rawPriceText = await priceElement.innerText();
        const cleanedPrice = rawPriceText.replace(/\s+/g, ' ').trim();
        console.log(`Extracted Price: "${cleanedPrice}"`);

        if (!cleanedPrice.includes(product.expectedPrice)) {
          throw new Error(`Price check failed for ${product.sku}! Expected: "${product.expectedPrice}", found: "${cleanedPrice}"`);
        }
        console.log('Price validation verified successfully.');

        // 4. Stock Evaluation
        console.log('Checking live inventory indicators...');
        //const stockStatusLocator = page.locator('text="In Stock"').first();
        //await stockStatusLocator.waitFor({ state: 'visible', timeout: 1000 });
        //console.log('Item confirmed in stock.');

        // 1. Matches any of your three specific text states exactly
    const stockLocator = page.locator('text=/^(In Stock|Out of Stock|This item is temporarily out of stock)$/').first();

    try {
    // 2. Wait up to 5 seconds for the element to appear
    await stockLocator.waitFor({ state: 'visible', timeout: 5000 });
    
    // 3. Extract the text to see which one matched
    const currentStatus = await stockLocator.innerText();
    console.log(`Inventory Status Confirmed: "${currentStatus}"`);

    // 4. Handle your logic based on the status
    if (currentStatus === 'In Stock') {
        // Proceed to add to cart
    } else {
        // Handle unavailable item logic
    }

    } catch (error) {
    console.log('Failed to find a valid stock status indicator within 5 seconds.');
    }

        // 5. Add to Cart Sequence
        console.log('Adding item to active cart channel...');
        const addToCartButton = page.getByRole('button', { name: 'Add to Cart', exact: true }).first();
        await addToCartButton.waitFor({ state: 'visible', timeout: 1000 });
        await addToCartButton.click({ force: true });

        // 6. Wait for Toaster Confirmation
        console.log('Awaiting visibility of success toaster popup context...');
        const cartToasterLocator = page.locator('.mini-cart, .alert-success, .cart-toast, [class*="toast"], .cart-notification, .success-message').first();
        
        try {
          await cartToasterLocator.waitFor({ state: 'visible', timeout: 2000 });
          console.log('Add to cart toaster message detected inside viewport layout!');
        } catch (e) {
          console.log('Toaster notification delay threshold reached; drawing fallback buffer view...');
        }

        // 7. Capture Inline HTML Test Report Screenshot 
        const screenshotBuffer = await page.screenshot({ fullPage: false });
        await test.info().attach(`toaster-success-${product.sku}`, {
          body: screenshotBuffer,
          contentType: 'image/png'
        });
        console.log(`Screenshot for ${product.sku} successfully embedded inside the HTML test report layout.`);

      } catch (error) {
        console.error(`Test pipeline encountered a critical error processing SKU ${product.sku}:`, error.message);
        
        const errorBuffer = await page.screenshot({ fullPage: false });
        await test.info().attach(`failed-step-${product.sku}`, {
        body: errorBuffer,
        //contentType: 'image/png'
        });
        
        throw error; 
      } finally {
       console.log(`Cleaning workspace: Closing page tab context for ${product.sku}.`);
        await page.close(); 
     }
    }
  });

});
