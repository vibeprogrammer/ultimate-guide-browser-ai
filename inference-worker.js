// Web AI Playground — inference worker (Transformers.js 4.3.1, vendored)
import { pipeline, env, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1';  // = dist/transformers.min.js, ORT bundled; cached offline by sw.js

env.allowLocalModels = false;          // always fetch from the Hub (cached in Cache API by the library)
env.useBrowserCache = true;            // default, stated for clarity
// ORT .wasm/.mjs come from cdn.jsdelivr.net by default (set by the library); the service worker caches that origin.

const ortVersion = env.backends?.onnx?.versions?.web ?? 'unknown';
const SUFFIX_TO_DTYPE = { '_quantized': 'q8', '_fp16': 'fp16', '_q4f16': 'q4f16', '_q4': 'q4', '_int8': 'int8', '_uint8': 'uint8', '_bnb4': 'bnb4' };

let current = null;   // { key, pipe, task, model, device, dtype, files }
const post = (m, transfer) => self.postMessage(m, transfer);

function dtypeFromFiles(files) {
  const set = new Set();
  for (const f of files.keys()) {
    if (!f.endsWith('.onnx')) continue;
    const base = f.replace(/^.*\//, '').replace(/\.onnx$/, '');
    let d = 'fp32';
    for (const [suf, name] of Object.entries(SUFFIX_TO_DTYPE)) if (base.endsWith(suf)) { d = name; break; }
    set.add(d);
  }
  return [...set].join('+') || 'n/a';
}

async function load({ task, model, device, dtype, id }) {
  const key = `${task}|${model}|${device}|${dtype}`;
  if (current && current.key === key) return current;
  if (current) { try { await current.pipe.dispose(); } catch (e) { /* ignore */ } current = null; }
  const files = new Map();
  const t0 = performance.now();
  const opts = { device, progress_callback: (p) => {
    if (p.file) {
      const rec = files.get(p.file) || { loaded: 0, total: 0 };
      if (p.total) rec.total = p.total;
      if (p.loaded != null) rec.loaded = p.loaded;
      if (p.status === 'done') rec.done = true;
      files.set(p.file, rec);
    }
    post({ type: 'progress', id, event: p, files: [...files.entries()].map(([file, r]) => ({ file, ...r })) });
  } };
  if (dtype && dtype !== 'auto') opts.dtype = dtype;
  const pipe = await pipeline(task, model, opts);
  const loadMs = performance.now() - t0;
  const totalBytes = [...files.values()].reduce((a, r) => a + (r.total || 0), 0);
  current = { key, pipe, task, model, device, dtype, files, loadMs, totalBytes, resolvedDtype: dtypeFromFiles(files) };
  return current;
}

self.onmessage = async (ev) => {
  const msg = ev.data;
  try {
    if (msg.type === 'hello') { post({ type: 'hello', ortVersion, webnnInWorker: typeof navigator !== 'undefined' && 'ml' in navigator, webgpuInWorker: typeof navigator !== 'undefined' && 'gpu' in navigator }); return; }
    if (msg.type === 'dispose') { if (current) { try { await current.pipe.dispose(); } catch {} current = null; } post({ type: 'disposed', id: msg.id }); return; }
    if (msg.type === 'run') {
      const { id, task, model, device, dtype, input, runs = 5, genOptions = {} } = msg;
      const c = await load({ task, model, device, dtype, id });
      post({ type: 'loaded', id, loadMs: c.loadMs, totalBytes: c.totalBytes, resolvedDtype: c.resolvedDtype, files: [...c.files.keys()], ortVersion });

      const timings = [];
      let output, tokens = 0, genMs = 0;
      const n = Math.max(1, runs | 0);
      for (let i = 0; i <= n; i++) {           // i === 0 is the warm-up (first) run
        const isFirst = i === 0;
        const t = performance.now();
        if (task === 'text-generation') {
          if (!isFirst) break;                 // one generation only; report tok/s
          let firstTokenAt = 0; tokens = 0;
          const streamer = new TextStreamer(c.pipe.tokenizer, {
            skip_prompt: true, skip_special_tokens: true,
            callback_function: (text) => post({ type: 'token', id, text }),
            token_callback_function: () => { tokens++; if (!firstTokenAt) firstTokenAt = performance.now(); },
          });
          const out = await c.pipe(input, { max_new_tokens: 128, do_sample: false, streamer, ...genOptions });
          genMs = performance.now() - (firstTokenAt || t);
          output = out[0]?.generated_text?.at?.(-1)?.content ?? out[0]?.generated_text ?? JSON.stringify(out).slice(0, 500);
          timings.push(performance.now() - t);
          post({ type: 'run', id, i, ms: timings[0], total: 1 });
          break;
        } else if (task === 'automatic-speech-recognition') {
          output = await c.pipe(input, { chunk_length_s: 30, return_timestamps: false });
        } else {
          output = await c.pipe(input, { top_k: 5 });
        }
        timings.push(performance.now() - t);
        post({ type: 'run', id, i, ms: timings[i], total: n + 1 });
        if (task === 'automatic-speech-recognition' && i >= Math.min(n, 2)) break;   // ASR: at most 3 timed runs
      }
      const first = timings[0];
      const rest = timings.slice(1);
      const avg = rest.length ? rest.reduce((a, b) => a + b, 0) / rest.length : null;
      post({ type: 'done', id, output, firstMs: first, avgMs: avg, runs: rest.length, tokens, genMs,
             tokPerSec: tokens && genMs ? tokens / (genMs / 1000) : null,
             loadMs: c.loadMs, totalBytes: c.totalBytes, resolvedDtype: c.resolvedDtype, device: c.device, model: c.model, task: c.task });
    }
  } catch (err) {
    post({ type: 'error', id: msg.id, message: String(err?.message || err), stack: String(err?.stack || '').slice(0, 800) });
    if (current) { try { await current.pipe?.dispose?.(); } catch {} current = null; }
  }
};
