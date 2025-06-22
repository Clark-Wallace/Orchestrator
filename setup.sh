#!/bin/bash
# Orchestrator Setup Script
# Initializes the AI-Augmented Development Platform

echo "🚀 Setting up Orchestrator..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Python version
echo -e "${BLUE}Checking Python version...${NC}"
python_version=$(python3 --version 2>&1 | awk '{print $2}')
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" = "$required_version" ]; then 
    echo -e "${GREEN}✓ Python $python_version installed${NC}"
else
    echo -e "${RED}✗ Python 3.8+ required. Found: $python_version${NC}"
    exit 1
fi

# Create virtual environment
if [ ! -d "venv" ]; then
    echo -e "${BLUE}Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}✓ Virtual environment created${NC}"
else
    echo -e "${YELLOW}Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "${BLUE}Activating virtual environment...${NC}"
source venv/bin/activate

# Upgrade pip
echo -e "${BLUE}Upgrading pip...${NC}"
pip install --upgrade pip

# Install requirements
echo -e "${BLUE}Installing requirements...${NC}"
pip install -r requirements.txt

# Create necessary directories
echo -e "${BLUE}Creating directory structure...${NC}"
mkdir -p workspace/{requirements,architecture,implementation,tests,deployment,documentation,signals,decisions}
mkdir -p dashboard/static/{css,js,images}
mkdir -p logs
mkdir -p agents/wrappers

echo -e "${GREEN}✓ Directory structure created${NC}"

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${BLUE}Creating .env file...${NC}"
    cat > .env << EOL
# Orchestrator Environment Configuration

# API Keys (Add your own)
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here

# Server Configuration
ORCHESTRATOR_HOST=0.0.0.0
ORCHESTRATOR_PORT=8100
ORCHESTRATOR_DEBUG=false

# Project Settings
PROJECT_NAME=MyProject
PROJECT_PATH=./workspace

# Agent Configuration
CLAUDE_TIMEOUT=120
CODEX_TIMEOUT=60
MAX_PARALLEL_AGENTS=4

# Feature Flags
ENABLE_REAL_AGENTS=false
ENABLE_INNOVATION_DETECTION=true
ENABLE_SIGNAL_MONITORING=true
EOL
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠️  Please update .env with your API keys${NC}"
else
    echo -e "${YELLOW}.env file already exists${NC}"
fi

# Create dashboard placeholder
if [ ! -f "dashboard/index.html" ]; then
    echo -e "${BLUE}Creating dashboard placeholder...${NC}"
    cat > dashboard/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orchestrator Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            background: #0a0a0a;
            color: #e0e0e0;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 1rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .status {
            font-size: 1.2rem;
            color: #10b981;
            margin: 2rem 0;
        }
        .buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
            margin-top: 2rem;
        }
        button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            color: white;
            padding: 0.75rem 2rem;
            border-radius: 0.5rem;
            font-size: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
        }
        .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 3rem;
            max-width: 800px;
        }
        .metric {
            background: rgba(255, 255, 255, 0.05);
            padding: 1.5rem;
            border-radius: 0.5rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
        }
        .metric-label {
            font-size: 0.9rem;
            color: #9ca3af;
            margin-top: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Orchestrator</h1>
        <p>AI-Augmented Development Platform</p>
        <div class="status">🟢 System Ready</div>
        
        <div class="buttons">
            <button onclick="window.location.href='/docs'">API Documentation</button>
            <button onclick="connectWebSocket()">Connect WebSocket</button>
        </div>
        
        <div class="metrics">
            <div class="metric">
                <div class="metric-value">0</div>
                <div class="metric-label">Active Tasks</div>
            </div>
            <div class="metric">
                <div class="metric-value">4</div>
                <div class="metric-label">Available Agents</div>
            </div>
            <div class="metric">
                <div class="metric-value">100%</div>
                <div class="metric-label">System Health</div>
            </div>
            <div class="metric">
                <div class="metric-value">0</div>
                <div class="metric-label">Pending Decisions</div>
            </div>
        </div>
    </div>
    
    <script>
        async function connectWebSocket() {
            const ws = new WebSocket('ws://localhost:8100/ws');
            
            ws.onopen = () => {
                console.log('WebSocket connected');
                document.querySelector('.status').textContent = '🟢 Connected';
            };
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('Received:', data);
                // Update UI based on message type
            };
            
            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                document.querySelector('.status').textContent = '🔴 Connection Error';
            };
        }
        
        // Auto-connect on load
        window.addEventListener('load', connectWebSocket);
    </script>
</body>
</html>
EOL
    echo -e "${GREEN}✓ Dashboard placeholder created${NC}"
fi

# Create start script
echo -e "${BLUE}Creating start script...${NC}"
cat > start_orchestrator.sh << 'EOL'
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

EOL
chmod +x start_orchestrator.sh
echo -e "${GREEN}✓ Start script created${NC}"

# Create test script
echo -e "${BLUE}Creating test script...${NC}"
cat > test_orchestrator.py << 'EOL'
#!/usr/bin/env python3
"""Test Orchestrator functionality"""

import asyncio
import httpx
import json


async def test_orchestrator():
    """Run basic tests"""
    base_url = "http://localhost:8100"
    
    async with httpx.AsyncClient() as client:
        # Test status endpoint
        print("Testing /api/status...")
        response = await client.get(f"{base_url}/api/status")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        # Test requirement submission
        print("\nTesting requirement submission...")
        requirement = {
            "content": "Build a user authentication system with JWT",
            "priority": 8
        }
        response = await client.post(
            f"{base_url}/api/requirements",
            json=requirement
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        
        # Test agents endpoint
        print("\nTesting /api/agents...")
        response = await client.get(f"{base_url}/api/agents")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")


if __name__ == "__main__":
    print("🧪 Testing Orchestrator API...")
    asyncio.run(test_orchestrator())
EOL
chmod +x test_orchestrator.py
echo -e "${GREEN}✓ Test script created${NC}"

echo -e "\n${GREEN}✅ Orchestrator setup complete!${NC}"
echo -e "\n${BLUE}Next steps:${NC}"
echo -e "1. Update ${YELLOW}.env${NC} with your API keys"
echo -e "2. Run ${YELLOW}./start_orchestrator.sh${NC} to start the server"
echo -e "3. Visit ${YELLOW}http://localhost:8100${NC} for the dashboard"
echo -e "4. Visit ${YELLOW}http://localhost:8100/docs${NC} for API documentation"
echo -e "\n${BLUE}To test the installation:${NC}"
echo -e "   ${YELLOW}python test_orchestrator.py${NC}"