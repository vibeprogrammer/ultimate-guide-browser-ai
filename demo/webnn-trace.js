// Web AI Bench — WebNN device detection + fallback tracing helpers (used by app.js and inference-worker.js)
// What the browser lets JS see (Oct 2026, sources in README "Tracing NPU fallback"):
//  - createContext({ deviceType: 'npu' }) does NOT throw when there is no NPU: Chromium picks NPU → GPU → CPU itself.
//  - MLGraph.devices (Chromium) lists the devices a compiled graph really runs on. Core ML (macOS) and LiteRT
//    (ChromeOS/Android/Linux) fill it; the Windows ML / ONNX Runtime backend leaves it empty (crbug.com/418031018).
//  - The W3C spec has no deviceType any more (powerPreference + accelerated) and does not expose the chosen device.

export const DEVICES = ['npu', 'gpu', 'cpu'];

// Which MLContextOptions members does this browser actually read? WebIDL dictionaries silently ignore unknown
// members, so "createContext({accelerated:true}) resolved" proves nothing. Getters tell us what was read.
export async function readOptionNames() {
  if (!('ml' in navigator)) return null;
  const read = new Set();
  const opts = {};
  for (const [k, v] of [['deviceType', 'cpu'], ['powerPreference', 'default'], ['accelerated', false]]) Object.defineProperty(opts, k, { enumerable: true, get() { read.add(k); return v; } });
  try { await navigator.ml.createContext(opts); } catch (e) { return { error: `${e.name}: ${e.message}`, read: [...read] }; }
  return { read: [...read], ignored: ['deviceType', 'powerPreference', 'accelerated'].filter(k => !read.has(k)) };
}

// Tiny probe graph (conv2d 3→8 ch + relu, float32): enough for the backend to place it on a device.
async function buildProbeGraph(ctx) {
  const b = new MLGraphBuilder(ctx);
  const x = b.input('x', { dataType: 'float32', shape: [1, 3, 32, 32] });
  const w = b.constant({ dataType: 'float32', shape: [8, 3, 3, 3] }, new Float32Array(8 * 3 * 3 * 3).fill(0.01));
  return b.build({ y: b.relu(b.conv2d(x, w)) });
}

export function limitsSummary(ctx) {
  if (typeof ctx?.opSupportLimits !== 'function') return null;
  try {
    const l = ctx.opSupportLimits();
    const ops = Object.keys(l).filter(k => l[k] && typeof l[k] === 'object' && !['input', 'constant', 'output'].includes(k));
    const dt = (op, port) => l[op]?.[port]?.dataTypes || [];
    return {
      ops: ops.length,
      layout: l.preferredInputLayout,
      maxTensorMB: l.maxTensorByteLength ? Math.round(l.maxTensorByteLength / 1048576) : undefined,
      fp16: dt('conv2d', 'input').includes('float16'),
      int8Quant: dt('dequantizeLinear', 'input').includes('int8') || dt('dequantizeLinear', 'input').includes('uint8'),
      int4: dt('dequantizeLinear', 'input').includes('int4') || dt('dequantizeLinear', 'input').includes('uint4'),
    };
  } catch (e) { return { error: e.message }; }
}

// Turn "requested X, graph.devices = [...]" into a plain verdict.
export function verdict(requested, devices) {
  if (devices === undefined) return { cls: 'warn', short: 'not observable', text: 'This browser has no MLGraph.devices — the device it picked is not observable from JS.' };
  if (!devices.length) return { cls: 'warn', short: 'not observable', text: 'Browser picked; not observable from JS (graph.devices is empty — the Windows ML / ONNX Runtime backend does not report it yet, crbug.com/418031018). Check Task Manager or chrome://histograms (README).' };
  const list = devices.join(' + ');
  if (requested === 'default') return { cls: 'ok', short: list, text: `No deviceType passed (Chromium then uses its IDL default "cpu"); graph runs on ${list}.` };
  if (devices.includes(requested)) return { cls: 'ok', short: list, text: devices.length > 1 ? `Runs on ${requested}; some ops on ${devices.filter(d => d !== requested).join(' + ')}.` : `Runs on ${requested}.` };
  return { cls: 'bad', short: `fallback → ${list}`, text: `FALLBACK: asked for ${requested}, the browser compiled the graph for ${list} (no error was thrown).` };
}

