import React from 'react';
import { X, Clock, ArrowRight, Truck, CheckCircle2 } from 'lucide-react';
import { WeighbridgeSession } from '@/types/weighbridge';

interface PendingVehiclesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pendingList: WeighbridgeSession[];
  onSelectVehicle: (session: WeighbridgeSession) => void;
}

export const PendingVehiclesDrawer: React.FC<PendingVehiclesDrawerProps> = ({
  isOpen,
  onClose,
  pendingList,
  onSelectVehicle,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-left">
        {/* Header */}
        <div className="p-4 bg-teal-700 text-white flex items-center justify-between shadow">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            <div>
              <h3 className="font-bold text-base">Today's Pending Vehicles</h3>
              <p className="text-xs text-teal-100">
                {pendingList.length} vehicle(s) awaiting 2nd weighment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-teal-800 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Vehicles */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {pendingList.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-teal-500 mb-2 opacity-50" />
              <p className="font-medium text-slate-600 dark:text-slate-300">
                No Pending Vehicles
              </p>
              <p className="text-xs text-slate-400 mt-1">
                All vehicles entered today have completed 2nd weighment.
              </p>
            </div>
          ) : (
            pendingList.map((item) => (
              <div
                key={item.sessionId || item.transactionNo}
                onClick={() => {
                  onSelectVehicle(item);
                  onClose();
                }}
                className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-teal-500 dark:hover:border-teal-500 hover:shadow-md transition-all bg-slate-50 dark:bg-slate-800/60 cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-900 px-2 py-0.5 border border-slate-300 dark:border-slate-700 rounded">
                        {item.vehicleRegNo}
                      </span>
                      <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-semibold">
                        Tx #{item.transactionNo}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mt-1">
                      {item.partyName || 'Walk-in Customer'}
                    </div>
                    {item.product && (
                      <div className="text-[11px] text-slate-500">
                        {item.product}
                      </div>
                    )}
                  </div>
                  <button className="px-2.5 py-1 text-xs font-semibold bg-teal-600 group-hover:bg-teal-700 text-white rounded flex items-center gap-1 shadow-sm transition-colors">
                    <span>Load</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>
                      1st Wt:{' '}
                      <strong className="text-slate-800 dark:text-slate-200">
                        {item.firstWeight?.toLocaleString() || item.tareWeight?.toLocaleString() || '0'} kg
                      </strong>
                    </span>
                  </div>
                  <span>
                    {item.firstWeightTime ? new Date(item.firstWeightTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
          Click any vehicle to load into terminal for 2nd Weighment
        </div>
      </div>
    </div>
  );
};

