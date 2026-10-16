# Analysis of the original deck (original.pptx, 24 slides, 16:9, 20 MB)

Downloaded 16 Oct 2026 from Maxim's OneDrive share. Full text + notes extract: original-extract.txt. Renders: orig-render/ (contact.png = all 24 slides).

## Visual identity
Plain Microsoft-style template: white background, black sans-serif text, title top-left, blue hyperlink text boxes, a few screenshots/diagrams. Title slide ("Square Photo" layout) has a dark neural-network photo on the left and the title in three lines (Privacy-First / Offline-Ready / Fully Future-Proof). No strong brand system to preserve → rebuild with a clean modern design; keep: title wording, Maxim's bio slide, the layered-stack idea (slide 13), the "ecosystem" diagram (slide 7), the closing LinkedIn QR slide.

## Old structure (24 slides)
1 Title · 2 Demo video (20 s, "webnn-npu-demo": his Next.js app classifying an image with ResNet-50 on WebNN/NPU, Windows Task Manager showing NPU load on a Snapdragon X Plus) · 3 Bio (W3C WebML CG member) · 4 "AI-capable" (empty content, notes only) · 5 WebNN definition (5 bullets + spec link) · 6 WebNN use cases list · 7 Edge AI ecosystem diagram (hardware → native ML APIs: CoreML/DirectML/TFLite/other → web engines: WebNN/WebAssembly/WebGPU → frameworks: TF.js/ORT Web/MediaPipe/OpenCV.js → use cases) · 8 CPU vs GPU vs NPU · 9 WebNN for users (latency/privacy/availability/cost) · 10 WebNN for developers · 11 Prerequisites (Canary/Dev, about://flags#web-machine-learning-neural-network, NPU drivers Intel/Qualcomm, origin trials to July 2026) · 12 Context/operand/graph (two screenshots) · 13 "Let's build an app" layered stack: Web app → Transformers.js (high) → ONNX Runtime Web (mid) → WebNN (low) → platform AI → use cases · 14 What is ONNX / ONNX Runtime · 15 ORT Web code: executionProviders [{name:'webnn', deviceType:'npu', powerPreference:'low-power'}] · 16 Transformers.js pipeline('sentiment-analysis') snippet · 17 What is Transformers.js (task list) · 18 "Plus": 2.7K+ hosted models, Cache Storage caching, serve your own ONNX models · 19 Pipelines by modality · 20 Summary / CTA · 21 "Wait!.. There is more!" · 22 Built-in AI: Prompt & Writing Assistance APIs (LanguageModel.create(); "not on W3C standards track", "no model choice", "limited use cases") · 23 AI Agent Skills (github.com/webmaxru/Agent-Skills screenshot) · 24 Thank you + LinkedIn QR.

Speaker notes exist only on slides 1, 4, 5, 8, 10, 11, 22, 23, and are mostly pasted reference text/links, not a talk track.

## The old WebNN demo
- Repo: https://github.com/webmaxru/nextjs-webnn (last push 7 Apr 2025), live: https://nextjs-webnn.vercel.app/
- Next.js 14 static export + Tailwind/daisyUI, Workbox service worker (precache + runtime cache), Transformers.js **3.4.2** in a Web Worker.
- UI: model select (Xenova/resnet-50), API switcher Auto/WASM/WebGPU/WebNN, WebNN device Default/CPU/GPU/NPU, quantization q4/fp16/fp32, sample images + upload, "Classify". Feature detection: `navigator.ml.createContext({deviceType:'npu'})`.
- Device string passed to pipeline(): `webnn` or `webnn-<device>` (e.g. `webnn-npu`); dtype passed as `dtype`.
- Only one task (image classification). No timing/benchmark numbers in the UI. No fallback chain. No built-in AI section in the demo.
- Old source saved at old-demo/ (worker.js, page.js, service-worker.js, README.md).

## What is outdated or weak today (to verify in research.md)
- Slide 11: "Canary or Dev", flag, origin trials "to July 2026" → check current WebNN status in Chrome/Edge stable, OT end dates, flags, NPU driver requirements.
- Slide 5 notes: "MLContextOptions under active development" → check spec (device selection changed: deviceType was removed/reworked in 2025; check the current `powerPreference`/`accelerated` options).
- Slide 15: ORT Web EP options `deviceType: 'npu'` → verify against current ORT Web WebNN EP docs.
- Slide 18: "2.7K+ hosted models" → check current count on the Hub (library=transformers.js).
- Transformers.js 3.4.2 → latest major (v4?) with WebNN device support; verify dtype/device options and new pipelines.
- Slide 22: built-in AI described as one experimental item; today Summarizer/Translator/Language Detector/Prompt API etc. have shipped or are in OT in Chrome and Edge → needs a full section with per-API status.
- Slide 7 diagram: add LiteRT (TFLite renamed), WebGPU on all engines, Core ML/DirectML/Windows ML status, Firefox/Safari positions.
- Missing entirely: WebGPU status, WebLLM, MediaPipe/LiteRT.js, speech (Web Speech on-device), offline/caching (OPFS vs Cache API, model sizes), feature detection + fallback pattern, decision guidance, WebMCP (his book), honest talk track.

## Keep
Title; the "layered stack" framing (slide 13) as the spine of the new story; the user/developer value props (slides 9–10); CPU/GPU/NPU choice (slide 8); the demo-first opening (slide 2 video → now a live demo); the ORT Web and Transformers.js snippets (updated); the LinkedIn close.
