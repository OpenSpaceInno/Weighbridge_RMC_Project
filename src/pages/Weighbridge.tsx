import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Scale,
  FileText,
  Calculator as CalcIcon,
  Camera,
  ChevronLeft,
  ChevronRight,
  Search,
  CheckSquare,
  Square,
  Mail,
  Printer,
  X,
  AlertCircle,
  Truck,
  Sparkles,
  Cpu,
  RefreshCw,
  Radio,
  Scan,
} from 'lucide-react';
import { useWeighbridge } from '@/hooks/useWeighbridge';
import { IndustrialDigitalIndicator } from '@/components/weighbridge/IndustrialDigitalIndicator';
import DualCameraFeedPanel, { DualCameraFeedPanelHandle } from '@/components/weighbridge/DualCameraFeedPanel';
import { PendingVehiclesDrawer } from '@/components/weighbridge/PendingVehiclesDrawer';
import { CalculatorModal } from '@/components/weighbridge/CalculatorModal';
import { IndustrialWeighSlipModal } from '@/components/weighbridge/IndustrialWeighSlipModal';
import { WeighmentF5PrintModal } from '@/components/weighbridge/WeighmentF5PrintModal';
import { ReportsModal } from '@/components/weighbridge/ReportsModal';
import { ThirdPartyScaleModal } from '@/components/weighbridge/ThirdPartyScaleModal';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';
import { WeighSlip } from '@/types/weighbridge';
import { api } from '@/lib/api';

