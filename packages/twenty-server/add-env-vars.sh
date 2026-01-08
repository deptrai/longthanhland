#!/bin/bash
# Add Đại Ngàn Xanh environment variables to .env

ENV_FILE=".env"

# Check if variables already exist
if grep -q "BANKING_WEBHOOK_SECRET" "$ENV_FILE"; then
  echo "BANKING_WEBHOOK_SECRET already exists in .env"
else
  echo "" >> "$ENV_FILE"
  echo "# ———————— Đại Ngàn Xanh Banking Webhook Config ————————" >> "$ENV_FILE"
  echo "# HMAC secret for banking webhook signature verification" >> "$ENV_FILE"
  echo "BANKING_WEBHOOK_SECRET=dev-secret-change-in-production" >> "$ENV_FILE"
  echo "" >> "$ENV_FILE"
  echo "# Default workspace ID for TwentyORM operations" >> "$ENV_FILE"
  echo "DEFAULT_WORKSPACE_ID=3b8e6458-5fc1-4e63-8563-008ccdaa6db" >> "$ENV_FILE"
  echo "✅ Added BANKING_WEBHOOK_SECRET and DEFAULT_WORKSPACE_ID to .env"
fi
