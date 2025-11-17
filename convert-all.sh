#!/bin/bash

echo "========================================"
echo "GETAWAYS DOCUMENTATION CONVERTER"
echo "Converting all markdown files to PDF..."
echo "========================================"
echo ""

# Check if pandoc is installed
if ! command -v pandoc &> /dev/null; then
    echo "ERROR: Pandoc is not installed!"
    echo ""
    echo "Please install Pandoc:"
    echo "  macOS: brew install pandoc"
    echo "  Linux: sudo apt-get install pandoc"
    echo "  Windows: https://pandoc.org/installing.html"
    echo ""
    exit 1
fi

echo "Pandoc found. Starting conversion..."
echo ""

# Convert each markdown file to PDF
if [ -f "USER_MANUAL.md" ]; then
    echo "Converting USER_MANUAL.md..."
    pandoc USER_MANUAL.md -o USER_MANUAL.pdf --pdf-engine=wkhtmltopdf 2>/dev/null || pandoc USER_MANUAL.md -o USER_MANUAL.pdf
    if [ -f "USER_MANUAL.pdf" ]; then
        echo "[OK] USER_MANUAL.pdf created"
    else
        echo "[ERROR] Failed to create USER_MANUAL.pdf"
    fi
    echo ""
fi

if [ -f "TECHNICAL_DOCUMENTATION.md" ]; then
    echo "Converting TECHNICAL_DOCUMENTATION.md..."
    pandoc TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOCUMENTATION.pdf --pdf-engine=wkhtmltopdf 2>/dev/null || pandoc TECHNICAL_DOCUMENTATION.md -o TECHNICAL_DOCUMENTATION.pdf
    if [ -f "TECHNICAL_DOCUMENTATION.pdf" ]; then
        echo "[OK] TECHNICAL_DOCUMENTATION.pdf created"
    else
        echo "[ERROR] Failed to create TECHNICAL_DOCUMENTATION.pdf"
    fi
    echo ""
fi

if [ -f "INSTALLATION_GUIDE.md" ]; then
    echo "Converting INSTALLATION_GUIDE.md..."
    pandoc INSTALLATION_GUIDE.md -o INSTALLATION_GUIDE.pdf --pdf-engine=wkhtmltopdf 2>/dev/null || pandoc INSTALLATION_GUIDE.md -o INSTALLATION_GUIDE.pdf
    if [ -f "INSTALLATION_GUIDE.pdf" ]; then
        echo "[OK] INSTALLATION_GUIDE.pdf created"
    else
        echo "[ERROR] Failed to create INSTALLATION_GUIDE.pdf"
    fi
    echo ""
fi

if [ -f "FEATURE_DOCUMENTATION.md" ]; then
    echo "Converting FEATURE_DOCUMENTATION.md..."
    pandoc FEATURE_DOCUMENTATION.md -o FEATURE_DOCUMENTATION.pdf --pdf-engine=wkhtmltopdf 2>/dev/null || pandoc FEATURE_DOCUMENTATION.md -o FEATURE_DOCUMENTATION.pdf
    if [ -f "FEATURE_DOCUMENTATION.pdf" ]; then
        echo "[OK] FEATURE_DOCUMENTATION.pdf created"
    else
        echo "[ERROR] Failed to create FEATURE_DOCUMENTATION.pdf"
    fi
    echo ""
fi

if [ -f "QUICK_REFERENCE.md" ]; then
    echo "Converting QUICK_REFERENCE.md..."
    pandoc QUICK_REFERENCE.md -o QUICK_REFERENCE.pdf --pdf-engine=wkhtmltopdf 2>/dev/null || pandoc QUICK_REFERENCE.md -o QUICK_REFERENCE.pdf
    if [ -f "QUICK_REFERENCE.pdf" ]; then
        echo "[OK] QUICK_REFERENCE.pdf created"
    else
        echo "[ERROR] Failed to create QUICK_REFERENCE.pdf"
    fi
    echo ""
fi

if [ -f "DOCUMENTATION_INDEX.md" ]; then
    echo "Converting DOCUMENTATION_INDEX.md..."
    pandoc DOCUMENTATION_INDEX.md -o DOCUMENTATION_INDEX.pdf --pdf-engine=wkhtmltopdf 2>/dev/null || pandoc DOCUMENTATION_INDEX.md -o DOCUMENTATION_INDEX.pdf
    if [ -f "DOCUMENTATION_INDEX.md" ]; then
        echo "[OK] DOCUMENTATION_INDEX.pdf created"
    else
        echo "[ERROR] Failed to create DOCUMENTATION_INDEX.pdf"
    fi
    echo ""
fi

echo "========================================"
echo "Creating combined PDF..."
echo "========================================"
echo ""

# Create combined PDF with table of contents
if [ -f "DOCUMENTATION_INDEX.md" ] && [ -f "USER_MANUAL.md" ] && [ -f "FEATURE_DOCUMENTATION.md" ] && [ -f "INSTALLATION_GUIDE.md" ] && [ -f "TECHNICAL_DOCUMENTATION.md" ] && [ -f "QUICK_REFERENCE.md" ]; then
    pandoc DOCUMENTATION_INDEX.md USER_MANUAL.md FEATURE_DOCUMENTATION.md INSTALLATION_GUIDE.md TECHNICAL_DOCUMENTATION.md QUICK_REFERENCE.md -o GETAWAYS_COMPLETE_DOCUMENTATION.pdf --toc --toc-depth=2 --pdf-engine=wkhtmltopdf 2>/dev/null || pandoc DOCUMENTATION_INDEX.md USER_MANUAL.md FEATURE_DOCUMENTATION.md INSTALLATION_GUIDE.md TECHNICAL_DOCUMENTATION.md QUICK_REFERENCE.md -o GETAWAYS_COMPLETE_DOCUMENTATION.pdf --toc --toc-depth=2
    if [ -f "GETAWAYS_COMPLETE_DOCUMENTATION.pdf" ]; then
        echo "[OK] GETAWAYS_COMPLETE_DOCUMENTATION.pdf created"
    else
        echo "[ERROR] Failed to create combined PDF"
    fi
    echo ""
fi

echo "========================================"
echo "Conversion complete!"
echo "========================================"
echo ""
echo "PDF files created in current directory."
echo "You can now print them or combine them."
echo ""

