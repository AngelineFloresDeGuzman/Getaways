@echo off
REM Firebase Storage CORS Setup Script for Windows
REM This script configures CORS for Firebase Storage to allow photo uploads from localhost

echo Setting up CORS for Firebase Storage...

REM Check if gsutil is installed
where gsutil >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ gsutil is not installed.
    echo Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
    pause
    exit /b 1
)

REM Set CORS configuration
echo Applying CORS configuration...
gsutil cors set cors.json gs://getaways-official.appspot.com

if %ERRORLEVEL% EQU 0 (
    echo ✅ CORS configuration applied successfully!
    echo You can now upload photos from http://localhost:5173
) else (
    echo ❌ Failed to apply CORS configuration
    echo Make sure you're authenticated with: gcloud auth login
    pause
    exit /b 1
)

pause

