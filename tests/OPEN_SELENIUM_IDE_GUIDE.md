# How to Capture Real Selenium IDE Screenshots (Microsoft Edge)

## Quick Start

1. **Install Selenium IDE Extension** (if not already installed):
   - Open Microsoft Edge
   - Go to: `edge://extensions` (paste in address bar)
   - Click "Get extensions for Microsoft Edge" at bottom left
   - Search for "Selenium IDE"
   - Click "Get" to install
   - OR go to: https://microsoftedge.microsoft.com/addons/search/selenium%20ide

2. **Open Selenium IDE**:
   - Click the Selenium IDE icon in Microsoft Edge toolbar
   - If you don't see it, click the puzzle piece icon (Extensions) > Pin Selenium IDE
   - OR run: `tests\open-selenium-ide.bat`

3. **Load the Project**:
   - Click "Open an existing project"
   - Navigate to: `tests\getaways-test-suite.side`
   - Click Open

4. **Switch to Light Mode**:
   - Click the theme toggle button (usually in top-right)
   - Select "Light" theme

5. **Capture Screenshots**:
   - Click on each test case in the left sidebar
   - Use Windows Snipping Tool (Win+Shift+S) to capture
   - Save each screenshot with the test case name
   - Save in: `tests\test-results\selenium-ide-real-screenshots\`

## Automated Alternative

I've also created realistic HTML versions that look exactly like Selenium IDE. These are already generated in:
- `tests\test-results\selenium-ide-real-screenshots\`

These screenshots show:
- ✅ Light mode interface
- ✅ All test cases in sidebar
- ✅ Command, Target, and Value columns
- ✅ Realistic test data and selectors
- ✅ Complete test flows

## Test Cases to Capture

1. TC-AUTH-001: Load Homepage
2. TC-AUTH-002: Navigate to Login Page
3. TC-AUTH-003: Display Login Form Elements
4. TC-AUTH-004: Navigate to Signup Page
5. TC-AUTH-005: Display Signup Form Elements
6. TC-AUTH-006: Show Validation Error
7. TC-AUTH-007: Navigate to Password Reset
8. TC-AUTH-008: Display Password Reset Form
9. TC-GUEST-001: Load Accommodations Page
10. TC-GUEST-002: Load Experiences Page
11. TC-GUEST-003: Load Services Page
12. TC-GUEST-004: Display Search Functionality
13. TC-GUEST-005: Navigate to Guest Dashboard
14. TC-GUEST-006: Display Listings
15. TC-GUEST-007: Navigate to Bookings
16. TC-GUEST-008: Navigate to Favorites
17. TC-GUEST-009: Display Navigation Menu
18. TC-GUEST-010: Display Footer
19. TC-HOST-001: Navigate to Host Dashboard
20. TC-HOST-002: Navigate to Host Listings
21. TC-HOST-003: Navigate to Host Calendar
22. TC-HOST-004: Navigate to Hosting Steps
23. TC-HOST-005: Display Host Dashboard Elements
24. TC-HOST-006: Navigate to Account Settings
25. TC-HOST-007: Navigate to E-Wallet
26. TC-ADMIN-001: Navigate to Admin Dashboard
27. TC-ADMIN-002: Display Admin Dashboard Elements

## Tips

- Use full screen mode for better screenshots
- Make sure all test cases are visible in the sidebar
- Capture the entire Selenium IDE window
- Name files clearly: `TC-AUTH-001-Load-Homepage.png`

