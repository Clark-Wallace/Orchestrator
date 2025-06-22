#!/usr/bin/env python3
"""
Orchestrator API Server
Professional REST API and WebSocket interface for AI-augmented development
"""

from fastapi import FastAPI, WebSocket, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
import asyncio
import json
import uuid
import os
from datetime import datetime
from pathlib import Path

from orchestrator_core import OrchestratorCore, TaskStatus, SignalType
from agent_bridge import AgentBridge


# Request/Response Models
class RequirementRequest(BaseModel):
    """Request model for submitting requirements"""
    content: str = Field(..., description="High-level requirement description")
    priority: int = Field(5, ge=1, le=10, description="Priority level (1-10)")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")


class DecisionRequest(BaseModel):
    """Request model for making decisions"""
    signal_id: str = Field(..., description="Signal ID requiring decision")
    decision: str = Field(..., description="Decision made")
    rationale: Optional[str] = Field(None, description="Reason for decision")


class ProjectStatusResponse(BaseModel):
    """Response model for project status"""
    project_id: str
    health_score: float
    progress: float
    active_agents: int
    pending_decisions: int
    tasks: Dict[str, int]


class TaskResponse(BaseModel):
    """Response model for task information"""
    id: str
    description: str
    status: str
    assigned_to: Optional[str]
    progress: int
    output: Optional[Dict[str, Any]]


# Global instances
orchestrator: Optional[OrchestratorCore] = None
agent_bridge: Optional[AgentBridge] = None
active_connections: List[WebSocket] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management"""
    global orchestrator, agent_bridge
    
    # Startup
    print("🚀 Starting Orchestrator API Server...")
    orchestrator = OrchestratorCore()
    agent_bridge = AgentBridge(orchestrator.project_path)
    
    # Set up agent logging callbacks
    def agent_log_callback(level: str, message: str, agent: str):
        """Callback for agent logging"""
        try:
            # Use asyncio.run_coroutine_threadsafe for thread-safe async calls
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(manager.send_agent_log(level, message, agent))
            else:
                loop.run_until_complete(manager.send_agent_log(level, message, agent))
        except Exception as e:
            print(f"Failed to send agent log: {e}")
    
    # Configure logging for all agents
    for agent_key, connector in agent_bridge.agents.items():
        if connector:
            connector.set_log_callback(agent_log_callback)
            print(f"✅ Set logging callback for {agent_key}")
    
    # Load saved settings if they exist
    settings_file = Path("settings.json")
    if settings_file.exists():
        with open(settings_file, "r") as f:
            settings = json.load(f)
            if "openai_key" in settings:
                os.environ["OPENAI_API_KEY"] = settings["openai_key"]
            if "anthropic_key" in settings:
                os.environ["ANTHROPIC_API_KEY"] = settings["anthropic_key"]
            if "deepseek_key" in settings:
                os.environ["DEEPSEEK_API_KEY"] = settings["deepseek_key"]
            print("✅ Loaded saved settings")
    
    # Start background tasks
    asyncio.create_task(monitor_system())
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Orchestrator API Server...")
    # Save project state
    if orchestrator:
        state = orchestrator.export_project_state()
        with open("orchestrator_state.json", "w") as f:
            json.dump(state, f, indent=2, default=str)


# Create FastAPI app
app = FastAPI(
    title="Orchestrator API",
    description="AI-Augmented Development Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        await self.send_personal_message(
            {"type": "connection", "status": "connected"},
            websocket
        )
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except:
            pass
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass
    
    async def send_agent_log(self, level: str, message: str, agent: str):
        """Send agent log to all connected clients"""
        await self.broadcast({
            "type": "agent_log",
            "data": {
                "level": level,
                "message": message,
                "agent": agent,
                "timestamp": datetime.now().strftime("%H:%M:%S")
            }
        })


manager = ConnectionManager()


# API Endpoints
@app.get("/", response_class=FileResponse)
async def root():
    """Serve the dashboard"""
    dashboard_path = Path(__file__).parent / "dashboard" / "index.html"
    if dashboard_path.exists():
        return FileResponse(dashboard_path)
    return {"message": "Orchestrator API - Use /docs for API documentation"}


@app.get("/api/status", response_model=ProjectStatusResponse)
async def get_status():
    """Get current project status"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    status = orchestrator.get_project_status()
    return ProjectStatusResponse(**status)


