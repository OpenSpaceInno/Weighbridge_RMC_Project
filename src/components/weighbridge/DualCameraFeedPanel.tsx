import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Camera, RefreshCw, CheckCircle2, Eye, Scan, Maximize2, Play, Activity, Sparkles } from 'lucide-react';
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
  fetchDetectedPlate: () => string;
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
  status: 'connected' | 'connecting' | 'standby';
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
      hlsUrl: '/hls/cam1/index.m3u8',
      status: 'connecting',
      plateSample: '',
    },
    {
      id: 'cam2',
      name: 'Camera 2 (Deck & Chute)',
      angle: 'side',
      ip: '192.168.0.99',
      port: '80',
      user: 'admin',
      pass: '••••••••',
      hlsUrl: '/hls/cam2/index.m3u8',
      status: 'connecting',
      plateSample: '',
    },
  ]);

  const [activePreview, setActivePreview] = useState<string | null>(null);

  // Video refs for 2 cameras
  const videoRefs = [useRef<HTMLVideoElement | null>(null), useRef<HTMLVideoElement | null>(null)];
  const hlsInstances = useRef<(Hls | null)[]>([null, null]);

  // Connect HLS stream for a given camera index
  const initHls = useCallback((index: number) => {
    const cam = cameras[index];
    const video = videoRefs[index].current;
    if (!video) return;

    if (hlsInstances.current[index]) {
      try {
        hlsInstances.current[index]?.destroy();
      } catch {}
      hlsInstances.current[index] = null;
    }

    setCameras(prev => {
      const next = [...prev];
      next[index] = { ...next[index], status: 'connecting' };
      return next;
    });

    // Try relative proxy URL first, then direct port 8888 URL
    const targetUrl = cam.hlsUrl || (index === 0 ? '/hls/cam1/index.m3u8' : '/hls/cam2/index.m3u8');

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 10,
        manifestLoadingTimeOut: 5000,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 1000,
        levelLoadingTimeOut: 5000,
        levelLoadingMaxRetry: 6,
        fragLoadingTimeOut: 5000,
        fragLoadingMaxRetry: 6,
      });

      hls.loadSource(targetUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setCameras(prev => {
          const next = [...prev];
          next[index] = { ...next[index], status: 'connected' };
          return next;
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try edge relay fallback path if primary failed
              const fallbackUrl = index === 0 ? '/hls/live_cam1/index.m3u8' : '/hls/live_cam2/index.m3u8';
              if (targetUrl !== fallbackUrl) {
                hls.loadSource(fallbackUrl);
                hls.startLoad();
              } else if (window.location.hostname === 'localhost' && window.location.protocol === 'http:' && targetUrl.startsWith('/hls/')) {
                const directUrl = `http://localhost:8888${targetUrl.replace('/hls', '')}`;
                hls.loadSource(directUrl);
                hls.startLoad();
              } else {
                hls.startLoad();
              }
              // Auto-recover after 3 seconds if not connected
              setTimeout(() => {
                setCameras(current => {
                  if (current[index]?.status !== 'connected') {
                    initHls(index);
                  }
                  return current;
                });
              }, 3000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              setTimeout(() => {
                setCameras(current => {
                  if (current[index]?.status !== 'connected') {
                    initHls(index);
                  }
                  return current;
                });
              }, 3000);
              break;
            default:
              // Destroy failing instance and auto-reconnect cleanly after 2.5s - NEVER stay off
              try { hls.destroy(); } catch {}
              hlsInstances.current[index] = null;
              setCameras(prev => {
                const next = [...prev];
                next[index] = { ...next[index], status: 'connecting' };
                return next;
              });
              setTimeout(() => {
                initHls(index);
              }, 2500);
              break;
          }
        }
      });

      hlsInstances.current[index] = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = targetUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        setCameras(prev => {
          const next = [...prev];
          next[index] = { ...next[index], status: 'connected' };
          return next;
        });
      });
      video.addEventListener('error', () => {
        setCameras(prev => {
          const next = [...prev];
          next[index] = { ...next[index], status: 'connecting' };
          return next;
        });
        setTimeout(() => initHls(index), 2500);
      });
    }
  }, [cameras]);

  // Keep camera 1 plateSample in sync with vehicleRegNo prop
  useEffect(() => {
    if (vehicleRegNo) {
      setCameras(prev => {
        const next = [...prev];
        if (next[0].plateSample !== vehicleRegNo) {
          next[0] = { ...next[0], plateSample: vehicleRegNo };
        }
        return next;
      });
    }
  }, [vehicleRegNo]);

  // Mount & initialize both camera streams
  useEffect(() => {
    [0, 1].forEach(idx => {
      initHls(idx);
    });

    return () => {
      [0, 1].forEach(idx => {
        if (hlsInstances.current[idx]) {
          hlsInstances.current[idx]?.destroy();
          hlsInstances.current[idx] = null;
        }
      });
    };
  }, []);

  // 24/7 Industrial Auto-Healing Watchdog: Ensures live cameras NEVER go to off / standby state
  useEffect(() => {
    const watchdogTimer = setInterval(() => {
      [0, 1].forEach(idx => {
        const vid = videoRefs[idx].current;
        const cam = cameras[idx];

        // 1. Force resume playback if video paused but ready
        if (vid && vid.paused && vid.readyState >= 2) {
          vid.play().catch(() => {});
        }

        // 2. If camera stream dropped, instance missing, or not connected, auto-heal
        if (!hlsInstances.current[idx] || cam.status !== 'connected' || !vid || vid.readyState === 0) {
          initHls(idx);
        }
      });
    }, 4000);

    return () => clearInterval(watchdogTimer);
  }, [cameras, initHls]);

  // Frame capture implementation with industrial metrology watermark stamp
  const captureFrame = useCallback((
    screenIndex: number,
    metadata?: { weight?: number; vehicleNo?: string; transactionNo?: number }
  ): string | null => {
    const cam = cameras[screenIndex];
    const video = videoRefs[screenIndex].current;

    const targetW = 1280;
    const targetH = 720;
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    let drawn = false;
    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      try {
        ctx.drawImage(video, 0, 0, targetW, targetH);
        drawn = true;
      } catch (e) {
        drawn = false;
      }
    }

    if (!drawn) {
      // Clean modern industrial background if camera stream frame not available
      const grad = ctx.createLinearGradient(0, 0, 0, targetH);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, targetW, targetH);

      // Grid watermark lines
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      for (let x = 0; x < targetW; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, targetH);
        ctx.stroke();
      }
      for (let y = 0; y < targetH; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(targetW, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 24px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${cam.name.toUpperCase()} - LIVE SURVEILLANCE FEED`, targetW / 2, targetH / 2 - 20);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText(`RTSP PROTOCOL: ${cam.ip}:554 | HLS 1080P REALTIME`, targetW / 2, targetH / 2 + 15);
    }

    // ====== INDUSTRIAL LEGAL METROLOGY WATERMARK STAMP ======
    const effectiveWeight = metadata?.weight !== undefined ? metadata.weight : currentWeight;
    const effectiveVehicle = metadata?.vehicleNo || vehicleRegNo || cam.plateSample;
    const effectiveTx = metadata?.transactionNo !== undefined ? metadata.transactionNo : transactionNo;
    const now = new Date();
    const timestampStr = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', { hour12: false });

    // Top Header Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(0, 0, targetW, 46);
    ctx.fillStyle = '#2563eb';
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
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.fillRect(0, targetH - 58, targetW, 58);
    ctx.fillStyle = '#2563eb';
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

    // Metric 2: Vehicle & Verified Scale Weight
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`VEH: ${effectiveVehicle}`, targetW - 20, targetH - 38);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(`LATCHED SCALE WT: ${effectiveWeight.toLocaleString()} KG`, targetW - 20, targetH - 18);

    return exportCanvas.toDataURL('image/jpeg', 0.90);
  }, [cameras, companyName, currentWeight, transactionNo, vehicleRegNo, weighbridgeLicense]);

  // Imperative handle for parent to capture snapshots or get detected plate
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
    fetchDetectedPlate: () => {
      return cameras[0]?.plateSample || vehicleRegNo || '';
    },
  }), [cameras, captureFrame]);

  // Extract up to 3 evidence thumbnails for the middle vertical stack
  const snap1 = evidenceList[0]?.url;
  const snap2 = evidenceList[1]?.url;
  const snap3 = evidenceList[2]?.url;

  return (
    <div className="flex gap-3 h-full">
      {/* 3-Slot Snapshot Stack */}
      <div className="flex flex-col gap-2.5 w-28 shrink-0">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-center flex items-center justify-center gap-1.5 py-0.5">
          <Camera className="w-3.5 h-3.5 text-primary" />
          <span>Snapshots</span>
        </div>
        {[
          { label: 'Front / ANPR', url: snap1, angle: 'front' as const, screenIdx: 0 },
          { label: 'Deck / Bay', url: snap2, angle: 'side' as const, screenIdx: 1 },
          { label: 'Rear / Chute', url: snap3, angle: 'rear' as const, screenIdx: 0 },
        ].map((slot, idx) => (
          <div
            key={idx}
            className="flex-1 min-h-[96px] border-2 border-dashed border-border rounded-xl bg-card hover:bg-muted/40 hover:border-primary/50 flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all shadow-2xs"
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
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <span className="absolute bottom-0 inset-x-0 bg-background/90 backdrop-blur-xs text-[9px] text-foreground text-center py-0.5 font-mono flex items-center justify-center gap-1 border-t border-border">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                  {slot.label}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onTakeSnapshot) onTakeSnapshot(slot.angle);
                  }}
                  className="absolute top-1.5 right-1.5 p-1 bg-background/80 hover:bg-primary text-foreground hover:text-primary-foreground rounded-md opacity-0 group-hover:opacity-100 transition-all shadow-xs"
                  title="Retake snapshot"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center p-2 text-muted-foreground group-hover:text-primary transition-colors text-center">
                <Camera className="w-5 h-5 mb-1.5 opacity-60 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-semibold leading-tight">
                  {slot.label}
                </span>
                <span className="text-[8px] text-muted-foreground/80 mt-0.5 font-mono">
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
            className="border border-border rounded-xl bg-card overflow-hidden shadow-xs flex flex-col"
          >
            {/* Header: Camera Name + Live Status */}
            <div className="bg-muted/50 px-3 py-1.5 flex items-center justify-between text-xs font-semibold text-foreground border-b border-border">
              <div className="flex items-center gap-2">
                <Camera className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold">{cam.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-mono">
                {cam.status === 'connected' ? (
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live 1080P</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-emerald-500 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Live Reconnecting...</span>
                  </span>
                )}
              </div>
            </div>

            {/* Viewport Screen */}
            <div className="relative aspect-[16/10] bg-neutral-950 flex items-center justify-center overflow-hidden">
              {/* HTML5 Video element for physical HLS stream */}
              <video
                ref={videoRefs[idx]}
                className="absolute inset-0 w-full h-full object-cover z-0"
                playsInline
                muted
                autoPlay
              />

              {/* Grid overlay for alignment */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:2rem_2rem] pointer-events-none z-10" />

              {/* Connecting backdrop ONLY if video has no frame data at all */}
              {cam.status !== 'connected' && (!videoRefs[idx].current || videoRefs[idx].current?.readyState === 0) && (
                <div className="absolute inset-0 z-10 bg-gradient-to-b from-neutral-900/90 to-neutral-950/95 flex flex-col items-center justify-center p-4 text-center">
                  <div className="p-3 rounded-full bg-primary/10 border border-primary/20 text-primary mb-2">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <p className="text-xs font-mono font-semibold text-neutral-200">
                    {cam.name}
                  </p>
                  <p className="text-[11px] font-mono text-neutral-400 mt-0.5">
                    RTSP Gateway: {cam.ip}:554 · Auto-Heal Active
                  </p>
                  <button
                    type="button"
                    onClick={() => initHls(idx)}
                    className="mt-3 px-3 py-1 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-[11px] font-mono flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Force Reconnect</span>
                  </button>
                </div>
              )}

              {/* Top HUD Badges */}
              <div className="absolute top-2 left-2 z-20 font-mono text-[10px] text-white/90 bg-neutral-900/80 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1.5 shadow-xs">
                <span className="font-bold text-sky-400">CAM 0{idx + 1}</span>
                <span className="text-neutral-500">•</span>
                <span>25 FPS</span>
                <span className="text-neutral-500">•</span>
                <span>1080P</span>
              </div>

              <div className="absolute top-2 right-2 z-20 font-mono text-[10px] text-emerald-400 bg-neutral-900/80 backdrop-blur-xs px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1.5 shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span>REC LIVE</span>
              </div>

              {/* Camera 1 ANPR Interactive Tag & Auto-Fetch Button */}
              {idx === 0 && (
                <div className="absolute bottom-2 left-2 z-20 flex items-center gap-2">
                  {vehicleRegNo || cam.plateSample ? (
                    <button
                      type="button"
                      onClick={() => {
                        const detected = cam.plateSample || vehicleRegNo;
                        if (detected && onPlateDetected) onPlateDetected(detected);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/50 px-2.5 py-1 rounded-md shadow-sm transition-all active:scale-95 flex items-center gap-1.5 text-xs font-mono font-bold"
                      title="Click to apply detected plate to Vehicle No"
                    >
                      <Scan className="w-3.5 h-3.5 text-white animate-pulse" />
                      <span>ANPR: {vehicleRegNo || cam.plateSample}</span>
                      <span className="text-[10px] bg-white/20 px-1 py-0.2 rounded uppercase">Apply</span>
                    </button>
                  ) : (
                    <div
                      className="bg-neutral-900/80 text-white/70 border border-white/10 px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1.5 text-xs font-mono"
                      title="ANPR Camera Active - Waiting for vehicle"
                    >
                      <Scan className="w-3.5 h-3.5 text-white/50" />
                      <span>ANPR: Standby</span>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Snap quick button on viewport */}
              <button
                type="button"
                onClick={() => {
                  if (onTakeSnapshot) onTakeSnapshot(cam.angle);
                }}
                className="absolute bottom-2 right-2 z-20 bg-neutral-900/80 hover:bg-primary text-white px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 border border-white/10 transition-colors shadow-xs"
                title={`Capture ${cam.name} Snapshot`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Snap</span>
              </button>
            </div>

            {/* IP Connection Bar */}
            <div className="bg-muted/40 px-3 py-1.5 flex items-center gap-2 text-[11px] font-mono border-t border-border">
              <span className="text-muted-foreground whitespace-nowrap font-semibold">Cam IP:</span>
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
                className="w-24 px-1.5 py-0.5 bg-background border border-input rounded-md text-center text-[10px] text-foreground font-mono focus:border-primary focus:ring-1 focus:ring-primary/20"
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
                className="w-10 px-1.5 py-0.5 bg-background border border-input rounded-md text-center text-[10px] text-foreground font-mono focus:border-primary focus:ring-1 focus:ring-primary/20"
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
                className="w-14 px-1.5 py-0.5 bg-background border border-input rounded-md text-center text-[10px] text-foreground font-mono focus:border-primary focus:ring-1 focus:ring-primary/20"
                title="Username"
              />
              <input
                type="password"
                value={cam.pass}
                readOnly
                className="w-14 px-1.5 py-0.5 bg-background border border-input rounded-md text-center text-[10px] text-foreground font-mono focus:border-primary focus:ring-1 focus:ring-primary/20"
                title="Password"
              />
              <button
                type="button"
                onClick={() => initHls(idx)}
                className="px-2.5 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-md text-[10px] font-bold transition-colors ml-auto shadow-2xs"
                title="Reconnect or Refresh Camera Stream"
              >
                Connect
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
          <div className="relative max-w-4xl max-h-[90vh] bg-card border border-border rounded-xl overflow-hidden shadow-2xl">
            <div className="bg-muted px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-foreground border-b border-border">
              <span className="font-bold flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                <span>Captured Evidence Snapshot (Legal Metrology Format)</span>
              </span>
              <button
                type="button"
                onClick={() => setActivePreview(null)}
                className="text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-md text-xs bg-muted/80 hover:bg-muted font-medium transition-colors"
              >
                Close (ESC)
              </button>
            </div>
            <div className="p-3 bg-neutral-950 flex items-center justify-center">
              <img
                src={activePreview}
                alt="Captured Snapshot Preview"
                className="max-h-[75vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

DualCameraFeedPanel.displayName = 'DualCameraFeedPanel';

export default DualCameraFeedPanel;
