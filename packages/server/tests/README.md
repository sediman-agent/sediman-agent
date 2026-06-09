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
