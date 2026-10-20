// Web AI Playground — main thread (UI, feature detection, worker orchestration)
import { DEVICES, probeDevice, readOptionNames } from './webnn-trace.js';
const $ = (s) => document.querySelector(s);
const logEl = $('#log');
function log(...a) { const line = `[${new Date().toISOString().slice(11, 19)}] ` + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(line); logEl.textContent += line + '\n'; }
const fmtMs = (ms) => ms == null ? '—' : ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : Math.round(ms) + ' ms';
const fmtMB = (b) => b == null ? '—' : (b / 1048576).toFixed(1) + ' MB';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- theme / online pills ----------
const themeBtn = $('#theme-btn');
const savedTheme = localStorage.getItem('theme'); if (savedTheme) document.documentElement.dataset.theme = savedTheme;
themeBtn.onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); const t = cur === 'light' ? 'dark' : 'light'; document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); };
// capability panel: collapsed summary row on phones, expanded on wider screens
const capsDetails = document.getElementById('caps-details'); if (capsDetails && matchMedia('(min-width: 768px)').matches) capsDetails.open = true;
function updateOnline() { const p = $('#pill-online'); p.textContent = navigator.onLine ? 'online' : 'OFFLINE'; p.className = 'pill ' + (navigator.onLine ? 'ok' : 'bad'); }
addEventListener('online', updateOnline); addEventListener('offline', updateOnline); updateOnline();

// ---------- service worker ----------
async function setupSW() {
  const pill = $('#pill-offline-ready');
  if (!('serviceWorker' in navigator)) { pill.textContent = 'offline: no service worker'; pill.className = 'pill bad'; return; }
  try {
    const reg = await navigator.serviceWorker.register('./sw.js');
    log('service worker registered, scope', reg.scope);
    const check = async () => {
      const shellName = (await caches.keys()).filter(k => k.startsWith('webai-shell-')).sort().pop();   // whatever shell version the service worker installed
      const c = shellName ? await caches.open(shellName) : null;
      const n = c ? (await c.keys()).length : 0;
      pill.textContent = n >= 8 ? 'offline-ready' : 'offline: caching shell…'; pill.title = n >= 8 ? `${n} app-shell files precached by the service worker` : 'App shell + libraries precached by the service worker';
      pill.className = 'pill ' + (n >= 8 ? 'ok' : 'muted');
      return n >= 8;
    };
    if (!(await check())) { for (let i = 0; i < 20 && !(await check()); i++) await sleep(500); }
    navigator.serviceWorker.addEventListener('message', (e) => { if (e.data?.type === 'precached') check(); });
  } catch (e) { pill.textContent = 'offline: SW failed — ' + e.message; pill.className = 'pill bad'; log('SW error', e.message); }
}

// ---------- capability detection ----------
const caps = { webnn: { present: false, contexts: {} }, webgpu: { present: false }, wasm: {}, isolation: {}, storage: {}, builtin: {} };
function setCap(id, cls, val, detail) { const el = $('#cap-' + id); el.className = 'cap ' + cls; el.querySelector('.cap-val').textContent = val; el.querySelector('.cap-detail').textContent = detail || ''; }

