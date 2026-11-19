import { useState, useEffect, useCallback, useMemo } from 'react';
import { WeightReading, WeighbridgeSession, WeighSlip, Evidence, PrintOptions } from '@/types/weighbridge';
import { api } from '@/lib/api';
import { useCompany } from '@/contexts/CompanyContext';

const STORAGE_KEY_SESSIONS = 'rmc_weighbridge_data';

// Auto-purge any stale legacy mock records (transactions >= 100) from browser localStorage
if (typeof window !== 'undefined') {
  try {
    const rawSessions = localStorage.getItem(STORAGE_KEY_SESSIONS);
    if (rawSessions && (rawSessions.includes('"transactionNo":2') || rawSessions.includes('"transaction_no":2'))) {
      const parsed = JSON.parse(rawSessions);
      if (Array.isArray(parsed) && parsed.some((s: any) => Number(s.transactionNo) >= 100)) {
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(parsed.filter((s: any) => Number(s.transactionNo) < 100)));
      }
    }
    const rawPending = localStorage.getItem('rmc_pending_vehicles');
    if (rawPending && (rawPending.includes('"transactionNo":2') || rawPending.includes('"transaction_no":2'))) {
      const parsed = JSON.parse(rawPending);
      if (Array.isArray(parsed) && parsed.some((p: any) => Number(p.transactionNo) >= 100)) {
        localStorage.setItem('rmc_pending_vehicles', JSON.stringify(parsed.filter((p: any) => Number(p.transactionNo) < 100)));
      }
    }
  } catch (e) {}
}

export interface TerminalFormData {
  transactionNo: number;
  vehicleRegNo: string;
  partyName: string;
  product: string;
  status: string;
  locationName: string;
  cultivatorName: string;
  loadSlipNo: string;
  bagsBales: string;
  charges: number;
  rate: number;
  moisture: number;
  chessNo: string;
  chessName: string;
  chessAmount: number;
  village: string;
  mobileNo: string;
  firstWeight: number | null;
  firstWeightDate: string;
  firstWeightTime: string | null;
  secondWeight: number | null;
  secondWeightDate: string;
  secondWeightTime: string | null;
  printDuplicate: boolean;
  printQrCode: boolean;
  printImages: boolean;
  // Optional / backward-compatible fields:
  firmName?: string;
  fatherName?: string;
  deduction?: number;
  vehicleType?: string;
  agent?: string;
}

const initialForm: TerminalFormData = {
  transactionNo: 1,
  vehicleRegNo: '',
  partyName: '',
  product: '',
  status: '',
  locationName: '',
  cultivatorName: '',
  loadSlipNo: '',
  bagsBales: '',
  charges: 0,
  rate: 0,
  moisture: 0,
  chessNo: '',
  chessName: '',
  chessAmount: 0,
  village: '',
  mobileNo: '',
  firstWeight: null,
  firstWeightDate: '',
  firstWeightTime: null,
  secondWeight: null,
  secondWeightDate: '',
  secondWeightTime: null,
  printDuplicate: false,
  printQrCode: false,
  printImages: true,
  firmName: '',
  fatherName: '',
  deduction: 0,
  vehicleType: '',
  agent: '',
};

