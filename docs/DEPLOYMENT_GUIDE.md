# Orchestrator Deployment Guide

## System Requirements

### Minimum Requirements
- **OS**: Linux, macOS, or Windows 10+
- **Python**: 3.8 or higher
- **RAM**: 2GB available
- **Storage**: 1GB free space
- **Network**: Internet connection for AI APIs

### Recommended Requirements
- **RAM**: 4GB+ available
- **CPU**: 4+ cores
- **Storage**: 5GB+ free space (for archives)
- **Network**: Stable broadband connection

## Prerequisites

### 1. Python Environment
```bash
# Check Python version
python --version  # Should be 3.8+

# Install pip if not available
python -m ensurepip --upgrade
```

### 2. API Keys
Obtain API keys from:
- **Anthropic**: https://console.anthropic.com/
- **OpenAI**: https://platform.openai.com/

### 3. System Dependencies
```bash
# Linux/Ubuntu
sudo apt update
sudo apt install python3-dev python3-pip git

# macOS (with Homebrew)
brew install python git

# Windows
# Install Python from python.org
# Install Git from git-scm.com
```

## Installation Methods

### Method 1: Quick Install (Recommended)

```bash
# Clone repository
git clone <repository-url>
cd orchestrator

# Run setup script
chmod +x setup.sh
./setup.sh

# Start Orchestrator
./start_orchestrator.sh
```

### Method 2: Manual Installation

```bash
# Clone and navigate
git clone <repository-url>
cd orchestrator

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Linux/macOS:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start server
python api_server.py
```

### Method 3: Docker Deployment

```bash
# Build image
docker build -t orchestrator .

# Run container
docker run -d \
  --name orchestrator \
  -p 8100:8100 \
  -v $(pwd)/workspace:/app/workspace \
  -v $(pwd)/completed_archive:/app/completed_archive \
  -e ANTHROPIC_API_KEY=your_key_here \
  -e OPENAI_API_KEY=your_key_here \
  orchestrator
```

## Configuration

### Environment Variables

```bash
# Optional - can also be set via web interface
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."

# Optional customization
export ORCHESTRATOR_PORT=8100
export ORCHESTRATOR_HOST=0.0.0.0
export WORKSPACE_PATH="./workspace"
export ARCHIVE_PATH="./completed_archive"
```

### Configuration File
Create `config.json` for persistent settings:

```json
{
    "server": {
        "host": "0.0.0.0",
        "port": 8100,
        "debug": false
    },
    "workspace": {
        "path": "./workspace",
        "auto_cleanup": false,
        "max_files": 1000
    },
    "archive": {
        "path": "./completed_archive",
        "compression": true,
        "retention_days": 365
    },
    "agents": {
        "timeout": 300,
        "retry_attempts": 3,
        "parallel_execution": true
    }
}
```

## Production Deployment

### 1. Reverse Proxy Setup (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:8100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. SSL Certificate (Let's Encrypt)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. Process Management (systemd)

Create `/etc/systemd/system/orchestrator.service`:

```ini
[Unit]
Description=Orchestrator AI Development Platform
After=network.target

[Service]
Type=simple
User=orchestrator
WorkingDirectory=/opt/orchestrator
Environment=PATH=/opt/orchestrator/venv/bin
ExecStart=/opt/orchestrator/venv/bin/python api_server.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable orchestrator
sudo systemctl start orchestrator
sudo systemctl status orchestrator
```

### 4. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 8100/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# iptables
sudo iptables -A INPUT -p tcp --dport 8100 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

## Monitoring & Maintenance

### 1. Health Checks

```bash
# API health check
curl http://localhost:8100/api/health

# System status
curl http://localhost:8100/api/system/status
```

### 2. Log Management

```bash
# Application logs
tail -f logs/orchestrator.log

# System logs
sudo journalctl -u orchestrator -f

# Rotate logs
sudo logrotate /etc/logrotate.d/orchestrator
```

### 3. Backup Strategy

```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/orchestrator_$DATE"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup workspace and archives
cp -r workspace/ $BACKUP_DIR/
cp -r completed_archive/ $BACKUP_DIR/
cp -r logs/ $BACKUP_DIR/

# Backup configuration
cp config.json $BACKUP_DIR/
cp requirements.txt $BACKUP_DIR/

# Compress backup
tar -czf "/backups/orchestrator_backup_$DATE.tar.gz" -C /backups "orchestrator_$DATE"

# Cleanup old backups (keep 30 days)
find /backups -name "orchestrator_backup_*.tar.gz" -mtime +30 -delete
```

### 4. Performance Monitoring

```python
# monitoring.py
import psutil
import requests
import time

def monitor_orchestrator():
    while True:
        # CPU and Memory
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        
        # API response time
        start_time = time.time()
        try:
            response = requests.get('http://localhost:8100/api/health')
            response_time = time.time() - start_time
            api_status = response.status_code
        except:
            response_time = None
            api_status = 'down'
        
        print(f"CPU: {cpu_percent}% | Memory: {memory.percent}% | API: {api_status} ({response_time:.2f}s)")
        time.sleep(60)

if __name__ == "__main__":
    monitor_orchestrator()
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Find process using port 8100
sudo lsof -i :8100
sudo netstat -tulpn | grep 8100

# Kill process
sudo kill -9 <PID>
```

#### 2. API Key Issues
```bash
# Verify API keys are set
echo $ANTHROPIC_API_KEY
echo $OPENAI_API_KEY

# Test API connectivity
curl -H "Authorization: Bearer $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/models
```

#### 3. Permission Issues
```bash
# Fix workspace permissions
sudo chown -R orchestrator:orchestrator workspace/
sudo chmod -R 755 workspace/

# Fix log permissions
sudo chown -R orchestrator:orchestrator logs/
sudo chmod -R 644 logs/
```

#### 4. WebSocket Connection Issues
```bash
# Check nginx configuration
sudo nginx -t

# Verify WebSocket headers
curl -H "Connection: Upgrade" -H "Upgrade: websocket" http://localhost:8100/ws
```

### Performance Optimization

#### 1. Database Optimization (Future)
```sql
-- Index commonly queried fields
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
```

#### 2. Caching Strategy
```python
# Redis cache for frequent queries
import redis
r = redis.Redis(host='localhost', port=6379, db=0)

# Cache task results
def cache_task_result(task_id, result):
    r.setex(f"task:{task_id}", 3600, json.dumps(result))
```

#### 3. Load Balancing (Multiple Instances)
```yaml
# docker-compose.yml
version: '3.8'
services:
  orchestrator-1:
    build: .
    ports:
      - "8101:8100"
  orchestrator-2:
    build: .
    ports:
      - "8102:8100"
  nginx:
    image: nginx
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
```

## Security Considerations

### 1. API Key Security
- Never commit API keys to version control
- Use environment variables or secure key management
- Rotate keys regularly
- Monitor API usage for anomalies

### 2. Network Security
- Use HTTPS in production
- Implement rate limiting
- Configure proper CORS headers
- Use VPN for remote access

### 3. File System Security
- Sandbox workspace directory
- Validate file uploads
- Scan generated code for security issues
- Implement file size limits

### 4. Authentication (Future Enhancement)
```python
# JWT-based authentication
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer

security = HTTPBearer()

def verify_token(token: str = Depends(security)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
```

## Support

For deployment issues:
1. Check logs: `sudo journalctl -u orchestrator -f`
2. Verify configuration: `cat config.json`
3. Test API endpoints: `curl http://localhost:8100/api/health`
4. Contact support with system information and error logs