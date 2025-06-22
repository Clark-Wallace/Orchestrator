# Orchestrator Troubleshooting Guide

## Quick Diagnostic Commands

```bash
# System health check
curl http://localhost:8100/api/health

# Check if server is running
ps aux | grep api_server.py

# View recent logs
tail -f logs/orchestrator.log

# Test API connectivity
curl -X POST http://localhost:8100/api/requirements \
  -H "Content-Type: application/json" \
  -d '{"requirement": "test", "priority": 1}'
```

## Current Known Issues (June 2025)

### UI Transparency Features (Not Working)

#### Issue: Agent Console Not Showing Real-time Logs
**Status**: Backend logging implemented, frontend not updating
**Root Cause**: WebSocket messages sent but not processed in UI
**Workaround**: Check server console logs for agent activity
```bash
# View real-time server logs to see agent execution
tail -f server.log
# or run server directly to see console output
python api_server.py
```

#### Issue: AI Agent Status Not Updating During Execution
**Status**: UI indicators not reflecting active agent work
**Root Cause**: WebSocket messages for agent_activity are sent but not updating UI
**Symptoms**:
- Agent cards always show "Ready" with 0 tasks
- No status change when processing
- Task counts don't increment
**Workaround**: 
- Monitor Recent Outputs section for file generation
- Check server console for agent activity logs
**Expected**: Agent cards should show "Working" status during task execution

#### Issue: Pipeline Visualization Missing Real-time Updates
**Status**: Tasks process successfully but UI doesn't show live progress
**Workaround**: Refresh page after task completion to see results

#### Issue: Quality Validator (Claude2) SDK Errors
**Status**: Claude2 validator may fail with various SDK errors
**Root Cause**: API initialization or rate limiting issues
**Impact**: 
- Validation step falls back to simulation
- Code quality checks are bypassed
- Execution metadata not properly determined
**Workaround**: Code still generates but without quality validation
**Note**: Enhanced error logging added for better diagnostics

### Core Functionality Status
✅ **Task Processing** - Working correctly
✅ **File Generation** - Working correctly  
✅ **API Endpoints** - Working correctly
✅ **WebSocket Connection** - Established successfully
✅ **Prompt Enhancement** - Weak prompts are improved automatically
✅ **Smart Output Format** - Graphics generate HTML/SVG
✅ **DeepSeek Integration** - Advanced reasoning for complex tasks
✅ **Inter-Agent Communication** - Fixed, agents share context properly
❌ **Real-time UI Updates** - Not working (no agent status changes)
❌ **Agent Status Indicators** - Cards remain static during execution
❌ **Console Logging** - Backend logs exist but don't display in UI
⚠️ **Pipeline Visualization** - Intermittent updates
⚠️ **Quality Assurance** - Claude2 validator sometimes fails

## Common Issues & Solutions

### 1. Server Won't Start

#### Issue: Port Already in Use
```
Error: [Errno 48] Address already in use
```

**Solution**:
```bash
# Find process using port 8100
sudo lsof -i :8100
# or
sudo netstat -tulpn | grep 8100

# Kill the process
sudo kill -9 <PID>

# Alternative: Use different port
export ORCHESTRATOR_PORT=8101
python api_server.py
```

#### Issue: Missing Dependencies
```
ModuleNotFoundError: No module named 'fastapi'
```

**Solution**:
```bash
# Activate virtual environment
source venv/bin/activate  # Linux/macOS
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Verify installation
python -c "import fastapi; print('FastAPI installed successfully')"
```

#### Issue: Python Version Incompatibility
```
SyntaxError: invalid syntax (async/await)
```

**Solution**:
```bash
# Check Python version
python --version

# Must be 3.8+, upgrade if needed
# Linux/Ubuntu:
sudo apt update && sudo apt install python3.9

# macOS:
brew install python@3.9

# Windows: Download from python.org
```

### 2. API Connection Issues

#### Issue: 404 Not Found on Dashboard Assets
```
GET /styles.css 404 Not Found
GET /script.js 404 Not Found
```

