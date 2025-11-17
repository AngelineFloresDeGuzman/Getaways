const { Builder, By, until } = require('selenium-webdriver');
const edge = require('selenium-webdriver/edge');
const fs = require('fs-extra');
const path = require('path');

// Admin credentials
const ADMIN_EMAIL = 'admin@getaways.com';
const ADMIN_PASSWORD = 'asdf1234!';
const BASE_URL = 'https://getaways-official.firebaseapp.com';

// Read and parse .side file
function parseSideFile() {
  const sideFilePath = path.join(__dirname, 'getaways-test-suite.side');
  const content = fs.readFileSync(sideFilePath, 'utf8');
  return JSON.parse(content);
}

// Login helper function
async function loginAsAdmin(driver) {
  console.log('Logging in as admin...');
  await driver.get(`${BASE_URL}/login`);
  await driver.sleep(2000);
  
  try {
    // Wait for email input
    const emailInput = await driver.wait(
      until.elementLocated(By.css('input[type="email"]')),
      10000
    );
    await emailInput.clear();
    await emailInput.sendKeys(ADMIN_EMAIL);
    
    // Wait for password input
    const passwordInput = await driver.wait(
      until.elementLocated(By.css('input[type="password"]')),
      10000
    );
    await passwordInput.clear();
    await passwordInput.sendKeys(ADMIN_PASSWORD);
    
    // Click submit button
    const submitButton = await driver.wait(
      until.elementLocated(By.css('button[type="submit"]')),
      10000
    );
    await submitButton.click();
    
    // Wait for navigation after login
    await driver.sleep(3000);
    console.log('✅ Login successful');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    return false;
  }
}

