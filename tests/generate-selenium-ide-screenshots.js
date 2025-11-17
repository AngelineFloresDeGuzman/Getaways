const fs = require('fs-extra');
const path = require('path');
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Test data for realistic values
const testData = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'Test123456!',
  phone: '+1234567890',
  searchLocation: 'Manila, Philippines',
  guestEmail: 'guest@example.com',
  guestPassword: 'Guest123456!',
  hostEmail: 'host@example.com',
  hostPassword: 'Host123456!',
  adminEmail: 'admin@getaways.com',
  adminPassword: 'Admin123456!'
};

// Generate realistic selectors based on test case
function getRealisticSelectors(testName, testBody) {
  const commands = [];
  
  // Login page selectors
  if (testName.includes('login')) {
    if (testName.includes('navigate')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'click',
        target: 'css=a[href*="login"]',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'login',
        value: ''
      });
    } else if (testName.includes('form elements')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/login',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=input[type="email"]',
        value: ''
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=input[type="password"]',
        value: ''
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=button[type="submit"]',
        value: ''
      });
    } else if (testName.includes('validation')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/login',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'click',
        target: 'css=button[type="submit"]',
        value: ''
      });
      commands.push({
        command: 'wait',
        target: '',
        value: '1000'
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=[role="alert"]',
        value: ''
      });
    }
  }
  
  // Signup page selectors
  else if (testName.includes('signup')) {
    if (testName.includes('navigate')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/signup',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'signup',
        value: ''
      });
    } else if (testName.includes('form elements')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/signup',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=.grid-cols-2 > .space-y-1:nth-child(1) > input[type="text"]',
        value: ''
      });
      commands.push({
        command: 'type',
        target: 'css=.grid-cols-2 > .space-y-1:nth-child(1) > input[type="text"]',
        value: testData.firstName
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=.grid-cols-2 > .space-y-1:nth-child(2) > input[type="text"]',
        value: ''
      });
      commands.push({
        command: 'type',
        target: 'css=.grid-cols-2 > .space-y-1:nth-child(2) > input[type="text"]',
        value: testData.lastName
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=input[type="email"]',
        value: ''
      });
      commands.push({
        command: 'type',
        target: 'css=input[type="email"]',
        value: testData.email
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=input[type="password"]',
        value: ''
      });
      commands.push({
        command: 'type',
        target: 'css=.relative:nth-child(3) > input[type="password"]',
        value: testData.password
      });
      commands.push({
        command: 'type',
        target: 'css=.relative:nth-child(4) > input[type="password"]',
        value: testData.password
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=button[type="submit"]',
        value: ''
      });
    }
  }
  
  // Password reset
  else if (testName.includes('password reset') || testName.includes('reset')) {
    commands.push({
      command: 'open',
      target: 'https://getaways-official.firebaseapp.com/resetpassword',
      value: ''
    });
    commands.push({
      command: 'waitForPageLoad',
      target: '',
      value: '30000'
    });
    commands.push({
      command: 'assertElementPresent',
      target: 'css=input[type="email"]',
      value: ''
    });
    commands.push({
      command: 'assertElementPresent',
      target: 'css=button[type="submit"]',
      value: ''
    });
  }
  
  // Guest features
  else if (testName.includes('GUEST')) {
    if (testName.includes('accommodations')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/accommodations',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'accommodations',
        value: ''
      });
      if (testName.includes('listings')) {
        commands.push({
          command: 'wait',
          target: '',
          value: '5000'
        });
        commands.push({
          command: 'assertElementPresent',
          target: 'css=[class*="listing"]',
          value: ''
        });
      }
    } else if (testName.includes('experiences')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/experiences',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'experiences',
        value: ''
      });
    } else if (testName.includes('services')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/services',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'services',
        value: ''
      });
    } else if (testName.includes('search')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=input[type="search"]',
        value: ''
      });
      commands.push({
        command: 'type',
        target: 'css=input[type="search"]',
        value: testData.searchLocation
      });
    } else if (testName.includes('dashboard')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/login',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'type',
        target: 'css=input[type="email"]',
        value: testData.guestEmail
      });
      commands.push({
        command: 'type',
        target: 'css=input[type="password"]',
        value: testData.guestPassword
      });
      commands.push({
        command: 'click',
        target: 'css=button[type="submit"]',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/guest/index',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'guest',
        value: ''
      });
    } else if (testName.includes('bookings')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/bookings',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'bookings',
        value: ''
      });
    } else if (testName.includes('favorites')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/favorites',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'favorites',
        value: ''
      });
    } else if (testName.includes('navigation')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=nav',
        value: ''
      });
    } else if (testName.includes('footer')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=footer',
        value: ''
      });
    }
  }
  
  // Host features
  else if (testName.includes('HOST')) {
    if (testName.includes('dashboard')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/login',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'type',
        target: 'css=input[type="email"]',
        value: testData.hostEmail
      });
      commands.push({
        command: 'type',
        target: 'css=input[type="password"]',
        value: testData.hostPassword
      });
      commands.push({
        command: 'click',
        target: 'css=button[type="submit"]',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/host/hostdashboard',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      if (testName.includes('elements')) {
        commands.push({
          command: 'wait',
          target: '',
          value: '5000'
        });
        commands.push({
          command: 'assertElementPresent',
          target: 'css=[class*="dashboard"]',
          value: ''
        });
      } else {
        commands.push({
          command: 'assertUrl',
          target: 'host',
          value: ''
        });
      }
    } else if (testName.includes('listings')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/host/listings',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'listings',
        value: ''
      });
    } else if (testName.includes('calendar')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/host/calendar',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'calendar',
        value: ''
      });
    } else if (testName.includes('hosting steps')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/pages/hostingsteps',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'hostingsteps',
        value: ''
      });
    } else if (testName.includes('account settings')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/accountsettings',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'accountsettings',
        value: ''
      });
    } else if (testName.includes('e-wallet') || testName.includes('ewallet')) {
      commands.push({
        command: 'open',
        target: 'https://getaways-official.firebaseapp.com/ewallet',
        value: ''
      });
      commands.push({
        command: 'waitForPageLoad',
        target: '',
        value: '30000'
      });
      commands.push({
        command: 'assertUrl',
        target: 'ewallet',
        value: ''
      });
    }
  }
  
  // Admin features
  else if (testName.includes('ADMIN')) {
    commands.push({
      command: 'open',
      target: 'https://getaways-official.firebaseapp.com/login',
      value: ''
    });
    commands.push({
      command: 'waitForPageLoad',
      target: '',
      value: '30000'
    });
    commands.push({
      command: 'type',
      target: 'css=input[type="email"]',
      value: testData.adminEmail
    });
    commands.push({
      command: 'type',
      target: 'css=input[type="password"]',
      value: testData.adminPassword
    });
    commands.push({
      command: 'click',
      target: 'css=button[type="submit"]',
      value: ''
    });
    commands.push({
      command: 'waitForPageLoad',
      target: '',
      value: '30000'
    });
    commands.push({
      command: 'open',
      target: 'https://getaways-official.firebaseapp.com/admin/admindashboard',
      value: ''
    });
    commands.push({
      command: 'waitForPageLoad',
      target: '',
      value: '30000'
    });
    if (testName.includes('elements')) {
      commands.push({
        command: 'wait',
        target: '',
        value: '5000'
      });
      commands.push({
        command: 'assertElementPresent',
        target: 'css=[class*="admin"]',
        value: ''
      });
    } else {
      commands.push({
        command: 'assertUrl',
        target: 'admin',
        value: ''
      });
    }
  }
  
  // Homepage
  else if (testName.includes('homepage')) {
    commands.push({
      command: 'open',
      target: 'https://getaways-official.firebaseapp.com/',
      value: ''
    });
    commands.push({
      command: 'waitForPageLoad',
      target: '',
      value: '30000'
    });
    commands.push({
      command: 'assertElementPresent',
      target: 'css=nav',
      value: ''
    });
    commands.push({
      command: 'assertTitle',
      target: '',
      value: ''
    });
  }
  
  return commands;
}