**Solution**: Check `api_server.py` has static file routes:
```python
# Ensure these routes exist in api_server.py
@app.get("/styles.css")
async def get_styles():
    return FileResponse("dashboard/styles.css", media_type="text/css")

@app.get("/script.js")
async def get_script():
    return FileResponse("dashboard/script.js", media_type="text/javascript")
```

#### Issue: CORS Errors in Browser
```
Access to fetch at 'http://localhost:8100/api/...' has been blocked by CORS policy
```

**Solution**: Add CORS middleware to `api_server.py`:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Issue: WebSocket Connection Failed
```
WebSocket connection to 'ws://localhost:8100/ws' failed
```

**Solutions**:
```bash
# 1. Check if WebSocket endpoint exists
curl -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8100/ws

# 2. Check firewall
sudo ufw status
sudo iptables -L

# 3. Test with simple WebSocket client
python -c "
import asyncio
import websockets

async def test():
    try:
        async with websockets.connect('ws://localhost:8100/ws') as ws:
            print('Connected successfully')
    except Exception as e:
        print(f'Connection failed: {e}')

asyncio.run(test())
"
```

### 3. AI Agent Issues

#### Issue: API Keys Not Working
```
Error: Incorrect API key provided
```

**Diagnostic Steps**:
```bash
# 1. Check environment variables
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY
echo $DEEPSEEK_API_KEY  # Optional

# 2. Test API key directly
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" \
     -H "Content-Type: application/json" \
     https://api.anthropic.com/v1/models

curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

**Solutions**:
```bash
# 1. Set environment variables
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export DEEPSEEK_API_KEY="sk-..."  # Optional for advanced reasoning

# 2. Add to shell profile for persistence
echo 'export ANTHROPIC_API_KEY="sk-ant-..."' >> ~/.bashrc
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.bashrc
echo 'export DEEPSEEK_API_KEY="sk-..."' >> ~/.bashrc
source ~/.bashrc

# 3. Use .env file (create in project root)
cat > .env << EOF
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=sk-...  # Optional
EOF

# 4. Load in Python
pip install python-dotenv
# Add to api_server.py:
from dotenv import load_dotenv
load_dotenv()
```

#### Issue: Agent Timeout Errors
```
asyncio.TimeoutError: Agent response timeout
```

**Solutions**:
```python
# 1. Increase timeout in agent_bridge.py
class AgentConnector:
    def __init__(self, timeout=300):  # Increase from default
        self.timeout = timeout

