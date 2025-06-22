# 🚀 Orchestrator Quick Start

## 5-Minute Setup

### 1. Clone/Navigate to Orchestrator
```bash
cd "/Users/MAC_AI/Desktop/Projects Main/June20/TestRun/Orchestrator"
```

### 2. Run Setup
```bash
./setup.sh
```

### 3. Configure API Keys
Edit `.env` file:
```bash
OPENAI_API_KEY=your_actual_key_here
ANTHROPIC_API_KEY=your_actual_key_here
DEEPSEEK_API_KEY=your_actual_key_here  # Optional: For advanced reasoning
```

### 4. Start the Server
```bash
./start_orchestrator.sh
```

### 5. Access the Platform
- Dashboard: http://localhost:8100
- API Docs: http://localhost:8100/docs

## Your First AI-Augmented Development

### Using the Dashboard (Recommended)
1. **Open Dashboard**: Navigate to http://localhost:8100
2. **Configure API Keys**: Go to Settings tab and enter your API keys
3. **Submit Task**: Use the command input to describe what you want to build
4. **Monitor Progress**: Check Recent Outputs for generated files
5. **View Results**: Click files to view/edit generated code

### Current Experience (June 2025)
✅ **Task will process successfully** - AI agents will analyze, implement, and validate
✅ **Files will be generated** - Check Recent Outputs for implementation files  
✅ **Weak prompts enhanced** - "draw a plane" → professional HTML/SVG output
✅ **Smart file formats** - Graphics save as .html, APIs as .py
✅ **DeepSeek integration** - Complex tasks trigger advanced reasoning agent
✅ **Agent communication fixed** - Agents properly share context and results
❌ **Agent status indicators broken** - Cards always show "Ready" with 0 tasks
❌ **Console not displaying** - Agent logs only visible in server terminal
⚠️ **Quality validation issues** - Claude2 may show SDK errors, falls back to simulation
⚠️ **Pipeline updates intermittent** - Refresh page to see current state

### Tips for Best Results
- **Be specific** with prompts for better output
- **For graphics**, results will be HTML/SVG files you can open in browser
- **Monitor server console** for real agent activity: `python api_server.py`
- **Check Recent Outputs** frequently as UI updates are broken
- **Use complexity keywords** (optimize, algorithm, analyze) to trigger DeepSeek
- **Refresh the page** periodically to see updated task status

### Submit a Requirement (via API)
```bash
curl -X POST http://localhost:8100/api/requirements \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Build a REST API for task management with user auth",
    "priority": 8
  }'
```

### Or Use Python
```python
import httpx

# Submit requirement
response = httpx.post(
    "http://localhost:8100/api/requirements",
    json={
        "content": "Build a REST API for task management",
        "priority": 8
    }
)

requirement_id = response.json()["requirement_id"]
print(f"Requirement submitted: {requirement_id}")

# Check status
status = httpx.get("http://localhost:8100/api/status").json()
print(f"Progress: {status['progress']}%")
```

## What Happens Next

1. **Orchestrator** breaks down your requirement into tasks
2. **Claude** analyzes and creates architecture
3. **DeepSeek** (if triggered) provides deep reasoning for complex tasks
4. **Codex** generates implementation code
5. **Claude2** validates quality and security
6. **You** make key decisions when needed
7. **Result**: Production-ready code in `workspace/`

## WebSocket Monitoring

Connect to real-time updates:
```javascript
const ws = new WebSocket('ws://localhost:8100/ws');

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Update:', data.type, data.data);
};
```

## Key Endpoints

- `POST /api/requirements` - Submit new work
- `GET /api/status` - Check project health
- `GET /api/tasks` - View all tasks
- `GET /api/agents` - See agent status
- `POST /api/decisions` - Make decisions
- `GET /api/metrics` - Performance data

## Example: Full Workflow

```python
import asyncio
import httpx

async def build_with_orchestrator():
    async with httpx.AsyncClient() as client:
        # 1. Submit requirement
        req = await client.post(
            "http://localhost:8100/api/requirements",
            json={
                "content": "Create user authentication with JWT",
                "priority": 9
            }
        )
        req_id = req.json()["requirement_id"]
        
        # 2. Monitor progress
        while True:
            status = await client.get("http://localhost:8100/api/status")
            data = status.json()
            print(f"Progress: {data['progress']}%")
            
            # 3. Check for decisions needed
            if data['pending_decisions'] > 0:
                signals = await client.get("/api/signals?type=decision_needed")
                for signal in signals.json()['signals']:
                    print(f"Decision needed: {signal['data']}")
                    # Make decision...
            
            if data['progress'] >= 100:
                break
                
            await asyncio.sleep(2)
        
        # 4. Get results
        tasks = await client.get("/api/tasks?status=completed")
        print(f"Completed: {len(tasks.json())} tasks")

asyncio.run(build_with_orchestrator())
```

## Tips

1. **Start Simple**: Begin with small, well-defined requirements
2. **Watch the Signals**: Monitor `/api/signals` for innovation detection
3. **Make Decisions Quickly**: Agents wait for your input
4. **Check the Workspace**: Find generated code in `workspace/implementation/`
5. **Review Patterns**: System learns from your decisions

## Troubleshooting

### Agents Not Responding
- Check `.env` has valid API keys (including optional DeepSeek key)
- Ensure all required packages are installed: `pip install -r requirements.txt`
- Verify network connectivity
- Check server logs for specific API errors

### No Progress
- Check `/api/tasks` for blocked tasks
- Look for pending decisions in `/api/signals`
- Review logs in `logs/` directory

### Connection Issues
- Verify server is running on port 8100
- Check firewall settings
- Try `127.0.0.1` instead of `localhost`

## Next Steps

1. Read the [Architecture Overview](docs/architecture.md)
2. Explore [DeepSeek Integration](docs/DEEPSEEK_INTEGRATION.md)
3. Check [Known Issues](docs/KNOWN_ISSUES.md) for current limitations
4. Review [Development Status](docs/DEVELOPMENT_STATUS.md) for latest updates
5. Try building a real application!

---

*Welcome to AI-Augmented Development. Let's build something amazing together.*