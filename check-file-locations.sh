#!/bin/bash
# 
# ⚠️ WARNING: File Location Checker
# Run this before making any changes to ensure you're editing the right files
#

echo "======================================"
echo "RV2Class-Test File Location Checker"
echo "======================================"
echo ""

CORRECT_PATH="/jitsi-custom/jitsi-meet/"
WRONG_PATH="/jitsi-custom/*.html"

echo "✅ CORRECT locations for app files:"
echo "   - HTML pages: $CORRECT_PATH/static/"
echo "   - React components: $CORRECT_PATH/react/features/"
echo ""

echo "❌ WRONG locations (DO NOT create files here):"
echo "   - /jitsi-custom/*.html (root level)"
echo ""

# Check for files in wrong location
if ls jitsi-custom/*.html 2>/dev/null | grep -q .; then
    echo "⚠️  WARNING: Found HTML files in wrong location!"
    echo "   Files found:"
    ls -1 jitsi-custom/*.html 2>/dev/null | sed 's/^/   - /'
    echo ""
    echo "   These should be in: jitsi-custom/jitsi-meet/static/"
    echo ""
    exit 1
else
    echo "✅ No files in wrong location. Structure looks good!"
fi

echo ""
echo "Quick stats:"
echo "   HTML pages in static/: $(ls -1 jitsi-custom/jitsi-meet/static/*.html 2>/dev/null | wc -l)"
echo "   React components: $(find jitsi-custom/jitsi-meet/react/features -name "*.tsx" 2>/dev/null | wc -l)"
echo ""
echo "======================================"