async function probeWebNN() {
  caps.webnn = { present: 'ml' in navigator, contexts: {} };
  if (!caps.webnn.present) { setCap('webnn', 'bad', 'not available', '`navigator.ml` is undefined in this browser.\nChrome/Edge: enable chrome://flags/#web-machine-learning-neural-network (and the OS backend: Windows ML / Core ML / LiteRT).'); return; }
  const probes = [
    ['default {}', {}],
    ['deviceType:npu', { deviceType: 'npu' }],
    ['deviceType:gpu', { deviceType: 'gpu' }],
    ['deviceType:cpu', { deviceType: 'cpu' }],
    ['powerPreference:high-performance', { powerPreference: 'high-performance' }],
    ['accelerated:true', { accelerated: true }],
  ];
  const lines = [];
  for (const [name, opts] of probes) {
    try {
      const ctx = await navigator.ml.createContext(opts);
      const extra = [];
      if ('accelerated' in ctx) extra.push('accelerated=' + ctx.accelerated);
      if (typeof ctx.opSupportLimits === 'function') { try { const l = ctx.opSupportLimits(); extra.push('ops=' + Object.keys(l).length); } catch {} }
      caps.webnn.contexts[name] = { ok: true, extra };
      lines.push(`✓ createContext(${name})${extra.length ? ' ' + extra.join(', ') : ''}`);
    } catch (e) { caps.webnn.contexts[name] = { ok: false, error: `${e.name}: ${e.message}` }; lines.push(`✗ ${name}: ${e.name}: ${e.message}`); }
  }
  const anyOk = Object.values(caps.webnn.contexts).some(c => c.ok);
  lines.push('(✓ only means the promise resolved: unknown option names are ignored, and a missing NPU does not throw. See Device availability below.)');
  setCap('webnn', anyOk ? 'ok' : 'warn', anyOk ? 'available' : 'API present, no context', lines.join('\n'));
}
// ---------- device availability (NPU / GPU / CPU) ----------
// For each WebNN device: create a context, build a 1-conv graph, read graph.devices (what the browser compiled for).
// Plus the WebGPU adapter. Results go to the table in the Capabilities panel and to the console.
caps.devices = {};
async function probeDevices() {
  const box = $('#device-table'), note = $('#device-note');
  const rows = [];
  if (!('ml' in navigator)) {
    for (const d of DEVICES) caps.devices[d] = { device: d, ok: false, error: 'navigator.ml undefined', verdict: { cls: 'bad', short: 'no WebNN', text: 'WebNN is not exposed in this browser.' } };
  } else {
    caps.devices.options = await readOptionNames();
    for (const d of DEVICES) caps.devices[d] = await probeDevice(d);   // sequential: keeps timings honest
  }
  for (const d of DEVICES) {
    const r = caps.devices[d];
    const ctxCell = r.ok ? `✓ ${fmtMs(r.contextMs)}` : `✗ ${r.error || ''}`;
    const devCell = r.devices === undefined ? (r.ok ? 'n/a' : '—') : r.devices.length ? r.devices.join(' + ') : '[] (not reported)';
    rows.push(`<tr class="${r.verdict.cls}"><th scope="row">WebNN ${d.toUpperCase()}</th><td>${ctxCell}</td><td>${r.buildMs != null ? fmtMs(r.buildMs) : '—'}</td><td>${devCell}</td><td class="v">${r.verdict.text}</td></tr>`);
  }
  const a = caps.webgpu.adapter;
  const gpuCell = !caps.webgpu.present ? 'navigator.gpu undefined' : a ? `${a.vendor || '?'} · ${a.architecture || '?'}${a.description ? ' · ' + a.description : ''}` : 'no adapter';
  const gpuCls = a && !a.isFallback ? 'ok' : a ? 'warn' : 'bad';
  rows.push(`<tr class="${gpuCls}"><th scope="row">WebGPU</th><td>${a ? '✓ adapter' : '✗'}</td><td>—</td><td>${gpuCell}</td><td class="v">${a ? (a.isFallback ? 'Software (CPU-emulated) adapter.' : 'Hardware GPU adapter available.') : 'No WebGPU adapter.'}</td></tr>`);
  box.querySelector('tbody').innerHTML = rows.join('');
  const o = caps.devices.options;
  const lim = caps.devices.cpu?.limits || caps.devices.gpu?.limits;
  note.textContent = [
    o ? (o.error ? `createContext(options) failed: ${o.error}` : `MLContextOptions this browser reads: ${o.read.join(', ') || 'none'}${o.ignored.length ? ` · ignores: ${o.ignored.join(', ')}` : ''}`) : 'WebNN not available.',
    lim && !lim.error ? `opSupportLimits(): ${lim.ops} ops · preferred layout ${lim.layout || '?'}${lim.maxTensorMB ? ` · max tensor ${lim.maxTensorMB} MB` : ''} · float16 conv2d ${lim.fp16 ? 'yes' : 'no'} · int8 dequantize ${lim.int8Quant ? 'yes' : 'no'} · int4 ${lim.int4 ? 'yes' : 'no'}` : '',
    'Probe = 1 conv2d + relu; a real model can be split differently — run it and read the fallback trace.',
  ].filter(Boolean).join('\n');
  // summary dots
  const npu = caps.devices.npu, gpu = caps.devices.gpu;
  const sum = (key, r, observedOk) => { const el = document.querySelector(`[data-sum=${key}]`); if (el) el.dataset.state = !r?.ok || r.verdict?.cls === 'bad' ? 'bad' : observedOk ? 'ok' : 'warn'; };
  sum('npu', npu, npu?.devices?.includes('npu'));
  sum('gpu', gpu, gpu?.devices?.includes('gpu') || (a && !a.isFallback));
  log('device availability', Object.fromEntries(DEVICES.map(d => [d, { context: caps.devices[d].ok, contextMs: Math.round(caps.devices[d].contextMs ?? 0), graphDevices: caps.devices[d].devices, verdict: caps.devices[d].verdict.short }])), 'webgpu', a ? `${a.vendor}/${a.architecture}${a.isFallback ? ' (software)' : ''}` : 'none', 'options read', o?.read);
}

