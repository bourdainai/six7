#!/bin/bash

# Simple runner script for Japanese card restoration
# Run this from the project root directory

echo "🚀 Starting Japanese TCGdex Card Restoration"
echo "============================================"
echo ""
echo "This will restore all missing Japanese cards from TCGdex."
echo "The process is resumable and tracks progress in the database."
echo ""

# Check if deno is installed
if ! command -v deno &> /dev/null; then
    echo "❌ Error: Deno is not installed"
    echo "Please install Deno: https://deno.land/manual/getting_started/installation"
    exit 1
fi

# Run the restoration script
deno run --allow-net --allow-env scripts/restore-japanese-cards.ts

echo ""
echo "✅ Restoration script finished"
