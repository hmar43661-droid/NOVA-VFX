import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Upload, Play, Pause, Download, Sparkles, SlidersHorizontal, Film, Zap, RotateCcw } from "lucide-react";
import "./style.css";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const [fileName, setFileName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [playing, setPlaying] = useState(false);
  const [strength, setStrength] = useState(58);
  const [cyan, setCyan] = useState(65);
  const [magenta, setMagenta] = useState(48);
  const [contrast, setContrast] = useState(112);
  const [saturation, setSaturation] = useState(125);
  const [preset, setPreset] = useState("neon");
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
  }, [videoUrl]);

  useEffect(() => {
    let raf;
    const render = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.filter = `contrast(${contrast}%) saturate(${saturation}%) brightness(1.03)`;
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();

        // Stylized color-light pass for preview. This is not AI relighting or true 3D reconstruction.
        const power = strength / 100;
        const c = cyan / 100;
        const m = magenta / 100;
        const grad1 = ctx.createRadialGradient(w * .22, h * .58, 5, w * .22, h * .58, w * .72);
        grad1.addColorStop(0, `rgba(0,235,255,${0.26 * power * c})`);
        grad1.addColorStop(.55, `rgba(0,115,255,${0.10 * power * c})`);
        grad1.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = grad1;
        ctx.fillRect(0, 0, w, h);

        const grad2 = ctx.createRadialGradient(w * .82, h * .38, 4, w * .82, h * .38, w * .66);
        grad2.addColorStop(0, `rgba(255,35,210,${0.24 * power * m})`);
        grad2.addColorStop(.6, `rgba(115,30,255,${0.12 * power * m})`);
        grad2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad2;
        ctx.fillRect(0, 0, w, h);

        if (preset === "cyber") {
          ctx.fillStyle = `rgba(30,20,120,${0.18 * power})`;
          ctx.fillRect(0, 0, w, h);
        } else if (preset === "ice") {
          ctx.fillStyle = `rgba(20,180,255,${0.12 * power})`;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.globalCompositeOperation = "source-over";
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [videoUrl, strength, cyan, magenta, contrast, saturation, preset]);

  const loadFile = (file) => {
    if (!file || !file.type.startsWith("video/")) {
      setStatus("Please choose a video file");
      return;
    }
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setFileName(file.name);
    setStatus("Footage loaded");
    setPlaying(false);
  };

  const togglePlay = async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      try { await v.play(); setPlaying(true); } catch { setStatus("Playback unavailable"); }
    } else {
      v.pause(); setPlaying(false);
    }
  };

  const exportFrame = () => {
    const canvas = canvasRef.current;
    if (!videoUrl || !canvas) return;
    const a = document.createElement("a");
    a.download = "nova-vfx-frame.png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    setStatus("Preview frame exported as PNG");
  };

  const reset = () => {
    setStrength(58); setCyan(65); setMagenta(48); setContrast(112); setSaturation(125); setPreset("neon");
    setStatus("Settings reset");
  };

  const Slider = ({ label, value, setValue, min = 0, max = 100, suffix = "%" }) => (
    <label className="control">
      <span>{label}<b>{value}{suffix}</b></span>
      <input type="range" min={min} max={max} value={value} onChange={e => setValue(Number(e.target.value))} />
    </label>
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark">N</div><span>NOVA <i>VFX</i></span><small>STUDIO / 0.1</small></div>
        <div className="top-actions"><span className="status-dot"></span><span>{status}</span><button className="export" onClick={exportFrame}><Download size={15}/> Export frame</button></div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <div className="section-label">WORKSPACE</div>
          <div className="nav-item active"><Film size={17}/> VFX Workspace</div>
          <div className="nav-item"><Sparkles size={17}/> Relight Lab <em>Preview</em></div>
          <div className="nav-item"><SlidersHorizontal size={17}/> Color Controls</div>
          <div className="side-divider"></div>
          <div className="section-label">PROJECT</div>
          <div className="project-card"><div className="project-icon"><Film size={17}/></div><div><b>{fileName || "Untitled footage"}</b><small>{videoUrl ? "Video loaded" : "No media imported"}</small></div></div>
          <div className="side-note"><Zap size={15}/><p><b>Local preview</b><br/>Your footage stays in this browser. No upload to a server.</p></div>
        </aside>

        <section className="center">
          <div className="page-heading"><div><div className="eyebrow">AI-ASSISTED VIDEO LOOK DEVELOPMENT</div><h1>Relight <span>Studio</span></h1><p>Shape your footage with a cinematic neon-light preview.</p></div><div className="version-pill">BETA BUILD</div></div>
          <div className="viewer-card">
            <div className="viewer-toolbar"><span><span className="live-dot"></span> VIEWPORT</span><span>1920 × 1080 <i>·</i> Preview</span></div>
            <div className="viewer">
              {videoUrl ? <canvas ref={canvasRef} width="960" height="540" /> : <div className="empty-state"><div className="upload-orb"><Upload size={25}/></div><h2>Bring your footage to life</h2><p>Upload a video to preview the NOVA neon relight look.</p><label className="primary-btn"><Upload size={16}/> Choose video<input type="file" accept="video/*" onChange={e => loadFile(e.target.files?.[0])}/></label><small>MP4 · MOV · WEBM · processed locally in your browser</small></div>}
            </div>
            {videoUrl && <div className="transport"><button onClick={togglePlay}>{playing ? <Pause size={17}/> : <Play size={17}/>}</button><span>{fileName}</span><span className="transport-hint">Preview only</span></div>}
          </div>
          <div className="timeline-card"><div className="timeline-head"><b>FOOTAGE</b><span>{videoUrl ? "Source video" : "Waiting for media"}</span></div><div className="timeline-track"><div className="track-label">V1</div><div className="track-content">{videoUrl ? <div className="clip-block">{fileName}</div> : <div className="track-empty">Import footage to begin</div>}</div></div></div>
          <video ref={videoRef} src={videoUrl} onEnded={() => setPlaying(false)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} playsInline muted className="hidden-video" />
        </section>

        <aside className="inspector">
          <div className="inspector-title"><SlidersHorizontal size={17}/> <b>LOOK SETTINGS</b><button onClick={reset} title="Reset"><RotateCcw size={15}/></button></div>
          <div className="panel-block"><div className="panel-label">LIGHTING PRESET</div><div className="presets"><button className={preset === "neon" ? "selected" : ""} onClick={() => setPreset("neon")}><span className="swatch neon"></span>Neon</button><button className={preset === "cyber" ? "selected" : ""} onClick={() => setPreset("cyber")}><span className="swatch cyber"></span>Cyber</button><button className={preset === "ice" ? "selected" : ""} onClick={() => setPreset("ice")}><span className="swatch ice"></span>Ice</button></div></div>
          <div className="panel-block"><div className="panel-label">LIGHT INTENSITY</div><Slider label="Overall strength" value={strength} setValue={setStrength}/><Slider label="Cyan / blue light" value={cyan} setValue={setCyan}/><Slider label="Magenta light" value={magenta} setValue={setMagenta}/></div>
          <div className="panel-block"><div className="panel-label">IMAGE</div><Slider label="Contrast" value={contrast} setValue={setContrast} min={50} max={180}/><Slider label="Saturation" value={saturation} setValue={setSaturation} min={0} max={200}/></div>
          <div className="engine-card"><div className="engine-head"><span className="engine-icon"><Zap size={15}/></span><b>NOVA RENDER CORE</b><span className="engine-state">ACTIVE</span></div><p>Browser-based preview pipeline</p><div className="engine-line"><span>Video input</span><b>Ready when loaded</b></div><div className="engine-line"><span>Color-light pass</span><b>Real-time</b></div><div className="engine-line"><span>AI depth / 3D</span><b className="pending">Not integrated</b></div></div>
          <div className="disclaimer">Prototype note: this build applies stylized color overlays. It does not yet perform AI person segmentation, depth estimation, true 3D relighting, or full video rendering.</div>
        </aside>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
