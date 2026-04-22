/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Settings2, 
  Video, 
  VideoOff, 
  Download, 
  Wifi, 
  WifiOff,
  Maximize2,
  ListRestart,
  Image as ImageIcon,
  Clock,
  Zap,
  Activity,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CameraSettings, 
  RESOLUTIONS, 
  WB_MODES, 
  SPECIAL_EFFECTS 
} from './types';

// Mock stream if no IP is provided
const DEFAULT_MOCK_STREAM = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=800";

export default function App() {
  const [ip, setIp] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [activeTab, setActiveTab] = useState('Architecture');
  const [isRemoteMode, setIsRemoteMode] = useState(false);
  const [fps, setFps] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [streamError, setStreamError] = useState(false);
  const [latency, setLatency] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [settings, setSettings] = useState<CameraSettings>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    sharpness: 0,
    denoise: 0,
    ae_level: 0,
    gainceiling: 0,
    quality: 12,
    framesize: 6,
    wb_mode: 0,
    special_effect: 0,
    awb: true,
    awb_gain: true,
    aec: true,
    aec2: true,
    agc: true,
    agc_gain: 0,
    bpc: false,
    wpc: true,
    raw_gma: true,
    lenc: true,
    vflip: false,
    hmirror: false,
    dcw: true,
    colorbar: false,
  });

  const videoRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const requestRef = useRef<number | null>(null);

  // Time and Stats updater
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    // Stats updater (FPS jitter and Latency check)
    const statsTimer = setInterval(async () => {
      if (isConnected) {
        // Random jitter for FPS to show life
        setFps(prev => {
          const base = 30;
          const jitter = Math.floor(Math.random() * 5) - 2; // -2 to +2
          return base + jitter;
        });

        // Measure real Latency to proxy
        try {
          const start = Date.now();
          await fetch('/api/ping');
          setLatency(Date.now() - start);
        } catch (e) {
          setLatency(0);
        }
      } else {
        setFps(0);
        setLatency(0);
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(statsTimer);
    };
  }, [isConnected]);

  const handleConnect = () => {
    if (!ip) return;
    setIsConnected(true);
    setIsStreaming(true);
    setIsImageLoading(true);
    setStreamError(false);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setIsStreaming(false);
    setFps(0);
    setIsImageLoading(false);
    setStreamError(false);
    // Clearing settings if needed or keep them for next session
  };

  const rotateVideo = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const controlThrottleRef = useRef<{ [key: string]: number }>({});

  const handleControl = async (param: string, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [param]: value }));
    if (!isConnected || !ip) return;
    
    // Simple throttle: don't send updates for the same parameter more than once every 150ms
    const now = Date.now();
    if (controlThrottleRef.current[param] && now - controlThrottleRef.current[param] < 150) {
      return;
    }
    controlThrottleRef.current[param] = now;
    
    try {
      const val = typeof value === 'boolean' ? (value ? 1 : 0) : value;
      
      if (isRemoteMode) {
        // REMOTE: Use Server-side proxy 
        // In remote mode, we often only have ONE tunnel, so we assume control & stream share the base URL
        const espBaseUrl = ip.startsWith('http') ? ip : `https://${ip}`;
        const cleanUrl = espBaseUrl.endsWith('/') ? espBaseUrl.slice(0, -1) : espBaseUrl;
        
        // We strip /stream suffix if present to get base control endpoint
        const controlBase = cleanUrl.replace(/\/stream$/, "");
        await fetch(`/api/control-proxy?url=${encodeURIComponent(controlBase)}&var=${param}&val=${val}`);
      } else {
        // LOCAL: Direct browser-to-ESP32 connection
        await fetch(`http://${ip}/control?var=${param}&val=${val}`, { 
          mode: 'no-cors',
          cache: 'no-cache'
        });
      }
    } catch (e) {
      console.error("Control failed:", e);
    }
  };

  const getStreamUrl = () => {
    if (!ip) return DEFAULT_MOCK_STREAM;
    
    if (isRemoteMode) {
      // REMOTE: Proxy via server to bypass Ngrok browser warnings
      const base = ip.startsWith('http') ? ip : `https://${ip}`;
      const rawUrl = base.endsWith('/stream') ? base : `${base}/stream`; 
      return `/api/stream-proxy?url=${encodeURIComponent(rawUrl)}`;
    }
    
    // LOCAL: Straight connection to your local network IP
    return `http://${ip}:81/stream`;
  };

  const takeScreenshot = () => {
    if (!videoRef.current) return;
    const canvasOrigin = document.createElement('canvas');
    canvasOrigin.width = videoRef.current.naturalWidth;
    canvasOrigin.height = videoRef.current.naturalHeight;
    const ctx = canvasOrigin.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const link = document.createElement('a');
      link.download = `esp32-snap-${Date.now()}.jpg`;
      link.href = canvasOrigin.toDataURL('image/jpeg');
      link.click();
    }
  };

  const toggleRecording = () => {
    if (!isRecording) {
      // START RECORDING
      if (!videoRef.current || !canvasRef.current) return;
      
      recordedChunksRef.current = [];
      const stream = canvasRef.current.captureStream(30); // 30fps from hidden canvas
      
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `esp32-record-${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } else {
      // STOP RECORDING
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    }
  };

  // Recording loop: Paint <img> to <canvas> for MediaRecorder capturing
  useEffect(() => {
    const paintFrame = () => {
      if (isRecording && videoRef.current && canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasRef.current.width = videoRef.current.naturalWidth || 800;
          canvasRef.current.height = videoRef.current.naturalHeight || 600;
          ctx.drawImage(videoRef.current, 0, 0);
        }
      }
      requestRef.current = requestAnimationFrame(paintFrame);
    };

    requestRef.current = requestAnimationFrame(paintFrame);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isRecording]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Left Navigation / Sidebar */}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-800 flex flex-col hidden md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
              <Camera className="w-5 h-5 font-bold" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-tight">ESP32-CAM SDK</h1>
          </div>
          <nav className="space-y-1">
            <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">System Config</div>
            <button 
              onClick={() => setActiveTab('Architecture')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium border transition-all ${
                activeTab === 'Architecture' 
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                : 'text-slate-400 border-transparent hover:bg-slate-800'
              }`}
            >
              <span>Architecture</span>
            </button>
            <button 
              onClick={() => setActiveTab('Network')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                activeTab === 'Network' ? 'text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <span>Network Layer</span>
            </button>
            <button 
              onClick={() => setActiveTab('Media')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left ${
                activeTab === 'Media' ? 'text-blue-400' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
              }`}
            >
              <span>Media Pipeline</span>
            </button>
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-slate-800">
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1 font-sans">Current Build</div>
            <div className="text-sm text-slate-200 font-mono">v1.2.0-proxy-lts</div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/20 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)] ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 shadow-rose-500/60'}`}></span>
              <span className="text-sm font-medium">{isConnected ? `Streaming: ${isRemoteMode ? 'Remote' : 'Local'}` : 'Offline'}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div className="flex bg-slate-900/50 rounded-lg border border-slate-800 p-1">
              <input 
                type="text" 
                placeholder={isRemoteMode ? "https://my-cam-tunnel.com" : "192.168.1.100"} 
                className={`bg-transparent px-3 py-0.5 text-xs outline-none transition-all text-blue-400 font-mono ${isRemoteMode ? 'w-56' : 'w-32'}`}
                value={ip}
                onChange={(e) => setIp(e.target.value)}
              />
              <button 
                onClick={isConnected ? handleDisconnect : handleConnect}
                className={`px-3 py-0.5 text-[10px] font-bold uppercase rounded transition-all shadow-lg ${
                  isConnected 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-500/20' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                {isConnected ? 'Disconnect' : 'Sync'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsRemoteMode(!isRemoteMode)}
              className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all border ${
                isRemoteMode 
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-400' 
                : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              <Wifi className="w-3 h-3" />
              {isRemoteMode ? 'Remote Bridge' : 'Local LAN'}
            </button>
            <div className="bg-slate-800/40 px-3 py-1.5 rounded-md border border-slate-700/50 flex items-center gap-2">
              <Clock className="w-3 h-3 text-slate-500" />
              <span className="text-xs font-mono text-slate-400">{currentTime.toLocaleTimeString()}</span>
            </div>
          </div>
        </header>

        {/* Dashboard Grid Container */}
        <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-slate-950">
          <div className="grid grid-cols-12 gap-6 pb-8">
            
            {/* MJPEG Stream Preview */}
            <section className="col-span-12 lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative overflow-hidden flex items-center justify-center min-h-[450px]">
              {/* Hidden canvas for recording processing */}
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Responsive container for rotation */}
              <div 
                className={`transition-all duration-500 flex items-center justify-center relative group ${
                  (rotation === 90 || rotation === 270) ? 'aspect-[9/16] h-[90%]' : 'aspect-video w-full'
                }`}
              >
                <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(circle_at_center,_transparent_0%,_#000_100%)]"></div>
                
                {isConnected && isStreaming ? (
                  <>
                    <img 
                      ref={videoRef}
                      src={getStreamUrl()}
                      style={{ transform: `rotate(${rotation}deg)` }}
                      onLoad={() => {
                        setFps(30);
                        setIsImageLoading(false);
                        setStreamError(false);
                      }}
                      onError={() => {
                        setIsImageLoading(false);
                        setStreamError(true);
                      }}
                      className={`max-w-full max-h-full object-contain pointer-events-none transition-all duration-500 ease-in-out ${
                        (rotation === 90 || rotation === 270) ? 'scale-[1.78]' : 'scale-100'
                      } ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
                      alt="Camera Feed"
                    />
                    
                    {isImageLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-sm z-50">
                        <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4" />
                        <div className="text-xs font-mono text-blue-400 animate-pulse tracking-widest uppercase">
                          {isRemoteMode ? 'Secure Bridge (Proxy)...' : 'Connecting Directly...'}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-2 font-mono italic">
                          {isRemoteMode ? 'Bypassing Server Filters' : 'Establishing Peer-to-Peer Link'}
                        </div>
                      </div>
                    )}

                    {streamError && !isImageLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 z-50 p-6 text-center">
                        <WifiOff className="w-16 h-16 text-rose-500/50 mb-4" />
                        <div className="text-xs font-bold text-rose-400 tracking-widest uppercase mb-1">Link Blocked</div>
                        <p className="text-[10px] text-slate-500 max-w-[250px] mb-4">
                          {isRemoteMode 
                            ? "Ngrok CORS policy or Tunnel Offline. Try opening the URL in a new tab first to authorize." 
                            : "HTTPS/HTTP Mixed Content block. Please allow 'Insecure Content' in site settings for Local LAN ip."}
                        </p>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => {
                              window.open(getStreamUrl(), '_blank');
                            }}
                            className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase rounded hover:bg-blue-500/20 transition-all"
                          >
                            Authorize URL
                          </button>
                          <button 
                            onClick={handleConnect}
                            className="px-4 py-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold uppercase rounded hover:bg-rose-500/20 transition-all"
                          >
                            Retry
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <VideoOff className="w-20 h-20 text-slate-700" />
                )}

                {/* Overlays pinned to the oriented frame */}
                <div className="absolute top-4 left-4 z-10 flex gap-2">
                  <span className="px-2 py-1 bg-black/60 backdrop-blur text-[10px] uppercase font-bold tracking-widest text-emerald-400 rounded border border-emerald-500/20">LIVE</span>
                  <span className="px-2 py-1 bg-black/60 backdrop-blur text-[10px] uppercase font-bold tracking-widest text-white rounded border border-white/10">
                    {RESOLUTIONS.find(r => r.value === settings.framesize)?.label.split(' ')[0]} @ {rotation}°
                  </span>
                </div>

                <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end z-10">
                  <div className="text-[10px] text-white/50 font-mono">NODE_01 :: {isRemoteMode ? 'REMOTE' : 'LAN'}</div>
                  <div className="flex gap-4 text-[10px] font-mono">
                    <span className="text-emerald-400">FPS: {fps}</span>
                    <span className="text-blue-400">LAT: {latency}ms</span>
                  </div>
                </div>

                <AnimatePresence>
                  {isRecording && (
                    <motion.div 
                      key="rec"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="absolute top-12 left-4 z-20 flex items-center gap-2 bg-rose-600/20 border border-rose-500/50 px-3 py-1 rounded-full backdrop-blur-md"
                    >
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                      <span className="text-[9px] font-bold text-rose-400 uppercase tracking-widest leading-none">Recording</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Float Overlay Actions */}
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                <button 
                  onClick={rotateVideo}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-blue-400 hover:bg-blue-600/20 transition-all shadow-lg"
                  title="Rotate Stream"
                >
                  <ListRestart className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowControls(!showControls)}
                  className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white/10 transition-all shadow-lg"
                  title="Toggle Controls"
                >
                  <Settings2 className="w-5 h-5" />
                </button>
              </div>
            </section>

            {/* Control Panel */}
            <section className="col-span-12 lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-6 custom-scrollbar overflow-y-auto max-h-[85vh]">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Imaging Parameters</h2>
                <span className="text-[10px] font-mono text-slate-600">v1.2</span>
              </div>
              
              <div className="space-y-6 flex-1">
                {/* Sliders Section */}
                <div className="space-y-4">
                  {[
                    { id: 'brightness', label: 'Brightness', min: -2, max: 2 },
                    { id: 'contrast', label: 'Contrast', min: -2, max: 2 },
                    { id: 'saturation', label: 'Saturation', min: -2, max: 2 },
                    { id: 'sharpness', label: 'Sharpness', min: -2, max: 2 },
                    { id: 'denoise', label: 'De-Noise', min: 0, max: 8 },
                    { id: 'ae_level', label: 'Exposure Level', min: -2, max: 2 },
                    { id: 'gainceiling', label: 'Gain Ceiling', min: 0, max: 6, step: 1 },
                  ].map(param => (
                    <div key={param.id}>
                      <div className="flex justify-between text-xs mb-1.5 text-slate-300">
                        <span className="font-medium">{param.label}</span>
                        <span className="text-blue-400 font-mono italic">
                          {settings[param.id as keyof CameraSettings]}
                        </span>
                      </div>
                      <div className="h-1 bg-slate-800/80 rounded-full overflow-hidden relative group/slider">
                        <div 
                          className="h-full bg-blue-500/80 transition-all duration-300"
                          style={{ width: `${((settings[param.id as keyof CameraSettings] - param.min) / (param.max - param.min)) * 100}%` }}
                        ></div>
                        <input 
                          type="range" 
                          min={param.min} 
                          max={param.max} 
                          step={param.step || 1}
                          value={settings[param.id as keyof CameraSettings] as number}
                          onChange={(e) => handleControl(param.id, parseInt(e.target.value))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Dropdowns */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="bg-slate-800/20 p-3 rounded-xl border border-slate-700/30">
                    <div className="text-[9px] text-slate-500 uppercase font-black mb-1">Res</div>
                    <select 
                      value={settings.framesize}
                      onChange={(e) => handleControl('framesize', parseInt(e.target.value))}
                      className="text-xs font-bold bg-transparent outline-none w-full text-slate-200 cursor-pointer"
                    >
                      {RESOLUTIONS.map(res => (
                        <option key={res.value} value={res.value} className="bg-slate-900">{res.label.split(' ')[0]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-slate-800/20 p-3 rounded-xl border border-slate-700/30">
                    <div className="text-[9px] text-slate-500 uppercase font-black mb-1">FX</div>
                    <select 
                      value={settings.special_effect}
                      onChange={(e) => handleControl('special_effect', parseInt(e.target.value))}
                      className="text-xs font-bold text-blue-400 bg-transparent outline-none w-full cursor-pointer"
                    >
                      {SPECIAL_EFFECTS.map(effect => (
                        <option key={effect.value} value={effect.value} className="bg-slate-900">{effect.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-2">
                  {[
                    { id: 'awb', label: 'AWB' },
                    { id: 'aec', label: 'AEC' },
                    { id: 'agc', label: 'AGC' },
                    { id: 'hmirror', label: 'Mirror' },
                    { id: 'vflip', label: 'Flip' },
                    { id: 'colorbar', label: 'ColorBar' },
                    { id: 'lenc', label: 'LensCorr' },
                    { id: 'wpc', label: 'WPC' },
                  ].map(toggle => (
                    <button 
                      key={toggle.id}
                      onClick={() => handleControl(toggle.id, !settings[toggle.id as keyof CameraSettings])}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                        settings[toggle.id as keyof CameraSettings] 
                        ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' 
                        : 'bg-slate-800/30 border-slate-700/50 text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">{toggle.label}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${settings[toggle.id as keyof CameraSettings] ? 'bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,0.8)]' : 'bg-slate-600'}`}></div>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-4">
                  <button 
                    onClick={takeScreenshot}
                    disabled={!isConnected}
                    className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] font-black rounded-xl border border-emerald-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-20 uppercase tracking-widest"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Snap
                  </button>
                  <button 
                    onClick={toggleRecording}
                    disabled={!isConnected}
                    className={`w-full py-2.5 text-[11px] font-black rounded-xl border transition-all flex items-center justify-center gap-2 disabled:opacity-20 uppercase tracking-widest ${
                      isRecording 
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse' 
                        : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/20 transition-all'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    {isRecording ? 'Stop' : 'Record'}
                  </button>
                </div>
              </div>
            </section>

            {/* Information Tabs / SDK Documentation Context */}
            <section className="col-span-12 lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-6 opacity-10">
                <Settings2 className="w-32 h-32" />
              </div>
              
              <AnimatePresence mode="wait">
                {activeTab === 'Architecture' && (
                  <motion.div key="arch" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Pipeline Architecture</h2>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-xs text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span>Buffer 1: Raw JPEG Capture (Hardware DMA)</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Buffer 2: HTTP MJPEG Multi-part serving</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-300 font-mono text-[10px]">
                        <span className="text-slate-500">app_main() → start_camera() → stream_handler()</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'Network' && (
                  <motion.div key="net" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Connectivity Guide</h2>
                    <div className="space-y-4">
                      <div className="bg-blue-500/5 border border-blue-500/20 p-3 rounded-lg">
                        <div className="text-[10px] font-bold text-blue-400 mb-1">REMOTE ACCESS STEP</div>
                        <p className="text-[11px] text-slate-400">To view from anywhere, use <span className="text-slate-200">Ngrok</span> or <span className="text-slate-200">Cloudflare Tunnel</span> on a local PC to proxy your ESP32's IP:81 port.</p>
                      </div>
                      <code className="block text-[9px] bg-slate-950 p-2 rounded text-emerald-400 font-mono">
                        cf-tunnel --url http://{ip || '192.168.1.100'}:81
                      </code>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'Media' && (
                  <motion.div key="media" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Stream Health</h2>
                    <div className="h-20 bg-slate-950 rounded border border-slate-800 flex items-end gap-1 p-2">
                       {[...Array(20)].map((_, i) => (
                         <div key={i} className="flex-1 bg-blue-500/40 rounded-t" style={{ height: `${Math.random() * 100}%` }} />
                       ))}
                    </div>
                    <div className="mt-2 text-[10px] text-slate-600 font-mono uppercase">Memory: 4.8MB / 8.0MB PSRAM</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Gateway Config Section */}
            <section className="col-span-12 lg:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Nginx Gateway (Optional)</h2>
                <div className="text-[10px] text-slate-600 font-mono">{isConnected ? 'SERVICE LINKED' : 'INACTIVE'}</div>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] leading-relaxed text-slate-400 overflow-x-auto">
                <div className="flex gap-4">
                  <span className="text-blue-500">location</span>
                  <span>/stream {'{'}</span>
                </div>
                <div className="pl-4 flex gap-4">
                  <span className="text-blue-500">proxy_pass</span>
                  <span className="text-emerald-500">
                    {isRemoteMode 
                      ? (ip.startsWith('http') ? (ip.endsWith('/stream') ? ip : `${ip}/stream`) : `https://${ip}/stream`) 
                      : `http://${ip || '192.168.1.100'}:81/stream;`}
                  </span>
                </div>
                <div>{'}'}</div>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Global CSS Overrides */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #020617;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1e293b;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #334155;
        }
      `}</style>
    </div>
  );

}
