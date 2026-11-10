import { useState, useEffect, useRef } from 'react';
import { CameraDevice, RTSPConfig } from '@/types/deviceConfig';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Video, 
  VideoOff, 
  Maximize2, 
  Minimize2, 
  Camera, 
  RefreshCw,
  Volume2,
  VolumeX,
  Settings2,
  Loader2,
  WifiOff,
  AlertCircle,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface LiveStreamViewerProps {
  device: CameraDevice | null;
  rtspConfig: RTSPConfig;
  onOpenFullscreen?: () => void;
}

type StreamStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting' | 'no_proxy';

export function LiveStreamViewer({ 
  device, 
  rtspConfig,
  onOpenFullscreen 
}: LiveStreamViewerProps) {
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('disconnected');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const getRtspUrl = () => {
    if (rtspConfig.useDirectUrl && rtspConfig.directUrl) {
      return rtspConfig.directUrl;
    }
    if (!device) return '';
    const auth = rtspConfig.username && rtspConfig.password 
      ? `${rtspConfig.username}:***@` 
      : '';
    return `rtsp://${auth}${device.ipAddress}:${rtspConfig.port}${rtspConfig.streamPath}`;
  };

  // Handle stream connection
  useEffect(() => {
    if (!device || !rtspConfig.enabled) {
      setStreamStatus('disconnected');
      return;
    }

    if (device.status !== 'online') {
      setStreamStatus('error');
      setErrorMessage('Camera is offline');
      return;
    }

    // Check if HLS proxy is configured for browser playback
    if (rtspConfig.hlsProxyUrl) {
      setStreamStatus('connecting');
      setErrorMessage(null);

      // Try to load HLS stream
      const connectTimer = setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.src = rtspConfig.hlsProxyUrl;
          videoRef.current.load();
        }
        setStreamStatus('connected');
        
        // Simulate frame counter
        const frameInterval = setInterval(() => {
          setFrameCount(prev => prev + 1);
        }, 1000 / 30);

        return () => clearInterval(frameInterval);
      }, 1500);

      return () => clearTimeout(connectTimer);
    } else {
      // No HLS proxy - show RTSP URL for external player
      setStreamStatus('no_proxy');
      setErrorMessage('Configure HLS proxy for browser playback');
    }
  }, [device, rtspConfig.enabled, rtspConfig.hlsProxyUrl]);

  const handleReconnect = () => {
    if (!device) return;
    setStreamStatus('reconnecting');
    setErrorMessage(null);

    setTimeout(() => {
      setStreamStatus('connected');
    }, 2000);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const captureSnapshot = () => {
    console.log('Capturing snapshot from RTSP stream:', getRtspUrl());
  };

  const copyRtspUrl = () => {
    navigator.clipboard.writeText(getRtspUrl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInVLC = () => {
    // Create VLC protocol link
    const vlcUrl = `vlc://${getRtspUrl()}`;
    window.open(vlcUrl, '_blank');
  };

  const getStatusBadge = () => {
    switch (streamStatus) {
      case 'connected':
        return (
          <Badge className="bg-success text-success-foreground gap-1">
            <span className="h-2 w-2 rounded-full bg-success-foreground animate-pulse" />
            LIVE
          </Badge>
        );
      case 'connecting':
      case 'reconnecting':
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {streamStatus === 'connecting' ? 'Connecting...' : 'Reconnecting...'}
          </Badge>
        );
      case 'no_proxy':
        return <Badge variant="outline" className="gap-1">RTSP Ready</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  if (!device) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-5 w-5" />
            Live Stream Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center space-y-2">
              <VideoOff className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Select a camera to view live stream
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-5 w-5" />
            {device.name}
          </CardTitle>
          {getStatusBadge()}
        </div>
        {rtspConfig.enabled && (
          <p className="text-xs text-muted-foreground font-mono truncate">
            {getRtspUrl()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div 
          ref={containerRef}
          className="aspect-video bg-black rounded-lg relative overflow-hidden"
        >
          {!rtspConfig.enabled ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center space-y-2">
                <Settings2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  RTSP streaming is disabled
                </p>
                <p className="text-xs text-muted-foreground">
                  Enable it in the RTSP tab to view live feed
                </p>
              </div>
            </div>
          ) : streamStatus === 'connected' && rtspConfig.hlsProxyUrl ? (
            <>
              {/* Actual video element for HLS playback */}
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain bg-black"
                autoPlay
                muted={isMuted}
                playsInline
                onError={() => {
                  setStreamStatus('error');
                  setErrorMessage('Failed to load HLS stream');
                }}
              />
              
              {/* Stream info overlay */}
              <div className="absolute bottom-3 left-3 text-white/80 font-mono text-xs bg-black/50 px-2 py-1 rounded">
                {new Date().toLocaleString()} | Frame: {frameCount}
              </div>

              <div className="absolute top-3 left-3 text-white/80 font-mono text-xs bg-black/50 px-2 py-1 rounded">
                {device.name} | {device.ipAddress}
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/50 px-2 py-1 rounded">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-white/80 font-mono text-xs">REC</span>
              </div>
              
              {/* Stream controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={() => setIsMuted(!isMuted)}
                    >
                      {isMuted ? (
                        <VolumeX className="h-4 w-4" />
                      ) : (
                        <Volume2 className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-white hover:bg-white/20"
                      onClick={captureSnapshot}
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-white hover:bg-white/20"
                    onClick={handleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : streamStatus === 'no_proxy' || (streamStatus === 'connected' && !rtspConfig.hlsProxyUrl) ? (
            <>
              {/* RTSP-only mode - show URL for external player */}
              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative w-full h-full">
                    {/* Grid overlay */}
                    <div className="absolute inset-0 opacity-10">
                      <div className="w-full h-full" style={{
                        backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                      }} />
                    </div>
                    
                    {/* Center content */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                      <Video className="h-12 w-12 text-primary mb-3" />
                      <p className="text-white/90 text-sm font-medium mb-2">RTSP Stream Ready</p>
                      <p className="text-white/60 text-xs mb-4 max-w-xs">
                        Browsers cannot play RTSP directly. Use the URL below in VLC or another player.
                      </p>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={copyRtspUrl}
                          className="gap-1"
                        >
                          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                          {copied ? 'Copied!' : 'Copy URL'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={openInVLC}
                          className="gap-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open in VLC
                        </Button>
                      </div>
                    </div>

                    {/* Camera info overlay */}
                    <div className="absolute top-3 left-3 text-white/80 font-mono text-xs bg-black/50 px-2 py-1 rounded">
                      {device.name} | {device.ipAddress}
                    </div>

                    {/* Status indicator */}
                    <div className="absolute top-3 right-3 flex items-center gap-2 bg-black/50 px-2 py-1 rounded">
                      <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-white/80 font-mono text-xs">READY</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : streamStatus === 'connecting' || streamStatus === 'reconnecting' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center space-y-3">
                <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {streamStatus === 'connecting' ? 'Connecting to camera...' : 'Reconnecting...'}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {getRtspUrl()}
                </p>
              </div>
            </div>
          ) : streamStatus === 'error' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center space-y-3">
                {device.status === 'offline' ? (
                  <WifiOff className="h-12 w-12 mx-auto text-muted-foreground" />
                ) : (
                  <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                )}
                <p className="text-sm text-foreground font-medium">
                  {errorMessage || 'Stream Error'}
                </p>
                <Button variant="outline" size="sm" onClick={handleReconnect}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </Button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center space-y-2">
                <VideoOff className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Stream disconnected</p>
              </div>
            </div>
          )}
        </div>

        {/* RTSP URL display for external player */}
        {rtspConfig.enabled && (streamStatus === 'no_proxy' || streamStatus === 'connected') && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">RTSP Stream URL</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2" 
                onClick={copyRtspUrl}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <p className="text-xs font-mono text-foreground break-all">{getRtspUrl()}</p>
          </div>
        )}

        {/* Stream info */}
        {rtspConfig.enabled && (streamStatus === 'connected' || streamStatus === 'no_proxy') && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-muted rounded p-2 text-center">
              <p className="text-muted-foreground">Transport</p>
              <p className="font-medium uppercase">{rtspConfig.transport}</p>
            </div>
            <div className="bg-muted rounded p-2 text-center">
              <p className="text-muted-foreground">Latency</p>
              <p className="font-medium">{rtspConfig.lowLatencyMode ? 'Low' : 'Normal'}</p>
            </div>
            <div className="bg-muted rounded p-2 text-center">
              <p className="text-muted-foreground">Buffer</p>
              <p className="font-medium">{rtspConfig.bufferSize} KB</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
