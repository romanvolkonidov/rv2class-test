#!/bin/bash
# Quick Audio Monitoring Script
# Shows real-time status of audio processing

echo "═══════════════════════════════════════════════════════════════════"
echo "  LiveKit Audio Processing Monitor"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Check if agent is running
echo "1. Agent Status:"
if ps aux | grep -v grep | grep deepfilter_agent.py > /dev/null; then
    echo "   ✅ DeepFilter agent is RUNNING"
    ps aux | grep -v grep | grep deepfilter_agent.py | awk '{print "      PID:", $2, "CPU:", $3"%", "MEM:", $4"%"}'
else
    echo "   ❌ DeepFilter agent is NOT running"
    echo "      Start with: ./start_agent.sh"
fi

echo ""
echo "2. Recent Audio Processing Activity (last 10 events):"
echo "   ───────────────────────────────────────────────────────────────"
if [ -f agent.log ]; then
    tail -200 agent.log | grep -E "(Publishing|Subscribed|audio level|Connected to room)" | tail -10 | sed 's/^/   /'
else
    echo "   ⚠️  No agent.log file found"
fi

echo ""
echo "3. Recent Errors (last 5):"
echo "   ───────────────────────────────────────────────────────────────"
if [ -f agent.log ]; then
    ERROR_COUNT=$(tail -200 agent.log | grep -i error | grep -v "Unclosed" | wc -l)
    if [ $ERROR_COUNT -gt 0 ]; then
        tail -200 agent.log | grep -i error | grep -v "Unclosed" | tail -5 | sed 's/^/   /'
    else
        echo "   ✅ No errors in recent logs"
    fi
else
    echo "   ⚠️  No agent.log file found"
fi

echo ""
echo "4. Active Rooms & Audio Routing:"
echo "   ───────────────────────────────────────────────────────────────"
if [ -d "venv-deepfilter" ]; then
    source venv-deepfilter/bin/activate 2>/dev/null
    python check_audio_routing.py 2>/dev/null | grep -A 50 "Audio Routing Analysis" | head -20 | sed 's/^/   /'
    deactivate 2>/dev/null
else
    echo "   ⚠️  Virtual environment not found"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  Quick Commands:"
echo "═══════════════════════════════════════════════════════════════════"
echo "  • Watch logs live:    tail -f agent.log | grep deepfiltered"
echo "  • Check all rooms:    python check_audio_routing.py"
echo "  • Check room:         python check_audio_routing.py <room-name>"
echo "  • Start agent:        ./start_agent.sh"
echo "  • Stop agent:         pkill -f deepfilter_agent.py"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