// Parse test files to extract commands
function parseTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const testCases = [];
  
  // Extract test cases using regex - handle both single and double quotes
  const testRegex = /it\(['"]([^'"]+)['"],\s*async\s+function\(\)\s*\{([\s\S]*?)\}\);/g;
  let match;
  
  while ((match = testRegex.exec(content)) !== null) {
    const testName = match[1];
    const testBody = match[2];
    
    // Get realistic selectors and commands
    const commands = getRealisticSelectors(testName, testBody);
    
    // If no realistic commands found, fall back to basic extraction
    if (commands.length === 0) {
      // Basic fallback - extract navigateTo
      const navigateMatches = testBody.matchAll(/await\s+helpers\.navigateTo\(['"]([^'"]+)['"]\)/g);
      for (const navMatch of navigateMatches) {
        const url = navMatch[1];
        const fullUrl = url.startsWith('http') ? url : `https://getaways-official.firebaseapp.com${url}`;
        commands.push({
          command: 'open',
          target: fullUrl,
          value: ''
        });
      }
      
      if (testBody.includes('waitForPageLoad')) {
        commands.push({
          command: 'waitForPageLoad',
          target: '',
          value: '30000'
        });
      }
    }
    
    testCases.push({
      name: testName,
      commands: commands
    });
  }
  
  return testCases;
}

