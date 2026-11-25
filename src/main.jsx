import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Upload, Play, Pause, Download, Sparkles, SlidersHorizontal, Film, Zap, RotateCcw, Layers3, Box, Brain, Image as ImageIcon } from "lucide-react";
import "./style.css";

const MODEL_ID = "onnx-community/depth-anything-v2-small-ONNX";
let depthPipelinePromise = null;

async function getDepthPipeline(onProgress) {
  if (!depthPipelinePromise) {
    depthPipelinePromise = import("@huggingface/transformers").then(async ({ pipeline, env }) => {
      env.allowLocalModels = false;
      return pipeline("depth-estimation", MODEL_ID, {
        dtype: "q8",
        progress_callback: (p) => onProgress?.(p)
      });
    }).catch((err) => {
      depthPipelinePromise = null;
      throw err;
    });
  }
  return depthPipelinePromise;
}

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const threeHostRef = useRef(null);
  const threeCleanupRef = useRef(null);
  const depthCanvasRef = useRef(null);
  const sourceCanvasRef = useRef(null);
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
  const [depthStatus, setDepthStatus] = useState("Model not loaded");
  const [depthBusy, setDepthBusy] = useState(false);
  const [depthProgress, setDepthProgress] = useState(0);
  const [depthReady, setDepthReady] = useState(false);
  const [depthView, setDepthView] = useState("map");
  const [depthError, setDepthError] = useState("");
  const [depthStrength, setDepthStrength] = useState(1.25);

  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl); }, [videoUrl]);

  useEffect(() => {
    let raf;
    const render = () => {
      const video = videoRef.current, canvas = canvasRef.current;
      if (video && canvas && video.readyState >= 2) {
        const ctx = canvas.getContext("2d");
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.filter = `contrast(${contrast}%) saturate(${saturation}%) brightness(1.03)`;
        ctx.drawImage(video, 0, 0, w, h);
        ctx.restore();
        const power = strength / 100, c = cyan / 100, m = magenta / 100;
        const grad1 = ctx.createRadialGradient(w*.22,h*.58,5,w*.22,h*.58,w*.72);
        grad1.addColorStop(0,`rgba(0,235,255,${.26*power*c})`);
        grad1.addColorStop(.55,`rgba(0,115,255,${.10*power*c})`);
        grad1.addColorStop(1,"rgba(0,0,0,0)");
        ctx.globalCompositeOperation="screen"; ctx.fillStyle=grad1; ctx.fillRect(0,0,w,h);
        const grad2=ctx.createRadialGradient(w*.82,h*.38,4,w*.82,h*.38,w*.66);
        grad2.addColorStop(0,`rgba(255,35,210,${.24*power*m})`);
        grad2.addColorStop(.6,`rgba(115,30,255,${.12*power*m})`);
        grad2.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=grad2; ctx.fillRect(0,0,w,h);
        if(preset==="cyber"){ctx.fillStyle=`rgba(30,20,120,${.18*power})`;ctx.fillRect(0,0,w,h);}
        else if(preset==="ice"){ctx.fillStyle=`rgba(20,180,255,${.12*power})`;ctx.fillRect(0,0,w,h);}
        ctx.globalCompositeOperation="source-over";
      }
      raf=requestAnimationFrame(render);
    };
    raf=requestAnimationFrame(render);
    return ()=>cancelAnimationFrame(raf);
  },[videoUrl,strength,cyan,magenta,contrast,saturation,preset]);

  const loadFile = (file) => {
    if(!file || !file.type.startsWith("video/")){setStatus("Please choose a video file");return;}
    if(videoUrl) URL.revokeObjectURL(videoUrl);
    setVideoUrl(URL.createObjectURL(file)); setFileName(file.name);
    setStatus("Footage loaded"); setPlaying(false); setDepthReady(false); setDepthError("");
  };

  const togglePlay = async () => {
    const v=videoRef.current;if(!v)return;
    if(v.paused){try{await v.play();setPlaying(true);}catch{setStatus("Playback unavailable");}}
    else{v.pause();setPlaying(false);}
  };

  const getCurrentFrame = () => {
    const v=videoRef.current;
    if(!v || v.readyState<2) throw new Error("Wait until the video frame is ready.");
    const maxW=640, scale=Math.min(1,maxW/v.videoWidth);
    const w=Math.max(1,Math.round(v.videoWidth*scale)),h=Math.max(1,Math.round(v.videoHeight*scale));
    const c=document.createElement("canvas");c.width=w;c.height=h;
    c.getContext("2d",{willReadFrequently:true}).drawImage(v,0,0,w,h);
    return c;
  };

  const generateDepth = async () => {
    if(!videoUrl){setDepthError("Upload a video first.");return;}
    setDepthBusy(true);setDepthError("");setDepthProgress(0);setDepthStatus("Loading AI model…");
    try{
      const estimator=await getDepthPipeline((p)=>{
        if(p && typeof p.progress==="number") setDepthProgress(Math.round(p.progress));
        if(p?.status) setDepthStatus(p.status==="progress"?"Downloading AI model…":String(p.status));
      });
      setDepthStatus("Analysing current frame…");
      const source=getCurrentFrame();
      const result=await estimator(source);
      const depth=result?.depth;
      if(!depth || !depth.data || !depth.width || !depth.height){
        throw new Error("Depth model returned an empty or invalid image result.");
      }

      // Transformers.js v3 returns depth as a RawImage, not an HTMLCanvasElement.
      // Convert its pixel buffer into a browser canvas explicitly.
      const w=depth.width, h=depth.height, channels=depth.channels || 1;
      const dc=document.createElement("canvas");
      dc.width=w; dc.height=h;
      const dctx=dc.getContext("2d",{willReadFrequently:true});
      const imageData=dctx.createImageData(w,h);
      const input=depth.data;
      for(let i=0,j=0;i<w*h;i++,j+=4){
        const k=i*channels;
        const r=input[k] ?? 0;
        const g=channels>1 ? input[k+1] : r;
        const b=channels>2 ? input[k+2] : r;
        imageData.data[j]=r;
        imageData.data[j+1]=g;
        imageData.data[j+2]=b;
        imageData.data[j+3]=255;
      }
      dctx.putImageData(imageData,0,0);

      const sc=document.createElement("canvas");sc.width=w;sc.height=h;
      sc.getContext("2d").drawImage(source,0,0,w,h);
      depthCanvasRef.current=dc;sourceCanvasRef.current=sc;
      setDepthReady(true);setDepthStatus(`Depth map ready · ${w} × ${h}`);setDepthProgress(100);
    }catch(err){
      console.error("NOVA VFX depth engine error:",err);
      const details = err instanceof Error
        ? `${err.name}: ${err.message}`
        : (typeof err === "string" ? err : JSON.stringify(err));
      setDepthError(details || "Unknown depth engine error. Check the browser console.");
      setDepthStatus("Depth engine error");
    }finally{setDepthBusy(false);}
  };

  const exportDepth = () => {
    if(!depthCanvasRef.current)return;
    const a=document.createElement("a");a.download="nova-depth-map.png";
    a.href=depthCanvasRef.current.toDataURL("image/png");a.click();
  };

  useEffect(()=>{
    if(!depthReady || depthView!=="3d" || !threeHostRef.current || !depthCanvasRef.current || !sourceCanvasRef.current)return;
    const host=threeHostRef.current;
    const width=Math.max(280,host.clientWidth),height=Math.max(220,Math.min(430,Math.round(width*.62)));
    const scene=new THREE.Scene();scene.background=new THREE.Color("#0b0b16");
    const camera=new THREE.PerspectiveCamera(45,width/height,.1,100);
    camera.position.set(0,0,3.2);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
    renderer.setSize(width,height);host.innerHTML="";host.appendChild(renderer.domElement);
    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;controls.dampingFactor=.06;
    const dctx=depthCanvasRef.current.getContext("2d",{willReadFrequently:true});
    const sctx=sourceCanvasRef.current.getContext("2d",{willReadFrequently:true});
    const dw=depthCanvasRef.current.width,dh=depthCanvasRef.current.height;
    const depthPixels=dctx.getImageData(0,0,dw,dh).data;
    const sourcePixels=sctx.getImageData(0,0,dw,dh).data;
    const step=Math.max(2,Math.ceil(Math.sqrt((dw*dh)/18000)));
    const positions=[],colors=[];
    for(let y=0;y<dh;y+=step)for(let x=0;x<dw;x+=step){
      const i=(y*dw+x)*4;
      const d=depthPixels[i]/255;
      positions.push((x/dw-.5)*2.1,(.5-y/dh)*1.45,(d-.5)*depthStrength);
      colors.push(sourcePixels[i]/255,sourcePixels[i+1]/255,sourcePixels[i+2]/255);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
    geometry.setAttribute("color",new THREE.Float32BufferAttribute(colors,3));
    const material=new THREE.PointsMaterial({size:Math.max(.003,step/800),vertexColors:true,sizeAttenuation:true});
    const points=new THREE.Points(geometry,material);scene.add(points);
    let frame;
    const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);};
    animate();
    const onResize=()=>{const w=Math.max(280,host.clientWidth),h=Math.max(220,Math.min(430,Math.round(w*.62)));camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);};
    window.addEventListener("resize",onResize);
    threeCleanupRef.current=()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",onResize);controls.dispose();geometry.dispose();material.dispose();renderer.dispose();renderer.domElement.remove();};
    return ()=>{threeCleanupRef.current?.();threeCleanupRef.current=null;};
  },[depthReady,depthView,depthStrength]);

  const reset=()=>{setStrength(58);setCyan(65);setMagenta(48);setContrast(112);setSaturation(125);setPreset("neon");setDepthStrength(1.25);setStatus("Settings reset");};
  const Slider=({label,value,setValue,min=0,max=100,suffix="%"})=><label className="control"><span>{label}<b>{value}{suffix}</b></span><input type="range" min={min} max={max} value={value} onChange={e=>setValue(Number(e.target.value))}/></label>;

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><div className="brand-mark">N</div><span>NOVA <i>VFX</i></span><small>STUDIO / 0.2</small></div><div className="top-actions"><span className="status-dot"></span><span>{status}</span><button className="export" onClick={()=>{if(canvasRef.current){const a=document.createElement("a");a.download="nova-vfx-frame.png";a.href=canvasRef.current.toDataURL("image/png");a.click();}}}><Download size={15}/> Export frame</button></div></header>
    <main className="layout">
      <aside className="sidebar"><div className="section-label">WORKSPACE</div><div className="nav-item active"><Film size={17}/> VFX Workspace</div><div className="nav-item"><Sparkles size={17}/> Relight Lab <em>Preview</em></div><div className="nav-item"><SlidersHorizontal size={17}/> Color Controls</div><div className="side-divider"></div><div className="section-label">PROJECT</div><div className="project-card"><div className="project-icon"><Film size={17}/></div><div><b>{fileName||"Untitled footage"}</b><small>{videoUrl?"Video loaded":"No media imported"}</small></div></div><div className="side-note"><Zap size={15}/><p><b>Local processing</b><br/>Video frames are analysed in your browser. The AI model downloads once.</p></div></aside>
      <section className="center">
        <div className="page-heading"><div><div className="eyebrow">AI-ASSISTED VIDEO LOOK DEVELOPMENT</div><h1>Relight <span>Studio</span></h1><p>Depth-aware look development for your footage.</p></div><div className="version-pill">BETA 0.2</div></div>
        <div className="viewer-card"><div className="viewer-toolbar"><span><span className="live-dot"></span> VIEWPORT</span><span>Live preview</span></div><div className="viewer">{videoUrl?<canvas ref={canvasRef} width="960" height="540"/>:<div className="empty-state"><div className="upload-orb"><Upload size={25}/></div><h2>Bring your footage to life</h2><p>Upload a video to preview the NOVA neon relight look.</p><label className="primary-btn"><Upload size={16}/> Choose video<input type="file" accept="video/*" onChange={e=>loadFile(e.target.files?.[0])}/></label><small>MP4 · MOV · WEBM · local browser preview</small></div>}</div>{videoUrl&&<div className="transport"><button onClick={togglePlay}>{playing?<Pause size={17}/>:<Play size={17}/>}</button><span>{fileName}</span><span className="transport-hint">Preview</span></div>}</div>
        <div className="timeline-card"><div className="timeline-head"><b>FOOTAGE</b><span>{videoUrl?"Source video":"Waiting for media"}</span></div><div className="timeline-track"><div className="track-label">V1</div><div className="track-content">{videoUrl?<div className="clip-block">{fileName}</div>:<div className="track-empty">Import footage to begin</div>}</div></div></div>
        <section className="depth-card">
          <div className="depth-heading"><div><div className="panel-label">AI DEPTH ENGINE</div><h2><Layers3 size={20}/> Depth Map <span>+ 3D View</span></h2><p>Depth Anything V2 Small · AI inference in your browser</p></div><span className={`depth-badge ${depthReady?"ready":""}`}>{depthReady?"GENERATED":"AI ENGINE"}</span></div>
          <div className="depth-actions"><button className="primary-btn" onClick={generateDepth} disabled={!videoUrl||depthBusy}><Brain size={16}/>{depthBusy?"Generating…":"Generate Depth Map"}</button><button className="secondary-btn" onClick={exportDepth} disabled={!depthReady}><Download size={15}/> Export PNG</button></div>
          {depthBusy&&<div className="progress-wrap"><div className="progress-label"><span>{depthStatus}</span><b>{depthProgress}%</b></div><div className="progress-bar"><i style={{width:`${depthProgress}%`}}/></div></div>}
          {depthError&&<div className="depth-error">{depthError}</div>}
          {depthReady?<><div className="depth-tabs"><button className={depthView==="map"?"active":""} onClick={()=>setDepthView("map")}><ImageIcon size={15}/> Depth Map</button><button className={depthView==="3d"?"active":""} onClick={()=>setDepthView("3d")}><Box size={15}/> 3D Point Cloud</button></div>{depthView==="map"?<div className="depth-result"><div><small>ORIGINAL FRAME</small><img src={sourceCanvasRef.current?.toDataURL()||""} alt="Original video frame"/></div><div><small>AI DEPTH MAP</small><img src={depthCanvasRef.current?.toDataURL()||""} alt="Generated grayscale depth map"/></div></div>:<><div className="three-host" ref={threeHostRef}/><label className="control depth-slider"><span>3D depth strength <b>{depthStrength.toFixed(2)}×</b></span><input type="range" min="0.2" max="3" step="0.05" value={depthStrength} onChange={e=>setDepthStrength(Number(e.target.value))}/></label><p className="depth-hint">Drag to orbit · Pinch or scroll to zoom. This is a depth-based point-cloud preview, not a complete editable 3D scene.</p></>}</>:<div className="depth-placeholder"><Layers3 size={28}/><b>No depth map generated</b><span>Upload a video, pause on a frame, then generate its AI depth map.</span></div>}
          <div className="depth-footnote">First run downloads the AI model (about 100 MB). Processing speed depends on your device. Start with a short video and pause on a clear frame.</div>
        </section>
        <video ref={videoRef} src={videoUrl} onEnded={()=>setPlaying(false)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} playsInline muted className="hidden-video"/>
      </section>
      <aside className="inspector"><div className="inspector-title"><SlidersHorizontal size={17}/><b>LOOK SETTINGS</b><button onClick={reset} title="Reset"><RotateCcw size={15}/></button></div><div className="panel-block"><div className="panel-label">LIGHTING PRESET</div><div className="presets"><button className={preset==="neon"?"selected":""} onClick={()=>setPreset("neon")}><span className="swatch neon"/>Neon</button><button className={preset==="cyber"?"selected":""} onClick={()=>setPreset("cyber")}><span className="swatch cyber"/>Cyber</button><button className={preset==="ice"?"selected":""} onClick={()=>setPreset("ice")}><span className="swatch ice"/>Ice</button></div></div><div className="panel-block"><div className="panel-label">LIGHT INTENSITY</div><Slider label="Overall strength" value={strength} setValue={setStrength}/><Slider label="Cyan / blue light" value={cyan} setValue={setCyan}/><Slider label="Magenta light" value={magenta} setValue={setMagenta}/></div><div className="panel-block"><div className="panel-label">IMAGE</div><Slider label="Contrast" value={contrast} setValue={setContrast} min={50} max={180}/><Slider label="Saturation" value={saturation} setValue={setSaturation} min={0} max={200}/></div><div className="engine-card"><div className="engine-head"><span className="engine-icon"><Zap size={15}/></span><b>NOVA RENDER CORE</b><span className="engine-state">ACTIVE</span></div><p>Browser-based video + AI depth pipeline</p><div className="engine-line"><span>Video input</span><b>{videoUrl?"Loaded":"Waiting"}</b></div><div className="engine-line"><span>Color-light pass</span><b>Real-time</b></div><div className="engine-line"><span>AI depth map</span><b className={depthReady?"good":"pending"}>{depthReady?"Generated":"Ready to run"}</b></div><div className="engine-line"><span>3D preview</span><b className={depthReady?"good":"pending"}>{depthReady?"Available":"Needs depth map"}</b></div></div><div className="disclaimer">Depth estimation is AI-generated from one frame. 3D mode visualizes it as a point cloud; full Beeble-style reconstruction, subject masks, temporal video depth and physically based relighting are later milestones.</div></aside>
    </main>
  </div>;
}

createRoot(document.getElementById("root")).render(<App />);
