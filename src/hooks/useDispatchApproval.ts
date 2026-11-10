import { api } from '@/lib/api';
import { useState, useEffect, useCallback } from 'react';
import { PendingDispatch, ApprovalAction, DeliveryDocumentation, RouteAssignment, PlateImage } from '@/types/dispatch';

export const useDispatchApproval = () => {
  const [pendingDispatches, setPendingDispatches] = useState<PendingDispatch[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize with MySQL dispatches, fallback to mock data
  useEffect(() => {
    const fetchLiveDispatches = async () => {
      try {
        setLoading(true);
        const live = await api.getDispatches();
        if (Array.isArray(live) && live.length > 0) {
          setPendingDispatches(live);
        } else {
          loadMockDispatches();
        }
      } catch (err) {
        console.warn('Using mock dispatches:', err);
        loadMockDispatches();
      } finally {
        setLoading(false);
      }
    };
    const loadMockDispatches = () => {
    const mockDispatches: PendingDispatch[] = [
      {
        id: 'DISP-001',
        vehicleRegNo: 'MH12AB1234',
        timestamp: new Date().toISOString(),
        material: 'Ready Mix Concrete M25',
        quantity: 8500,
        unit: 'kg',
        customer: 'BuildCorp Constructions',
        documentation: [
          {
            id: 'doc-1',
            type: 'weigh_slip',
            url: '#',
            timestamp: new Date().toISOString(),
            verified: true,
          },
          {
            id: 'doc-2',
            type: 'quality_cert',
            url: '#',
            timestamp: new Date().toISOString(),
            verified: true,
          },
        ],
        plateImages: [
          {
            id: 'plate-1',
            angle: 'front',
            url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop',
            timestamp: new Date().toISOString(),
          },
          {
            id: 'plate-2',
            angle: 'back',
            url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop',
            timestamp: new Date().toISOString(),
          },
        ],
        status: 'pending',
      },
      {
        id: 'DISP-002',
        vehicleRegNo: 'GJ05CD5678',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        material: 'OPC Cement Grade 53',
        quantity: 12.5,
        unit: 'ton',
        customer: 'Metro Infrastructure Ltd',
        documentation: [
          {
            id: 'doc-3',
            type: 'weigh_slip',
            url: '#',
            timestamp: new Date().toISOString(),
            verified: true,
          },
          {
            id: 'doc-4',
            type: 'invoice',
            url: '#',
            timestamp: new Date().toISOString(),
            verified: false,
          },
        ],
        plateImages: [
          {
            id: 'plate-3',
            angle: 'front',
            url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&auto=format&fit=crop',
            timestamp: new Date().toISOString(),
          },
        ],
        status: 'pending',
      },
    ];

    setPendingDispatches(mockDispatches);
    };
    fetchLiveDispatches();
  }, []);

  const approveDispatch = useCallback((action: ApprovalAction) => {
    setLoading(true);

    if (action.action === 'approve') {
      api.approveDispatch(action.dispatchId, 'OP001', action.route).catch(err => {
        console.warn('Failed to approve dispatch in MySQL:', err);
      });
    } else {
      api.rejectDispatch(action.dispatchId, action.reason).catch(err => {
        console.warn('Failed to reject dispatch in MySQL:', err);
      });
    }
    
    setTimeout(() => {
      setPendingDispatches(prev => 
        prev.map(dispatch => 
          dispatch.id === action.dispatchId
            ? {
                ...dispatch,
                status: action.action === 'approve' ? 'approved' : 'rejected',
                approvedBy: 'OP001',
                approvedAt: new Date().toISOString(),
                rejectionReason: action.reason,
                route: action.route,
              }
            : dispatch
        )
      );
      setLoading(false);
    }, 500);
  }, []);

  const assignRoute = useCallback((dispatchId: string, route: RouteAssignment) => {
    setPendingDispatches(prev =>
      prev.map(dispatch =>
        dispatch.id === dispatchId
          ? { ...dispatch, route }
          : dispatch
      )
    );
  }, []);

  const verifyDocument = useCallback((dispatchId: string, docId: string) => {
    setPendingDispatches(prev =>
      prev.map(dispatch =>
        dispatch.id === dispatchId
          ? {
              ...dispatch,
              documentation: dispatch.documentation.map(doc =>
                doc.id === docId ? { ...doc, verified: true } : doc
              ),
            }
          : dispatch
      )
    );
  }, []);

  return {
    pendingDispatches,
    loading,
    approveDispatch,
    assignRoute,
    verifyDocument,
  };
};
