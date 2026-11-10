# RMC-SAAS — Engineering Documentation Hub

This project is fully documented under the **[`docs/`](./docs/)** directory.

The documentation pack is structured into 14 comprehensive guides to assist developers with system architecture, module understanding, database design, and adding new features.

---

## 📖 Quick Links

| Category | Document | Description |
|---|---|---|
| **Architecture** | [Architecture Reference](./docs/ARCHITECTURE.md) | High-level system architecture, technology stack, data flows, and network topology |
| **Database** | [Database Reference](./docs/DATABASE.md) | MySQL 8.0 `RMC-SAAS` database schema (32 tables), relationships, and SQL quick reference |
| **API** | [API Reference](./docs/API-REFERENCE.md) | All 23 Express REST endpoints, request/response formats, and curl commands |
| **Workflow** | [Gate-to-Exit Workflow](./docs/GATE-TO-EXIT-WORKFLOW.md) | Complete vehicle lifecycle from arrival to weighbridge, loading, dispatch, and exit |
| **Modules** | [Modules Reference](./docs/MODULES.md) | Technical breakdown of all 20+ frontend modules, hooks, and pages |
| **CCTV & ANPR** | [Camera & ANPR Guide](./docs/CAMERA-ANPR.md) | MediaMTX RTSP-to-HLS proxy, camera webhooks, and PlateRecognizer pipeline |
| **Setup** | [Environment Setup Guide](./docs/ENVIRONMENT-SETUP.md) | From-scratch local development setup for frontend, backend, and MySQL |
| **Frontend** | [Frontend Engineering Guide](./docs/FRONTEND-GUIDE.md) | React 18, TypeScript, Vite, TanStack Query, and shadcn/ui patterns |
| **Backend** | [Backend Engineering Guide](./docs/BACKEND-GUIDE.md) | Node.js ES Modules server, Express routes, and MySQL pool management |
| **Enhancement** | [Enhancement Playbook](./docs/ENHANCEMENT-GUIDE.md) | Developer recipes for adding tables, APIs, hooks, and migrating modules to MySQL |
| **Storage** | [Data Storage Strategy](./docs/DATA-STORAGE-STRATEGY.md) | Matrix of MySQL vs localStorage vs in-memory storage per module |
| **Progress** | [Progress Tracker](./docs/PROGRESS-TRACKER.md) | Implementation status per module, API readiness, and prioritized backlog |
| **Testing** | [Testing & Verification Guide](./docs/TESTING-GUIDE.md) | API curl suite, camera stream checks, and end-to-end simulation script |
| **Troubleshooting**| [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) | Solutions for MySQL hyphen errors, port conflicts, and stream issues |

---

*For the complete index and table of contents, see **[`docs/README.md`](./docs/README.md)**.*

