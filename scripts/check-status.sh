#!/bin/bash
# Check restore status
VULTR_API_KEY="W274TCO4CIXUDQ2JEXDPZ44BGRZ2M32A2N6A"
TEST_INSTANCE_ID="75baae01-a079-48a9-9f8a-5196c1ad3a5b"

curl -s "https://api.vultr.com/v2/instances/$TEST_INSTANCE_ID" \
    -H "Authorization: Bearer $VULTR_API_KEY" | jq '.instance | {status, power_status, main_ip}'