async function probeWebGPU() {
  caps.webgpu = { present: 'gpu' in navigator };
  if (!caps.webgpu.present) { setCap('webgpu', 'bad', 'not available', '`navigator.gpu` is undefined.'); return; }
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) { caps.webgpu.adapter = null; setCap('webgpu', 'warn', 'API present, no adapter', 'requestAdapter() returned null (no usable GPU / blocklisted / headless without GPU).'); return; }
    const info = adapter.info || {};
    const feats = [...adapter.features];
    caps.webgpu.adapter = { vendor: info.vendor, architecture: info.architecture, device: info.device, description: info.description, isFallback: adapter.isFallbackAdapter || /swiftshader|llvmpipe|software/i.test(`${info.architecture} ${info.description} ${info.device}`), f16: feats.includes('shader-f16'), subgroups: feats.includes('subgroups'), maxBuffer: adapter.limits?.maxBufferSize };
    const a = caps.webgpu.adapter;
    setCap('webgpu', a.isFallback ? 'warn' : 'ok', a.isFallback ? 'software fallback adapter' : 'available',
      `vendor=${a.vendor || '?'} arch=${a.architecture || '?'} ${a.description ? '(' + a.description + ')' : ''}\nshader-f16: ${a.f16 ? 'yes' : 'no'} · subgroups: ${a.subgroups ? 'yes' : 'no'} · maxBufferSize ${fmtMB(a.maxBuffer)}`);
  } catch (e) { caps.webgpu.error = e.message; setCap('webgpu', 'warn', 'error', e.message); }
}
function probeWASM() {
  const simd = WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0,1,5,1,96,0,1,123,3,2,1,0,10,10,1,8,0,65,0,253,15,253,98,11]));
  const threads = typeof SharedArrayBuffer !== 'undefined' && self.crossOriginIsolated === true;
  const jspi = typeof WebAssembly.Suspending === 'function';
  caps.wasm = { simd, threads, jspi, cores: navigator.hardwareConcurrency };
  setCap('wasm', 'ok', 'available', `SIMD: ${simd ? 'yes' : 'no'} · threads: ${threads ? 'yes (' + navigator.hardwareConcurrency + ' cores)' : 'no (single-threaded)'} · JSPI: ${jspi ? 'yes' : 'no'}`);
  caps.isolation = { isolated: self.crossOriginIsolated === true, sab: typeof SharedArrayBuffer !== 'undefined' };
  setCap('isolation', caps.isolation.isolated ? 'ok' : 'warn', caps.isolation.isolated ? 'isolated' : 'not isolated', caps.isolation.isolated ? 'COOP/COEP headers present → SharedArrayBuffer → multi-threaded WASM.' : 'No COOP/COEP headers (or not honoured) → no SharedArrayBuffer → ORT runs WASM single-threaded. WebGPU/WebNN are unaffected.');
}
async function probeStorage() {
  try {
    const est = await navigator.storage.estimate();
    const persisted = await navigator.storage.persisted?.();
    caps.storage = { usage: est.usage, quota: est.quota, persisted };
    setCap('storage', 'ok', `${fmtMB(est.usage)} used`, `quota ≈ ${(est.quota / 1073741824).toFixed(1)} GB · persisted: ${persisted ? 'yes' : 'no'} · Cache API: ${'caches' in self ? 'yes' : 'no'}`);
  } catch (e) { setCap('storage', 'warn', 'unknown', e.message); }
}
async function probeBuiltin() {
  caps.builtin = { present: 'LanguageModel' in self };
  if (!caps.builtin.present) { setCap('builtin', 'bad', 'not available', '`LanguageModel` is not defined. Chrome 138+ with Gemini Nano (chrome://flags/#prompt-api-for-gemini-nano, or an origin trial) / Edge with Phi mini. Card 3c falls back to Transformers.js.'); $('#prompt-mode').textContent = 'built-in API absent → Transformers.js fallback'; return; }
  try {
    const availability = await LanguageModel.availability();
    caps.builtin.availability = availability;
    let params = ''; try { const p = await LanguageModel.params?.(); if (p) params = ` · defaultTopK=${p.defaultTopK} maxTopK=${p.maxTopK} defaultTemperature=${p.defaultTemperature}`; } catch {}
    setCap('builtin', availability === 'available' ? 'ok' : 'warn', availability, `LanguageModel.availability() → "${availability}"${params}`);
    $('#prompt-mode').textContent = availability === 'unavailable' ? 'built-in model unavailable → Transformers.js fallback' : `built-in Prompt API (${availability})`;
  } catch (e) { caps.builtin.error = e.message; setCap('builtin', 'warn', 'error', e.message); $('#prompt-mode').textContent = 'Prompt API error → fallback'; }
}
async function probeAll() { probeWASM(); await Promise.all([probeWebNN(), probeWebGPU(), probeStorage(), probeBuiltin()]); await probeDevices(); resolveDevice(); log('capabilities', caps); }
$('#recheck-btn').onclick = probeAll;

