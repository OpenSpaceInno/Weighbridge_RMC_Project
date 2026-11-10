import React, { useState } from 'react';
import { X, FileText, Download, Printer, Search, Calendar } from 'lucide-react';
import { WeighbridgeSession } from '@/types/weighbridge';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: WeighbridgeSession[];
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
  sessions,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const filtered = sessions.filter((s) => {
    const matchesSearch =
      (s.vehicleRegNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.partyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(s.transactionNo).includes(searchTerm);
    return matchesSearch;
  });

  const exportCSV = () => {
    const headers = [
      'Tx No',
      'Vehicle No',
      'Party Name',
      'Product',
      '1st Weight (kg)',
      '2nd Weight (kg)',
      'Nett Weight (kg)',
      'Final Rate',
      'Total Amount',
      'Date & Time',
      'Status',
    ];

    const rows = filtered.map((s) => [
      s.transactionNo,
      s.vehicleRegNo,
      `"${s.partyName || ''}"`,
      `"${s.product || s.material || ''}"`,
      s.firstWeight || s.tareWeight || 0,
      s.secondWeight || s.grossWeight || 0,
      s.netWeight || 0,
      s.finalRate || s.rate || 0,
      s.totalAmount || 0,
      `"${s.timestamp}"`,
      s.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Weighbridge_Register_${filterDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-800 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="font-bold text-base">Weighbridge Daily Register & Reports</h2>
              <p className="text-xs text-slate-400">
                Shift log and transaction history
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded flex items-center gap-1.5 shadow"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-center justify-between text-xs">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Vehicle, Party, or Tx #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-900 dark:text-white font-mono"
            />
          </div>
        </div>

        {/* Sessions Table */}
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="py-2 px-3">Tx #</th>
                <th className="py-2 px-3">Vehicle</th>
                <th className="py-2 px-3">Party Name</th>
                <th className="py-2 px-3">Product</th>
                <th className="py-2 px-3 text-right">1st Wt</th>
                <th className="py-2 px-3 text-right">2nd Wt</th>
                <th className="py-2 px-3 text-right">Nett Wt</th>
                <th className="py-2 px-3 text-right">Total Amount</th>
                <th className="py-2 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.sessionId || s.transactionNo}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <td className="py-2 px-3 font-bold text-teal-600 dark:text-teal-400">
                      #{s.transactionNo}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">
                      {s.vehicleRegNo}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-700 dark:text-slate-300">
                      {s.partyName || '-'}
                    </td>
                    <td className="py-2 px-3 font-sans text-slate-600 dark:text-slate-400">
                      {s.product || s.material || '-'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {(s.firstWeight || s.tareWeight || 0).toLocaleString()} kg
                    </td>
                    <td className="py-2 px-3 text-right">
                      {(s.secondWeight || s.grossWeight || 0).toLocaleString()} kg
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-teal-700 dark:text-teal-400">
                      {(s.netWeight || 0).toLocaleString()} kg
                    </td>
                    <td className="py-2 px-3 text-right font-bold">
                      ₹ {(s.totalAmount || 0).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-semibold ${
                          s.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary Footer */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono">
          <div>
            Total Transactions: <strong>{filtered.length}</strong>
          </div>
          <div>
            Total Weight Dispatched:{' '}
            <strong>
              {(
                filtered.reduce((acc, curr) => acc + (curr.netWeight || 0), 0) / 1000
              ).toFixed(2)}{' '}
              MT
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

