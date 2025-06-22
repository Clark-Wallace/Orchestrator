# Agent Integration Guide

## Overview

Orchestrator uses a sophisticated multi-agent system where each AI agent specializes in specific aspects of the development process. This guide explains how agents are integrated, how to customize them, and how to add new agents.

**New Addition**: DeepSeek has been integrated for advanced reasoning, algorithm analysis, and performance optimization tasks.

## Agent Architecture

### Agent Bridge Pattern

The `agent_bridge.py` module implements the Agent Bridge pattern, providing a unified interface for different AI services while maintaining their unique capabilities.

```python
from abc import ABC, abstractmethod

class AgentConnector(ABC):
    @abstractmethod
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        pass
    
    @abstractmethod
    def get_status(self) -> Dict[str, Any]:
        pass
```

### Current Agent Specializations

#### 1. Strategic Analyst (Claude)
**Role**: Architecture design, requirement analysis, strategic planning, risk assessment

**Strengths**:
- Complex problem decomposition
- Architecture pattern recognition
- Risk and security analysis
- Strategic technology recommendations

**Implementation**:
```python
class ClaudeConnector(AgentConnector):
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        client = anthropic.Anthropic(api_key=self.api_key)
        
        analysis_prompt = f"""
        As a Strategic Analyst AI, analyze this requirement:
        {prompt}
        
        Provide:
        1. Architecture recommendations
        2. Technology stack suggestions
        3. Security considerations
        4. Implementation strategy
        5. Potential risks and mitigations
        
        Context: {context}
        """
        
        message = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2000,
            temperature=0.1,
            messages=[{"role": "user", "content": analysis_prompt}]
        )
        
        return self._parse_analysis_response(message.content)
```

#### 2. Code Generator (Codex)
**Role**: Implementation, API development, database design, code optimization

**Strengths**:
- High-quality code generation
- Multiple programming language support
- API and database design
- Performance optimization

**Implementation**:
```python
class CodexConnector(AgentConnector):
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        client = openai.OpenAI(api_key=self.api_key)
        
        implementation_prompt = f"""
        Implement the following requirement with high-quality, production-ready code:
        {prompt}
        
        Architecture guidance: {context.get('analysis', {})}
        
        Requirements:
        - Follow best practices and design patterns
        - Include proper error handling
        - Add type hints and documentation
        - Ensure security and performance
        - Make code testable and maintainable
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[{"role": "user", "content": implementation_prompt}],
            temperature=0.2,
            max_tokens=3000
        )
        
        return self._parse_implementation_response(response.choices[0].message.content)
```

#### 3. Quality Validator (Claude2)
**Role**: Code review, security audit, execution analysis, runnable determination

**Strengths**:
- Code quality assessment
- Security vulnerability detection
- Execution metadata analysis
- Best practice validation

**Implementation**:
```python
class Claude2Connector(AgentConnector):
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        client = anthropic.Anthropic(api_key=self.api_key)
        
        validation_prompt = f"""
        As a Quality Validator, review this implementation:
        
        Code: {context.get('implementation', '')}
        Original Requirement: {prompt}
        
        Provide detailed analysis:
        1. Code quality assessment (1-10 score)
        2. Security vulnerabilities and fixes
        3. Performance considerations
        4. Best practice compliance
        5. Execution requirements:
           - Is the code runnable? (true/false)
           - Required dependencies
           - Execution command
           - Default port (if applicable)
           - Estimated startup time
        """
        
        message = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2000,
            temperature=0,
            messages=[{"role": "user", "content": validation_prompt}]
        )
        
        return self._parse_validation_response(message.content)
```

#### 4. Deep Reasoner (DeepSeek)
**Role**: Advanced reasoning, algorithm analysis, performance optimization, security analysis

**Strengths**:
- Complex algorithmic problem solving
- Deep code analysis and optimization
- Architecture decisions and trade-offs
- Performance bottleneck identification
- Security vulnerability analysis

**Implementation**:
```python
class DeepSeekConnector(AgentConnector):
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com/v1"  # OpenAI-compatible
        )
        
        reasoning_prompt = f"""
        Perform deep technical analysis:
        {prompt}
        
        Previous Analysis: {context.get('analyst_result', {})}
        Previous Implementation: {context.get('implementer_result', {})}
        
        Provide:
        1. Detailed technical analysis
        2. Algorithm recommendations (with complexity analysis)
        3. Performance optimization strategies
        4. Security considerations
        5. Architecture trade-offs
        6. Scalability analysis
        """
        
        response = await client.chat.completions.create(
            model="deepseek-chat",
            messages=[{"role": "user", "content": reasoning_prompt}],
            temperature=0.7,
            max_tokens=2000
        )
        
        return self._parse_reasoning_response(response.choices[0].message.content)
```

