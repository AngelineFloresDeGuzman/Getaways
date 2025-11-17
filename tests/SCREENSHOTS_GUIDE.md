# SCREENSHOTS AND TEST EVIDENCE GUIDE

## Screenshot Location

All test execution screenshots are stored in:
```
tests/test-results/screenshots/
```

## Screenshot Naming Convention

Screenshots are named with the following pattern:
- `passed-{test-case-id}-{timestamp}.png` - For passed tests
- `failed-{test-case-id}-{timestamp}.png` - For failed tests

Example:
- `passed-tc-auth-001-1734412800000.png`
- `failed-tc-guest-005-1734412900000.png`

## Screenshot Coverage

Screenshots are automatically captured for:
- ✅ All test cases (passed and failed)
- ✅ Each test execution
- ✅ Final state of each test

## Viewing Screenshots

1. Navigate to `tests/test-results/screenshots/`
2. Open any PNG file to view the screenshot
3. Screenshots show the browser state at the end of each test

## Screenshot Count

After running all tests, you should have approximately **27 screenshots** (one for each test case).

## Selenium IDE File

The `.side` file (Selenium IDE project file) is located at:
```
tests/getaways-test-suite.side
```

### How to Use the .side File

1. **Install Selenium IDE** (Browser Extension):
   - Chrome: https://chrome.google.com/webstore/detail/selenium-ide/mooikfkahbdckldjjndioackbalphokd
   - Firefox: https://addons.mozilla.org/en-US/firefox/addon/selenium-ide/

2. **Open Selenium IDE** in your browser

3. **Import the .side file**:
   - Click "Open an existing project"
   - Select `getaways-test-suite.side`
   - All test cases will be loaded

4. **Run tests in Selenium IDE**:
   - Select a test suite
   - Click "Run all tests"
   - Screenshots will be captured automatically

## Test Evidence Summary

### Files Generated:
1. **HTML Test Report**: `test-results/reports/test-report-*.html`
2. **JSON Test Report**: `test-results/reports/test-report-*.json`
3. **Screenshots**: `test-results/screenshots/*.png`
4. **Selenium IDE File**: `getaways-test-suite.side`

### Evidence of Testing:
- ✅ Screenshots for all 27 test cases
- ✅ Test execution reports (HTML & JSON)
- ✅ Pass rate calculation (88.89%)
- ✅ Selenium IDE project file (.side)

## Quick Access

To view all screenshots:
```bash
cd tests/test-results/screenshots
# Open the directory in File Explorer (Windows)
explorer .
```

To open the latest HTML report:
```bash
cd tests/test-results/reports
# Open the latest HTML file in your browser
```

## Notes

- Screenshots are proof that tests were executed
- Each screenshot shows the final state of the browser after test execution
- Screenshots include the full page, not just visible area
- All screenshots are in PNG format

