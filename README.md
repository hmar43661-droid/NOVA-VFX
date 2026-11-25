# NOVA VFX Studio — 0.2

Browser-based neon look-development prototype with an AI depth-estimation milestone.

## Existing features
- Import and preview local video.
- Neon, Cyber, and Ice color-light looks.
- Contrast, saturation, cyan, magenta and intensity controls.
- Export current processed preview frame as PNG.

## New in 0.2
- AI depth estimation for the current paused video frame using Depth Anything V2 Small through Transformers.js.
- Side-by-side original frame and generated grayscale depth map.
- Export depth map as PNG.
- Interactive Three.js point-cloud preview generated from the depth map; drag to orbit and zoom.
- Model assets download from Hugging Face on first use; processing runs in the browser.

## Important limitations
This is not a full Beeble replacement. Depth estimation currently runs on one frame at a time. The 3D view is a depth-based point cloud, not a complete textured mesh or scene reconstruction. Subject segmentation, temporal-consistent video depth, physically based relighting, full video rendering, and cloud GPU processing are not included yet.

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


## 0.2.1 fix
- Fixed depth output conversion: Transformers.js returns a RawImage buffer, which is now converted directly to canvas pixels.
- Uses Q8 model inference to reduce browser memory pressure.
- Displays detailed runtime errors instead of hiding them behind a generic message.


## Version 0.2.3 browser runtime update
- Adds explicit failure-stage reporting for the browser depth pipeline.
- Preserves the original ONNX/Transformers.js error details, including numeric and plain-object rejections.
- This is a diagnostic build; it identifies the failing stage rather than claiming the inference issue is fixed.


## Version 0.2.3 runtime update
- Uses the WASM browser backend explicitly with one thread for broader compatibility on static hosting.
- Checks the model repository for available quantized ONNX variants before loading.
- Prefers Q8 for quality and falls back to Q4 only when Q8 is not published.
- Keeps the original depth estimation, PNG export, and Three.js point-cloud workflow.
