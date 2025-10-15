#!/bin/bash

# Use Python to properly fix the config file
ssh root@jitsi.rv2class.com 'python3 << EOF
import re
from datetime import datetime

config_file = "/etc/jitsi/meet/jitsi.rv2class.com-config.js"

# Backup
backup_file = f"{config_file}.backup.{datetime.now().strftime(\"%Y%m%d_%H%M%S\")}"
with open(config_file, "r") as f:
    content = f.read()
with open(backup_file, "w") as f:
    f.write(content)

# Fix the websocket URL - remove any newlines within the URL string
# Match websocket: followed by quoted text that might have newlines
content = re.sub(
    r"websocket:\s*['\'']\s*wss://jitsi\.rv2class\.com/xmpp-websocket\s*\n\s*['\'']\s*,",
    "websocket: '\''wss://jitsi.rv2class.com/xmpp-websocket'\'',",
    content
)

with open(config_file, "w") as f:
    f.write(content)

print("✓ Config fixed")
EOF
'

# Restart services
ssh root@jitsi.rv2class.com 'systemctl restart prosody && systemctl restart jicofo && systemctl restart jitsi-videobridge2 && systemctl restart nginx && echo "✓ Services restarted"'