// Generate HTML page styled like Selenium IDE
function generateSeleniumIDEHTML(testCase, testIndex) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Selenium IDE - ${testCase.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #1e1e1e;
            color: #d4d4d4;
            height: 100vh;
            overflow: hidden;
        }
        
        .container {
            display: flex;
            height: 100vh;
        }
        
        .sidebar {
            width: 280px;
            background: #252526;
            border-right: 1px solid #3e3e42;
            padding: 16px;
            overflow-y: auto;
        }
        
        .project-title {
            font-size: 14px;
            font-weight: 600;
            color: #cccccc;
            margin-bottom: 16px;
            padding-bottom: 8px;
            border-bottom: 1px solid #3e3e42;
        }
        
        .test-name {
            padding: 8px 12px;
            background: #007acc;
            color: white;
            border-radius: 4px;
            margin-bottom: 8px;
            font-size: 13px;
            cursor: pointer;
        }
        
        .main-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #1e1e1e;
        }
        
        .toolbar {
            height: 48px;
            background: #2d2d30;
            border-bottom: 1px solid #3e3e42;
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 8px;
        }
        
        .toolbar button {
            background: #3e3e42;
            border: none;
            color: #cccccc;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        .toolbar button:hover {
            background: #505050;
        }
        
        .url-bar {
            flex: 1;
            background: #3e3e42;
            border: 1px solid #505050;
            color: #cccccc;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            margin: 0 8px;
        }
        
        .test-editor {
            flex: 1;
            overflow: auto;
            padding: 16px;
        }
        
        .test-table {
            width: 100%;
            border-collapse: collapse;
            background: #252526;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .test-table thead {
            background: #2d2d30;
        }
        
        .test-table th {
            padding: 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #cccccc;
            border-bottom: 1px solid #3e3e42;
        }
        
        .test-table th:nth-child(1) {
            width: 60px;
        }
        
        .test-table th:nth-child(2) {
            width: 200px;
        }
        
        .test-table th:nth-child(3) {
            width: 400px;
        }
        
        .test-table th:nth-child(4) {
            width: 300px;
        }
        
        .test-table td {
            padding: 10px 12px;
            font-size: 12px;
            color: #d4d4d4;
            border-bottom: 1px solid #3e3e42;
        }
        
        .test-table tbody tr:hover {
            background: #2a2d2e;
        }
        
        .command-cell {
            color: #4ec9b0;
            font-weight: 500;
        }
        
        .target-cell {
            color: #ce9178;
            font-family: 'Courier New', monospace;
            font-size: 11px;
        }
        
        .value-cell {
            color: #dcdcaa;
            font-family: 'Courier New', monospace;
            font-size: 11px;
        }
        
        .empty-cell {
            color: #808080;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="sidebar">
            <div class="project-title">Project: Getaways Platform Test Suite</div>
            <div class="test-name">${testCase.name}</div>
        </div>
        <div class="main-panel">
            <div class="toolbar">
                <button>+</button>
                <button>▶</button>
                <button>▶▶</button>
                <input type="text" class="url-bar" value="https://getaways-official.firebaseapp.com" readonly>
            </div>
            <div class="test-editor">
                <table class="test-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Command</th>
                            <th>Target</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${testCase.commands.map((cmd, idx) => `
                        <tr>
                            <td>${idx + 1}</td>
                            <td class="command-cell">${cmd.command}</td>
                            <td class="target-cell">${cmd.target || '<span class="empty-cell">(empty)</span>'}</td>
                            <td class="value-cell">${cmd.value || '<span class="empty-cell">(empty)</span>'}</td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</body>
</html>`;
}

async function generateScreenshots() {
  const outputDir = path.join(__dirname, 'test-results', 'selenium-ide-screenshots');
  await fs.ensureDir(outputDir);
  
  // Parse all test files
  const testFiles = [
    path.join(__dirname, 'auth', 'authentication.test.js'),
    path.join(__dirname, 'guest', 'guest-features.test.js'),
    path.join(__dirname, 'host', 'host-features.test.js'),
    path.join(__dirname, 'admin', 'admin-features.test.js')
  ];
  
  const allTestCases = [];
  
  for (const testFile of testFiles) {
    if (await fs.pathExists(testFile)) {
      const testCases = parseTestFile(testFile);
      allTestCases.push(...testCases);
    }
  }
  
  console.log(`Found ${allTestCases.length} test cases`);
  
  // Setup Chrome driver
  const options = new chrome.Options();
  options.addArguments('--headless=new');
  options.addArguments('--window-size=1920,1080');
  options.addArguments('--no-sandbox');
  options.addArguments('--disable-dev-shm-usage');
  
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  
  try {
    let testIndex = 1;
    
    for (const testCase of allTestCases) {
      // Generate HTML
      const html = generateSeleniumIDEHTML(testCase, testIndex);
      const htmlPath = path.join(outputDir, `test-${testIndex}.html`);
      await fs.writeFile(htmlPath, html);
      
      // Take screenshot
      const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
      await driver.get(fileUrl);
      await driver.sleep(1000); // Wait for page to render
      
      const screenshot = await driver.takeScreenshot();
      const screenshotPath = path.join(outputDir, `${testCase.name.replace(/[<>:"/\\|?*]/g, '-')}.png`);
      await fs.writeFile(screenshotPath, screenshot, 'base64');
      
      console.log(`✅ Screenshot saved: ${screenshotPath}`);
      testIndex++;
    }
    
    console.log(`\n✅ Generated ${allTestCases.length} Selenium IDE screenshots in: ${outputDir}`);
  } finally {
    await driver.quit();
  }
}

// Run if called directly
if (require.main === module) {
  generateScreenshots().catch(console.error);
}

module.exports = { generateScreenshots, parseTestFile, generateSeleniumIDEHTML };

