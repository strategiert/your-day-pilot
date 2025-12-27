#!/bin/bash
# Deploy all Supabase Edge Functions
# Usage: ./scripts/deploy-functions.sh [function-name]
# Without arguments: deploys all functions
# With argument: deploys only the specified function

set -e

PROJECT_REF="hhlskbavdaapjlkwhcme"

# All available functions
FUNCTIONS=(
  "google-calendar-auth"
  "sync-google-calendar"
  "parse-task"
  "weekly-summary"
)

deploy_function() {
  local func=$1
  echo "🚀 Deploying $func..."
  supabase functions deploy "$func" --no-verify-jwt --project-ref "$PROJECT_REF"
  echo "✅ $func deployed"
}

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI not found. Install it first:"
  echo "   macOS: brew install supabase/tap/supabase"
  echo "   Windows: scoop install supabase"
  echo "   Linux: brew install supabase/tap/supabase"
  exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null 2>&1; then
  echo "❌ Not logged in. Run: supabase login"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Supabase Edge Functions Deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$1" ]; then
  # Deploy single function
  if [[ " ${FUNCTIONS[*]} " =~ " $1 " ]]; then
    deploy_function "$1"
  else
    echo "❌ Unknown function: $1"
    echo "Available functions: ${FUNCTIONS[*]}"
    exit 1
  fi
else
  # Deploy all functions
  echo "Deploying ${#FUNCTIONS[@]} functions..."
  echo ""
  
  for func in "${FUNCTIONS[@]}"; do
    deploy_function "$func"
  done
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
