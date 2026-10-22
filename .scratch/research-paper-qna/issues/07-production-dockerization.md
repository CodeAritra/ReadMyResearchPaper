# 07: Production Dockerization & Compose Orchestration

**What to build:** Containerize the full-stack system with production-ready multi-stage Dockerfiles for `apps/server` and `apps/web`, tied together with a root `docker-compose.yml`. A developer or researcher can spin up the complete research workbench with a single `docker compose up` command.

**Blocked by:** 05: Collection Workspaces & Partitioned Cross-Paper Comparative Synthesis, 06: Agentic Tool-Calling Seam for Future Academic Search (ArXiv / Web)

**Status:** ready-for-agent

- [ ] Production multi-stage `Dockerfile` is created for `apps/server` (Express RAG API).
- [ ] Production multi-stage `Dockerfile` is created for `apps/web` (Next.js standalone build).
- [ ] Root `docker-compose.yml` orchestrates the client and server services with environment variable passthrough.
- [ ] `.dockerignore` excludes unnecessary development dependencies, git metadata, and local scratch files.
- [ ] End-to-end containerized run builds and executes successfully with verified health checks.
