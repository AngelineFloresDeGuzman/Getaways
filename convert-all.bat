@echo off
echo ========================================
echo GETAWAYS DOCUMENTATION CONVERTER
echo Converting all markdown files to DOCX...
echo (DOCX can be opened in Word and printed as PDF)
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

echo Pandoc found. Starting conversion to DOCX...
echo NOTE: DOCX files can be opened in Microsoft Word and saved/printed as PDF
echo.

REM Convert each markdown file to DOCX (no PDF engine needed)
if exist USER_MANUAL.md (
    echo Converting USER_MANUAL.md to DOCX...
    pandoc USER_MANUAL.md -o USER_MANUAL.docx
    if exist USER_MANUAL.docx (
        echo [OK] USER_MANUAL.docx created
    ) else (
        echo [ERROR] Failed to create USER_MANUAL.docx
    )
    echo.
)

if exist TECHNICAL_DOCUMENTATION.md (
    echo Converting TECHNICAL_DOCUMENTATION.md to DOCX...
    pandoc TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOCUMENTATION.docx
    if exist TECHNICAL_DOCUMENTATION.docx (
        echo [OK] TECHNICAL_DOCUMENTATION.docx created
    ) else (
        echo [ERROR] Failed to create TECHNICAL_DOCUMENTATION.docx
    )
    echo.
)

if exist INSTALLATION_GUIDE.md (
    echo Converting INSTALLATION_GUIDE.md to DOCX...
    pandoc INSTALLATION_GUIDE.md -o INSTALLATION_GUIDE.docx
    if exist INSTALLATION_GUIDE.docx (
        echo [OK] INSTALLATION_GUIDE.docx created
    ) else (
        echo [ERROR] Failed to create INSTALLATION_GUIDE.docx
    )
    echo.
)

if exist FEATURE_DOCUMENTATION.md (
    echo Converting FEATURE_DOCUMENTATION.md to DOCX...
    pandoc FEATURE_DOCUMENTATION.md -o FEATURE_DOCUMENTATION.docx
    if exist FEATURE_DOCUMENTATION.docx (
        echo [OK] FEATURE_DOCUMENTATION.docx created
    ) else (
        echo [ERROR] Failed to create FEATURE_DOCUMENTATION.docx
    )
    echo.
)

if exist QUICK_REFERENCE.md (
    echo Converting QUICK_REFERENCE.md to DOCX...
    pandoc QUICK_REFERENCE.md -o QUICK_REFERENCE.docx
    if exist QUICK_REFERENCE.docx (
        echo [OK] QUICK_REFERENCE.docx created
    ) else (
        echo [ERROR] Failed to create QUICK_REFERENCE.docx
    )
    echo.
)

if exist DOCUMENTATION_INDEX.md (
    echo Converting DOCUMENTATION_INDEX.md to DOCX...
    pandoc DOCUMENTATION_INDEX.md -o DOCUMENTATION_INDEX.docx
    if exist DOCUMENTATION_INDEX.docx (
        echo [OK] DOCUMENTATION_INDEX.docx created
    ) else (
        echo [ERROR] Failed to create DOCUMENTATION_INDEX.docx
    )
    echo.
)

echo ========================================
echo Creating combined DOCX...
echo ========================================
echo.

REM Create combined DOCX with table of contents
if exist DOCUMENTATION_INDEX.md if exist USER_MANUAL.md if exist FEATURE_DOCUMENTATION.md if exist INSTALLATION_GUIDE.md if exist TECHNICAL_DOCUMENTATION.md if exist QUICK_REFERENCE.md (
    pandoc DOCUMENTATION_INDEX.md USER_MANUAL.md FEATURE_DOCUMENTATION.md INSTALLATION_GUIDE.md TECHNICAL_DOCUMENTATION.md QUICK_REFERENCE.md -o GETAWAYS_COMPLETE_DOCUMENTATION.docx --toc --toc-depth=2
    if exist GETAWAYS_COMPLETE_DOCUMENTATION.docx (
        echo [OK] GETAWAYS_COMPLETE_DOCUMENTATION.docx created
    ) else (
        echo [ERROR] Failed to create combined DOCX
    )
    echo.
)

echo ========================================
echo Conversion complete!
echo ========================================
echo.
echo DOCX files created in current directory.
echo.
echo TO PRINT AS PDF:
echo 1. Open the DOCX files in Microsoft Word
echo 2. Go to File -^> Save As
echo 3. Choose PDF as the file type
echo 4. Save and print
echo.
echo OR:
echo 1. Open DOCX in Word
echo 2. Go to File -^> Print
echo 3. Choose "Microsoft Print to PDF" as printer
echo 4. Save as PDF
echo.
pause

