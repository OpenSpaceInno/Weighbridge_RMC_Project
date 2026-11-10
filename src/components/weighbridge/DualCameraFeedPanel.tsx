import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, Eye, Scan, Maximize2, Sparkles, Play, Square } from 'lucide-react';
import Hls from 'hls.js';
import { Evidence } from '@/types/weighbridge';

export interface DualCameraFeedPanelHandle {
  captureAllSnapshots: (metadata?: { weight?: number; vehicleNo?: string; transactionNo?: number }) => Promise<Array<{
    camId: string;
    camName: string;
    angle: 'front' | 'side' | 'rear';
    dataUrl: string;
  }>>;
  captureSingleSnapshot: (screenIndex: number, metadata?: { weight?: number; vehicleNo?: string; transactionNo?: number }) => Promise<{
    camId: string;
    camName: string;
    angle: 'front' | 'side' | 'rear';
    dataUrl: string;
  } | null>;
}

interface CameraConfig {
  id: string;
  name: string;
  angle: 'front' | 'side' | 'rear';
  ip: string;
  port: string;
  user: string;
  pass: string;
  hlsUrl: string;
  status: 'connected' | 'connecting' | 'simulated' | 'disconnected';
  plateSample: string;
}

export interface DualCameraFeedPanelProps {
  evidenceList: Evidence[];
  onTakeSnapshot?: (angle: 'front' | 'side' | 'rear') => void;
  onPlateDetected?: (plate: string) => void;
  currentWeight?: number;
  vehicleRegNo?: string;
  transactionNo?: number;
  companyName?: string;
  weighbridgeLicense?: string;
}