@app.post("/api/requirements")
async def submit_requirement(
    request: RequirementRequest,
    background_tasks: BackgroundTasks
):
    """Submit a new requirement for processing"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    # Process requirement
    req_id = await orchestrator.process_requirement(
        request.content,
        request.priority
    )
    
    # Test: Send agent log message
    await manager.send_agent_log("info", f"📥 Processing requirement: {request.content[:50]}...", "system")
    
    # Broadcast update
    await manager.broadcast({
        "type": "requirement_submitted",
        "data": {
            "id": req_id,
            "content": request.content,
            "priority": request.priority
        }
    })
    
    # Start background processing
    background_tasks.add_task(process_requirement_tasks, req_id)
    
    return {
        "status": "accepted",
        "requirement_id": req_id,
        "message": "Requirement submitted for processing"
    }


@app.get("/api/tasks", response_model=List[TaskResponse])
async def get_tasks(status: Optional[str] = None):
    """Get all tasks, optionally filtered by status"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    tasks = []
    for task_id, task in orchestrator.tasks.items():
        if status and task.status.value != status:
            continue
        
        # Calculate progress
        progress = 0
        if task.status == TaskStatus.COMPLETED:
            progress = 100
        elif task.status == TaskStatus.IN_PROGRESS:
            progress = 50
        elif task.status == TaskStatus.ASSIGNED:
            progress = 10
        
        tasks.append(TaskResponse(
            id=task.id,
            description=task.description,
            status=task.status.value,
            assigned_to=task.assigned_to,
            progress=progress,
            output=task.output
        ))
    
    return tasks


@app.get("/api/agents")
async def get_agents():
    """Get all available agents and their status"""
    if not orchestrator or not agent_bridge:
        raise HTTPException(status_code=503, detail="System not initialized")
    
    agents = []
    for agent_id, agent in orchestrator.agents.items():
        agents.append({
            "id": agent.id,
            "name": agent.name,
            "type": agent.type.value,
            "status": agent.status,
            "capabilities": agent.capabilities,
            "current_task": agent.current_task,
            "performance_score": agent.performance_score
        })
    
    return {"agents": agents}


@app.get("/api/signals")
async def get_signals(type: Optional[str] = None):
    """Get system signals, optionally filtered by type"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    signals = []
    for signal in orchestrator.signals:
        if type and signal.type.value != type:
            continue
        
        signals.append({
            "id": signal.id,
            "type": signal.type.value,
            "source": signal.source,
            "data": signal.data,
            "confidence": signal.confidence,
            "timestamp": signal.timestamp.isoformat()
        })
    
    return {"signals": signals, "count": len(signals)}


@app.post("/api/decisions")
async def make_decision(request: DecisionRequest):
    """Make a decision for a pending signal"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    success = await orchestrator.make_decision(request.signal_id, request.decision)
    
    if not success:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    # Broadcast decision
    await manager.broadcast({
        "type": "decision_made",
        "data": {
            "signal_id": request.signal_id,
            "decision": request.decision
        }
    })
    
    return {
        "status": "success",
        "message": "Decision recorded"
    }


@app.get("/api/metrics")
async def get_metrics():
    """Get performance metrics"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    # Calculate metrics
    total_tasks = len(orchestrator.tasks)
    completed_tasks = sum(1 for t in orchestrator.tasks.values() 
                         if t.status == TaskStatus.COMPLETED)
    
    avg_completion_time = 0
    if completed_tasks > 0:
        completion_times = []
        for task in orchestrator.tasks.values():
            if task.completed_at and task.created_at:
                duration = (task.completed_at - task.created_at).total_seconds()
                completion_times.append(duration)
        if completion_times:
            avg_completion_time = sum(completion_times) / len(completion_times)
    
    return {
        "metrics": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_tasks,
            "completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
            "average_completion_time": avg_completion_time,
            "active_agents": sum(1 for a in orchestrator.agents.values() 
                               if a.status == "working"),
            "health_score": orchestrator._calculate_health_score()
        }
    }


@app.get("/api/export")
async def export_project():
    """Export complete project state"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    state = orchestrator.export_project_state()
    
    # Add metadata
    state["export_metadata"] = {
        "exported_at": datetime.now().isoformat(),
        "version": "1.0.0",
        "platform": "Orchestrator"
    }
    
    return state


