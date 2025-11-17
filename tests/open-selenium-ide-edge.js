const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

async function openSeleniumIDEInEdge() {
  const sideFilePath = path.join(__dirname, 'getaways-test-suite.side');
  const absolutePath = path.resolve(sideFilePath).replace(/\\/g, '/');
  
  console.log('========================================');
  console.log('OPENING SELENIUM IDE IN MICROSOFT EDGE');
  console.log('========================================\n');
  
  // Open Microsoft Edge with Selenium IDE
  console.log('Opening Microsoft Edge...');
  exec('start msedge "https://www.selenium.dev/selenium-ide/"', (error) => {
    if (error) {
      console.error('Error opening Edge:', error);
      console.log('\nPlease manually open Microsoft Edge and go to:');
      console.log('https://www.selenium.dev/selenium-ide/');
    }
  });
  
  // Open File Explorer to the tests folder
  setTimeout(() => {
    console.log('Opening File Explorer to tests folder...');
    exec(`explorer "${__dirname}"`, (error) => {
      if (error) {
        console.error('Error opening File Explorer:', error);
      }
    });
  }, 1000);
  
  console.log('\n========================================');
  console.log('MANUAL STEPS:');
  console.log('========================================\n');
  console.log('1. In Microsoft Edge, click the Selenium IDE extension icon');
  console.log('   (If not visible, click the puzzle piece icon > Pin Selenium IDE)\n');
  console.log('2. Click "Open an existing project"\n');
  console.log(`3. Navigate to: ${absolutePath}\n`);
  console.log('4. Select "getaways-test-suite.side" and click Open\n');
  console.log('5. Switch to Light Mode (theme toggle button)\n');
  console.log('6. Click on each test case in the sidebar\n');
  console.log('7. Take screenshots using Win+Shift+S\n');
  console.log('8. Save in: test-results\\selenium-ide-real-screenshots\\\n');
  console.log('========================================\n');
  console.log('Quick Links:');
  console.log('- Edge Extensions: edge://extensions');
  console.log('- Selenium IDE: https://www.selenium.dev/selenium-ide/');
  console.log('========================================\n');
}

if (require.main === module) {
  openSeleniumIDEInEdge();
}

module.exports = { openSeleniumIDEInEdge };