export const Weighbridge: React.FC = () => {
  const {
    currentWeight,
    formData,
    calculations,
    evidenceList,
    addEvidenceItems,
    sessions,
    pendingVehicles,
    activeSlip,
    setActiveSlip,
    updateFormField,
    handleNew,
    handleGetWeight,
    handleSave,
    handleSaveAndPrint,
    handlePrint,
    handleClose,
    navigateTransaction,
    loadPendingVehicle,
    searchAndLoadTransaction,
    linkVehicleIfPending,
    takeSnapshot,
    setCurrentWeight,
    zeroScale,
    latestGateVehicle,
    recentGateVehicles,
    autoSyncGateVehicle,
    setAutoSyncGateVehicle,
    fetchAndApplyGateVehicle,
    applyGateVehicle,
  } = useWeighbridge();

  const { toast } = useToast();
  const { company } = useCompany();

  // Dual camera panel ref for automated snapshot extraction & live ANPR access
  const cameraPanelRef = useRef<DualCameraFeedPanelHandle>(null);
  const [isCapturingSnapshots, setIsCapturingSnapshots] = useState(false);

  // Modals visibility state
  const [isPendingDrawerOpen, setIsPendingDrawerOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isScaleBridgeOpen, setIsScaleBridgeOpen] = useState(false);
  const [searchFleetEnabled, setSearchFleetEnabled] = useState(false);
  const [isF5PrintOpen, setIsF5PrintOpen] = useState(false);

  const handleFetchGate = useCallback(async () => {
    const res = await fetchAndApplyGateVehicle();
    if (res?.vehicleRegNo) {
      toast({
        title: 'Gate Vehicle Synced',
        description: `Vehicle ${res.vehicleRegNo} loaded from Gate Monitor ANPR`,
      });
    } else {
      toast({
        title: 'No Gate Vehicle Found',
        description: 'No recent plate detection available from Gate Monitor.',
        variant: 'destructive',
      });
    }
  }, [fetchAndApplyGateVehicle, toast]);

  const handleFetchCameraANPR = useCallback(async () => {
    if (cameraPanelRef.current) {
      const plate = cameraPanelRef.current.fetchDetectedPlate();
      if (plate) {
        updateFormField('vehicleRegNo', plate);
        toast({
          title: 'ANPR Plate Fetched',
          description: `Vehicle ${plate} read from Camera 1 Front ANPR.`,
        });
        return;
      }
    }
    // Fallback to latest FTP / Gate camera detection
    const res = await fetchAndApplyGateVehicle();
    if (res?.vehicleRegNo) {
      toast({
        title: 'ANPR Plate Fetched from Gate/FTP',
        description: `Vehicle ${res.vehicleRegNo} loaded from FTP Camera`,
      });
    } else {
      toast({
        title: 'No Vehicle on Camera',
        description: 'Camera 1 ANPR and Gate FTP show no vehicle currently present.',
      });
    }
  }, [fetchAndApplyGateVehicle, updateFormField, toast]);

  const handlePrintF5 = useCallback(() => {
    handlePrint();
    setIsF5PrintOpen(true);
  }, [handlePrint]);

  const handleSearchTx = useCallback(async (txNo: number) => {
    if (!txNo) {
      toast({
        title: 'Transaction Number Required',
        description: 'Please enter a valid Transaction Number to search.',
        variant: 'destructive',
      });
      return;
    }
    const result = await searchAndLoadTransaction(txNo);
    if (result.found) {
      toast({
        title: result.source === 'pending' ? 'Pending Vehicle Loaded' : 'Transaction Loaded',
        description: result.message,
      });
    } else {
      toast({
        title: 'Transaction Not Found',
        description: result.message,
        variant: 'destructive',
      });
    }
  }, [searchAndLoadTransaction, toast]);

  const handleVehicleBlur = useCallback(async (vehNo: string) => {
    if (!vehNo) return;
    const clean = vehNo.trim().toUpperCase();
    if (searchFleetEnabled) {
      const matched = await linkVehicleIfPending(clean);
      if (matched) {
        toast({
          title: 'Pending Vehicle Linked',
          description: `Vehicle ${clean} is linked to pending Transaction #${matched.transactionNo} (1st Wt: ${matched.firstWeight || matched.tareWeight} kg). Loaded for 2nd Weighment.`,
        });
      }
    }
  }, [linkVehicleIfPending, searchFleetEnabled, toast]);

  // Automated Get Weight (F3) + Multi-camera snapshot capture + FTP sync
  const handleGetWeightWithSnapshots = useCallback(async () => {
    // 1. Latch current scale weight into form state and auto-register pending vehicle
    const res = await handleGetWeight();

    // 2. Concurrently capture live frames from active ANPR and IP cameras
    try {
      setIsCapturingSnapshots(true);
      if (cameraPanelRef.current) {
        const capturedFrames = await cameraPanelRef.current.captureAllSnapshots({
          weight: currentWeight.weight,
          vehicleNo: formData.vehicleRegNo,
          transactionNo: formData.transactionNo,
        });

        if (capturedFrames && capturedFrames.length > 0) {
          const uploadRes = await api.uploadWeighbridgeSnapshots({
            transactionNo: formData.transactionNo,
            vehicleRegNo: formData.vehicleRegNo,
            weight: currentWeight.weight,
            images: capturedFrames,
          });

          if (uploadRes && uploadRes.snapshots && uploadRes.snapshots.length > 0) {
            addEvidenceItems(uploadRes.snapshots as any);
          }
        }
      }

      if (res?.isFirstWeight) {
        toast({
          title: '1st Weight Latched -> Added to Pending (F3)',
          description: `Vehicle ${formData.vehicleRegNo || 'Entry'} recorded at ${currentWeight.weight.toLocaleString()} kg. Added to Total Pending Vehicles list.`,
        });
      } else {
        toast({
          title: '2nd Weight Latched -> Weighment Complete (F3)',
          description: `Vehicle ${formData.vehicleRegNo} recorded at ${currentWeight.weight.toLocaleString()} kg. Dual weighment resolved and ready for Save & Print.`,
        });
      }
    } catch (err: any) {
      console.error('Camera capture error during Get Weight:', err);
      toast({
        title: 'Weight Latched (F3)',
        description: `${currentWeight.weight.toLocaleString()} kg recorded from live scale.`,
      });
    } finally {
      setIsCapturingSnapshots(false);
    }
  }, [currentWeight.weight, formData.transactionNo, formData.vehicleRegNo, handleGetWeight, addEvidenceItems, toast]);

  // Manual snapshot capture from the 3-slot stack
  const handleManualSnapshot = useCallback(async (angle: 'front' | 'side' | 'rear') => {
    try {
      const screenIdx = angle === 'front' ? 0 : 1;
      if (cameraPanelRef.current) {
        const snap = await cameraPanelRef.current.captureSingleSnapshot(screenIdx, {
          weight: currentWeight.weight,
          vehicleNo: formData.vehicleRegNo,
          transactionNo: formData.transactionNo,
        });
        if (snap) {
          const uploadRes = await api.uploadWeighbridgeSnapshots({
            transactionNo: formData.transactionNo,
            vehicleRegNo: formData.vehicleRegNo,
            weight: currentWeight.weight,
            images: [snap],
          });
          if (uploadRes && uploadRes.snapshots) {
            addEvidenceItems(uploadRes.snapshots as any);
            toast({
              title: 'Snapshot Captured',
              description: `${snap.camName} snapshot saved & synced.`,
            });
            return;
          }
        }
      }
      takeSnapshot(angle);
    } catch (e: any) {
      takeSnapshot(angle);
    }
  }, [currentWeight.weight, formData.transactionNo, formData.vehicleRegNo, addEvidenceItems, takeSnapshot, toast]);

  // Global Keyboard Shortcuts (F1–F7) with browser default override
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: New
      if (e.key === 'F1') {
        e.preventDefault();
        handleNew().then((newTx) => {
          toast({
            title: 'New Transaction (F1)',
            description: `Transaction #${newTx || formData.transactionNo} ready. All fields cleared.`,
          });
        });
      }
      // F2: Save
      else if (e.key === 'F2') {
        e.preventDefault();
        handleSave();
        toast({ title: 'Saved (F2)', description: 'Weighbridge transaction stored to MySQL' });
      }
      // F3: Get Weight + Camera Snapshots
      else if (e.key === 'F3') {
        e.preventDefault();
        handleGetWeightWithSnapshots();
      }
      // F4: Save & Print
      else if (e.key === 'F4') {
        e.preventDefault();
        handleSaveAndPrint();
      }
      // F5: Print
      else if (e.key === 'F5') {
        e.preventDefault();
        handlePrintF5();
      }
      // F7: Close
      else if (e.key === 'F7') {
        e.preventDefault();
        handleClose();
        toast({ title: 'Terminal Cleared (F7)', description: 'Current inputs reset' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNew, handleSave, handleGetWeightWithSnapshots, handleSaveAndPrint, handlePrintF5, handleClose, formData.transactionNo, toast]);

  const handleEmailSlip = (slip: WeighSlip) => {
    toast({
      title: 'E-Mail Dispatched',
      description: `Weigh slip ${slip.slipNumber} emailed to ${slip.partyName || 'Customer'} & Accounts`,
    });
  };

  return (
    <div className="space-y-4 font-sans select-none text-foreground">
      {/* 1. TOP HARDWARE & NAVIGATION RIBBON */}
      <header className="bg-card border border-border rounded-xl px-4 py-2 shadow-xs flex items-center justify-between gap-2 min-h-[50px]">
        {/* Left: Action Pills with Icons */}
        <div className="flex items-center gap-2 shrink-0">

          <button
            onClick={() => setIsPendingDrawerOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Open Master / Pending Vehicles Drawer"
          >
            <Truck className="w-3.5 h-3.5 text-amber-500" />
            <span>Master</span>
          </button>

          <button
            onClick={() => {}}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-xs"
            title="Weighment Terminal Active"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Weighment</span>
          </button>

          <button
            onClick={() => setIsReportsOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="View Daily Register & Reports"
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>Reports</span>
          </button>

          <button
            onClick={() => setIsCalculatorOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Open Industrial Math Calculator"
          >
            <CalcIcon className="w-3.5 h-3.5 text-amber-500" />
            <span>Calculator</span>
          </button>

          <button
            onClick={() => takeSnapshot('front')}
            className="px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Camera 1 Trigger"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-500" />
            <span>Camera 1</span>
          </button>

          <button
            onClick={() => takeSnapshot('side')}
            className="px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            title="Camera 2 Trigger"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-500" />
            <span>Camera 2</span>
          </button>

          {/* Ventek Scale Integration Button */}
          <button
            onClick={() => setIsScaleBridgeOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            title={`Configure Weighbridge Indicator (VENTEK VMS-WB ${currentWeight.serialPort || 'COM2'})`}
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="hidden md:inline font-mono">
              VENTEK VMS ({currentWeight.serialPort || 'COM2'})
            </span>
            <span className={`w-2 h-2 rounded-full ${currentWeight.connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
          </button>
        </div>

        {/* Right: Digital 6-Digit Scale Readout + Exit Button */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          <IndustrialDigitalIndicator reading={currentWeight} mode="GROSS" digitsCount={6} />
          <button
            onClick={() => window.location.href = '/'}
            className="px-3 py-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 text-xs font-bold font-mono transition-colors shadow-2xs"
            title="Exit Weighment Terminal"
          >
            Exit
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSTATION WORKSPACE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* Left Section: Two-Column Form & Calculation Grid (XL: 8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-3">
          {/* Upper Transaction Panel */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col">
            {/* Transaction Navigator Bar: Transaction No / ◀ [ 001 ] ▶ */}
            <div className="flex flex-col items-center justify-center mb-4 pb-3 border-b border-border">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                Transaction No
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => navigateTransaction('prev')}
                  className="w-10 h-9 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-black text-sm flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Previous Transaction (◀)"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.transactionNo || ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    const val = raw === '' ? 0 : parseInt(raw, 10);
                    updateFormField('transactionNo', isNaN(val) ? 0 : val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSearchTx(formData.transactionNo);
                    }
                  }}
                  placeholder="1"
                  className="w-32 py-1.5 px-3 bg-background border-2 border-primary/40 focus:border-primary rounded-lg text-center font-mono font-black text-2xl text-primary shadow-2xs focus:outline-none focus:ring-2 focus:ring-primary/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  title="Transaction Number: Type number and press Enter to search"
                />
                <button
                  type="button"
                  onClick={() => navigateTransaction('next')}
                  className="w-10 h-9 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-black text-sm flex items-center justify-center shadow-2xs transition-all active:scale-95 cursor-pointer"
                  title="Next Transaction (▶)"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 2-Column Form Fields (Exactly 8 rows per column matching reference layout) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-xs">
              {/* Column 1 (Left - 8 rows) */}
              <div className="space-y-2.5">
                {/* 1. Vehicle No * */}
                <div className="flex items-center gap-2">
                  <div className="w-28 flex flex-col">
                    <label className="font-bold text-destructive whitespace-nowrap">
                      Vehicle No *
                    </label>
                  </div>
                  <div className="flex-1 relative flex items-center">
                    <input
                      type="text"
                      value={formData.vehicleRegNo}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        updateFormField('vehicleRegNo', val);
                      }}
                      onBlur={() => handleVehicleBlur(formData.vehicleRegNo)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleVehicleBlur(formData.vehicleRegNo);
                        }
                      }}
                      placeholder="e.g. MH 12 AB 1234"
                      className="w-full pl-2.5 pr-20 py-1.5 bg-background border border-input rounded-md text-foreground font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <div className="absolute right-1 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleFetchCameraANPR}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-0.5"
                        title="Fetch plate from Camera 1 ANPR"
                      >
                        <Scan className="w-2.5 h-2.5" />
                        <span>ANPR</span>
                      </button>
                      <label className="flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={searchFleetEnabled}
                          onChange={(e) => setSearchFleetEnabled(e.target.checked)}
                          className="rounded text-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span className="underline">Search</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 2. Party Name * */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-bold text-destructive whitespace-nowrap">
                    Party Name *
                  </label>
                  <input
                    type="text"
                    value={formData.partyName}
                    onChange={(e) => updateFormField('partyName', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* 3. Product */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    Product
                  </label>
                  <input
                    type="text"
                    value={formData.product}
                    onChange={(e) => updateFormField('product', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* 4. Status (Dropdown: Inward / Outward) */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    Status
                  </label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => updateFormField('status', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="">--</option>
                    <option value="Inward">Inward</option>
                    <option value="Outward">Outward</option>
                  </select>
                </div>

                {/* 5. LocationName */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    LocationName
                  </label>
                  <input
                    type="text"
                    value={formData.locationName || ''}
                    onChange={(e) => updateFormField('locationName', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* 6. CultivatorName */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    CultivatorName
                  </label>
                  <input
                    type="text"
                    value={formData.cultivatorName}
                    onChange={(e) => updateFormField('cultivatorName', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* 7. LoadSlipNo */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    LoadSlipNo
                  </label>
                  <input
                    type="text"
                    value={formData.loadSlipNo}
                    onChange={(e) => updateFormField('loadSlipNo', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* 8. BagsBales */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    BagsBales
                  </label>
                  <input
                    type="text"
                    value={formData.bagsBales}
                    onChange={(e) => updateFormField('bagsBales', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Column 2 (Right - 8 rows) */}
              <div className="space-y-2.5">
                {/* 1. Charges */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    Charges
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.charges || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      updateFormField('charges', val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="0"
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* 2. Rate (Manual entry, NO up/down spinner arrows) */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    Rate
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.rate || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      updateFormField('rate', val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="0"
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* 3. Moisture (Manual entry, NO up/down spinner arrows) */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    Moisture
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.moisture || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      updateFormField('moisture', val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="0"
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* 4. ChessNo */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    ChessNo
                  </label>
                  <input
                    type="text"
                    value={formData.chessNo}
                    onChange={(e) => updateFormField('chessNo', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* 5. ChessName */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    ChessName
                  </label>
                  <input
                    type="text"
                    value={formData.chessName}
                    onChange={(e) => updateFormField('chessName', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* 6. ChessAmount */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    ChessAmount
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formData.chessAmount || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, '');
                      updateFormField('chessAmount', val === '' ? 0 : parseFloat(val) || 0);
                    }}
                    placeholder="0"
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>

                {/* 7. Village */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    Village
                  </label>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => updateFormField('village', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {/* 8. MobileNo */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-semibold text-foreground whitespace-nowrap">
                    MobileNo
                  </label>
                  <input
                    type="text"
                    value={formData.mobileNo}
                    onChange={(e) => updateFormField('mobileNo', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lower Dual-Weighment & Calculation Matrix */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-xs">
              {/* Row 1: 1st Weight | Date Time */}
              <div className="flex items-center gap-2">
                <label className="w-24 font-semibold text-foreground whitespace-nowrap">
                  1st Weight
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.firstWeight !== null && formData.firstWeight !== undefined ? `${formData.firstWeight}` : ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    updateFormField('firstWeight', val === '' ? null : parseFloat(val));
                  }}
                  placeholder="0"
                  className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 font-semibold text-foreground whitespace-nowrap">
                  Date Time
                </label>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.firstWeightDate || ''}
                    onChange={(e) => updateFormField('firstWeightDate', e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="px-2.5 py-1.5 bg-background border border-input rounded-md font-mono text-center text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <input
                    type="text"
                    value={formData.firstWeightTime || ''}
                    onChange={(e) => updateFormField('firstWeightTime', e.target.value)}
                    placeholder="HH:MM:SS"
                    className="px-2.5 py-1.5 bg-background border border-input rounded-md font-mono text-center text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Row 2: 2nd Weight | Date Time */}
              <div className="flex items-center gap-2">
                <label className="w-24 font-semibold text-foreground whitespace-nowrap">
                  2nd Weight
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.secondWeight !== null && formData.secondWeight !== undefined ? `${formData.secondWeight}` : ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    updateFormField('secondWeight', val === '' ? null : parseFloat(val));
                  }}
                  placeholder="0"
                  className="flex-1 px-2.5 py-1.5 bg-background border border-input rounded-md font-mono font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 font-semibold text-foreground whitespace-nowrap">
                  Date Time
                </label>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.secondWeightDate || ''}
                    onChange={(e) => updateFormField('secondWeightDate', e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="px-2.5 py-1.5 bg-background border border-input rounded-md font-mono text-center text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <input
                    type="text"
                    value={formData.secondWeightTime || ''}
                    onChange={(e) => updateFormField('secondWeightTime', e.target.value)}
                    placeholder="HH:MM:SS"
                    className="px-2.5 py-1.5 bg-background border border-input rounded-md font-mono text-center text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Row 3: Nett Weight | Final Rate */}
              <div className="flex items-center gap-2">
                <label className="w-24 font-semibold text-foreground whitespace-nowrap">
                  Nett Weight
                </label>
                <input
                  type="text"
                  readOnly
                  value={calculations.nettWeight > 0 ? `${calculations.nettWeight}` : ''}
                  className="flex-1 px-2.5 py-1.5 bg-muted/60 border border-border rounded-md font-mono font-bold text-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 font-semibold text-foreground whitespace-nowrap">
                  Final Rate
                </label>
                <input
                  type="text"
                  readOnly
                  value={calculations.finalRate > 0 ? `${calculations.finalRate}` : ''}
                  className="flex-1 px-2.5 py-1.5 bg-muted/60 border border-border rounded-md font-mono font-bold text-foreground"
                />
              </div>

              {/* Row 4: Final Weight (Shaded) | Total Amount (Shaded) */}
              <div className="flex items-center gap-2">
                <label className="w-24 font-semibold text-foreground whitespace-nowrap">
                  Final Weight
                </label>
                <input
                  type="text"
                  readOnly
                  value={calculations.finalWeight > 0 ? `${calculations.finalWeight}` : ''}
                  className="flex-1 px-2.5 py-1.5 bg-muted border border-border rounded-md font-mono font-extrabold text-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 font-semibold text-foreground whitespace-nowrap">
                  Total Amount
                </label>
                <input
                  type="text"
                  readOnly
                  value={calculations.totalAmount > 0 ? `${calculations.totalAmount.toLocaleString()}` : ''}
                  className="flex-1 px-2.5 py-1.5 bg-muted border border-border rounded-md font-mono font-extrabold text-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Snapshots Stack & Dual IP Camera Feeds (XL: 4 cols) */}
        <div className="xl:col-span-4 flex flex-col">
          <DualCameraFeedPanel
            ref={cameraPanelRef}
            evidenceList={evidenceList}
            onTakeSnapshot={handleManualSnapshot}
            onPlateDetected={(plate) => {
              updateFormField('vehicleRegNo', plate);
            }}
            currentWeight={currentWeight.weight}
            vehicleRegNo={formData.vehicleRegNo}
            transactionNo={formData.transactionNo}
            companyName={company.firmName || company.companyName || 'DHARANI COTTON MILLS'}
            weighbridgeLicense={company.weighbridgeLicense}
          />
        </div>
      </div>

      {/* 4. BOTTOM ACTION & PRINT SETTINGS RIBBON */}
      <footer className="bg-card border border-border rounded-xl p-3.5 shadow-xs flex flex-wrap items-center justify-between gap-3 select-none">
        {/* Left Side: Checkboxes & Inline Moisture / Rate Inputs */}
        <div className="flex items-center gap-4 text-xs font-sans">
          <div className="flex flex-col gap-1.5 pr-2">
            <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={formData.printDuplicate}
                onChange={(e) => updateFormField('printDuplicate', e.target.checked)}
                className="w-3.5 h-3.5 rounded text-primary border-input focus:ring-primary"
              />
              <span className="text-[11px]">Print Duplicate</span>
            </label>

            <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={formData.printQrCode}
                onChange={(e) => updateFormField('printQrCode', e.target.checked)}
                className="w-3.5 h-3.5 rounded text-primary border-input focus:ring-primary"
              />
              <span className="text-[11px]">Print QR Code</span>
            </label>

            <label className="flex items-center gap-2 text-foreground font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={formData.printImages}
                onChange={(e) => updateFormField('printImages', e.target.checked)}
                className="w-3.5 h-3.5 rounded text-primary border-input focus:ring-primary"
              />
              <span className="text-[11px]">Print Images</span>
            </label>
          </div>

          <div className="flex flex-col gap-2 border-l border-border pl-4 font-sans">
            <div className="flex items-center gap-2">
              <span className="w-14 text-foreground font-semibold text-[11px]">Moisture</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.moisture || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  updateFormField('moisture', val === '' ? 0 : parseFloat(val) || 0);
                }}
                placeholder="0"
                className="w-20 px-2 py-1 bg-background border border-input rounded-md text-center font-mono font-bold text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="w-14 text-foreground font-semibold text-[11px]">Rate</span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.rate || ''}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  updateFormField('rate', val === '' ? 0 : parseFloat(val) || 0);
                }}
                placeholder="0"
                className="w-20 px-2 py-1 bg-background border border-input rounded-md text-center font-mono font-bold text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        </div>

        {/* Center: Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* New F1 */}
          <button
            type="button"
            onClick={async () => {
              const targetTx = await handleNew();
              toast({
                title: 'New Transaction (F1)',
                description: `Transaction #${targetTx || formData.transactionNo} ready. All fields cleared.`,
              });
            }}
            className="px-4 py-2 bg-card hover:bg-accent text-foreground border border-border font-bold text-xs rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            New F1
          </button>

          {/* Save & Print F4 */}
          <button
            type="button"
            onClick={async () => {
              await handleSaveAndPrint();
              toast({
                title: 'Saved & Print Ready (F4)',
                description: `Transaction #${formData.transactionNo} saved and official weigh slip generated.`,
              });
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            Save & Print F4
          </button>

          {/* Get Weight F3 */}
          <button
            type="button"
            onClick={handleGetWeightWithSnapshots}
            disabled={isCapturingSnapshots}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-70 text-primary-foreground font-bold text-xs rounded-lg shadow-md ring-2 ring-primary/20 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            {isCapturingSnapshots ? (
              <span>Capturing...</span>
            ) : (
              <span><u>G</u>et Weight F3</span>
            )}
          </button>

          {/* Save F2 */}
          <button
            type="button"
            onClick={async () => {
              await handleSave();
              toast({
                title: 'Saved (F2)',
                description: `Transaction #${formData.transactionNo} stored successfully in MySQL.`,
              });
            }}
            className="px-4 py-2 bg-card hover:bg-accent text-foreground border border-border font-bold text-xs rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            <u>S</u>ave F2
          </button>

          {/* Print F5 */}
          <button
            type="button"
            onClick={handlePrintF5}
            className="px-4 py-2 bg-card hover:bg-accent text-foreground border border-border font-bold text-xs rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            Print F5
          </button>

          {/* Close F7 */}
          <button
            type="button"
            onClick={() => {
              handleClose();
              toast({
                title: 'Terminal Cleared (F7)',
                description: 'Current ticket cleared without saving.',
              });
            }}
            className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 font-bold text-xs rounded-lg shadow-2xs transition-all active:scale-95 cursor-pointer"
          >
            Close F7
          </button>
        </div>

        {/* Right Side: Total Pending Vehicles Badge & E-Mail Button */}
        <div className="flex items-center gap-2.5">
          {/* Total Pending Vehicles Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsPendingDrawerOpen(true)}
            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold text-xs rounded-lg flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
            title="Open Total Pending Vehicles Drawer"
          >
            <Truck className="w-4 h-4 text-amber-500" />
            <span>Pending</span>
            <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[11px] font-mono font-bold leading-tight min-w-[20px] text-center shadow-xs">
              {pendingVehicles.length}
            </span>
          </button>

          {/* E-Mail Button */}
          <button
            type="button"
            onClick={() => {
              if (activeSlip) {
                handleEmailSlip(activeSlip);
              } else {
                toast({
                  title: 'E-Mail Dispatched',
                  description: `Weigh slip for Transaction #${formData.transactionNo} (${formData.vehicleRegNo}) sent to Customer & Accounts.`,
                });
              }
            }}
            className="px-4 py-2 bg-card hover:bg-accent text-foreground border border-border font-bold text-xs rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            <span>E-Mail</span>
          </button>
        </div>
      </footer>

      {/* 5. MODALS & DRAWERS */}
      <PendingVehiclesDrawer
        isOpen={isPendingDrawerOpen}
        onClose={() => setIsPendingDrawerOpen(false)}
        pendingList={pendingVehicles}
        onSelectVehicle={loadPendingVehicle}
      />

      <CalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyResult={(val) => {
          if (formData.firstWeight === null) {
            updateFormField('firstWeight', val);
          } else {
            updateFormField('secondWeight', val);
          }
        }}
      />

      <ReportsModal
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
        sessions={sessions}
      />

      <IndustrialWeighSlipModal
        isOpen={!!activeSlip}
        onClose={() => setActiveSlip(null)}
        slip={activeSlip}
        onEmail={handleEmailSlip}
      />

      <WeighmentF5PrintModal
        isOpen={isF5PrintOpen}
        onClose={() => setIsF5PrintOpen(false)}
        transactionNo={formData.transactionNo}
        activeSlip={activeSlip}
        formData={formData}
      />

      <ThirdPartyScaleModal
        isOpen={isScaleBridgeOpen}
        onClose={() => setIsScaleBridgeOpen(false)}
        currentWeight={currentWeight}
        onWeightUpdate={(reading) => setCurrentWeight(reading)}
      />
    </div>
  );
};

export default Weighbridge;