// ---------- device resolution ----------
function selectedDevice() { return document.querySelector('input[name=device]:checked').value; }
function webnnString(sub) { return sub === 'default' ? 'webnn' : 'webnn-' + sub; }
function describeDevice(dev) {
  if (dev.startsWith('webnn')) { const dt = dev === 'webnn' ? 'cpu (library default for plain "webnn")' : dev.split('-')[1]; return `ORT WebNN execution provider, deviceType: ${dt}`; }
  if (dev === 'webgpu') return 'ORT WebGPU execution provider';
  return 'ORT WASM (CPU) execution provider' + (caps.wasm.threads ? ', multi-threaded' : ', single-threaded');
}
let resolved = { device: 'wasm', reason: '' };
function resolveDevice() {
  const mode = selectedDevice();
  $('#webnn-sub').style.display = mode === 'webnn' ? '' : 'none';
  if (mode === 'auto') {
    // A WebNN context for "npu" is created even when there is no NPU (the browser falls back silently),
    // so Auto trusts graph.devices when the browser reports it, and says so when it can't.
    const d = caps.devices || {};
    const usable = (k) => d[k]?.ok && !d[k].buildError && (!d[k].devices?.length || d[k].devices.includes(k));
    const seen = (k) => d[k]?.devices?.includes(k);
    if (usable('npu')) resolved = { device: 'webnn-npu', reason: seen('npu') ? 'browser compiled the probe graph for the NPU → webnn-npu' : 'WebNN NPU context created; whether the browser really uses the NPU is not observable here (see README) → webnn-npu' };
    else if (usable('gpu')) resolved = { device: 'webnn-gpu', reason: `${d.npu?.ok ? 'NPU request fell back to ' + (d.npu.devices || []).join('+') : 'no NPU context'} → webnn-gpu` };
    else if (caps.webgpu.adapter && !caps.webgpu.adapter.isFallback) resolved = { device: 'webgpu', reason: `${caps.webnn.present ? 'WebNN present but no accelerated context' : 'no WebNN'}; WebGPU adapter found → webgpu` };
    else resolved = { device: 'wasm', reason: `${caps.webnn.present ? 'WebNN has no usable context' : 'no WebNN'}; ${caps.webgpu.adapter ? 'WebGPU adapter is a software fallback' : 'no WebGPU adapter'} → wasm` };
  } else if (mode === 'webnn') resolved = { device: webnnString($('#webnn-device').value), reason: 'chosen manually' };
  else resolved = { device: mode, reason: 'chosen manually' };
  const dtype = $('#dtype').value;
  const dtypeNote = dtype === 'auto' ? (resolved.device === 'wasm' ? 'auto → q8 (library default for wasm)' : 'auto → fp32 (library default for ' + resolved.device + ')') : dtype;
  const chainNote = resolved.device.startsWith('webnn') && $('#chain').checked ? ` · on failure: ${['webnn-npu', 'webnn-gpu', 'webnn-cpu', 'wasm'].slice(Math.max(0, ['webnn-npu', 'webnn-gpu', 'webnn-cpu', 'wasm'].indexOf(resolved.device))).join(' → ')}` : '';
  $('#resolved').innerHTML = `Will run with <strong>device: "${resolved.device}"</strong> → ${describeDevice(resolved.device)} · dtype: <strong>${dtypeNote}</strong><br><span>${resolved.reason}${chainNote}</span>`;
}
document.querySelectorAll('input[name=device], #webnn-device, #dtype, #chain').forEach(el => el.addEventListener('change', resolveDevice));

// ---------- worker ----------
const worker = new Worker('./inference-worker.js', { type: 'module' });
let workerInfo = {};
const pending = new Map();
let seq = 0;
worker.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'hello') { workerInfo = m; log('worker ready: ORT', m.ortVersion, 'webnn-in-worker', m.webnnInWorker, 'webgpu-in-worker', m.webgpuInWorker); return; }
  if (m.type === 'trace') { addTrace(m); return; }
  const p = pending.get(m.id); if (!p) return;
  if (m.type === 'progress') p.onProgress?.(m);
  else if (m.type === 'loaded') p.onLoaded?.(m);
  else if (m.type === 'run') p.onRun?.(m);
  else if (m.type === 'token') p.onToken?.(m);
  else if (m.type === 'done') { pending.delete(m.id); p.resolve(m); }
  else if (m.type === 'error') { pending.delete(m.id); p.reject(new Error(m.message)); }
};
worker.onerror = (e) => log('worker error', e.message);
worker.postMessage({ type: 'hello' });
function runInWorker(req, handlers, transfer) { const id = ++seq; return new Promise((resolve, reject) => { pending.set(id, { ...handlers, resolve, reject }); worker.postMessage({ ...req, id, type: 'run' }, transfer || []); }); }

