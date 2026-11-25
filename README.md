# NOVA VFX Studio — 0.2.6

Browser-based neon look-development prototype with in-browser AI depth estimation.

## Features
- Import and preview a local video.
- Neon, Cyber, and Ice color-light looks.
- Contrast, saturation, cyan, magenta, and intensity controls.
- Export the current processed preview frame as PNG.
- Generate a depth map from the current video frame using Depth Anything V2 Small through Transformers.js.
- Export the generated depth map as PNG.
- Interactive Three.js point-cloud preview generated from the depth map.
- Detailed error reporting that identifies the stage where depth processing fails.

## Runtime configuration (0.2.6)
- `@huggingface/transformers` is pinned to `3.7.2`.
- The browser inference backend is ONNX Runtime WebAssembly (WASM), with one thread for compatibility.
- The app intentionally does **not** override `env.backends.onnx.wasm.wasmPaths`. Transformers.js 3.7.2 resolves the matching `onnxruntime-web` assets. The app must not point this setting at the Transformers package `dist` directory because that directory is not the ONNX Runtime Web WASM distribution.
- Q8 is attempted first; Q4 is attempted only if Q8 initialization fails. The model repository contains the corresponding `model_quantized.onnx` and `model_q4.onnx` files.

## Important limitations
This is not a full Beeble replacement. Depth estimation currently runs on one frame at a time. The 3D view is a depth-based point cloud, not a complete textured mesh or scene reconstruction. Subject segmentation, temporally consistent video depth, physically based relighting, full video rendering, and cloud GPU processing are not included yet.

## Run locally
Node.js 20+:
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Model
`onnx-community/depth-anything-v2-small-ONNX` via `@huggingface/transformers`.

## Version history
- **0.2.1** — Corrected conversion of the returned `RawImage` depth output to a canvas and added runtime diagnostics.
- **0.2.2** — Added failing-stage and error-detail diagnostics.
- **0.2.3–0.2.5** — Added WASM backend configuration, Q8/Q4 fallback, and runtime diagnostics. The custom WASM path introduced in 0.2.5 was incorrect and is removed in 0.2.6.
- **0.2.6** — Restores Transformers.js' built-in ONNX Runtime WebAssembly asset resolution instead of pointing ONNX Runtime at the wrong CDN directory; updates the visible version labels.