export const useWeighbridge = () => {
  const { company } = useCompany();
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Permanently filter out any legacy mock sessions (>= 100)
          return parsed.filter((s: any) => Number(s.transactionNo) < 100);
        }
      }
    } catch (e) {}
    return [];
  });

  const [pendingVehicles, setPendingVehicles] = useState<WeighbridgeSession[]>(() => {
    try {
      const stored = localStorage.getItem('rmc_pending_vehicles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Permanently filter out any legacy mock pending vehicles (>= 100)
          return parsed.filter((p: any) => Number(p.transactionNo) < 100);
        }
      }
    } catch (e) {}
    return [];
  });
  const [activeSlip, setActiveSlip] = useState<WeighSlip | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Gate Monitor Auto-Fetch & Real-Time Sync State
  const [latestGateVehicle, setLatestGateVehicle] = useState<{
    vehicleRegNo: string;
    confidence: number;
    timestamp?: string;
    source?: string;
    matchedVehicle?: any;
  } | null>(null);

  const [recentGateVehicles, setRecentGateVehicles] = useState<any[]>([]);
  const [autoSyncGateVehicle, setAutoSyncGateVehicle] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('rmc_auto_sync_gate');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const handleSetAutoSync = useCallback((enabled: boolean) => {
    setAutoSyncGateVehicle(enabled);
    try {
      localStorage.setItem('rmc_auto_sync_gate', String(enabled));
    } catch (e) {}
  }, []);

  // Load a vehicle from Today Pending Vehicles drawer
  const loadPendingVehicle = useCallback((session: WeighbridgeSession) => {
    setFormData((prev) => ({
      ...prev,
      transactionNo: session.transactionNo || prev.transactionNo,
      vehicleRegNo: session.vehicleRegNo,
      partyName: session.partyName || prev.partyName,
      product: session.product || session.material || prev.product,
      firmName: session.firmName || prev.firmName,
      locationName: session.locationName || (session as any).location_name || prev.locationName,
      cultivatorName: session.cultivatorName || (session as any).cultivator_name || prev.cultivatorName,
      loadSlipNo: session.loadSlipNo || (session as any).load_slip_no || prev.loadSlipNo,
      bagsBales: session.bagsBales || prev.bagsBales,
      fatherName: session.fatherName || (session as any).father_name || '',
      mobileNo: session.mobileNo || (session as any).mobile_no || prev.mobileNo,
      firstWeight: session.firstWeight ?? session.tareWeight ?? null,
      firstWeightTime: session.firstWeightTime || session.timestamp || null,
      firstWeightDate: (session as any).firstWeightDate || (session as any).first_weight_date || prev.firstWeightDate,
      secondWeight: null,
      secondWeightTime: null,
      status: 'Inward',
      rate: session.rate ?? prev.rate,
      moisture: session.moisture ?? prev.moisture,
      deduction: session.deduction ?? prev.deduction,
      charges: session.charges ?? prev.charges,
      vehicleType: session.vehicleType || prev.vehicleType,
      agent: session.agent || prev.agent,
      village: session.village || prev.village,
      chessNo: session.chessNo || prev.chessNo,
      chessAmount: session.chessAmount ?? prev.chessAmount,
      chessName: session.chessName || prev.chessName,
    }));
    if (session.evidence && Array.isArray(session.evidence) && session.evidence.length > 0) {
      setEvidenceList(session.evidence);
    }
  }, []);

  // Load a full session (from database or sessions archive)
  const loadFullSession = useCallback((session: WeighbridgeSession) => {
    setFormData((prev) => ({
      ...prev,
      transactionNo: session.transactionNo || prev.transactionNo,
      vehicleRegNo: session.vehicleRegNo,
      partyName: session.partyName || prev.partyName,
      product: session.product || session.material || prev.product,
      firmName: session.firmName || prev.firmName,
      locationName: session.locationName || (session as any).location_name || prev.locationName,
      cultivatorName: session.cultivatorName || (session as any).cultivator_name || prev.cultivatorName,
      loadSlipNo: session.loadSlipNo || (session as any).load_slip_no || prev.loadSlipNo,
      bagsBales: session.bagsBales || prev.bagsBales,
      fatherName: session.fatherName || (session as any).father_name || '',
      mobileNo: session.mobileNo || (session as any).mobile_no || prev.mobileNo,
      status: session.status || (session.secondWeight ? 'completed' : 'pending_2nd_weight'),
      firstWeight: session.firstWeight ?? session.tareWeight ?? null,
      firstWeightTime: session.firstWeightTime || session.timestamp || null,
      secondWeight: session.secondWeight ?? session.grossWeight ?? null,
      secondWeightTime: session.secondWeightTime || null,
      rate: session.rate ?? prev.rate,
      moisture: session.moisture ?? prev.moisture,
      deduction: session.deduction ?? prev.deduction,
      charges: session.charges ?? prev.charges,
      vehicleType: session.vehicleType || prev.vehicleType,
      agent: session.agent || prev.agent,
      village: session.village || prev.village,
      chessNo: session.chessNo || prev.chessNo,
      chessAmount: session.chessAmount ?? prev.chessAmount,
      chessName: session.chessName || prev.chessName,
    }));
    if (session.evidence && Array.isArray(session.evidence) && session.evidence.length > 0) {
      setEvidenceList(session.evidence);
    }
  }, []);

  // Check if a vehicle registration number has an active pending transaction and link it
  const linkVehicleIfPending = useCallback(async (vehicleNo: string): Promise<WeighbridgeSession | null> => {
    if (!vehicleNo) return null;
    const clean = vehicleNo.replace(/[\s\-_]/g, '').toUpperCase();
    let matched = pendingVehicles.find(
      (p) => (p.vehicleRegNo || '').replace(/[\s\-_]/g, '').toUpperCase() === clean
    ) || null;

    if (!matched) {
      matched = sessions.find(
        (s) => (s.vehicleRegNo || '').replace(/[\s\-_]/g, '').toUpperCase() === clean &&
               (s.firstWeight !== null || s.tareWeight !== null) &&
               (!s.secondWeight || s.status === 'pending_2nd_weight')
      ) || null;
    }

    if (!matched) {
      try {
        const res = await api.getPendingVehicleByNo(clean);
        if (res && res.success && res.session) {
          matched = res.session;
        }
      } catch (e) {}
    }

    if (matched) {
      loadPendingVehicle(matched);
      return matched;
    }
    return null;
  }, [pendingVehicles, sessions, loadPendingVehicle]);

  // Function to apply a gate vehicle to form (links pending vehicle if one exists)
  const applyGateVehicle = useCallback((veh: { vehicleRegNo: string; matchedVehicle?: any }) => {
    if (!veh || !veh.vehicleRegNo) return;
    const cleanReg = veh.vehicleRegNo.trim().toUpperCase();
    const pendingMatch = pendingVehicles.find(
      (p) => p.vehicleRegNo && p.vehicleRegNo.trim().toUpperCase() === cleanReg
    );
    if (pendingMatch) {
      loadPendingVehicle(pendingMatch);
      return;
    }
    setFormData((prev) => ({
      ...prev,
      vehicleRegNo: veh.vehicleRegNo,
      partyName: prev.partyName || veh.matchedVehicle?.partyName || '',
      product: prev.product || veh.matchedVehicle?.product || '',
      agent: prev.agent || veh.matchedVehicle?.driverName || '',
      vehicleType: prev.vehicleType || (veh.matchedVehicle?.make ? `${veh.matchedVehicle.make} ${veh.matchedVehicle.model || ''}`.trim() : prev.vehicleType),
    }));
  }, [pendingVehicles, loadPendingVehicle]);

  // Manually fetch and apply latest gate vehicle (with active FTP fallback)
  const fetchAndApplyGateVehicle = useCallback(async () => {
    try {
      let res = await api.getLatestGateVehicle().catch(() => null);
      // If not yet available from standard endpoint, trigger an active FTP sync
      if (!res || !res.success || !res.vehicleRegNo) {
        try {
          const ftpRes = await api.syncFtpNow(true);
          if (ftpRes?.detection?.vehicleRegNo) {
            res = {
              success: true,
              ...ftpRes.detection
            };
          }
        } catch {}
      }

      if (res && res.success && res.vehicleRegNo) {
        setLatestGateVehicle(res as any);
        applyGateVehicle(res);
        return res;
      }
    } catch (err) {
      console.warn('Error fetching latest gate vehicle:', err);
    }
    return null;
  }, [applyGateVehicle]);

  // Synchronize with Gate Monitor module (polling + real-time events)
  useEffect(() => {
    let active = true;

    const syncGate = async () => {
      try {
        const [latestRes, recentRes] = await Promise.all([
          api.getLatestGateVehicle().catch(() => null),
          api.getRecentGateVehicles().catch(() => null),
        ]);

        if (!active) return;

        if (recentRes && recentRes.vehicles) {
          setRecentGateVehicles(recentRes.vehicles);
        }

        const isMock = (plate: string) => ['KA05AB1234', 'MH02CD5678', 'DL01EF9012', 'TN09GH3456', 'GJ06IJ7890', 'MH12AB1234'].includes((plate || '').replace(/\s+/g, '').toUpperCase());

        if (latestRes && latestRes.success && latestRes.vehicleRegNo && !isMock(latestRes.vehicleRegNo)) {
          setLatestGateVehicle(latestRes as any);

          if (autoSyncGateVehicle) {
            setFormData((prev) => {
              if (!prev.vehicleRegNo) {
                return {
                  ...prev,
                  vehicleRegNo: latestRes.vehicleRegNo!,
                  partyName: prev.partyName || latestRes.matchedVehicle?.partyName || '',
                  product: prev.product || latestRes.matchedVehicle?.product || '',
                  agent: prev.agent || latestRes.matchedVehicle?.driverName || '',
                };
              }
              return prev;
            });
          }
        }
      } catch (err) {
        // Silently catch network errors
      }
    };

    syncGate();
    const timer = setInterval(syncGate, 3000);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('rmc_gate_sync');
      channel.onmessage = (e) => {
        if (e.data?.type === 'GATE_VEHICLE_CLEARED') {
          setLatestGateVehicle(null);
          return;
        }
        if (e.data && e.data.vehicleRegNo && !isMock(e.data.vehicleRegNo)) {
          const vehData = {
            vehicleRegNo: e.data.vehicleRegNo,
            confidence: e.data.confidence,
            source: 'Gate Monitor Real-Time Broadcast',
            timestamp: e.data.timestamp
          };
          setLatestGateVehicle(vehData);
          if (autoSyncGateVehicle) {
            applyGateVehicle(vehData);
          }
        }
      };
    } catch (e) {}

    const handleCustomEvent = (e: any) => {
      if (e.detail && e.detail.vehicleRegNo && !isMock(e.detail.vehicleRegNo)) {
        const vehData = {
          vehicleRegNo: e.detail.vehicleRegNo,
          confidence: e.detail.confidence,
          source: 'Gate Monitor ANPR Event',
          timestamp: new Date().toISOString()
        };
        setLatestGateVehicle(vehData);
        if (autoSyncGateVehicle) {
          applyGateVehicle(vehData);
        }
      }
    };
    window.addEventListener('rmc_gate_vehicle_detected', handleCustomEvent);

    return () => {
      active = false;
      clearInterval(timer);
      if (channel) channel.close();
      window.removeEventListener('rmc_gate_vehicle_detected', handleCustomEvent);
    };
  }, [autoSyncGateVehicle, applyGateVehicle]);

  // Load next transaction number and pending vehicles from MySQL
  const refreshTerminalData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [txRes, pendingRes, sessionsRes] = await Promise.all([
        api.getNextTransactionNo().catch(() => ({ nextTransactionNo: 1 })),
        api.getPendingVehicles().catch(() => []),
        api.getWeighbridgeSessions().catch(() => []),
      ]);

      if (txRes && txRes.nextTransactionNo) {
        setFormData((prev) => ({
          ...prev,
          transactionNo: (prev.transactionNo && prev.firstWeight !== null) ? prev.transactionNo : txRes.nextTransactionNo,
        }));
      }

      if (Array.isArray(pendingRes)) {
        setPendingVehicles(pendingRes);
        try {
          localStorage.setItem('rmc_pending_vehicles', JSON.stringify(pendingRes));
        } catch (e) {}
      }

      if (Array.isArray(sessionsRes)) {
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
            weightQtl: reading.weightQtl !== undefined ? reading.weightQtl : Number((reading.weight / 100).toFixed(2)),
            unit: reading.unit || 'kg',
            stable: reading.stable !== undefined ? reading.stable : true,
            zero: reading.weight === 0,
            connected: reading.connected ?? reading.serialConnected ?? false,
            serialPort: reading.serialPort || 'COM2',
            source: reading.source || 'ventek_serial',
            deviceCode: reading.deviceCode || 'VMS',
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
    const { firstWeight, secondWeight, rate, moisture, charges, chessAmount } = formData;
    
    // Nett Weight = |1st Weight - 2nd Weight|
    const nettWeight = (firstWeight !== null && secondWeight !== null)
      ? Math.abs(secondWeight - firstWeight)
      : (firstWeight !== null ? firstWeight : 0);

    // Moisture deduction in kg = nettWeight * (moisture / 100)
    const moistureDeductionKg = Math.round(nettWeight * ((moisture || 0) / 100));

    // Final Weight = Nett - Moisture Deduction
    const finalWeight = Math.max(0, Math.round(nettWeight - moistureDeductionKg));

    const finalRate = rate || 0;

    // Commercial calculation:
    // In cotton/quintal trade, if finalRate >= 500, rate is per Quintal (100 kg)
    // If finalRate < 500, rate is per kg
    let materialCost = 0;
    if (finalRate >= 500) {
      const weightInQtl = finalWeight / 100;
      materialCost = Math.round(weightInQtl * finalRate);
    } else {
      materialCost = Math.round(finalWeight * finalRate);
    }

    const totalAmount = materialCost + (charges || 0) + (chessAmount || 0);

    return {
      nettWeight,
      moistureDeductionKg,
      finalWeight,
      finalRate,
      totalAmount,
    };
  }, [formData]);

  // F1: New Transaction (Redirects to next unalloted sequence number, stays until weight is latched, clears all data)
  const handleNew = useCallback(async () => {
    // 1. Fetch highest alloted sequence number from database
    let dbNextTx = 1;
    try {
      const res = await api.getNextTransactionNo();
      if (res && res.nextTransactionNo) {
        dbNextTx = Number(res.nextTransactionNo);
      }
    } catch {
      dbNextTx = 1;
    }

    const currentHasWeight = formData.firstWeight !== null || formData.secondWeight !== null;

    // Filter local sessions/pending for actual recorded weights
    const localAllocated = [...sessions, ...pendingVehicles]
      .filter((s) => s.firstWeight !== null || s.tareWeight !== null || s.secondWeight !== null)
      .map((s) => Number(s.transactionNo) || 0)
      .filter((n) => n > 0);

    const maxRecordedAllocated = localAllocated.length > 0 ? Math.max(...localAllocated) : 0;

    // The highest allocated sequence number across DB, local memory, and currently latched form weight:
    const maxAllocatedTx = Math.max(
      dbNextTx - 1,
      maxRecordedAllocated,
      currentHasWeight ? (Number(formData.transactionNo) || 0) : 0
    );

    // The next available unalloted transaction sequence number (Rules 1-4)
    const unallotedTx = Math.max(1, maxAllocatedTx + 1);
    const targetTx = unallotedTx;

    setFormData({
      ...initialForm,
      transactionNo: targetTx,
      vehicleRegNo: '',
      partyName: '',
      product: '',
      status: '',
      locationName: '',
      cultivatorName: '',
      loadSlipNo: '',
      bagsBales: '',
      charges: 0,
      rate: 0,
      moisture: 0,
      chessNo: '',
      chessName: '',
      chessAmount: 0,
      village: '',
      mobileNo: '',
      firstWeight: null,
      firstWeightDate: '',
      firstWeightTime: null,
      secondWeight: null,
      secondWeightDate: '',
      secondWeightTime: null,
      fatherName: '',
      deduction: 0,
      vehicleType: '',
      agent: '',
    });

    setEvidenceList([]);
    setActiveSlip(null);
    return targetTx;
  }, [formData.transactionNo, formData.firstWeight, formData.secondWeight, sessions, pendingVehicles]);

  // Safe Date Helpers for Weighbridge
  const toSafeIsoTimestamp = (dateVal?: string | null, timeVal?: string | null): string => {
    const now = new Date();
    if (!dateVal && !timeVal) return now.toISOString();
    try {
      let year = now.getFullYear();
      let month = now.getMonth();
      let day = now.getDate();
      let hour = now.getHours();
      let min = now.getMinutes();
      let sec = now.getSeconds();

      if (dateVal) {
        const dParts = dateVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (dParts) {
          day = parseInt(dParts[1], 10);
          month = parseInt(dParts[2], 10) - 1;
          year = parseInt(dParts[3], 10);
        } else {
          const isoParts = dateVal.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
          if (isoParts) {
            year = parseInt(isoParts[1], 10);
            month = parseInt(isoParts[2], 10) - 1;
            day = parseInt(isoParts[3], 10);
          }
        }
      }

      if (timeVal) {
        const tParts = timeVal.match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
        if (tParts) {
          hour = parseInt(tParts[1], 10);
          min = parseInt(tParts[2], 10);
          sec = tParts[3] ? parseInt(tParts[3], 10) : 0;
        }
      }

      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d.toISOString();
    } catch (e) {}
    return now.toISOString();
  };

  const safeFormatDateString = (dateVal?: string | null, timeVal?: string | null): string => {
    if (dateVal && dateVal.trim() && dateVal !== '-') {
      return dateVal.trim();
    }
    if (timeVal) {
      if (/^\d{4}-\d{2}-\d{2}/.test(timeVal)) {
        return timeVal.split('T')[0];
      }
      if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(timeVal)) {
        return timeVal.split(' ')[0];
      }
      try {
        const d = new Date(timeVal);
        if (!isNaN(d.getTime())) {
          const pad = (n: number) => String(n).padStart(2, '0');
          return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
        }
      } catch (e) {}
    }
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
  };

  const safeFormatTimeString = (timeVal?: string | null): string => {
    if (!timeVal || timeVal === '-') return '';
    if (/^\d{1,2}:\d{2}(?::\d{2})?$/.test(timeVal.trim())) {
      return timeVal.trim();
    }
    try {
      const d = new Date(timeVal);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }
    } catch (e) {}
    return timeVal;
  };

  // F3: Get Weight (Primary Action - Latches current scale weight & Auto-Registers Pending Vehicles)
  const handleGetWeight = useCallback(async () => {
    const weightToLatch = currentWeight.weight;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const cleanVeh = (formData.vehicleRegNo || '').replace(/[\s\-_]/g, '').toUpperCase();
    
    // Look for pending vehicle:
    // 1. From pendingVehicles state
    let pendingMatch: WeighbridgeSession | null = cleanVeh
      ? pendingVehicles.find((p) => (p.vehicleRegNo || '').replace(/[\s\-_]/g, '').toUpperCase() === cleanVeh) || null
      : null;

    // 2. From sessions list
    if (!pendingMatch && cleanVeh) {
      pendingMatch = sessions.find(
        (s) => (s.vehicleRegNo || '').replace(/[\s\-_]/g, '').toUpperCase() === cleanVeh &&
               (s.firstWeight !== null || s.tareWeight !== null) &&
               (!s.secondWeight || s.status === 'pending_2nd_weight')
      ) || null;
    }

    // 3. From backend MySQL database
    if (!pendingMatch && cleanVeh) {
      try {
        const dbRes = await api.getPendingVehicleByNo(cleanVeh);
        if (dbRes && dbRes.success && dbRes.session) {
          pendingMatch = dbRes.session;
        }
      } catch (e) {}
    }

    const isSecondWeight = formData.firstWeight !== null || (pendingMatch !== null && (pendingMatch.firstWeight !== null || pendingMatch.tareWeight !== null));

    if (isSecondWeight) {
      const resolved1stWeight = formData.firstWeight !== null
        ? formData.firstWeight
        : (pendingMatch?.firstWeight ?? pendingMatch?.tareWeight ?? 0);
      const resolved1stDate = formData.firstWeightDate || (pendingMatch as any)?.firstWeightDate || dateStr;
      const resolved1stTime = formData.firstWeightTime || pendingMatch?.firstWeightTime || timeStr;

      const updatedForm: TerminalFormData = {
        ...formData,
        transactionNo: formData.transactionNo || pendingMatch?.transactionNo || formData.transactionNo,
        vehicleRegNo: formData.vehicleRegNo || pendingMatch?.vehicleRegNo || '',
        partyName: formData.partyName || pendingMatch?.partyName || '',
        product: formData.product || pendingMatch?.product || pendingMatch?.material || '',
        locationName: formData.locationName || pendingMatch?.locationName || (pendingMatch as any)?.location_name || '',
        cultivatorName: formData.cultivatorName || pendingMatch?.cultivatorName || (pendingMatch as any)?.cultivator_name || '',
        loadSlipNo: formData.loadSlipNo || pendingMatch?.loadSlipNo || (pendingMatch as any)?.load_slip_no || '',
        bagsBales: formData.bagsBales || pendingMatch?.bagsBales || '',
        charges: formData.charges || pendingMatch?.charges || 0,
        rate: formData.rate || pendingMatch?.rate || 0,
        moisture: formData.moisture !== undefined && formData.moisture !== null ? formData.moisture : (pendingMatch?.moisture ?? 0),
        chessNo: formData.chessNo || pendingMatch?.chessNo || '',
        chessName: formData.chessName || pendingMatch?.chessName || '',
        chessAmount: formData.chessAmount || pendingMatch?.chessAmount || 0,
        village: formData.village || pendingMatch?.village || '',
        mobileNo: formData.mobileNo || pendingMatch?.mobileNo || '',
        firstWeight: resolved1stWeight,
        firstWeightDate: resolved1stDate,
        firstWeightTime: resolved1stTime,
        secondWeight: weightToLatch,
        secondWeightDate: dateStr,
        secondWeightTime: timeStr,
        status: formData.status || pendingMatch?.status || 'Inward',
      };

      setFormData(updatedForm);

      // Remove completed vehicle from pending vehicles
      setPendingVehicles((curr) => {
        const next = curr.filter(
          (p) => p.transactionNo !== updatedForm.transactionNo &&
                 (p.vehicleRegNo || '').replace(/[\s\-_]/g, '').toUpperCase() !== cleanVeh
        );
        try { localStorage.setItem('rmc_pending_vehicles', JSON.stringify(next)); } catch (e) {}
        return next;
      });

      // Commit completed session to database
      const completedPayload: WeighbridgeSession = {
        sessionId: `WB-TX-${updatedForm.transactionNo}-${Date.now()}`,
        transactionNo: updatedForm.transactionNo,
        vehicleRegNo: updatedForm.vehicleRegNo,
        vehicleNo: updatedForm.vehicleRegNo,
        partyName: updatedForm.partyName,
        firmName: updatedForm.firmName || company.firmName || 'DHARANI COTTON MILLS',
        companyName: company.firmName || company.companyName || 'DHARANI COTTON MILLS',
        locationName: updatedForm.locationName,
        cultivatorName: updatedForm.cultivatorName,
        loadSlipNo: updatedForm.loadSlipNo,
        bagsBales: updatedForm.bagsBales,
        mobileNo: updatedForm.mobileNo,
        product: updatedForm.product,
        material: updatedForm.product,
        timestamp: new Date().toISOString(),
        firstWeight: resolved1stWeight,
        firstWeightTime: toSafeIsoTimestamp(resolved1stDate, resolved1stTime),
        secondWeight: weightToLatch,
        secondWeightTime: toSafeIsoTimestamp(dateStr, timeStr),
        tareWeight: resolved1stWeight,
        grossWeight: weightToLatch,
        netWeight: Math.abs(weightToLatch - resolved1stWeight),
        nettWeight: Math.abs(weightToLatch - resolved1stWeight),
        rate: updatedForm.rate,
        moisture: updatedForm.moisture,
        deduction: updatedForm.deduction,
        charges: updatedForm.charges,
        vehicleType: updatedForm.vehicleType,
        agent: updatedForm.agent,
        village: updatedForm.village,
        chessNo: updatedForm.chessNo,
        chessAmount: updatedForm.chessAmount,
        chessName: updatedForm.chessName,
        finalRate: updatedForm.rate,
        totalAmount: (Math.abs(weightToLatch - resolved1stWeight) * (updatedForm.rate || 0) / 100) + (updatedForm.charges || 0) + (updatedForm.chessAmount || 0),
        status: 'completed',
        operatorId: 'OP001',
        operatorName: 'Weighbridge Operator',
      };

      api.createWeighbridgeSession(completedPayload).catch((e) => console.warn('Sync completed session error:', e));

      return { isFirstWeight: false, weight: weightToLatch };
    }

    // 1st Weight
    const updatedForm: TerminalFormData = {
      ...formData,
      firstWeight: weightToLatch,
      firstWeightDate: dateStr,
      firstWeightTime: timeStr,
      status: formData.status || 'Inward',
    };
    setFormData(updatedForm);

    const pendingSession: WeighbridgeSession = {
      sessionId: `WB-TX-${updatedForm.transactionNo || 1}-${Date.now()}`,
      transactionNo: updatedForm.transactionNo || 1,
      vehicleRegNo: updatedForm.vehicleRegNo || '',
      vehicleNo: updatedForm.vehicleRegNo || '',
      partyName: updatedForm.partyName || '',
      firmName: updatedForm.firmName || company.firmName || 'DHARANI COTTON MILLS',
      companyName: company.firmName || company.companyName || 'DHARANI COTTON MILLS',
      product: updatedForm.product || '',
      material: updatedForm.product || '',
      locationName: updatedForm.locationName || '',
      cultivatorName: updatedForm.cultivatorName || '',
      loadSlipNo: updatedForm.loadSlipNo || '',
      bagsBales: updatedForm.bagsBales || '',
      rate: updatedForm.rate || 0,
      moisture: updatedForm.moisture !== undefined ? updatedForm.moisture : 0,
      charges: updatedForm.charges || 0,
      chessNo: updatedForm.chessNo || '',
      chessName: updatedForm.chessName || '',
      chessAmount: updatedForm.chessAmount || 0,
      village: updatedForm.village || '',
      mobileNo: updatedForm.mobileNo || '',
      firstWeight: weightToLatch,
      firstWeightTime: toSafeIsoTimestamp(dateStr, timeStr),
      firstWeightDate: dateStr,
      secondWeight: null,
      secondWeightTime: null,
      tareWeight: weightToLatch,
      grossWeight: null,
      netWeight: null,
      nettWeight: null,
      status: 'pending_2nd_weight',
      timestamp: new Date().toISOString(),
      evidence: evidenceList,
      printOptions: {
        printDuplicate: updatedForm.printDuplicate,
        printQrCode: updatedForm.printQrCode,
        printImages: updatedForm.printImages,
      },
    };

    setPendingVehicles((curr) => {
      const filtered = curr.filter(
        (p) => p.transactionNo !== pendingSession.transactionNo &&
               (p.vehicleRegNo || '').replace(/[\s\-_]/g, '').toUpperCase() !== cleanVeh
      );
      const next = [pendingSession, ...filtered];
      try { localStorage.setItem('rmc_pending_vehicles', JSON.stringify(next)); } catch (e) {}
      return next;
    });

    api.createWeighbridgeSession(pendingSession).catch((err) => {
      console.warn('Auto-save pending session to DB warning:', err);
    });

    return { isFirstWeight: true, weight: weightToLatch };
  }, [currentWeight.weight, evidenceList, company, pendingVehicles, sessions, formData]);

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
      vehicleRegNo: formData.vehicleRegNo || '',
      vehicleNo: formData.vehicleRegNo || '',
      partyName: formData.partyName || '',
      firmName: formData.firmName || company.firmName || 'DHARANI COTTON MILLS',
      companyName: company.firmName || company.companyName || formData.firmName || 'DHARANI COTTON MILLS',
      locationName: formData.locationName || '',
      cultivatorName: formData.cultivatorName || '',
      loadSlipNo: formData.loadSlipNo || '',
      bagsBales: formData.bagsBales || '',
      fatherName: formData.fatherName || '',
      mobileNo: formData.mobileNo || '',
      product: formData.product || '',
      material: formData.product || '',
      timestamp: new Date().toISOString(),
      firstWeight: formData.firstWeight,
      firstWeightTime: formData.firstWeight ? toSafeIsoTimestamp(formData.firstWeightDate, formData.firstWeightTime) : null,
      secondWeight: formData.secondWeight,
      secondWeightTime: formData.secondWeight ? toSafeIsoTimestamp(formData.secondWeightDate, formData.secondWeightTime) : null,
      tareWeight: formData.firstWeight,
      grossWeight: formData.secondWeight,
      netWeight: calculations.nettWeight,
      nettWeight: calculations.nettWeight,
      rate: formData.rate,
      moisture: formData.moisture,
      deduction: formData.deduction,
      charges: formData.charges,
      vehicleType: formData.vehicleType,
      agent: formData.agent,
      village: formData.village,
      chessNo: formData.chessNo,
      chessAmount: formData.chessAmount,
      chessName: formData.chessName,
      finalRate: calculations.finalRate,
      totalAmount: calculations.totalAmount,
      printOptions,
      evidence: evidenceList,
      status: formData.status || 'Inward',
      operatorId: 'OP001',
      operatorName: 'Weighbridge Operator',
      adminName: 'System Admin',
    };
  }, [formData, calculations, evidenceList, company]);

  // F2: Save (without printing)
  const handleSave = useCallback(async () => {
    const isCompleted = formData.firstWeight !== null && formData.secondWeight !== null;
    const payload = buildSessionPayload();
    payload.status = isCompleted ? 'completed' : 'pending_2nd_weight';

    try {
      await api.createWeighbridgeSession(payload);
      if (isCompleted) {
        setPendingVehicles((curr) => {
          const next = curr.filter((p) => p.transactionNo !== payload.transactionNo && p.vehicleRegNo !== payload.vehicleRegNo);
          try { localStorage.setItem('rmc_pending_vehicles', JSON.stringify(next)); } catch (e) {}
          return next;
        });
        setSessions((curr) => [payload, ...curr.filter(s => s.transactionNo !== payload.transactionNo)]);
      } else if (payload.firstWeight !== null) {
        setPendingVehicles((curr) => {
          const filtered = curr.filter((p) => p.transactionNo !== payload.transactionNo && p.vehicleRegNo !== payload.vehicleRegNo);
          const next = [payload, ...filtered];
          try { localStorage.setItem('rmc_pending_vehicles', JSON.stringify(next)); } catch (e) {}
          return next;
        });
      }
      await refreshTerminalData();
      return payload;
    } catch (err) {
      console.error('Save session error:', err);
      return payload;
    }
  }, [buildSessionPayload, formData, refreshTerminalData]);

  // F4: Save & Print (Commits session and shows weigh slip modal)
  const handleSaveAndPrint = useCallback(async () => {
    const session = await handleSave();
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const nowTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const fDate = safeFormatDateString(formData.firstWeightDate || (session as any).firstWeightDate, session.firstWeightTime);
    const fTime = safeFormatTimeString(formData.firstWeightTime || (session as any).firstWeightTime || nowTimeStr);
    const sDate = session.secondWeight ? safeFormatDateString(formData.secondWeightDate || (session as any).secondWeightDate, session.secondWeightTime) : '';
    const sTime = session.secondWeight ? safeFormatTimeString(formData.secondWeightTime || (session as any).secondWeightTime || nowTimeStr) : '';

    const companyAddressParts = [
      company.address || 'Vikarabad',
      company.city || 'Hyderabad',
      company.state ? `${company.state}${company.pincode ? ` - ${company.pincode}` : ''}` : 'Telangana - 500033'
    ].filter(Boolean);
    const resolvedCompanyAddress = companyAddressParts.join(', ');

    const slip: WeighSlip = {
      sessionId: session.sessionId,
      transactionNo: session.transactionNo,
      companyName: company.firmName || company.companyName || session.firmName || formData.firmName || 'DHARANI COTTON MILLS',
      companyAddress: resolvedCompanyAddress,
      phoneNo: company.phone || '+91 20 2712 8899',
      partyName: session.partyName || formData.partyName || '',
      product: session.product || formData.product || '',
      material: session.material || formData.product || '',
      status: formData.status || session.status || 'Inward',
      locationName: formData.locationName || session.locationName || '',
      cultivatorName: formData.cultivatorName || session.cultivatorName || '',
      loadSlipNo: formData.loadSlipNo || session.loadSlipNo || '',
      bagsBales: formData.bagsBales || session.bagsBales || '',
      charges: formData.charges !== undefined ? formData.charges : (session.charges || 0),
      rate: formData.rate !== undefined ? formData.rate : (session.rate || 0),
      moisture: formData.moisture !== undefined ? formData.moisture : (session.moisture || 0),
      chessNo: formData.chessNo || session.chessNo || '',
      chessName: formData.chessName || session.chessName || '',
      chessAmount: formData.chessAmount !== undefined ? formData.chessAmount : (session.chessAmount || 0),
      village: formData.village || session.village || '',
      mobileNo: formData.mobileNo || session.mobileNo || '',
      vehicleNo: session.vehicleRegNo || formData.vehicleRegNo || '',
      vehicleRegNo: session.vehicleRegNo || formData.vehicleRegNo || '',
      firstWeight: session.firstWeight || formData.firstWeight || 0,
      firstWeightDate: fDate,
      firstWeightTime: fTime,
      secondWeight: session.secondWeight || formData.secondWeight || 0,
      secondWeightDate: sDate,
      secondWeightTime: sTime,
      nettWeight: calculations.nettWeight,
      netWeight: calculations.nettWeight,
      finalRate: calculations.finalRate,
      totalAmount: calculations.totalAmount,
      adminName: session.operatorName || 'System Admin',
      operatorName: session.operatorName || 'System Admin',
      firmName: session.firmName || formData.firmName,
      dateTime: now.toISOString(),
      tareWeight: session.tareWeight || formData.firstWeight || 0,
      grossWeight: session.grossWeight || formData.secondWeight || 0,
      deduction: formData.deduction,
      vehicleType: formData.vehicleType,
      agent: formData.agent,
      printOptions: session.printOptions,
      driverName: session.driverName || 'Driver',
      destination: session.destination || formData.village || '',
      evidence: session.evidence,
    };

    setActiveSlip(slip);
    api.createWeighSlip(slip).catch((e) => console.warn('Weigh slip save to DB warning:', e));
    api.createWeighSlip(slip).catch((e) => console.warn('Weigh slip save to DB warning:', e));
  }, [handleSave, formData, calculations, company]);

  // F5: Print (Open slip modal for current transaction)
  const handlePrint = useCallback(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const nowTimeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const fDate = safeFormatDateString(formData.firstWeightDate, formData.firstWeightTime);
    const fTime = safeFormatTimeString(formData.firstWeightTime || nowTimeStr);
    const sDate = formData.secondWeight ? safeFormatDateString(formData.secondWeightDate, formData.secondWeightTime) : '';
    const sTime = formData.secondWeight ? safeFormatTimeString(formData.secondWeightTime || nowTimeStr) : '';

    const companyAddressParts = [
      company.address || 'Vikarabad',
      company.city || 'Hyderabad',
      company.state ? `${company.state}${company.pincode ? ` - ${company.pincode}` : ''}` : 'Telangana - 500033'
    ].filter(Boolean);
    const resolvedCompanyAddress = companyAddressParts.join(', ');

    const slip: WeighSlip = {
      sessionId: `WB-TX-${formData.transactionNo}`,
      transactionNo: formData.transactionNo,
      companyName: company.firmName || company.companyName || formData.firmName || 'DHARANI COTTON MILLS',
      companyAddress: resolvedCompanyAddress,
      phoneNo: company.phone || '+91 20 2712 8899',
      partyName: formData.partyName || '',
      product: formData.product || '',
      material: formData.product || '',
      status: formData.status || 'Inward',
      locationName: formData.locationName || '',
      cultivatorName: formData.cultivatorName || '',
      loadSlipNo: formData.loadSlipNo || '',
      bagsBales: formData.bagsBales || '',
      charges: formData.charges !== undefined ? formData.charges : 0,
      rate: formData.rate !== undefined ? formData.rate : 0,
      moisture: formData.moisture !== undefined ? formData.moisture : 0,
      chessNo: formData.chessNo || '',
      chessName: formData.chessName || '',
      chessAmount: formData.chessAmount !== undefined ? formData.chessAmount : 0,
      village: formData.village || '',
      mobileNo: formData.mobileNo || '',
      vehicleNo: formData.vehicleRegNo || '',
      vehicleRegNo: formData.vehicleRegNo || '',
      firstWeight: formData.firstWeight || 0,
      firstWeightDate: fDate,
      firstWeightTime: formData.firstWeightTime,
      secondWeight: formData.secondWeight || 0,
      secondWeightDate: sDate,
      secondWeightTime: formData.secondWeightTime,
      nettWeight: calculations.nettWeight,
      netWeight: calculations.nettWeight,
      finalRate: calculations.finalRate,
      totalAmount: calculations.totalAmount,
      adminName: 'System Admin',
      operatorName: 'System Admin',
      firmName: formData.firmName,
      dateTime: now.toISOString(),
      tareWeight: formData.firstWeight || 0,
      grossWeight: formData.secondWeight || 0,
      deduction: formData.deduction,
      vehicleType: formData.vehicleType,
      agent: formData.agent,
      printOptions: {
        printDuplicate: formData.printDuplicate,
        printQrCode: formData.printQrCode,
        printImages: formData.printImages,
      },
      driverName: 'Driver',
      destination: formData.village || '',
      evidence: evidenceList,
    };
    setActiveSlip(slip);
    api.createWeighSlip(slip).catch((e) => console.warn('Weigh slip save to DB warning:', e));
  }, [formData, calculations, evidenceList, company]);

  // F7: Close / Clear
  const handleClose = useCallback(() => {
    setFormData((prev) => ({
      ...initialForm,
      transactionNo: prev.transactionNo,
    }));
    setActiveSlip(null);
  }, []);

  // Transaction Navigation (◀ [ txNo ] ▶)
  const navigateTransaction = useCallback((dir: 'prev' | 'next') => {
    setFormData((prev) => {
      const validTxs = [...sessions, ...pendingVehicles]
        .map((s) => Number(s.transactionNo) || 0)
        .filter((n) => n > 0 && n < 100);
      const maxRecordedTx = validTxs.length > 0 ? Math.max(...validTxs) : 0;
      const maxAllowed = Math.max(1, maxRecordedTx + 1);
      const newTx = dir === 'prev' ? Math.max(1, prev.transactionNo - 1) : Math.min(maxAllowed, prev.transactionNo + 1);
      const found = sessions.find((s) => s.transactionNo === newTx) || pendingVehicles.find((p) => p.transactionNo === newTx);
      if (found) {
        return {
          ...initialForm,
          transactionNo: newTx,
          vehicleRegNo: found.vehicleRegNo || '',
          partyName: found.partyName || '',
          product: found.product || found.material || '',
          status: found.status || '',
          firmName: found.firmName || '',
          locationName: (found as any).locationName || '',
          cultivatorName: (found as any).cultivatorName || '',
          loadSlipNo: (found as any).loadSlipNo || '',
          rate: found.rate || 0,
          moisture: found.moisture || 0,
          deduction: found.deduction || 0,
          charges: found.charges || 0,
          vehicleType: found.vehicleType || '',
          bagsBales: (found as any).bagsBales || '',
          agent: found.agent || '',
          village: (found as any).village || '',
          chessNo: (found as any).chessNo || '',
          chessAmount: (found as any).chessAmount || 0,
          chessName: (found as any).chessName || '',
          mobileNo: (found as any).mobileNo || '',
          firstWeight: found.firstWeight ?? null,
          firstWeightDate: (found as any).firstWeightDate || '',
          firstWeightTime: found.firstWeightTime || null,
          secondWeight: found.secondWeight ?? null,
          secondWeightDate: (found as any).secondWeightDate || '',
          secondWeightTime: found.secondWeightTime || null,
        };
      }
      return {
        ...initialForm,
        transactionNo: newTx,
      };
    });
  }, [sessions, pendingVehicles]);

  // Search and fetch transaction from pending vehicles, sessions, or MySQL
  const searchAndLoadTransaction = useCallback(async (txNo: number | string) => {
    const num = Number(txNo);
    if (!num || isNaN(num) || num <= 0) {
      return { found: false, source: 'none' as const, message: 'Please enter a valid Transaction Number' };
    }

    // 1. Search in Pending Vehicles first
    const pendingMatch = pendingVehicles.find((p) => Number(p.transactionNo) === num);
    if (pendingMatch) {
      loadPendingVehicle(pendingMatch);
      return {
        found: true,
        source: 'pending' as const,
        data: pendingMatch,
        message: `Loaded Transaction #${num} (${pendingMatch.vehicleRegNo}) from Pending Vehicles`,
      };
    }

    // 2. Search in local sessions list
    const sessionMatch = sessions.find((s) => Number(s.transactionNo) === num);
    if (sessionMatch) {
      loadFullSession(sessionMatch);
      return {
        found: true,
        source: 'sessions' as const,
        data: sessionMatch,
        message: `Loaded Transaction #${num} (${sessionMatch.vehicleRegNo}) from Saved Sessions`,
      };
    }

    // 3. Search via Backend API in MySQL
    try {
      const fetched = await api.getWeighbridgeSession(String(num));
      if (fetched && (fetched.transactionNo || fetched.sessionId)) {
        loadFullSession(fetched);
        return {
          found: true,
          source: 'database' as const,
          data: fetched,
          message: `Loaded Transaction #${num} (${fetched.vehicleRegNo}) from Database`,
        };
      }
    } catch (e) {
      // not in MySQL
    }

    return {
      found: false,
      source: 'none' as const,
      message: `Transaction #${num} was not found in pending vehicles or saved sessions.`,
    };
  }, [pendingVehicles, sessions, loadPendingVehicle, loadFullSession]);

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
    loadFullSession,
    linkVehicleIfPending,
    searchAndLoadTransaction,
    takeSnapshot,
    refreshTerminalData,
    setCurrentWeight,
    zeroScale,
    latestGateVehicle,
    recentGateVehicles,
    autoSyncGateVehicle,
    setAutoSyncGateVehicle: handleSetAutoSync,
    fetchAndApplyGateVehicle,
    applyGateVehicle,
  };
};
