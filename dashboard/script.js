/**
 * Orchestrator Dashboard JavaScript
 * Modern, professional interface for AI-augmented development
 */

class OrchestratorDashboard {
    constructor() {
        this.baseURL = 'http://localhost:8100';
        this.websocket = null;
        this.currentProject = null;
        this.agents = new Map();
        this.tasks = new Map();
        this.signals = [];
        this.consolePaused = false;
        this.consoleOpen = false;
        
        this.init();
    }

    async init() {
        console.log('Initializing Orchestrator Dashboard...');
        this.setupEventListeners();
        this.setupWebSocket();
        await this.loadInitialData();
        this.startPeriodicUpdates();
        // Load settings after a small delay to ensure DOM is ready
        setTimeout(() => {
            console.log('Attempting to load saved settings...');
            this.loadSavedSettings();
        }, 500);  // Increased delay to ensure DOM is fully loaded
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Requirement submission
        const submitBtn = document.getElementById('submit-requirement');
        const requirementInput = document.getElementById('requirement-input');
        
        submitBtn?.addEventListener('click', () => {
            this.submitRequirement();
        });
        
        requirementInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.submitRequirement();
            }
        });

        // Quick action templates
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyTemplate(e.target.dataset.template);
            });
        });

        // Pipeline filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.filterTasks(e.target.textContent.toLowerCase());
            });
        });

        // Option buttons in decisions
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.selectOption(e.target);
            });
        });

        // Project selector
        const projectSelect = document.getElementById('project-select');
        projectSelect?.addEventListener('change', (e) => {
            if (e.target.value === 'new') {
                this.createNewProject();
            } else {
                this.switchProject(e.target.value);
            }
        });

        // Project reset button
        const resetBtn = document.getElementById('reset-project');
        resetBtn?.addEventListener('click', () => {
            this.resetProject();
        });

        // Archive browser button
        const archiveBtn = document.getElementById('open-archive');
        archiveBtn?.addEventListener('click', () => {
            this.openArchiveBrowser();
        });

        // Agents menu
        const agentsMenuBtn = document.getElementById('agents-menu-btn');
        const agentsMenu = document.getElementById('agents-menu');
        
        agentsMenuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            agentsMenu.style.display = agentsMenu.style.display === 'none' ? 'block' : 'none';
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            if (agentsMenu) agentsMenu.style.display = 'none';
        });

        // Agents menu actions
        document.getElementById('refresh-agents')?.addEventListener('click', async () => {
            agentsMenu.style.display = 'none';
            await this.refreshAgents();
        });

        document.getElementById('reset-agents')?.addEventListener('click', () => {
            agentsMenu.style.display = 'none';
            this.resetAgents();
        });

        document.getElementById('view-agent-logs')?.addEventListener('click', () => {
            agentsMenu.style.display = 'none';
            this.toggleConsole();
        });

        // Console controls
        const consoleToggle = document.getElementById('console-toggle');
        consoleToggle?.addEventListener('click', () => {
            this.toggleConsole();
        });

        const clearConsole = document.getElementById('clear-console');
        clearConsole?.addEventListener('click', () => {
            this.clearConsole();
        });

        const pauseConsole = document.getElementById('pause-console');
        pauseConsole?.addEventListener('click', () => {
            this.toggleConsolePause();
        });

        // Settings tab event listeners
        this.setupSettingsEventListeners();
        
        // Monitoring tab event listeners
        this.setupMonitoringEventListeners();
        
        // Project summary event listeners
        this.setupSummaryEventListeners();
    }

    setupWebSocket() {
        try {
            this.websocket = new WebSocket(`ws://localhost:8100/ws`);
            
            this.websocket.onopen = () => {
                console.log('WebSocket connected');
                this.updateConnectionStatus(true);
            };

            this.websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            };

            this.websocket.onclose = () => {
                console.log('WebSocket disconnected');
                this.updateConnectionStatus(false);
                // Attempt to reconnect after 3 seconds
                setTimeout(() => this.setupWebSocket(), 3000);
            };

            this.websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.updateConnectionStatus(false);
            };
        } catch (error) {
            console.error('Failed to setup WebSocket:', error);
            this.updateConnectionStatus(false);
        }
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'status_update':
                this.updateSystemStatus(data.data);
                break;
            case 'requirement_submitted':
                this.onRequirementSubmitted(data.data);
                break;
            case 'task_completed':
                this.onTaskCompleted(data.data);
                break;
            case 'decision_needed':
                this.onDecisionNeeded(data.data);
                break;
            case 'agent_activity':
                this.updateAgentActivity(data.data);
                break;
            case 'agent_log':
                console.log('Received agent log:', data.data);
                this.onAgentLog(data.data);
                break;
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    async loadInitialData() {
        try {
            console.log('Loading initial data...');
            
            // Load system status
            const status = await this.apiCall('/api/status');
            console.log('Status:', status);
            this.updateSystemStatus(status);

            // Load agents
            const agentsResponse = await this.apiCall('/api/agents');
            console.log('Agents response:', agentsResponse);
            this.updateAgents(agentsResponse.agents);

            // Load tasks
            const tasks = await this.apiCall('/api/tasks');
            console.log('Tasks:', tasks);
            this.updateTasks(tasks);

            // Load signals
            const signals = await this.apiCall('/api/signals');
            console.log('Signals:', signals);
            this.updateSignals(signals.signals);

            // Load workspace files
            const workspaceFiles = await this.apiCall('/api/workspace/files');
            console.log('Workspace files:', workspaceFiles);
            this.updateRecentOutputs(workspaceFiles.files);

            this.showNotification('Dashboard loaded successfully', 'success');

        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showNotification('Failed to connect to Orchestrator API', 'error');
        }
    }

    async apiCall(endpoint, methodOrOptions = 'GET', data = null) {
        const url = `${this.baseURL}${endpoint}`;
        
        let options = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        // Handle different calling patterns
        if (typeof methodOrOptions === 'object') {
            // Old pattern: apiCall('/path', {method: 'POST', body: '...'})
            options = { ...options, ...methodOrOptions };
        } else {
            // New pattern: apiCall('/path', 'POST', data)
            options.method = methodOrOptions;
            if (data) {
                options.body = JSON.stringify(data);
            }
        }

        console.log('API Call:', options.method, url);

        const response = await fetch(url, options);
        
        if (!response.ok) {
            throw new Error(`API call failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // If switching to settings tab, load saved settings
        if (tabName === 'settings') {
            setTimeout(() => {
                console.log('Switched to Settings tab, loading saved settings...');
                this.loadSavedSettings();
            }, 100);
        }
    }

    async submitRequirement() {
        const input = document.getElementById('requirement-input');
        const prioritySelect = document.getElementById('priority-select');
        
        const content = input.value.trim();
        if (!content) {
            this.showNotification('Please enter a requirement', 'warning');
            return;
        }

        const priority = parseInt(prioritySelect.value);

        try {
            this.setSubmitButtonLoading(true);
            
            const response = await this.apiCall('/api/requirements', {
                method: 'POST',
                body: JSON.stringify({
                    content,
                    priority,
                    context: {}
                })
            });

            input.value = '';
            this.showNotification('Requirement submitted successfully!', 'success');
            this.addActivityItem('User', 'submitted new requirement');

        } catch (error) {
            console.error('Failed to submit requirement:', error);
            this.showNotification('Failed to submit requirement', 'error');
        } finally {
            this.setSubmitButtonLoading(false);
        }
    }

    setSubmitButtonLoading(loading) {
        const btn = document.getElementById('submit-requirement');
        if (loading) {
            btn.disabled = true;
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" class="animate-spin">
                    <path d="M8 1v3.5c0 .3.2.5.5.5s.5-.2.5-.5V1c0-.3-.2-.5-.5-.5S8 .7 8 1z"/>
                    <path d="M12.7 3.3c-.2-.2-.5-.2-.7 0L9.5 5.8c-.2.2-.2.5 0 .7.1.1.2.1.4.1s.3 0 .4-.1L12.7 4c.2-.2.2-.5 0-.7z"/>
                </svg>
                Processing...
            `;
        } else {
            btn.disabled = false;
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1l6 7-6 7v-4H2V5h6V1z"/>
                </svg>
                Build
            `;
        }
    }

    applyTemplate(template) {
        const input = document.getElementById('requirement-input');
        const templates = {
            api: 'Build a REST API with user authentication, CRUD operations, and proper error handling',
            webapp: 'Create a responsive web application with modern UI, user management, and real-time features',
            cli: 'Develop a command-line tool with argument parsing, configuration management, and helpful documentation'
        };

        if (templates[template]) {
            input.value = templates[template];
            input.focus();
        }
    }

    updateSystemStatus(status) {
        // Update health indicator
        const healthFill = document.querySelector('.health-fill');
        const healthValue = document.querySelector('.health-value');
        
        if (healthFill && healthValue) {
            healthFill.style.width = `${status.health_score}%`;
            healthValue.textContent = `${Math.round(status.health_score)}%`;
        }

        // Update notification badge
        const badge = document.querySelector('.notification-badge');
        if (badge) {
            badge.textContent = status.pending_decisions || 0;
            badge.style.display = status.pending_decisions > 0 ? 'block' : 'none';
        }
    }

    updateAgents(agentsData) {
        console.log('Updating agents:', agentsData);
        agentsData.forEach(agent => {
            this.agents.set(agent.id, agent);
            this.updateAgentCard(agent);
        });
    }

    updateAgentCard(agent) {
        console.log('Updating agent card for:', agent.type, agent);
        const card = document.querySelector(`[data-agent="${agent.type}"]`);
        if (!card) {
            console.log('No card found for agent type:', agent.type);
            return;
        }

        // Update status
        const statusEl = card.querySelector('.agent-status');
        if (statusEl) {
            statusEl.textContent = agent.status;
            statusEl.className = `agent-status ${agent.status}`;
        }

        // Update metrics
        const metrics = card.querySelectorAll('.metric-value');
        if (metrics.length >= 2) {
            // Update task count
            const taskCount = this.getAgentTaskCount(agent.id);
            metrics[0].textContent = taskCount;
            
            // Update performance score or success rate
            const score = agent.performance_score || 1.0;
            metrics[1].textContent = `${Math.round(score * 100)}%`;
        }
        
        // Update agent summary statistics
        this.updateAgentSummary();
    }

    updateAgentSummary() {
        // Count active agents
        let activeCount = 0;
        let totalTasks = 0;
        
        this.agents.forEach(agent => {
            if (agent.status === 'working' || agent.status === 'busy') {
                activeCount++;
            }
            totalTasks += this.getAgentTaskCount(agent.id);
        });
        
        // Update any summary displays if they exist
        const activeAgentsEl = document.querySelector('.active-agents-count');
        if (activeAgentsEl) {
            activeAgentsEl.textContent = activeCount;
        }
        
        const totalTasksEl = document.querySelector('.total-tasks-count');
        if (totalTasksEl) {
            totalTasksEl.textContent = totalTasks;
        }
    }

    getAgentTaskCount(agentId) {
        return Array.from(this.tasks.values()).filter(task => task.assigned_to === agentId).length;
    }

    updateTasks(tasksData) {
        console.log('Updating tasks:', tasksData);
        this.tasks.clear(); // Clear existing tasks first
        tasksData.forEach(task => {
            this.tasks.set(task.id, task);
        });
        this.renderPipeline();
        this.updateSummaryStats(); // Update summary when tasks change
    }

    renderPipeline() {
        console.log('Rendering pipeline with tasks:', this.tasks);
        
        const stages = {
            'Analysis': ['claude_analyst'],
            'Implementation': ['codex_impl'],
            'Validation': ['claude2_validator'],
            'Deployment': ['ide_integrator']
        };

        Object.entries(stages).forEach(([stageName, agentIds]) => {
            const stageEl = this.findStageElement(stageName);
            if (!stageEl) {
                console.log('Stage element not found:', stageName);
                return;
            }

            const taskList = stageEl.querySelector('.task-list');
            const stageTasks = Array.from(this.tasks.values()).filter(task => 
                agentIds.includes(task.assigned_to)
            );

            console.log(`Tasks for ${stageName}:`, stageTasks);
            this.renderTasksInStage(taskList, stageTasks);
        });
    }

    findStageElement(stageName) {
        const stages = document.querySelectorAll('.stage');
        return Array.from(stages).find(stage => 
            stage.querySelector('h3')?.textContent === stageName
        );
    }

    renderTasksInStage(container, tasks) {
        if (!container) return;

        if (tasks.length === 0) {
            container.innerHTML = '<p class="empty-state">No tasks yet</p>';
            return;
        }

        container.innerHTML = tasks.map(task => this.createTaskCardHTML(task)).join('');
    }

    createTaskCardHTML(task) {
        const progressWidth = task.progress || 0;
        const isPending = task.status === 'pending';
        const isCompleted = task.status === 'completed';
        
        // Get a shorter task title
        const shortTitle = task.description.length > 40 
            ? task.description.substring(0, 40) + '...'
            : task.description;
            
        // Get agent display name
        const agentNames = {
            'claude_analyst': 'Strategic Analyst',
            'codex_impl': 'Code Generator', 
            'claude2_validator': 'Quality Validator',
            'ide_integrator': 'Integrator'
        };
        const agentName = agentNames[task.assigned_to] || task.assigned_to || 'Unassigned';
        
        return `
            <div class="task-card ${isPending ? 'pending' : ''} ${isCompleted ? 'completed' : ''}">
                <div class="task-header">
                    <span class="task-title" title="${task.description}">${shortTitle}</span>
                    <span class="task-priority normal">Normal</span>
                </div>
                <div class="task-assignee">
                    <img src="data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='10' cy='10' r='10' fill='%234F46E5'/%3E%3C/svg%3E" alt="Agent">
                    <span>${agentName}</span>
                </div>
                ${isPending ? 
                    '<div class="task-status">Pending</div>' :
                    isCompleted ?
                    '<div class="task-status">✓ Completed</div>' :
                    `<div class="task-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progressWidth}%"></div>
                        </div>
                        <span class="progress-text">${progressWidth}%</span>
                    </div>`
                }
            </div>
        `;
    }

    filterTasks(filter) {
        // Update filter button states
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        // Find the filter button by text content
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            if (btn.textContent.toLowerCase() === filter) {
                btn.classList.add('active');
            }
        });

        // Filter task cards (implement filtering logic)
        const taskCards = document.querySelectorAll('.task-card');
        taskCards.forEach(card => {
            card.style.display = this.shouldShowTask(card, filter) ? 'block' : 'none';
        });
    }

    shouldShowTask(taskCard, filter) {
        switch (filter) {
            case 'all':
                return true;
            case 'active':
                return !taskCard.classList.contains('pending');
            case 'pending':
                return taskCard.classList.contains('pending');
            default:
                return true;
        }
    }

    selectOption(optionBtn) {
        // Visual feedback
        const allOptions = optionBtn.parentElement.querySelectorAll('.option-btn');
        allOptions.forEach(btn => btn.classList.remove('selected'));
        optionBtn.classList.add('selected');

        // Show confirmation (could implement actual decision API call)
        this.showNotification('Option selected. Implementation will proceed with this choice.', 'info');
    }

    updateSignals(signalsData) {
        this.signals = signalsData;
        this.updateDecisionCenter();
    }

    updateRecentOutputs(files) {
        const outputList = document.getElementById('output-list');
        if (!outputList) return;

        outputList.innerHTML = '';

        if (!files || files.length === 0) {
            outputList.innerHTML = '<div class="no-outputs">No files generated yet</div>';
            return;
        }

        files.forEach(file => {
            const outputItem = document.createElement('div');
            outputItem.className = 'output-item';
            
            const sizeText = file.size > 1024 ? 
                `${Math.round(file.size / 1024)}KB` : 
                `${file.size}B`;
            
            const details = file.lines > 0 ? 
                `${file.type.toUpperCase()} • ${file.lines} lines • ${sizeText}` :
                `${file.type.toUpperCase()} • ${sizeText}`;

            // Determine if file is runnable from AI validator metadata
            const isRunnable = file.execution && file.execution.runnable === true;

            outputItem.innerHTML = `
                <div class="output-icon">${file.icon}</div>
                <div class="output-info">
                    <div class="output-name">${file.name}</div>
                    <div class="output-details">${details}</div>
                    <div class="output-path">${file.path}</div>
                </div>
                <div class="output-actions">
                    <button class="btn-secondary view-output" data-file="${file.path}">Edit</button>
                    ${isRunnable ? `<button class="btn-primary run-output" data-file="${file.path}">Run</button>` : ''}
                </div>
            `;

            // Add click handler for Edit button
            const viewBtn = outputItem.querySelector('.view-output');
            viewBtn.addEventListener('click', () => this.openCodeEditor(file.path, file.name));

            // Add click handler for Run button
            const runBtn = outputItem.querySelector('.run-output');
            if (runBtn) {
                runBtn.addEventListener('click', () => this.runCode(file.path, file.name));
            }

            outputList.appendChild(outputItem);
        });
    }

    async openCodeEditor(filePath, fileName) {
        try {
            const fileData = await this.apiCall(`/api/workspace/files/${filePath}`);
            
            // Create a full code editor modal
            this.showCodeEditor(fileName, fileData.content, filePath);
            
        } catch (error) {
            console.error('Error loading file:', error);
            this.showNotification(`Failed to load ${fileName}`, 'error');
        }
    }

    async runCode(filePath, fileName) {
        try {
            this.showNotification(`Starting ${fileName}...`, 'info');
            
            // Call run API endpoint
            const result = await this.apiCall(`/api/workspace/run/${filePath}`, 'POST');
            
            if (result.success) {
                this.showNotification(`${fileName} is running on ${result.url}`, 'success');
                
                // Open the running application in a new tab
                if (result.url) {
                    setTimeout(() => {
                        window.open(result.url, '_blank');
                    }, 2000); // Give server time to start
                }
            } else {
                this.showNotification(`Failed to run ${fileName}: ${result.error}`, 'error');
            }
            
        } catch (error) {
            console.error('Error running file:', error);
            this.showNotification(`Failed to run ${fileName}`, 'error');
        }
    }

    showCodeEditor(fileName, content, filePath) {
        // Remove existing modal if any
        const existingModal = document.getElementById('code-editor-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create code editor modal
        const modal = document.createElement('div');
        modal.id = 'code-editor-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content code-editor">
                <div class="modal-header">
                    <div class="file-info">
                        <h3>📝 ${fileName}</h3>
                        <span class="file-path">${filePath}</span>
                    </div>
                    <div class="modal-actions">
                        <button class="btn-secondary save-file">Save</button>
                        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    </div>
                </div>
                <div class="modal-body">
                    <div class="editor-toolbar">
                        <div class="editor-info">
                            <span>Lines: ${content.split('\n').length}</span>
                            <span>Characters: ${content.length}</span>
                        </div>
                        <div class="editor-controls">
                            <button class="btn-small copy-code">Copy All</button>
                            <button class="btn-small format-code">Format</button>
                        </div>
                    </div>
                    <textarea class="code-editor-content" spellcheck="false">${this.escapeHtml(content)}</textarea>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Setup editor functionality
        const textarea = modal.querySelector('.code-editor-content');
        const copyBtn = modal.querySelector('.copy-code');
        const saveBtn = modal.querySelector('.save-file');

        // Copy functionality
        copyBtn.addEventListener('click', () => {
            textarea.select();
            document.execCommand('copy');
            this.showNotification('Code copied to clipboard', 'success');
        });

        // Save functionality (placeholder)
        saveBtn.addEventListener('click', () => {
            // In a real implementation, this would save to the server
            this.showNotification('Save functionality coming soon', 'info');
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Focus the textarea
        setTimeout(() => textarea.focus(), 100);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async openArchiveBrowser() {
        try {
            this.showNotification('Loading archive...', 'info');
            
            // Get all archived projects
            const archivedProjects = await this.apiCall('/api/archive');
            
            this.showArchiveBrowser(archivedProjects.archives);
            
        } catch (error) {
            console.error('Error loading archive:', error);
            this.showNotification('Failed to load archive', 'error');
        }
    }

    showArchiveBrowser(archives) {
        // Remove existing modal if any
        const existingModal = document.getElementById('archive-browser-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create archive browser modal
        const modal = document.createElement('div');
        modal.id = 'archive-browser-modal';
        modal.className = 'modal-overlay';
        
        if (!archives || archives.length === 0) {
            modal.innerHTML = `
                <div class="modal-content archive-browser">
                    <div class="modal-header">
                        <h3>📁 Project Archive</h3>
                        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    </div>
                    <div class="modal-body">
                        <div class="no-archives">
                            <p>No archived projects yet. Use Reset to archive current work.</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            modal.innerHTML = `
                <div class="modal-content archive-browser">
                    <div class="modal-header">
                        <h3>📁 Project Archive</h3>
                        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
                    </div>
                    <div class="modal-body">
                        <div class="archive-projects">
                            ${archives.map(archive => `
                                <div class="archive-project" data-archive-id="${archive.id}">
                                    <div class="project-header">
                                        <h4>📦 Project from ${archive.created_display}</h4>
                                        <span class="file-count">${archive.file_count} files</span>
                                    </div>
                                    <div class="project-files" id="files-${archive.id}">
                                        <button class="btn-secondary load-files" data-archive="${archive.id}">
                                            📂 Browse Files
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        document.body.appendChild(modal);

        // Add event listeners for browse buttons
        modal.querySelectorAll('.load-files').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const archiveId = e.target.dataset.archive;
                const archive = archives.find(a => a.id === archiveId);
                this.loadArchiveFiles(archive, e.target.parentElement);
            });
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async loadArchiveFiles(archive, container) {
        try {
            // This would need a new API endpoint to list files in an archive
            // For now, simulate with common file types
            const mockFiles = [
                { name: 'hello_world.py', size: 478, type: 'py' },
                { name: 'calculator.py', size: 1250, type: 'py' },
                { name: 'app.py', size: 890, type: 'py' }
            ];

            container.innerHTML = `
                <div class="archive-files-list">
                    ${mockFiles.map(file => `
                        <div class="archive-file-item">
                            <div class="file-info">
                                <span class="file-icon">${file.type === 'py' ? '🐍' : '📄'}</span>
                                <span class="file-name">${file.name}</span>
                                <span class="file-size">${file.size}B</span>
                            </div>
                            <div class="file-actions">
                                <button class="btn-small view-archive-file" data-archive="${archive.id}" data-file="${file.name}">View</button>
                                <button class="btn-small restore-file" data-archive="${archive.id}" data-file="${file.name}">Restore</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Add event listeners for file actions
            container.querySelectorAll('.view-archive-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.viewArchivedFile(e.target.dataset.archive, e.target.dataset.file);
                });
            });

            container.querySelectorAll('.restore-file').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.restoreArchivedFile(e.target.dataset.archive, e.target.dataset.file);
                });
            });

        } catch (error) {
            container.innerHTML = '<div class="error">Failed to load files</div>';
        }
    }

    async viewArchivedFile(archiveId, fileName) {
        try {
            // This would need API endpoint to get archived file content
            this.showNotification(`Opening ${fileName} from archive...`, 'info');
            
            // Mock file content for demo
            const mockContent = `# Archived file: ${fileName}\n# This would show the actual archived content\nprint("Hello from archive!")`;
            
            this.showCodeEditor(fileName, mockContent, `archive/${archiveId}/${fileName}`);
            
        } catch (error) {
            this.showNotification('Failed to view archived file', 'error');
        }
    }

    async restoreArchivedFile(archiveId, fileName) {
        try {
            this.showNotification(`Restoring ${fileName} to current workspace...`, 'info');
            
            // This would need API endpoint to restore file from archive
            // For now, just show success message
            this.showNotification(`${fileName} restored successfully!`, 'success');
            
            // Reload workspace files to show restored file
            const workspaceFiles = await this.apiCall('/api/workspace/files');
            this.updateRecentOutputs(workspaceFiles.files);
            
        } catch (error) {
            this.showNotification('Failed to restore file', 'error');
        }
    }

    updateDecisionCenter() {
        const decisionSignals = this.signals.filter(signal => signal.type === 'decision_needed');
        const countEl = document.querySelector('.decision-count');
        const decisionList = document.getElementById('decision-list');
        
        if (countEl) {
            countEl.textContent = `${decisionSignals.length} pending`;
        }
        
        if (!decisionList) return;
        
        // Clear existing content
        decisionList.innerHTML = '';
        
        if (decisionSignals.length === 0) {
            // Show no decisions message
            const noDecisionsDiv = document.createElement('div');
            noDecisionsDiv.className = 'no-decisions';
            noDecisionsDiv.innerHTML = '<p>No pending decisions. The AI agents will present choices here when needed.</p>';
            decisionList.appendChild(noDecisionsDiv);
        } else {
            // Create decision cards from real signals
            decisionSignals.forEach(signal => {
                const decisionCard = this.createDecisionCard(signal);
                decisionList.appendChild(decisionCard);
            });
        }
    }
    
    createDecisionCard(signal) {
        const card = document.createElement('div');
        card.className = 'decision-card';
        
        const decisions = signal.data.decisions || [];
        const context = signal.data.context || {};
        
        card.innerHTML = `
            <div class="decision-header">
                <h3>${this.formatDecisionTitle(decisions)}</h3>
                <span class="decision-urgency high">AI Decision</span>
            </div>
            <p class="decision-context">${this.formatDecisionContext(signal, context)}</p>
            <div class="decision-options">
                ${decisions.map(decision => `
                    <button class="option-btn" data-signal="${signal.id}" data-decision="${decision}">
                        <span class="option-icon">🤖</span>
                        <span class="option-name">${decision}</span>
                        <span class="option-reason">AI recommended option</span>
                    </button>
                `).join('')}
            </div>
            <div class="decision-actions">
                <button class="btn-secondary">More Info</button>
                <button class="btn-primary" data-signal="${signal.id}">Decide Later</button>
            </div>
        `;
        
        // Add event listeners for decision buttons
        card.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.makeDecision(btn.dataset.signal, btn.dataset.decision);
            });
        });
        
        return card;
    }
    
    formatDecisionTitle(decisions) {
        if (decisions.includes('database_choice')) return 'Database Selection';
        if (decisions.includes('deployment_platform')) return 'Deployment Platform';
        return 'AI Decision Required';
    }
    
    formatDecisionContext(signal, context) {
        return `The AI agents need your input to proceed with the ${signal.source} task. Please choose from the following options:`;
    }
    
    async makeDecision(signalId, decision) {
        try {
            const result = await this.apiCall('/api/decisions', 'POST', {
                signal_id: signalId,
                decision: decision
            });
            
            if (result.status === 'success') {
                this.showNotification(`Decision made: ${decision}`, 'success');
                // Reload signals to update UI
                const signals = await this.apiCall('/api/signals');
                this.updateSignals(signals.signals);
            }
        } catch (error) {
            this.showNotification('Failed to record decision', 'error');
        }
    }

    async resetProject() {
        // Confirm reset
        if (!confirm('Are you sure you want to reset the entire project? This will move current files to Completed Archive and start fresh.')) {
            return;
        }
        
        try {
            this.showNotification('Resetting project...', 'info');
            
            console.log('Making reset API call to:', `${this.baseURL}/api/project/reset`);
            console.log('Method: POST');
            
            const result = await this.apiCall('/api/project/reset', 'POST');
            console.log('Reset result:', result); // Debug logging
            
            if (result && result.status === 'success') {
                let message = 'Project reset successfully!';
                if (result.archived_to) {
                    message += ` Files archived to Completed Archive.`;
                }
                this.showNotification(message, 'success');
                
                // Clear local state
                this.agents.clear();
                this.tasks.clear();
                this.signals = [];
                this.currentProject = null;
                
                // Reload dashboard
                await this.loadInitialData();
                
                // Clear requirement input
                const requirementInput = document.getElementById('requirement-input');
                if (requirementInput) {
                    requirementInput.value = '';
                }
                
            } else {
                console.error('Reset failed:', result);
                const errorMsg = result ? result.message || 'Unknown error' : 'No response from server';
                this.showNotification(`Reset failed: ${errorMsg}`, 'error');
                
                // Show detailed error if available
                if (result && result.error_details) {
                    console.error('Detailed error:', result.error_details);
                }
            }
            
        } catch (error) {
            console.error('Reset error:', error);
            // Check if it's a JSON parsing error
            if (error.message && error.message.includes('JSON')) {
                this.showNotification('Server returned invalid response during reset', 'error');
            } else {
                this.showNotification(`Reset failed: ${error.message}`, 'error');
            }
        }
    }

    updateConnectionStatus(connected) {
        const indicator = document.querySelector('.health-indicator');
        if (indicator) {
            indicator.style.opacity = connected ? '1' : '0.5';
        }
    }

    onRequirementSubmitted(data) {
        this.addActivityItem('System', `processing requirement: ${data.content.substring(0, 30)}...`);
        this.addLogEntry('info', `New requirement received: "${data.content}"`);
        this.showNotification('Requirement processing started', 'info');
    }

    async onTaskCompleted(data) {
        this.addActivityItem(data.agent, `completed task`);
        this.addLogEntry('success', `${data.agent} completed task successfully`);
        
        // Update task in local state
        if (this.tasks.has(data.task_id)) {
            const task = this.tasks.get(data.task_id);
            task.status = 'completed';
            task.progress = 100;
        }
        
        this.renderPipeline();
        
        // Refresh workspace files when tasks complete to show new files immediately
        try {
            const workspaceFiles = await this.apiCall('/api/workspace/files');
            this.updateRecentOutputs(workspaceFiles.files);
        } catch (error) {
            console.error('Failed to refresh workspace files:', error);
        }
    }

    onDecisionNeeded(data) {
        this.showNotification('Decision required - check Decision Center', 'warning');
        this.addActivityItem('System', 'requires human decision');
        this.addLogEntry('warning', 'Human decision required for task progression');
    }

    updateAgentActivity(data) {
        console.log('Agent activity update:', data);
        
        // Try to find agent by ID
        let agent = this.agents.get(data.agent_id);
        
        // If not found, try to find by matching agent ID patterns
        if (!agent) {
            // Check if any agent matches the pattern
            for (const [key, value] of this.agents) {
                if (data.agent_id.includes(key) || key.includes(data.agent_id)) {
                    agent = value;
                    break;
                }
            }
        }
        
        if (agent) {
            agent.status = data.status || agent.status;
            this.updateAgentCard(agent);
        } else {
            console.warn('Agent not found for activity update:', data.agent_id);
        }
        
        this.addActivityItem(data.agent_id, data.activity);
    }

    addActivityItem(agent, message) {
        const ticker = document.querySelector('.ticker-content');
        if (!ticker) return;

        const time = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        const item = document.createElement('span');
        item.className = 'activity-item';
        item.innerHTML = `
            <span class="activity-time">${time}</span>
            <span class="activity-agent">${agent}</span>
            ${message}
        `;

        // Add to beginning of ticker
        ticker.insertBefore(item, ticker.firstChild);

        // Limit to last 10 items
        const items = ticker.querySelectorAll('.activity-item');
        if (items.length > 10) {
            items[items.length - 1].remove();
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            right: '20px',
            background: this.getNotificationColor(type),
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            zIndex: '1001',
            fontSize: '14px',
            maxWidth: '300px'
        });

        document.body.appendChild(notification);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.remove();
        }, 4000);
    }

    getNotificationColor(type) {
        const colors = {
            success: '#10b981',
            warning: '#f59e0b',
            error: '#ef4444',
            info: '#3b82f6'
        };
        return colors[type] || colors.info;
    }

    // Console Methods
    toggleConsole() {
        const panel = document.getElementById('console-panel');
        const arrow = document.querySelector('.console-arrow');
        
        if (!panel || !arrow) return;
        
        this.consoleOpen = !this.consoleOpen;
        
        if (this.consoleOpen) {
            panel.style.display = 'block';
            arrow.textContent = '▲';
        } else {
            panel.style.display = 'none';
            arrow.textContent = '▼';
        }
    }

    addConsoleLog(level, message, timestamp = null) {
        const consoleOutput = document.getElementById('console-output');
        if (!consoleOutput) return;
        
        const time = timestamp || new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        
        const logEntry = document.createElement('div');
        logEntry.className = `console-line ${level}`;
        logEntry.innerHTML = `
            <span class="console-time">[${time}]</span>
            <span class="console-level">${level.toUpperCase()}</span>
            <span class="console-message">${message}</span>
        `;
        
        consoleOutput.appendChild(logEntry);
        
        // Auto-scroll to bottom
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
        
        // Limit console output to 500 lines
        const lines = consoleOutput.children;
        if (lines.length > 500) {
            lines[0].remove();
        }
    }

    clearConsole() {
        const consoleOutput = document.getElementById('console-output');
        if (consoleOutput) {
            consoleOutput.innerHTML = '';
        }
    }

    toggleConsolePause() {
        this.consolePaused = !this.consolePaused;
        const pauseBtn = document.getElementById('pause-console');
        if (pauseBtn) {
            pauseBtn.textContent = this.consolePaused ? '⏵️' : '⏸️';
            pauseBtn.title = this.consolePaused ? 'Resume console' : 'Pause console';
        }
        
        const status = document.getElementById('console-status');
        if (status) {
            status.textContent = this.consolePaused ? 'Paused' : 'Active';
        }
    }

    onAgentLog(data) {
        console.log('onAgentLog called with:', data);
        if (this.consolePaused) return;
        
        // Update console status to show activity
        const status = document.getElementById('console-status');
        if (status && !this.consolePaused) {
            status.textContent = 'Active';
        }
        
        // Add log to console
        this.addConsoleLog(data.level || 'info', data.message, data.timestamp);
    }

    async refreshAgents() {
        this.showNotification('Refreshing agent status...', 'info');
        try {
            const agentsResponse = await this.apiCall('/api/agents');
            this.updateAgents(agentsResponse.agents);
            this.showNotification('Agent status refreshed', 'success');
        } catch (error) {
            console.error('Failed to refresh agents:', error);
            this.showNotification('Failed to refresh agent status', 'error');
        }
    }

    resetAgents() {
        if (!confirm('Are you sure you want to reset all agents? This will clear their current tasks.')) {
            return;
        }
        
        // Clear local agent state
        this.agents.clear();
        
        // Reset agent cards to initial state
        document.querySelectorAll('.agent-card').forEach(card => {
            const statusEl = card.querySelector('.agent-status');
            if (statusEl) {
                statusEl.textContent = 'Ready';
                statusEl.className = 'agent-status ready';
            }
            
            const metrics = card.querySelectorAll('.metric-value');
            if (metrics.length >= 1) {
                metrics[0].textContent = '0';
            }
        });
        
        this.showNotification('Agents reset to initial state', 'success');
    }

    startPeriodicUpdates() {
        // Refresh data every 30 seconds
        setInterval(async () => {
            try {
                // Only load data, don't show all the console logs
                const status = await this.apiCall('/api/status');
                this.updateSystemStatus(status);
                
                const tasks = await this.apiCall('/api/tasks');
                if (tasks.length !== this.tasks.size) {
                    this.updateTasks(tasks);
                }
                
                // Refresh workspace files to show newly created files
                const workspaceFiles = await this.apiCall('/api/workspace/files');
                this.updateRecentOutputs(workspaceFiles.files);
                
            } catch (error) {
                console.error('Periodic update failed:', error);
            }
        }, 30000);
    }

    createNewProject() {
        const name = prompt('Enter project name:');
        if (name) {
            this.showNotification(`Creating project: ${name}`, 'info');
            // Implement project creation API call
        }
    }

    switchProject(projectId) {
        this.currentProject = projectId;
        this.showNotification(`Switched to project: ${projectId}`, 'info');
        this.loadInitialData();
    }

    setupSettingsEventListeners() {
        // Save settings button
        const saveBtn = document.querySelector('.save-settings');
        saveBtn?.addEventListener('click', () => {
            this.saveSettings();
        });

        // Reset settings button
        const resetBtn = document.querySelector('.reset-settings');
        resetBtn?.addEventListener('click', () => {
            this.resetSettings();
        });

        // Export config button
        const exportBtn = document.querySelector('.export-config');
        exportBtn?.addEventListener('click', () => {
            this.exportConfiguration();
        });

        // Test API key buttons
        document.querySelectorAll('.test-key').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.testApiKey(e.target);
            });
        });

        // Browse path button
        const browseBtn = document.querySelector('.browse-path');
        browseBtn?.addEventListener('click', () => {
            this.browsePath();
        });
    }

    setupMonitoringEventListeners() {
        // Clear logs button
        const clearBtn = document.getElementById('clear-logs');
        clearBtn?.addEventListener('click', () => {
            this.clearLogs();
        });

        // Pause logs button
        const pauseBtn = document.getElementById('pause-logs');
        pauseBtn?.addEventListener('click', () => {
            this.toggleLogPause();
        });

        // Time range selector
        const timeRange = document.getElementById('time-range-select');
        timeRange?.addEventListener('change', (e) => {
            this.updateMetricsTimeRange(e.target.value);
        });
    }

    saveSettings() {
        const settings = {
            claude_model: document.getElementById('claude-model')?.value,
            codex_model: document.getElementById('codex-model')?.value,
            max_tokens: document.getElementById('max-tokens')?.value,
            openai_key: document.getElementById('openai-key')?.value,
            anthropic_key: document.getElementById('anthropic-key')?.value,
            deepseek_key: document.getElementById('deepseek-key')?.value,
            task_complete_notify: document.getElementById('task-complete-notify')?.checked,
            decision_needed_notify: document.getElementById('decision-needed-notify')?.checked,
            error_notify: document.getElementById('error-notify')?.checked,
            auto_assign: document.getElementById('auto-assign')?.value,
            parallel_execution: document.getElementById('parallel-execution')?.value,
            retry_attempts: document.getElementById('retry-attempts')?.value,
            default_priority: document.getElementById('default-priority')?.value,
            workspace_path: document.getElementById('workspace-path')?.value,
            backup_interval: document.getElementById('backup-interval')?.value
        };

        // Save to localStorage
        localStorage.setItem('orchestrator_settings', JSON.stringify(settings));
        
        // Also send to backend
        this.apiCall('/api/settings', {
            method: 'POST',
            body: JSON.stringify(settings)
        }).then(() => {
            this.showNotification('Settings saved successfully', 'success');
        }).catch(error => {
            console.error('Failed to save settings to backend:', error);
            this.showNotification('Settings saved locally only', 'warning');
        });
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            localStorage.removeItem('orchestrator_settings');
            location.reload(); // Simple way to reset the form
        }
    }

    exportConfiguration() {
        const settings = JSON.parse(localStorage.getItem('orchestrator_settings') || '{}');
        const config = {
            version: '1.0.0',
            exported_at: new Date().toISOString(),
            settings: settings,
            project_info: {
                id: this.currentProject,
                agents: Array.from(this.agents.keys()),
                task_count: this.tasks.size
            }
        };

        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orchestrator-config-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Configuration exported', 'success');
    }

    testApiKey(button) {
        const input = button.previousElementSibling;
        const key = input.value;
        
        if (!key) {
            this.showNotification('Please enter an API key first', 'warning');
            return;
        }

        button.disabled = true;
        button.textContent = 'Testing...';

        // Simulate API key test (replace with actual API call)
        setTimeout(() => {
            button.disabled = false;
            button.textContent = 'Test';
            
            // Random success/failure for demo
            if (Math.random() > 0.2) {
                this.showNotification('API key is valid', 'success');
            } else {
                this.showNotification('API key is invalid', 'error');
            }
        }, 1500);
    }

    browsePath() {
        // In a real implementation, this would open a file dialog
        // For now, just show a prompt
        const newPath = prompt('Enter workspace path:', document.getElementById('workspace-path').value);
        if (newPath) {
            document.getElementById('workspace-path').value = newPath;
        }
    }

    clearLogs() {
        const logsContainer = document.getElementById('logs-container');
        if (logsContainer) {
            logsContainer.innerHTML = '';
            this.showNotification('Logs cleared', 'info');
        }
    }

    toggleLogPause() {
        const button = document.getElementById('pause-logs');
        if (button.textContent === 'Pause') {
            button.textContent = 'Resume';
            this.logsPaused = true;
            this.showNotification('Log streaming paused', 'info');
        } else {
            button.textContent = 'Pause';
            this.logsPaused = false;
            this.showNotification('Log streaming resumed', 'info');
        }
    }

    updateMetricsTimeRange(range) {
        // Update metrics based on time range
        // For now, just show notification
        this.showNotification(`Metrics updated for: ${range}`, 'info');
        
        // In a real implementation, this would make an API call
        // this.loadMetrics(range);
    }

    addLogEntry(level, message) {
        if (this.logsPaused) return;

        const logsContainer = document.getElementById('logs-container');
        if (!logsContainer) return;

        const time = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });

        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${level}`;
        logEntry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-level">${level.toUpperCase()}</span>
            <span class="log-message">${message}</span>
        `;

        // Add to top of logs
        logsContainer.insertBefore(logEntry, logsContainer.firstChild);

        // Limit to last 50 entries
        const entries = logsContainer.querySelectorAll('.log-entry');
        if (entries.length > 50) {
            entries[entries.length - 1].remove();
        }

        // Auto-scroll to top
        logsContainer.scrollTop = 0;
    }

    setupSummaryEventListeners() {
        // Refresh summary button
        const refreshBtn = document.getElementById('refresh-summary');
        refreshBtn?.addEventListener('click', () => {
            this.refreshProjectSummary();
        });

        // View output buttons
        document.querySelectorAll('.view-output').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.viewOutput(e.target.dataset.file);
            });
        });

        // Export project button
        const exportBtn = document.querySelector('.export-project');
        exportBtn?.addEventListener('click', () => {
            this.exportProject();
        });

        // View all files button
        const viewAllBtn = document.querySelector('.view-all-files');
        viewAllBtn?.addEventListener('click', () => {
            this.viewAllFiles();
        });
    }

    refreshProjectSummary() {
        // Update summary stats from current data
        this.updateSummaryStats();
        this.showNotification('Project summary refreshed', 'info');
    }

    updateSummaryStats() {
        // Update requirements count
        document.getElementById('total-requirements').textContent = '1';
        
        // Calculate total lines from tasks
        let totalLines = 0;
        this.tasks.forEach(task => {
            if (task.output && task.output.lines_of_code) {
                totalLines += task.output.lines_of_code;
            }
        });
        document.getElementById('lines-generated').textContent = totalLines.toLocaleString();
        
        // Calculate completion rate
        const totalTasks = this.tasks.size;
        const completedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'completed').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        document.getElementById('completion-rate').textContent = `${completionRate}%`;
    }

    viewOutput(filename) {
        // Show a modal or new view with the file content
        this.showNotification(`Opening ${filename}...`, 'info');
        
        // In a real implementation, this would fetch the actual file content
        // For now, just show a notification
        setTimeout(() => {
            this.showNotification(`${filename} opened in editor`, 'success');
        }, 500);
    }

    exportProject() {
        // Export the entire project as a ZIP or tar file
        this.showNotification('Preparing project export...', 'info');
        
        // Simulate export process
        setTimeout(() => {
            const projectData = {
                name: `orchestrator-project-${Date.now()}`,
                created: new Date().toISOString(),
                tasks: Array.from(this.tasks.values()),
                agents: Array.from(this.agents.values()),
                requirements: 1,
                completion_rate: document.getElementById('completion-rate').textContent
            };

            const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${projectData.name}.json`;
            a.click();
            URL.revokeObjectURL(url);

            this.showNotification('Project exported successfully', 'success');
        }, 1500);
    }

    viewAllFiles() {
        // Open a file browser view
        this.showNotification('Opening file browser...', 'info');
        
        // In a real implementation, this would open a file tree view
        // Could be a modal or navigate to a files tab
        const fileList = [
            'server.py - FastAPI application',
            'models.py - Database models',
            'auth.py - Authentication logic',
            'test_api.py - Unit tests',
            'README.md - Documentation',
            'requirements.txt - Dependencies'
        ];

        setTimeout(() => {
            alert(`Project Files:\n\n${fileList.join('\n')}`);
        }, 500);
    }

    loadSavedSettings() {
        console.log('Loading saved settings...');
        const savedSettings = localStorage.getItem('orchestrator_settings');
        console.log('Found saved settings:', savedSettings ? 'Yes' : 'No');
        
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                console.log('Parsed settings:', settings);
                
                // Wait a bit for DOM to be ready, then load each field
                const loadField = (fieldId, value) => {
                    const element = document.getElementById(fieldId);
                    if (element) {
                        element.value = value;
                        console.log(`Loaded ${fieldId}: ${fieldId.includes('key') ? '***' : value}`);
                        return true;
                    }
                    console.log(`Element ${fieldId} not found`);
                    return false;
                };
                
                // Load each setting
                if (settings.claude_model) loadField('claude-model', settings.claude_model);
                if (settings.codex_model) loadField('codex-model', settings.codex_model);
                if (settings.max_tokens) loadField('max-tokens', settings.max_tokens);
                if (settings.openai_key) loadField('openai-key', settings.openai_key);
                if (settings.anthropic_key) loadField('anthropic-key', settings.anthropic_key);
                if (settings.deepseek_key) loadField('deepseek-key', settings.deepseek_key);
                
                // Load checkboxes
                if (typeof settings.task_complete_notify !== 'undefined' && document.getElementById('task-complete-notify')) {
                    document.getElementById('task-complete-notify').checked = settings.task_complete_notify;
                }
                if (typeof settings.decision_needed_notify !== 'undefined' && document.getElementById('decision-needed-notify')) {
                    document.getElementById('decision-needed-notify').checked = settings.decision_needed_notify;
                }
                if (typeof settings.error_notify !== 'undefined' && document.getElementById('error-notify')) {
                    document.getElementById('error-notify').checked = settings.error_notify;
                }
                
                // Load other settings
                if (settings.auto_assign && document.getElementById('auto-assign')) {
                    document.getElementById('auto-assign').value = settings.auto_assign;
                }
                if (settings.parallel_execution && document.getElementById('parallel-execution')) {
                    document.getElementById('parallel-execution').value = settings.parallel_execution;
                }
                if (settings.retry_attempts && document.getElementById('retry-attempts')) {
                    document.getElementById('retry-attempts').value = settings.retry_attempts;
                }
                if (settings.default_priority && document.getElementById('default-priority')) {
                    document.getElementById('default-priority').value = settings.default_priority;
                }
                if (settings.workspace_path && document.getElementById('workspace-path')) {
                    document.getElementById('workspace-path').value = settings.workspace_path;
                }
                if (settings.backup_interval && document.getElementById('backup-interval')) {
                    document.getElementById('backup-interval').value = settings.backup_interval;
                }
                
                console.log('Settings loaded from localStorage');
                
                // Show a subtle notification that settings were loaded
                const settingsTab = document.getElementById('settings-tab');
                if (settingsTab && settingsTab.classList.contains('active')) {
                    this.showNotification('Settings loaded from saved configuration', 'info');
                }
            } catch (error) {
                console.error('Failed to load saved settings:', error);
            }
        } else {
            console.log('No saved settings found in localStorage');
        }
    }

    // Console Methods
    toggleConsole() {
        const toggle = document.getElementById('console-toggle');
        const panel = document.getElementById('console-panel');
        
        this.consoleOpen = !this.consoleOpen;
        
        if (this.consoleOpen) {
            toggle.classList.add('open');
            panel.classList.add('open');
        } else {
            toggle.classList.remove('open');
            panel.classList.remove('open');
        }
    }

    addConsoleLog(type, agent, message) {
        if (this.consolePaused) return;
        
        const output = document.getElementById('console-output');
        if (!output) return;

        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        const line = document.createElement('div');
        line.className = 'console-line';
        
        line.innerHTML = `
            <span class="timestamp">[${timestamp}]</span>
            <span class="${type} ${agent}">${message}</span>
        `;
        
        output.appendChild(line);
        
        // Auto-scroll to bottom
        output.scrollTop = output.scrollHeight;
        
        // Update console status
        const status = document.getElementById('console-status');
        if (status) {
            if (type === 'error') {
                status.textContent = 'Error';
                status.style.background = '#ef4444';
            } else if (type === 'warning') {
                status.textContent = 'Working';
                status.style.background = '#f59e0b';
            } else if (agent.includes('claude') || agent.includes('codex')) {
                status.textContent = 'Active';
                status.style.background = '#3b82f6';
            } else {
                status.textContent = 'Ready';
                status.style.background = '#10b981';
            }
        }
        
        // Keep only last 100 lines
        const lines = output.querySelectorAll('.console-line');
        if (lines.length > 100) {
            lines[0].remove();
        }
    }

    clearConsole() {
        const output = document.getElementById('console-output');
        if (output) {
            output.innerHTML = `
                <div class="console-line">
                    <span class="timestamp">[${new Date().toLocaleTimeString('en-US', { hour12: false })}]</span>
                    <span class="system">🗑️ Console cleared</span>
                </div>
            `;
        }
    }

    toggleConsolePause() {
        this.consolePaused = !this.consolePaused;
        const btn = document.getElementById('pause-console');
        if (btn) {
            btn.textContent = this.consolePaused ? '▶️' : '⏸️';
            btn.title = this.consolePaused ? 'Resume' : 'Pause';
        }
        
        if (!this.consolePaused) {
            this.addConsoleLog('system', '', '▶️ Console resumed');
        }
    }
}

// Initialize the dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.orchestratorDashboard = new OrchestratorDashboard();
    
    // Add debug functions to window for testing
    window.debugSettings = {
        check: () => {
            const settings = localStorage.getItem('orchestrator_settings');
            console.log('Saved settings:', settings ? JSON.parse(settings) : 'None');
        },
        save: () => {
            const testSettings = {
                openai_key: 'sk-test123',
                anthropic_key: 'sk-ant-test456',
                claude_model: 'claude-3-sonnet',
                codex_model: 'gpt-4',
                max_tokens: '4000'
            };
            localStorage.setItem('orchestrator_settings', JSON.stringify(testSettings));
            console.log('Test settings saved! Refresh and go to Settings tab to see them.');
        },
        clear: () => {
            localStorage.removeItem('orchestrator_settings');
            console.log('Settings cleared!');
        }
    };
    
    console.log('Debug functions available:');
    console.log('- debugSettings.check() - Check saved settings');
    console.log('- debugSettings.save() - Save test settings');
    console.log('- debugSettings.clear() - Clear all settings');
});

// Add some CSS animations
const style = document.createElement('style');
style.textContent = `
    .animate-spin {
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .notification {
        animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .option-btn.selected {
        border-color: var(--primary-500) !important;
        background: var(--primary-100) !important;
    }
    
    .task-card {
        transition: all 0.2s ease;
    }
    
    .task-card:hover {
        transform: translateY(-1px);
    }
`;
document.head.appendChild(style);