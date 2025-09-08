# Durandal AI Development Assistant - Product Requirements

## What We're Building

**A simple AI development assistant that eliminates manual searching for corporate developers.**

Users upload files, work on them with AI assistance, and export improved results. No more searching databases, SharePoint, or codebases manually.

---

## Who Uses This

**Primary Users:** Corporate IT developers in Microsoft environments who waste time searching for information.

**Use Case:** Developer needs to understand legacy code, find database schemas, or ensure code follows company standards. Instead of manual searching, they ask Durandal.

---

## Core Requirements

### Essential Features (MVP)

**1. File Processing**
- Upload: Code files, documents, PDFs, spreadsheets, XML
- Parse and understand file contents automatically
- Export processed files in original or modified formats

**2. AI Assistance** 
- Answer questions about uploaded code/documents
- Generate code following company standards
- Explain complex legacy systems
- Suggest improvements and fixes

**3. Database Integration**
- Connect to SQL Server, MySQL, PostgreSQL
- Use Windows Authentication when possible
- Query databases and explain schemas
- Generate database documentation

**4. Development Tool Integration**
- Visual Studio Code extension/integration
- SSMS connectivity for database work
- SSIS integration for data workflows
- Support JavaScript, Python, SQL, C++, C#

**5. Persistent Memory**
- Remember conversations across sessions
- Learn company coding standards from uploaded files
- Store and recall project decisions and constraints
- Build knowledge base from organizational documents

### Nice-to-Have Features

- SharePoint integration for knowledge building
- Azure services connectivity
- Microsoft Fabric integration
- Advanced analytics and reporting

---

## Technical Requirements

### Architecture
- **Desktop Application:** Each user runs own instance
- **Shared Knowledge:** Network storage for organizational knowledge
- **On-Premises:** All data stays local (except AI API calls)
- **Simple Storage:** Start with SQLite, upgrade to PostgreSQL as needed

### Performance
- Response time < 2 seconds for most queries
- Handle large files (100MB+) efficiently
- Support multiple concurrent users on shared knowledge

### Security
- On-premises data storage
- Windows Authentication integration
- Minimal external communication (AI API only)
- No audit logging or RBAC for MVP

---

## Success Metrics

**Primary Goal:** 90% reduction in manual searching time

**Key Metrics:**
- Developers stop manually searching databases/SharePoint
- Code automatically follows company standards
- 30% faster development cycles
- >80% user adoption within 6 months

---

## Implementation Plan

### Phase 1: Core Foundation (8 weeks)
- File upload and AI-powered assistance
- Basic database connectivity (SQL Server)
- Simple persistent memory with SQLite
- VS Code integration

### Phase 2: Enterprise Integration (6 weeks) 
- Multi-database support (MySQL, PostgreSQL)
- SSMS/SSIS integration
- Enhanced memory system
- Shared knowledge repositories

### Phase 3: Advanced Features (8 weeks)
- SharePoint integration
- Azure connectivity
- Advanced knowledge management
- Production deployment

---

## What's Not Included (MVP)

- Web interface (desktop only)
- Multi-tenant architecture
- Advanced security features
- Real-time collaboration
- Cloud deployment
- Mobile applications

---

## Acceptance Criteria

**MVP Success:**
- Upload code files and get relevant AI assistance
- Connect to company databases using Windows Auth
- Remember context across development sessions
- VS Code integration provides in-editor help
- Export improved code files

**Full Success:**
- 90% reduction in manual searching demonstrated
- Code compliance checking works automatically
- Knowledge sharing between team members
- System handles 50+ concurrent users
- Average query response < 2 seconds

---

This PRD focuses on delivering a simple, working solution that solves the core problem: eliminating manual information searching for corporate developers. All features are designed to be implementable with clean, minimal code that's easy to iterate on as the product evolves.