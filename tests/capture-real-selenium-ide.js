const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs-extra');
const path = require('path');

// Path to Selenium IDE extension (if installed)
// Common locations:
// Windows: C:\Users\<username>\AppData\Local\Google\Chrome\User Data\Default\Extensions\<extension-id>
// Or we can use the web version at https://www.selenium.dev/selenium-ide/

async function captureRealSeleniumIDE() {
  const outputDir = path.join(__dirname, 'test-results', 'selenium-ide-real-screenshots');
  await fs.ensureDir(outputDir);
  
  const options = new chrome.Options();
  options.addArguments('--start-maximized');
  options.addArguments('--disable-blink-features=AutomationControlled');
  
  // Try to load Selenium IDE extension if path is provided
  // const extensionPath = 'C:\\path\\to\\selenium-ide-extension';
  // if (await fs.pathExists(extensionPath)) {
  //   options.addArguments(`--load-extension=${extensionPath}`);
  // }
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    console.log('Opening Selenium IDE...');
    
    // Option 1: Open Selenium IDE web version
    await driver.get('https://www.selenium.dev/selenium-ide/');
    await driver.sleep(3000);
    
    // Option 2: Open local Selenium IDE if installed
    // await driver.get('chrome-extension://<extension-id>/index.html');
    
    // Take initial screenshot
    const screenshot = await driver.takeScreenshot();
    await fs.writeFile(path.join(outputDir, 'selenium-ide-home.png'), screenshot, 'base64');
    console.log('✅ Screenshot saved: selenium-ide-home.png');
    
    // Try to load the .side file
    const sideFilePath = path.join(__dirname, 'getaways-test-suite.side');
    if (await fs.pathExists(sideFilePath)) {
      console.log('Loading .side file...');
      
      // Instructions for user to manually load:
      console.log('\n📋 MANUAL STEPS REQUIRED:');
      console.log('1. In the Selenium IDE window that just opened:');
      console.log('2. Click "Open an existing project"');
      console.log(`3. Navigate to: ${sideFilePath}`);
      console.log('4. Select the file and click Open');
      console.log('5. Wait for all test cases to load');
      console.log('6. Press Enter here when ready to capture screenshots...');
      
      // Wait for user input (in real scenario, we'd automate this)
      // For now, we'll create a script that opens the file directly
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Don't close immediately - let user interact
    console.log('\n⚠️  Browser will stay open for 60 seconds for manual interaction...');
    console.log('You can manually load the .side file and take screenshots.');
    await driver.sleep(60000);
    await driver.quit();
  }
}

// Alternative: Create a script that opens Selenium IDE with the file
async function openSeleniumIDEWithFile() {
  const sideFilePath = path.join(__dirname, 'getaways-test-suite.side');
  const absolutePath = path.resolve(sideFilePath).replace(/\\/g, '/');
  
  console.log('Creating script to open Selenium IDE...');
  console.log(`\n📁 .side file location: ${absolutePath}`);
  console.log('\n📋 To capture real Selenium IDE screenshots:');
  console.log('1. Open Chrome browser');
  console.log('2. Install Selenium IDE extension from Chrome Web Store');
  console.log('3. Click the Selenium IDE icon in Chrome toolbar');
  console.log('4. Click "Open an existing project"');
  console.log(`5. Navigate to: ${absolutePath}`);
  console.log('6. Select getaways-test-suite.side and click Open');
  console.log('7. Switch to Light Mode (if needed)');
  console.log('8. Click on each test case in the sidebar');
  console.log('9. Take screenshots of each test case');
}

if (require.main === module) {
  // Try automated approach first
  captureRealSeleniumIDE().catch(async (error) => {
    console.error('Automated approach failed:', error.message);
    console.log('\nFalling back to manual instructions...\n');
    await openSeleniumIDEWithFile();
  });
}

module.exports = { captureRealSeleniumIDE, openSeleniumIDEWithFile };


