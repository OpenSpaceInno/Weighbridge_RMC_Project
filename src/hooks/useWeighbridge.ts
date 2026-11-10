import { useState, useEffect, useCallback, useMemo } from 'react';
import { WeightReading, WeighbridgeSession, WeighSlip, Evidence, PrintOptions } from '@/types/weighbridge';
import { api } from '@/lib/api';

const STORAGE_KEY_SESSIONS = 'rmc_weighbridge_data';

export interface TerminalFormData {
  transactionNo: number;
  vehicleRegNo: string;
  partyName: string;
  product: string;
  status: string;
  firmName: string;
  rate: number;
  moisture: number;
  deduction: number;
  charges: number;
  vehicleType: string;
  bagsBales: string;
  agent: string;
  village: string;
  chessNo: string;
  chessAmount: number;
  chessName: string;
  firstWeight: number | null;
  firstWeightTime: string | null;
  secondWeight: number | null;
  secondWeightTime: string | null;
  printDuplicate: boolean;
  printQrCode: boolean;
  printImages: boolean;
}

const initialForm: TerminalFormData = {
  transactionNo: 2,
  vehicleRegNo: 'MH12AB1234',
  partyName: 'BuildCorp Infra Ltd',
  product: 'M30 Concrete Mix',
  status: 'In-Process',
  firmName: 'Dharani Cotton Mills / Aparna RMC',
  rate: 7520,
  moisture: 8,
  deduction: 50,
  charges: 250,
  vehicleType: 'Transit Mixer 6m³',
  bagsBales: '6 m³',
  agent: 'Rajesh Kumar',
  village: 'Wakad Site 4',
  chessNo: 'CH-8821',
  chessAmount: 0,
  chessName: 'Panchayat Cess',
  firstWeight: null,
  firstWeightTime: null,
  secondWeight: null,
  secondWeightTime: null,
  printDuplicate: false,
  printQrCode: true,
  printImages: true,
};

