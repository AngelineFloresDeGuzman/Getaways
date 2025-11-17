# CONVERTING DOCUMENTATION TO PRINTABLE FORMAT

## Quick Conversion Guide

Your documentation files are in Markdown (.md) format. To print them, you need to convert them to PDF or DOCX format.

---

## Method 1: Using Pandoc (Recommended)

### Installation

#### Windows:
1. Download Pandoc from: https://pandoc.org/installing.html
2. Install the Windows installer
3. Verify installation:
   ```bash
   pandoc --version
   ```

#### macOS:
```bash
brew install pandoc
```

#### Linux:
```bash
sudo apt-get install pandoc
```

### Convert to PDF

#### Single File:
```bash
pandoc USER_MANUAL.md -o USER_MANUAL.pdf --pdf-engine=wkhtmltopdf
```

#### All Files at Once:
```bash
# Convert all markdown files to PDF
pandoc USER_MANUAL.md -o USER_MANUAL.pdf
pandoc TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOCUMENTATION.pdf
pandoc INSTALLATION_GUIDE.md -o INSTALLATION_GUIDE.pdf
pandoc FEATURE_DOCUMENTATION.md -o FEATURE_DOCUMENTATION.pdf
pandoc QUICK_REFERENCE.md -o QUICK_REFERENCE.pdf
pandoc DOCUMENTATION_INDEX.md -o DOCUMENTATION_INDEX.pdf
```

### Convert to DOCX

#### Single File:
```bash
pandoc USER_MANUAL.md -o USER_MANUAL.docx
```

#### All Files at Once:
```bash
pandoc USER_MANUAL.md -o USER_MANUAL.docx
pandoc TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOCUMENTATION.docx
pandoc INSTALLATION_GUIDE.md -o INSTALLATION_GUIDE.docx
pandoc FEATURE_DOCUMENTATION.md -o FEATURE_DOCUMENTATION.docx
pandoc QUICK_REFERENCE.md -o QUICK_REFERENCE.docx
pandoc DOCUMENTATION_INDEX.md -o DOCUMENTATION_INDEX.docx
```

### Combine All Files into One PDF

```bash
pandoc USER_MANUAL.md TECHNICAL_DOCUMENTATION.md INSTALLATION_GUIDE.md FEATURE_DOCUMENTATION.md QUICK_REFERENCE.md DOCUMENTATION_INDEX.md -o GETAWAYS_COMPLETE_DOCUMENTATION.pdf
```

---

## Method 2: Using Online Converters

### Recommended Online Tools:

1. **Markdown to PDF**
   - https://www.markdowntopdf.com/
   - Upload .md file
   - Download PDF

2. **Dillinger**
   - https://dillinger.io/
   - Paste markdown content
   - Export as PDF

3. **Markdown to DOCX**
   - https://cloudconvert.com/md-to-docx
   - Upload .md file
   - Convert to DOCX
   - Download

4. **Pandoc Try**
   - https://pandoc.org/try/
   - Paste markdown
   - Select output format
   - Download

### Steps for Online Conversion:
1. Open the markdown file in a text editor
2. Copy all content
3. Go to online converter
4. Paste content
5. Convert to PDF or DOCX
6. Download the file

---

## Method 3: Using VS Code Extensions

### Install Extension:
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Markdown PDF" by yzane
4. Install the extension

### Convert:
1. Open any .md file
2. Press Ctrl+Shift+P
3. Type "Markdown PDF: Export (pdf)"
4. Select the option
5. PDF will be generated in the same folder

---

## Method 4: Using Microsoft Word

### Steps:
1. Open Microsoft Word
2. Go to File → Open
3. Select the .md file
4. Word will convert it automatically
5. Review and format if needed
6. Save as DOCX or Export as PDF

---

## Method 5: Using Google Docs

### Steps:
1. Open Google Docs
2. Go to File → Import
3. Upload the .md file
4. Google Docs will convert it
5. Review and format
6. Download as PDF or DOCX

---

## Recommended Print Settings

### For PDF:
- **Page Size**: A4 or Letter
- **Margins**: 1 inch (2.5 cm) all sides
- **Font**: 11-12pt for body text
- **Line Spacing**: 1.5
- **Headers/Footers**: Include page numbers

### For DOCX:
- Same settings as PDF
- Can be customized in Word before printing

---

## Batch Conversion Script

Save this as `convert-all.bat` (Windows) or `convert-all.sh` (Mac/Linux):

### Windows (convert-all.bat):
```batch
@echo off
echo Converting all markdown files to PDF...

pandoc USER_MANUAL.md -o USER_MANUAL.pdf
pandoc TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOCUMENTATION.pdf
pandoc INSTALLATION_GUIDE.md -o INSTALLATION_GUIDE.pdf
pandoc FEATURE_DOCUMENTATION.md -o FEATURE_DOCUMENTATION.pdf
pandoc QUICK_REFERENCE.md -o QUICK_REFERENCE.pdf
pandoc DOCUMENTATION_INDEX.md -o DOCUMENTATION_INDEX.pdf

echo Conversion complete!
pause
```

### Mac/Linux (convert-all.sh):
```bash
#!/bin/bash
echo "Converting all markdown files to PDF..."

pandoc USER_MANUAL.md -o USER_MANUAL.pdf
pandoc TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOCUMENTATION.pdf
pandoc INSTALLATION_GUIDE.md -o INSTALLATION_GUIDE.pdf
pandoc FEATURE_DOCUMENTATION.md -o FEATURE_DOCUMENTATION.pdf
pandoc QUICK_REFERENCE.md -o QUICK_REFERENCE.pdf
pandoc DOCUMENTATION_INDEX.md -o DOCUMENTATION_INDEX.pdf

echo "Conversion complete!"
```

Make it executable (Mac/Linux):
```bash
chmod +x convert-all.sh
./convert-all.sh
```

---

## Combining All Documents

### Create Complete Documentation PDF:

```bash
pandoc DOCUMENTATION_INDEX.md USER_MANUAL.md FEATURE_DOCUMENTATION.md INSTALLATION_GUIDE.md TECHNICAL_DOCUMENTATION.md QUICK_REFERENCE.md -o GETAWAYS_COMPLETE_DOCUMENTATION.pdf --toc --toc-depth=2
```

This creates a single PDF with:
- Table of Contents
- All documents combined
- Proper page numbering

---

## Troubleshooting

### Pandoc Not Found:
- Make sure Pandoc is installed
- Add Pandoc to system PATH
- Restart terminal/command prompt

### PDF Engine Error:
- Install wkhtmltopdf or use default PDF engine
- For Windows: Download from https://wkhtmltopdf.org/downloads.html

### Formatting Issues:
- Check markdown syntax
- Use proper headings (# ## ###)
- Ensure proper line breaks

---

## Quick Start (Easiest Method)

1. **Install Pandoc**: https://pandoc.org/installing.html
2. **Open Command Prompt/Terminal** in project folder
3. **Run conversion commands** (see Method 1 above)
4. **Print the PDF files**

---

**Note**: If you don't want to install anything, use Method 2 (Online Converters) - it's the easiest but requires manual conversion of each file.

