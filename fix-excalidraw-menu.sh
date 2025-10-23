#!/bin/bash

###############################################################################
# Excalidraw Fix Menu
###############################################################################

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}        ${PURPLE}Excalidraw Loading Error - Fix Options${NC}           ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Current Issue:${NC}"
echo "  - Excalidraw trying to load from unpkg.com CDN"
echo "  - MIME type mismatch errors (text/plain vs application/javascript)"
echo "  - ChunkLoadError: Loading chunk 4736 failed"
echo "  - Missing favicon.ico (404 error)"
echo ""
echo -e "${GREEN}Available Fixes:${NC}"
echo ""
echo -e "${CYAN}Option 1:${NC} ${YELLOW}QUICK FIX${NC} - Disable Whiteboard Feature (Recommended)"
echo "  ├─ Disables the whiteboard/Excalidraw feature"
echo "  ├─ Prevents all Excalidraw loading errors immediately"
echo "  ├─ Takes ~10 seconds"
echo "  └─ Can be re-enabled later"
echo ""
echo -e "${CYAN}Option 2:${NC} ${BLUE}FULL FIX${NC} - Rebuild with Local Excalidraw Assets"
echo "  ├─ Modifies Excalidraw to use local paths instead of CDN"
echo "  ├─ Rebuilds entire Jitsi Meet frontend (10-15 minutes)"
echo "  ├─ Keeps whiteboard feature fully functional"
echo "  └─ More complex, but proper long-term solution"
echo ""
echo -e "${CYAN}Option 3:${NC} ${GREEN}TEST ONLY${NC} - Check Current Status"
echo "  ├─ Tests if nginx rewrite rules are working"
echo "  ├─ Checks favicon and asset availability"
echo "  └─ No changes made"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
read -p "Choose an option (1/2/3) or Q to quit: " choice

case $choice in
    1)
        echo ""
        echo -e "${YELLOW}Applying Quick Fix - Disabling Whiteboard...${NC}"
        echo ""
        chmod +x ./disable-whiteboard.sh
        ./disable-whiteboard.sh
        ;;
    2)
        echo ""
        echo -e "${BLUE}Applying Full Fix - Rebuilding with Local Assets...${NC}"
        echo ""
        read -p "This will take 10-15 minutes. Continue? (y/N): " confirm
        if [[ $confirm == [yY] ]]; then
            chmod +x ./rebuild-with-local-excalidraw.sh
            ./rebuild-with-local-excalidraw.sh
        else
            echo "Cancelled."
        fi
        ;;
    3)
        echo ""
        echo -e "${GREEN}Testing Current Status...${NC}"
        echo ""
        echo "1. Main page:"
        curl -s -I https://app.rv2class.com/ | grep "HTTP"
        echo ""
        echo "2. Excalidraw vendor file (local):"
        curl -s -I https://app.rv2class.com/libs/excalidraw-assets/vendor-75e22c20f1d603abdfc9.js | grep -E "HTTP|Content-Type"
        echo ""
        echo "3. Favicon:"
        curl -s -I https://app.rv2class.com/favicon.ico | grep "HTTP"
        echo ""
        echo "4. Config file:"
        curl -s -I https://app.rv2class.com/config.js | grep -E "HTTP|Content-Type"
        echo ""
        ;;
    [qQ])
        echo "Exiting."
        exit 0
        ;;
    *)
        echo -e "${RED}Invalid option${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}                     Complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Next steps:"
echo "  1. Clear browser cache (Ctrl+Shift+Delete)"
echo "  2. Hard reload (Ctrl+Shift+R)"
echo "  3. Test at: https://app.rv2class.com"
echo ""

