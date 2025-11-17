@echo off
echo ========================================
echo OPENING SELENIUM IDE FOR SCREENSHOTS
echo ========================================
echo.
echo This script will help you open Selenium IDE in Microsoft Edge.
echo.
echo STEP 1: Make sure Selenium IDE extension is installed in Microsoft Edge
echo         If not installed, go to: edge://extensions
echo         Then search for "Selenium IDE" in Microsoft Edge Add-ons store
echo.
echo STEP 2: The script will open Edge and the .side file location
echo.
pause

REM Open Microsoft Edge with Selenium IDE
start msedge "https://www.selenium.dev/selenium-ide/"

REM Wait a bit
timeout /t 3

REM Open the .side file location in File Explorer
start explorer "%~dp0"

echo.
echo ========================================
echo MANUAL STEPS FOR MICROSOFT EDGE:
echo ========================================
echo 1. In Microsoft Edge, click the Selenium IDE extension icon in the toolbar
echo    (If you don't see it, click the puzzle piece icon ^> Manage extensions)
echo.
echo 2. In Selenium IDE, click "Open an existing project"
echo.
echo 3. Navigate to the tests folder (opened in File Explorer)
echo.
echo 4. Select "getaways-test-suite.side"
echo.
echo 5. Click Open
echo.
echo 6. Switch to Light Mode (if needed):
echo    - Look for a theme toggle button (usually moon/sun icon)
echo    - Or go to Settings ^> Theme ^> Light
echo.
echo 7. Click on each test case in the left sidebar to view it
echo.
echo 8. Take screenshots:
echo    - Press Win+Shift+S for Windows Snipping Tool
echo    - Or press Print Screen and paste into Paint
echo    - Save each screenshot with the test case name
echo.
echo 9. Save screenshots in: test-results\selenium-ide-real-screenshots\
echo.
echo The .side file is located at:
echo %~dp0getaways-test-suite.side
echo.
echo ========================================
echo QUICK ACCESS:
echo ========================================
echo - Edge Extensions: edge://extensions
echo - Selenium IDE Website: https://www.selenium.dev/selenium-ide/
echo.
pause

