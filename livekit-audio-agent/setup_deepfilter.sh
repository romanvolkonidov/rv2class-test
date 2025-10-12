#!/bin/bash

# DeepFilterNet Audio Agent - Quick Setup Script
# This script sets up everything you need

set -e

echo "🎯 DeepFilterNet Audio Agent Setup"
echo "=================================="
echo ""

# Check Python version
echo "📋 Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}' | cut -d. -f1,2)
REQUIRED_VERSION="3.9"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Python 3.9+ required. You have: $PYTHON_VERSION"
    exit 1
fi
echo "✅ Python $PYTHON_VERSION detected"
echo ""

# Create virtual environment
echo "📦 Creating virtual environment..."
if [ ! -d "venv-deepfilter" ]; then
    python3 -m venv venv-deepfilter
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi
echo ""

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv-deepfilter/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1

# Check for GPU
echo "🎮 Checking for GPU support..."
if command -v nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA GPU detected!"
    echo "   Installing CUDA-enabled PyTorch (10x faster processing)..."
    pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
    GPU_AVAILABLE=true
else
    echo "ℹ️  No GPU detected (CPU mode is fine, just slower)"
    GPU_AVAILABLE=false
fi
echo ""

# Install requirements
echo "📥 Installing Python dependencies..."
pip install -r requirements_deepfilter.txt

echo ""
echo "🤖 Downloading DeepFilterNet model..."
python3 -c "from df.enhance import init_df; init_df()" 2>/dev/null || echo "Model will download on first run"

echo ""
echo "✅ Installation complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📝 Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating template..."
    cat > .env << 'EOF'
# LiveKit Server Configuration
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=your_api_key_here
LIVEKIT_API_SECRET=your_api_secret_here

# Agent Settings
AGENT_IDENTITY=deepfilter-agent

# Noise Suppression Settings
POST_GAIN=1.0              # Volume adjustment (1.0 = no change)
ATTENUATION_LIMIT=100      # Noise suppression (60-120 dB, higher = more aggressive)

# Optional: Specify rooms to join (comma-separated)
# LIVEKIT_ROOMS=room1,room2,room3
EOF
    echo "✅ Created .env template"
    echo ""
    echo "🔧 Please edit .env and add your LiveKit credentials:"
    echo "   - LIVEKIT_URL"
    echo "   - LIVEKIT_API_KEY"
    echo "   - LIVEKIT_API_SECRET"
    echo ""
else
    echo "✅ .env file found"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Next Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Configure .env with your LiveKit credentials"
echo "2. Run the agent:"
echo ""
echo "   source venv-deepfilter/bin/activate"
echo "   python deepfilter_agent.py"
echo ""
echo "3. The agent will:"
echo "   • Join rooms automatically"
echo "   • Process all audio with DeepFilterNet"
echo "   • Publish ultra-clean audio tracks"
echo ""

if [ "$GPU_AVAILABLE" = true ]; then
    echo "💨 GPU acceleration enabled! Processing will be ~10x faster"
else
    echo "ℹ️  Running on CPU (works great, just a bit slower)"
    echo "   For 10x speedup, install NVIDIA CUDA drivers"
fi

echo ""
echo "📖 For more details, see DEEPFILTER_SETUP.md"
echo ""
echo "🎉 Enjoy crystal-clear audio with silent backgrounds!"