function progressUI(prefix) {
  const box = $(`#${prefix}-progress`), fill = box.querySelector('.fill'), text = box.querySelector('.ptext');
  return {
    show() { box.hidden = false; fill.style.width = '0%'; text.textContent = 'loading…'; },
    update(m) {
      const files = m.files || [];
      const loaded = files.reduce((a, f) => a + (f.loaded || 0), 0), total = files.reduce((a, f) => a + (f.total || 0), 0);
      const pct = total ? Math.min(100, loaded / total * 100) : 0;
      fill.style.width = pct.toFixed(1) + '%';
      const ev = m.event || {};
      text.textContent = `${ev.status || ''} ${ev.file || ''} — ${fmtMB(loaded)} / ${fmtMB(total)} (${files.length} files)`;
    },
    done(m) { fill.style.width = '100%'; text.textContent = `loaded ${m.files?.length ?? ''} files, ${fmtMB(m.totalBytes)} on disk, dtype ${m.resolvedDtype}, in ${fmtMs(m.loadMs)}`; },
    hide() { box.hidden = true; },
  };
}
// "webnn-npu → cpu" when the browser reported a different device; "(asked webnn-npu)" when the demo's chain moved on
function deviceLabel(m) {
  let s = m.device;
  if (m.observed && m.observed !== 'not observable') s += ` → ${m.observed}`;
  else if (m.observed === 'not observable') s += ' (device not observable)';
  if (m.requested && m.requested !== m.device) s += ` (asked ${m.requested})`;
  return s;
}
function showTimings(prefix, m) {
  const dl = $(`#${prefix}-timings`); dl.innerHTML = '';
  const rows = [['backend', deviceLabel(m)], ['dtype', m.resolvedDtype], ['model size', fmtMB(m.totalBytes)], ['load', fmtMs(m.loadMs)], ['1st run', fmtMs(m.firstMs)]];
  if (m.avgMs != null) rows.push([`avg of ${m.runs}`, fmtMs(m.avgMs)]);
  if (m.tokPerSec) rows.push(['tokens/s', m.tokPerSec.toFixed(1)], ['tokens', m.tokens]);
  for (const [k, v] of rows) { const d = document.createElement('div'); d.innerHTML = `<dt>${k}</dt><dd>${v}</dd>`; dl.appendChild(d); }
}

// ---------- fallback trace ----------
const traceEl = $('#trace');
function addTrace(m) {
  const line = `+${String(m.t).padStart(6)} ms  ${('[' + m.kind + ']').padEnd(8)} ${m.text}`;
  console.log('[fallback-trace]', line);
  const div = document.createElement('div');
  div.className = 'tl ' + (m.data?.cls || (/FAILED|FALLBACK|REJECTED|fell back to the CPU/.test(m.text) ? 'bad' : /not observable|reusing/.test(m.text) ? 'warn' : ''));
  div.textContent = line;
  traceEl.appendChild(div); traceEl.scrollTop = traceEl.scrollHeight;
}
function traceHeader(kind, device) {
  if (traceEl.childElementCount) traceEl.appendChild(Object.assign(document.createElement('div'), { className: 'tl sep', textContent: '' }));
  const ua = navigator.userAgentData?.brands?.filter(b => !/Not.A.Brand/i.test(b.brand)).map(b => b.brand + ' ' + b.version).join(', ') || navigator.userAgent;
  const dev = Object.fromEntries(DEVICES.map(d => [d, caps.devices?.[d]?.verdict?.short ?? '?']));
  traceEl.appendChild(Object.assign(document.createElement('div'), { className: 'tl head', textContent: `=== ${new Date().toISOString()} · ${TASKS[kind].task} · ${$(TASKS[kind].modelSel).value} · requested ${device} · ${ua} · probe: npu=${dev.npu} gpu=${dev.gpu} cpu=${dev.cpu}` }));
}
$('#trace-copy').onclick = async () => { await navigator.clipboard?.writeText([...traceEl.children].map(d => d.textContent).join('\n')); log('trace copied'); };
$('#trace-clear').onclick = () => { traceEl.innerHTML = ''; };

