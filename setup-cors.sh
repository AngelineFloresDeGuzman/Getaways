#!/bin/bash

# Firebase Storage CORS Setup Script
# This script configures CORS for Firebase Storage to allow photo uploads from localhost

echo "Setting up CORS for Firebase Storage..."

# Check if gsutil is installed
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil is not installed."
    echo "Please install Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set CORS configuration
echo "Applying CORS configuration..."
gsutil cors set cors.json gs://getaways-official.appspot.com

if [ $? -eq 0 ]; then
    echo "✅ CORS configuration applied successfully!"
    echo "You can now upload photos from http://localhost:5173"
else
    echo "❌ Failed to apply CORS configuration"
    echo "Make sure you're authenticated with: gcloud auth login"
    exit 1
fi

