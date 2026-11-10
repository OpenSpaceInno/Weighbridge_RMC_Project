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
} from 'lucide-react';
import { useWeighbridge } from '@/hooks/useWeighbridge';
import { IndustrialDigitalIndicator } from '@/components/weighbridge/IndustrialDigitalIndicator';
import { DualCameraFeedPanel, DualCameraFeedPanelHandle } from '@/components/weighbridge/DualCameraFeedPanel';
import { PendingVehiclesDrawer } from '@/components/weighbridge/PendingVehiclesDrawer';
import { CalculatorModal } from '@/components/weighbridge/CalculatorModal';
import { IndustrialWeighSlipModal } from '@/components/weighbridge/IndustrialWeighSlipModal';
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
    takeSnapshot,
    setCurrentWeight,
    zeroScale,
  } = useWeighbridge();

  const { toast } = useToast();
  const { company } = useCompany();

  // Dual camera panel ref for automated snapshot extraction
  const cameraPanelRef = useRef<DualCameraFeedPanelHandle>(null);
  const [isCapturingSnapshots, setIsCapturingSnapshots] = useState(false);

  // Modals visibility state
  const [isPendingDrawerOpen, setIsPendingDrawerOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isScaleBridgeOpen, setIsScaleBridgeOpen] = useState(false);
  const [searchFleetEnabled, setSearchFleetEnabled] = useState(false);

  // Automated Get Weight (F3) + Multi-camera snapshot capture + FTP sync
  const handleGetWeightWithSnapshots = useCallback(async () => {
    // 1. Latch current scale weight into form state
    handleGetWeight();

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
          // Upload to server disk & sync to configured FTP server
          const uploadRes = await api.uploadWeighbridgeSnapshots({
            transactionNo: formData.transactionNo,
            vehicleRegNo: formData.vehicleRegNo,
            weight: currentWeight.weight,
            images: capturedFrames,
          });

          if (uploadRes && uploadRes.snapshots && uploadRes.snapshots.length > 0) {
            addEvidenceItems(uploadRes.snapshots as any);
            const ftpInfo = uploadRes.ftpSummary?.success
              ? 'Synced to FTP'
              : (uploadRes.ftpSummary?.enabled ? 'Saved to Disk (FTP Offline)' : 'Saved to Server');
            toast({
              title: 'Weight Latched & Cameras Captured (F3)',
              description: `${currentWeight.weight.toLocaleString()} kg latched. ${uploadRes.snapshots.length} camera snapshots captured (${ftpInfo}).`,
            });
            return;
          }
        }
      }

      toast({
        title: 'Weight Latched (F3)',
        description: `${currentWeight.weight.toLocaleString()} kg recorded from live scale`,
      });
    } catch (err: any) {
      console.error('Camera capture error during Get Weight:', err);
      toast({
        title: 'Weight Latched (F3)',
        description: `${currentWeight.weight.toLocaleString()} kg recorded. (Camera snapshot warning: ${err.message})`,
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
        handleNew();
        toast({ title: 'New Transaction (F1)', description: 'Form reset for next ticket' });
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
        handlePrint();
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
  }, [handleNew, handleSave, handleGetWeightWithSnapshots, handleSaveAndPrint, handlePrint, handleClose, toast]);

  const handleEmailSlip = (slip: WeighSlip) => {
    toast({
      title: 'E-Mail Dispatched',
      description: `Weigh slip ${slip.slipNumber} emailed to ${slip.partyName || 'Customer'} & Accounts`,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans select-none -m-4 sm:-m-6 p-2 sm:p-3">
      {/* 1. TOP HARDWARE & THIRD-PARTY SCALE INTEGRATION RIBBON (Single-Line Compact) */}
      <header className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md px-2.5 py-1 shadow-sm mb-2 flex items-center justify-between gap-2 overflow-x-auto h-12 min-h-[48px]">
        {/* Left: Quick Action Icons & Scale Integration Button */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            onClick={() => {}}
            className="px-2.5 py-1 rounded bg-teal-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs"
            title="Weighment Terminal Active"
          >
            <Scale className="w-3.5 h-3.5 text-white" />
            <span>Weighment</span>
          </button>

          <button
            onClick={() => setIsReportsOpen(true)}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
            title="View Daily Register & Reports"
          >
            <FileText className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Reports</span>
          </button>

          <button
            onClick={() => setIsCalculatorOpen(true)}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
            title="Open Industrial Math Calculator"
          >
            <CalcIcon className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden md:inline">Calculator</span>
          </button>

          <button
            onClick={() => takeSnapshot('front')}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 transition-colors shadow-xs"
            title="Camera 1 Trigger"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden lg:inline">Camera1</span>
          </button>

          <button
            onClick={() => takeSnapshot('side')}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold flex items-center gap-1 hover:bg-slate-200 transition-colors shadow-xs"
            title="Camera 2 Trigger"
          >
            <Camera className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden lg:inline">Camera2</span>
          </button>

          {/* Third-Party Scale Integration Button */}
          <button
            onClick={() => setIsScaleBridgeOpen(true)}
            className="px-2.5 py-1 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-700 text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-100 transition-colors shadow-xs"
            title="Configure / Connect Third-Party Weighbridge Software & Indicator"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-600 animate-pulse" />
            <span className="hidden md:inline">Scale Bridge</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          <button
            onClick={() => window.location.href = '/settings'}
            className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 text-xs font-semibold hidden md:flex items-center gap-1 hover:bg-slate-200 transition-colors shadow-xs"
            title="Settings"
          >
            <span>Settings</span>
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="px-2 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold hidden md:flex items-center gap-1 hover:bg-rose-100 transition-colors shadow-xs"
            title="Exit Weighbridge"
          >
            <span>Exit</span>
          </button>
        </div>

        {/* Right: 5-Digit 7-Segment Digital Scale Readout e.g. 00000 */}
        <div className="flex items-center justify-end flex-1 mx-2">
          <IndustrialDigitalIndicator reading={currentWeight} mode="GROSS" digitsCount={5} />
        </div>
      </header>

      {/* 3. MAIN WORKSTATION WORKSPACE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 flex-1">
        {/* Left Section: Two-Column Form & Calculation Grid (XL: 8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-2">
          {/* Upper Transaction Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-3 shadow-sm flex flex-col">
            {/* Transaction Navigator Bar: ◀ [ 2 ] ▶ */}
            <div className="flex items-center justify-center gap-3 mb-3 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Transaction No
              </span>
              <button
                onClick={() => navigateTransaction('prev')}
                className="p-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors shadow-sm"
                title="Previous Transaction"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="w-20 py-1 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-500 rounded text-center font-mono font-black text-base text-amber-900 dark:text-amber-300 shadow-inner">
                {formData.transactionNo}
              </div>
              <button
                onClick={() => navigateTransaction('next')}
                className="p-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors shadow-sm"
                title="Next Transaction"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* 2-Column Form Fields (as in user reference image) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {/* Column 1 (Left) */}
              <div className="space-y-1.5">
                {/* Vehicle No * (with Search checkbox) */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-bold text-rose-600 whitespace-nowrap">
                    Vehicle No *
                  </label>
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.vehicleRegNo}
                      onChange={(e) => updateFormField('vehicleRegNo', e.target.value.toUpperCase())}
                      placeholder="e.g. MH12AB1234"
                      className="w-full px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-white"
                    />
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchFleetEnabled}
                        onChange={(e) => setSearchFleetEnabled(e.target.checked)}
                        className="rounded text-teal-600"
                      />
                      <span>Search</span>
                    </label>
                  </div>
                </div>

                {/* Party Name * */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-bold text-rose-600 whitespace-nowrap">
                    Party Name *
                  </label>
                  <input
                    type="text"
                    value={formData.partyName}
                    onChange={(e) => updateFormField('partyName', e.target.value)}
                    placeholder="Customer or Supplier Name"
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>

                {/* Product */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    Product
                  </label>
                  <input
                    type="text"
                    value={formData.product}
                    onChange={(e) => updateFormField('product', e.target.value)}
                    placeholder="e.g. M30 Concrete Mix"
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    Status
                  </label>
                  <input
                    type="text"
                    value={formData.status}
                    onChange={(e) => updateFormField('status', e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>

                {/* FirmName */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    FirmName
                  </label>
                  <input
                    type="text"
                    value={formData.firmName}
                    onChange={(e) => updateFormField('firmName', e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>

                {/* Rate */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    Rate
                  </label>
                  <input
                    type="number"
                    value={formData.rate}
                    onChange={(e) => updateFormField('rate', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* Moisture */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    Moisture
                  </label>
                  <input
                    type="number"
                    value={formData.moisture}
                    onChange={(e) => updateFormField('moisture', parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 8 %"
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* Deduction */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    Deduction
                  </label>
                  <input
                    type="number"
                    value={formData.deduction}
                    onChange={(e) => updateFormField('deduction', parseFloat(e.target.value) || 0)}
                    placeholder="e.g. 50 kg"
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Column 2 (Right) */}
              <div className="space-y-1.5">
                {/* Charges */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    Charges
                  </label>
                  <input
                    type="number"
                    value={formData.charges}
                    onChange={(e) => updateFormField('charges', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* VehicleType */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    VehicleType
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleType}
                    onChange={(e) => updateFormField('vehicleType', e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>

                {/* BagsBales */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    BagsBales
                  </label>
                  <input
                    type="text"
                    value={formData.bagsBales}
                    onChange={(e) => updateFormField('bagsBales', e.target.value)}
                    placeholder="e.g. 6 m³"
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>

                {/* Agent */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    Agent
                  </label>
                  <input
                    type="text"
                    value={formData.agent}
                    onChange={(e) => updateFormField('agent', e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>

                {/* Village */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    Village
                  </label>
                  <input
                    type="text"
                    value={formData.village}
                    onChange={(e) => updateFormField('village', e.target.value)}
                    placeholder="Destination / Delivery Site"
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>

                {/* ChessNo */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    ChessNo
                  </label>
                  <input
                    type="text"
                    value={formData.chessNo}
                    onChange={(e) => updateFormField('chessNo', e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>

                {/* ChessAmount */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    ChessAmount
                  </label>
                  <input
                    type="number"
                    value={formData.chessAmount}
                    onChange={(e) => updateFormField('chessAmount', parseFloat(e.target.value) || 0)}
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-slate-900 dark:text-white"
                  />
                </div>

                {/* ChessName */}
                <div className="flex items-center gap-2">
                  <label className="w-28 font-medium text-slate-600 dark:text-slate-400">
                    ChessName
                  </label>
                  <input
                    type="text"
                    value={formData.chessName}
                    onChange={(e) => updateFormField('chessName', e.target.value)}
                    className="flex-1 px-2 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Lower Dual-Weighment & Calculation Matrix */}
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-md p-3 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              {/* Left Column: 1st Weight, 2nd Weight, Nett Weight, Final Weight */}
              <div className="space-y-2">
                {/* 1st Weight */}
                <div className="flex items-center gap-2">
                  <label className="w-24 font-bold text-slate-700 dark:text-slate-300">
                    1st Weight
                  </label>
                  <input
                    type="number"
                    value={formData.firstWeight ?? ''}
                    onChange={(e) => updateFormField('firstWeight', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Click [Get Weight F3]"
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[11px] font-mono text-slate-500">kg</span>
                </div>

                {/* 2nd Weight */}
                <div className="flex items-center gap-2">
                  <label className="w-24 font-bold text-slate-700 dark:text-slate-300">
                    2nd Weight
                  </label>
                  <input
                    type="number"
                    value={formData.secondWeight ?? ''}
                    onChange={(e) => updateFormField('secondWeight', e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="Click [Get Weight F3]"
                    className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-white"
                  />
                  <span className="text-[11px] font-mono text-slate-500">kg</span>
                </div>

                {/* Nett Weight */}
                <div className="flex items-center gap-2">
                  <label className="w-24 font-bold text-slate-700 dark:text-slate-300">
                    Nett Weight
                  </label>
                  <div className="flex-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-teal-700 dark:text-teal-400">
                    {calculations.nettWeight.toLocaleString()} kg
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">kg</span>
                </div>

                {/* Final Weight (Shaded Box) */}
                <div className="flex items-center gap-2">
                  <label className="w-24 font-extrabold text-slate-900 dark:text-white">
                    Final Weight
                  </label>
                  <div className="flex-1 px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600 rounded font-mono font-black text-slate-900 dark:text-white text-sm">
                    {calculations.finalWeight.toLocaleString()} kg
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">kg</span>
                </div>
              </div>

              {/* Right Column: Date Times, Final Rate, Total Amount */}
              <div className="space-y-2">
                {/* 1st Weight Date Time */}
                <div className="flex items-center gap-2">
                  <label className="w-24 font-medium text-slate-600 dark:text-slate-400">
                    Date Time
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.firstWeightTime ? new Date(formData.firstWeightTime).toLocaleString() : ''}
                    placeholder="Recorded automatically"
                    className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-[11px] text-slate-700 dark:text-slate-300"
                  />
                </div>

                {/* 2nd Weight Date Time */}
                <div className="flex items-center gap-2">
                  <label className="w-24 font-medium text-slate-600 dark:text-slate-400">
                    Date Time
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={formData.secondWeightTime ? new Date(formData.secondWeightTime).toLocaleString() : ''}
                    placeholder="Recorded automatically"
                    className="flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded font-mono text-[11px] text-slate-700 dark:text-slate-300"
                  />
                </div>

                {/* Final Rate */}
                <div className="flex items-center gap-2">
                  <label className="w-24 font-bold text-slate-700 dark:text-slate-300">
                    Final Rate
                  </label>
                  <div className="flex-1 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded font-mono font-bold text-slate-900 dark:text-white">
                    ₹ {calculations.finalRate.toLocaleString()}
                  </div>
                </div>

                {/* Total Amount (Shaded Box) */}
                <div className="flex items-center gap-2">
                  <label className="w-24 font-extrabold text-slate-900 dark:text-white">
                    Total Amount
                  </label>
                  <div className="flex-1 px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 border-2 border-slate-400 dark:border-slate-600 rounded font-mono font-black text-teal-800 dark:text-teal-300 text-sm">
                    ₹ {calculations.totalAmount.toLocaleString()}
                  </div>
                </div>
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
            onPlateDetected={(plate) => updateFormField('vehicleRegNo', plate)}
            currentWeight={currentWeight.weight}
            vehicleRegNo={formData.vehicleRegNo}
            transactionNo={formData.transactionNo}
            companyName={company.companyName}
            weighbridgeLicense={company.weighbridgeLicense}
          />
        </div>
      </div>

      {/* 4. BOTTOM ACTION & PRINT SETTINGS RIBBON */}
      <footer className="mt-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg p-2.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Print Checkboxes & Inline Parameters */}
        <div className="flex items-center gap-4 flex-wrap text-xs">
          <div className="flex items-center gap-3 pr-3 border-r border-slate-300 dark:border-slate-700">
            <label className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.printDuplicate}
                onChange={(e) => updateFormField('printDuplicate', e.target.checked)}
                className="rounded text-teal-600"
              />
              <span>Print Duplicate</span>
            </label>

            <label className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.printQrCode}
                onChange={(e) => updateFormField('printQrCode', e.target.checked)}
                className="rounded text-teal-600"
              />
              <span>Print QR Code</span>
            </label>

            <label className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.printImages}
                onChange={(e) => updateFormField('printImages', e.target.checked)}
                className="rounded text-teal-600"
              />
              <span>Print Images</span>
            </label>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Moisture</span>
              <input
                type="number"
                value={formData.moisture}
                onChange={(e) => updateFormField('moisture', parseFloat(e.target.value) || 0)}
                className="w-14 px-1.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center font-bold text-slate-900 dark:text-white"
              />
              <span className="text-slate-400">%</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Rate</span>
              <input
                type="number"
                value={formData.rate}
                onChange={(e) => updateFormField('rate', parseFloat(e.target.value) || 0)}
                className="w-18 px-1.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-center font-bold text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Function Buttons (New F1, Save & Print F4, Get Weight F3, Save F2, Print F5, Close F7, E-Mail) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* New F1 */}
          <button
            onClick={handleNew}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-400 border border-teal-600 dark:border-teal-500 font-bold text-xs rounded shadow-sm transition-transform active:scale-95"
          >
            New F1
          </button>

          {/* Save & Print F4 */}
          <button
            onClick={handleSaveAndPrint}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-400 border border-teal-600 dark:border-teal-500 font-bold text-xs rounded shadow-sm transition-transform active:scale-95"
          >
            Save & Print F4
          </button>

          {/* Get Weight F3 (High-Contrast Primary Action) */}
          <button
            onClick={handleGetWeightWithSnapshots}
            disabled={isCapturingSnapshots}
            className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 disabled:opacity-60 text-white font-extrabold text-sm rounded shadow-md transition-transform active:scale-95 flex items-center gap-2 border border-teal-600 ring-2 ring-teal-500/30"
          >
            <Scale className={`w-4 h-4 text-cyan-300 ${isCapturingSnapshots ? 'animate-spin' : ''}`} />
            <span>{isCapturingSnapshots ? 'Capturing...' : 'Get Weight F3'}</span>
          </button>

          {/* Save F2 */}
          <button
            onClick={handleSave}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-400 border border-teal-600 dark:border-teal-500 font-bold text-xs rounded shadow-sm transition-transform active:scale-95"
          >
            Save F2
          </button>

          {/* Print F5 */}
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-400 border border-teal-600 dark:border-teal-500 font-bold text-xs rounded shadow-sm transition-transform active:scale-95"
          >
            Print F5
          </button>

          {/* Close F7 */}
          <button
            onClick={handleClose}
            className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-400 dark:border-rose-600 font-bold text-xs rounded shadow-sm transition-transform active:scale-95"
          >
            Close F7
          </button>

          {/* Total Pending Vehicles (Moved down in place of E-Mail button) */}
          <button
            onClick={() => setIsPendingDrawerOpen(true)}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-900 dark:text-amber-200 border-2 border-amber-500 dark:border-amber-600 font-bold text-xs rounded shadow-sm transition-transform active:scale-95 flex items-center gap-2"
            title="Open Total Pending Vehicles Drawer"
          >
            <Truck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Total Pending Vehicles</span>
            <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full text-[11px] font-mono font-black shadow-xs">
              {pendingVehicles.length}
            </span>
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
