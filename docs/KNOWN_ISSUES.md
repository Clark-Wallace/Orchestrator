# Known Issues and Current State

## Last Updated: June 21, 2025

### 🔴 Critical Issues

#### 1. AI Agent Status Cards Not Updating
- **Problem**: Agent cards remain static showing "Ready" with 0 tasks
- **Expected**: Should show "Working" status and increment task counts
- **Impact**: No visual feedback during task processing
- **Root Cause**: WebSocket messages sent but UI not updating properly
- **Workaround**: Check Recent Outputs for generated files

#### 2. Agent Console Not Displaying
- **Problem**: Console dropdown exists but shows no agent logs
- **Expected**: Real-time agent execution logs in console
- **Impact**: No transparency into agent operations
- **Root Cause**: Frontend not processing agent_log WebSocket messages
- **Workaround**: View server console for all agent activity

#### 3. Inter-Agent Communication Issue (FIXED)
- **Problem**: Claude2 validator not receiving implementer's code output
- **Error**: "No code content found in implementer output"
- **Impact**: Validator can't analyze actual generated code
- **Root Cause**: Task results stored after execution instead of before
- **Fix Applied**: Results now stored immediately for next agent
- **Status**: ✅ Fixed - agents now properly share context

#### 4. Claude2 Validator SDK Error
- **Problem**: Quality validator may fail with SDK error
- **Error**: May show various Anthropic client errors
- **Impact**: Falls back to simulation if API call fails
- **Root Cause**: Enhanced error logging added to diagnose
- **Status**: 🔍 Monitoring with improved error tracking

### 🟡 Intermittent Issues

#### 1. Pipeline Visualization
- **Problem**: Task pipeline updates inconsistently
- **Expected**: Real-time task progress through pipeline stages
- **Impact**: Can't track task flow visually
- **Workaround**: Refresh page to see current state

#### 2. Task Completion Notifications
- **Problem**: Sometimes tasks complete without UI notification
- **Expected**: Clear completion messages and status updates
- **Impact**: User unsure when tasks finish
- **Workaround**: Monitor Recent Outputs section

### 🟢 Working Features

1. **Core Task Processing** - Tasks execute successfully
2. **File Generation** - Correct files created in workspace
3. **Prompt Enhancement** - Weak prompts improved automatically
4. **Smart Output Format** - Graphics generate HTML/SVG correctly
5. **Agent Menu** - Dropdown functions work (refresh, reset, logs)
6. **Archive System** - Project archiving works perfectly
7. **Settings Persistence** - API keys saved and loaded

### 📊 System Health Summary

| Component | Status | Notes |
|-----------|--------|--------|
| Backend API | ✅ Working | All endpoints functional |
| Task Processing | ✅ Working | Agents execute correctly |
| File Generation | ✅ Working | Proper extensions and content |
| WebSocket Connection | ✅ Connected | Messages sent successfully |
| WebSocket UI Updates | ❌ Not Working | Messages not processed in frontend |
| Agent Status Display | ❌ Not Working | Cards don't update |
| Console Display | ❌ Not Working | Logs not shown |
| Quality Validation | ❌ Failing | Claude2 SDK error |
| Pipeline Display | ⚠️ Intermittent | Inconsistent updates |

### 🔧 Debugging Information

#### Server Console Shows:
```
✅ Set logging callback for claude_analyst
✅ Set logging callback for codex_impl
✅ Set logging callback for claude2_validator
🎯 CLAUDE: Starting analysis task...
💻 CODEX: Starting code generation...
🔍 CLAUDE2: Starting validation task...
❌ CLAUDE2: Validation failed: Client.__init__() got an unexpected keyword argument 'proxies'
```

#### Browser Console Should Show (but doesn't):
```
Received agent log: {level: "info", message: "Starting analysis task...", agent: "claude"}
Agent activity update: {agent_id: "claude_analyst", status: "working"}
```

### 🚀 Next Steps for Fixes

1. **Fix Claude2 Validator**
   - Remove 'proxies' parameter from Anthropic client init
   - Test validation pipeline

2. **Debug WebSocket Frontend**
   - Add console logging to trace message flow
   - Verify message handler registration
   - Check for JavaScript errors

3. **Fix Agent Status Updates**
   - Ensure agent IDs match between backend and frontend
   - Verify updateAgentCard method works
   - Test with manual status updates

4. **Enable Console Display**
   - Verify onAgentLog method is called
   - Check console DOM element updates
   - Test with manual log injection