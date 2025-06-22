#!/bin/bash
# Start Orchestrator Server

echo "🚀 Starting Orchestrator..."

# Activate virtual environment
source venv/bin/activate

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start the server
uvicorn api_server:app --host ${ORCHESTRATOR_HOST:-0.0.0.0} --port ${ORCHESTRATOR_PORT:-8100} --reload

