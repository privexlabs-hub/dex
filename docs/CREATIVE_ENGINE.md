# Creative engine (planned — Phases 3–5; nothing here is implemented yet)

## CreativeSpecification

Versioned, Zod-validated JSON stored immutably per `production_version`:

```
schemaVersion
intent      { objective, audience, angle, hookType, narrative, tone, visualTreatment, cta }
brand       { profileVersionId, constraints }            // hard constraints, never defaulted
timeline    { fps, durationFrames, aspect }
scenes[]    { id, archetypeId, archetypeVersion, params, startFrame, durationFrames,
              transitionIn, camera, assets[], text[] }
audio       { voiceover, music, sfx[], ducking, loudnessTarget: -14 }
captions    { style, source: 'tts_alignment' | 'stt' }
render      { profiles[]: { aspect, height, fps, codec } }
```

Edits are JSON Patches creating new versions; the previous version is never overwritten.

## Scene archetypes, not templates

Trusted React components in `packages/remotion` (browser mockup, device showcase, dashboard walkthrough, UI zoom/highlight, kinetic type, feature grid, metric reveal, testimonial, end card). Each has a parameter schema over layout grid, camera path, reveal pattern, brand-derived typography system, pacing curve and transition family — on the order of 10⁵ configurations per archetype before content varies. Real product assets are referenced by id and rendered as-is (crop, zoom, highlight, frame); decorative generated assets are stored separately and labelled.

## Originality

See ADR-013: multi-axis briefs, N=8 candidates with pairwise differentiation, fingerprint rejection sampling, calibrated thresholds, workspace-scoped detail comparison and k-anonymised platform centroids, Vendi-score diversity tracking, structural alternatives when similarity is too high.

## Audio

Voiceover (ElevenLabs via the provider abstraction; own-voice cloning only with verified consent), licensed music/SFX with `license_record`, loudness normalisation (EBU R128, −14 LUFS), sidechain ducking, fades, mixing; captions from TTS word alignment or STT timings.

## Rendering pipeline

Preview profile (540p15, single chunk) for fast iteration; final profiles chunked (~300 frames) and rendered in parallel on autoscaled machines, concatenated and mixed with FFmpeg, fast-start MP4, thumbnails/posters/VTT emitted; frame-based progress over Redis → SSE; cancellation via AbortSignal; chunks retained 24h for resumption.