# 2. Implement retry logic
async def execute_with_retry(self, prompt, context, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await self.execute(prompt, context)
        except asyncio.TimeoutError:
            if attempt < max_retries - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
                continue
            raise

# 3. Monitor agent performance
async def monitor_agent_health():
    for agent_name, agent in agents.items():
        try:
            start_time = time.time()
            await asyncio.wait_for(agent.get_status(), timeout=10)
            response_time = time.time() - start_time
            print(f"{agent_name}: {response_time:.2f}s")
        except Exception as e:
            print(f"{agent_name}: ERROR - {e}")
```

#### Issue: Agent Response Parsing Errors
```
JSONDecodeError: Expecting value: line 1 column 1 (char 0)
```

**Solution**: Add robust parsing with fallbacks:
```python
def _parse_agent_response(self, response_text: str) -> Dict[str, Any]:
    try:
        # Try JSON first
        return json.loads(response_text)
    except json.JSONDecodeError:
        # Fall back to structured text parsing
        return self._parse_structured_text(response_text)
    except Exception as e:
        # Last resort: return raw response
        return {
            'raw_response': response_text,
            'parse_error': str(e),
            'success': False
        }

def _parse_structured_text(self, text: str) -> Dict[str, Any]:
    """Parse structured text when JSON fails"""
    lines = text.strip().split('\n')
    result = {'success': True}
    
    current_section = 'general'
    for line in lines:
        if line.startswith('##'):
            current_section = line.replace('##', '').strip().lower()
            result[current_section] = []
        elif line.strip():
            if current_section not in result:
                result[current_section] = []
            result[current_section].append(line.strip())
    
    return result
```

### 4. File System Issues

#### Issue: Permission Denied on Workspace
```
PermissionError: [Errno 13] Permission denied: '/workspace/implementation'
```

**Solution**:
```bash
# Fix permissions
sudo chown -R $USER:$USER workspace/
chmod -R 755 workspace/

# For production, create dedicated user
sudo useradd -m orchestrator
sudo chown -R orchestrator:orchestrator /opt/orchestrator/
sudo -u orchestrator python api_server.py
```

#### Issue: Disk Space Full
```
OSError: [Errno 28] No space left on device
```

**Solutions**:
```bash
# 1. Check disk usage
df -h
du -sh workspace/ completed_archive/

# 2. Clean old archives
find completed_archive/ -type d -mtime +30 -exec rm -rf {} \;

# 3. Implement automatic cleanup
# Add to crontab:
0 2 * * * find /path/to/orchestrator/completed_archive -type d -mtime +30 -exec rm -rf {} \;

# 4. Configure archive compression
# In config.json:
{
    "archive": {
        "compression": true,
        "compression_level": 6,
        "max_size_mb": 1000
    }
}
```

#### Issue: Files Not Saving to Workspace
```
File created but not visible in workspace/
```

**Diagnostic**:
```python
# Add debug logging to orchestrator_core.py
import logging
logging.basicConfig(level=logging.DEBUG)

async def _save_implementation_to_workspace(self, task: Task):
    implementation_dir = Path(self.project_path) / "workspace" / "implementation"
    logging.debug(f"Creating directory: {implementation_dir}")
    
    try:
        implementation_dir.mkdir(parents=True, exist_ok=True)
        logging.debug(f"Directory created successfully")
        
        # ... rest of save logic
        logging.debug(f"File saved: {file_path}")
    except Exception as e:
        logging.error(f"Save failed: {e}")
```

### 5. Database Issues (Future)

#### Issue: Database Connection Failed
```
sqlalchemy.exc.OperationalError: (sqlite3.OperationalError) database is locked
```

**Solutions**:
```python
# 1. Use connection pooling
from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool

engine = create_engine(
    "sqlite:///orchestrator.db",
    poolclass=StaticPool,
    pool_pre_ping=True,
    pool_recycle=300
)

# 2. Implement retry logic
def db_operation_with_retry(operation, max_retries=3):
    for attempt in range(max_retries):
        try:
            return operation()
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                time.sleep(0.1 * (2 ** attempt))
                continue
            raise

# 3. Add connection timeout
engine = create_engine(
    "sqlite:///orchestrator.db",
    connect_args={"timeout": 20}
)
```

### 6. Performance Issues

#### Issue: Slow Response Times
```
API calls taking 10+ seconds
```

**Diagnostic**:
```python
# Add performance monitoring
import time
from functools import wraps

def monitor_performance(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            print(f"{func.__name__}: {duration:.2f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            print(f"{func.__name__}: FAILED after {duration:.2f}s - {e}")
            raise
    return wrapper

# Apply to slow functions
@monitor_performance
async def execute_agent_request(self, prompt, context):
    # ... implementation
```

**Solutions**:
```python
# 1. Implement caching
from functools import lru_cache
import redis

@lru_cache(maxsize=128)
def cached_analysis(requirement_hash):
    # Cache expensive computations
    pass

# 2. Use async/await properly
async def process_multiple_tasks(tasks):
    # Run in parallel, not sequential
    results = await asyncio.gather(*[
        process_task(task) for task in tasks
    ])
    return results

# 3. Add connection pooling for HTTP requests
import aiohttp

session = aiohttp.ClientSession(
    connector=aiohttp.TCPConnector(limit=100),
    timeout=aiohttp.ClientTimeout(total=30)
)
```

#### Issue: Memory Leaks
```
Memory usage continuously increasing
```

**Solutions**:
```python
# 1. Monitor memory usage
import psutil
import gc

def log_memory_usage():
    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024
    print(f"Memory usage: {memory_mb:.1f} MB")

# 2. Implement cleanup
async def cleanup_old_data():
    # Clear old tasks
    cutoff_time = datetime.now() - timedelta(hours=24)
    old_tasks = [t for t in tasks.values() if t.created_at < cutoff_time]
    
    for task in old_tasks:
        del tasks[task.id]
    
    # Force garbage collection
    gc.collect()

# 3. Limit cache sizes
class BoundedCache:
    def __init__(self, max_size=1000):
        self.cache = {}
        self.max_size = max_size
        self.access_order = []
    
    def set(self, key, value):
        if len(self.cache) >= self.max_size:
            # Remove least recently used
            oldest_key = self.access_order.pop(0)
            del self.cache[oldest_key]
        
        self.cache[key] = value
        self.access_order.append(key)
```

### 7. Security Issues

#### Issue: Unsafe Code Execution
```
SecurityError: Attempted to execute dangerous code
```

**Solutions**:
```python
# 1. Code validation before execution
import ast
import subprocess

def validate_code_safety(code: str) -> bool:
    """Check for dangerous operations"""
    dangerous_patterns = [
        'import os', 'import subprocess', 'eval(', 'exec(',
        '__import__', 'open(', 'file(', 'input(', 'raw_input('
    ]
    
    for pattern in dangerous_patterns:
        if pattern in code:
            return False
    
    # Parse AST to check for dangerous nodes
    try:
        tree = ast.parse(code)
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                if any(dangerous in node.names[0].name for dangerous in ['os', 'subprocess', 'sys']):
                    return False
    except SyntaxError:
        return False
    
    return True

# 2. Sandboxed execution
import tempfile
import docker

def execute_in_sandbox(code: str) -> Dict[str, Any]:
    """Execute code in isolated Docker container"""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_file = f.name
    
    try:
        client = docker.from_env()
        result = client.containers.run(
            'python:3.9-alpine',
            f'python {temp_file}',
            volumes={temp_file: {'bind': temp_file, 'mode': 'ro'}},
            network_disabled=True,
            mem_limit='256m',
            cpu_quota=50000,
            remove=True,
            timeout=30
        )
        return {'output': result.decode(), 'success': True}
    except Exception as e:
        return {'error': str(e), 'success': False}
    finally:
        os.unlink(temp_file)
```

## Log Analysis

### Enabling Debug Logging
```python
# In api_server.py
import logging

logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/orchestrator.log'),
        logging.StreamHandler()
    ]
)

# Add request logging
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    
    logging.info(f"Request: {request.method} {request.url}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logging.info(f"Response: {response.status_code} in {process_time:.2f}s")
    
    return response
```

### Log Patterns to Watch

#### Normal Operation
```
2025-06-22 10:30:00 - orchestrator - INFO - Task created: task_123456789
2025-06-22 10:30:01 - claude - INFO - Analysis started for task_123456789
2025-06-22 10:30:05 - claude - INFO - Analysis completed in 4.2s
2025-06-22 10:30:06 - codex - INFO - Implementation started
2025-06-22 10:30:12 - codex - INFO - Implementation completed in 6.1s
2025-06-22 10:30:13 - claude2 - INFO - Validation passed
2025-06-22 10:30:14 - ide - INFO - Integration successful
2025-06-22 10:30:15 - orchestrator - INFO - Task completed: task_123456789
```

#### Warning Signs
```
2025-06-22 10:30:00 - claude - WARNING - Response time exceeded 30s
2025-06-22 10:30:00 - orchestrator - WARNING - Task queue backing up: 5 pending
2025-06-22 10:30:00 - system - WARNING - Memory usage above 80%: 3.2GB/4GB
2025-06-22 10:30:00 - claude - ERROR - API rate limit exceeded
2025-06-22 10:30:00 - websocket - ERROR - Connection lost, attempting reconnect
```

## Emergency Recovery

### Complete System Reset
```bash
#!/bin/bash
# emergency_reset.sh

echo "Performing emergency reset..."

# Stop all processes
pkill -f api_server.py
pkill -f orchestrator

# Backup current state
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p emergency_backup_$DATE
cp -r workspace/ emergency_backup_$DATE/
cp -r completed_archive/ emergency_backup_$DATE/
cp -r logs/ emergency_backup_$DATE/

# Clear workspace
rm -rf workspace/*
mkdir -p workspace/implementation

# Clear temporary files
rm -rf __pycache__/
rm -rf *.pyc
rm -rf .pytest_cache/

# Reset logs
mv logs/orchestrator.log logs/orchestrator_$DATE.log
touch logs/orchestrator.log

# Restart system
echo "Starting fresh system..."
python api_server.py &

echo "Emergency reset complete. Backup saved to emergency_backup_$DATE/"
```

### Health Check Script
```python
#!/usr/bin/env python
# health_check.py

import asyncio
import aiohttp
import json
import sys

async def comprehensive_health_check():
    base_url = "http://localhost:8100"
    
    checks = {
        'api_server': False,
        'websocket': False,
        'agents': False,
        'file_system': False
    }
    
    async with aiohttp.ClientSession() as session:
        # Check API server
        try:
            async with session.get(f"{base_url}/api/health") as response:
                if response.status == 200:
                    checks['api_server'] = True
        except:
            pass
        
        # Check agents
        try:
            async with session.get(f"{base_url}/api/agents") as response:
                if response.status == 200:
                    agents_data = await response.json()
                    if len(agents_data.get('agents', {})) >= 4:
                        checks['agents'] = True
        except:
            pass
        
        # Check file system
        try:
            import os
            workspace_exists = os.path.exists('workspace')
            archive_exists = os.path.exists('completed_archive')
            if workspace_exists and archive_exists:
                checks['file_system'] = True
        except:
            pass
    
    # Report results
    print("Orchestrator Health Check Results:")
    print("=" * 40)
    
    for check, status in checks.items():
        status_text = "✅ PASS" if status else "❌ FAIL"
        print(f"{check.replace('_', ' ').title()}: {status_text}")
    
    overall_health = sum(checks.values()) / len(checks) * 100
    print(f"\nOverall Health: {overall_health:.0f}%")
    
    if overall_health < 75:
        print("\n⚠️  System requires attention!")
        sys.exit(1)
    else:
        print("\n✅ System healthy")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(comprehensive_health_check())
```

## Getting Help

### Collecting Diagnostic Information
```bash
#!/bin/bash
# collect_diagnostics.sh

DATE=$(date +%Y%m%d_%H%M%S)
DIAG_DIR="diagnostics_$DATE"

mkdir -p $DIAG_DIR

# System information
uname -a > $DIAG_DIR/system_info.txt
python --version > $DIAG_DIR/python_version.txt
pip list > $DIAG_DIR/pip_packages.txt

# Application state
cp -r logs/ $DIAG_DIR/
cp requirements.txt $DIAG_DIR/
cp config.json $DIAG_DIR/ 2>/dev/null || echo "No config.json found"

# Process information
ps aux | grep -E "(python|orchestrator)" > $DIAG_DIR/processes.txt
netstat -tulpn | grep 8100 > $DIAG_DIR/network_status.txt

# Disk space
df -h > $DIAG_DIR/disk_usage.txt
du -sh workspace/ completed_archive/ > $DIAG_DIR/directory_sizes.txt

# Recent errors
tail -n 100 logs/orchestrator.log | grep -i error > $DIAG_DIR/recent_errors.txt

# API health
curl -s http://localhost:8100/api/health > $DIAG_DIR/api_health.json 2>&1
curl -s http://localhost:8100/api/agents > $DIAG_DIR/agents_status.json 2>&1

# Compress for easy sharing
tar -czf diagnostics_$DATE.tar.gz $DIAG_DIR/
rm -rf $DIAG_DIR

echo "Diagnostics collected in: diagnostics_$DATE.tar.gz"
echo "Share this file when requesting support"
```

### Support Checklist

Before requesting help, ensure you have:

1. **Tried basic troubleshooting**
   - Restarted the system
   - Checked logs for errors
   - Verified API keys are set
   - Confirmed all dependencies are installed

2. **Collected diagnostic information**
   - Run the health check script
   - Generate diagnostics package
   - Note exact error messages
   - Document steps to reproduce

3. **System information**
   - Operating system and version
   - Python version
   - Available RAM and disk space
   - Network configuration

4. **Recent changes**
   - Any configuration changes
   - New dependencies installed
   - Environment modifications
   - Recent code updates

This comprehensive troubleshooting guide should help resolve most issues you might encounter with Orchestrator. For complex issues not covered here, the diagnostic tools will help gather the information needed for effective support.