// ---------- benchmark board ----------
const bench = JSON.parse(localStorage.getItem('bench') || '[]');
function renderBench() {
  const tb = $('#bench-table tbody'); tb.innerHTML = '';
  const bestByTask = {};
  for (const r of bench) if (r.avgMs != null && (!bestByTask[r.task] || r.avgMs < bestByTask[r.task])) bestByTask[r.task] = r.avgMs;
  for (const r of bench) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${r.task}</td><td>${r.model}</td><td>${r.device}</td><td>${r.dtype}</td><td>${fmtMB(r.bytes)}</td><td>${fmtMs(r.loadMs)}</td><td>${fmtMs(r.firstMs)}</td><td class="${r.avgMs != null && r.avgMs === bestByTask[r.task] ? 'best' : ''}">${r.avgMs != null ? fmtMs(r.avgMs) + ' (' + r.runs + ')' : '—'}</td><td>${r.tokPerSec ? r.tokPerSec.toFixed(1) : '—'}</td><td>${r.result}</td>`;
    tb.appendChild(tr);
  }
}
function addBench(row) { bench.push(row); localStorage.setItem('bench', JSON.stringify(bench)); renderBench(); }
$('#bench-clear').onclick = () => { bench.length = 0; localStorage.removeItem('bench'); renderBench(); };
$('#bench-copy').onclick = async () => {
  const lines = ['| Task | Model | Backend | dtype | Download | Load | 1st run | Avg (n) | tok/s | Result |', '|---|---|---|---|---|---|---|---|---|---|'];
  for (const r of bench) lines.push(`| ${r.task} | ${r.model} | ${r.device} | ${r.dtype} | ${fmtMB(r.bytes)} | ${fmtMs(r.loadMs)} | ${fmtMs(r.firstMs)} | ${r.avgMs != null ? fmtMs(r.avgMs) + ' (' + r.runs + ')' : '—'} | ${r.tokPerSec ? r.tokPerSec.toFixed(1) : '—'} | ${r.result} |`);
  await navigator.clipboard?.writeText(lines.join('\n')); log('benchmark copied');
};
renderBench();

// ---------- image classification ----------
let imageSrc = 'samples/cats.jpg';
document.querySelectorAll('#image-samples .sample[data-src]').forEach(b => b.onclick = () => { imageSrc = b.dataset.src; $('#image-preview').src = imageSrc; document.querySelectorAll('#image-samples .sample').forEach(x => x.classList.toggle('selected', x === b)); });
$('#image-upload').onchange = (e) => { const f = e.target.files[0]; if (!f) return; imageSrc = URL.createObjectURL(f); $('#image-preview').src = imageSrc; };
$('#image-run').onclick = () => runTask('image');

// ---------- speech ----------
let audioData = null, audioLabel = 'jfk.mp3';
async function decodeAudio(arrayBuffer) {
  const ctx = new (self.AudioContext || self.webkitAudioContext)({ sampleRate: 16000 });
  const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
  let data = buf.getChannelData(0);
  if (buf.numberOfChannels > 1) { const r = buf.getChannelData(1); data = data.map((v, i) => (v + r[i]) / 2); }
  await ctx.close?.();
  return new Float32Array(data);
}
async function loadSampleAudio() { const r = await fetch('samples/jfk.mp3'); audioData = await decodeAudio(await r.arrayBuffer()); audioLabel = 'jfk.mp3'; $('#audio-player').src = 'samples/jfk.mp3'; }
$('#speech-sample').onclick = () => loadSampleAudio().then(() => $('#audio-player').play().catch(() => {}));
$('#audio-upload').onchange = async (e) => { const f = e.target.files[0]; if (!f) return; audioData = await decodeAudio(await f.arrayBuffer()); audioLabel = f.name; $('#audio-player').src = URL.createObjectURL(f); };
$('#mic-btn').onclick = async () => {
  const btn = $('#mic-btn');
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream); const chunks = [];
    rec.ondataavailable = (e) => chunks.push(e.data);
    const stopped = new Promise(r => rec.onstop = r);
    rec.start(); btn.textContent = '● recording…'; btn.disabled = true;
    await sleep(5000); rec.stop(); await stopped; stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(chunks, { type: rec.mimeType });
    audioData = await decodeAudio(await blob.arrayBuffer()); audioLabel = 'microphone (5 s)'; $('#audio-player').src = URL.createObjectURL(blob);
    $('#speech-status').textContent = `recorded ${(audioData.length / 16000).toFixed(1)} s`;
  } catch (e) { $('#speech-status').innerHTML = `<span class="err">mic: ${e.message}</span>`; }
  btn.textContent = 'Record 5 s'; btn.disabled = false;
};
$('#speech-run').onclick = () => runTask('speech');

// ---------- prompt ----------
$('#prompt-run').onclick = () => runPrompt();
async function runPrompt() {
  const btn = $('#prompt-run'), out = $('#prompt-output'), status = $('#prompt-timings');
  const text = $('#prompt-input').value.trim(); if (!text) return;
  btn.disabled = true; out.textContent = ''; status.innerHTML = '';
  const useBuiltin = caps.builtin.present && caps.builtin.availability && caps.builtin.availability !== 'unavailable';
  if (useBuiltin) {
    const pui = progressUI('prompt');
    try {
      const t0 = performance.now(); pui.show();
      const session = await LanguageModel.create({ monitor(m) { m.addEventListener('downloadprogress', (e) => pui.update({ files: [{ loaded: e.loaded * 100, total: 100 }], event: { status: 'downloading Gemini Nano', file: '' } })); } });
      const loadMs = performance.now() - t0; pui.hide();
      const t1 = performance.now(); let first = 0, chars = 0;
      const stream = session.promptStreaming(text);
      for await (const chunk of stream) { if (!first) first = performance.now(); chars += chunk.length; out.textContent += chunk; }
      const total = performance.now() - t1;
      session.destroy?.();
      const m = { device: 'built-in (Prompt API)', resolvedDtype: 'n/a', totalBytes: null, loadMs, firstMs: first - t1, avgMs: null, tokens: null, tokPerSec: null };
      showTimings('prompt', m); $('#prompt-timings').insertAdjacentHTML('beforeend', `<div><dt>total</dt><dd>${fmtMs(total)}</dd></div><div><dt>chars/s</dt><dd>${(chars / (total / 1000)).toFixed(0)}</dd></div>`);
      addBench({ task: 'text-generation', model: 'built-in (Gemini Nano / Phi)', device: 'Prompt API', dtype: 'n/a', bytes: null, loadMs, firstMs: first - t1, avgMs: null, runs: 0, tokPerSec: null, result: `${chars} chars in ${fmtMs(total)}` });
      btn.disabled = false; return;
    } catch (e) { log('Prompt API failed, falling back:', e.message); out.textContent = `(built-in API failed: ${e.message}) — falling back to Transformers.js\n\n`; pui.hide(); }
  }
  await runTask('prompt', text);
  btn.disabled = false;
}

// ---------- generic task runner ----------
const TASKS = {
  image: { task: 'image-classification', modelSel: '#image-model', btn: '#image-run', status: '#image-status' },
  speech: { task: 'automatic-speech-recognition', modelSel: '#speech-model', btn: '#speech-run', status: '#speech-status' },
  prompt: { task: 'text-generation', modelSel: '#prompt-model', btn: '#prompt-run', status: '#prompt-timings' },
};
let busy = false;
async function runTask(kind, promptText) {
  if (busy) return; busy = true;
  const T = TASKS[kind]; const btn = $(T.btn); btn.disabled = true;
  const modelOpt = $(T.modelSel).selectedOptions[0];
  const model = $(T.modelSel).value, device = resolved.device, runs = +$('#runs').value || 5;
  const dtype = $('#dtype').value === 'auto' && modelOpt?.dataset.dtype ? modelOpt.dataset.dtype : $('#dtype').value;   // models that ship only one precision (webnn/mobilenet-v2: fp16)
  const pui = progressUI(kind); pui.show();
  const statusEl = $(kind === 'prompt' ? '#prompt-timings' : T.status); if (kind !== 'prompt') statusEl.textContent = `loading on ${device}…`;
  let input, transfer = [];
  try {
    if (kind === 'image') { input = await (await fetch(imageSrc)).blob(); /* fetched on the main thread (served by the SW when offline), passed to the worker as a Blob */ $('#image-results').innerHTML = ''; }
    if (kind === 'speech') { if (!audioData) await loadSampleAudio(); input = audioData.slice(0); transfer = [input.buffer]; $('#speech-result').textContent = ''; }
    if (kind === 'prompt') { input = [{ role: 'system', content: 'You are a concise assistant.' }, { role: 'user', content: promptText }]; }
    const t0 = performance.now();
    traceHeader(kind, device);
    const res = await runInWorker({ task: T.task, model, device, dtype, input, runs, chain: $('#chain').checked, verbose: $('#verbose-ort').checked }, {
      onProgress: (m) => pui.update(m),
      onLoaded: (m) => { pui.done(m); if (m.fellBack) log(`fallback: requested ${m.requested}, running on ${m.device}`); if (kind !== 'prompt') statusEl.textContent = `loaded on ${m.device}${m.fellBack ? ' (fallback from ' + m.requested + ')' : ''} (${fmtMs(m.loadMs)}) — running ${runs + 1}×…`; },
      onRun: (m) => { if (kind !== 'prompt') statusEl.textContent = `run ${m.i + 1}/${m.total}: ${fmtMs(m.ms)}`; },
      onToken: (m) => { $('#prompt-output').textContent += m.text; },
    }, transfer);
    log(`${T.task} on ${device} (${res.resolvedDtype}): load ${fmtMs(res.loadMs)}, first ${fmtMs(res.firstMs)}, avg ${fmtMs(res.avgMs)}`, res.tokPerSec ? `${res.tokPerSec.toFixed(1)} tok/s` : '');
    let resultText = '';
    if (kind === 'image') {
      const list = $('#image-results'); list.innerHTML = '';
      for (const r of res.output) { const li = document.createElement('li'); li.innerHTML = `<span class="score-bar" style="width:${(r.score * 100).toFixed(1)}%"></span><span class="label">${r.label}</span><span class="score">${(r.score * 100).toFixed(1)}%</span>`; list.appendChild(li); }
      resultText = `${res.output[0].label} (${(res.output[0].score * 100).toFixed(0)}%)`;
      statusEl.innerHTML = `<span class="ok-text">done</span> · ${imageSrc.replace(/^.*\//, '')}`;
    } else if (kind === 'speech') {
      $('#speech-result').textContent = res.output.text?.trim() || JSON.stringify(res.output);
      resultText = `“${(res.output.text || '').trim().slice(0, 60)}…” (${(audioData.length / 16000).toFixed(0)} s audio)`;
      statusEl.innerHTML = `<span class="ok-text">done</span> · ${audioLabel}`;
    } else {
      if (!$('#prompt-output').textContent.trim()) $('#prompt-output').textContent = res.output;
      resultText = `${res.tokens} tokens`;
    }
    showTimings(kind, res);
    addBench({ task: T.task, model, device: deviceLabel(res), dtype: res.resolvedDtype, bytes: res.totalBytes, loadMs: res.loadMs, firstMs: res.firstMs, avgMs: res.avgMs, runs: res.runs, tokPerSec: res.tokPerSec, result: resultText });
    refreshCaches();
  } catch (e) {
    log('ERROR', T.task, device, e.message);
    const hint = device.startsWith('webnn') ? ' — WebNN could not run this model here (unsupported op, no backend, or flag off). Try WebGPU or WASM.' : device === 'webgpu' ? ' — try WASM.' : '';
    const html = `<span class="err">✗ ${device}: ${e.message}${hint}</span>`;
    if (kind === 'prompt') $('#prompt-output').textContent += `\n✗ ${device}: ${e.message}${hint}`; else statusEl.innerHTML = html;
    pui.hide();
  }
  btn.disabled = false; busy = false;
}