export const useWeighbridge = () => {
  const [currentWeight, setCurrentWeight] = useState<WeightReading>({
    timestamp: new Date().toISOString(),
    weight: 0,
    unit: 'kg',
    stable: true,
    zero: true,
  });

  const [formData, setFormData] = useState<TerminalFormData>(initialForm);
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([
    {
      id: 'ev-1',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=300&auto=format&fit=crop&q=60',
      angle: 'front',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'ev-2',
      type: 'image',
      url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=300&auto=format&fit=crop&q=60',
      angle: 'side',
      timestamp: new Date().toISOString(),
    },
  ]);

  const [sessions, setSessions] = useState<WeighbridgeSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [pendingVehicles, setPendingVehicles] = useState<WeighbridgeSession[]>([]);
  const [activeSlip, setActiveSlip] = useState<WeighSlip | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load next transaction number and pending vehicles from MySQL
  const refreshTerminalData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [txRes, pendingRes, sessionsRes] = await Promise.all([
        api.getNextTransactionNo().catch(() => ({ nextTransactionNo: 2 })),
        api.getPendingVehicles().catch(() => []),
        api.getWeighbridgeSessions().catch(() => []),
      ]);

      if (txRes && txRes.nextTransactionNo) {
        setFormData((prev) => ({
          ...prev,
          transactionNo: prev.transactionNo || txRes.nextTransactionNo,
        }));
      }

      if (Array.isArray(pendingRes)) {
        setPendingVehicles(pendingRes);
      }

      if (Array.isArray(sessionsRes) && sessionsRes.length > 0) {
        setSessions(sessionsRes);
        try {
          localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(sessionsRes));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Error fetching terminal data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTerminalData();
  }, [refreshTerminalData]);

  // Live Scale Telemetry: default is strictly 0 (displaying 00000).
  // Polls third-party scale software API/file/TCP monitor every 600ms.
  useEffect(() => {
    let active = true;

    const pollLiveScale = async () => {
      try {
        const reading = await api.getLiveScaleWeight();
        if (active && reading && typeof reading.weight === 'number') {
          setCurrentWeight({
            timestamp: reading.timestamp || new Date().toISOString(),
            weight: reading.weight,
            unit: reading.unit || 'kg',
            stable: reading.stable !== undefined ? reading.stable : true,
            zero: reading.weight === 0,
          });
        }
      } catch (err) {
        // If third party endpoint has not responded, keep zero reading (00000)
      }
    };

    pollLiveScale();
    const interval = setInterval(pollLiveScale, 600);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const zeroScale = useCallback(async () => {
    setCurrentWeight({
      timestamp: new Date().toISOString(),
      weight: 0,
      unit: 'kg',
      stable: true,
      zero: true,
    });
    try {
      await api.zeroScale();
    } catch (e) {}
  }, []);

  // Form field updater helper
  const updateFormField = useCallback(<K extends keyof TerminalFormData>(field: K, value: TerminalFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Automated Commercial Calculations
  const calculations = useMemo(() => {
    const { firstWeight, secondWeight, rate, moisture, deduction, charges, chessAmount } = formData;
    
    // Nett Weight = |1st Weight - 2nd Weight|
    const nettWeight = (firstWeight !== null && secondWeight !== null)
      ? Math.abs(secondWeight - firstWeight)
      : (firstWeight !== null ? firstWeight : 0);

    // Moisture deduction in kg = nettWeight * (moisture / 100)
    const moistureDeductionKg = Math.round(nettWeight * ((moisture || 0) / 100));

    // Final Weight = Nett - Physical Deduction - Moisture Deduction
    const finalWeight = Math.max(0, Math.round(nettWeight - (deduction || 0) - moistureDeductionKg));

    const finalRate = rate || 0;

    // Commercial Total Amount = ((Final Weight / 1000) * Final Rate) + Charges + Cess
    const weightInTons = finalWeight / 1000;
    const materialCost = Math.round(weightInTons * finalRate);
    const totalAmount = materialCost + (charges || 0) + (chessAmount || 0);

    return {
      nettWeight,
      moistureDeductionKg,
      finalWeight,
      finalRate,
      totalAmount,
    };
  }, [formData]);

  // F1: New Transaction
  const handleNew = useCallback(async () => {
    try {
      const res = await api.getNextTransactionNo();
      const nextTx = res?.nextTransactionNo || (formData.transactionNo + 1);
      setFormData({
        ...initialForm,
        transactionNo: nextTx,
        vehicleRegNo: '',
        partyName: '',
        firstWeight: null,
        firstWeightTime: null,
        secondWeight: null,
        secondWeightTime: null,
      });
    } catch {
      setFormData((prev) => ({
        ...initialForm,
        transactionNo: prev.transactionNo + 1,
        vehicleRegNo: '',
        partyName: '',
        firstWeight: null,
        firstWeightTime: null,
        secondWeight: null,
        secondWeightTime: null,
      }));
    }
  }, [formData.transactionNo]);

  // F3: Get Weight (Primary Action - Latches current scale weight)
  const handleGetWeight = useCallback(() => {
    const weightToLatch = currentWeight.weight;
    const nowIso = new Date().toISOString();

    setFormData((prev) => {
      // If 1st weight is not set, latch into 1st Weight
      if (prev.firstWeight === null) {
        return {
          ...prev,
          firstWeight: weightToLatch,
          firstWeightTime: nowIso,
          status: '1st_weight_complete',
        };
      }
      // If 1st weight is set and 2nd is not, latch into 2nd Weight
      if (prev.secondWeight === null) {
        return {
          ...prev,
          secondWeight: weightToLatch,
          secondWeightTime: nowIso,
          status: 'completed',
        };
      }
      // If both are set, update the 2nd weight
      return {
        ...prev,
        secondWeight: weightToLatch,
        secondWeightTime: nowIso,
        status: 'completed',
      };
    });
  }, [currentWeight.weight]);

  // Save session payload to MySQL
  const buildSessionPayload = useCallback((): WeighbridgeSession => {
    const printOptions: PrintOptions = {
      printDuplicate: formData.printDuplicate,
      printQrCode: formData.printQrCode,
      printImages: formData.printImages,
    };

    return {
      sessionId: `WB-TX-${formData.transactionNo}-${Date.now()}`,
      transactionNo: formData.transactionNo,
      vehicleRegNo: formData.vehicleRegNo || 'MH12AB1234',
      partyName: formData.partyName,
      firmName: formData.firmName,
      product: formData.product,
      material: formData.product,
      timestamp: new Date().toISOString(),
      firstWeight: formData.firstWeight,
      firstWeightTime: formData.firstWeightTime,
      secondWeight: formData.secondWeight,
      secondWeightTime: formData.secondWeightTime,
      tareWeight: formData.firstWeight,
      grossWeight: formData.secondWeight,
      netWeight: calculations.nettWeight,
      rate: formData.rate,
      moisture: formData.moisture,
      deduction: formData.deduction,
      charges: formData.charges,
      vehicleType: formData.vehicleType,
      bagsBales: formData.bagsBales,
      agent: formData.agent,
      village: formData.village,
      chessNo: formData.chessNo,
      chessAmount: formData.chessAmount,
      chessName: formData.chessName,
      finalRate: calculations.finalRate,
      totalAmount: calculations.totalAmount,
      printOptions,
      evidence: evidenceList,
      status: formData.secondWeight ? 'completed' : 'pending_2nd_weight',
      operatorId: 'OP001',
      operatorName: 'Weighbridge Operator',
    };
  }, [formData, calculations, evidenceList]);

  // F2: Save (without printing)
  const handleSave = useCallback(async () => {
    const payload = buildSessionPayload();
    try {
      await api.createWeighbridgeSession(payload);
      await refreshTerminalData();
      return payload;
    } catch (err) {
      console.error('Save session error:', err);
      return payload;
    }
  }, [buildSessionPayload, refreshTerminalData]);

  // F4: Save & Print (Commits session and shows weigh slip modal)
  const handleSaveAndPrint = useCallback(async () => {
    const session = await handleSave();
    const slipNumber = `SLIP-${new Date().getFullYear()}-${String(formData.transactionNo).padStart(4, '0')}`;
    
    const slip: WeighSlip = {
      slipNumber,
      sessionId: session.sessionId,
      transactionNo: session.transactionNo,
      vehicleRegNo: session.vehicleRegNo,
      partyName: session.partyName,
      firmName: session.firmName,
      product: session.product,
      material: session.material || '',
      dateTime: new Date().toISOString(),
      firstWeight: session.firstWeight || 0,
      firstWeightTime: session.firstWeightTime,
      secondWeight: session.secondWeight || 0,
      secondWeightTime: session.secondWeightTime,
      tareWeight: session.tareWeight || 0,
      grossWeight: session.grossWeight || 0,
      netWeight: session.netWeight || 0,
      rate: session.rate,
      moisture: session.moisture,
      deduction: session.deduction,
      charges: session.charges,
      vehicleType: session.vehicleType,
      bagsBales: session.bagsBales,
      agent: session.agent,
      village: session.village,
      chessNo: session.chessNo,
      chessAmount: session.chessAmount,
      chessName: session.chessName,
      finalRate: session.finalRate,
      totalAmount: session.totalAmount,
      printOptions: session.printOptions,
      driverName: session.driverName || 'Driver',
      destination: session.destination || session.village || 'Customer Site',
      operatorName: session.operatorName,
      evidence: session.evidence,
    };

    setActiveSlip(slip);
    api.createWeighSlip(slip).catch((e) => console.warn('Weigh slip save to DB warning:', e));
  }, [handleSave, formData.transactionNo]);

  // F5: Print (Open slip modal for current transaction)
  const handlePrint = useCallback(() => {
    const slipNumber = `SLIP-${new Date().getFullYear()}-${String(formData.transactionNo).padStart(4, '0')}`;
    const slip: WeighSlip = {
      slipNumber,
      sessionId: `WB-TX-${formData.transactionNo}`,
      transactionNo: formData.transactionNo,
      vehicleRegNo: formData.vehicleRegNo || 'MH12AB1234',
      partyName: formData.partyName,
      firmName: formData.firmName,
      product: formData.product,
      material: formData.product,
      dateTime: new Date().toISOString(),
      firstWeight: formData.firstWeight || 0,
      firstWeightTime: formData.firstWeightTime,
      secondWeight: formData.secondWeight || 0,
      secondWeightTime: formData.secondWeightTime,
      tareWeight: formData.firstWeight || 0,
      grossWeight: formData.secondWeight || 0,
      netWeight: calculations.nettWeight,
      rate: formData.rate,
      moisture: formData.moisture,
      deduction: formData.deduction,
      charges: formData.charges,
      vehicleType: formData.vehicleType,
      bagsBales: formData.bagsBales,
      agent: formData.agent,
      village: formData.village,
      chessNo: formData.chessNo,
      chessAmount: formData.chessAmount,
      chessName: formData.chessName,
      finalRate: calculations.finalRate,
      totalAmount: calculations.totalAmount,
      printOptions: {
        printDuplicate: formData.printDuplicate,
        printQrCode: formData.printQrCode,
        printImages: formData.printImages,
      },
      driverName: 'Driver',
      destination: formData.village || 'Customer Site',
      operatorName: 'Weighbridge Operator',
      evidence: evidenceList,
    };
    setActiveSlip(slip);
  }, [formData, calculations, evidenceList]);

  // F7: Close / Clear
  const handleClose = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      vehicleRegNo: '',
      partyName: '',
      firstWeight: null,
      firstWeightTime: null,
      secondWeight: null,
      secondWeightTime: null,
    }));
  }, []);

  // Transaction Navigation (◀ [ txNo ] ▶)
  const navigateTransaction = useCallback((dir: 'prev' | 'next') => {
    setFormData((prev) => {
      const newTx = dir === 'prev' ? Math.max(1, prev.transactionNo - 1) : prev.transactionNo + 1;
      const found = sessions.find((s) => s.transactionNo === newTx);
      if (found) {
        return {
          ...prev,
          transactionNo: newTx,
          vehicleRegNo: found.vehicleRegNo,
          partyName: found.partyName || '',
          product: found.product || found.material || '',
          status: found.status,
          firmName: found.firmName || prev.firmName,
          rate: found.rate || prev.rate,
          moisture: found.moisture || prev.moisture,
          deduction: found.deduction || prev.deduction,
          charges: found.charges || prev.charges,
          vehicleType: found.vehicleType || prev.vehicleType,
          bagsBales: found.bagsBales || prev.bagsBales,
          agent: found.agent || prev.agent,
          village: found.village || prev.village,
          chessNo: found.chessNo || prev.chessNo,
          chessAmount: found.chessAmount || prev.chessAmount,
          chessName: found.chessName || prev.chessName,
          firstWeight: found.firstWeight,
          firstWeightTime: found.firstWeightTime || null,
          secondWeight: found.secondWeight,
          secondWeightTime: found.secondWeightTime || null,
        };
      }
      return {
        ...prev,
        transactionNo: newTx,
      };
    });
  }, [sessions]);

  // Load a vehicle from Today Pending Vehicles drawer
  const loadPendingVehicle = useCallback((session: WeighbridgeSession) => {
    setFormData((prev) => ({
      ...prev,
      transactionNo: session.transactionNo || prev.transactionNo,
      vehicleRegNo: session.vehicleRegNo,
      partyName: session.partyName || prev.partyName,
      product: session.product || session.material || prev.product,
      firmName: session.firmName || prev.firmName,
      firstWeight: session.firstWeight || session.tareWeight,
      firstWeightTime: session.firstWeightTime || session.timestamp,
      secondWeight: null,
      secondWeightTime: null,
      status: 'Awaiting 2nd Weight',
    }));
  }, []);

  // Snapshot Capture Trigger (fallback)
  const takeSnapshot = useCallback((angle: 'front' | 'side' | 'rear') => {
    const urls: Record<string, string> = {
      front: '/snapshots/wb-tx' + (formData.transactionNo || 1) + '-cam1.jpg',
      side: '/snapshots/wb-tx' + (formData.transactionNo || 1) + '-cam2.jpg',
      rear: '/snapshots/wb-tx' + (formData.transactionNo || 1) + '-cam3.jpg',
    };

    const newEvidence: Evidence = {
      id: `ev-${Date.now()}`,
      type: 'image',
      url: urls[angle] || urls.front,
      angle,
      timestamp: new Date().toISOString(),
    };

    setEvidenceList((prev) => [newEvidence, ...prev.slice(0, 2)]);
  }, [formData.transactionNo]);

  const addEvidenceItems = useCallback((items: Evidence[]) => {
    setEvidenceList((prev) => {
      const combined = [...items, ...prev];
      const unique = combined.filter((v, i, a) => a.findIndex(t => t.id === v.id || t.url === v.url) === i);
      return unique.slice(0, 6);
    });
  }, []);

  return {
    currentWeight,
    formData,
    calculations,
    evidenceList,
    setEvidenceList,
    addEvidenceItems,
    sessions,
    pendingVehicles,
    activeSlip,
    isLoading,
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
    refreshTerminalData,
    setCurrentWeight,
    zeroScale,
  };
};
