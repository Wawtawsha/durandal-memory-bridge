-- Claude Memory System Database Schema
-- Optimized for JSON storage and AI consumption

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Conversation sessions for context continuity
CREATE TABLE conversation_sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    session_name VARCHAR(255),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    context_dump JSONB, -- Full Claude context for continuation
    summary TEXT, -- Human-readable summary
    tokens_used INTEGER DEFAULT 0,
    model_version VARCHAR(100) DEFAULT 'claude-sonnet-4-20250514',
    continuation_session_id INTEGER REFERENCES conversation_sessions(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Knowledge artifacts (files, learnings, commands, configs)
CREATE TABLE knowledge_artifacts (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    artifact_type VARCHAR(100) NOT NULL, -- 'file', 'learning', 'command', 'config', 'system_state'
    name VARCHAR(255) NOT NULL,
    content JSONB NOT NULL, -- File contents, knowledge, command outputs
    metadata JSONB DEFAULT '{}'::jsonb, -- File paths, permissions, relationships
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    relevance_score INTEGER DEFAULT 5, -- 1-10 scale for Claude to prioritize
    tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- For keyword searching
    parent_artifact_id INTEGER REFERENCES knowledge_artifacts(id),
    version INTEGER DEFAULT 1
);

-- Project state snapshots for complete restoration
CREATE TABLE project_states (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    state_name VARCHAR(255) NOT NULL,
    full_state JSONB NOT NULL, -- Complete project state
    file_structure JSONB, -- Directory/file structure
    system_info JSONB, -- Server status, installed packages
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT FALSE,
    snapshot_type VARCHAR(50) DEFAULT 'manual', -- 'manual', 'auto', 'milestone'
    metadata JSONB DEFAULT '{}'::jsonb
);

-- API interaction logs for monitoring and debugging
CREATE TABLE api_interactions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE,
    session_id INTEGER REFERENCES conversation_sessions(id) ON DELETE CASCADE,
    request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response_timestamp TIMESTAMP,
    tokens_used INTEGER,
    model_version VARCHAR(100),
    request_type VARCHAR(100), -- 'completion', 'context_dump', 'context_load'
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_updated_at ON projects(updated_at);

CREATE INDEX idx_conversation_sessions_project_id ON conversation_sessions(project_id);
CREATE INDEX idx_conversation_sessions_started_at ON conversation_sessions(started_at);
CREATE INDEX idx_conversation_sessions_model_version ON conversation_sessions(model_version);

CREATE INDEX idx_knowledge_artifacts_project_id ON knowledge_artifacts(project_id);
CREATE INDEX idx_knowledge_artifacts_type ON knowledge_artifacts(artifact_type);
CREATE INDEX idx_knowledge_artifacts_tags ON knowledge_artifacts USING GIN(tags);
CREATE INDEX idx_knowledge_artifacts_relevance ON knowledge_artifacts(relevance_score);
CREATE INDEX idx_knowledge_artifacts_updated_at ON knowledge_artifacts(updated_at);

CREATE INDEX idx_project_states_project_id ON project_states(project_id);
CREATE INDEX idx_project_states_is_current ON project_states(is_current);
CREATE INDEX idx_project_states_created_at ON project_states(created_at);

CREATE INDEX idx_api_interactions_session_id ON api_interactions(session_id);
CREATE INDEX idx_api_interactions_request_timestamp ON api_interactions(request_timestamp);
CREATE INDEX idx_api_interactions_success ON api_interactions(success);

-- JSONB indexes for efficient searching
CREATE INDEX idx_conversation_sessions_context_dump ON conversation_sessions USING GIN(context_dump);
CREATE INDEX idx_knowledge_artifacts_content ON knowledge_artifacts USING GIN(content);
CREATE INDEX idx_knowledge_artifacts_metadata ON knowledge_artifacts USING GIN(metadata);
CREATE INDEX idx_project_states_full_state ON project_states USING GIN(full_state);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_artifacts_updated_at 
    BEFORE UPDATE ON knowledge_artifacts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial project for your current claude-chatbot
INSERT INTO projects (name, description, status, metadata) 
VALUES (
    'claude-chatbot',
    'Initial Claude API integration project with interactive chatbot',
    'active',
    '{
        "location": "/home/pog/claude-chatbot",
        "type": "nodejs_project",
        "dependencies": ["axios", "dotenv", "nodemon"],
        "purpose": "Claude API integration with interactive chatbot"
    }'::jsonb
);

-- Create some helper views for Claude
CREATE VIEW current_project_states AS
SELECT 
    p.name as project_name,
    ps.state_name,
    ps.full_state,
    ps.file_structure,
    ps.system_info,
    ps.created_at
FROM project_states ps
JOIN projects p ON ps.project_id = p.id
WHERE ps.is_current = TRUE;

CREATE VIEW recent_conversations AS
SELECT 
    p.name as project_name,
    cs.session_name,
    cs.started_at,
    cs.ended_at,
    cs.summary,
    cs.tokens_used,
    cs.model_version
FROM conversation_sessions cs
JOIN projects p ON cs.project_id = p.id
ORDER BY cs.started_at DESC;

CREATE VIEW knowledge_by_relevance AS
SELECT 
    p.name as project_name,
    ka.artifact_type,
    ka.name,
    ka.relevance_score,
    ka.tags,
    ka.updated_at
FROM knowledge_artifacts ka
JOIN projects p ON ka.project_id = p.id
ORDER BY ka.relevance_score DESC, ka.updated_at DESC;
