# Selenium IDE Screenshots - Test Cases Documentation

## Overview

This directory contains screenshots of all test cases displayed in a Selenium IDE-like interface, showing the **Command**, **Target**, and **Value** columns for each test case.

## Location

All screenshots are stored in:
```
tests/test-results/selenium-ide-screenshots/
```

## Screenshot Details

- **Total Screenshots:** 27 test cases
- **Total Size:** ~0.75 MB
- **Format:** PNG (1920x1080 resolution)
- **Style:** Selenium IDE dark theme interface

## Test Cases Included

### Authentication Tests (8 screenshots)
1. `TC-AUTH-001- Should load homepage successfully.png`
2. `TC-AUTH-002- Should navigate to login page.png`
3. `TC-AUTH-003- Should display login form elements.png`
4. `TC-AUTH-004- Should navigate to signup page.png`
5. `TC-AUTH-005- Should display signup form elements.png`
6. `TC-AUTH-006- Should show validation error for empty login form.png`
7. `TC-AUTH-007- Should navigate to password reset page.png`
8. `TC-AUTH-008- Should display password reset form.png`

### Guest Features Tests (10 screenshots)
1. `TC-GUEST-001- Should load accommodations page.png`
2. `TC-GUEST-002- Should load experiences page.png`
3. `TC-GUEST-003- Should load services page.png`
4. `TC-GUEST-004- Should display search functionality on homepage.png`
5. `TC-GUEST-005- Should navigate to guest dashboard after login.png`
6. `TC-GUEST-006- Should display listings on accommodations page.png`
7. `TC-GUEST-007- Should navigate to bookings page.png`
8. `TC-GUEST-008- Should navigate to favorites page.png`
9. `TC-GUEST-009- Should display navigation menu.png`
10. `TC-GUEST-010- Should display footer.png`

### Host Features Tests (7 screenshots)
1. `TC-HOST-001- Should navigate to host dashboard.png`
2. `TC-HOST-002- Should navigate to host listings page.png`
3. `TC-HOST-003- Should navigate to host calendar page.png`
4. `TC-HOST-004- Should navigate to hosting steps page.png`
5. `TC-HOST-005- Should display host dashboard elements.png`
6. `TC-HOST-006- Should navigate to account settings.png`
7. `TC-HOST-007- Should navigate to e-wallet page.png`

### Admin Features Tests (2 screenshots)
1. `TC-ADMIN-001- Should navigate to admin dashboard.png`
2. `TC-ADMIN-002- Should display admin dashboard elements.png`

## Screenshot Format

Each screenshot shows:
- **Left Sidebar:** Project name and test case name
- **Main Panel:** 
  - Toolbar with play buttons and URL bar
  - Test script table with columns:
    - **#**: Step number
    - **Command**: Selenium command (open, click, type, assertElementPresent, etc.)
    - **Target**: CSS selector, URL, or element locator
    - **Value**: Input value or assertion value

## Commands Extracted

The screenshots include the following types of commands:

- **open**: Navigate to a URL
- **waitForPageLoad**: Wait for page to fully load
- **wait**: Sleep/delay command
- **click**: Click on an element
- **type**: Type text into an input field
- **assertElementPresent**: Verify element exists
- **assertUrl**: Verify current URL
- **assertTitle**: Verify page title

## How to Regenerate Screenshots

To regenerate all screenshots, run:

```bash
cd tests
npm run screenshot:ide
```

Or directly:

```bash
cd tests
node generate-selenium-ide-screenshots.js
```

## HTML Files

The script also generates HTML files for each test case in the same directory. These can be opened in a browser to view the Selenium IDE-like interface directly:

- `test-1.html` through `test-27.html`

## Notes

- Screenshots are automatically generated from the test files in `tests/auth/`, `tests/guest/`, `tests/host/`, and `tests/admin/`
- The parser extracts commands, targets, and values from the actual test code
- The interface is styled to match Selenium IDE's dark theme
- All screenshots are in PNG format and can be opened with any image viewer

---

**Generated:** November 17, 2025  
**Script:** `generate-selenium-ide-screenshots.js`  
**Total Test Cases:** 27

