# Quick CORS Fix for Photo Uploads

## You're seeing CORS errors because Firebase Storage needs CORS configuration.

### Fastest Solution (Windows):

1. Open **Command Prompt** or **PowerShell**
2. Run this command:
   ```cmd
   gsutil cors set cors.json gs://getaways-official.appspot.com
   ```
3. If you see "command not found", install Google Cloud SDK first:
   - Download: https://cloud.google.com/sdk/docs/install
   - Or run: `setup-cors.bat`

### Fastest Solution (Mac/Linux):

1. Open **Terminal**
2. Run:
   ```bash
   gsutil cors set cors.json gs://getaways-official.appspot.com
   ```
3. Or run: `./setup-cors.sh`

### Before Running gsutil:

Make sure you're logged in:
```bash
gcloud auth login
```

### After Running:

1. Refresh your browser (Ctrl+Shift+R / Cmd+Shift+R)
2. Try uploading photos again

The photos should now upload successfully! ✅

