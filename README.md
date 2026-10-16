# The Ultimate Guide to Browser-Based AI

**Privacy-First, Offline-Ready, and Fully Future-Proof** — talk by Maxim Salnikov, October 2026 edition.

Generative and intelligent features are quickly becoming a core part of modern web experiences—but they often come with trade-offs: privacy concerns, reliance on internet connectivity, and the cost of using cloud-based APIs. What if you could bring powerful AI directly into the browser, on the user's device? In this session, we'll explore the full landscape of browser-based AI and machine learning—no servers required. From text generation and image recognition to real-time transcription and offline copilots, the web platform now provides a rich toolbox of APIs and tools to enable truly private, performant, and intelligent experiences.

**Live demo:** https://webai-playground.sites.tab.bot/

## What's inside

| Folder | What |
|---|---|
| [`deck/`](deck/) | The deck (35 slides, PPTX + PDF), the talk track as PDF (slide thumbnail + script per page) and as Markdown |
| [`demo/`](demo/) | **Web AI Bench** — the rebuilt WebNN demo: Transformers.js 4.3.1, WebNN / WebGPU / WASM switcher, offline-ready, mobile-first |
| [`docs/`](docs/) | Research with primary sources ([`research.md`](docs/research.md)), the story and slide plan ([`story.md`](docs/story.md)), slide-to-source traceability ([`slides-outline.md`](docs/slides-outline.md)), what changed since the previous deck ([`analysis.md`](docs/analysis.md)), demo [screenshots](docs/screenshots/) |

## The demo: Web AI Bench

A static rebuild of my earlier `nextjs-webnn` demo (Next.js, Transformers.js 3.4.2) — no framework, no build step. Mobile-first (it is opened from a QR code on phones), light and dark, system fonts only, so it also works offline.

<p><img src="docs/screenshots/mobile-light.png" width="260" alt="Web AI Bench on a phone, light theme"> <img src="docs/screenshots/mobile-dark.png" width="260" alt="Web AI Bench on a phone, dark theme"></p>

- **Device switcher:** Auto · WebNN (NPU / GPU / CPU) · WebGPU · WASM. Auto feature-detects and tells you what it picked and why.
- **Capability panel:** WebNN contexts, WebGPU adapter (`shader-f16`, subgroups), WASM threads/SIMD, cross-origin isolation, storage, Prompt API availability.
- **Three tasks:** image classification (ResNet-50, MobileNet-v2 from the Hugging Face `webnn` org), speech-to-text (Whisper tiny.en), and the built-in Prompt API with a fallback to SmolLM2-135M via Transformers.js.
- **Numbers on screen:** load time, warm-up, average of N runs, tokens/s, and a benchmark board that accumulates results per device (copy as Markdown).
- **Offline:** inference runs in a Web Worker; a service worker caches the app shell and the library, Transformers.js caches the models in Cache Storage. After one load it works with the network off.

Build notes, exact device strings, models, sizes and measured timings: [`demo/NOTES.md`](demo/NOTES.md).

### Run it locally

Any static server works, for example:

```bash
cd demo
python3 -m http.server 8080
# open http://localhost:8080
```

- Use `localhost` or HTTPS — service workers and WebGPU need a secure context.
- Models are downloaded from the Hugging Face Hub on first use and cached by the browser.
- WASM multi-threading needs cross-origin isolation (COOP/COEP). Without those headers ONNX Runtime Web runs single-threaded — fine for the demo, and the capability panel says which mode you got. `demo/_headers` has the headers for hosts that read that file.
- WebNN in Chrome/Edge is behind `about://flags/#web-machine-learning-neural-network` (as of Oct 2026).

## Key facts (as of 16 Oct 2026)

Every claim with its primary source and read date is in [`docs/research.md`](docs/research.md).

- **WebNN:** W3C Candidate Recommendation (snapshot 22 Jan 2026; CR Draft 10 Oct 2026). In Chrome and Edge it is **flag-only** — Chrome's origin trial was pulled on 27 Mar 2026, Edge's expired on 11 Aug 2026. Firefox: positive position; Safari: no position.
- **WebNN backends:** Windows 11 24H2+ → Windows ML / ONNX Runtime (NPU, GPU); macOS 14.4+ on Apple Silicon → Core ML; elsewhere LiteRT (CPU).
- **Device selection:** the spec now uses `powerPreference` + `accelerated`; Chromium still accepts `deviceType: 'cpu' | 'gpu' | 'npu'`, which is what ONNX Runtime Web and Transformers.js pass.
- **WebGPU:** Chrome 113 (2023), Edge, Android Chrome 121, Linux Chrome 144; Firefox 141 on Windows, 145 on macOS 26 (Apple Silicon); Safari 26.0 on macOS, iOS, iPadOS and visionOS.
- **Built-in AI:** the Prompt API is stable on the web in Chrome 148.
- **Transformers.js 4.3.1** (6 Oct 2026): 4,272 models on the Hub, ONNX Runtime Web 1.31-dev, devices incl. `webnn-npu` / `webnn-gpu` / `webnn-cpu`, dtypes fp32…q4f16, default q8 on WASM.
- **Other runtimes:** WebLLM 0.2.86, ONNX Runtime Web 1.30.0, LiteRT.js 2.5.3; TensorFlow.js last released Oct 2024.
- **On-device speech:** Web Speech API with `processLocally` since Chrome 139.
- **Storage:** about 60 % of disk per origin in Chromium and WebKit.

**Not verified here:** WebNN on a real NPU — the demo's WebNN path is built from the spec and library source, and is meant to be measured on stage hardware.

## More from me

- Book: *Tools, Not Clicks* (WebMCP) — https://vibeprogrammer.github.io/webmcp-book/
- Newsletter: https://isainative.substack.com

## License

- Code in [`demo/`](demo/) is MIT-licensed — see [LICENSE](LICENSE).
- The deck, talk track and documents in [`deck/`](deck/) and [`docs/`](docs/) are © 2026 Maxim Salnikov, all rights reserved.
- Sample media and models belong to their respective owners.
