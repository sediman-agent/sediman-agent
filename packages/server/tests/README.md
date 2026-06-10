# Session Saving Tests

This directory contains tests to ensure that sessions are properly saved after agent execution, preventing the regression where sessions were not being persisted.

## What These Tests Prevent

These tests catch the following issues:

1. **Missing session saves** - Ensures sessions are saved to the database after agent execution
2. **Incorrect session structure** - Validates that saved sessions have the correct fields
3. **Lost session data** - Ensures steps, results, and metadata are properly stored
4. **Database connection issues** - Verifies sessions persist across database reconnections

## Test Files

### Agent Integration Tests
- `tests/agent/session-integration.test.ts` - Tests that AgentLoop saves sessions

### RPC Handler Tests
- `tests/rpc/session-saving.test.ts` - Tests that RPC handlers save sessions

### Memory/Storage Tests
- `tests/memory/sessions.test.ts` - Tests the sessions module directly

## Running Tests

```bash
# Run all session-related tests
bun test packages/server/tests/agent/session-integration.test.ts
bun test packages/server/tests/rpc/session-saving.test.ts
bun test packages/server/tests/memory/sessions.test.ts

# Run all tests
bun test packages/server/tests
```

## What Gets Tested

### AgentLoop Session Saving
- ✅ Session is saved to database after agent completes
- ✅ Session has correct structure (id, task, created_at, steps)
- ✅ Failed tasks still save sessions
- ✅ Steps are included in saved sessions

### RPC Handler Session Saving
- ✅ RPC agent handlers save sessions after execution
- ✅ Session data integrity across handler calls
- ✅ Result field is properly populated for successful tasks

### Session Persistence
- ✅ Sessions persist across database reconnections
- ✅ Multiple sessions are saved and retrieved correctly
- ✅ Session ordering (most recent first)

## Fixing Session Saving Issues

If these tests fail, check:

1. **AgentLoop.runPostTask()** - Ensure `saveSession()` is called
2. **RPC Handlers** - Ensure sessions are saved after agent execution
3. **API Routes** - Ensure sessions are saved after agent execution
4. **Database Connection** - Ensure database is properly initialized

## Related Files

- `src/agent/execution/loop.ts` - AgentLoop with runPostTask()
- `src/rpc/handlers/agent.ts` - RPC agent handlers
- `src/api/routes/agent.ts` - API agent routes
- `src/memory/sessions.ts` - Session saving functions
- `src/store/db.ts` - Database schema and initialization

---

# Issue Demonstration Tests

This directory also contains tests that demonstrate issues found in the OpenSkynet codebase, particularly related to screenshot failures and Electron vs HTTP agent differences.

## Screenshot Issues

### Test File: `tests/screenshot/screenshot-manager.test.ts`

Demonstrates why the screenshot tool fails in Electron mode:

1. **No browser controller available** - Screenshot fails when controller is null
2. **CDP connection timeout** - Screenshots fail when CDP connection times out in Electron mode
3. **Empty screenshot data** - Screenshots fail when data is < 100 bytes
4. **Browser page errors** - Screenshots fail when page access throws "no context" error
5. **Race conditions** - Frontend screenshot might be stale or unavailable

### Root Cause

In Electron mode, screenshots fail because:
- There's no Playwright page to screenshot (no browser context)
- CDP connection must be established first (5 second timeout)
- Frontend must provide screenshot as fallback
- Multiple failure points in the complex flow

## Browser Controller Issues

### Test File: `tests/browser/browser-controller.test.ts`

Shows differences between Electron and HTTP modes:

1. **isElectronModeNoContext()** - Returns true in Electron mode, causing all actions to return "via Electron IPC" messages
2. **page() throws errors** - "no context in browser session" when trying to access page
3. **Screenshot returns null** - When session is not started
4. **Snapshot returns dummy data** - Empty snapshot in Electron mode without CDP

## IPC Execution Issues

### Test File: `tests/browser/ipc-executor.test.ts`

Demonstrates the complex command flow and failure points:

1. **Command queued but polling fails** - Commands timeout waiting for results
2. **Backend endpoint unavailable** - Network errors when backend is down
3. **Result format mismatch** - Unexpected response formats cause issues
4. **Pending commands not polled** - Frontend must poll or commands never execute
5. **Asynchronous flow** - Many steps where any can fail

## Agent Execution Differences

### Test File: `tests/agent/agent-execution-modes.test.ts`

Documents fundamental differences between HTTP and Electron agent execution:

**HTTP Mode**:
- Direct Playwright execution
- Self-contained
- Simple error handling
- Fast (~150-700ms per action)

**Electron Mode**:
- Queue-based IPC execution
- Split between backend/frontend
- Dual polling mechanisms (different endpoints!)
- Complex error handling
- Slower (~320-1460ms per action)

## Running the Tests

```bash
# Run screenshot tests
bun test packages/server/tests/screenshot

# Run browser controller tests
bun test packages/server/tests/browser/browser-controller.test.ts

# Run IPC executor tests
bun test packages/server/tests/browser/ipc-executor.test.ts

# Run agent execution modes tests
bun test packages/server/tests/agent/agent-execution-modes.test.ts

# Run all issue demonstration tests
bun test packages/server/tests/screenshot packages/server/tests/browser/browser-controller.test.ts packages/server/tests/browser/ipc-executor.test.ts packages/server/tests/agent/agent-execution-modes.test.ts
```

## Key Files Involved

1. `packages/server/src/agent/vision/screenshot-manager.ts` - Screenshot capture with Electron mode handling
2. `packages/server/src/browser/controller.ts` - Browser controller with Electron mode detection
3. `packages/server/src/browser/session.ts` - Browser session with CDP connection
4. `packages/server/src/agent/tools/execution/ipc-browser-executor.ts` - IPC-based browser execution
5. `packages/server/src/api/handlers/browser-route-handlers.ts` - API routes with command queue
6. `packages/app/src/services/IPCBrowserService.ts` - Frontend IPC service
7. `packages/app/src/services/PlaywrightBrowserService.ts` - Frontend Playwright service