@app.post("/api/project/reset")
async def reset_project():
    """Reset the entire project - clear all tasks, signals, and workspace"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    try:
        # Clear all tasks
        orchestrator.tasks.clear()
        
        # Clear all signals  
        orchestrator.signals.clear()
        
        # Reset all agents to ready status
        for agent in orchestrator.agents.values():
            agent.status = "ready"
            agent.current_task = None
        
        # Clear execution log
        orchestrator.execution_log.clear()
        
        # Archive workspace files before clearing
        workspace_path = Path(orchestrator.project_path) / "workspace"
        archive_path = Path(orchestrator.project_path) / "completed_archive"
        
        if workspace_path.exists():
            import shutil
            from datetime import datetime
            
            # Create archive directory if it doesn't exist
            archive_path.mkdir(exist_ok=True)
            
            # Create timestamped archive folder
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            project_archive = archive_path / f"project_{timestamp}"
            
            # Move workspace to archive (only if it has files)
            has_files = any(workspace_path.rglob("*"))
            if has_files:
                shutil.move(str(workspace_path), str(project_archive))
                print(f"✅ Archived workspace to {project_archive}")
            else:
                # Just remove empty workspace
                shutil.rmtree(workspace_path, ignore_errors=True)
            
            # Recreate clean workspace structure
            orchestrator._setup_project_structure()
        
        # Reset project context
        orchestrator.context = None
        
        # Generate new project ID
        orchestrator.project_id = str(uuid.uuid4())
        
        # Broadcast reset to all connected clients
        await manager.broadcast({
            "type": "project_reset",
            "data": {
                "message": "Project has been reset",
                "new_project_id": orchestrator.project_id,
                "timestamp": datetime.now().isoformat()
            }
        })
        
        return {
            "status": "success",
            "message": "Project reset successfully",
            "new_project_id": orchestrator.project_id,
            "archived_to": str(project_archive) if 'project_archive' in locals() else None
        }
        
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"❌ Reset error: {error_details}")
        return {
            "status": "error", 
            "message": f"Failed to reset project: {str(e)}",
            "error_details": error_details
        }


@app.get("/api/archive")
async def get_archived_projects():
    """Get list of archived (completed) projects"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    archive_path = Path(orchestrator.project_path) / "completed_archive"
    archives = []
    
    if archive_path.exists():
        for archive_dir in archive_path.iterdir():
            if archive_dir.is_dir() and archive_dir.name.startswith("project_"):
                # Extract timestamp from folder name
                timestamp_str = archive_dir.name.replace("project_", "")
                try:
                    from datetime import datetime
                    timestamp = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")
                    
                    # Count files in archive
                    file_count = sum(1 for _ in archive_dir.rglob("*") if _.is_file())
                    
                    archives.append({
                        "id": archive_dir.name,
                        "path": str(archive_dir),
                        "created": timestamp.isoformat(),
                        "created_display": timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                        "file_count": file_count
                    })
                except ValueError:
                    # Skip malformed folder names
                    continue
    
    # Sort by creation time (newest first)
    archives.sort(key=lambda x: x["created"], reverse=True)
    
    return {"archives": archives}


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket connection for real-time updates"""
    await manager.connect(websocket)
    
    try:
        # Send initial status
        if orchestrator:
            status = orchestrator.get_project_status()
            await websocket.send_json({
                "type": "status_update",
                "data": status
            })
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Echo back for now
            await websocket.send_text(f"Echo: {data}")
            
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)


# Background tasks
async def monitor_system():
    """Monitor system and send updates"""
    while True:
        try:
            if orchestrator:
                # Check for completed tasks
                for task in orchestrator.tasks.values():
                    if task.status == TaskStatus.COMPLETED and not task.output:
                        # Task needs processing
                        await process_completed_task(task.id)
                
                # Send status update
                status = orchestrator.get_project_status()
                await manager.broadcast({
                    "type": "status_update",
                    "data": status
                })
            
            await asyncio.sleep(2)  # Update every 2 seconds
            
        except Exception as e:
            print(f"Monitor error: {e}")
            await asyncio.sleep(5)


async def process_requirement_tasks(requirement_id: str):
    """Process tasks for a requirement"""
    if not orchestrator or not agent_bridge:
        return
    
    # Find tasks for this requirement
    requirement_tasks = [
        task for task in orchestrator.tasks.values()
        if requirement_id in task.description
    ]
    
    # Sort tasks by priority (dependencies)
    requirement_tasks.sort(key=lambda t: t.priority, reverse=True)
    
    # Store results for passing between agents
    task_results = {}
    
    # Keep processing until all tasks are complete
    while any(t.status != TaskStatus.COMPLETED for t in requirement_tasks):
        # Process tasks in dependency order
        task_processed = False
        for task in requirement_tasks:
            # Skip if task is not ready (dependencies not met)
            if task.status != TaskStatus.ASSIGNED:
                continue
            
            # Check dependencies are completed
            deps_met = True
            for dep_id in task.dependencies:
                dep_task = next((t for t in requirement_tasks if t.id == dep_id), None)
                if not dep_task or dep_task.status != TaskStatus.COMPLETED:
                    deps_met = False
                    break
            
            if not deps_met:
                continue
            
            if task.assigned_to:
                # Build context with previous task results
                context = {
                    "requirement_id": requirement_id,
                    "priority": task.priority
                }
                
                # Add implementer result to validator context
                if "validator" in task.assigned_to:
                    implementer_tasks = [t for t in requirement_tasks if "implementer" in t.assigned_to]
                    if implementer_tasks:
                        impl_task = implementer_tasks[0]
                        if impl_task.id in task_results:
                            context["implementer_result"] = task_results[impl_task.id]
                
                # Update agent status to working
                if task.assigned_to in orchestrator.agents:
                    agent = orchestrator.agents[task.assigned_to]
                    agent.status = "working"
                    agent.current_task = task.id
                    
                    # Broadcast agent status update
                    await manager.broadcast({
                        "type": "agent_activity",
                        "data": {
                            "agent_id": agent.id,
                            "status": "working",
                            "activity": f"Processing: {task.description[:50]}..."
                        }
                    })
                
                # Execute with real agent
                result = await agent_bridge.execute_task(
                    task.assigned_to,
                    {
                        "id": task.id,
                        "description": task.description,
                        "context": context
                    }
                )
                
                # Store result for other agents IMMEDIATELY
                task_results[task.id] = result
                
                # If this was an implementer task, make sure validator gets the result
                if "implementer" in task.assigned_to:
                    # Find any validator tasks waiting for this result
                    validator_tasks = [t for t in requirement_tasks 
                                     if "validator" in t.assigned_to and t.status == TaskStatus.ASSIGNED]
                    for val_task in validator_tasks:
                        # Update their context with the implementer result
                        print(f"📤 Passing implementer result to validator task {val_task.id}")
                        # The validator will get this in its next execution
                
                # Update task with result
                if result["success"]:
                    task.output = result
                    task.status = TaskStatus.COMPLETED
                    task.completed_at = datetime.now()
                    
                    # Update agent status back to ready
                    if task.assigned_to in orchestrator.agents:
                        agent = orchestrator.agents[task.assigned_to]
                        agent.status = "ready"
                        agent.current_task = None
                        
                        # Broadcast agent status update
                        await manager.broadcast({
                            "type": "agent_activity",
                            "data": {
                                "agent_id": agent.id,
                                "status": "ready",
                                "activity": f"Completed: {task.description[:50]}..."
                            }
                        })
                    
                    # Broadcast completion
                    await manager.broadcast({
                        "type": "task_completed",
                        "data": {
                            "task_id": task.id,
                            "agent": task.assigned_to,
                            "output": result
                        }
                    })
                    
                    # Check if any tasks now have their dependencies met
                    # This ensures sequential processing
                    task_processed = True
                    break  # Process one task at a time
        
        # If no task was processed, wait a bit before trying again
        if not task_processed:
            await asyncio.sleep(1)


async def process_completed_task(task_id: str):
    """Process a completed task"""
    # Placeholder for additional processing
    pass


# Mount static files if dashboard exists
dashboard_path = Path(__file__).parent / "dashboard"
if dashboard_path.exists():
    app.mount("/static", StaticFiles(directory=str(dashboard_path)), name="static")

# Add individual static file routes for CSS and JS
@app.get("/styles.css")
async def get_styles():
    css_path = dashboard_path / "styles.css"
    if css_path.exists():
        response = FileResponse(css_path, media_type="text/css")
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response
    raise HTTPException(status_code=404, detail="CSS file not found")

@app.get("/script.js")
async def get_script():
    js_path = dashboard_path / "script.js"
    if js_path.exists():
        return FileResponse(js_path, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="JS file not found")


# Settings storage
settings_store = {}

@app.post("/api/settings")
async def save_settings(settings: Dict[str, Any]):
    """Save user settings including API keys"""
    global settings_store
    settings_store = settings
    
    # Also save to a file for persistence
    settings_file = Path("settings.json")
    with open(settings_file, "w") as f:
        json.dump(settings, f, indent=2)
    
    # Update agent bridge with new API keys
    if agent_bridge:
        if "openai_key" in settings:
            os.environ["OPENAI_API_KEY"] = settings["openai_key"]
        if "anthropic_key" in settings:
            os.environ["ANTHROPIC_API_KEY"] = settings["anthropic_key"]
        if "deepseek_key" in settings:
            os.environ["DEEPSEEK_API_KEY"] = settings["deepseek_key"]
    
    return {"status": "success", "message": "Settings saved"}

@app.get("/api/settings")
async def get_settings():
    """Get saved settings"""
    # Try to load from file first
    settings_file = Path("settings.json")
    if settings_file.exists():
        with open(settings_file, "r") as f:
            return json.load(f)
    return settings_store


@app.get("/api/workspace/files")
async def get_workspace_files():
    """Get files from workspace directories with execution metadata"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    workspace_path = Path(orchestrator.project_path) / "workspace"
    files = []
    
    if workspace_path.exists():
        for file_path in workspace_path.rglob("*"):
            if file_path.is_file() and not file_path.name.startswith('.'):
                # Get file stats
                stat = file_path.stat()
                
                # Determine file type icon
                suffix = file_path.suffix.lower()
                if suffix in ['.py']:
                    icon = '🐍'
                elif suffix in ['.js', '.ts']:
                    icon = '📜'
                elif suffix in ['.html', '.htm']:
                    icon = '🌐'
                elif suffix in ['.css']:
                    icon = '🎨'
                elif suffix in ['.json']:
                    icon = '📋'
                else:
                    icon = '📄'
                
                # Count lines for text files
                lines = 0
                try:
                    if suffix in ['.py', '.js', '.ts', '.html', '.css', '.json', '.txt', '.md']:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            lines = sum(1 for _ in f)
                except:
                    lines = 0
                
                relative_path = file_path.relative_to(workspace_path)
                
                # Look for execution metadata from validator tasks
                execution_metadata = None
                for task in orchestrator.tasks.values():
                    if (task.assigned_to == "claude2_validator" and 
                        task.status == TaskStatus.COMPLETED and 
                        task.output and 
                        task.output.get("success")):
                        
                        # Check if this validator task was for this file
                        response = task.output.get("response", "")
                        if isinstance(response, str):
                            try:
                                import json as json_lib
                                response_data = json_lib.loads(response)
                                if "execution_metadata" in response_data:
                                    execution_metadata = response_data["execution_metadata"]
                                    break
                            except:
                                pass
                        elif isinstance(response, dict) and "execution_metadata" in response:
                            execution_metadata = response["execution_metadata"]
                            break
                
                file_data = {
                    "name": file_path.name,
                    "path": str(relative_path),
                    "full_path": str(file_path),
                    "size": stat.st_size,
                    "lines": lines,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "icon": icon,
                    "type": suffix[1:] if suffix else "file"
                }
                
                # Add execution metadata if available
                if execution_metadata:
                    file_data["execution"] = execution_metadata
                
                files.append(file_data)
    
    # Sort by modification time (newest first)
    files.sort(key=lambda x: x["modified"], reverse=True)
    
    return {"files": files}


