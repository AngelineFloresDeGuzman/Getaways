# Real Screenshots with Microsoft Edge

This guide explains how to capture real screenshots of the Getaways application using Microsoft Edge WebDriver with actual admin credentials.

## Screenshot Location

**Directory**: `tests/test-results/selenium-ide-real-screenshots/`

All screenshots captured using real data are stored in this directory.

## Current Screenshots

The following screenshots are currently available in the `selenium-ide-real-screenshots` directory:

- `TC-ADMIN-001- Navigate to Admin Dashboard.png`
- `TC-AUTH-001- Load Homepage.png`
- `TC-AUTH-002- Navigate to Login Page.png`
- `TC-AUTH-003- Display Login Form Elements.png`
- `TC-AUTH-004- Navigate to Signup Page.png`
- `TC-GUEST-001- Load Accommodations Page.png`
- `TC-GUEST-002- Load Experiences Page.png`
- `TC-GUEST-003- Load Services Page.png`
- `TC-HOST-001- Navigate to Host Dashboard.png`
- `TC-HOST-002- Navigate to Host Listings.png`

## Generate New Screenshots

### Prerequisites

1. **Microsoft Edge** must be installed on your system
2. **Node.js** and npm must be installed
3. Install dependencies:
   ```bash
   cd tests
   npm install
   ```

### Admin Credentials

The script uses the following admin credentials:
- **Email**: `admin@getaways.com`
- **Password**: `asdf1234!`

### Running the Script

To capture new screenshots using Microsoft Edge with real data:

```bash
cd tests
npm run screenshot:edge
```

Or directly:

```bash
cd tests
node capture-real-edge-screenshots.js
```

### What the Script Does

1. **Initializes Edge WebDriver** (falls back to Chrome if Edge is not available)
2. **Logs in as admin** using the credentials above
3. **Executes each test case** from `getaways-test-suite.side`
4. **Captures screenshots** of the actual application pages
5. **Saves screenshots** to `test-results/selenium-ide-real-screenshots/`

### Test Cases Covered

The script captures screenshots for all test cases defined in `getaways-test-suite.side`:

#### Authentication Tests
- TC-AUTH-001: Load Homepage
- TC-AUTH-002: Navigate to Login Page
- TC-AUTH-003: Display Login Form Elements
- TC-AUTH-004: Navigate to Signup Page

#### Guest Features Tests
- TC-GUEST-001: Load Accommodations Page
- TC-GUEST-002: Load Experiences Page
- TC-GUEST-003: Load Services Page

#### Host Features Tests
- TC-HOST-001: Navigate to Host Dashboard
- TC-HOST-002: Navigate to Host Listings

#### Admin Features Tests
- TC-ADMIN-001: Navigate to Admin Dashboard

### Screenshot Format

- **Format**: PNG
- **Resolution**: 1920x1080
- **Naming**: `{Test-Case-Name}.png`
- **Location**: `tests/test-results/selenium-ide-real-screenshots/`

### Troubleshooting

#### Edge Driver Not Found
If Edge driver is not available, the script will automatically fall back to Chrome. Make sure you have either:
- Microsoft Edge installed, or
- Google Chrome installed

#### Login Fails
If login fails, check:
1. The admin credentials are correct
2. The application is accessible at `https://getaways-official.firebaseapp.com`
3. Your internet connection is working

#### Screenshots Not Saving
Make sure:
1. The `test-results/selenium-ide-real-screenshots/` directory exists (it will be created automatically)
2. You have write permissions in the tests directory

### Viewing Screenshots

1. Navigate to: `tests/test-results/selenium-ide-real-screenshots/`
2. Open any PNG file with your image viewer
3. Each screenshot shows the actual application state after executing the test

### Notes

- Screenshots are captured using **real data** from the production application
- The script uses **admin credentials** for authenticated pages
- Screenshots show the **actual UI** as it appears in the browser
- The browser window will be visible during capture (not headless by default)

---

**Last Updated**: Generated automatically when script runs  
**Script**: `capture-real-edge-screenshots.js`  
**Application URL**: https://getaways-official.firebaseapp.com

