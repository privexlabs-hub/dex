# ADR-008 FFmpeg: system LGPL build, codec licensing reviewed

**Context.** Mixing, loudness normalisation (EBU R128), ducking, concat, burn-in and fast-start MP4 are FFmpeg jobs. libx264 is GPL; H.264/AAC carry patent considerations.

**Decision.** FFmpeg 8.1.x LGPL build in the renderer image (9.0 trialled in CI); typed `spawn` wrapper rather than fluent-ffmpeg; legal review of H.264 encoder choice (libx264 vs OpenH264 vs hardware) before public launch.

**Consequences.** Lower licence risk; encoder decision is an open item for Phase 4.
