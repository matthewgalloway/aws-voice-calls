#!/bin/bash

# Start ngrok tunnel for local Telnyx webhook testing
# Prerequisites: ngrok installed and authenticated (ngrok config add-authtoken YOUR_TOKEN)

PORT=${1:-3000}

echo "Starting ngrok tunnel on port $PORT..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "ERROR: ngrok is not installed"
    echo ""
    echo "Install ngrok:"
    echo "  brew install ngrok/ngrok/ngrok  (macOS)"
    echo "  or download from https://ngrok.com/download"
    echo ""
    echo "Then authenticate:"
    echo "  ngrok config add-authtoken YOUR_AUTHTOKEN"
    exit 1
fi

# Start ngrok and extract the public URL
echo "Starting ngrok..."
ngrok http $PORT --log=stdout > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get the public URL from ngrok API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "ERROR: Failed to get ngrok URL. Check if ngrok is running correctly."
    echo "Logs at /tmp/ngrok.log"
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo ""
echo "=========================================="
echo "ngrok tunnel started successfully!"
echo "=========================================="
echo ""
echo "Public URL: $NGROK_URL"
echo ""
echo "Configure these URLs in your Telnyx portal:"
echo ""
echo "  Voice webhook (HTTP POST):"
echo "    $NGROK_URL/api/telnyx/voice"
echo ""
echo "  Status callback (HTTP POST):"
echo "    $NGROK_URL/api/telnyx/status"
echo ""
echo "Add to your .env.local:"
echo "  NGROK_URL=$NGROK_URL"
echo "  APP_URL=$NGROK_URL"
echo ""
echo "ngrok dashboard: http://localhost:4040"
echo ""
echo "Press Ctrl+C to stop the tunnel"
echo ""

# Update .env.local if it exists
if [ -f .env.local ]; then
    # Remove old NGROK_URL and APP_URL lines
    grep -v "^NGROK_URL=" .env.local | grep -v "^APP_URL=" > .env.local.tmp
    mv .env.local.tmp .env.local
fi

# Append new URLs
echo "NGROK_URL=$NGROK_URL" >> .env.local
echo "APP_URL=$NGROK_URL" >> .env.local

echo "Updated .env.local with ngrok URL"
echo ""

# Wait for ngrok process
wait $NGROK_PID
