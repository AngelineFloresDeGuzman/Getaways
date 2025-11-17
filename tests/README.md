# Getaways Platform - Selenium Test Suite

## Overview

This directory contains the Selenium WebDriver test suite for the Getaways Platform. The tests cover authentication, guest features, host features, and admin features.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Chrome Browser** (for ChromeDriver)
3. **Firefox Browser** (optional, for Firefox tests)

## Installation

1. Navigate to the tests directory:
```bash
cd tests
```

2. Install dependencies:
```bash
npm install
```

3. Install browser drivers (if not automatically installed):
```bash
# ChromeDriver is included in package.json
# For manual installation, download from: https://chromedriver.chromium.org/
```

## Configuration

Edit `config/test-config.js` to configure:
- Application URL (default: http://localhost:5173)
- Browser (chrome, firefox, edge)
- Headless mode
- Test user credentials
- Timeouts
- Screenshot settings

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests by Category
```bash
# Authentication tests only
npm run test:auth

# Guest feature tests only
npm run test:guest

# Host feature tests only
npm run test:host

# Admin feature tests only
npm run test:admin
```

### Run Tests and Generate Report
```bash
npm run test:all
```

## Test Structure

```
tests/
├── config/
│   └── test-config.js          # Test configuration
├── utils/
│   ├── driver-setup.js         # WebDriver setup
│   ├── helpers.js              # Helper functions
│   └── test-reporter.js        # Test report generator
├── auth/
│   └── authentication.test.js  # Authentication tests
├── guest/
│   └── guest-features.test.js  # Guest feature tests
├── host/
│   └── host-features.test.js   # Host feature tests
├── admin/
│   └── admin-features.test.js  # Admin feature tests
└── generate-report.js          # Report generator script
```

## Test Reports

Test reports are generated automatically after test execution in:
- `test-results/reports/` - HTML and JSON reports
- `test-results/screenshots/` - Screenshots of failed tests

### Report Features

- **HTML Report**: Visual test summary with pass/fail status
- **JSON Report**: Machine-readable test results
- **Pass Rate Calculation**: Automatic calculation of test pass rate
- **Screenshots**: Automatic screenshots for failed tests

## Environment Variables

You can set environment variables to override configuration:

```bash
# Set base URL
export BASE_URL=http://localhost:5173

# Set browser
export BROWSER=chrome

# Enable headless mode
export HEADLESS=true

# Set test user credentials
export GUEST_EMAIL=test@example.com
export GUEST_PASSWORD=password123
```

## Test Cases

### Authentication Tests (TC-AUTH-001 to TC-AUTH-008)
- Homepage loading
- Login page navigation
- Login form elements
- Signup page navigation
- Signup form elements
- Form validation
- Password reset

### Guest Feature Tests (TC-GUEST-001 to TC-GUEST-010)
- Accommodations page
- Experiences page
- Services page
- Search functionality
- Guest dashboard
- Listings display
- Bookings page
- Favorites page
- Navigation menu
- Footer

### Host Feature Tests (TC-HOST-001 to TC-HOST-007)
- Host dashboard
- Host listings
- Host calendar
- Hosting steps
- Dashboard elements
- Account settings
- E-wallet

### Admin Feature Tests (TC-ADMIN-001 to TC-ADMIN-002)
- Admin dashboard
- Dashboard elements

## Adding New Tests

1. Create a new test file in the appropriate directory
2. Follow the existing test structure
3. Use helper functions from `utils/helpers.js`
4. Add test results to the reporter

Example:
```javascript
const { describe, it, before, after } = require('mocha');
const { expect } = require('chai');
const driverSetup = require('../utils/driver-setup');
const Helpers = require('../utils/helpers');

describe('My New Test Suite', function() {
  let driver;
  let helpers;

  before(async function() {
    driver = await driverSetup.createDriver();
    helpers = new Helpers(driver);
  });

  after(async function() {
    await driverSetup.quitDriver();
  });

  it('TC-NEW-001: Should test something', async function() {
    await helpers.navigateTo('/');
    // Your test code here
    expect(true).to.be.true;
  });
});
```

## Troubleshooting

### Tests fail with "ChromeDriver not found"
- Ensure ChromeDriver is installed: `npm install chromedriver`
- Check Chrome browser version matches ChromeDriver version

### Tests timeout
- Increase timeout in `test-config.js`
- Check if application is running
- Verify network connectivity

### Screenshots not generated
- Check `test-results/screenshots/` directory exists
- Verify screenshot settings in `test-config.js`

## Continuous Integration

To run tests in CI/CD:

```bash
# Install dependencies
npm install

# Run tests in headless mode
HEADLESS=true npm test

# Generate report
npm run test:report
```

## Test Summary Report

The test summary report includes:
- Total test count
- Passed/Failed/Skipped counts
- Pass rate percentage
- Individual test case results
- Test execution duration
- Error details for failed tests

The report is generated in HTML format and can be opened in any web browser.

## Notes

- Tests are designed to be independent and can run in any order
- Some tests may require the application to be running
- Authentication tests may require valid test user accounts
- Screenshots are automatically captured for failed tests

