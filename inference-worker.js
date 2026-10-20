// Web AI Playground — inference worker (Transformers.js 4.3.1, vendored)
import { pipeline, env, TextStreamer } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1';  // = dist/transformers.min.js, ORT bundled; cached offline by sw.js
import { instrumentWebNN, createOrtLogParser } from './webnn-trace.js';

env.allowLocalModels = false;          // always fetch from the Hub (cached in Cache API by the library)
env.useBrowserCache = true;            // default, stated for clarity
// ORT .wasm/.mjs come from cdn.jsdelivr.net by default (set by the library); the service worker caches that origin.

const ortVersion = env.backends?.onnx?.versions?.web ?? 'unknown';
const SUFFIX_TO_DTYPE = { '_quantized': 'q8', '_fp16': 'fp16', '_q4f16': 'q4f16', '_q4': 'q4', '_int8': 'int8', '_uint8': 'uint8', '_bnb4': 'bnb4' };

let current = null;   // { key, pipe, task, model, device, dtype, files }
const post = (m, transfer) => self.postMessage(m, transfer);

// ---------- fallback trace ----------
// One trace per run request: every step goes to the page as {type:'trace'} and to the console.
let traceCtx = null;  // { id, t0, ortParser }
function trace(kind, text, data) {
  if (!traceCtx) return;
  const t = Math.round(performance.now() - traceCtx.t0);
  console.debug(`[trace +${t}ms] [${kind}] ${text}`);
  post({ type: 'trace', id: traceCtx.id, t, kind, text, data });
}
instrumentWebNN((kind, text, data) => { if (traceCtx && data && 'devices' in data) traceCtx.graphs.push(data); trace(kind, text, data); });
// ORT (wasm) prints its native log through console.*; tap it while a verbose trace is running.
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  const orig = console[level].bind(console);
  console[level] = (...args) => {
    orig(...args);
    if (traceCtx?.ortParser && typeof args[0] === 'string' && !args[0].startsWith('[trace ')) {
      const out = traceCtx.ortParser.feed(args.join(' '));
      if (out) trace('ort', out);
    }
  };
}
// The explicit chain the demo walks when a WebNN device fails: npu → gpu → cpu → wasm (starting at the one asked for).
function fallbackChain(device) {
  const chain = ['webnn-npu', 'webnn-gpu', 'webnn-cpu', 'wasm'];
  const i = chain.indexOf(device);
  return i < 0 ? [device] : chain.slice(i);
}

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

