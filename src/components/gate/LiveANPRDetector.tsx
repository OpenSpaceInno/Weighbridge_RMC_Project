import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Camera, Zap, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface LiveANPRDetectorProps {
  cameraId: string;
  videoElement: HTMLVideoElement | null;
  onPlateDetected: (plate: string, confidence: number) => void;
  enabled?: boolean;
  onRegisterCapture?: (captureFunc: () => void) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}

export function LiveANPRDetector({ 
  cameraId, 
  videoElement, 
  onPlateDetected,
  enabled = true,
  onRegisterCapture,
  onProcessingChange
}: LiveANPRDetectorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastDetection, setLastDetection] = useState<{
    plate: string;
    confidence: number;
    timestamp: number;
  } | null>(null);
  const [detectionCount, setDetectionCount] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Notify parent of processing state changes
  useEffect(() => {
    if (onProcessingChange) {
      onProcessingChange(isProcessing);
    }
  }, [isProcessing, onProcessingChange]);

  // Register manual capture function with parent
  useEffect(() => {
    if (onRegisterCapture) {
      console.log(`[${cameraId}] Registering manual capture function`);
      onRegisterCapture(() => {
        console.log(`[${cameraId}] Manual capture called via ref`);
        processFrame();
      });
    }
    
    // Also keep window fallback
    (window as any).__manualCapture = () => {
      console.log(`[${cameraId}] Manual capture called via window`);
      processFrame();
    };
  }, [onRegisterCapture, cameraId]);

  // Capture frame from video element
  const captureFrame = useCallback((): string | null => {
    if (!videoElement || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size to match video (reduced for smaller payload)
    const targetWidth = 640; // Reduced from full resolution
    const targetHeight = 480;
    
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Draw current video frame to canvas
    ctx.drawImage(videoElement, 0, 0, targetWidth, targetHeight);

    // Convert to base64 image with lower quality for smaller size
    return canvas.toDataURL('image/jpeg', 0.5); // 50% quality
  }, [videoElement]);

  // Process frame for ANPR
  const processFrame = useCallback(async () => {
    if (!enabled || isProcessing || !videoElement) return;

    // Check if video is actually playing
    if (videoElement.paused || videoElement.readyState < 2) {
      console.log(`[${cameraId}] Video not ready for capture`);
      return;
    }

    try {
      setIsProcessing(true);

      console.log(`[${cameraId}] Capturing frame from live video...`);

      // Capture current frame
      const frameData = captureFrame();
      if (!frameData) {
        console.log(`[${cameraId}] Failed to capture frame`);
        return;
      }

      console.log(`[${cameraId}] Frame captured (${Math.round(frameData.length / 1024)}KB), sending to ANPR API...`);

      // Convert base64 to blob
      const response = await fetch(frameData);
      const blob = await response.blob();

      // Create FormData for API
      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');
      formData.append('camera_id', cameraId);

      // Send to ANPR API
      const result = await api.detectPlate(formData);

      console.log(`[${cameraId}] ANPR result:`, result);

      if (result.success && result.plates && result.plates.length > 0) {
        const detection = result.plates[0];
        const now = Date.now();

        console.log(`[${cameraId}] Plate detected: ${detection.plate} (${(detection.confidence * 100).toFixed(1)}%)`);

        // Avoid duplicate detections (within 5 seconds)
        if (lastDetection && 
            lastDetection.plate === detection.plate && 
            now - lastDetection.timestamp < 5000) {
          console.log(`[${cameraId}] Duplicate detection ignored`);
          return;
        }

        // Update state
        setLastDetection({
          plate: detection.plate,
          confidence: detection.confidence,
          timestamp: now,
        });
        setDetectionCount(prev => prev + 1);

        // Notify parent component (this will update the textbox)
        onPlateDetected(detection.plate, detection.confidence);

        // Show toast notification
        toast.success("License Plate Detected!", {
          description: `${detection.plate} - ${(detection.confidence * 100).toFixed(1)}% confidence`,
        });

        console.log(`[${cameraId}] Plate sent to textbox: ${detection.plate}`);
      } else {
        console.log(`[${cameraId}] No plates detected in frame`);
      }
    } catch (error) {
      console.error(`[${cameraId}] ANPR processing error:`, error);
      // Don't show error toast to avoid spam
    } finally {
      setIsProcessing(false);
    }
  }, [enabled, isProcessing, videoElement, captureFrame, cameraId, lastDetection, onPlateDetected]);

  // Start/stop processing based on enabled state
  useEffect(() => {
    if (!enabled || !videoElement) {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        processingIntervalRef.current = null;
        console.log(`[${cameraId}] ANPR detection stopped`);
      }
      return;
    }

    console.log(`[${cameraId}] ANPR detection started - capturing frames every 2 seconds`);
    console.log(`[${cameraId}] Video element ready:`, {
      width: videoElement.videoWidth,
      height: videoElement.videoHeight,
      readyState: videoElement.readyState,
      paused: videoElement.paused,
    });

    // Process frame every 2 seconds
    processingIntervalRef.current = setInterval(() => {
      processFrame();
    }, 2000);

    // Process first frame immediately
    setTimeout(() => {
      processFrame();
    }, 1000);

    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
        console.log(`[${cameraId}] ANPR detection stopped`);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, videoElement, cameraId]);

  if (!enabled) return null;

  return (
    <>
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Detection status overlay */}
      <Card className="absolute bottom-4 right-4 bg-black/80 border-primary/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              {isProcessing ? (
                <Zap className="h-5 w-5 text-primary animate-pulse" />
              ) : (
                <Camera className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="text-left">
              <div className="text-xs text-white/80 font-medium">
                {isProcessing ? 'Scanning...' : 'ANPR Active'}
              </div>
              {lastDetection && (
                <div className="text-xs text-primary font-mono">
                  {lastDetection.plate} ({(lastDetection.confidence * 100).toFixed(0)}%)
                </div>
              )}
              <div className="text-xs text-white/60">
                {detectionCount} detected
              </div>
            </div>
            <Badge variant="outline" className="ml-2 bg-success/20 text-success border-success/50">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse mr-1" />
              Live
            </Badge>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
