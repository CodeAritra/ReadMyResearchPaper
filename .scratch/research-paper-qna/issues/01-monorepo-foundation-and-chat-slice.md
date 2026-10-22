# 01: Tracer Bullet Monorepo Foundation & Minimal End-to-End Chat Slice

**What to build:** A working full-stack tracer bullet connecting the minimalist Next.js web interface to the Express backend over a streaming communication channel. A researcher can visit the web workbench, enter a message in a clean, high-signal chat interface, and observe tokens streaming back in real-time over Server-Sent Events (SSE), verified by an automated integration test exercising the full request-response lifecycle.

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] Monorepo workspace is configured with strict TypeScript across web client, server, and shared domain types.
- [x] A researcher can send a text message from the web UI and receive a streaming response via SSE with sub-second first-token latency.
- [x] UI is minimalist, monochromatic, and responsive, without unnecessary AI-themed decorative animations or gradients.
- [x] Automated end-to-end integration test passes, verifying that the client receives streamed chunks and terminates cleanly.
- [x] Type check passes across all workspace packages with zero errors.