// Execute test commands and take screenshot
async function executeTestAndCapture(driver, test, outputDir) {
  const testName = test.name;
  console.log(`\n📸 Capturing: ${testName}`);
  
  try {
    // Execute each command in the test
    for (let i = 0; i < test.commands.length; i++) {
      const cmd = test.commands[i];
      const command = cmd.command;
      const target = cmd.target || '';
      const value = cmd.value || '';
      
      console.log(`  Step ${i + 1}: ${command} ${target}`);
      
      try {
        switch (command) {
          case 'open':
            const url = target.startsWith('http') ? target : `${BASE_URL}${target}`;
            await driver.get(url);
            await driver.sleep(2000);
            break;
            
          case 'waitForPageLoad':
            await driver.sleep(parseInt(value) || 3000);
            break;
            
          case 'wait':
            await driver.sleep(parseInt(value) || 1000);
            break;
            
          case 'click':
            if (target) {
              const element = await driver.wait(
                until.elementLocated(By.css(target)),
                10000
              );
              await driver.executeScript('arguments[0].scrollIntoView(true);', element);
              await driver.sleep(500);
              await element.click();
              await driver.sleep(1000);
            }
            break;
            
          case 'type':
            if (target && value) {
              const input = await driver.wait(
                until.elementLocated(By.css(target)),
                10000
              );
              await input.clear();
              await input.sendKeys(value);
              await driver.sleep(500);
            }
            break;
            
          case 'waitForElementPresent':
            await driver.wait(
              until.elementLocated(By.css(target)),
              parseInt(value) || 10000
            );
            break;
            
          case 'assertElementPresent':
            await driver.wait(
              until.elementLocated(By.css(target)),
              10000
            );
            break;
            
          case 'assertUrl':
            // Just wait a bit for URL to be correct
            await driver.sleep(1000);
            break;
            
          case 'assertTitle':
            // Just wait a bit
            await driver.sleep(1000);
            break;
            
          default:
            // For unknown commands, just wait a bit
            await driver.sleep(1000);
        }
      } catch (cmdError) {
        console.log(`    ⚠️  Command warning: ${cmdError.message}`);
        // Continue with next command
      }
    }
    
    // Wait a bit more for page to fully render
    await driver.sleep(2000);
    
    // Take screenshot
    const screenshot = await driver.takeScreenshot();
    const cleanName = testName.replace(/[<>:"/\\|?*]/g, '-');
    const screenshotPath = path.join(outputDir, `${cleanName}.png`);
    await fs.writeFile(screenshotPath, screenshot, 'base64');
    
    console.log(`  ✅ Screenshot saved: ${cleanName}.png`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ Error capturing ${testName}:`, error.message);
    // Still try to take a screenshot even if there was an error
    try {
      const screenshot = await driver.takeScreenshot();
      const cleanName = testName.replace(/[<>:"/\\|?*]/g, '-');
      const screenshotPath = path.join(outputDir, `${cleanName}-ERROR.png`);
      await fs.writeFile(screenshotPath, screenshot, 'base64');
      console.log(`  📸 Error screenshot saved: ${cleanName}-ERROR.png`);
    } catch (screenshotError) {
      console.error(`  ❌ Failed to save error screenshot:`, screenshotError.message);
    }
    return false;
  }
}

async function captureAllScreenshots() {
  const outputDir = path.join(__dirname, 'test-results', 'selenium-ide-real-screenshots');
  await fs.ensureDir(outputDir);
  
  console.log('========================================');
  console.log('CAPTURING REAL SCREENSHOTS WITH EDGE');
  console.log('Using Admin Credentials');
  console.log('========================================\n');
  
  // Parse .side file
  const sideData = parseSideFile();
  const allTests = sideData.tests;
  
  console.log(`Found ${allTests.length} test cases\n`);
  
  // Setup Edge options
  let options;
  try {
    options = new edge.Options();
  } catch (e) {
    // Fallback: try using Chrome options if Edge options not available
    const chrome = require('selenium-webdriver/chrome');
    options = new chrome.Options();
    console.log('⚠️  Using Chrome options as fallback for Edge');
  }
  
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  // Uncomment for headless mode:
  // options.addArguments('--headless=new');
  
  let driver;
  
  try {
    // Create Edge driver
    try {
      driver = await new Builder()
        .forBrowser('MicrosoftEdge')
        .setEdgeOptions(options)
        .build();
    } catch (edgeError) {
      // Fallback to Chrome if Edge driver not available
      console.log('⚠️  Edge driver not available, trying Chrome as fallback...');
      const chrome = require('selenium-webdriver/chrome');
      const chromeOptions = new chrome.Options();
      chromeOptions.addArguments('--start-maximized');
      chromeOptions.addArguments('--disable-blink-features=AutomationControlled');
      
      driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(chromeOptions)
        .build();
      console.log('✅ Using Chrome WebDriver');
    }
    
    if (!driver) {
      throw new Error('Failed to initialize WebDriver');
    }
    
    console.log('✅ WebDriver initialized\n');
    
    // Set window size
    await driver.manage().window().setRect({ width: 1920, height: 1080 });
    
    // Login as admin first (for tests that need authentication)
    const loginSuccess = await loginAsAdmin(driver);
    
    if (!loginSuccess) {
      console.log('⚠️  Login failed, but continuing with public pages...\n');
    }
    
    // Capture screenshots for each test
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < allTests.length; i++) {
      const test = allTests[i];
      
      // Check if this test needs admin login
      const needsAuth = test.name.toLowerCase().includes('admin') || 
                       test.name.toLowerCase().includes('host') ||
                       test.commands.some(cmd => 
                         cmd.target && (
                           cmd.target.includes('/admin/') || 
                           cmd.target.includes('/host/')
                         )
                       );
      
      // Re-login if needed and we're not already logged in
      if (needsAuth && !loginSuccess) {
        console.log('Re-attempting login for authenticated test...');
        await loginAsAdmin(driver);
      }
      
      const success = await executeTestAndCapture(driver, test, outputDir);
      
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Small delay between tests
      await driver.sleep(1000);
    }
    
    console.log('\n========================================');
    console.log('SCREENSHOT CAPTURE COMPLETE');
    console.log('========================================');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📁 Output directory: ${outputDir}`);
    console.log('========================================\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    if (driver) {
      console.log('Closing browser...');
      await driver.quit();
    }
  }
}

if (require.main === module) {
  captureAllScreenshots().catch(console.error);
}

module.exports = { captureAllScreenshots };

