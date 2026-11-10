import { useEffect, useState, useRef, useCallback } from "react";
import { CameraFeed } from "@/types/anpr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Wifi, 
  WifiOff, 
  AlertCircle, 
  Settings, 
  Maximize2, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw,
  Video,
  Radio,
  Play,
  Tv,
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";
import { api } from "@/lib/api";
import { RTSPConfig } from "@/types/deviceConfig";
import Hls from 'hls.js';
import { LiveANPRDetector } from "./LiveANPRDetector";
import { useSimulatedFeed } from "./useSimulatedFeed";
import { toast } from "sonner";

interface LiveFeedViewerProps {
  camera: CameraFeed;
  showControls?: boolean;
  enableANPR?: boolean;
  onPlateDetected?: (plate: string, confidence: number) => void;
  onRegisterCapture?: (captureFunc: () => void) => void;
}

export function LiveFeedViewer({ 
  camera, 
  showControls = true, 
  enableANPR = false, 
  onPlateDetected, 
  onRegisterCapture 
}: LiveFeedViewerProps) {
  const [rtspConfig, setRtspConfig] = useState<RTSPConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'idle' | 'connecting' | 'connected' | 'error' | 'simulated'>('connecting');
  const [feedMode, setFeedMode] = useState<'rtsp' | 'simulated'>('rtsp');
  const [reconnectCount, setReconnectCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  
  // Diagnostic state
  const [checkingDiag, setCheckingDiag] = useState(false);
  const [diagResult, setDiagResult] = useState<{
    ip: string;
    reachable: boolean;
    ports: { '554': boolean; '80': boolean; '8000': boolean };
    message: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cameraIp = camera.id === 'cam_gate_1' ? '192.168.0.100' : '192.168.0.99';
  const defaultPlate = camera.id === 'cam_gate_1' ? 'MH 12 RN 4501' : 'KA 04 MM 9123';
  const laneType = camera.location === 'exit' ? 'exit' : 'entry';

  // Live Canvas-to-Video Simulation Hook
  const { isSimulating, startSimulation, stopSimulation } = useSimulatedFeed({
    videoRef,
    cameraName: camera.name,
    laneType,
    plateNumber: defaultPlate,
  });

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load RTSP configuration from backend API
  const loadOrCreateRTSPConfig = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getRTSPConfig(camera.id);

      if (data && !data.error) {
        const config: RTSPConfig = {
          enabled: Boolean(data.enabled),
          url: data.url || '',
          directUrl: data.direct_url || (camera.id === 'cam_gate_1' 
            ? 'rtsp://admin:Password@123@192.168.0.100:554/ch1/main/av_stream'
            : 'rtsp://admin:Password@123@192.168.0.99:554/Streaming/Channels/101'),
          useDirectUrl: Boolean(data.use_direct_url),
          port: data.port || 554,
          username: data.username || 'admin',
          password: data.password || 'Password@123',
          streamPath: data.stream_path || (camera.id === 'cam_gate_1' ? '/ch1/main/av_stream' : '/Streaming/Channels/101'),
          transport: (data.transport as 'tcp' | 'udp') || 'tcp',
          reconnectInterval: data.reconnect_interval || 5,
          bufferSize: data.buffer_size || 1024,
          lowLatencyMode: Boolean(data.low_latency_mode),
          hlsProxyUrl: data.hls_proxy_url || (camera.id === 'cam_gate_1' 
            ? 'http://localhost:8888/cam1/index.m3u8' 
            : 'http://localhost:8888/cam2/index.m3u8'),
        };
        setRtspConfig(config);
      } else {
        const defaultConfig: RTSPConfig = {
          enabled: true,
          url: '',
          directUrl: camera.id === 'cam_gate_1'
            ? 'rtsp://admin:Password@123@192.168.0.100:554/ch1/main/av_stream'
            : 'rtsp://admin:Password@123@192.168.0.99:554/Streaming/Channels/101',
          useDirectUrl: true,
          port: 554,
          username: 'admin',
          password: 'Password@123',
          streamPath: camera.id === 'cam_gate_1' ? '/ch1/main/av_stream' : '/Streaming/Channels/101',
          transport: 'tcp',
          reconnectInterval: 5,
          bufferSize: 1024,
          lowLatencyMode: true,
          hlsProxyUrl: camera.id === 'cam_gate_1'
            ? 'http://localhost:8888/cam1/index.m3u8'
            : 'http://localhost:8888/cam2/index.m3u8',
        };
        setRtspConfig(defaultConfig);
      }
    } catch (err) {
      setRtspConfig({
        enabled: true,
        url: '',
        directUrl: camera.id === 'cam_gate_1'
          ? 'rtsp://admin:Password@123@192.168.0.100:554/ch1/main/av_stream'
          : 'rtsp://admin:Password@123@192.168.0.99:554/Streaming/Channels/101',
        useDirectUrl: true,
        port: 554,
        username: 'admin',
        password: 'Password@123',
        streamPath: camera.id === 'cam_gate_1' ? '/ch1/main/av_stream' : '/Streaming/Channels/101',
        transport: 'tcp',
        reconnectInterval: 5,
        bufferSize: 1024,
        lowLatencyMode: true,
        hlsProxyUrl: camera.id === 'cam_gate_1'
          ? 'http://localhost:8888/cam1/index.m3u8'
          : 'http://localhost:8888/cam2/index.m3u8',
      });
    } finally {
      setLoading(false);
    }
  }, [camera.id]);

  useEffect(() => {
    loadOrCreateRTSPConfig();
  }, [loadOrCreateRTSPConfig]);

  // Connect HLS Stream (with fast timeout fallback)
  const connectHlsStream = useCallback(() => {
    if (feedMode === 'simulated') return;
    if (!rtspConfig?.hlsProxyUrl || !videoRef.current) return;

    const video = videoRef.current;
    setStreamStatus('connecting');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let networkRetryCount = 0;
    const maxRetries = 2;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        manifestLoadingTimeOut: 4000,
        manifestLoadingMaxRetry: 2,
        levelLoadingTimeOut: 4000,
        fragLoadingTimeOut: 4000,
      });

      hlsRef.current = hls;
      hls.loadSource(rtspConfig.hlsProxyUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log(`[${camera.id}] HLS manifest parsed successfully`);
        setStreamStatus('connected');
        video.play().catch(e => console.warn('Autoplay error:', e));
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkRetryCount++;
              if (networkRetryCount <= maxRetries) {
                console.log(`[${camera.id}] HLS network error, retry ${networkRetryCount}/${maxRetries}...`);
                hls.startLoad();
              } else {
                console.warn(`[${camera.id}] Camera RTSP stream unreachable (timed out).`);
                hls.destroy();
                hlsRef.current = null;
                setStreamStatus('error');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log(`[${camera.id}] HLS media error, recovering...`);
              hls.recoverMediaError();
              break;
            default:
              console.warn(`[${camera.id}] Fatal HLS error:`, data.details);
              hls.destroy();
              hlsRef.current = null;
              setStreamStatus('error');
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = rtspConfig.hlsProxyUrl;
      video.addEventListener('loadedmetadata', () => {
        setStreamStatus('connected');
        video.play().catch(e => console.warn('Safari autoplay error:', e));
      });
      video.addEventListener('error', () => {
        setStreamStatus('error');
      });
    }
  }, [rtspConfig?.hlsProxyUrl, camera.id, feedMode]);

  useEffect(() => {
    if (feedMode === 'rtsp') {
      connectHlsStream();
    }
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [rtspConfig?.hlsProxyUrl, reconnectCount, feedMode, connectHlsStream]);

  // Activate Simulated Live Preview Feed
  const handleStartSimulation = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    setFeedMode('simulated');
    setStreamStatus('simulated');
    startSimulation();
    toast.success(`Started Live Gate Simulation on ${camera.name}`);
  };

  // Switch back to Physical RTSP stream
  const handleSwitchToRTSP = () => {
    stopSimulation();
    setFeedMode('rtsp');
    setStreamStatus('connecting');
    setReconnectCount(prev => prev + 1);
    toast.info(`Connecting to Physical RTSP stream at ${cameraIp}...`);
  };

  // Run hardware socket diagnostic
  const handleRunDiagnostic = async () => {
    setCheckingDiag(true);
    try {
      const res = await api.checkCameraDiagnostic(cameraIp);
      setDiagResult(res);
      if (res.reachable) {
        toast.success(`Camera at ${cameraIp} is responsive!`);
      } else {
        toast.error(`Camera at ${cameraIp} is unreachable on this subnet.`);
      }
    } catch (err: any) {
      toast.error('Diagnostic error: ' + (err.message || 'Failed'));
    } finally {
      setCheckingDiag(false);
    }
  };

  const getRtspUrl = () => {
    if (rtspConfig?.directUrl) return rtspConfig.directUrl;
    return `rtsp://admin:Password@123@${cameraIp}:554/Streaming/Channels/101`;
  };

  const copyRtspUrl = () => {
    navigator.clipboard.writeText(getRtspUrl());
    setCopied(true);
    toast.success('RTSP Stream URL copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const openInVLC = () => {
    window.open(`vlc://${getRtspUrl()}`, '_blank');
  };

  const openCameraWeb = () => {
    window.open(`http://${cameraIp}`, '_blank');
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Test plate OCR trigger
  const handleSimulatePlate = () => {
    const testPlates = [
      { plate: "MH 12 RN 4501", conf: 0.98 },
      { plate: "KA 04 MM 9123", conf: 0.96 },
      { plate: "MH 14 EM 8821", conf: 0.95 },
      { plate: "MH 12 QX 9901", conf: 0.97 },
    ];
    const picked = testPlates[Math.floor(Math.random() * testPlates.length)];
    onPlateDetected?.(picked.plate, picked.conf);
    toast.success(`ANPR Plate Captured: ${picked.plate} (${(picked.conf * 100).toFixed(0)}%)`);
  };

  const isVideoLive = streamStatus === 'connected' || streamStatus === 'simulated';

  return (
    <Card className="overflow-hidden border-border/80 shadow-md flex flex-col justify-between">
      <CardHeader className="pb-3 bg-card/60 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-emerald-500 animate-pulse" />
            <CardTitle className="text-base font-semibold">{camera.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {streamStatus === 'connected' ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 gap-1 font-mono">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                RTSP LIVE
              </Badge>
            ) : streamStatus === 'simulated' ? (
              <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 gap-1 font-mono">
                <Tv className="h-3 w-3 animate-pulse" />
                SIMULATED PREVIEW
              </Badge>
            ) : streamStatus === 'connecting' ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <RefreshCw className="h-3 w-3 animate-spin" />
                CONNECTING...
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 text-xs">
                <WifiOff className="h-3 w-3" />
                OFFLINE / UNREACHABLE
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground mt-1 gap-2">
          <p>{camera.location.toUpperCase()} LANE • IP: <span className="font-mono text-foreground">{cameraIp}</span></p>
          <div className="flex items-center gap-1">
            {feedMode === 'simulated' ? (
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1 border-primary/40 text-primary"
                onClick={handleSwitchToRTSP}
              >
                <Video className="h-3 w-3" />
                Try RTSP
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={handleStartSimulation}
              >
                <Tv className="h-3 w-3 text-sky-400" />
                Demo Feed
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={openCameraWeb}
              title="Open Camera Web GUI"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Web UI
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => window.location.href = '/device-config'}
              title="Configure RTSP"
            >
              <Settings className="h-3 w-3 mr-1" />
              Config
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1 flex flex-col justify-between bg-black">
        <div ref={containerRef} className="aspect-video bg-neutral-950 relative group overflow-hidden flex items-center justify-center">
          {/* Main Video Element */}
          <video
            ref={videoRef}
            className={`w-full h-full object-contain bg-black ${isVideoLive ? 'block' : 'hidden'}`}
            autoPlay
            muted
            playsInline
            controls={false}
          />

          {/* Connected / Simulated Live HUD */}
          {isVideoLive && (
            <>
              {/* Top HUD */}
              <div className="absolute top-2 left-2 text-white/90 font-mono text-xs bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded flex items-center gap-2 pointer-events-none">
                <span className={`h-2 w-2 rounded-full ${streamStatus === 'connected' ? 'bg-emerald-400' : 'bg-sky-400'} animate-pulse`} />
                <span>{camera.name}</span>
                <span>•</span>
                <span>{currentTime}</span>
              </div>

              {/* REC Badge */}
              <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2 py-1 rounded pointer-events-none">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-white/90 font-mono text-xs">REC</span>
              </div>

              {/* Live ANPR Detector Overlay on video */}
              {enableANPR && onPlateDetected && (
                <LiveANPRDetector
                  cameraId={camera.id}
                  videoElement={videoRef.current}
                  onPlateDetected={onPlateDetected}
                  enabled={isVideoLive}
                  onRegisterCapture={onRegisterCapture}
                />
              )}
            </>
          )}

          {/* Standby / Error / Connecting Overlay */}
          {!isVideoLive && (
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-5 flex flex-col justify-between text-white">
              {/* Header Info */}
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <span className="font-mono">{camera.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {streamStatus === 'connecting' ? (
                    <>
                      <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                      <span className="font-mono text-amber-400">CONNECTING...</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 text-rose-400" />
                      <span className="font-mono text-rose-400 uppercase">SIGNAL TIMED OUT</span>
                    </>
                  )}
                </div>
              </div>

              {/* Center Panel */}
              <div className="text-center space-y-3 my-auto max-w-md mx-auto">
                <div className="p-3 rounded-full bg-neutral-800/80 border border-neutral-700 w-fit mx-auto">
                  <Video className="h-7 w-7 text-primary animate-pulse" />
                </div>
                
                <div>
                  <h4 className="text-sm font-semibold tracking-wide text-neutral-100">
                    {streamStatus === 'connecting' ? 'Negotiating RTSP Connection...' : 'Physical Camera Signal Offline'}
                  </h4>
                  <p className="text-xs text-neutral-400 font-mono mt-1 break-all">
                    {getRtspUrl()}
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    IP: <span className="font-mono text-foreground font-semibold">{cameraIp}</span> (Port 554)
                  </p>
                </div>

                {/* Diagnostic feedback if checked */}
                {diagResult && (
                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-left space-y-1 font-mono">
                    <p className="text-neutral-300 font-semibold flex items-center justify-between">
                      <span>Network Reachability ({diagResult.ip}):</span>
                      <span className={diagResult.reachable ? "text-emerald-400" : "text-rose-400"}>
                        {diagResult.reachable ? "ONLINE" : "UNREACHABLE"}
                      </span>
                    </p>
                    <div className="grid grid-cols-3 gap-1 text-[11px] pt-1">
                      <span className={diagResult.ports['554'] ? "text-emerald-400" : "text-neutral-500"}>
                        Port 554 (RTSP): {diagResult.ports['554'] ? 'OPEN' : 'CLOSED'}
                      </span>
                      <span className={diagResult.ports['80'] ? "text-emerald-400" : "text-neutral-500"}>
                        Port 80 (Web): {diagResult.ports['80'] ? 'OPEN' : 'CLOSED'}
                      </span>
                      <span className={diagResult.ports['8000'] ? "text-emerald-400" : "text-neutral-500"}>
                        Port 8000: {diagResult.ports['8000'] ? 'OPEN' : 'CLOSED'}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-400/90 pt-1">
                      💡 Tip: Verify camera PoE power & plug the Ethernet cable into your network switch/PC.
                    </p>
                  </div>
                )}

                {/* Primary Action Button: Start Simulation Preview */}
                <div className="pt-1">
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-sky-600 to-primary hover:from-sky-500 hover:to-primary/90 text-white font-medium text-xs gap-2 py-2"
                    onClick={handleStartSimulation}
                  >
                    <Tv className="h-4 w-4" />
                    Preview Live Gate Camera (Demo Stream)
                  </Button>
                </div>
              </div>

              {/* Bottom Quick Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-1.5">
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="h-7 text-xs gap-1"
                    onClick={copyRtspUrl}
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy RTSP
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs gap-1 bg-neutral-800/60 border-neutral-700 text-neutral-200 hover:text-white"
                    onClick={openInVLC}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    VLC
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-neutral-700 bg-neutral-800/60"
                    onClick={handleRunDiagnostic}
                    disabled={checkingDiag}
                  >
                    <Activity className={`h-3 w-3 ${checkingDiag ? 'animate-spin' : ''}`} />
                    {checkingDiag ? 'Checking...' : 'Check IP'}
                  </Button>

                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 text-xs gap-1"
                    onClick={handleSwitchToRTSP}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry RTSP
                  </Button>

                  {enableANPR && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/20"
                      onClick={handleSimulatePlate}
                      title="Test ANPR flow with sample vehicle plate"
                    >
                      <Play className="h-3 w-3" />
                      Test OCR
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Button */}
          {showControls && (
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-20">
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7 bg-black/70 hover:bg-black text-white"
                onClick={toggleFullscreen}
                title="Fullscreen"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
