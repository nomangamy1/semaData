#!/bin/bash
PORT=$1
if [ -z "$PORT" ]; then
    echo "Usage: $0 <port>"
    exit 1
fi
lsof -ti:$PORT | xargs kill -9 2>/dev/null || echo "No process found on port $PORT"