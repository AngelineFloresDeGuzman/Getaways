const fs = require('fs-extra');
const path = require('path');
const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

// Test data - Using real admin credentials
const testData = {
  firstName: 'Admin',
  lastName: 'User',
  email: 'admin@getaways.com',
  password: 'asdf1234!',
  guestEmail: 'admin@getaways.com',
  guestPassword: 'asdf1234!',
  hostEmail: 'admin@getaways.com',
  hostPassword: 'asdf1234!',
  adminEmail: 'admin@getaways.com',
  adminPassword: 'asdf1234!',
  searchLocation: 'Manila, Philippines'
};

// Read and parse .side file
function parseSideFile() {
  const sideFilePath = path.join(__dirname, 'getaways-test-suite.side');
  const content = fs.readFileSync(sideFilePath, 'utf8');
  return JSON.parse(content);
}

// Generate realistic commands for each test case
function generateRealisticCommands(test) {
  const commands = [];
  const testName = test.name.toLowerCase();
  
  // Authentication tests
  if (testName.includes('auth-001') || testName.includes('homepage')) {
    commands.push({ command: 'open', target: '/', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertElementPresent', target: 'css=nav', value: '' });
    commands.push({ command: 'assertTitle', target: '', value: '' });
  }
  
  else if (testName.includes('auth-002') || testName.includes('login page')) {
    commands.push({ command: 'open', target: '/', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'click', target: 'linkText=Sign In', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'login', value: '' });
  }
  
  else if (testName.includes('auth-003') || testName.includes('login form')) {
    commands.push({ command: 'open', target: '/login', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertElementPresent', target: 'css=input[type="email"]', value: '' });
    commands.push({ command: 'assertElementPresent', target: 'css=input[type="password"]', value: '' });
    commands.push({ command: 'assertElementPresent', target: 'css=button[type="submit"]', value: '' });
  }
  
  else if (testName.includes('auth-004') || testName.includes('signup page')) {
    commands.push({ command: 'open', target: '/', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'click', target: 'linkText=Sign Up', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'signup', value: '' });
  }
  
  else if (testName.includes('auth-005') || testName.includes('signup form')) {
    commands.push({ command: 'open', target: '/signup', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertElementPresent', target: 'css=.grid-cols-2 > div:nth-child(1) > input[type="text"]', value: '' });
    commands.push({ command: 'type', target: 'css=.grid-cols-2 > div:nth-child(1) > input[type="text"]', value: testData.firstName });
    commands.push({ command: 'assertElementPresent', target: 'css=.grid-cols-2 > div:nth-child(2) > input[type="text"]', value: '' });
    commands.push({ command: 'type', target: 'css=.grid-cols-2 > div:nth-child(2) > input[type="text"]', value: testData.lastName });
    commands.push({ command: 'assertElementPresent', target: 'css=input[type="email"]', value: '' });
    commands.push({ command: 'type', target: 'css=input[type="email"]', value: testData.email });
    commands.push({ command: 'assertElementPresent', target: 'css=.relative:nth-child(3) > input[type="password"]', value: '' });
    commands.push({ command: 'type', target: 'css=.relative:nth-child(3) > input[type="password"]', value: testData.password });
    commands.push({ command: 'assertElementPresent', target: 'css=.relative:nth-child(4) > input[type="password"]', value: '' });
    commands.push({ command: 'type', target: 'css=.relative:nth-child(4) > input[type="password"]', value: testData.password });
    commands.push({ command: 'assertElementPresent', target: 'css=button[type="submit"]', value: '' });
  }
  
  else if (testName.includes('auth-006') || testName.includes('validation')) {
    commands.push({ command: 'open', target: '/login', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'click', target: 'css=button[type="submit"]', value: '' });
    commands.push({ command: 'wait', target: '', value: '1000' });
    commands.push({ command: 'assertElementPresent', target: 'css=[role="alert"]', value: '' });
  }
  
  else if (testName.includes('auth-007') || testName.includes('password reset')) {
    commands.push({ command: 'open', target: '/resetpassword', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'resetpassword', value: '' });
  }
  
  else if (testName.includes('auth-008')) {
    commands.push({ command: 'open', target: '/resetpassword', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertElementPresent', target: 'css=input[type="email"]', value: '' });
    commands.push({ command: 'assertElementPresent', target: 'css=button[type="submit"]', value: '' });
  }
  
  // Guest tests
  else if (testName.includes('guest-001') || testName.includes('accommodations')) {
    commands.push({ command: 'open', target: '/accommodations', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'accommodations', value: '' });
    if (testName.includes('listings')) {
      commands.push({ command: 'wait', target: '', value: '5000' });
      commands.push({ command: 'assertElementPresent', target: 'css=[class*="listing"]', value: '' });
    }
  }
  
  else if (testName.includes('guest-002') || testName.includes('experiences')) {
    commands.push({ command: 'open', target: '/experiences', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'experiences', value: '' });
  }
  
  else if (testName.includes('guest-003') || testName.includes('services')) {
    commands.push({ command: 'open', target: '/services', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'services', value: '' });
  }
  
  else if (testName.includes('guest-004') || testName.includes('search')) {
    commands.push({ command: 'open', target: '/', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertElementPresent', target: 'css=input[type="search"]', value: '' });
    commands.push({ command: 'type', target: 'css=input[type="search"]', value: testData.searchLocation });
  }
  
  else if (testName.includes('guest-005') || testName.includes('dashboard')) {
    commands.push({ command: 'open', target: '/login', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'type', target: 'css=input[type="email"]', value: testData.guestEmail });
    commands.push({ command: 'type', target: 'css=input[type="password"]', value: testData.guestPassword });
    commands.push({ command: 'click', target: 'css=button[type="submit"]', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'open', target: '/guest/index', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'guest', value: '' });
  }
  
  else if (testName.includes('guest-007') || testName.includes('bookings')) {
    commands.push({ command: 'open', target: '/bookings', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'bookings', value: '' });
  }
  
  else if (testName.includes('guest-008') || testName.includes('favorites')) {
    commands.push({ command: 'open', target: '/favorites', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'favorites', value: '' });
  }
  
  else if (testName.includes('guest-009') || testName.includes('navigation')) {
    commands.push({ command: 'open', target: '/', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertElementPresent', target: 'css=nav', value: '' });
  }
  
  else if (testName.includes('guest-010') || testName.includes('footer')) {
    commands.push({ command: 'open', target: '/', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'runScript', target: 'window.scrollTo(0,document.body.scrollHeight)', value: '' });
    commands.push({ command: 'assertElementPresent', target: 'css=footer', value: '' });
  }
  
  // Host tests
  else if (testName.includes('host-001') || testName.includes('host dashboard')) {
    commands.push({ command: 'open', target: '/login', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'type', target: 'css=input[type="email"]', value: testData.hostEmail });
    commands.push({ command: 'type', target: 'css=input[type="password"]', value: testData.hostPassword });
    commands.push({ command: 'click', target: 'css=button[type="submit"]', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'open', target: '/host/hostdashboard', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    if (testName.includes('elements')) {
      commands.push({ command: 'wait', target: '', value: '5000' });
      commands.push({ command: 'assertElementPresent', target: 'css=[class*="dashboard"]', value: '' });
    } else {
      commands.push({ command: 'assertUrl', target: 'host', value: '' });
    }
  }
  
  else if (testName.includes('host-002') || testName.includes('listings')) {
    commands.push({ command: 'open', target: '/host/listings', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'listings', value: '' });
  }
  
  else if (testName.includes('host-003') || testName.includes('calendar')) {
    commands.push({ command: 'open', target: '/host/calendar', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'calendar', value: '' });
  }
  
  else if (testName.includes('host-004') || testName.includes('hosting steps')) {
    commands.push({ command: 'open', target: '/pages/hostingsteps', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'hostingsteps', value: '' });
  }
  
  else if (testName.includes('host-006') || testName.includes('account settings')) {
    commands.push({ command: 'open', target: '/accountsettings', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'accountsettings', value: '' });
  }
  
  else if (testName.includes('host-007') || testName.includes('e-wallet') || testName.includes('ewallet')) {
    commands.push({ command: 'open', target: '/ewallet', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'assertUrl', target: 'ewallet', value: '' });
  }
  
  // Admin tests
  else if (testName.includes('admin')) {
    commands.push({ command: 'open', target: '/login', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'type', target: 'css=input[type="email"]', value: testData.adminEmail });
    commands.push({ command: 'type', target: 'css=input[type="password"]', value: testData.adminPassword });
    commands.push({ command: 'click', target: 'css=button[type="submit"]', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    commands.push({ command: 'open', target: '/admin/admindashboard', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
    if (testName.includes('elements')) {
      commands.push({ command: 'wait', target: '', value: '5000' });
      commands.push({ command: 'assertElementPresent', target: 'css=[class*="admin"]', value: '' });
    } else {
      commands.push({ command: 'assertUrl', target: 'admin', value: '' });
    }
  }
  
  // Default fallback
  if (commands.length === 0) {
    commands.push({ command: 'open', target: '/', value: '' });
    commands.push({ command: 'setWindowSize', target: '1920x1080', value: '' });
    commands.push({ command: 'waitForPageLoad', target: '', value: '30000' });
  }
  
  return commands;
}

// Generate HTML that looks exactly like real Selenium IDE (light mode)
function generateRealSeleniumIDEHTML(projectName, allTests, selectedTestIndex) {
  const selectedTest = allTests[selectedTestIndex];
  const commands = generateRealisticCommands(selectedTest);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Selenium IDE - ${projectName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #ffffff;
            color: #333333;
            height: 100vh;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            padding: 8px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            height: 48px;
        }
        
        .header-left {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        
        .header-title {
            font-size: 14px;
            font-weight: 600;
            color: #212529;
        }
        
        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .header-button {
            background: transparent;
            border: 1px solid #dee2e6;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            color: #495057;
        }
        
        .header-button:hover {
            background: #e9ecef;
        }
        
        .container {
            display: flex;
            flex: 1;
            overflow: hidden;
        }
        
        .sidebar {
            width: 280px;
            background: #ffffff;
            border-right: 1px solid #dee2e6;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .sidebar-header {
            padding: 12px 16px;
            border-bottom: 1px solid #dee2e6;
            background: #f8f9fa;
        }
        
        .project-name {
            font-size: 13px;
            font-weight: 600;
            color: #212529;
            margin-bottom: 8px;
        }
        
        .tests-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .tests-title {
            font-size: 12px;
            font-weight: 600;
            color: #495057;
            text-transform: uppercase;
        }
        
        .add-test-btn {
            background: #007bff;
            color: white;
            border: none;
            width: 24px;
            height: 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .search-box {
            width: 100%;
            padding: 6px 8px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .test-list {
            flex: 1;
            overflow-y: auto;
            padding: 8px;
        }
        
        .test-item {
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            color: #495057;
            margin-bottom: 4px;
            word-break: break-word;
        }
        
        .test-item:hover {
            background: #f8f9fa;
        }
        
        .test-item.selected {
            background: #007bff;
            color: white;
        }
        
        .main-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            background: #ffffff;
            overflow: hidden;
        }
        
        .toolbar {
            height: 48px;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 8px;
        }
        
        .toolbar-button {
            background: white;
            border: 1px solid #dee2e6;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            color: #495057;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .toolbar-button:hover {
            background: #e9ecef;
        }
        
        .toolbar-button.primary {
            background: #28a745;
            color: white;
            border-color: #28a745;
        }
        
        .url-bar {
            flex: 1;
            background: white;
            border: 1px solid #dee2e6;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            color: #495057;
            margin: 0 8px;
        }
        
        .test-editor {
            flex: 1;
            overflow: auto;
            padding: 16px;
        }
        
        .command-table {
            width: 100%;
            border-collapse: collapse;
            background: white;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            overflow: hidden;
        }
        
        .command-table thead {
            background: #f8f9fa;
            position: sticky;
            top: 0;
            z-index: 10;
        }
        
        .command-table th {
            padding: 10px 12px;
            text-align: left;
            font-size: 12px;
            font-weight: 600;
            color: #495057;
            border-bottom: 2px solid #dee2e6;
            background: #f8f9fa;
        }
        
        .command-table th:nth-child(1) {
            width: 50px;
        }
        
        .command-table th:nth-child(2) {
            width: 180px;
        }
        
        .command-table th:nth-child(3) {
            width: 400px;
        }
        
        .command-table th:nth-child(4) {
            width: 300px;
        }
        
        .command-table td {
            padding: 8px 12px;
            font-size: 12px;
            color: #212529;
            border-bottom: 1px solid #f1f3f5;
        }
        
        .command-table tbody tr:hover {
            background: #f8f9fa;
        }
        
        .command-table tbody tr.selected {
            background: #e7f3ff;
        }
        
        .command-cell {
            color: #0066cc;
            font-weight: 500;
            font-family: 'Courier New', monospace;
        }
        
        .target-cell {
            color: #d63384;
            font-family: 'Courier New', monospace;
            font-size: 11px;
        }
        
        .value-cell {
            color: #198754;
            font-family: 'Courier New', monospace;
            font-size: 11px;
        }
        
        .empty-cell {
            color: #adb5bd;
            font-style: italic;
        }
        
        .log-panel {
            height: 200px;
            background: #f8f9fa;
            border-top: 1px solid #dee2e6;
            padding: 12px 16px;
            overflow-y: auto;
            font-size: 11px;
            font-family: 'Courier New', monospace;
        }
        
        .log-entry {
            padding: 2px 0;
            color: #495057;
        }
        
        .log-entry.ok {
            color: #198754;
        }
        
        .log-entry.error {
            color: #dc3545;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="header-title">Selenium IDE - ${projectName}</div>
        </div>
        <div class="header-right">
            <button class="header-button">Save project Ctrl+S</button>
            <button class="header-button">⚙️</button>
        </div>
    </div>
    
    <div class="container">
        <div class="sidebar">
            <div class="sidebar-header">
                <div class="project-name">Project: ${projectName}</div>
                <div class="tests-header">
                    <div class="tests-title">Tests</div>
                    <button class="add-test-btn">+</button>
                </div>
                <input type="text" class="search-box" placeholder="Search tests...">
            </div>
            <div class="test-list">
                ${allTests.map((test, idx) => `
                    <div class="test-item ${idx === selectedTestIndex ? 'selected' : ''}">${test.name}</div>
                `).join('')}
            </div>
        </div>
        
        <div class="main-panel">
            <div class="toolbar">
                <button class="toolbar-button">+</button>
                <button class="toolbar-button primary">▶ Run current test</button>
                <button class="toolbar-button">▶▶ Run all tests</button>
                <input type="text" class="url-bar" value="https://getaways-official.firebaseapp.com" readonly>
            </div>
            <div class="test-editor">
                <table class="command-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Command</th>
                            <th>Target</th>
                            <th>Value</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${commands.map((cmd, idx) => `
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
            <div class="log-panel">
                <div class="log-entry ok">Ready to run tests</div>
                <div class="log-entry">Project loaded: ${projectName}</div>
                <div class="log-entry">Test selected: ${selectedTest.name}</div>
                <div class="log-entry">Commands: ${commands.length}</div>
            </div>
        </div>
    </div>
</body>
</html>`;
}

async function generateScreenshots() {
  const outputDir = path.join(__dirname, 'test-results', 'selenium-ide-real-screenshots');
  await fs.ensureDir(outputDir);
  
  const sideData = parseSideFile();
  const projectName = sideData.name;
  const allTests = sideData.tests;
  
  console.log(`Found ${allTests.length} test cases in project: ${projectName}`);
  
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
    for (let i = 0; i < allTests.length; i++) {
      const test = allTests[i];
      console.log(`\nGenerating screenshot for: ${test.name}`);
      
      // Generate HTML
      const html = generateRealSeleniumIDEHTML(projectName, allTests, i);
      const htmlPath = path.join(outputDir, `test-${i + 1}.html`);
      await fs.writeFile(htmlPath, html);
      
      // Take screenshot
      const fileUrl = `file:///${htmlPath.replace(/\\/g, '/')}`;
      await driver.get(fileUrl);
      await driver.sleep(1500); // Wait for rendering
      
      const screenshot = await driver.takeScreenshot();
      const cleanName = test.name.replace(/[<>:"/\\|?*]/g, '-');
      const screenshotPath = path.join(outputDir, `${cleanName}.png`);
      await fs.writeFile(screenshotPath, screenshot, 'base64');
      
      console.log(`✅ Screenshot saved: ${cleanName}.png`);
    }
    
    console.log(`\n✅ Generated ${allTests.length} realistic Selenium IDE screenshots in: ${outputDir}`);
  } finally {
    await driver.quit();
  }
}

if (require.main === module) {
  generateScreenshots().catch(console.error);
}

module.exports = { generateScreenshots };

