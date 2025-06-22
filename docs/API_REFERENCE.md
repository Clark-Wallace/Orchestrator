# Orchestrator API Reference

## Overview
Orchestrator provides a RESTful API with WebSocket support for real-time AI-augmented development operations.

**Base URL**: `http://localhost:8100`

## Authentication
Currently operates in single-user mode. API keys are stored in settings for AI service access.

## Core Endpoints

### Requirements Management

#### Submit Development Requirement
```http
POST /api/requirements
Content-Type: application/json

{
    "requirement": "I want a FastAPI server that serves Hello World",
    "priority": 5,
    "metadata": {
        "user_id": "default",
        "project_context": {}
    }
}
```

**Response**:
```json
{
    "task_id": "task_123456789",
    "status": "created",
    "agents_assigned": ["claude", "codex", "claude2", "ide"],
    "estimated_completion": "2-5 minutes"
}
```

### Task Management

#### Get All Tasks
```http
GET /api/tasks
```

**Response**:
```json
{
    "tasks": [
        {
            "id": "task_123456789",
            "requirement": "FastAPI Hello World",
            "status": "completed",
            "priority": 5,
            "created_at": "2025-06-22T10:30:00Z",
            "agents": {
                "analyst": "claude",
                "implementer": "codex", 
                "validator": "claude2",
                "integrator": "ide"
            },
            "results": {
                "analysis": "...",
                "implementation": "...",
                "validation": "...",
                "integration": "..."
            }
        }
    ]
}
```

#### Get Task by ID
```http
GET /api/tasks/{task_id}
```

### Agent Information

#### Get Agent Status
```http
GET /api/agents
```

**Response**:
```json
{
    "agents": {
        "claude": {
            "status": "active",
            "current_task": "task_123456789",
            "specialization": "Strategic analysis and architecture",
            "last_activity": "2025-06-22T10:35:00Z"
        },
        "codex": {
            "status": "idle",
            "current_task": null,
            "specialization": "Code generation and implementation",
            "last_activity": "2025-06-22T10:32:00Z"
        }
    }
}
```

### Workspace Management

#### List Workspace Files
```http
GET /api/workspace/files
```

**Response**:
```json
{
    "files": [
        {
            "name": "hello_world.py",
            "path": "workspace/implementation/hello_world.py",
            "size": 1024,
            "created": "2025-06-22T10:35:00Z",
            "runnable": true,
            "metadata": {
                "command": "python hello_world.py",
                "port": 8000,
                "estimated_startup": "2s"
            }
        }
    ]
}
```

#### Execute Workspace File
```http
POST /api/workspace/run/{filename}
```

**Response**:
```json
{
    "execution_id": "exec_123",
    "status": "running",
    "process_id": 12345,
    "output_stream": "ws://localhost:8100/ws/execution/exec_123"
}
```

#### Get File Content
```http
GET /api/workspace/files/{filename}
```

**Response**: Raw file content

### Project Management

#### Reset Project
```http
POST /api/project/reset
```

**Response**:
```json
{
    "status": "success",
    "archive_path": "completed_archive/project_20250622_103500",
    "files_archived": 3,
    "workspace_cleared": true
}
```

### Archive System

#### List Archives
```http
GET /api/archive
```

**Response**:
```json
{
    "archives": [
        {
            "name": "project_20250622_103500",
            "created": "2025-06-22T10:35:00Z",
            "files": 3,
            "size": "15.2KB"
        }
    ]
}
```

#### Browse Archive Contents
```http
GET /api/archive/{archive_name}/files
```

#### Restore File from Archive
```http
POST /api/archive/{archive_name}/restore/{filename}
```

### Configuration

#### Save Settings
```http
POST /api/settings
Content-Type: application/json

{
    "anthropic_api_key": "sk-ant-...",
    "openai_api_key": "sk-...",
    "default_priority": 5,
    "auto_save": true
}
```

#### Load Settings
```http
GET /api/settings
```

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('ws://localhost:8100/ws');
```

### Event Types

#### Task Updates
```json
{
    "type": "task_update",
    "task_id": "task_123456789",
    "status": "in_progress",
    "agent": "claude",
    "stage": "analysis",
    "progress": 25
}
```

#### Agent Status
```json
{
    "type": "agent_status",
    "agent": "codex",
    "status": "active",
    "current_task": "task_123456789"
}
```

#### System Health
```json
{
    "type": "system_health",
    "cpu_usage": 15.2,
    "memory_usage": 68.5,
    "active_tasks": 2,
    "queue_length": 0
}
```

#### Execution Output
```json
{
    "type": "execution_output",
    "execution_id": "exec_123",
    "output": "Starting server on port 8000...",
    "timestamp": "2025-06-22T10:35:15Z"
}
```

## Error Handling

### Standard Error Response
```json
{
    "error": {
        "code": "INVALID_REQUEST",
        "message": "Missing required field: requirement",
        "details": {
            "field": "requirement",
            "expected": "string",
            "received": "null"
        }
    }
}
```

### Error Codes
- `INVALID_REQUEST`: Malformed request data
- `AGENT_UNAVAILABLE`: Required AI agent is offline
- `TASK_NOT_FOUND`: Task ID does not exist
- `WORKSPACE_ERROR`: File system operation failed
- `API_KEY_MISSING`: AI service API key not configured
- `EXECUTION_FAILED`: Code execution encountered error

## Rate Limits
- Requirements: 10 per minute
- File operations: 100 per minute
- Archive operations: 20 per minute

## SDK Example (Python)

```python
import requests
import websocket

class OrchestratorClient:
    def __init__(self, base_url="http://localhost:8100"):
        self.base_url = base_url
    
    def submit_requirement(self, requirement, priority=5):
        response = requests.post(
            f"{self.base_url}/api/requirements",
            json={"requirement": requirement, "priority": priority}
        )
        return response.json()
    
    def get_task_status(self, task_id):
        response = requests.get(f"{self.base_url}/api/tasks/{task_id}")
        return response.json()
    
    def list_workspace_files(self):
        response = requests.get(f"{self.base_url}/api/workspace/files")
        return response.json()

# Usage
client = OrchestratorClient()
task = client.submit_requirement("Create a simple calculator web app")
print(f"Task created: {task['task_id']}")
```