#### 5. Integrator (IDE Tools)
**Role**: Deployment, monitoring, debugging, environment setup

**Strengths**:
- Development environment setup
- Deployment automation
- Monitoring and debugging
- Integration testing

**Implementation**:
```python
class IDEConnector(AgentConnector):
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        validation = context.get('validation', {})
        implementation = context.get('implementation', {})
        
        if not validation.get('runnable', False):
            return {
                'status': 'skipped',
                'reason': 'Code not validated as runnable',
                'integration': None
            }
        
        # Setup development environment
        integration_result = await self._setup_environment(
            code=implementation.get('code', ''),
            dependencies=validation.get('dependencies', []),
            command=validation.get('command', ''),
            port=validation.get('port')
        )
        
        return integration_result
```

## Agent Communication Protocol

### 1. Task Assignment
```python
async def assign_task(self, task: Task) -> None:
    # Parallel agent execution
    tasks_to_run = []
    
    # Strategic analysis
    if task.requires_analysis:
        tasks_to_run.append(
            self.agents['claude'].execute(task.requirement, task.context)
        )
    
    # Implementation (waits for analysis if needed)
    tasks_to_run.append(
        self._delayed_implementation(task)
    )
    
    # Run tasks concurrently where possible
    results = await asyncio.gather(*tasks_to_run, return_exceptions=True)
    
    await self._process_agent_results(task, results)
```

### 2. Context Sharing
```python
class TaskContext:
    def __init__(self):
        self.analysis: Dict[str, Any] = {}
        self.implementation: Dict[str, Any] = {}
        self.validation: Dict[str, Any] = {}
        self.integration: Dict[str, Any] = {}
        self.signals: List[Signal] = []
        self.metadata: Dict[str, Any] = {}
    
    def add_agent_result(self, agent_type: str, result: Dict[str, Any]):
        setattr(self, agent_type, result)
        self._propagate_context()
    
    def _propagate_context(self):
        # Make results available to subsequent agents
        for agent in self.waiting_agents:
            agent.update_context(self.to_dict())
```

### 3. Signal-Aware Responses
```python
class SignalAwareAgent:
    def __init__(self, connector: AgentConnector):
        self.connector = connector
        self.signal_handlers = {}
    
    async def execute_with_signals(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        # Check for environmental signals
        signals = await self._detect_signals(context)
        
        # Adjust execution based on signals
        if 'high_load' in signals:
            context['execution_mode'] = 'conservative'
        elif 'user_feedback' in signals:
            context['priority'] = 'user_experience'
        
        return await self.connector.execute(prompt, context)
```

## Adding New Agents

### 1. Create Agent Connector
```python
class NewAgentConnector(AgentConnector):
    def __init__(self, api_key: str, model: str = "default"):
        self.api_key = api_key
        self.model = model
        self.specialization = "Your agent's unique capability"
    
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        # Implement your agent's execution logic
        specialized_prompt = self._create_specialized_prompt(prompt, context)
        
        # Call your AI service
        response = await self._call_ai_service(specialized_prompt)
        
        # Parse and structure response
        return self._parse_response(response)
    
    def get_status(self) -> Dict[str, Any]:
        return {
            'agent_type': 'new_agent',
            'status': 'active',
            'specialization': self.specialization,
            'model': self.model,
            'last_activity': datetime.now().isoformat()
        }
    
    def _create_specialized_prompt(self, prompt: str, context: Dict[str, Any]) -> str:
        return f"""
        As a {self.specialization} specialist, analyze:
        {prompt}
        
        Context: {context}
        
        Provide specialized insights for:
        1. [Your specific analysis points]
        2. [Your unique capabilities]
        3. [Your specialized outputs]
        """
```

### 2. Register Agent in System
```python
# In orchestrator_core.py
class OrchestratorCore:
    def __init__(self):
        self.agents = {
            'claude': ClaudeConnector(api_key=config.anthropic_key),
            'codex': CodexConnector(api_key=config.openai_key),
            'claude2': Claude2Connector(api_key=config.anthropic_key),
            'ide': IDEConnector(),
            'new_agent': NewAgentConnector(api_key=config.new_agent_key)  # Add here
        }
        
        # Define agent specialization pipeline
        self.pipeline = {
            'analysis': ['claude', 'new_agent'],  # Multiple agents can handle analysis
            'implementation': ['codex'],
            'validation': ['claude2'],
            'integration': ['ide']
        }
```

### 3. Update Task Assignment Logic
```python
async def _assign_task(self, task: Task) -> None:
    # Get agents for each stage
    analysis_agents = self.pipeline['analysis']
    
    # Run analysis agents in parallel
    analysis_tasks = []
    for agent_name in analysis_agents:
        agent = self.agents[agent_name]
        analysis_tasks.append(agent.execute(task.requirement, task.context))
    
    # Combine analysis results
    analysis_results = await asyncio.gather(*analysis_tasks)
    combined_analysis = self._combine_analysis_results(analysis_results)
    
    task.context.add_agent_result('analysis', combined_analysis)
```

