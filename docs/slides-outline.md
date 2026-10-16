# Slides outline — The Ultimate Guide to Browser-Based AI (2026 rebuild)

Deck: deck/Ultimate-Guide-Browser-AI-2026.pptx · 35 slides · talk time 43.5 min (from the ⏱ lines in the speaker notes). Built 16 Oct 2026.
Source column: the research.md section (§n) or other input each slide's facts come from.

| # | Title | ⏱ min | Running | Facts from |
|---|---|---|---|---|
| 1 | Title slide | 0.5 | 0.5 | old deck title + bio wording |
| 2 | Demo 1 · The offline playground | 3 | 3.5 | demo/NOTES.md (versions, models, test results); story.md demo script |
| 3 | Hi, I'm Maxim | 0.5 | 4 | original deck slide 3 (bio); BRIEF.md (newsletter, book); research.md §4 (book) |
| 4 | Why run AI on the user's device? | 1.5 | 5.5 | session abstract (privacy, connectivity, cost); research.md §3b (no data sent quote); research.md §7 |
| 5 | What changed: 2023 → 2026 | 1.5 | 7 | research.md §2 (WebGPU); §1 (WebNN dev trial M125, CR snapshot, OT history); §3a/§3c (built-in AI); years for Chrome 125/138 inferred from milestone numbers |
| 6 | CPU, GPU or NPU? | 1.5 | 8.5 | original deck slide 8 (kept); research.md §1 (OS backends, NPU); §2 (WebGPU); §5 (wasm default) |
| 7 | The browser AI stack | 1.5 | 10 | story.md act 3 (stack); analysis.md (old slide 13 layered stack); research.md §1–§6 statuses |
| 8 | L5 · Task APIs: built-in models | 1 | 11 | research.md §3a, §3b (models, platforms) |
| 9 | Task API status, October 2026 | 1.5 | 12.5 | research.md §3a (Chrome per-API); §3c (Edge); §6 (Web Speech on-device) |
| 10 | Translate and summarize | 1 | 13.5 | developer.chrome.com/docs/ai/translator-api and /summarizer-api (read 16 Oct 2026); research.md §3a |
| 11 | L4 · Prompt API in four steps | 1.5 | 15 | research.md §3b (availability/download pattern, session mgmt); demo app.js runPrompt() |
| 12 | Prompt API: status and hardware | 1 | 16 | research.md §3a (Prompt API row, samplingMode); §3b (hardware, platforms); §3c (Edge hardware) |
| 13 | Same API, different model | 1 | 17 | research.md §3c (Edge Prompt API, Aion, hardware); §3d (interop concerns) |
| 14 | Who's on board? Standards and browser positions | 1 | 18 | research.md §3d (venue, Mozilla/WebKit positions); §1 (WebNN positions); §4 (WebMCP positions) |
| 15 | L3 · Frameworks: bring a model | 1 | 19 | research.md §5 (Transformers.js); §6 (WebLLM, ORT Web, LiteRT.js, MediaPipe, TF.js) |
| 16 | Transformers.js 4.3: what's new | 1.5 | 20.5 | research.md §5 (release, v4 changes, devices, dtypes, models); demo/NOTES.md (EP mapping) |
| 17 | One option switches the backend | 1 | 21.5 | demo inference-worker.js (pipeline call); research.md §1 (ORT Web WebNN EP options); §5 |
| 18 | L2 · WebGPU: in all four engines | 1 | 22.5 | research.md §2 (all rows) |
| 19 | L2 · WebNN: neural nets for the web | 1 | 23.5 | research.md §1 (IDL: MLContext, tensors, WebGPU interop); original deck slide 5/12 (context, operand, graph) |
| 20 | WebNN in Oct 2026: behind a flag | 1.5 | 25 | research.md §1 (spec maturity, charter, Chrome/Edge OT history, flag, positions) |
| 21 | Device selection: spec vs. Chromium | 1 | 26 | research.md §1 (MLContextOptions in spec vs Chromium IDL); demo app.js probeWebNN() |
| 22 | L1 · Under WebNN: the OS ML stack | 1 | 27 | research.md §1 (OS backends, EP order, LiteRT NPU note, NPU hardware) |
| 23 | How 'webnn-npu' reaches the NPU | 1 | 28 | research.md §5 (Transformers.js → ORT EP mapping); §1 (ORT Web EP, Chromium OS backends); demo/NOTES.md |
| 24 | Which models run on WebNN today? | 1 | 29 | research.md §1 (Hugging Face webnn org); §5 (WebNN in practice: UNVERIFIED list); demo/NOTES.md (models chosen, unverified) |
| 25 | Demo 2 · WebNN × Transformers.js on the NPU | 3.5 | 32.5 | story.md demo script; demo/NOTES.md |
| 26 | Demo 2 · the numbers | 1 | 33.5 | demo/NOTES.md (test results, published URL 18:00Z and local run) |
| 27 | Prompt API: images, audio, JSON | 1 | 34.5 | research.md §3a (Chrome 148 shipped text/image/audio + JSON Schema/regex); §3b (expectedInputs, responseConstraint) |
| 28 | Demo 3 · Prompt API with a fallback | 2.5 | 37 | story.md demo script; demo app.js runPrompt(); demo/NOTES.md (Prompt API card result) |
| 29 | Which layer for which job? | 1 | 38 | research.md §3 (task API availability); §5–§6 (frameworks, model sizes); §7 (pattern); story.md act 6 |
| 30 | Models are big. Plan the bytes. | 1 | 39 | research.md §5 (model sizes from the Hub); §6 (WebLLM sizes, storage quotas); demo/NOTES.md (whisper-tiny.en download) |
| 31 | Offline: app shell + model cache | 1 | 40 | demo sw.js (fetch handler, lines 24–49); demo inference-worker.js (env.useBrowserCache); demo/NOTES.md (offline fix, offline verified) |
| 32 | The fallback chain | 1 | 41 | research.md §7 (feature-detect pattern, fallback order); §5 (Transformers.js device strings); demo app.js resolveDevice() |
| 33 | What's next: WebMCP — tools, not clicks | 1 | 42 | research.md §4 (what it is, spec, Chrome status, positions, book) |
| 34 | Three things to take home | 1 | 43 | synthesis of research.md §1–§7 |
| 35 | Thank you! | 0.5 | 43.5 | original deck slide 24 (LinkedIn QR); BRIEF.md (newsletter); research.md §4 (book) |

