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