## Agent Customization

### 1. Custom Prompts
```python
class CustomPromptMixin:
    def __init__(self, custom_prompts: Dict[str, str] = None):
        self.custom_prompts = custom_prompts or {}
    
    def _get_prompt_template(self, prompt_type: str) -> str:
        return self.custom_prompts.get(prompt_type, self._default_prompts[prompt_type])

class CustomClaudeConnector(ClaudeConnector, CustomPromptMixin):
    def __init__(self, api_key: str, custom_prompts: Dict[str, str] = None):
        ClaudeConnector.__init__(self, api_key)
        CustomPromptMixin.__init__(self, custom_prompts)
    
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        template = self._get_prompt_template('analysis')
        specialized_prompt = template.format(
            requirement=prompt,
            context=context,
            style='enterprise',  # Custom style
            focus_areas=['scalability', 'maintainability']  # Custom focus
        )
        
        return await self._execute_with_prompt(specialized_prompt)
```

### 2. Agent Personality Configuration
```python
class AgentPersonality:
    def __init__(self, 
                 creativity: float = 0.5,
                 conservatism: float = 0.5,
                 detail_level: str = 'medium',
                 communication_style: str = 'professional'):
        self.creativity = creativity
        self.conservatism = conservatism
        self.detail_level = detail_level
        self.communication_style = communication_style
    
    def adjust_prompt(self, base_prompt: str) -> str:
        adjustments = []
        
        if self.creativity > 0.7:
            adjustments.append("Think outside the box and suggest innovative solutions.")
        elif self.conservatism > 0.7:
            adjustments.append("Focus on proven, reliable approaches.")
        
        if self.detail_level == 'high':
            adjustments.append("Provide comprehensive, detailed analysis.")
        
        style_instruction = f"Use a {self.communication_style} tone."
        
        return f"{base_prompt}\n\nGuidance: {' '.join(adjustments)} {style_instruction}"
```

### 3. Domain-Specific Agents
```python
class WebDevelopmentAgent(CodexConnector):
    def __init__(self, api_key: str):
        super().__init__(api_key)
        self.specialization = "Web Development"
        self.frameworks = ['React', 'Vue', 'Angular', 'FastAPI', 'Django']
        self.best_practices = {
            'frontend': ['responsive_design', 'accessibility', 'performance'],
            'backend': ['security', 'scalability', 'api_design']
        }
    
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        # Detect web development requirements
        is_frontend = any(term in prompt.lower() for term in ['ui', 'frontend', 'react', 'vue'])
        is_backend = any(term in prompt.lower() for term in ['api', 'backend', 'server', 'database'])
        
        specialized_context = context.copy()
        specialized_context.update({
            'domain': 'web_development',
            'is_frontend': is_frontend,
            'is_backend': is_backend,
            'recommended_frameworks': self._recommend_frameworks(prompt),
            'best_practices': self._get_relevant_practices(is_frontend, is_backend)
        })
        
        return await super().execute(prompt, specialized_context)
    
    def _recommend_frameworks(self, prompt: str) -> List[str]:
        recommendations = []
        prompt_lower = prompt.lower()
        
        if 'spa' in prompt_lower or 'single page' in prompt_lower:
            recommendations.extend(['React', 'Vue'])
        if 'api' in prompt_lower:
            recommendations.extend(['FastAPI', 'Django'])
        
        return recommendations
```

## Agent Performance Optimization

### 1. Response Caching
```python
class CachedAgentConnector:
    def __init__(self, base_connector: AgentConnector, cache_ttl: int = 3600):
        self.base_connector = base_connector
        self.cache = {}
        self.cache_ttl = cache_ttl
    
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        cache_key = self._generate_cache_key(prompt, context)
        
        # Check cache
        if cache_key in self.cache:
            cached_result, timestamp = self.cache[cache_key]
            if time.time() - timestamp < self.cache_ttl:
                return cached_result
        
        # Execute and cache
        result = await self.base_connector.execute(prompt, context)
        self.cache[cache_key] = (result, time.time())
        
        return result
```

### 2. Parallel Execution
```python
class ParallelAgentExecutor:
    async def execute_parallel(self, agents: List[AgentConnector], prompt: str, context: Dict[str, Any]) -> List[Dict[str, Any]]:
        tasks = []
        for agent in agents:
            task = asyncio.create_task(agent.execute(prompt, context))
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                processed_results.append({
                    'error': str(result),
                    'agent': agents[i].__class__.__name__
                })
            else:
                processed_results.append(result)
        
        return processed_results
```

