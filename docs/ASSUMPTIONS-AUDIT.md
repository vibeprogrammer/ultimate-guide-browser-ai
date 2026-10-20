# Browser / vendor assumptions audit — Web AI Bench demo

Date: 20 Oct 2026. Trigger: Maxim, 20 Oct 2026 12:52 Oslo — *"for prompt API it says "downloading gemini nano" even for ms edge that is totally wrong (this browser downloads its own model). If you just hardcoded this model name - remove it (check for all other assumptions and give me report of what was fixed)."*

Scope: everything under `demo/` (app.js, inference-worker.js, webnn-trace.js, index.html, sw.js, manifest), plus the old demo URL across the repo. Sources were read on 20 Oct 2026.

## Fixed

| # | What the demo said / assumed | Why it was wrong | What it does now | Source |
|---|---|---|---|---|
| 1 | Prompt API download progress: `status: 'downloading Gemini Nano'` (app.js) — shown in every browser, Edge included | The Prompt API is browser-neutral: Chrome uses Gemini Nano, Edge uses Phi-4-mini (Canary/Dev 138.0.3309.2+) or the prerelease Aion-1.0-Instruct (150.0.4070+). The page cannot know which model the browser uses and does not need to | `Downloading the browser's built-in model… 37%`, then `Model downloaded. The browser is loading it into memory…`. No model name anywhere in the UI | developer.chrome.com/docs/ai/prompt-api ("uses the Gemini Nano model in Chrome"); learn.microsoft.com/microsoft-edge/web-platform/prompt-api (Phi-4-mini, Aion-1.0-Instruct) |
| 2 | Progress maths: `loaded: e.loaded * 100, total: 100` fed into a bytes formatter → always "0.0 MB / 0.0 MB (1 files)" | `downloadprogress` gives a fraction (Chrome: `loaded` 0…1; Edge docs also give `total`), not bytes | Percentage from `loaded / total` (or `loaded` when there is no total). The bar fills and the text gives the percent | Chrome prompt-api page (`e.loaded * 100` %); Edge prompt-api page ("loaded and total properties") |
| 3 | Benchmark row label `built-in (Gemini Nano / Phi)` | Same as #1: names vendor models, and is wrong for Edge's Aion preview or any future model | `browser's built-in model` | as #1 |
| 4 | Not-available help text: "Chrome 138+ with Gemini Nano (chrome://flags/#prompt-api-for-gemini-nano, or an origin trial) / Edge with Phi mini" | Chrome 138 shipped the Prompt API to **extensions** only; on the web it ships in **Chrome 148** (desktop). A chrome:// link means nothing in Edge, and Edge's flag is now "Prompt API for on-device language model" (no "Phi mini") | Feature detection decides; the brand is read only to print the right help: Edge → `edge://flags` → "Prompt API for on-device language model" (Canary/Dev 138.0.3309.2+); Chrome → "on by default from Chrome 148 on desktop; not on mobile yet"; other → both | chromestatus.com/feature/5134603979063296 (ship stage, desktop 148); Chrome prompt-api page header (Chrome 148 web / 138 extensions); Edge prompt-api page |
| 5 | `LanguageModel.availability()` called with **no options**, and `create()` likewise | Chrome docs: "Always pass the same options to the availability() function that you use in prompt()… some models may not support certain modalities or languages." The answer without options can differ from what the session needs. Supported languages: en, ja, es, de, fr | One `LM_OPTS = { expectedInputs: [{type:'text', languages:['en']}], expectedOutputs: [{type:'text', languages:['en']}] }` passed to both `availability()` and `create()` | developer.chrome.com/docs/ai/prompt-api ("Caution: Always pass the same options…", "expectedInputs / expectedOutputs") |
| 6 | Availability shown as a bare word (`downloadable`) with no meaning; `unavailable` styled as a warning | Users can't tell what each state means; `downloadable`/`downloading` need a click (user activation) to start `create()` | Each state explained in neutral words: available = ready; downloadable = "the browser downloads its own model the first time you press Generate (needs a click)"; downloading = progress shown, Generate waits; unavailable = device/options not supported → Transformers.js fallback (styled red) | developer.chrome.com/docs/ai/get-started (states + user activation) |
| 7 | After a first download the panel kept saying `downloadable` | Availability changes once the browser has the model | Re-checks `availability()` after a session was created from a non-ready state → shows `available` | (behaviour fix; tested) |
| 8 | `LanguageModel.params()` read on the web (topK / temperature) | On the web, sampling parameters are not exposed by default; `params()`, `topK`, `temperature` exist only for Chrome Extensions (web has a `samplingMode` origin trial from 148) | Removed. The demo uses no sampling parameters | developer.chrome.com/docs/ai/prompt-api ("For Chrome Extensions, legacy sampling parameters (topK, temperature) and LanguageModel.params() still exist") |
| 9 | WebNN not-available help: "Chrome/Edge: enable chrome://flags/#web-machine-learning-neural-network" | Edge users need `edge://flags` | Brand-specific line: `edge://flags/#web-machine-learning-neural-network` in Edge, `chrome://flags/#…` in Chrome, both otherwise | learn.microsoft.com/windows/ai/directml/webnn-overview, webnn-tutorial (about:flags → "WebNN API") |
| 10 | WebGPU software-adapter check read `adapter.isFallbackAdapter` | Moved to `GPUAdapterInfo.isFallbackAdapter` (Chrome 136); the adapter attribute is on its way out. (Chrome doesn't ship fallback adapters yet, so it is always false; the name regex still catches SwiftShader/llvmpipe) | `adapter.info.isFallbackAdapter`, then the old attribute, then the regex | developer.chrome.com/blog/new-in-webgpu-136; chromestatus.com/feature/5188955424948224 |
| 11 | No canonical URL; old demo URL `webai-playground.sites.tab.bot` in docs/notes/deck/QR | The demo moved to https://webai.isainative.dev/ (GitHub Pages, HTTPS enforced) | `<link rel="canonical">` + `og:url` → new URL; all references and the deck QR updated (see "URL changes"); service worker cache bumped to v11 so returning visitors get the fix | — |

## Checked, no change needed

| Assumption | Finding |
|---|---|
| Old API shapes (`window.ai`, `self.ai.languageModel`, `capabilities()`, `'readily'` / `'after-download'` / `'no'`) | Not used anywhere. The demo already used the current `LanguageModel` global and the four current states |
| User-agent sniffing to gate features | None. `navigator.userAgentData` brands appear only in the trace header (information) and now in #4/#9 to pick which flags page to print. Every feature is feature-detected |
| Summarizer / Writer / Rewriter / Translator / LanguageDetector / Proofreader | Not used by the demo |
| User activation for `create()` | `create()` is the first await inside the Generate click handler, so the click is the activation; tested (stub saw `navigator.userActivation.isActive === true`) |
| Model size / hardware claims in the UI | None for the built-in model. Sizes shown are for the Transformers.js fallback models (ResNet-50 25.8 MB q8, MobileNet-v2 7 MB fp16, Whisper tiny.en 41 MB, SmolLM2-135M ≈130 MB) |
| WebNN device selection | Already current (done earlier today, PR #1): `deviceType` still accepted by Chromium but removed from the spec; a missing NPU does not throw; the demo reads `MLGraph.devices` and says "not observable" where it is empty (Windows ML, crbug 418031018) |
| WebNN `deviceType` default for plain `"webnn"` | UI says "cpu (library default)": ONNX Runtime Web's WebNN EP default; unchanged |
| COOP/COEP | GitHub Pages ignores `_headers`, so no cross-origin isolation and single-threaded WASM. The capability panel already states this |

## Left as is (not demo UI)

- `deck/talk-track.md`, the slides and `docs/story.md` name Gemini Nano **for Chrome** and Phi-4-mini / Aion **for Edge**. That is correct and is the talk's "same API, different model" point. Talk-track lines 391/395 describe the on-stage Chrome run ("tokens stream in from Gemini Nano").
- `docs/research.md`: dated research tables, unchanged.

## URL changes (old → https://webai.isainative.dev/)

- `docs/story.md`: header + Demo 1 line
- `demo/NOTES.md`: "Published" line (now GitHub Pages, custom domain, HTTPS enforced)
- `deck/Ultimate-Guide-Browser-AI-2026.pptx`: slides 2, 25, 28 and 35, link text + hyperlink target; QR image `ppt/media/image3.png` regenerated (same size, colours and position) and decoded back to the new URL
- `deck/Ultimate-Guide-Browser-AI-2026.pdf`: re-exported from the updated pptx (35 pages); QR on pages 2/25/28/35 decodes to the new URL
- `deck/qr-webai-isainative-dev.png`: new standalone QR
- `demo/index.html`: canonical + og:url added
- Already correct before this change: README (live demo line + tracing steps), `gh-pages/CNAME`

## How it was tested

Headless Chromium 156 (Linux, `--enable-features=WebMachineLearningNeuralNetwork`), local server and then the live site:
- Real browser: `LanguageModel` exists, `availability({text,en})` → `"unavailable"` → the panel and card show the neutral fallback text.
- Stubbed `LanguageModel` (availability `downloadable` / `downloading` / `available` / `unavailable`; absent with Edge vs Chrome brands): checked the help text per brand, progress text and bar (37% mid-download, then "loading it into memory"), output, panel flips to `available` after the download, benchmark label, and that `availability()` and `create()` receive identical options.
- Before/after on live: the old build showed `downloading Gemini Nano — 0.0 MB / 0.0 MB (1 files)` under the Edge stub.

Not verified on a real device: the Edge/Chrome model download itself (no built-in model is available in this headless Chromium).
