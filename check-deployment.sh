#!/bin/bash
echo "🔍 Checking GitHub Actions deployment status..."
STATUS=$(curl -s https://api.github.com/repos/romanvolkonidov/rv2class-test/actions/runs?per_page=1 | grep -E '"status"|"conclusion"' | head -2)
echo "$STATUS"

if echo "$STATUS" | grep -q '"status": "completed"'; then
  if echo "$STATUS" | grep -q '"conclusion": "success"'; then
    echo "✅ Deployment SUCCESSFUL!"
  else
    echo "❌ Deployment FAILED!"
    echo "Check: https://github.com/romanvolkonidov/rv2class-test/actions"
  fi
else
  echo "⏳ Deployment in progress..."
  echo "Watch: https://github.com/romanvolkonidov/rv2class-test/actions"
fi
