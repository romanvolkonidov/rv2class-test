#!/bin/bash

# Check BBB installation progress on Johannesburg server

echo "Checking BBB installation status on Johannesburg server..."
echo ""

ssh root@139.84.240.149 "if command -v bbb-conf &> /dev/null; then bbb-conf --status; else echo 'BBB not fully installed yet...'; fi"