## Facts not taken from research.md (traceability notes)
- Slide 5 (timeline): the years 2024 for WebNN's dev trial (Chrome 125) and 2025 for the Chrome 138 built-in APIs are inferred from Chrome milestone numbers; research.md gives the milestones, not those years. The 2023 (WebGPU), Firefox 141 (July 2025), Safari 26 (fall 2025), 22 Jan 2026 and Edge 148 (May 2026) dates are in research.md.
- Slide 10: the Translator and Summarizer snippets follow the examples on developer.chrome.com/docs/ai/translator-api and /summarizer-api, read on 16 Oct 2026 (Translator page shows browser support 138 / Edge 148). research.md has the statuses, not the code.
- Slide 27: the multimodal message format (role + content array of {type, value}) was checked on developer.chrome.com/docs/ai/prompt-api on 16 Oct 2026; research.md §3b has expectedInputs and responseConstraint only.
- Slide 19: the MLGraphBuilder / conv2d / relu wording describes the WebNN spec's graph-building structure; research.md §1 lists MLContext, tensors, dispatch and WebGPU interop but does not name MLGraphBuilder. 'Windows and workers, secure contexts' comes from demo/NOTES.md (spec IDL).
- Slide 6: the CPU / GPU / NPU characterisations ('low power, sustained', 'massively parallel') are the old deck's framing (analysis.md, slide 8), not a research.md fact.
- Slide 9: 'Proofreader — Edge: not listed' records an absence: research.md §3c names no Edge Proofreader.
- Slide 26: numbers are from demo/NOTES.md (published-URL run 18:00Z; 'local' values from the local-server run).
- Slide 31: the 'bug we hit' card comes from demo/NOTES.md, 'offline fix' section (18:12Z).

## Unverified items the deck states as such
- WebNN on NPU/GPU end to end: never run on the test machine (no navigator.ml in headless Linux Chromium 156). Slide 25 notes tell Maxim to rehearse; slide 26 has an empty 'measure on stage' row.
- Which Transformers.js models run on the WebNN EP: no maintained list exists (research.md §5); slide 24 says so.
