# NOVA VFX Studio — Starter 0.1

A first browser-based prototype for a neon relighting workflow.

## What works in this prototype
- Import a local video file (MP4, MOV, WEBM supported by the browser).
- Preview playback.
- Real-time stylized cyan / magenta color-light overlays.
- Neon, Cyber, and Ice looks.
- Contrast and saturation controls.
- Export the current processed preview frame as PNG.
- Video stays local in the browser; there is no server upload.

## Important limitations
This is a visual prototype, not a Beeble replacement yet. It does **not** currently perform:
- AI person segmentation / rotoscoping
- Depth or normal map estimation
- True 3D reconstruction or physically based relighting
- Full processed-video export
- Cloud GPU processing

The current effect is a screen-space color overlay. The UI labels the missing AI/3D engine features honestly.

## Run locally
Install Node.js 20+ and then:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Build
```bash
npm run build
```

## Next engineering milestone
Add a backend job API and a GPU inference pipeline:
1. FastAPI upload/job service.
2. FFmpeg decode/encode pipeline.
3. Person segmentation + depth estimation models.
4. C++/CUDA processing module for frame operations.
5. Real subject-aware relighting and video export.

Do not describe the current browser overlay as AI relighting; it is only a look-development preview.