### 3. Adaptive Timeout Management
```python
class AdaptiveTimeoutAgent:
    def __init__(self, base_connector: AgentConnector):
        self.base_connector = base_connector
        self.response_times = []
        self.max_history = 50
    
    async def execute(self, prompt: str, context: Dict[str, Any]) -> Dict[str, Any]:
        timeout = self._calculate_adaptive_timeout()
        
        try:
            start_time = time.time()
            result = await asyncio.wait_for(
                self.base_connector.execute(prompt, context),
                timeout=timeout
            )
            response_time = time.time() - start_time
            self._update_response_times(response_time)
            
            return result
        
        except asyncio.TimeoutError:
            return {
                'error': 'timeout',
                'timeout_duration': timeout,
                'suggestion': 'Consider simplifying the request or increasing timeout'
            }
    
    def _calculate_adaptive_timeout(self) -> float:
        if not self.response_times:
            return 30.0  # Default timeout
        
        avg_time = sum(self.response_times) / len(self.response_times)
        return min(max(avg_time * 2, 15.0), 120.0)  # Between 15s and 2min
```

## Testing Agent Integration

### 1. Unit Tests for Agents
```python
import pytest
from unittest.mock import AsyncMock, patch

@pytest.mark.asyncio
async def test_claude_connector():
    with patch('anthropic.Anthropic') as mock_anthropic:
        mock_client = AsyncMock()
        mock_anthropic.return_value = mock_client
        mock_client.messages.create.return_value.content = "Test analysis response"
        
        connector = ClaudeConnector("test_key")
        result = await connector.execute("Test requirement", {})
        
        assert 'analysis' in result
        assert mock_client.messages.create.called

@pytest.mark.asyncio
async def test_agent_pipeline():
    orchestrator = OrchestratorCore()
    task = Task(
        requirement="Create a simple web server",
        priority=5
    )
    
    await orchestrator._assign_task(task)
    
    assert task.status == TaskStatus.COMPLETED
    assert 'analysis' in task.context
    assert 'implementation' in task.context
```

### 2. Integration Tests
```python
@pytest.mark.asyncio
async def test_full_agent_pipeline():
    """Test complete pipeline from requirement to deployment"""
    
    # Mock all external services
    with patch.multiple(
        'agent_bridge',
        ClaudeConnector=AsyncMock(),
        CodexConnector=AsyncMock(),
        Claude2Connector=AsyncMock(),
        IDEConnector=AsyncMock()
    ):
        orchestrator = OrchestratorCore()
        
        result = await orchestrator.submit_requirement(
            "Create a REST API for user management"
        )
        
        assert result['status'] == 'success'
        assert 'task_id' in result
        
        # Verify all agents were called
        for agent in orchestrator.agents.values():
            assert agent.execute.called
```

## Monitoring Agent Performance

### 1. Agent Metrics Collection
```python
class AgentMetrics:
    def __init__(self):
        self.execution_times = defaultdict(list)
        self.success_rates = defaultdict(lambda: {'success': 0, 'total': 0})
        self.error_counts = defaultdict(int)
    
    def record_execution(self, agent_name: str, duration: float, success: bool, error: str = None):
        self.execution_times[agent_name].append(duration)
        self.success_rates[agent_name]['total'] += 1
        
        if success:
            self.success_rates[agent_name]['success'] += 1
        else:
            self.error_counts[f"{agent_name}:{error}"] += 1
    
    def get_agent_stats(self, agent_name: str) -> Dict[str, Any]:
        times = self.execution_times[agent_name]
        rates = self.success_rates[agent_name]
        
        return {
            'average_response_time': sum(times) / len(times) if times else 0,
            'success_rate': rates['success'] / rates['total'] if rates['total'] else 0,
            'total_executions': rates['total'],
            'recent_errors': [k for k in self.error_counts.keys() if k.startswith(agent_name)]
        }
```

### 2. Real-time Agent Dashboard
```python
async def get_agent_dashboard() -> Dict[str, Any]:
    agents_status = {}
    
    for agent_name, agent in orchestrator.agents.items():
        status = agent.get_status()
        metrics = agent_metrics.get_agent_stats(agent_name)
        
        agents_status[agent_name] = {
            **status,
            **metrics,
            'current_load': await get_agent_load(agent_name),
            'queue_length': await get_agent_queue_length(agent_name)
        }
    
    return {
        'agents': agents_status,
        'system_health': await calculate_system_health(),
        'timestamp': datetime.now().isoformat()
    }
```

This guide provides a comprehensive foundation for understanding, customizing, and extending the agent system in Orchestrator. The modular design allows for easy addition of new agents while maintaining the quality and coherence of the overall system.