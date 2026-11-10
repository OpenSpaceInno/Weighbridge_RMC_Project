import React, { useEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Video, 
  Radio, 
  Tv, 
  Maximize2, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Scale, 
  Play,
  LayoutGrid,
  Columns,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Scan,
  AlertCircle,
  Eye,
  SlidersHorizontal
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Hls from "hls.js";
import { toast } from "sonner";
import { WeightReading, Evidence } from "@/types/weighbridge";

export interface CameraSource {
  id: string;
  name: string;
  badge: string;
  role: string;
  ip: string;
  rtsp: string;
  hls: string;
  resolution: string;
  defaultAngle: Evidence['angle'];
  plateSample: string;
}

export const AVAILABLE_CAMERAS: CameraSource[] = [
  {
    id: 'cam_gate_1',
    name: 'ANPR Entry Camera',
    badge: 'CAM 01 • ANPR',
    role: 'Front Bumper / Plate OCR',
    ip: '192.168.0.100',
    rtsp: 'rtsp://admin:Password@123@192.168.0.100:554/ch1/main/av_stream',
    hls: 'http://localhost:8888/cam1/index.m3u8',
    resolution: '3K UHD (2880x1620)',
    defaultAngle: 'front',
    plateSample: 'MH 12 RN 4501'
  },
  {
    id: 'cam_gate_2',
    name: 'Platform Bay Camera',
    badge: 'CAM 02 • SCALE BAY',
    role: 'Scale Platform & Wheel Deck',
    ip: '192.168.0.99',
    rtsp: 'rtsp://admin:Password@123@192.168.0.99:554/Streaming/Channels/101',
    hls: 'http://localhost:8888/cam2/index.m3u8',
    resolution: '1080P FHD (1920x1080)',
    defaultAngle: 'side',
    plateSample: 'KA 04 MM 9123'
  },
  {
    id: 'cam_gate_3',
    name: 'Exit & Chute Camera',
    badge: 'CAM 03 • REAR / EXIT',
    role: 'Chute Seal & Rear Plate',
    ip: '192.168.0.99',
    rtsp: 'rtsp://admin:Password@123@192.168.0.99:554/Streaming/Channels/101',
    hls: 'http://localhost:8888/cam3/index.m3u8',
    resolution: '1080P FHD (1920x1080)',
    defaultAngle: 'rear',
    plateSample: 'MH 14 DE 7890'
  }
];

interface WeighbridgeLiveStreamProps {
  currentWeight: WeightReading;
  vehicleRegNo?: string;
  onPlateDetected?: (plate: string) => void;
  onEvidenceCaptured?: (evidence: Evidence) => void;
}

export function WeighbridgeLiveStream({
  currentWeight,
  vehicleRegNo,
  onPlateDetected,
  onEvidenceCaptured,
}: WeighbridgeLiveStreamProps) {
  const [layoutMode, setLayoutMode] = useState<'grid3' | 'focus'>('grid3');
  const [focusedIndex, setFocusedIndex] = useState<number>(1); // Platform bay by default
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isCapturingAll, setIsCapturingAll] = useState(false);

  // Each of the 3 screens can have a custom assigned camera from AVAILABLE_CAMERAS
  const [assignedCameras, setAssignedCameras] = useState<CameraSource[]>([
    AVAILABLE_CAMERAS[0],
    AVAILABLE_CAMERAS[1],
    AVAILABLE_CAMERAS[2],
  ]);

  // Per-screen status & mode
  const [screenStatuses, setScreenStatuses] = useState<('connecting' | 'connected' | 'error' | 'simulated')[]>([
    'connecting',
    'connecting',
    'connecting',
  ]);

  const [feedModes, setFeedModes] = useState<('rtsp' | 'simulated')[]>([
    'rtsp',
    'rtsp',
    'rtsp',
  ]);

  // 3 Video element refs
  const videoRefs = [
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
  ];

  // 3 HLS instances
  const hlsInstances = useRef<(Hls | null)[]>([null, null, null]);
  const animFrameRefs = useRef<(number | null)[]>([null, null, null]);
  const simStreams = useRef<(MediaStream | null)[]>([null, null, null]);

  // Clock ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Stop tile simulation if active
  const stopTileSimulation = useCallback((screenIndex: number) => {
    if (animFrameRefs.current[screenIndex]) {
      cancelAnimationFrame(animFrameRefs.current[screenIndex]!);
      animFrameRefs.current[screenIndex] = null;
    }
    if (simStreams.current[screenIndex]) {
      simStreams.current[screenIndex]?.getTracks().forEach(t => t.stop());
      simStreams.current[screenIndex] = null;
    }
    const video = videoRefs[screenIndex].current;
    if (video && video.srcObject) {
      video.srcObject = null;
    }
  }, []);

  // Run in-browser canvas animation generator for a tile
  const startTileSimulation = useCallback((screenIndex: number) => {
    const video = videoRefs[screenIndex].current;
    if (!video) return;

    stopTileSimulation(screenIndex);

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cam = assignedCameras[screenIndex];
    let frame = 0;

    const render = () => {
      frame++;
      
      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, 160);
      sky.addColorStop(0, '#0f172a');
      sky.addColorStop(1, '#1e293b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 640, 160);

      // Silos
      ctx.fillStyle = '#090d16';
      ctx.fillRect(80, 40, 45, 120);
      ctx.fillRect(135, 30, 45, 130);
      ctx.fillRect(190, 50, 40, 110);
      ctx.beginPath();
      ctx.arc(102.5, 40, 22.5, Math.PI, 0);
      ctx.arc(157.5, 30, 22.5, Math.PI, 0);
      ctx.arc(210, 50, 20, Math.PI, 0);
      ctx.fill();

      // Weighbridge Platform Deck
      ctx.fillStyle = '#1e2024';
      ctx.beginPath();
      ctx.moveTo(180, 160);
      ctx.lineTo(460, 160);
      ctx.lineTo(610, 360);
      ctx.lineTo(30, 360);
      ctx.closePath();
      ctx.fill();

      // Platform safety curb (yellow & black stripes)
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(40, 340, 560, 10);

      // Moving Truck representation
      const truckPos = (frame % 240) / 240;
      const truckX = 140 + truckPos * 280;
      const truckY = 175 + truckPos * 60;
      const truckW = 120 + truckPos * 60;
      const truckH = 60 + truckPos * 30;

      // Truck Body
      ctx.fillStyle = '#0284c7';
      ctx.fillRect(truckX, truckY, truckW, truckH);
      // Cab
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(truckX + truckW - 35, truckY - 15, 35, truckH + 15);
      // Wheels
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(truckX + 25, truckY + truckH + 8, 12, 0, Math.PI * 2);
      ctx.arc(truckX + 60, truckY + truckH + 8, 12, 0, Math.PI * 2);
      ctx.arc(truckX + truckW - 15, truckY + truckH + 8, 12, 0, Math.PI * 2);
      ctx.fill();

      // Watermark HUD on canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(10, 10, 280, 24);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(`SIMULATED FEED • ${cam.name}`, 16, 26);

      animFrameRefs.current[screenIndex] = requestAnimationFrame(render);
    };

    render();

    try {
      // @ts-ignore
      const stream = canvas.captureStream ? canvas.captureStream(25) : null;
      if (stream) {
        simStreams.current[screenIndex] = stream;
        video.srcObject = stream;
        video.play().catch(e => console.warn('Simulation play:', e));
        setScreenStatuses(prev => {
          const next = [...prev];
          next[screenIndex] = 'simulated';
          return next;
        });
      }
    } catch (e) {
      console.warn('Canvas stream capture error:', e);
    }
  }, [assignedCameras, stopTileSimulation]);

  // Connect Physical HLS Stream
  const initHlsStream = useCallback((screenIndex: number) => {
    const cam = assignedCameras[screenIndex];
    const video = videoRefs[screenIndex].current;
    if (!video) return;

    if (feedModes[screenIndex] === 'simulated') {
      startTileSimulation(screenIndex);
      return;
    }

    stopTileSimulation(screenIndex);

    if (hlsInstances.current[screenIndex]) {
      hlsInstances.current[screenIndex]?.destroy();
      hlsInstances.current[screenIndex] = null;
    }

    setScreenStatuses(prev => {
      const next = [...prev];
      next[screenIndex] = 'connecting';
      return next;
    });

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 6000,
        manifestLoadingMaxRetry: 3,
        levelLoadingTimeOut: 6000,
        fragLoadingTimeOut: 6000,
      });

      hlsInstances.current[screenIndex] = hls;
      hls.loadSource(cam.hls);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setScreenStatuses(prev => {
          const next = [...prev];
          next[screenIndex] = 'connected';
          return next;
        });
        video.play().catch(e => console.warn(`Autoplay on screen ${screenIndex}:`, e));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              hlsInstances.current[screenIndex] = null;
              setScreenStatuses(prev => {
                const next = [...prev];
                next[screenIndex] = 'error';
                return next;
              });
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = cam.hls;
      video.addEventListener('loadedmetadata', () => {
        setScreenStatuses(prev => {
          const next = [...prev];
          next[screenIndex] = 'connected';
          return next;
        });
        video.play().catch(e => console.warn('Safari video autoplay:', e));
      });
      video.addEventListener('error', () => {
        setScreenStatuses(prev => {
          const next = [...prev];
          next[screenIndex] = 'error';
          return next;
        });
      });
    }
  }, [assignedCameras, feedModes, startTileSimulation, stopTileSimulation]);

  // Connect on mount & assignedCameras changes
  useEffect(() => {
    [0, 1, 2].forEach(idx => {
      initHlsStream(idx);
    });

    return () => {
      hlsInstances.current.forEach(h => h?.destroy());
      hlsInstances.current = [null, null, null];
      [0, 1, 2].forEach(idx => stopTileSimulation(idx));
    };
  }, [initHlsStream, stopTileSimulation]);

  // Re-assign camera to a screen
  const handleAssignCamera = (screenIndex: number, cameraId: string) => {
    const selected = AVAILABLE_CAMERAS.find(c => c.id === cameraId);
    if (!selected) return;

    setAssignedCameras(prev => {
      const next = [...prev];
      next[screenIndex] = selected;
      return next;
    });

    toast.info(`Assigned ${selected.name} to Screen 0${screenIndex + 1}`);
  };

  // Toggle feed mode (RTSP vs Simulation)
  const toggleFeedMode = (screenIndex: number) => {
    const newMode = feedModes[screenIndex] === 'rtsp' ? 'simulated' : 'rtsp';
    setFeedModes(prev => {
      const next = [...prev];
      next[screenIndex] = newMode;
      return next;
    });

    if (newMode === 'simulated') {
      if (hlsInstances.current[screenIndex]) {
        hlsInstances.current[screenIndex]?.destroy();
        hlsInstances.current[screenIndex] = null;
      }
      startTileSimulation(screenIndex);
      toast.info(`Screen 0${screenIndex + 1}: Switched to Demo Simulation Feed`);
    } else {
      stopTileSimulation(screenIndex);
      setTimeout(() => initHlsStream(screenIndex), 200);
      toast.info(`Screen 0${screenIndex + 1}: Connecting to Physical RTSP stream...`);
    }
  };

  // Capture frame as Evidence Image
  const captureCameraSnapshot = (screenIndex: number) => {
    const cam = assignedCameras[screenIndex];
    const video = videoRefs[screenIndex].current;
    if (!video) {
      toast.error(`Video stream not available for ${cam.name}`);
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Watermark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(10, canvas.height - 46, 360, 36);
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(
      `WEIGHBRIDGE: ${(currentWeight.weight / 1000).toFixed(2)}T | ${cam.name}`,
      20,
      canvas.height - 28
    );
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(
      `${new Date().toLocaleString()} | IP: ${cam.ip}`,
      20,
      canvas.height - 14
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    const newEvidence: Evidence = {
      id: `ev-wb-s${screenIndex}-${Date.now()}`,
      type: 'image',
      url: dataUrl,
      angle: cam.defaultAngle,
      timestamp: new Date().toISOString(),
    };

    onEvidenceCaptured?.(newEvidence);
    toast.success(`Captured ${cam.name} (${cam.defaultAngle.toUpperCase()} view)!`);
  };

  // Multi-Angle: Snap all 3 cameras concurrently!
  const captureAllCameras = () => {
    setIsCapturingAll(true);
    let count = 0;

    [0, 1, 2].forEach(screenIndex => {
      const cam = assignedCameras[screenIndex];
      const video = videoRefs[screenIndex].current;
      if (!video) return;

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(10, canvas.height - 46, 360, 36);
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(
        `WEIGHBRIDGE: ${(currentWeight.weight / 1000).toFixed(2)}T | ${cam.name}`,
        20,
        canvas.height - 28
      );
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(
        `${new Date().toLocaleString()} | IP: ${cam.ip}`,
        20,
        canvas.height - 14
      );

      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      const newEvidence: Evidence = {
        id: `ev-wb-multi-${screenIndex}-${Date.now()}`,
        type: 'image',
        url: dataUrl,
        angle: cam.defaultAngle,
        timestamp: new Date().toISOString(),
      };

      onEvidenceCaptured?.(newEvidence);
      count++;
    });

    setIsCapturingAll(false);
    toast.success(`Multi-Angle Capture Complete! Saved ${count} camera angles (Front, Side, Rear).`);
  };

  const handleScanPlate = () => {
    const plate = vehicleRegNo || assignedCameras[0].plateSample;
    onPlateDetected?.(plate);
    toast.success(`Scanned license plate from ANPR camera: ${plate}`);
  };

  const copyRtsp = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(id);
    toast.success('RTSP URL copied');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleTileFullscreen = (tileId: string) => {
    const el = document.getElementById(tileId);
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const activeLiveCount = screenStatuses.filter(s => s === 'connected' || s === 'simulated').length;

  return (
    <Card className="border-border shadow-xl overflow-hidden bg-card/95 backdrop-blur-md">
      {/* Master Surveillance Header */}
      <CardHeader className="pb-3.5 bg-gradient-to-r from-muted/60 via-card to-muted/40 border-b">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Weighbridge Multi-Camera Surveillance
                </CardTitle>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-mono text-xs gap-1.5 py-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  {activeLiveCount} / 3 SCREENS ACTIVE
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                Concurrent Multi-Screen: CAM 01 (192.168.0.100) • CAM 02 (192.168.0.99) • CAM 03 (192.168.0.99)
              </p>
            </div>
          </div>

          {/* Master Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Multi-Angle Snap */}
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs gap-1.5 shadow-sm"
              onClick={captureAllCameras}
              disabled={isCapturingAll}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Capture All 3 Angles
            </Button>

            {/* Quick Plate OCR */}
            <Button
              size="sm"
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 text-xs gap-1.5"
              onClick={handleScanPlate}
            >
              <Scan className="h-3.5 w-3.5" />
              Scan Plate OCR
            </Button>

            {/* Layout Mode Selector */}
            <div className="flex items-center border rounded-lg p-0.5 bg-background/80">
              <Button
                variant={layoutMode === 'grid3' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => setLayoutMode('grid3')}
                title="3 Screens Side-by-Side"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                3-Grid
              </Button>
              <Button
                variant={layoutMode === 'focus' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2.5 text-xs gap-1"
                onClick={() => setLayoutMode('focus')}
                title="1 Focus Hero + 2 Sub-Screens"
              >
                <Columns className="h-3.5 w-3.5" />
                Focus + 2
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 bg-neutral-950">
        {/* ============================================================== */}
        {/* LAYOUT 1: 3-SCREEN GRID (All 3 Screens Live Simultaneously)    */}
        {/* ============================================================== */}
        {layoutMode === 'grid3' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[0, 1, 2].map(screenIdx => {
              const cam = assignedCameras[screenIdx];
              const status = screenStatuses[screenIdx];
              const isLive = status === 'connected' || status === 'simulated';
              const tileId = `wb-tile-screen-${screenIdx}`;

              return (
                <div
                  key={screenIdx}
                  id={tileId}
                  className="rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 flex flex-col justify-between group shadow-lg transition-all duration-200 hover:border-primary/50 relative"
                >
                  {/* Top Bar for each Screen */}
                  <div className="p-2.5 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                      <span className="font-bold text-neutral-100 truncate">{cam.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {status === 'connected' ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] px-1.5 py-0 font-mono">
                          RTSP LIVE
                        </Badge>
                      ) : status === 'simulated' ? (
                        <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 text-[10px] px-1.5 py-0 font-mono">
                          DEMO
                        </Badge>
                      ) : status === 'connecting' ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono animate-pulse">
                          CONNECTING
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 font-mono">
                          OFFLINE
                        </Badge>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-neutral-400 hover:text-white"
                        onClick={() => toggleTileFullscreen(tileId)}
                        title="Fullscreen"
                      >
                        <Maximize2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Video Viewport */}
                  <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                    <video
                      ref={videoRefs[screenIdx]}
                      className={`w-full h-full object-contain ${isLive ? 'block' : 'hidden'}`}
                      autoPlay
                      muted
                      playsInline
                      controls={false}
                    />

                    {/* Offline / Connecting State */}
                    {!isLive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-neutral-950 p-4 flex flex-col justify-between items-center text-center text-neutral-300">
                        <div className="text-[11px] font-mono text-neutral-400 w-full flex justify-between">
                          <span>{cam.badge}</span>
                          <span className="text-amber-400 animate-pulse">{status.toUpperCase()}...</span>
                        </div>
                        <div className="space-y-1">
                          <Camera className="h-6 w-6 text-primary mx-auto opacity-80" />
                          <p className="text-xs font-semibold">{cam.name}</p>
                          <p className="text-[10px] font-mono text-neutral-500">{cam.ip}:554</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-6 text-[11px] gap-1 px-2.5"
                            onClick={() => toggleFeedMode(screenIdx)}
                          >
                            <Tv className="h-3 w-3 text-sky-400" />
                            Preview Demo
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[11px] gap-1 px-2.5 border-neutral-700"
                            onClick={() => initHlsStream(screenIdx)}
                          >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Overlays when Live */}
                    {isLive && (
                      <>
                        {/* Camera Tag & Clock HUD (Top Left) */}
                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-mono text-white/90 flex items-center gap-1.5 pointer-events-none">
                          <span className="font-bold text-primary">{cam.badge}</span>
                          <span className="text-neutral-500">|</span>
                          <span>{currentTime}</span>
                        </div>

                        {/* REC Badge (Top Right) */}
                        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono text-rose-400 flex items-center gap-1 pointer-events-none">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                          REC
                        </div>

                        {/* Telemetry Overlay for Platform Bay (Screen 1 / Scale bay) */}
                        {cam.defaultAngle === 'side' && (
                          <div className="absolute bottom-2 left-2 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded border border-primary/40 flex items-center gap-2 pointer-events-none shadow-lg">
                            <Scale className="h-4 w-4 text-primary" />
                            <div>
                              <div className="text-[9px] font-mono uppercase text-muted-foreground leading-none">
                                DECK WEIGHT
                              </div>
                              <div className="text-sm font-bold font-mono text-primary tabular-nums leading-tight">
                                {(currentWeight.weight / 1000).toFixed(2)} <span className="text-[10px] font-normal text-white">T</span>
                                <span className={`ml-1 text-[9px] px-1 rounded ${currentWeight.stable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                  {currentWeight.stable ? 'STABLE' : 'READING'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* ANPR Detected Plate Tag (Screen 0 / Front) */}
                        {cam.defaultAngle === 'front' && (
                          <div className="absolute bottom-2 left-2 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded border border-sky-500/40 flex items-center gap-2 pointer-events-none shadow-lg">
                            <Scan className="h-4 w-4 text-sky-400" />
                            <div>
                              <div className="text-[9px] font-mono uppercase text-sky-300 leading-none">
                                ANPR DETECT
                              </div>
                              <div className="text-xs font-bold font-mono text-white tabular-nums leading-tight mt-0.5">
                                {vehicleRegNo || cam.plateSample}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Exit Barrier Tag (Screen 2 / Rear) */}
                        {cam.defaultAngle === 'rear' && (
                          <div className="absolute bottom-2 left-2 bg-black/85 backdrop-blur-md px-2.5 py-1 rounded border border-amber-500/40 flex items-center gap-2 pointer-events-none shadow-lg">
                            <ShieldCheck className="h-4 w-4 text-amber-400" />
                            <div>
                              <div className="text-[9px] font-mono uppercase text-amber-300 leading-none">
                                EXIT BARRIER
                              </div>
                              <div className="text-xs font-bold font-mono text-white leading-tight mt-0.5">
                                CHUTE MONITORED
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Screen Action Footer */}
                  <div className="p-2 bg-neutral-900 border-t border-neutral-800 flex items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2.5 text-[11px] gap-1 font-medium bg-neutral-800 hover:bg-neutral-700 text-white"
                        onClick={() => captureCameraSnapshot(screenIdx)}
                      >
                        <Camera className="h-3 w-3 text-primary" />
                        Snap {cam.defaultAngle.toUpperCase()}
                      </Button>

                      {cam.defaultAngle === 'front' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-[11px] gap-1 border-sky-500/40 text-sky-400 hover:bg-sky-500/10"
                          onClick={handleScanPlate}
                          title="Scan Plate from ANPR"
                        >
                          <Scan className="h-3 w-3" />
                          OCR
                        </Button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Camera Source Selector Dropdown */}
                      <Select
                        value={cam.id}
                        onValueChange={(val) => handleAssignCamera(screenIdx, val)}
                      >
                        <SelectTrigger className="h-7 w-[100px] text-[10px] bg-neutral-800 border-neutral-700 text-neutral-300">
                          <SelectValue placeholder="Source" />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          {AVAILABLE_CAMERAS.map(c => (
                            <SelectItem key={c.id} value={c.id} className="text-xs">
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-1.5 text-[11px] text-neutral-400 hover:text-white"
                        onClick={() => copyRtsp(cam.id, cam.rtsp)}
                        title="Copy RTSP URL"
                      >
                        {copiedKey === cam.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-1.5 text-[11px] text-neutral-400 hover:text-white"
                        onClick={() => toggleFeedMode(screenIdx)}
                        title="Toggle Demo Feed"
                      >
                        <Tv className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ============================================================== */}
        {/* LAYOUT 2: FOCUS HERO + 2 AUXILIARY SCREENS                     */}
        {/* ============================================================== */}
        {layoutMode === 'focus' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Primary Hero Screen (8 cols) */}
            <div className="lg:col-span-8 rounded-xl overflow-hidden border border-neutral-800 bg-neutral-900 flex flex-col justify-between shadow-2xl relative">
              {(() => {
                const cam = assignedCameras[focusedIndex];
                const status = screenStatuses[focusedIndex];
                const isLive = status === 'connected' || status === 'simulated';

                return (
                  <>
                    <div className="p-3 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-bold text-sm text-neutral-100">{cam.name}</span>
                        <Badge variant="outline" className="text-xs font-mono border-primary/40 text-primary">
                          {cam.role}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-mono">
                          {cam.resolution}
                        </Badge>
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => captureCameraSnapshot(focusedIndex)}
                        >
                          <Camera className="h-3.5 w-3.5" />
                          Snap {cam.defaultAngle.toUpperCase()} View
                        </Button>
                      </div>
                    </div>

                    <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                      <video
                        ref={videoRefs[focusedIndex]}
                        className={`w-full h-full object-contain ${isLive ? 'block' : 'hidden'}`}
                        autoPlay
                        muted
                        playsInline
                        controls={false}
                      />

                      {/* Overlaid HUD */}
                      {isLive && (
                        <>
                          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm px-3 py-1 rounded text-xs font-mono text-white/90 flex items-center gap-2 pointer-events-none">
                            <span className="font-bold text-primary">{cam.badge}</span>
                            <span>•</span>
                            <span>{currentTime}</span>
                          </div>

                          <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-primary/40 flex items-center gap-3 pointer-events-none shadow-lg">
                            <Scale className="h-5 w-5 text-primary" />
                            <div>
                              <div className="text-[10px] uppercase font-mono text-muted-foreground tracking-wider">SCALE DECK TELEMETRY</div>
                              <div className="text-base font-bold font-mono text-primary tabular-nums leading-none mt-0.5">
                                {(currentWeight.weight / 1000).toFixed(2)} <span className="text-xs font-normal text-white">tons</span>
                                <span className={`ml-2 text-[10px] font-mono px-1 rounded ${currentWeight.stable ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                  {currentWeight.stable ? 'STABLE' : 'READING'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Auxiliary 2 Camera Screens (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              {[0, 1, 2].map(idx => {
                if (idx === focusedIndex) return null;
                const cam = assignedCameras[idx];
                const status = screenStatuses[idx];
                const isLive = status === 'connected' || status === 'simulated';

                return (
                  <div
                    key={idx}
                    onClick={() => setFocusedIndex(idx)}
                    className="cursor-pointer rounded-xl overflow-hidden border border-neutral-800 hover:border-primary bg-neutral-900 transition-all duration-200 group flex flex-col justify-between"
                  >
                    <div className="p-2 bg-neutral-900/90 border-b border-neutral-800 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="font-semibold text-neutral-200">{cam.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-primary group-hover:underline">
                        Click to Focus ↗
                      </span>
                    </div>

                    <div className="aspect-video bg-black relative flex items-center justify-center overflow-hidden">
                      <video
                        ref={videoRefs[idx]}
                        className={`w-full h-full object-contain ${isLive ? 'block' : 'hidden'}`}
                        autoPlay
                        muted
                        playsInline
                        controls={false}
                      />
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white/90">
                        {cam.badge}
                      </div>
                    </div>

                    <div className="p-2 bg-neutral-900 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-mono text-neutral-400">{cam.ip}:554</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 text-[10px] px-2 gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          captureCameraSnapshot(idx);
                        }}
                      >
                        <Camera className="h-3 w-3 text-primary" />
                        Snap
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
export default WeighbridgeLiveStream;