// Probe one device: create a context, build the tiny graph, read graph.devices. Timed.
export async function probeDevice(deviceType) {
  const r = await probeWith(deviceType === 'default' ? {} : { deviceType });
  r.device = deviceType;
  r.verdict = r.ok === false ? r.verdict : r.buildError ? { cls: 'bad', short: 'build failed', text: r.buildError } : verdict(deviceType, r.devices);
  return r;
}

// The W3C spec's device hints (deviceType was removed from the spec in Feb 2025, webmachinelearning/webnn#809):
// powerPreference ("default" | "high-performance" | "low-power") and accelerated (boolean). Probed without deviceType.
export const SPEC_PROBES = [
  ['powerPreference: "high-performance"', { powerPreference: 'high-performance' }],
  ['powerPreference: "low-power"', { powerPreference: 'low-power' }],
  ['accelerated: true', { accelerated: true }],
  ['low-power + accelerated', { powerPreference: 'low-power', accelerated: true }],
];

// Create a context with any MLContextOptions, build the tiny graph, read graph.devices. Timed.
export async function probeWith(options) {
  const r = { options };
  const t0 = performance.now();
  let ctx;
  try { ctx = await navigator.ml.createContext(options); r.contextMs = performance.now() - t0; r.ok = true; }
  catch (e) { r.contextMs = performance.now() - t0; r.ok = false; r.error = `${e.name}: ${e.message}`; r.verdict = { cls: 'bad', short: 'rejected', text: r.error }; return r; }
  if ('accelerated' in ctx) r.accelerated = ctx.accelerated;
  if ('powerPreference' in ctx) r.powerPreference = ctx.powerPreference;
  r.limits = limitsSummary(ctx);
  const t1 = performance.now();
  try { const g = await buildProbeGraph(ctx); r.buildMs = performance.now() - t1; r.devices = 'devices' in g ? [...g.devices] : undefined; g.destroy?.(); }
  catch (e) { r.buildMs = performance.now() - t1; r.buildError = `${e.name}: ${e.message}`; }
  ctx.destroy?.();
  return r;
}

// Wrap the WebNN entry points so every context/graph the library creates is traced. Idempotent.
// emit(kind, text, data) is called synchronously.
export function instrumentWebNN(emit) {
  if (!('ml' in navigator) || self.__webnnTraced) return !!self.__webnnTraced;
  self.__webnnTraced = true;
  const mlProto = Object.getPrototypeOf(navigator.ml);
  const origCreate = mlProto.createContext;
  const ctxInfo = new WeakMap();
  let nCtx = 0, nGraph = 0;
  mlProto.createContext = async function (opts) {
    const id = ++nCtx;
    const desc = typeof GPUDevice !== 'undefined' && opts instanceof GPUDevice ? 'GPUDevice' : JSON.stringify(opts ?? {});
    const t = performance.now();
    try {
      const ctx = await origCreate.call(this, opts);
      ctxInfo.set(ctx, { id, requested: opts?.deviceType || (desc === 'GPUDevice' ? 'gpu' : 'default') });
      const acc = 'accelerated' in ctx ? `, accelerated=${ctx.accelerated}` : '';
      emit('webnn', `createContext(${desc}) #${id} → resolved in ${Math.round(performance.now() - t)} ms${acc} (Chromium does not throw when the device is missing)`, { id, opts: desc });
      return ctx;
    } catch (e) {
      emit('webnn', `createContext(${desc}) #${id} → REJECTED in ${Math.round(performance.now() - t)} ms: ${e.name}: ${e.message}`, { id, error: e.message });
      throw e;
    }
  };
  if (typeof MLGraphBuilder !== 'undefined') {
    const bp = MLGraphBuilder.prototype;
    const opCounts = new WeakMap();
    const builderCtx = new WeakMap();
    // count ops per builder (every builder method except input/constant/build)
    for (const name of Object.getOwnPropertyNames(bp)) {
      if (['constructor', 'build', 'input', 'constant'].includes(name)) continue;
      const d = Object.getOwnPropertyDescriptor(bp, name);
      if (typeof d?.value !== 'function') continue;
      const orig = d.value;
      bp[name] = function (...args) { const m = opCounts.get(this) || {}; m[name] = (m[name] || 0) + 1; opCounts.set(this, m); return orig.apply(this, args); };
    }
    const OrigBuilder = MLGraphBuilder;
    const Wrapped = function (ctx) { const b = new OrigBuilder(ctx); builderCtx.set(b, ctx); return b; };
    Wrapped.prototype = bp;
    try { self.MLGraphBuilder = Wrapped; } catch {}
    const origBuild = bp.build;
    bp.build = async function (outputs) {
      const id = ++nGraph;
      const ops = opCounts.get(this) || {};
      const nOps = Object.values(ops).reduce((a, b) => a + b, 0);
      const top = Object.entries(ops).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}×${v}`).join(' ');
      const info = ctxInfo.get(builderCtx.get(this)) || {};
      const t = performance.now();
      try {
        const g = await origBuild.call(this, outputs);
        const devices = 'devices' in g ? [...g.devices] : undefined;
        const v = verdict(info.requested || 'default', devices);
        emit('webnn', `graph #${id} (context #${info.id ?? '?'}, ${nOps} WebNN ops: ${top}) built in ${Math.round(performance.now() - t)} ms → graph.devices = ${devices === undefined ? 'n/a' : JSON.stringify(devices)} · ${v.text}`, { id, requested: info.requested, devices, nOps, verdict: v.short, cls: v.cls });
        return g;
      } catch (e) {
        emit('webnn', `graph #${id} build FAILED after ${Math.round(performance.now() - t)} ms: ${e.name}: ${e.message}`, { id, error: e.message });
        throw e;
      }
    };
  }
  return true;
}

