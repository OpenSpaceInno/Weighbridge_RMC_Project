import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import { LoadingBay, LoadingSession, Material, QualityCheck } from '@/types/loading';

const mockBays: LoadingBay[] = [
  {
    id: 'bay-1',
    name: 'Loading Bay 1',
    status: 'loading',
    capacity: 10,
    location: 'North Section',
  },
  {
    id: 'bay-2',
    name: 'Loading Bay 2',
    status: 'available',
    capacity: 10,
    location: 'North Section',
  },
  {
    id: 'bay-3',
    name: 'Loading Bay 3',
    status: 'quality_check',
    capacity: 10,
    location: 'South Section',
  },
  {
    id: 'bay-4',
    name: 'Loading Bay 4',
    status: 'maintenance',
    capacity: 10,
    location: 'South Section',
  },
];

const mockQualityChecks: QualityCheck[] = [
  { id: 'qc-1', parameter: 'Slump Test', expectedValue: '75-100mm', status: 'pending', mandatory: true },
  { id: 'qc-2', parameter: 'Temperature', expectedValue: '< 32°C', status: 'pending', mandatory: true },
  { id: 'qc-3', parameter: 'Visual Inspection', expectedValue: 'No segregation', status: 'pending', mandatory: true },
  { id: 'qc-4', parameter: 'Batch ID Verification', expectedValue: 'Match order', status: 'pending', mandatory: true },
];

export const useLoadingBays = () => {
  const [bays, setBays] = useState<LoadingBay[]>(mockBays);
  const [activeSessions, setActiveSessions] = useState<LoadingSession[]>([]);

  // Load bays from MySQL API
  useEffect(() => {
    const fetchLiveBays = async () => {
      try {
        const live = await api.getLoadingBays();
        if (Array.isArray(live) && live.length > 0) {
          setBays(live);
        }
      } catch (e) {
        console.warn('Using cached loading bays:', e);
      }
    };
    fetchLiveBays();
  }, []);

  // Simulate real-time bay status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setBays(prev => prev.map(bay => {
        if (bay.currentSession) {
          const progress = bay.currentSession.overallProgress;
          if (progress < 100) {
            return {
              ...bay,
              currentSession: {
                ...bay.currentSession,
                overallProgress: Math.min(100, progress + Math.random() * 5),
              },
            };
          }
        }
        return bay;
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const startLoading = (bayId: string, vehicleRegNo: string, mixDesignId: string) => {
    const materials: Material[] = [
      { type: 'cement', targetQuantity: 350, dispensedQuantity: 0, unit: 'kg', tolerance: 2 },
      { type: 'sand', targetQuantity: 700, dispensedQuantity: 0, unit: 'kg', tolerance: 3 },
      { type: 'aggregate', targetQuantity: 1200, dispensedQuantity: 0, unit: 'kg', tolerance: 3 },
      { type: 'water', targetQuantity: 175, dispensedQuantity: 0, unit: 'liters', tolerance: 2 },
      { type: 'admixture', targetQuantity: 3.5, dispensedQuantity: 0, unit: 'liters', tolerance: 1 },
    ];

    const session: LoadingSession = {
      sessionId: `LS-${Date.now()}`,
      bayId,
      vehicleRegNo,
      mixDesignId,
      startTime: new Date().toISOString(),
      materials,
      qualityChecks: mockQualityChecks,
      overallProgress: 0,
      status: 'in_progress',
      operatorId: 'OP-001',
    };

    setBays(prev => prev.map(bay =>
      bay.id === bayId ? { ...bay, status: 'loading', currentSession: session } : bay
    ));

    setActiveSessions(prev => [...prev, session]);
    api.createLoadingSession(session).catch(err => console.warn("Could not save loading session to MySQL:", err));
  };

  const dispenseMaterial = (bayId: string, materialType: string, quantity: number) => {
    setBays(prev => prev.map(bay => {
      if (bay.id === bayId && bay.currentSession) {
        const updatedMaterials = bay.currentSession.materials.map(m =>
          m.type === materialType ? { ...m, dispensedQuantity: m.dispensedQuantity + quantity } : m
        );
        const totalProgress = updatedMaterials.reduce((acc, m) => 
          acc + (m.dispensedQuantity / m.targetQuantity) * 100, 0
        ) / updatedMaterials.length;

        return {
          ...bay,
          currentSession: {
            ...bay.currentSession,
            materials: updatedMaterials,
            overallProgress: totalProgress,
          },
        };
      }
      return bay;
    }));
  };

  const completeQualityCheck = (bayId: string, checkId: string, actualValue: string, passed: boolean) => {
    setBays(prev => prev.map(bay => {
      if (bay.id === bayId && bay.currentSession) {
        const updatedChecks = bay.currentSession.qualityChecks.map(qc =>
          qc.id === checkId ? { ...qc, actualValue, status: (passed ? 'passed' : 'failed') as QualityCheck['status'] } : qc
        );
        const allPassed = updatedChecks.every(qc => qc.status === 'passed');
        
        return {
          ...bay,
          status: (allPassed ? 'available' : 'quality_check') as LoadingBay['status'],
          currentSession: {
            ...bay.currentSession,
            qualityChecks: updatedChecks,
            status: (allPassed ? 'completed' : bay.currentSession.status) as LoadingSession['status'],
            endTime: allPassed ? new Date().toISOString() : undefined,
          },
        };
      }
      return bay;
    }));
  };

  const moveToQualityCheck = (bayId: string) => {
    setBays(prev => prev.map(bay =>
      bay.id === bayId && bay.currentSession
        ? { ...bay, status: 'quality_check', currentSession: { ...bay.currentSession, status: 'quality_check' } }
        : bay
    ));
  };

  const cancelSession = (bayId: string) => {
    setBays(prev => prev.map(bay =>
      bay.id === bayId ? { ...bay, status: 'available', currentSession: undefined } : bay
    ));
  };

  return {
    bays,
    activeSessions,
    startLoading,
    dispenseMaterial,
    completeQualityCheck,
    moveToQualityCheck,
    cancelSession,
  };
};
