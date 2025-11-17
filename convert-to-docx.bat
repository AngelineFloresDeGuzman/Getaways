@echo off
echo ========================================
echo GETAWAYS DOCUMENTATION CONVERTER
echo Converting all markdown files to DOCX...
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

echo Pandoc found. Starting conversion...
echo.

REM Convert each markdown file to DOCX
if exist USER_MANUAL.md (
    echo Converting USER_MANUAL.md...
    pandoc USER_MANUAL.md -o USER_MANUAL.docx
    if exist USER_MANUAL.docx (
        echo [OK] USER_MANUAL.docx created
    ) else (
        echo [ERROR] Failed to create USER_MANUAL.docx
    )
    echo.
)

if exist TECHNICAL_DOCUMENTATION.md (
    echo Converting TECHNICAL_DOCUMENTATION.md...
    pandoc TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOCUMENTATION.docx
    if exist TECHNICAL_DOCUMENTATION.docx (
        echo [OK] TECHNICAL_DOCUMENTATION.docx created
    ) else (
        echo [ERROR] Failed to create TECHNICAL_DOCUMENTATION.docx
    )
    echo.
)

if exist INSTALLATION_GUIDE.md (
    echo Converting INSTALLATION_GUIDE.md...
    pandoc INSTALLATION_GUIDE.md -o INSTALLATION_GUIDE.docx
    if exist INSTALLATION_GUIDE.docx (
        echo [OK] INSTALLATION_GUIDE.docx created
    ) else (
        echo [ERROR] Failed to create INSTALLATION_GUIDE.docx
    )
    echo.
)

if exist FEATURE_DOCUMENTATION.md (
    echo Converting FEATURE_DOCUMENTATION.md...
    pandoc FEATURE_DOCUMENTATION.md -o FEATURE_DOCUMENTATION.docx
    if exist FEATURE_DOCUMENTATION.docx (
        echo [OK] FEATURE_DOCUMENTATION.docx created
    ) else (
        echo [ERROR] Failed to create FEATURE_DOCUMENTATION.docx
    )
    echo.
)

if exist QUICK_REFERENCE.md (
    echo Converting QUICK_REFERENCE.md...
    pandoc QUICK_REFERENCE.md -o QUICK_REFERENCE.docx
    if exist QUICK_REFERENCE.docx (
        echo [OK] QUICK_REFERENCE.docx created
    ) else (
        echo [ERROR] Failed to create QUICK_REFERENCE.docx
    )
    echo.
)

if exist DOCUMENTATION_INDEX.md (
    echo Converting DOCUMENTATION_INDEX.md...
    pandoc DOCUMENTATION_INDEX.md -o DOCUMENTATION_INDEX.docx
    if exist DOCUMENTATION_INDEX.docx (
        echo [OK] DOCUMENTATION_INDEX.docx created
    ) else (
        echo [ERROR] Failed to create DOCUMENTATION_INDEX.docx
    )
    echo.
)

echo ========================================
echo Conversion complete!
echo ========================================
echo.
echo DOCX files created in current directory.
echo You can now open them in Microsoft Word and print.
echo.
pause

