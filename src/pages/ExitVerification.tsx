import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LogOut, AlertCircle, Printer, Download } from "lucide-react";
import { useExitVerification } from "@/hooks/useExitVerification";
import WeightDisplay from "@/components/weighbridge/WeightDisplay";
import WeightComparison from "@/components/exit/WeightComparison";
import VerificationHistory from "@/components/exit/VerificationHistory";
import VerificationSteps from "@/components/exit/VerificationSteps";
import ExitVerificationSummary from "@/components/exit/ExitVerificationSummary";
import VehicleLookup from "@/components/exit/VehicleLookup";
import VerificationDetailsDialog from "@/components/exit/VerificationDetailsDialog";
import PlateImageCapture from "@/components/gate/PlateImageCapture";
import AnomalyEscalationBanner from "@/components/exit/AnomalyEscalationBanner";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ExitVerification as ExitVerificationType } from "@/types/exitVerification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ExitVerification = () => {
  const {
    currentWeight,
    activeVerification,
    lastEscalatedIncidentId,
    verifications,
    startVerification,
    startVerificationWithData,
    captureExitWeight,
    addPlateImages,
    compareWeights,
    completeVerification,
    cancelVerification,
    generateExitSlip,
  } = useExitVerification();

  const [vehicleRegNo, setVehicleRegNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [plateImagesCaptured, setPlateImagesCaptured] = useState(false);
  const [selectedVerification, setSelectedVerification] = useState<ExitVerificationType | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleStartVerification = () => {
    if (!vehicleRegNo.trim()) {
      toast({
        title: "Error",
        description: "Please enter vehicle registration number",
        variant: "destructive",
      });
      return;
    }

    startVerification(vehicleRegNo);
    setRemarks("");
    setPlateImagesCaptured(false);
    toast({
      title: "Verification Started",
      description: `Exit verification started for ${vehicleRegNo}`,
    });
  };

  const handleSelectVehicleFromLookup = (vehicle: {
    regNo: string;
    entryWeight: number;
    loadingWeight: number;
  }) => {
    startVerificationWithData(vehicle.regNo, vehicle.entryWeight, vehicle.loadingWeight);
    setVehicleRegNo(vehicle.regNo);
    setRemarks("");
    setPlateImagesCaptured(false);
    toast({
      title: "Verification Started",
      description: `Exit verification started for ${vehicle.regNo} with pre-loaded weights`,
    });
  };

  const handleCaptureWeight = () => {
    if (!currentWeight.stable) {
      toast({
        title: "Weight Not Stable",
        description: "Please wait for weight to stabilize",
        variant: "destructive",
      });
      return;
    }

    const result = captureExitWeight();
    if (result) {
      toast({
        title: "Exit Weight Captured",
        description: `${(currentWeight.weight / 1000).toFixed(2)} tons recorded`,
      });
    }
  };

  const handleCompleteVerification = async () => {
    if (!plateImagesCaptured) {
      toast({
        title: "Missing Plate Images",
        description: "Please capture front and back plate images",
        variant: "destructive",
      });
      return;
    }

    const completed = await completeVerification(remarks);
    if (completed) {
      // Reset form
      setVehicleRegNo("");
      setRemarks("");
      setPlateImagesCaptured(false);
    }
  };

  const handleCancelVerification = () => {
    cancelVerification();
    setPlateImagesCaptured(false);
    setVehicleRegNo("");
    toast({
      title: "Verification Cancelled",
      description: "Exit verification has been cancelled",
    });
  };

  const handlePrintSlip = () => {
    if (!activeVerification) return;
    const slip = generateExitSlip();
    if (slip) {
      window.print();
      toast({
        title: "Print Initiated",
        description: "Exit verification slip sent to printer",
      });
    }
  };

  const handleExportSlip = () => {
    if (!activeVerification) return;
    const slip = generateExitSlip();
    if (slip) {
      const blob = new Blob([JSON.stringify(slip, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `exit-slip-${activeVerification.verificationId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Export Complete",
        description: "Exit verification data exported",
      });
    }
  };

  const handleViewDetails = (verification: ExitVerificationType) => {
    setSelectedVerification(verification);
    setDetailsDialogOpen(true);
  };

  const comparison = compareWeights();

  // Compute verification steps
  const verificationSteps = useMemo(() => {
    if (!activeVerification) return [];
    return [
      {
        id: "start",
        label: "Start",
        completed: true,
        active: false,
      },
      {
        id: "weight",
        label: "Capture Weight",
        completed: activeVerification.exitWeight > 0,
        active: !activeVerification.exitWeight,
      },
      {
        id: "plates",
        label: "Plate Images",
        completed: plateImagesCaptured,
        active: activeVerification.exitWeight > 0 && !plateImagesCaptured,
      },
      {
        id: "complete",
        label: "Complete",
        completed: false,
        active: activeVerification.exitWeight > 0 && plateImagesCaptured,
      },
    ];
  }, [activeVerification, plateImagesCaptured]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LogOut className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Exit Verification</h1>
          <p className="text-muted-foreground">Final ANPR + exit weighment comparison</p>
        </div>
      </div>

      {lastEscalatedIncidentId && (
        <AnomalyEscalationBanner
          incidentId={lastEscalatedIncidentId}
          vehicleRegNo={verifications[0]?.vehicleRegNo || "MH12AB1234"}
          weightDifference={verifications[0]?.weightDifference || 1650}
        />
      )}

      {activeVerification && comparison && !comparison.withinTolerance && (
        <AnomalyEscalationBanner
          vehicleRegNo={activeVerification.vehicleRegNo}
          weightDifference={comparison.actualDifference}
        />
      )}

      {!activeVerification && (
        <Tabs defaultValue="lookup" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lookup">Vehicle Lookup</TabsTrigger>
            <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          </TabsList>
          <TabsContent value="lookup" className="mt-4">
            <VehicleLookup onSelectVehicle={handleSelectVehicleFromLookup} />
          </TabsContent>
          <TabsContent value="manual" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Start Exit Verification</CardTitle>
                <CardDescription>Enter vehicle details to begin exit verification manually</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicleRegNo">Vehicle Registration *</Label>
                  <Input
                    id="vehicleRegNo"
                    placeholder="e.g., MH12AB1234"
                    value={vehicleRegNo}
                    onChange={(e) => setVehicleRegNo(e.target.value.toUpperCase())}
                  />
                </div>
                <Button onClick={handleStartVerification} className="w-full" size="lg">
                  Start Exit Verification
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {activeVerification && (
        <>
          {/* Step Indicator */}
          <Card>
            <CardContent className="pt-6">
              <VerificationSteps steps={verificationSteps} />
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-6">
              <WeightDisplay reading={currentWeight} label="Exit Weight" />

              {activeVerification.exitWeight > 0 && comparison && (
                <WeightComparison comparison={comparison} />
              )}

              {activeVerification.exitWeight > 0 && (
                <ExitVerificationSummary 
                  verification={activeVerification} 
                  comparison={comparison} 
                />
              )}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Verification Control</CardTitle>
                  <CardDescription>Vehicle: {activeVerification.vehicleRegNo}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!activeVerification.exitWeight ? (
                    <>
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Position vehicle on weighbridge and capture exit weight
                        </AlertDescription>
                      </Alert>
                      <Button
                        onClick={handleCaptureWeight}
                        className="w-full"
                        size="lg"
                        disabled={!currentWeight.stable}
                      >
                        Capture Exit Weight
                      </Button>
                    </>
                  ) : (
                    <>
                      <Alert className={comparison?.withinTolerance ? "border-success" : "border-destructive"}>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {comparison?.withinTolerance
                            ? "Weight verification successful. Capture plate images and complete."
                            : "Weight anomaly detected. Add remarks and complete verification."}
                        </AlertDescription>
                      </Alert>

                      <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks {!comparison?.withinTolerance && "(Recommended)"}</Label>
                        <Textarea
                          id="remarks"
                          placeholder="Add any remarks or observations..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          rows={3}
                        />
                      </div>

                      <Button
                        onClick={handleCompleteVerification}
                        className="w-full"
                        size="lg"
                        variant={comparison?.withinTolerance ? "default" : "destructive"}
                      >
                        Complete Verification
                      </Button>

                      <div className="flex gap-2">
                        <Button
                          onClick={handlePrintSlip}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          <Printer className="h-4 w-4" />
                          Print Slip
                        </Button>
                        <Button
                          onClick={handleExportSlip}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Export
                        </Button>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={handleCancelVerification}
                    variant="outline"
                    className="w-full"
                  >
                    Cancel Verification
                  </Button>
                </CardContent>
              </Card>

              <PlateImageCapture
                vehicleRegNo={activeVerification.vehicleRegNo}
                onCapture={(images) => {
                  addPlateImages(images);
                  setPlateImagesCaptured(images.length === 2);
                  if (images.length === 2) {
                    toast({
                      title: "Plate Images Captured",
                      description: "Both front and back plate images captured",
                    });
                  }
                }}
                onPlateDetected={(detectedRegNo) => {
                  if (detectedRegNo !== activeVerification.vehicleRegNo) {
                    toast({
                      title: "Plate Mismatch Warning",
                      description: `Detected: ${detectedRegNo}, Expected: ${activeVerification.vehicleRegNo}`,
                      variant: "destructive",
                    });
                  }
                }}
              />
            </div>
          </div>
        </>
      )}

      <VerificationHistory 
        verifications={verifications.slice(0, 10)} 
        onViewDetails={handleViewDetails}
      />

      <VerificationDetailsDialog
        verification={selectedVerification}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </div>
  );
};

export default ExitVerification;