// ORT verbose-log parser: ORT Web's WebNN EP logs every node it inspects (severity VERBOSE) and a partition
// summary (INFO, or WARNING when the graph is split). Unsupported nodes run on ORT's CPU (WASM) EP.
export function createOrtLogParser() {
  const s = { lines: 0, unsupported: {}, supported: 0, summaries: [], notes: [] };
  return {
    state: s,
    feed(line) {
      let m;
      if ((m = line.match(/Operator type: \[([^\]]+)\] index: \[(\d+)\] name: \[([^\]]*)\] supported: \[(\d)\]/))) {
        s.lines++;
        if (m[4] === '1') s.supported++; else (s.unsupported[m[1]] ||= []).push(m[3] || '#' + m[2]);
        return null;
      }
      if ((m = line.match(/number of partitions supported by WebNN: (\d+) number of nodes in the graph: (\d+) number of nodes supported by WebNN: (\d+)/))) {
        const sum = { partitions: +m[1], nodes: +m[2], webnn: +m[3] };
        s.summaries.push(sum);
        return `ORT WebNN EP: ${sum.webnn}/${sum.nodes} nodes → WebNN in ${sum.partitions} partition(s); ${sum.nodes - sum.webnn} node(s) → ORT CPU (WASM) EP`;
      }
      if (/Dynamic shape is not supported/.test(line)) { s.dynamic = (s.dynamic || 0) + 1; return s.dynamic === 1 ? 'dynamic input shapes found → those nodes cannot go to WebNN (counting; set freeDimensionOverrides)' : null; }
      if (/WebNN|not supported|fall ?back|not assigned to the preferred/i.test(line) && s.notes.length < 40) { s.notes.push(line.slice(0, 300)); return line.replace(/^\S+ \S+ \[[A-Z]:onnxruntime:[^\]]*\]\s*/, '').slice(0, 300); }
      return null;
    },
    report() {
      const types = Object.entries(s.unsupported).sort((a, b) => b[1].length - a[1].length);
      if (!s.lines && !s.summaries.length) return null;
      const n = types.reduce((a, [, v]) => a + v.length, 0);
      return { checked: s.lines, supported: s.supported, unsupported: n, dynamicShapeTensors: s.dynamic || 0, byType: types.map(([t, v]) => ({ op: t, count: v.length, nodes: v.slice(0, 5) })), summaries: s.summaries };
    },
  };
}
