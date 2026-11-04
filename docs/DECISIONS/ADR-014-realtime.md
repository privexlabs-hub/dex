# ADR-014 Real-time progress: Server-Sent Events + Redis pub/sub

**Decision.** Workers publish progress to Redis; the web app relays via SSE with `Last-Event-ID` resume and polling fallback. WebSockets and Neon Realtime rejected for Phase 2–5 needs (one-way, CDN-friendly, works on self-hosted Next without timeouts).
