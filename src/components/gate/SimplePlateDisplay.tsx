import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Camera, RefreshCw, ShieldCheck, UserCheck, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

interface SimplePlateDisplayProps {
  plateNumber: string;
  confidence: number;
  onManualCapture?: () => void;
  isProcessing?: boolean;
}

export function SimplePlateDisplay({ plateNumber, confidence, onManualCapture, isProcessing }: SimplePlateDisplayProps) {
  const [matchedVehicle, setMatchedVehicle] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    if (!plateNumber) {
      setMatchedVehicle(null);
      return;
    }

    let active = true;
    setIsLookingUp(true);

    const cleanPlate = plateNumber.replace(/\s+/g, '');
    api.getVehicle(cleanPlate)
      .then((veh) => {
        if (active) setMatchedVehicle(veh);
      })
      .catch(() => {
        if (active) setMatchedVehicle(null);
      })
      .finally(() => {
        if (active) setIsLookingUp(false);
      });

    return () => {
      active = false;
    };
  }, [plateNumber]);

  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.92) return "bg-success text-success-foreground";
    if (conf >= 0.85) return "bg-warning text-warning-foreground";
    return "bg-destructive text-destructive-foreground";
  };

  return (
    <Card className="border-primary/50 shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Vehicle Registration Number</CardTitle>
            <CardDescription>Detected from live camera feed</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {plateNumber && confidence > 0 && (
              <Badge className={getConfidenceColor(confidence)}>
                {(confidence * 100).toFixed(1)}% Confidence
              </Badge>
            )}
            {onManualCapture && (
              <Button 
                size="sm" 
                onClick={onManualCapture}
                disabled={isProcessing}
                className="gap-2"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Detecting...
                  </>
                ) : (
                  <>
                    <Camera className="h-4 w-4" />
                    Capture Now
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="plateNumber">License Plate Number</Label>
          <Input
            id="plateNumber"
            value={plateNumber || ""}
            readOnly
            placeholder="Waiting for detection..."
            className="font-mono text-2xl font-bold text-center bg-muted"
          />
          {plateNumber ? (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Camera className="h-3 w-3" />
              Auto-detected from live camera at {new Date().toLocaleTimeString()}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Zap className="h-3 w-3 animate-pulse" />
              Monitoring camera feed for vehicles... (Click "Capture Now" to test)
            </p>
          )}
        </div>

        {/* Matched Vehicle from MySQL Database */}
        {matchedVehicle && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-md space-y-2 animate-in fade-in-50 duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Verified Fleet Vehicle: {matchedVehicle.make} {matchedVehicle.model} ({matchedVehicle.registrationNo})
              </span>
              <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs uppercase">
                {matchedVehicle.status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="flex items-center gap-1 font-medium text-foreground">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                Driver: {matchedVehicle.currentDriver || "Unassigned"}
              </span>
              {matchedVehicle.currentDriverPhone && (
                <span>{matchedVehicle.currentDriverPhone}</span>
              )}
              <span>Capacity: {matchedVehicle.capacity} {matchedVehicle.capacityUnit}</span>
              <span>Odometer: {matchedVehicle.odometer?.toLocaleString()} km</span>
            </div>
          </div>
        )}

        {plateNumber && !matchedVehicle && !isLookingUp && (
          <div className="p-2.5 bg-muted/60 border rounded-md flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-warning" />
            <span>Unregistered / Visitor Vehicle — No fleet record found in database.</span>
          </div>
        )}

        {plateNumber && confidence > 0 && confidence < 0.92 && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-md">
            <p className="text-sm text-warning-foreground">
              ⚠️ Confidence below 92%. Please verify the plate number manually.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
