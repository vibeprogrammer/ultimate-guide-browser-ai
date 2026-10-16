# Browser-based AI: state of the platform, October 2026

Research for Maxim Salnikov's talk "The Ultimate Guide to Browser-Based AI". Every claim carries the primary source and the date it was read ('Read on' = date fetched). Items not confirmed are marked UNVERIFIED with the reason.

## 1. WebNN (Web Neural Network API)

| Claim | Status / value | Source URL | Read on |
|---|---|---|---|
| Spec maturity | W3C **Candidate Recommendation Draft**; latest TR version dated **2026-10-10** (earlier CRDs 2026-10-08, 2026-09-10, 2026-09-04, 2026-08-13, 2026-06-26) | https://api.w3.org/specifications/webnn/versions (W3C API; w3.org/TR itself sits behind a bot wall) | 2026-10-16 |
| Last CR Snapshot | **22 January 2026** (previous snapshot 11 April 2024; "over 100 significant changes" between them) | https://webmachinelearning.github.io/webnn/ (Editor's Draft, 10 October 2026, status section) | 2026-10-16 |
| Working Group charter | Web Machine Learning WG charter **2025-03-10 → 2027-04-30**; WebNN is its only normative deliverable; timeline "Q1 2027: Recommendation for WebNN" | https://api.w3.org/groups/wg/webmachinelearning/charters/532 ; charter text https://github.com/w3c/machine-learning-charter/blob/main/charter.html ("Normative Specifications", "Timeline") | 2026-10-16 |
| Device selection in the spec | `MLContextOptions { MLPowerPreference powerPreference = "default"; boolean accelerated = true; }` — **no `deviceType`**. `MLPowerPreference` = "default" / "high-performance" / "low-power". `MLContext` exposes `readonly attribute boolean accelerated`, `opSupportLimits()`, `lost`, `destroy()`, tensors (`createTensor`, `readTensor`, `writeTensor`, `dispatch`), WebGPU interop (`createContext(GPUDevice)`, `createExportableTensor`, `exportToGPU`) | https://webmachinelearning.github.io/webnn/ (IDL §8.2–8.3) | 2026-10-16 |
| Spec note on device selection | "MLContextOptions is under active development, and the design is expected to change…"; an `MLGraph.devices` extension is proposed to expose the devices actually chosen (issue #836) | https://webmachinelearning.github.io/webnn/ | 2026-10-16 |
| What Chromium actually accepts today | Chromium `main` IDL still has `MLDeviceType deviceType = "cpu"` ("cpu"/"gpu"/"npu") + `powerPreference`; no `accelerated` option or attribute in Chromium's IDL. All of it is `RuntimeEnabled=MachineLearningNeuralNetwork` | https://chromium.googlesource.com/chromium/src/+/main/third_party/blink/renderer/modules/ml/ml_context_options.idl and …/ml_context.idl | 2026-10-16 |
| Chrome: flag | `about://flags/#web-machine-learning-neural-network` ("Enables WebNN API"; feature `WebMachineLearningNeuralNetwork`), Mac/Windows/Linux/ChromeOS/Android. Also `#webnn-onnxruntime` (Windows ML / ONNX Runtime backend; disabling falls back to TFLite/LiteRT), `#webnn-coreml`, `#experimental-web-machine-learning-neural-network` | https://webnn.io/en/api-reference/browser-compatibility/chrome-flags ; chromestatus flag_name https://chromestatus.com/api/v0/features/5176273954144256 | 2026-10-16 |
| Chrome: dev trial | Dev trial since **M125** (desktop + Android) | https://chromestatus.com/feature/5176273954144256 | 2026-10-16 |
| Chrome: origin trial history | Approved for M145–147 → delayed; announced M146–148 → delayed again (release blockers); **re-enabled in M147, to run M147–M149, disabled on Android** (Reilly Grant, ~Mar 2026); **27 Mar 2026: OT disabled again** "due to more release blocking issues" (Phillis Tang); 15 May 2026: Chrome asked the OT team to remove the listing | https://groups.google.com/a/chromium.org/g/blink-dev/c/5CWKSChYo98/m/xMw0U5NkAAAJ (Intent to Experiment thread) | 2026-10-16 |
| Chrome: status today | **Not shipped; no active origin trial** found. Chrome stable is **156.0.8078.x**. Chrome 146 and 147 release notes list WebNN under "Origin trials" (that trial was later pulled). No release note M148–M154 mentions WebNN. chromestatus still says "Proposed" with OT stage starting 147 (no end milestone) | https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions ; https://developer.chrome.com/release-notes/146 , /147, /148…/154 ; chromestatus API above | 2026-10-16 |
| Edge: origin trial | Edge OT "WebNN [Closed]", "no longer accepting new registrations", **Trial Expiration Date August 11, 2026** | https://developer.microsoft.com/microsoft-edge/origin-trials/trials/19857284-cf52-484b-8b09-8ca50ac9dccb | 2026-10-16 |
| How to try it now | webnn.io installation guide (updated 9 Oct 2026): Chrome Canary or Edge Canary → about://flags → "Enables WebNN API" → Enabled. "The Windows ML / OpenVINO Execution Provider requires Windows 11, version 24H2 or newer"; on older Windows, Windows 10 and Linux use the LiteRT backend (disable "ONNX Runtime backend for WebNN") | https://webnn.io/en/learn/get-started/installation | 2026-10-16 |
| OS backends (Chromium) | **Windows 11 24H2+: Windows ML / ONNX Runtime** (CPU via LiteRT/XNNPACK, GPU + NPU via Windows ML); EP sort order NPU > GPU > CPU, "WebGPU EP before DirectML EP", "Windows App Runtime and Windows 11 24H2+ are required for IHV EPs". **macOS 14.4+ Apple Silicon: Core ML** (npu → `MLComputeUnitsCPUAndNeuralEngine` with explicit flag, else `MLComputeUnitsAll`). **LiteRT** on ChromeOS, Linux, Android and as fallback; "NPU requests are not yet accelerated by LiteRT (crbug.com/454732289) and run on XNNPACK" | https://webnn.io/en/api-reference/browser-compatibility/deviceselection ; https://webnn.io/en/api-reference/browser-compatibility/windowsml | 2026-10-16 |
| NPU hardware verified | Intel Core Ultra (Meteor Lake), Series 2 (Lunar Lake, Arrow Lake), Series 3 (Panther Lake). Driver table on the install page still says "TBD" | https://webnn.io/en/faq/hardware ; https://webnn.io/en/learn/get-started/installation | 2026-10-16 |
| Firefox position | Mozilla standards-position **positive** (issue #1215, venue W3C, closed 2026-01-12). MDN BCD: Firefox not supported | https://github.com/mozilla/standards-positions/issues/1215 ; https://github.com/mdn/browser-compat-data/blob/main/api/ML.json | 2026-10-16 |
| Safari position | WebKit standards-position request **open, no position** (issue #486, from Microsoft/Intel, last updated 2026-05-01). MDN BCD: Safari not supported | https://github.com/WebKit/standards-positions/issues/486 ; MDN BCD api/ML.json | 2026-10-16 |
| ORT Web WebNN EP options | `executionProviders: [{ name: 'webnn', deviceType: 'cpu'\|'gpu'\|'npu' (default 'cpu'), powerPreference: 'default'\|'low-power'\|'high-performance', context: MLContext }]`; `context` is required for IO binding and overrides the others; `freeDimensionOverrides` for dynamic-shape models. Docs say WebNN is "behind a 'Enables WebNN API' flag" in Chrome and Edge | https://onnxruntime.ai/docs/tutorials/web/ep-webnn.html | 2026-10-16 |
| webnn-samples | github.com/webmachinelearning/webnn-samples, live at webmachinelearning.github.io/webnn-samples, last push 2026-04-22 | https://api.github.com/repos/webmachinelearning/webnn-samples | 2026-10-16 |
| WebNN Developer Preview | github.com/microsoft/webnn-developer-preview, last push **2026-10-15** (active) | https://api.github.com/repos/microsoft/webnn-developer-preview | 2026-10-16 |
| Hugging Face "webnn" org | 5 Spaces (video-background-removal, depth-estimation-video, video-object-detection, remove-background, pose-landmark-detection-video) and 42 models (e.g. Phi-4-mini-instruct-onnx-webnn, whisper-base-webnn, segment-anything-model-webnn, stable-diffusion-v1.5-webnn, sdxl-turbo, yolo11n/yolo12n, Florence-2-base, depth-anything-base-hf, Qwen2-0.5B-Instruct-onnx, TinyLlama-1.1B, PP-OCRv5, Z-Image-Turbo) | https://huggingface.co/api/spaces?author=webnn ; https://huggingface.co/api/models?author=webnn | 2026-10-16 |
| webnn.io | Community docs site (learn, API reference, browser compatibility per backend, Chrome flags, device selection, ORT WebNN EP ops, tutorials incl. Transformers.js and LiteRT.js); pages "Last updated on October 9, 2026". Site banner still says "The WebNN Origin Trial is coming!" | https://webnn.io/en/learn/get-started/installation | 2026-10-16 |

Notes for the deck
- The old slide 11 ("origin trials to July 2026") is wrong now: the Chrome OT was pulled in March 2026 and the Edge OT expired 11 Aug 2026. As of 16 Oct 2026 WebNN is **flag-only (dev trial)** in Chrome and Edge. Say it plainly: "behind a flag, spec in CR, Rec targeted Q1 2027".
- Device selection is in flux: the spec removed `deviceType` and has `powerPreference` + `accelerated`; Chromium still accepts `deviceType` (cpu/gpu/npu); ORT Web and Transformers.js still pass `deviceType`. Show both, labelled "spec" vs "what Chrome Canary implements today".
- NPU on Windows needs Windows 11 24H2+ with Windows ML; Linux/ChromeOS/Android NPU requests silently run on CPU (XNNPACK).
- The Windows backend moved from DirectML to Windows ML / ONNX Runtime (DirectML EP is now just one EP option, ranked after the WebGPU EP).

## 2. WebGPU

| Claim | Status / value | Source URL | Read on |
|---|---|---|---|
| Chrome / Edge ship | Enabled by default in **Chrome 113** (announced in Beta, 2023) on **ChromeOS, macOS, Windows**; Edge from 113 too | https://developer.chrome.com/blog/webgpu-release ; https://chromestatus.com/feature/6213121689518080 ; https://web.dev/blog/webgpu-supported-major-browsers | 2026-10-16 |
| Chrome Android | **Chrome 121**, Android 12+ with Qualcomm/ARM GPUs | https://web.dev/blog/webgpu-supported-major-browsers | 2026-10-16 |
| Chrome Linux | **Chrome 144**: "carefully rolling out WebGPU for Linux, starting with support for Intel Gen12+ GPUs", plan to expand to AMD/NVIDIA; uses Vulkan | https://developer.chrome.com/blog/new-in-webgpu-144 ; MDN BCD api/GPU.json | 2026-10-16 |
| Firefox | **Firefox 141** (July 2025) on **Windows** only; **Firefox 145** macOS Tahoe 26 on Apple Silicon; Firefox 147 older macOS on Apple Silicon (MDN BCD); not on Linux, Intel Macs or Android yet; not in service workers. Current Firefox release: see version row | https://mozillagfx.wordpress.com/2025/07/15/shipping-webgpu-on-windows-in-firefox-141/ ; https://web.dev/blog/webgpu-supported-major-browsers ; https://github.com/mdn/browser-compat-data/blob/main/api/GPU.json (notes cite bugs 1972486, 1992212, 1993341, 2004105, 2006676) | 2026-10-16 |
| Safari | **Safari 26.0** (fall 2025): "now shipping in Safari 26.0 for macOS, iOS, iPadOS, and visionOS" | https://webkit.org/blog/17333/webkit-features-in-safari-26-0/ | 2026-10-16 |
| "All major browsers" milestone | web.dev, 25 Nov 2025: WebGPU "is officially supported across Chrome, Edge, Firefox, and Safari"; lists Transformers.js and ONNX Runtime in the ecosystem | https://web.dev/blog/webgpu-supported-major-browsers | 2026-10-16 |
| caniuse summary | Chrome/Edge 113+ "y" (Linux depends on hardware/drivers); Firefox partial (Windows + macOS 26 Apple Silicon); Safari macOS partial (macOS 26 Tahoe+); iOS Safari 26.0+ "y" | https://raw.githubusercontent.com/Fyrd/caniuse/main/features-json/webgpu.json | 2026-10-16 |
| shader-f16 | Chrome **120** (`shader-f16` optional feature) | https://chromestatus.com/feature/5180552617656320 | 2026-10-16 |
| Subgroups | Chrome **134** enabled by default (OT 128–131) | https://chromestatus.com/feature/5126409856221184 | 2026-10-16 |
| Newer WebGPU additions in Chrome | `subgroup_id` (M144), uniform buffer standard layout (M144), `linear_indexing` (M148), Immediates (M150), subgroup size control (M152), `buffer_view` (M153) | https://developer.chrome.com/release-notes/144 , /148, /150, /152, /153 | 2026-10-16 |
| Browser versions today | Chrome stable 156.0.8078.x; Firefox release 158.0, Dev Edition 159.0b3, Nightly 160.0a1 | https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions ; https://product-details.mozilla.org/1.0/firefox_versions.json | 2026-10-16 |

Notes for the deck
- WebGPU is the one ML-relevant acceleration API that is **shipped everywhere** (with per-OS gaps: Firefox Linux/Android, Safari pre-Tahoe, Chrome Linux non-Intel). That's the honest "default fast path" today, with WASM as the universal fallback.
- `shader-f16` is optional per adapter: feature-detect `adapter.features.has('shader-f16')` before picking fp16/q4f16 weights.

## 3. Built-in AI APIs (Chrome and Edge)

### 3a. Chrome — one row per API

| API (JS surface) | Chrome status (web) | Origin trial history | Spec repo (venue) | Source URL | Read on |
|---|---|---|---|---|---|
| Translator (`Translator`) | **Stable, Chrome 138** (desktop only) | OT 131–136, extended to 138 | webmachinelearning/translation-api (WebML CG) | https://developer.chrome.com/docs/ai/built-in-apis (status table) ; https://chromestatus.com/feature/5172811302961152 | 2026-10-16 |
| Language Detector (`LanguageDetector`) | **Stable, Chrome 138** (desktop only) | OT 130–135, extended to 138 | webmachinelearning/translation-api (WebML CG) | built-in-apis table ; https://chromestatus.com/feature/6494349985841152 | 2026-10-16 |
| Summarizer (`Summarizer`) | **Stable, Chrome 138** | OT 131–136, extended to 139 | webmachinelearning/writing-assistance-apis (WebML CG) | built-in-apis table ; https://chromestatus.com/feature/5193953788559360 | 2026-10-16 |
| Prompt API (`LanguageModel`) | **Stable on the web in Chrome 148**; in **Chrome Extensions since Chrome 138**. Shipped with **text, image and audio input** and **response constraints (JSON Schema and regex)** | Web OT 139–144, extended to 147 | webmachinelearning/prompt-api (WebML CG) | built-in-apis table ; https://chromestatus.com/feature/5134603979063296 ; https://developer.chrome.com/release-notes/148 ("The initial implementation supports text, image, and audio inputs… response constraints… regular expression and JSON schema") | 2026-10-16 |
| Prompt API sampling parameters (`samplingMode`) | **Origin trial from Chrome 148** (OT 148–153, extended to 159; ship planned 160 per chromestatus). On the web, `temperature`/`topK` are not exposed by default; Extensions keep legacy `topK`, `temperature`, `LanguageModel.params()` | — | prompt-api | https://chromestatus.com/feature/6325545693478912 ; https://developer.chrome.com/docs/ai/prompt-api (last updated 26 Aug 2026) | 2026-10-16 |
| Writer (`Writer`) | **Developer trial (flag)** — not shipped | OT 137–142, extended to 145, **ended** | writing-assistance-apis (WebML CG) | built-in-apis table ("Developer trial") ; https://chromestatus.com/feature/4712595362414592 | 2026-10-16 |
| Rewriter (`Rewriter`) | **Developer trial (flag)** — not shipped | OT 137–142, extended to 145, **ended** | writing-assistance-apis (WebML CG) | built-in-apis table ; https://chromestatus.com/feature/5112320150470656 | 2026-10-16 |
| Proofreader (`Proofreader`) | **Developer trial (flag)** — not shipped | Dev trial 139; OT 141–146, **ended** | webmachinelearning/proofreader-api (WebML CG) | built-in-apis table ; https://chromestatus.com/feature/5164677291835392 | 2026-10-16 |
| Pipeline entries (no milestones yet) | "Prompt API on Android", "Summarizer API on Android", "Translator API on Android", "Language Detector API on Android", "Prompt API Thinking Mode" (updated 2026-10-06), "Summarizer API performance preference" — all "Proposed" | — | — | chromestatus search API https://chromestatus.com/api/v0/features?q=Prompt%20API (ids 5888755098583040, 5165424388997120, 5106126157905920, 5087964794322944, 5098001721851904, 6309243756085248) | 2026-10-16 |

### 3b. Chrome requirements and patterns

| Claim | Value | Source URL | Read on |
|---|---|---|---|
| Models | Language Detector and Translator use **expert models**; the others use a foundation language model (Gemini Nano). Summarizer/Writer/Rewriter/Proofreader are text-to-text; Prompt API is multimodal. "From Chrome 149, the models support English, Spanish, Japanese, German, and French" | https://developer.chrome.com/docs/ai/get-started | 2026-10-16 |
| Platforms | Translator + Language Detector: Chrome **desktop** only, "do not work on mobile devices". Foundation-model APIs: **Windows 10/11, macOS 13+, Linux, ChromeOS (Platform 16389.0.0+) on Chromebook Plus**; not Chrome for Android, iOS, or non-Plus ChromeOS | same | 2026-10-16 |
| Hardware | Storage: **at least 22 GB free** on the profile volume (model is removed if free space falls below 10 GB). **GPU: strictly more than 4 GB VRAM**, or **CPU: 16 GB RAM + 4 cores**. "The Prompt API with audio input requires a GPU." Network: unmetered for the initial download only; "No data is sent to Google or any third party when using the model." Exact model size: chrome://on-device-internals | same | 2026-10-16 |
| Availability/download pattern | `await LanguageModel.availability(options)` (pass the same options you will use) → `LanguageModel.create({ monitor(m) { m.addEventListener('downloadprogress', e => …e.loaded…) } })`; availability can be "downloading" | https://developer.chrome.com/docs/ai/prompt-api | 2026-10-16 |
| Multimodal | `expectedInputs` types: `text`, `image`, `audio`; `expectedOutputs`: text only; `languages` arrays | same | 2026-10-16 |
| Structured output | `responseConstraint` (JSON Schema) on `prompt()` / `promptStreaming()` | same | 2026-10-16 |
| Session management | `contextWindow` (tokens available), overflow drops the oldest prompt/response pairs; `clone()`; `destroy()` | same | 2026-10-16 |
| TypeScript | `@types/dom-chromium-ai` | https://developer.chrome.com/docs/ai/built-in-apis | 2026-10-16 |

### 3c. Microsoft Edge

| Claim | Value | Source URL | Read on |
|---|---|---|---|
| Prompt API in Edge | **Developer preview in Edge Canary and Dev from 138.0.3309.2**, using built-in **Phi-4-mini** (4B params). Flag: `edge://flags` → "Prompt API for on-device language model" (through Edge 149 labelled "Prompt API for Phi mini"; MDN lists `#edge-llm-prompt-api-for-phi-mini`) | https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api (updated 2026-06-02) ; MDN BCD api/LanguageModel.json | 2026-10-16 |
| Aion-1.0-Instruct | From **Edge 150.0.4070**, prerelease **Aion-1.0-Instruct** model (smaller/faster, runs on weaker GPUs or CPU-only) via flag "Enable prerelease on-device language model"; overrides Phi-4-mini when enabled. Blog (2 Jun 2026) said an open-source release on Hugging Face was planned "in July" | same ; https://blogs.windows.com/msedgedev/2026/06/02/expanding-on-device-ai-in-microsoft-edge-new-models-and-apis-for-the-web/ | 2026-10-16 |
| Edge hardware (Phi-4-mini) | Windows 10/11 or macOS 13.3+; ≥20 GB free on the profile volume (deleted below 10 GB); **GPU with 5.5 GB VRAM or more** | https://learn.microsoft.com/en-us/microsoft-edge/web-platform/prompt-api | 2026-10-16 |
| Writing Assistance in Edge | Writer + Rewriter: developer preview, Canary/Dev from 138.0.3309.2, flags "Writer API for on-device language model" / "Rewriter API for on-device language model"; "The Summarizer API has been enabled by default since that version" (in those channels) | https://learn.microsoft.com/en-us/microsoft-edge/web-platform/writing-assistance-apis (updated 2026-06-02) | 2026-10-16 |
| Translator + Language Detector in Edge | **Shipped in Edge 148** (May 2026), on-device task-specific models, "145+ languages" | https://learn.microsoft.com/en-us/microsoft-edge/web-platform/release-notes/148 ; blogs.windows.com post above | 2026-10-16 |
| On-device speech in Edge | "Experimental on-device speech recognition with the Web Speech API, available in Edge Canary and Dev" | blogs.windows.com post above | 2026-10-16 |

### 3d. Standards track and other browsers

| Claim | Value | Source URL | Read on |
|---|---|---|---|
| Venue | Translator & Language Detector, Writing Assistance (Summarizer/Writer/Rewriter), Proofreader, Prompt API and WebMCP are **deliverables of the W3C Web Machine Learning Community Group** (incubation; "may graduate to the Working Group"). The WG charter (2025-03-10 → 2027-04-30) lists only WebNN as normative and commits to working with the CG on "Tentative Specifications… for the Recommendation track" | https://webmachinelearning.github.io/charter/ ; https://github.com/w3c/machine-learning-charter/blob/main/charter.html ; https://api.w3.org/groups/wg/webmachinelearning/charters/532 | 2026-10-16 |
| Spec repos active | prompt-api (push 2026-10-13), writing-assistance-apis (2026-10-06), translation-api (2026-10-14), proofreader-api (2026-10-06), webmcp (2026-10-16) | https://api.github.com/repos/webmachinelearning/<repo> | 2026-10-16 |
| Mozilla positions | Prompt API: **negative** (#1213, concerns: interoperability). Writing Assistance APIs: **negative** (#1067). Language Detector API: open, no position (#1219). WebNN: positive (#1215) | https://github.com/mozilla/standards-positions/issues/1213 , /1067 , /1219 , /1215 | 2026-10-16 |
| WebKit positions | Prompt API: **oppose** (#495, concerns: interoperability, privacy). Writing Assistance APIs: open (#393). WebNN: open (#486) | https://github.com/WebKit/standards-positions/issues/495 , /393 , /486 | 2026-10-16 |
| MDN BCD | LanguageModel: Chrome 148, Edge 138 behind flag, Firefox/Safari no. Summarizer/Translator/LanguageDetector: Chrome 138; Translator/LanguageDetector Edge 148; Firefox/Safari no; Chrome Android no | https://github.com/mdn/browser-compat-data/tree/main/api (LanguageModel.json, Summarizer.json, Translator.json, LanguageDetector.json) | 2026-10-16 |

Notes for the deck
- The old slide 22 ("not on W3C standards track", one experimental item) is now: three APIs stable in Chrome since 138, the Prompt API stable on the web in Chrome 148 with image + audio input and JSON-schema output, Writer/Rewriter/Proofreader back to flags after their OTs ended, and all of them incubated in the W3C WebML **Community Group** (not yet the WG). Firefox and Safari have formally opposed the Prompt API.
- Edge implements the same API shapes on a different model (Phi-4-mini, now Aion-1.0-Instruct preview) — the "same code, different model" point is real and worth a slide; so is the interop concern it raises.
- Hardware bar is high (22 GB disk, >4 GB VRAM or 16 GB RAM); always gate on `availability()` and keep a fallback.

## 4. WebMCP

| Claim | Value | Source URL | Read on |
|---|---|---|---|
| What it is | A web API that lets a page expose its functionality to browser AI agents as **tools** — JS functions with natural-language descriptions and JSON-Schema inputs; "agnostic with respect to the underlying protocols and does not aim to match the exact capabilities of the Model Context Protocol (MCP)" | https://webmachinelearning.github.io/charter/ (CG charter, "WebMCP API") | 2026-10-16 |
| Spec | **Draft Community Group Report, 16 October 2026** (W3C WebML CG). Surface: `document.modelContext` (`partial interface Document { [SecureContext, SameObject] readonly attribute ModelContext modelContext; }`), `ModelContext.registerTool({name, description, inputSchema?, execute, annotations?})`, `getTools()`, `executeTool()`, `ontoolchange` event | https://webmachinelearning.github.io/webmcp/ ; repo https://github.com/webmachinelearning/webmcp | 2026-10-16 |
| Two API shapes | **Declarative API** (actions defined directly in HTML forms) and **Imperative API** (JavaScript) | https://developer.chrome.com/blog/webmcp-epp (published 10 Feb 2026, "WebMCP is available for early preview") | 2026-10-16 |
| Chrome status | Dev trial **M146** (desktop + Android); **origin trial M149–M156, extended to M162** (chromestatus, updated 2026-09-28) | https://chromestatus.com/feature/5117755740913664 | 2026-10-16 |
| Other browsers | Mozilla: **neutral** (#1412, venue W3C CG). WebKit: **oppose** (#670; concerns: duplication, internationalization) | https://github.com/mozilla/standards-positions/issues/1412 ; https://github.com/WebKit/standards-positions/issues/670 | 2026-10-16 |
| Maxim's book | **"Tools, Not Clicks: Building Agent-Ready Websites with WebMCP"** by Maxim Salnikov — free online edition, "Complete edition · updated for the WebMCP draft of 15 Oct 2026", 17 chapters in 6 parts + 4 appendices, free PDF by email. Repo README notes the Leanpub ebook link is not added yet (no Leanpub/Amazon listing found) | https://vibeprogrammer.github.io/webmcp-book/ ; https://github.com/vibeprogrammer/webmcp-book ; demos https://github.com/vibeprogrammer/webmcp-book-demos | 2026-10-16 |
| Maxim's WebMCP demos | e.g. https://webmaxru.github.io/webmcp-webai/ (repo webmaxru/webmcp-webai) and several "webmcp-*-workbench" apps | https://api.github.com/users/webmaxru/repos | 2026-10-16 |

Notes for the deck
- One or two sentences: "WebMCP turns your page into a set of typed tools the browser's agent can call inside the user's own session — the agentic counterpart of the built-in AI APIs." Status: CG draft, Chrome origin trial (M149–M162), WebKit opposed, Mozilla neutral.
- The book link to use: https://vibeprogrammer.github.io/webmcp-book/ (the only official page found; ask Maxim if a Leanpub/Amazon listing exists).


## 5. Transformers.js (16 Oct 2026)

| Claim | Status / value | Source URL | Read on |
|---|---|---|---|
| Latest release | **4.3.1**, published 2026-10-06 (npm `latest`); `next` tag is 4.0.0-next.11. 4.x line: 4.0.0 (2026-03-30), 4.0.1, 4.1.0 (04-15), 4.2.0 (04-22), 4.3.0 (09-16), 4.3.1 (10-06) | https://registry.npmjs.org/@huggingface/transformers (dist-tags, time) ; https://github.com/huggingface/transformers.js/releases/tag/4.3.1 | 2026-10-16 |
| v4 headline change | "New WebGPU backend": a new WebGPU runtime in ONNX Runtime "completely rewritten in C++", tested across ~200 supported architectures; optimized ONNX exports (e.g. com.microsoft.MultiHeadAttention); many new models; `ModelRegistry`; new env settings; logging controls (ORT WebGPU warnings hidden by default); pnpm workspaces monorepo (`packages/transformers`), standalone Tokenizers.js, new build system, better types | https://github.com/huggingface/transformers.js/releases/tag/4.0.0 (published 2026-03-30) | 2026-10-16 |
| 4.3.1 adds | EmbeddingGemma 2 (multimodal embeddings, 740M params; example uses `device: "webgpu"`, `dtype: "q4"`) | https://github.com/huggingface/transformers.js/releases/tag/4.3.1 | 2026-10-16 |
| ONNX Runtime pinned | `onnxruntime-web` **1.31.0-dev.20260914-8d85527a0**, `onnxruntime-node` 1.30.0 (package.json of 4.3.1) | https://registry.npmjs.org/@huggingface/transformers (versions['4.3.1'].dependencies) | 2026-10-16 |
| Device strings | `DEVICE_TYPES`: auto, gpu, cpu, wasm, webgpu, cuda, dml, coreml, **webnn, webnn-npu, webnn-gpu, webnn-cpu**. Browser default device = `wasm` (Node = `cpu`). `device` may also be an object keyed per model file | https://raw.githubusercontent.com/huggingface/transformers.js/4.3.1/packages/transformers/src/utils/devices.js | 2026-10-16 |
| WebNN → ORT EP mapping | `webnn` → `{name:'webnn', deviceType:'cpu'}`; `webnn-npu` → `deviceType:'npu'`; `webnn-gpu` → `'gpu'`; `webnn-cpu` → `'cpu'`. WebNN devices are offered only when `'ml' in navigator` (`IS_WEBNN_AVAILABLE`); WebGPU when `'gpu' in navigator`; `device:'auto'` = every supported provider in order webnn-npu, webnn-gpu, webnn-cpu, webnn, webgpu, wasm (ORT falls through); `device:'gpu'` = webgpu/cuda/dml/webnn-gpu. Source comment: "TODO: Only push supported providers (depending on available hardware)" — i.e. no hardware probing, just API presence | https://raw.githubusercontent.com/huggingface/transformers.js/4.3.1/packages/transformers/src/backends/onnx.js (lines 40–43, 131–172) ; …/src/env.js (lines 52–53) | 2026-10-16 |
| dtypes | auto, fp32, fp16, q8, int8, uint8, q4, bnb4, q4f16 ("fp16 model with 4-bit block weight quantization"). Default dtype: **q8 on wasm**, otherwise **fp32** (per `DEFAULT_DEVICE_DTYPE_MAPPING`); dtype can be set per model file (e.g. `{encoder_model:'fp16', decoder_model_merged:'q4'}`) | https://raw.githubusercontent.com/huggingface/transformers.js/4.3.1/packages/transformers/src/utils/dtypes.js | 2026-10-16 |
| Caching | `env.useBrowserCache` = true when the Cache API exists (models cached in Cache Storage); `env.useFSCache` + `env.cacheDir` for Node; `env.useCustomCache`/`customCache` for your own store (e.g. OPFS) | https://raw.githubusercontent.com/huggingface/transformers.js/4.3.1/packages/transformers/src/env.js (lines 211–267) | 2026-10-16 |
| Models on the Hub | **4,272** models tagged library=transformers.js (the old deck said "2.7K+") | https://huggingface.co/models?library=transformers.js (page JSON `numTotalItems`) | 2026-10-16 |
| Model sizes (ONNX weights, MB, from the Hub file listing) | ResNet-50 (Xenova/resnet-50): fp32 102 / fp16 51 / q8 26. whisper-tiny.en (onnx-community): fp32 265 / fp16 133 / q8 70. whisper-base: fp32 486 / fp16 244 / q8 127. SmolLM2-135M-Instruct: fp32 540 / fp16 270 / q8 137 / q4f16 118. Qwen3-0.6B-ONNX: fp16 1,203 / q8 618 / q4f16 570. Kokoro-82M TTS: fp32 326 / q8 92. Moonshine-tiny: fp32 183 / q8 46 | https://huggingface.co/api/models/<id>?blobs=true (sums of *.onnx files per dtype suffix) | 2026-10-16 |
| WebNN + Transformers.js in practice | The WebNN EP needs static shapes (`freeDimensionOverrides`) and op coverage; Transformers.js passes only `deviceType`. Models exported for WebNN live in the Hugging Face **webnn** org (section 1). Which Transformers.js models run on WebNN today is **UNVERIFIED** beyond the demo helper's own tests (see demo/NOTES.md) — the lead did not find a maintained compatibility list | — | 2026-10-16 |

## 6. Other tools

| Tool | Status / value | Source URL | Read on |
|---|---|---|---|
| WebLLM (MLC) | npm `@mlc-ai/web-llm` **0.2.86** (2026-10-11); repo active (pushed 2026-10-11, ~19.3k stars). Prebuilt model list with VRAM needs, e.g. Llama-3.2-1B-Instruct q4f16 ≈ 879 MB, q4f32 ≈ 1.13 GB; Phi-3.5-mini q4f16 ≈ 3.7 GB. WebGPU only | https://registry.npmjs.org/@mlc-ai/web-llm ; https://raw.githubusercontent.com/mlc-ai/web-llm/main/src/config.ts (vram_required_MB) | 2026-10-16 |
| ONNX Runtime Web | npm `onnxruntime-web` **1.30.0** stable (2026-09-14); Transformers.js 4.3.1 pins a 1.31 dev build. EPs in the browser: wasm, webgpu, webnn (webgl legacy) | https://registry.npmjs.org/onnxruntime-web ; https://onnxruntime.ai/docs/tutorials/web/ep-webnn.html | 2026-10-16 |
| MediaPipe GenAI / LiteRT.js | `@mediapipe/tasks-genai` **0.10.29** (2026-07-08); `@litertjs/core` **2.5.3** (2026-07-17) — Google's LiteRT (ex-TFLite) runtime for the web (WebGPU/WASM). Feature details UNVERIFIED by the lead beyond the npm versions | https://registry.npmjs.org/@mediapipe/tasks-genai ; https://registry.npmjs.org/@litertjs/core | 2026-10-16 |
| TensorFlow.js | Latest release **4.22.0, 2024-10-21** — no release in two years (maintenance mode in practice) | https://api.github.com/repos/tensorflow/tfjs/releases/latest | 2026-10-16 |
| Web Speech API on-device | `SpeechRecognition.processLocally`, `SpeechRecognition.available()`, `SpeechRecognition.install()` — Chrome **139** (Edge mirrors), Firefox preview, Safari no. chromestatus entry 6090916291674112 "On-device Web Speech API" still reads "In developer trial (Behind a flag)" at milestone 139 (status text not updated; BCD says shipped in 139) | https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/SpeechRecognition.json ; https://chromestatus.com/feature/6090916291674112 | 2026-10-16 |
| Storage quotas | Chromium: an origin may store up to **60 % of total disk** (best-effort and persistent); Chrome uses at most 80 % of disk overall. WebKit browser apps: ~60 % of disk per origin (older Safari: 1 GiB then a prompt); embedded WebKit apps ~15 %. Firefox prompts the user for persistent storage. Data is "very rarely deleted" for sites the user visits regularly (Chrome research) | https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria | 2026-10-16 |

## 7. Tensions and the pattern (the slide text derives from sections 1–6)
- Privacy: nothing leaves the device at inference time (built-in APIs, WebNN/WebGPU/WASM all run locally); but model downloads come from the network (Hub/CDN) — cache them.
- Offline: service worker for the app shell + Cache Storage for models (Transformers.js default); quota is generous on desktop (60 % of disk in Chromium) and tighter on embedded WebKit (15 %); persistence is `navigator.storage.persist()`.
- Hardware variance: WebGPU is on all four engines now (section 2) but adapters differ (shader-f16, limits); WebNN is flag-only with NPU on Windows 11 24H2+ via Windows ML and on Apple Silicon via Core ML (section 1); CPU/WASM always works.
- Model size: 25 MB (ResNet-50 q8) to 600 MB+ (0.6B LLM q4f16) to multi-GB (WebLLM Phi-3.5-mini); dtype choice per device matters (q8 default on wasm, fp16/q4f16 on GPU).
- Progressive enhancement: feature-detect (`'LanguageModel' in self` + `availability()`; `'ml' in navigator` + `createContext()`; `navigator.gpu?.requestAdapter()`), then fall back built-in → WebNN → WebGPU → WASM → cloud. Chrome's own guidance on client-side AI and hybrid fallbacks: https://developer.chrome.com/docs/ai (built-in APIs) and web.dev/learn/ai/client-side (read 2026-10-16 by the research helper in section 3).

## Quick reference for slides (one line each; source section)
1. WebNN spec: W3C Candidate Recommendation (snapshot 22 Jan 2026; CR Draft 10 Oct 2026); Rec targeted Q1 2027 by the WG charter (§1).
2. WebNN in browsers: Chrome and Edge **flag-only** (`about://flags/#web-machine-learning-neural-network`); the Chrome origin trial was pulled 27 Mar 2026, the Edge OT expired 11 Aug 2026; Firefox positive, Safari no position (§1).
3. WebNN backends: Windows 11 24H2+ → Windows ML / ONNX Runtime (NPU, GPU), macOS 14.4+ Apple Silicon → Core ML, elsewhere LiteRT (CPU) (§1).
4. Device selection: spec = `powerPreference` + `accelerated`; Chromium still accepts `deviceType: 'cpu'|'gpu'|'npu'`, and ORT Web / Transformers.js pass `deviceType` (§1, §5).
5. WebGPU: Chrome 113 (2023), Edge, Android Chrome 121, Linux Chrome 144; Firefox and Safari status per §2.
6. Built-in AI in Chrome: Prompt API stable on the web in Chrome 148; per-API statuses in §3.
7. Transformers.js 4.3.1 (6 Oct 2026), 4,272 Hub models, ONNX Runtime Web 1.31-dev, devices incl. webnn-npu/gpu/cpu, dtypes fp32…q4f16, default q8 on wasm (§5).
8. WebLLM 0.2.86; ONNX Runtime Web 1.30.0; LiteRT.js 2.5.3; TF.js last release Oct 2024 (§6).
9. Web Speech on-device: Chrome 139 (`processLocally`) (§6).
10. Storage: ~60 % of disk per origin in Chromium and WebKit browser apps (§6).

## Unverified (additional)
- Which Transformers.js models run end-to-end on the WebNN EP (NPU) in Oct 2026 — only what the demo measured (demo/NOTES.md); NPU could not be tested on the test machine.
- LiteRT.js / MediaPipe GenAI feature set beyond npm versions.
- Further unverified items are in sections 1–4 (marked UNVERIFIED inline).
