@echo off
echo ========================================
echo GETAWAYS COMPLETE DOCUMENTATION CONVERTER
echo Converting GETAWAYS_COMPLETE_DOCUMENTATION.md
echo ========================================
echo.

REM Check if pandoc is installed
where pandoc >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Pandoc is not installed!
    echo.
    echo Please install Pandoc from: https://pandoc.org/installing.html
    echo.
    echo After installation, restart this script.
    echo.
    pause
    exit /b 1
)

echo Pandoc found. Starting conversion...
echo.

REM Convert to DOCX
if exist GETAWAYS_COMPLETE_DOCUMENTATION.md (
    echo Converting to DOCX...
    pandoc GETAWAYS_COMPLETE_DOCUMENTATION.md -o GETAWAYS_COMPLETE_DOCUMENTATION.docx --toc --toc-depth=2
    if exist GETAWAYS_COMPLETE_DOCUMENTATION.docx (
        echo [OK] GETAWAYS_COMPLETE_DOCUMENTATION.docx created
    ) else (
        echo [ERROR] Failed to create DOCX file
    )
    echo.
    
    echo Converting to PDF...
    pandoc GETAWAYS_COMPLETE_DOCUMENTATION.md -o GETAWAYS_COMPLETE_DOCUMENTATION.pdf --toc --toc-depth=2 --pdf-engine=wkhtmltopdf
    if exist GETAWAYS_COMPLETE_DOCUMENTATION.pdf (
        echo [OK] GETAWAYS_COMPLETE_DOCUMENTATION.pdf created
    ) else (
        echo [WARNING] PDF conversion failed. Trying alternative method...
        pandoc GETAWAYS_COMPLETE_DOCUMENTATION.md -o GETAWAYS_COMPLETE_DOCUMENTATION.pdf --toc --toc-depth=2
        if exist GETAWAYS_COMPLETE_DOCUMENTATION.pdf (
            echo [OK] GETAWAYS_COMPLETE_DOCUMENTATION.pdf created (using default engine)
        ) else (
            echo [ERROR] PDF conversion failed. Please install wkhtmltopdf or use DOCX file.
        )
    )
    echo.
    
    echo Converting to HTML (can be printed as PDF from browser)...
    pandoc GETAWAYS_COMPLETE_DOCUMENTATION.md -o GETAWAYS_COMPLETE_DOCUMENTATION.html --standalone --toc --toc-depth=2 --css=https://cdn.jsdelivr.net/npm/water.css@2/out/water.css
    if exist GETAWAYS_COMPLETE_DOCUMENTATION.html (
        echo [OK] GETAWAYS_COMPLETE_DOCUMENTATION.html created
    ) else (
        echo [ERROR] Failed to create HTML file
    )
    echo.
) else (
    echo ERROR: GETAWAYS_COMPLETE_DOCUMENTATION.md not found!
    echo Please make sure you're running this script from the project root directory.
    echo.
    pause
    exit /b 1
)

echo ========================================
echo Conversion complete!
echo ========================================
echo.
echo Files created:
if exist GETAWAYS_COMPLETE_DOCUMENTATION.docx echo   - GETAWAYS_COMPLETE_DOCUMENTATION.docx
if exist GETAWAYS_COMPLETE_DOCUMENTATION.pdf echo   - GETAWAYS_COMPLETE_DOCUMENTATION.pdf
if exist GETAWAYS_COMPLETE_DOCUMENTATION.html echo   - GETAWAYS_COMPLETE_DOCUMENTATION.html
echo.
echo You can now:
echo   - Open DOCX file in Microsoft Word
echo   - Open PDF file in any PDF reader
echo   - Open HTML file in browser and print as PDF (Ctrl+P)
echo.
pause

