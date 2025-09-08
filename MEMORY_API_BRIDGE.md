# Cloud API Bridge - Memory System Access

## Overview

The Cloud API Bridge provides HTTP API access to Durandal's Universal Memory System, enabling Claude Code to interact with local memory capabilities through cloud-hosted endpoints.

## Server Status

✅ **Successfully Running**: Memory API Server on `http://localhost:3005`
✅ **Authentication**: API Key protection enabled
✅ **CORS**: Configured for Claude Code domains
✅ **Integration**: Fully integrated with Universal Memory System

## Available Endpoints

### Health Check
```
GET /health
```
Returns server health status and memory system readiness.

### Project Initialization
```
POST /api/projects/:projectName/init
Headers: x-api-key: durandal-memory-api-key
```
Initializes memory system for a project and creates a session.

### Message Interaction
```
POST /api/sessions/:sessionId/messages
Headers: x-api-key: durandal-memory-api-key
Body: {
  "role": "user",
  "content": "Your message here",
  "metadata": {}
}
```
Sends message to AI and stores the interaction in memory.

### Context Retrieval
```
GET /api/sessions/:sessionId/context?limit=10
Headers: x-api-key: durandal-memory-api-key
```
Retrieves recent conversation messages and context.

### Knowledge Search
```
GET /api/projects/:projectName/search?query=searchterm&limit=10
Headers: x-api-key: durandal-memory-api-key
```
Searches stored knowledge artifacts and memories.

### Project Summary
```
GET /api/projects/:projectName/summary
Headers: x-api-key: durandal-memory-api-key
```
Returns project status, providers, artifacts count, and cost information.

## Usage Example

1. **Initialize Project**:
```bash
curl -X POST "http://localhost:3005/api/projects/claude-code/init" \
  -H "x-api-key: durandal-memory-api-key"
```
Returns: `{"success":true,"project":"claude-code","sessionId":8}`

2. **Send Message**:
```bash
curl -X POST "http://localhost:3005/api/sessions/8/messages" \
  -H "x-api-key: durandal-memory-api-key" \
  -H "Content-Type: application/json" \
  -d '{"role":"user","content":"Hello, can you remember this conversation?"}'
```

3. **Get Context**:
```bash
curl -X GET "http://localhost:3005/api/sessions/8/context" \
  -H "x-api-key: durandal-memory-api-key"
```

## Implementation Details

- **Port**: 3005 (configurable via MEMORY_API_PORT)
- **Authentication**: x-api-key header required for /api/* endpoints
- **Framework**: Express.js 4.x for stability
- **Memory Backend**: Universal Memory System with PostgreSQL/SQLite
- **AI Integration**: Claude API with intelligent context management
- **Caching**: RAMR (Rapid Access Memory Register) system

## Next Steps

The API is ready for cloud deployment to make it accessible to Claude Code. The simple HTTP interface provides elegant access to all memory capabilities without the complexity of MCP protocol implementation.

## Key Benefits

- ✅ **Simple**: Clean HTTP REST API
- ✅ **Secure**: API key authentication
- ✅ **Fast**: 2-3 day implementation vs 3-4 weeks for MCP
- ✅ **Reliable**: Built on proven Express.js framework
- ✅ **Scalable**: Ready for cloud deployment
- ✅ **Complete**: Full access to memory system features