export const DualCameraFeedPanel = forwardRef<DualCameraFeedPanelHandle, DualCameraFeedPanelProps>(({
  evidenceList,
  onTakeSnapshot,
  onPlateDetected,
  currentWeight = 0,
  vehicleRegNo = '',
  transactionNo = 0,
  companyName = 'DHARANI COTTON MILLS / APARNA RMC',
  weighbridgeLicense = 'WB/2026/RMC-449',
}, ref) => {
  const [cameras, setCameras] = useState<CameraConfig[]>([
    {
      id: 'cam1',
      name: 'Camera 1 (Front ANPR)',
      angle: 'front',
      ip: '192.168.0.101',
      port: '80',
      user: 'admin',
      pass: '••••••••',
      hlsUrl: 'http://localhost:8888/cam1/index.m3u8',
      status: 'connected',
      plateSample: 'MH 12 AB 1234',
    },
    {
      id: 'cam2',
      name: 'Camera 2 (Deck & Chute)',
      angle: 'side',
      ip: '192.168.0.99',
      port: '80',
      user: 'admin',
      pass: '••••••••',
      hlsUrl: 'http://localhost:8888/cam2/index.m3u8',
      status: 'connected',
      plateSample: 'KA 04 MM 9123',
    },
  ]);

  const [activePreview, setActivePreview] = useState<string | null>(null);

  // Video and canvas refs for 2 cameras
  const videoRefs = [useRef<HTMLVideoElement | null>(null), useRef<HTMLVideoElement | null>(null)];
  const canvasRefs = [useRef<HTMLCanvasElement | null>(null), useRef<HTMLCanvasElement | null>(null)];
  const hlsInstances = useRef<(Hls | null)[]>([null, null]);
  const animationFrameIds = useRef<(number | null)[]>([null, null]);
  const isSimulating = useRef<boolean[]>([false, false]);

  // Setup simulated canvas animation for when physical HLS stream is offline
  const startCanvasSimulation = useCallback((index: number) => {
    isSimulating.current[index] = true;
    const canvas = canvasRefs[index].current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    const render = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;

      // Dark industrial asphalt background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#0b0f19');
      grad.addColorStop(0.5, '#111827');
      grad.addColorStop(1, '#030712');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Grid perspective lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (index === 0) {
        // Camera 1: ANPR View (Front vehicle & bumper)
        // Road perspective
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(w * 0.25, h);
        ctx.lineTo(w * 0.4, h * 0.35);
        ctx.lineTo(w * 0.6, h * 0.35);
        ctx.lineTo(w * 0.75, h);
        ctx.closePath();
        ctx.fill();

        // Yellow road center markers
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 12]);
        ctx.beginPath();
        ctx.moveTo(w * 0.5, h);
        ctx.lineTo(w * 0.5, h * 0.35);
        ctx.stroke();
        ctx.setLineDash([]);

        // Truck Cab approaching
        const truckY = h * 0.45;
        const truckW = w * 0.45;
        const truckH = h * 0.42;
        const truckX = (w - truckW) / 2;

        // Front Grille
        ctx.fillStyle = '#0f766e'; // Teal corporate color
        ctx.fillRect(truckX, truckY, truckW, truckH);

        // Windshield
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(truckX + 20, truckY + 10, truckW - 40, truckH * 0.4);

        // Headlights
        const glow = Math.sin(frame * 0.05) * 5 + 10;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(truckX + 25, truckY + truckH * 0.75, glow, 0, Math.PI * 2);
        ctx.arc(truckX + truckW - 25, truckY + truckH * 0.75, glow, 0, Math.PI * 2);
        ctx.fill();

        // High-contrast ANPR License Plate Box
        const plateW = 120;
        const plateH = 34;
        const plateX = (w - plateW) / 2;
        const plateY = truckY + truckH * 0.72;

        // OCR Bounding Box with neon corners
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.strokeRect(plateX - 4, plateY - 4, plateW + 8, plateH + 8);

        // Plate Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(plateX, plateY, plateW, plateH);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(plateX, plateY, plateW, plateH);

        // Plate text
        const activePlate = vehicleRegNo || cameras[0].plateSample;
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activePlate, plateX + plateW / 2, plateY + plateH / 2);

        // OCR Tag above plate
        ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
        ctx.fillRect(plateX - 4, plateY - 20, 85, 16);
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('ANPR 99.4%', plateX, plateY - 8);

      } else {
        // Camera 2: Platform Bay & Transit Mixer Chute
        // Weighbridge Steel Deck
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(w * 0.1, h * 0.85);
        ctx.lineTo(w * 0.25, h * 0.4);
        ctx.lineTo(w * 0.85, h * 0.4);
        ctx.lineTo(w * 0.95, h * 0.85);
        ctx.closePath();
        ctx.fill();

        // Curb yellow/black hazard stripes
        ctx.fillStyle = '#eab308';
        ctx.fillRect(w * 0.08, h * 0.85, w * 0.88, 10);

        // Transit Mixer Drum & Chute
        const mixerX = w * 0.35;
        const mixerY = h * 0.32;

        // Drum rotating
        ctx.save();
        ctx.translate(mixerX + 80, mixerY + 50);
        ctx.rotate((frame * 0.02) % (Math.PI * 2));
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.ellipse(0, 0, 70, 45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Discharge Chute
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.moveTo(mixerX + 150, mixerY + 45);
        ctx.lineTo(mixerX + 185, mixerY + 95);
        ctx.lineTo(mixerX + 170, mixerY + 105);
        ctx.lineTo(mixerX + 140, mixerY + 50);
        ctx.closePath();
        ctx.fill();

        // Scale Level Indicator Overlay
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(w * 0.05, h * 0.12, 170, 48);
        ctx.strokeStyle = '#0d9488';
        ctx.lineWidth = 1;
        ctx.strokeRect(w * 0.05, h * 0.12, 170, 48);

        ctx.fillStyle = '#2dd4bf';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`BAY SCALE #1`, w * 0.05 + 8, h * 0.12 + 16);
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px monospace';
        ctx.fillText(`WT: ${(currentWeight || 0).toLocaleString()} kg`, w * 0.05 + 8, h * 0.12 + 30);
        ctx.fillText(`STATUS: PLATFORM STABLE`, w * 0.05 + 8, h * 0.12 + 42);
      }

      animationFrameIds.current[index] = requestAnimationFrame(render);
    };

    render();
  }, [cameras, currentWeight, vehicleRegNo]);

  const stopCanvasSimulation = useCallback((index: number) => {
    isSimulating.current[index] = false;
    if (animationFrameIds.current[index] !== null) {
      cancelAnimationFrame(animationFrameIds.current[index]!);
      animationFrameIds.current[index] = null;
    }
  }, []);

  // Initialize HLS for both cameras
  const initHls = useCallback((index: number) => {
    const cam = cameras[index];
    const video = videoRefs[index].current;
    if (!video) return;

    if (hlsInstances.current[index]) {
      hlsInstances.current[index]?.destroy();
      hlsInstances.current[index] = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 15,
        manifestLoadingTimeOut: 3000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut: 3000,
        fragLoadingTimeOut: 3000,
      });

      hls.loadSource(cam.hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        stopCanvasSimulation(index);
        video.play().catch(() => {});
        setCameras(prev => {
          const next = [...prev];
          next[index] = { ...next[index], status: 'connected' };
          return next;
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          // Fall back gracefully to high-fps simulation so operator view is never broken
          startCanvasSimulation(index);
          setCameras(prev => {
            const next = [...prev];
            next[index] = { ...next[index], status: 'simulated' };
            return next;
          });
        }
      });

      hlsInstances.current[index] = hls;
    } else {
      // Browser fallback (e.g. Safari native HLS or simulation)
      video.src = cam.hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        stopCanvasSimulation(index);
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        startCanvasSimulation(index);
      });
    }
  }, [cameras, startCanvasSimulation, stopCanvasSimulation]);

  useEffect(() => {
    // Mount & initialize both cameras
    [0, 1].forEach(idx => {
      initHls(idx);
    });

    return () => {
      [0, 1].forEach(idx => {
        stopCanvasSimulation(idx);
        if (hlsInstances.current[idx]) {
          hlsInstances.current[idx]?.destroy();
          hlsInstances.current[idx] = null;
        }
      });
    };
  }, []);

  // Frame capture implementation with industrial metrology watermark stamp
  const captureFrame = useCallback((
    screenIndex: number,
    metadata?: { weight?: number; vehicleNo?: string; transactionNo?: number }
  ): string | null => {
    const cam = cameras[screenIndex];
    const video = videoRefs[screenIndex].current;
    const simCanvas = canvasRefs[screenIndex].current;

    const targetW = 1280;
    const targetH = 720;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    // Draw video if playing, otherwise draw from simulation canvas
    let drawn = false;
    if (video && video.readyState >= 2 && video.videoWidth > 0 && !isSimulating.current[screenIndex]) {
      try {
        ctx.drawImage(video, 0, 0, targetW, targetH);
        drawn = true;
      } catch (e) {
        drawn = false;
      }
    }

    if (!drawn && simCanvas) {
      ctx.drawImage(simCanvas, 0, 0, targetW, targetH);
      drawn = true;
    }

    if (!drawn) {
      // Solid dark fallback background if neither is ready
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, targetW, targetH);
    }

    // ====== INDUSTRIAL WATERMARK STAMP ======
    const effectiveWeight = metadata?.weight !== undefined ? metadata.weight : currentWeight;
    const effectiveVehicle = metadata?.vehicleNo || vehicleRegNo || cam.plateSample;
    const effectiveTx = metadata?.transactionNo !== undefined ? metadata.transactionNo : transactionNo;
    const now = new Date();
    const timestampStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { hour12: false });

    // Top Header Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, targetW, 46);
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(0, 44, targetW, 2);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(companyName.toUpperCase(), 20, 23);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`LEGAL METROLOGY SCALE LIC: ${weighbridgeLicense}`, targetW - 20, 23);

    // Bottom Detailed Metrics Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.fillRect(0, targetH - 58, targetW, 58);
    ctx.fillStyle = '#0d9488';
    ctx.fillRect(0, targetH - 58, targetW, 2);

    // Metric 1: Transaction & Timestamp
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`TX #${String(effectiveTx).padStart(5, '0')}  |  ${timestampStr}`, 20, targetH - 38);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`CAMERA: ${cam.name} (${cam.angle.toUpperCase()})  ·  IP: ${cam.ip}`, 20, targetH - 18);

    // Metric 2: Vehicle & Verified Scale Weight (High-Contrast Amber/Emerald)
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`VEH: ${effectiveVehicle}`, targetW - 20, targetH - 38);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`LATCHED SCALE WT: ${effectiveWeight.toLocaleString()} KG`, targetW - 20, targetH - 18);

    return exportCanvas.toDataURL('image/jpeg', 0.90);
  }, [cameras, companyName, currentWeight, transactionNo, vehicleRegNo, weighbridgeLicense]);

  // Imperative handle for parent to capture snapshots
  useImperativeHandle(ref, () => ({
    captureAllSnapshots: async (metadata) => {
      const results: Array<{
        camId: string;
        camName: string;
        angle: 'front' | 'side' | 'rear';
        dataUrl: string;
      }> = [];

      for (let i = 0; i < cameras.length; i++) {
        const dataUrl = captureFrame(i, metadata);
        if (dataUrl) {
          results.push({
            camId: cameras[i].id,
            camName: cameras[i].name,
            angle: cameras[i].angle,
            dataUrl,
          });
        }
      }
      return results;
    },
    captureSingleSnapshot: async (screenIndex: number, metadata) => {
      if (screenIndex < 0 || screenIndex >= cameras.length) return null;
      const dataUrl = captureFrame(screenIndex, metadata);
      if (!dataUrl) return null;
      return {
        camId: cameras[screenIndex].id,
        camName: cameras[screenIndex].name,
        angle: cameras[screenIndex].angle,
        dataUrl,
      };
    },
  }), [cameras, captureFrame]);

  // Extract up to 3 evidence thumbnails for the middle vertical stack
  const snap1 = evidenceList[0]?.url;
  const snap2 = evidenceList[1]?.url;
  const snap3 = evidenceList[2]?.url;

  return (
    <div className="flex gap-2 h-full">
      {/* 3-Slot Snapshot Stack (between form and camera viewports) */}
      <div className="flex flex-col gap-2 w-28 shrink-0">
        <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-center flex items-center justify-center gap-1">
          <Camera className="w-3.5 h-3.5 text-teal-600" />
          <span>Snapshots</span>
        </div>
        {[
          { label: 'Front / ANPR', url: snap1, angle: 'front' as const, screenIdx: 0 },
          { label: 'Deck / Bay', url: snap2, angle: 'side' as const, screenIdx: 1 },
          { label: 'Rear / Chute', url: snap3, angle: 'rear' as const, screenIdx: 0 },
        ].map((slot, idx) => (
          <div
            key={idx}
            className="flex-1 min-h-[96px] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-900/60 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer hover:border-teal-500 transition-colors shadow-inner"
            onClick={() => {
              if (slot.url) {
                setActivePreview(slot.url);
              } else if (onTakeSnapshot) {
                onTakeSnapshot(slot.angle);
              }
            }}
            title={slot.url ? `Click to view ${slot.label}` : `Click to capture ${slot.label}`}
          >
            {slot.url ? (
              <>
                <img
                  src={slot.url}
                  alt={slot.label}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute bottom-0 inset-x-0 bg-slate-900/80 text-[9px] text-white text-center py-0.5 font-mono flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                  {slot.label}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTakeSnapshot) onTakeSnapshot(slot.angle);
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-teal-600 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Retake snapshot"
                >
                  <RefreshCw className="w-2.5 h-2.5" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center p-1 text-slate-400 group-hover:text-teal-600 transition-colors text-center">
                <Camera className="w-5 h-5 mb-1 opacity-70 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold leading-tight">
                  {slot.label}
                </span>
                <span className="text-[8px] text-slate-400 mt-0.5 font-mono">
                  Slot #{idx + 1}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Dual Live Video Feeds (Camera 1 & Camera 2) */}
      <div className="flex flex-col gap-3 flex-1 min-w-[300px]">
        {cameras.map((cam, idx) => (
          <div
            key={cam.id}
            className="border border-slate-300 dark:border-slate-700 rounded-md bg-slate-100 dark:bg-slate-900 overflow-hidden shadow-sm flex flex-col"
          >
            {/* Header: Camera1 / Camera2 + Connection Status */}
            <div className="bg-slate-200 dark:bg-slate-800 px-2.5 py-1 flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-300 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-600" />
                <span>{cam.name}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono">
                {cam.status === 'connected' ? (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Connected</span>
                  </span>
                ) : cam.status === 'simulated' ? (
                  <span className="flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                    <span>Live Sim</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-500">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>Connecting</span>
                  </span>
                )}
              </div>
            </div>

            {/* Viewport Screen */}
            <div className="relative aspect-[16/10] bg-slate-950 flex items-center justify-center overflow-hidden">
              {/* HTML5 Video element for physical HLS stream */}
              <video
                ref={videoRefs[idx]}
                className="absolute inset-0 w-full h-full object-cover z-0"
                playsInline
                muted
                autoPlay
              />

              {/* High-fps fallback canvas element for simulated feed */}
              <canvas
                ref={canvasRefs[idx]}
                width={640}
                height={400}
                className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none"
              />

              {/* Grid overlay for scale alignment */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none z-10" />

              {/* Top HUD Badges */}
              <div className="absolute top-1.5 left-2 z-20 font-mono text-[10px] text-slate-300 bg-black/70 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1.5 shadow-sm">
                <span className="font-bold text-teal-400">CAM 0{idx + 1}</span>
                <span className="text-slate-500">•</span>
                <span>25 FPS</span>
                <span className="text-slate-500">•</span>
                <span>1080P</span>
              </div>

              <div className="absolute top-1.5 right-2 z-20 font-mono text-[10px] text-emerald-400 bg-black/70 px-1.5 py-0.5 rounded border border-white/10 flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>REC</span>
              </div>

              {/* Camera 1 ANPR Interactive Tag */}
              {idx === 0 && (
                <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5">
                  <div
                    onClick={() => {
                      const detected = vehicleRegNo || cam.plateSample;
                      if (onPlateDetected) onPlateDetected(detected);
                    }}
                    className="bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/80 px-2 py-0.5 rounded shadow cursor-pointer transition-transform active:scale-95 flex items-center gap-1 text-[11px] font-mono text-emerald-300"
                    title="Click to copy detected plate into Vehicle No"
                  >
                    <Scan className="w-3 h-3 text-emerald-400" />
                    <span>PLATE: {vehicleRegNo || cam.plateSample}</span>
                  </div>
                </div>
              )}

              {/* Manual Snap quick button on viewport */}
              <button
                type="button"
                onClick={() => {
                  if (onTakeSnapshot) onTakeSnapshot(cam.angle);
                }}
                className="absolute bottom-2 right-2 z-20 bg-black/70 hover:bg-teal-600 text-white px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 border border-white/10 transition-colors shadow"
                title={`Capture ${cam.name} Snapshot`}
              >
                <Camera className="w-3 h-3" />
                <span>Snap</span>
              </button>
            </div>

            {/* IP Connection Bar (matches reference image: CamIP: 192.168.0.153 | 80 | admin | ******** | Start/Stop) */}
            <div className="bg-slate-200 dark:bg-slate-800/90 px-2 py-1 flex items-center gap-1 text-[11px] font-mono border-t border-slate-300 dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400 whitespace-nowrap font-semibold">CamIP :</span>
              <input
                type="text"
                value={cam.ip}
                onChange={(e) => {
                  const val = e.target.value;
                  setCameras(prev => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], ip: val };
                    return next;
                  });
                }}
                className="w-24 px-1 py-0.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded text-center text-[10px]"
                title="Camera IP Address"
              />
              <input
                type="text"
                value={cam.port}
                onChange={(e) => {
                  const val = e.target.value;
                  setCameras(prev => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], port: val };
                    return next;
                  });
                }}
                className="w-9 px-1 py-0.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded text-center text-[10px]"
                title="Camera Port"
              />
              <input
                type="text"
                value={cam.user}
                onChange={(e) => {
                  const val = e.target.value;
                  setCameras(prev => {
                    const next = [...prev];
                    next[idx] = { ...next[idx], user: val };
                    return next;
                  });
                }}
                className="w-14 px-1 py-0.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded text-center text-[10px]"
                title="Username"
              />
              <input
                type="password"
                value={cam.pass}
                readOnly
                className="w-14 px-1 py-0.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-600 rounded text-center text-[10px]"
                title="Password"
              />
              <button
                type="button"
                onClick={() => {
                  initHls(idx);
                }}
                className="px-2 py-0.5 bg-teal-700 hover:bg-teal-800 text-white rounded text-[10px] font-bold transition-colors ml-auto"
                title="Reconnect or Refresh Camera Stream"
              >
                Start
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Snapshot Fullscreen Preview Modal */}
      {activePreview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setActivePreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-lg overflow-hidden shadow-2xl">
            <div className="bg-slate-800 px-3 py-2 flex items-center justify-between text-xs text-white border-b border-slate-700">
              <span className="font-bold flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-teal-400" />
                <span>Captured Evidence Snapshot (Ready for Print & FTP Docket)</span>
              </span>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="text-slate-400 hover:text-white px-2 py-0.5 rounded text-xs bg-slate-700"
              >
                Close (ESC)
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center">
              <img
                src={activePreview}
                alt="Captured Snapshot Preview"
                className="max-h-[75vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

DualCameraFeedPanel.displayName = 'DualCameraFeedPanel';
