#!/bin/bash

# DeepFilterNet Agent Startup Script
cd "$(dirname "$0")"

# Load environment variables
set -a
source .env
set +a

# Run the agent
./venv-deepfilter/bin/python deepfilter_agent.py