// ---------- caches panel ----------
async function refreshCaches() {
  const box = $('#cache-list');
  if (!('caches' in self)) { box.textContent = 'Cache API not available.'; return; }
  const names = await caches.keys(); let html = '', grand = 0;
  for (const name of names) {
    const c = await caches.open(name); const reqs = await c.keys(); let sum = 0; const rows = [];
    for (const r of reqs) {
      const resp = await c.match(r); let size = +(resp?.headers.get('content-length') || 0);
      if (!size && resp) { try { size = (await resp.clone().blob()).size; } catch {} }
      sum += size; rows.push([r.url.replace(/^https?:\/\/(huggingface\.co|cdn\.jsdelivr\.net)\//, '$1/').replace(location.origin + '/', './'), size]);
    }
    grand += sum;
    html += `<div class="head">${name} — ${reqs.length} entries, ${fmtMB(sum)}</div>` + rows.sort((a, b) => b[1] - a[1]).slice(0, 40).map(([u, s]) => `<div class="row"><span>${u}</span><span>${fmtMB(s)}</span></div>`).join('') + (rows.length > 40 ? `<div class="row"><span>… ${rows.length - 40} more</span><span></span></div>` : '');
  }
  box.innerHTML = (html || 'No caches yet.') + `<div class="head">Total cached: ${fmtMB(grand)}</div>`;
}
$('#cache-refresh').onclick = refreshCaches;
$('#cache-clear').onclick = async () => {
  if (!confirm('Delete all caches (models, libraries, app shell)? The page will reload.')) return;
  for (const n of await caches.keys()) await caches.delete(n);
  const regs = await navigator.serviceWorker?.getRegistrations?.() || []; for (const r of regs) await r.unregister();
  location.reload();
};

// ---------- boot ----------
log('Web AI Playground boot — Transformers.js 4.3.1 (vendored), UA:', navigator.userAgent);
probeAll(); setupSW(); refreshCaches();
document.querySelector('#image-samples .sample[data-src]').classList.add('selected');