@app.get("/api/workspace/files/{file_path:path}")
async def get_workspace_file(file_path: str):
    """Get content of a specific workspace file"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    full_path = Path(orchestrator.project_path) / "workspace" / file_path
    
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check - ensure file is within workspace
    try:
        full_path.resolve().relative_to(Path(orchestrator.project_path) / "workspace")
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        with open(full_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {
            "path": file_path,
            "content": content,
            "size": full_path.stat().st_size,
            "modified": datetime.fromtimestamp(full_path.stat().st_mtime).isoformat()
        }
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File is not text-readable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")


@app.post("/api/workspace/run/{file_path:path}")
async def run_workspace_file(file_path: str):
    """Run a workspace file using AI-determined execution metadata"""
    if not orchestrator:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")
    
    full_path = Path(orchestrator.project_path) / "workspace" / file_path
    
    if not full_path.exists() or not full_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Security check - ensure file is within workspace
    try:
        full_path.resolve().relative_to(Path(orchestrator.project_path) / "workspace")
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Get execution metadata from validator tasks
        execution_metadata = None
        for task in orchestrator.tasks.values():
            if (task.assigned_to == "claude2_validator" and 
                task.status == TaskStatus.COMPLETED and 
                task.output and 
                task.output.get("success")):
                
                response = task.output.get("response", "")
                if isinstance(response, str):
                    try:
                        import json as json_lib
                        response_data = json_lib.loads(response)
                        if "execution_metadata" in response_data:
                            execution_metadata = response_data["execution_metadata"]
                            break
                    except:
                        pass
                elif isinstance(response, dict) and "execution_metadata" in response:
                    execution_metadata = response["execution_metadata"]
                    break
        
        # Use AI-determined execution parameters or fallback
        if execution_metadata:
            port = execution_metadata.get("port", 8000)
            command = execution_metadata.get("command", f"python3 {full_path.name}")
            url = execution_metadata.get("url", f"http://localhost:{port}")
            startup_time = execution_metadata.get("startup_time", 2)
        else:
            # Fallback to heuristic analysis
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            port = 8000
            if 'uvicorn.run' in content:
                if 'port=' in content:
                    import re
                    port_match = re.search(r'port=(\d+)', content)
                    if port_match:
                        port = int(port_match.group(1))
            
            command = f"python3 {full_path.name}"
            url = f"http://localhost:{port}"
            startup_time = 2
        
        # Kill any existing process on this port
        try:
            import psutil
            for proc in psutil.process_iter(['pid', 'name', 'connections']):
                try:
                    connections = proc.info['connections']
                    if connections:
                        for conn in connections:
                            if conn.laddr.port == port:
                                proc.terminate()
                                break
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
        except ImportError:
            # psutil not available, use simpler approach
            subprocess.run(f"lsof -ti:{port} | xargs kill -9", 
                         shell=True, capture_output=True)
        
        # Start the application using AI-determined command
        import subprocess
        import threading
        
        def run_app():
            try:
                subprocess.run([
                    "python3", str(full_path)
                ], cwd=str(full_path.parent), check=True)
            except subprocess.CalledProcessError as e:
                print(f"Application exited with error: {e}")
        
        # Start in background thread
        thread = threading.Thread(target=run_app, daemon=True)
        thread.start()
        
        # Wait for AI-determined startup time
        import time
        time.sleep(startup_time)
        
        return {
            "success": True,
            "message": f"Started {file_path}",
            "url": url,
            "port": port,
            "command": command,
            "startup_time": startup_time,
            "ai_determined": execution_metadata is not None
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api_server:app",
        host="0.0.0.0",
        port=8100,
        reload=True,
        log_level="info"
    )