async function load({ task, model, device, dtype, id, verbose }) {
  const key = `${task}|${model}|${device}|${dtype}|${verbose ? 'v' : ''}`;
  if (current && current.key === key) { trace('step', `${device}: reusing the session already loaded in this worker (no new context/graph to trace; reload the page to trace session creation again)`); return current; }
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
  // Verbose ORT log: severity 0 makes the WebNN EP print every node it accepts or rejects (rejected → CPU/WASM EP).
  if (verbose) opts.session_options = { logSeverityLevel: 0, logVerbosityLevel: 0 };
  // WebNN needs static shapes. Without these, ORT sends every node with a dynamic shape to the CPU (WASM) EP
  // (resnet-50: 120 of 122 nodes). Names that a model doesn't use are ignored.
  if (device.startsWith('webnn') && task === 'image-classification') opts.session_options = { ...opts.session_options, freeDimensionOverrides: { batch_size: 1, num_channels: 3, height: 224, width: 224 } };
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
      const { id, task, model, device: requested, dtype, input, runs = 5, genOptions = {}, chain = true, verbose = false } = msg;
      traceCtx = { id, t0: performance.now(), ortParser: verbose ? createOrtLogParser() : null, graphs: [] };
      const steps = chain && requested.startsWith('webnn') ? fallbackChain(requested) : [requested];
      trace('plan', `requested device "${requested}", dtype ${dtype}; ${steps.length > 1 ? 'explicit fallback chain: ' + steps.join(' → ') : 'no fallback chain (single device)'}${verbose ? '; ORT verbose op log ON' : ''}`);
      if (requested.startsWith('webnn') && !('ml' in navigator)) trace('webnn', 'navigator.ml is undefined in this worker → every WebNN step will fail');
      let c, device, lastErr;
      for (const [si, dev] of steps.entries()) {
        const ts = performance.now();
        trace('step', `try ${dev}${dev.startsWith('webnn') ? ` (ORT WebNN EP, deviceType "${dev.split('-')[1] || 'default'}")` : dev === 'wasm' ? ' (ORT CPU/WASM EP)' : ''}`);
        try {
          c = await load({ task, model, device: dev, dtype, id, verbose });
          device = dev;
          trace('step', `${dev}: session ready in ${Math.round(performance.now() - ts)} ms`);
          break;
        } catch (e) {
          lastErr = e;
          trace('step', `${dev}: FAILED after ${Math.round(performance.now() - ts)} ms — ${String(e?.message || e).slice(0, 300)}${si < steps.length - 1 ? ` → falling back to ${steps[si + 1]}` : ' → no more fallbacks'}`);
          if (current) { try { await current.pipe.dispose(); } catch {} current = null; }
          if (/Could not locate file|Failed to fetch|NetworkError|Unsupported model type/i.test(String(e?.message))) { trace('step', 'that is a model/network problem, not a device problem → stopping the chain'); break; }
        }
      }
      if (!c) throw lastErr;
      const ortReport = traceCtx.ortParser?.report() ?? null;
      if (ortReport) {
        trace('ort', `op placement: ${ortReport.supported} node(s) accepted by the WebNN EP, ${ortReport.unsupported} node(s) fell back to the CPU (WASM) EP${ortReport.byType.length ? ': ' + ortReport.byType.map(x => `${x.op}×${x.count}`).join(', ') : ''}${ortReport.dynamicShapeTensors ? ` (${ortReport.dynamicShapeTensors} tensors with dynamic shapes)` : ''}`, { ...ortReport, cls: ortReport.unsupported ? 'bad' : 'ok' });
      } else if (verbose && device.startsWith('webnn')) trace('ort', 'no ORT per-node log was captured (the library may have reused a cached session; press Run again after changing a setting)');
      post({ type: 'loaded', id, loadMs: c.loadMs, totalBytes: c.totalBytes, resolvedDtype: c.resolvedDtype, files: [...c.files.keys()], ortVersion, device, requested, fellBack: device !== requested });

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
          trace('run', `generation: ${Math.round(timings[0])} ms, ${tokens} tokens on ${device}`);
          post({ type: 'run', id, i, ms: timings[0], total: 1 });
          break;
        } else if (task === 'automatic-speech-recognition') {
          output = await c.pipe(input, { chunk_length_s: 30, return_timestamps: false });
        } else {
          output = await c.pipe(input, { top_k: 5 });
        }
        timings.push(performance.now() - t);
        trace('run', `${isFirst ? 'warm-up run' : 'run ' + i}: ${Math.round(timings[i])} ms on ${device}`);
        post({ type: 'run', id, i, ms: timings[i], total: n + 1 });
        if (task === 'automatic-speech-recognition' && i >= Math.min(n, 2)) break;   // ASR: at most 3 timed runs
      }
      const first = timings[0];
      const rest = timings.slice(1);
      const avg = rest.length ? rest.reduce((a, b) => a + b, 0) / rest.length : null;
      // What the browser told us about the graphs it compiled for this session (null = not observable from JS).
      const g = traceCtx.graphs;
      const observed = !device.startsWith('webnn') ? null : !g.length ? (c.observed ?? null) : g.some(x => x.devices === undefined || !x.devices.length) ? 'not observable' : [...new Set(g.flatMap(x => x.devices))].join('+');
      if (g.length) c.observed = observed;
      const want = device.startsWith('webnn') ? (device.split('-')[1] || 'cpu') : null;
      const browserNote = !want ? '' : observed === 'not observable' || observed == null ? ' · device the browser used: not observable from JS (see README)' : observed.split('+').includes(want) ? ` · browser compiled for ${observed}` : ` · browser silently fell back: ${want} → ${observed}`;
      trace('done', `requested ${requested} → ran on ${device}${device !== requested ? ' (FALLBACK by this demo\'s chain)' : ''}${browserNote}; first ${Math.round(first)} ms${avg != null ? `, avg ${Math.round(avg)} ms over ${rest.length}` : ''}`, { cls: browserNote.includes('fell back') || device !== requested ? 'bad' : observed && observed !== 'not observable' ? 'ok' : 'warn' });
      traceCtx = null;
      post({ type: 'done', id, output, firstMs: first, avgMs: avg, runs: rest.length, tokens, genMs,
             tokPerSec: tokens && genMs ? tokens / (genMs / 1000) : null,
             loadMs: c.loadMs, totalBytes: c.totalBytes, resolvedDtype: c.resolvedDtype, device: c.device, requested, observed, model: c.model, task: c.task, ortReport });
    }
  } catch (err) {
    trace('error', String(err?.message || err).slice(0, 400));
    traceCtx = null;
    post({ type: 'error', id: msg.id, message: String(err?.message || err), stack: String(err?.stack || '').slice(0, 800) });
    if (current) { try { await current.pipe?.dispose?.(); } catch {} current = null; }
  }
};
