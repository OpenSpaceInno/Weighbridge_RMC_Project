import React, { useState, useMemo } from 'react';
import { X, Clock, ArrowRight, Truck, CheckCircle2, Search, Filter } from 'lucide-react';
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
  const [filterQuery, setFilterQuery] = useState('');

  const filteredList = useMemo(() => {
    if (!filterQuery.trim()) return pendingList;
    const q = filterQuery.trim().toLowerCase();
    return pendingList.filter((item) => {
      const txMatch = String(item.transactionNo || '').toLowerCase().includes(q);
      const vehMatch = String(item.vehicleRegNo || '').toLowerCase().includes(q);
      const partyMatch = String(item.partyName || '').toLowerCase().includes(q);
      return txMatch || vehMatch || partyMatch;
    });
  }, [pendingList, filterQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-left">
        {/* Header */}
        <div className="p-4 bg-teal-800 text-white flex items-center justify-between shadow">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded bg-teal-700/80 border border-teal-500/40">
              <Truck className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base tracking-wide">Total Pending Vehicles</h3>
                <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full font-mono">
                  {pendingList.length}
                </span>
              </div>
              <p className="text-xs text-teal-100">
                Vehicles with 1st weighment completed, awaiting 2nd weighment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-teal-700 text-white transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3 bg-slate-100 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter by Transaction No, Vehicle No, or Party..."
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {filterQuery && (
            <button
              onClick={() => setFilterQuery('')}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1"
            >
              Clear
            </button>
          )}
        </div>

        {/* List of Vehicles */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredList.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-teal-500 mb-2 opacity-50" />
              <p className="font-semibold text-slate-700 dark:text-slate-200">
                {pendingList.length === 0 ? 'No Pending Vehicles' : 'No Matching Vehicles'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {pendingList.length === 0
                  ? 'All vehicles entered today have completed 2nd weighment.'
                  : `No pending vehicle matches "${filterQuery}".`}
              </p>
            </div>
          ) : (
            filteredList.map((item) => (
              <div
                key={item.sessionId || item.transactionNo}
                onClick={() => {
                  onSelectVehicle(item);
                  onClose();
                }}
                className="p-3.5 border-2 border-slate-200 dark:border-slate-800 rounded-lg hover:border-amber-500 dark:hover:border-amber-500 hover:shadow-lg transition-all bg-white dark:bg-slate-800/80 cursor-pointer group relative overflow-hidden"
              >
                {/* Accent strip on left */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 group-hover:bg-amber-600 transition-colors" />

                <div className="flex items-start justify-between pl-2">
                  <div className="space-y-1">
                    {/* Highlighted Transaction No & Vehicle No */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200 border-2 border-amber-500 font-mono text-xs font-black shadow-xs tracking-wider">
                        TX #{item.transactionNo}
                      </span>
                      <span className="font-mono text-sm font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 px-2 py-0.5 border border-slate-300 dark:border-slate-700 rounded shadow-xs">
                        {item.vehicleRegNo}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 pt-0.5">
                      {item.partyName || 'Walk-in Customer'}
                    </div>

                    {item.product && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Product: <span className="font-medium text-slate-700 dark:text-slate-300">{item.product}</span>
                      </div>
                    )}
                  </div>

                  <button className="px-3 py-1.5 text-xs font-bold bg-teal-600 group-hover:bg-teal-700 text-white rounded flex items-center gap-1 shadow transition-all active:scale-95 whitespace-nowrap">
                    <span>Load 2nd Wt</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-3 pt-2 pl-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      1st Wt:{' '}
                      <strong className="text-teal-700 dark:text-teal-300 font-bold text-xs">
                        {(item.firstWeight || item.tareWeight || 0).toLocaleString()} kg
                      </strong>
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {item.firstWeightTime ? new Date(item.firstWeightTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Today'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>Click any vehicle to load into terminal</span>
          <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
            {filteredList.length} of {pendingList.length} shown
          </span>
        </div>
      </div>
    </div>
  );
};
