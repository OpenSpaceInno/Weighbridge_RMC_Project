import { useState, useEffect, useRef } from "react";
import { LogIn, Activity, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LiveFeedViewer } from "@/components/gate/LiveFeedViewer";
import { SimplePlateDisplay } from "@/components/gate/SimplePlateDisplay";
import { useGateCameras } from "@/hooks/useGateCameras";
import { api } from "@/lib/api";

const GateMonitor = () => {
  const { cameras, initialized } = useGateCameras();
  const [dbInitialized, setDbInitialized] = useState(false);
  const [checkingDb, setCheckingDb] = useState(true);
  const [detectedPlate, setDetectedPlate] = useState<string>("");
  const [detectedConfidence, setDetectedConfidence] = useState<number>(0);
  const [isConnected] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const manualCaptureRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    checkDatabaseTables();
  }, []);

  const checkDatabaseTables = async () => {
    try {
      const status = await api.checkDatabaseStatus();
      setDbInitialized(status.initialized);
    } catch (error) {
      console.log('Database tables not initialized yet', error);
      setDbInitialized(false);
    } finally {
      setCheckingDb(false);
    }
  };

  const initializeDatabase = () => {
    window.location.href = '/database-setup';
  };

  // Handle plate detection from live camera
  const handlePlateDetected = (plate: string, confidence: number) => {
    console.log('✅ Plate detected and displayed:', plate, 'Confidence:', confidence);
    setDetectedPlate(plate);
    setDetectedConfidence(confidence);
  };

  // Handle manual capture
  const handleManualCapture = () => {
    console.log('🔘 Manual capture button clicked');
    
    // Try ref first
    if (manualCaptureRef.current) {
      console.log('✅ Using ref-based capture');
      manualCaptureRef.current();
      return;
    }
    
    // Fallback to window object
    if ((window as any).__manualCapture) {
      console.log('✅ Using window-based capture');
      (window as any).__manualCapture();
      return;
    }
    
    console.error('❌ No capture function available');
  };

  // Callback to receive capture function from LiveANPRDetector
  const registerManualCapture = (captureFunc: () => void) => {
    console.log('📝 Registering manual capture function');
    manualCaptureRef.current = captureFunc;
  };

  if (checkingDb) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
          <p className="text-muted-foreground">Checking system status...</p>
        </div>
      </div>
    );
  }

  if (!dbInitialized) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <LogIn className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gate Monitor</h1>
            <p className="text-muted-foreground">
              Live ANPR feed with auto-fill and manual override
            </p>
          </div>
        </div>

        <Alert>
          <AlertDescription>
            <div className="space-y-4">
              <p className="font-medium">Database tables need to be initialized first.</p>
              <p className="text-sm text-muted-foreground">
                This is a one-time setup that will create the necessary tables for camera configuration and RTSP streaming.
              </p>
              <Button onClick={initializeDatabase}>
                Initialize Database
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20">
            <LogIn className="h-7 w-7 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Gate Monitor</h1>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-500 text-xs gap-1 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                DUAL CAMERA
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live ANPR feed with automatic plate detection, overview monitoring, and manual override
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs gap-1.5"
            onClick={() => window.location.href = '/device-config'}
          >
            Configure Devices
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card">
            <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-emerald-500">Live Gateway Active</span>
          </div>
        </div>
      </div>

      {/* Camera Hardware Network Status Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg border bg-card/60 backdrop-blur-sm text-xs">
        <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <p className="font-semibold text-foreground">ANPR Camera</p>
              <p className="text-muted-foreground font-mono">192.168.0.101:554 (RTSP)</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-[11px]" 
            onClick={() => window.open('http://192.168.0.101', '_blank')}
          >
            Web UI ↗
          </Button>
        </div>

        <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <div>
              <p className="font-semibold text-foreground">IP Overview Camera</p>
              <p className="text-muted-foreground font-mono">192.168.0.99:554 (RTSP)</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-[11px]" 
            onClick={() => window.open('http://192.168.0.99', '_blank')}
          >
            Web UI ↗
          </Button>
        </div>

        <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-sky-500" />
            <div>
              <p className="font-semibold text-foreground">MediaMTX HLS Gateway</p>
              <p className="text-muted-foreground font-mono">http://localhost:8888</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-[10px] font-mono">LOW LATENCY</Badge>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 gap-6">
        {/* Live Camera Feeds */}
        {initialized ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cameras.map((camera) => (
              <LiveFeedViewer 
                key={camera.id} 
                camera={camera}
                enableANPR={true}
                onPlateDetected={handlePlateDetected}
                onRegisterCapture={registerManualCapture}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {cameras.map((camera) => (
              <div key={camera.id} className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ))}
          </div>
        )}

        {/* Detected Plate Display */}
        <SimplePlateDisplay 
          plateNumber={detectedPlate}
          confidence={detectedConfidence}
          onManualCapture={handleManualCapture}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
};

export default GateMonitor;
