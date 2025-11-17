@echo off
echo ========================================
echo GETAWAYS DOCUMENTATION CONVERTER
echo Converting all markdown files to HTML...
echo (HTML files can be printed from browser)
echo ========================================
echo.

REM Check if pandoc is installed
where pandoc >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Pandoc is not installed!
    echo.
    echo Please install Pandoc from: https://pandoc.org/installing.html
    echo.
    pause
    exit /b 1
)

echo Pandoc found. Starting conversion to HTML...
echo NOTE: HTML files can be opened in browser and printed as PDF
echo.

REM Convert each markdown file to HTML
if exist USER_MANUAL.md (
    echo Converting USER_MANUAL.md to HTML...
    pandoc USER_MANUAL.md -o USER_MANUAL.html --standalone --css=https://cdn.jsdelivr.net/npm/water.css@2/out/water.css
    if exist USER_MANUAL.html (
        echo [OK] USER_MANUAL.html created
    ) else (
        echo [ERROR] Failed to create USER_MANUAL.html
    )
    echo.
)

if exist TECHNICAL_DOCUMENTATION.md (
    echo Converting TECHNICAL_DOCUMENTATION.md to HTML...
    pandoc TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOCUMENTATION.html --standalone --css=https://cdn.jsdelivr.net/npm/water.css@2/out/water.css
    if exist TECHNICAL_DOCUMENTATION.html (
        echo [OK] TECHNICAL_DOCUMENTATION.html created
    ) else (
        echo [ERROR] Failed to create TECHNICAL_DOCUMENTATION.html
    )
    echo.
)

if exist INSTALLATION_GUIDE.md (
    echo Converting INSTALLATION_GUIDE.md to HTML...
    pandoc INSTALLATION_GUIDE.md -o INSTALLATION_GUIDE.html --standalone --css=https://cdn.jsdelivr.net/npm/water.css@2/out/water.css
    if exist INSTALLATION_GUIDE.html (
        echo [OK] INSTALLATION_GUIDE.html created
    ) else (
        echo [ERROR] Failed to create INSTALLATION_GUIDE.html
    )
    echo.
)

if exist FEATURE_DOCUMENTATION.md (
    echo Converting FEATURE_DOCUMENTATION.md to HTML...
    pandoc FEATURE_DOCUMENTATION.md -o FEATURE_DOCUMENTATION.html --standalone --css=https://cdn.jsdelivr.net/npm/water.css@2/out/water.css
    if exist FEATURE_DOCUMENTATION.html (
        echo [OK] FEATURE_DOCUMENTATION.html created
    ) else (
        echo [ERROR] Failed to create FEATURE_DOCUMENTATION.html
    )
    echo.
)

if exist QUICK_REFERENCE.md (
    echo Converting QUICK_REFERENCE.md to HTML...
    pandoc QUICK_REFERENCE.md -o QUICK_REFERENCE.html --standalone --css=https://cdn.jsdelivr.net/npm/water.css@2/out/water.css
    if exist QUICK_REFERENCE.html (
        echo [OK] QUICK_REFERENCE.html created
    ) else (
        echo [ERROR] Failed to create QUICK_REFERENCE.html
    )
    echo.
)

if exist DOCUMENTATION_INDEX.md (
    echo Converting DOCUMENTATION_INDEX.md to HTML...
    pandoc DOCUMENTATION_INDEX.md -o DOCUMENTATION_INDEX.html --standalone --css=https://cdn.jsdelivr.net/npm/water.css@2/out/water.css
    if exist DOCUMENTATION_INDEX.html (
        echo [OK] DOCUMENTATION_INDEX.html created
    ) else (
        echo [ERROR] Failed to create DOCUMENTATION_INDEX.html
    )
    echo.
)

echo ========================================
echo Creating combined HTML...
echo ========================================
echo.

REM Create combined HTML with table of contents
if exist DOCUMENTATION_INDEX.md if exist USER_MANUAL.md if exist FEATURE_DOCUMENTATION.md if exist INSTALLATION_GUIDE.md if exist TECHNICAL_DOCUMENTATION.md if exist QUICK_REFERENCE.md (
    pandoc DOCUMENTATION_INDEX.md USER_MANUAL.md FEATURE_DOCUMENTATION.md INSTALLATION_GUIDE.md TECHNICAL_DOCUMENTATION.md QUICK_REFERENCE.md -o GETAWAYS_COMPLETE_DOCUMENTATION.html --standalone --toc --toc-depth=2 --css=https://cdn.jsdelivr.net/npm/water.css@2/out/water.css
    if exist GETAWAYS_COMPLETE_DOCUMENTATION.html (
        echo [OK] GETAWAYS_COMPLETE_DOCUMENTATION.html created
    ) else (
        echo [ERROR] Failed to create combined HTML
    )
    echo.
)

echo ========================================
echo Conversion complete!
echo ========================================
echo.
echo HTML files created in current directory.
echo.
echo TO PRINT AS PDF:
echo 1. Double-click any HTML file to open in browser
echo 2. Press Ctrl+P (or File -^> Print)
echo 3. Choose "Save as PDF" or "Microsoft Print to PDF"
echo 4. Save and print
echo.
pause

