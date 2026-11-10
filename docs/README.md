# RMC-SAAS — Engineering Pack Documentation

Welcome to the comprehensive engineering documentation for **RMC-SAAS** (Ready Mix Concrete Gate-to-Exit Management System).

This documentation suite is designed to serve as the definitive technical reference for software engineers, devops engineers, and QA personnel working on or extending the platform.

---

## 📚 Documentation Index

### 1. Architecture & Core Systems
- **[System Architecture](ARCHITECTURE.md)**  
  High-level architecture, technology stack breakdown, component diagrams, network topology, and core design principles.
- **[Database Reference](DATABASE.md)**  
  MySQL 8.0 `RMC-SAAS` database reference. Details connection configs, table definitions (32 tables), relationships, and SQL quick queries.
- **[API Reference](API-REFERENCE.md)**  
  Complete REST API documentation covering health checks, camera CRUD, network diagnostics, ANPR frame detection, and camera webhooks.

### 2. Operational Workflows & Modules
- **[Gate-to-Exit Workflow](GATE-TO-EXIT-WORKFLOW.md)**  
  End-to-end journey of a concrete mixer truck from gate arrival and tare weighing to loading, dispatch, delivery, and exit verification.
- **[Modules Reference](MODULES.md)**  
  Detailed technical breakdown of all 20+ frontend pages, their associated custom hooks, UI features, and data storage tier.
- **[Camera & ANPR Integration Guide](CAMERA-ANPR.md)**  
  Physical IP camera setup, RTSP streaming, MediaMTX HLS transcoder, and automatic license plate recognition pipelines.

### 3. Engineering & Development
- **[Frontend Architecture Guide](FRONTEND-GUIDE.md)**  
  React 18 + TypeScript architecture, Vite build system, TanStack Query v5 patterns, and shadcn/ui design standards.
- **[Backend Architecture Guide](BACKEND-GUIDE.md)**  
  Node.js ES Modules server, Express routes, MySQL connection pool (`server/db.js`), and image upload handling.
- **[Environment Setup Guide](ENVIRONMENT-SETUP.md)**  
  Step-by-step developer onboarding instructions to get the backend, frontend, database, and streaming proxies running from scratch.
- **[Enhancement Playbook & Recipes](ENHANCEMENT-GUIDE.md)**  
  Practical recipes for adding database tables, creating API routes, extending hooks, and migrating mock modules to MySQL.

### 4. Progress, Strategy & QA
- **[Data Storage Strategy & Migration Matrix](DATA-STORAGE-STRATEGY.md)**  
  Mapping of every functional module to its storage tier (Live MySQL vs localStorage vs in-memory) with migration priorities.
- **[Progress Tracker & Implementation Status](PROGRESS-TRACKER.md)**  
  Overall project completion status, module readiness matrix, and engineering backlog sprints.
- **[Testing & Verification Guide](TESTING-GUIDE.md)**  
  Ready-to-use curl API commands, video streaming checks, manual module QA checklist, and end-to-end test simulation script.
- **[Troubleshooting & Incident Resolution](TROUBLESHOOTING.md)**  
  Root cause analysis and resolution steps for MySQL hyphen issues, port collisions, MediaMTX faults, and Windows PowerShell quirks.

---

## ⚡ Quick Navigation for Developers

| I want to... | Read this document |
|---|---|
| **Set up the project locally on my machine** | [Environment Setup Guide](ENVIRONMENT-SETUP.md) |
| **Understand the vehicle lifecycle at the plant** | [Gate-to-Exit Workflow](GATE-TO-EXIT-WORKFLOW.md) |
| **Add a new database table or API endpoint** | [Enhancement Playbook](ENHANCEMENT-GUIDE.md) |
| **Configure or troubleshoot CCTV camera feeds** | [Camera & ANPR Integration](CAMERA-ANPR.md) |
| **Check which modules are live in MySQL vs mock** | [Data Storage Strategy](DATA-STORAGE-STRATEGY.md) |
| **Test endpoints with curl or verify the DB** | [Testing & Verification Guide](TESTING-GUIDE.md) |
| **Resolve database or port collision errors** | [Troubleshooting Guide](TROUBLESHOOTING.md) |

---

*Documentation maintained by the Engineering Team. Database: `RMC-SAAS` on MySQL 8.0.*

