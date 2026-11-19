import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  FileText, 
  Search, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Users, 
  Scale,
  RefreshCw,
  ListOrdered,
  Download,
  Table as TableIcon
} from 'lucide-react';
import { WeighbridgeSession } from '@/types/weighbridge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { 
  ReportFieldConfig, 
  WeighmentReportTransaction, 
  ReportFilterParams, 
  PartyTotalsResponse 
} from '@/types/reports';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

// Complete list of 47 fields in exact numerical sequence matching Screenshot 1 & 2
const DEFAULT_47_FIELDS: ReportFieldConfig[] = [
  { sNo: 1, fieldKey: 'TransactionNo', fieldName: 'TransactionNo', isSelected: true, displayOrder: 1 },
  { sNo: 2, fieldKey: 'FDate', fieldName: 'FDate', isSelected: true, displayOrder: 2 },
  { sNo: 3, fieldKey: 'Charges', fieldName: 'Charges', isSelected: false, displayOrder: 3 },
  { sNo: 4, fieldKey: 'VehicleNo', fieldName: 'VehicleNo', isSelected: true, displayOrder: 4 },
  { sNo: 5, fieldKey: 'PartyName', fieldName: 'PartyName', isSelected: true, displayOrder: 5 },
  { sNo: 6, fieldKey: 'Product', fieldName: 'Product', isSelected: true, displayOrder: 6 },
  { sNo: 7, fieldKey: 'FTime', fieldName: 'FTime', isSelected: false, displayOrder: 7 },
  { sNo: 8, fieldKey: 'FWeight', fieldName: 'FWeight', isSelected: true, displayOrder: 8 },
  { sNo: 9, fieldKey: 'SDate', fieldName: 'SDate', isSelected: false, displayOrder: 9 },
  { sNo: 10, fieldKey: 'STime', fieldName: 'STime', isSelected: false, displayOrder: 10 },
  { sNo: 11, fieldKey: 'SWeight', fieldName: 'SWeight', isSelected: true, displayOrder: 11 },
  { sNo: 12, fieldKey: 'Status', fieldName: 'Status', isSelected: true, displayOrder: 12 },
  { sNo: 13, fieldKey: 'FWUser', fieldName: 'FWUser', isSelected: false, displayOrder: 13 },
  { sNo: 14, fieldKey: 'SWUser', fieldName: 'SWUser', isSelected: false, displayOrder: 14 },
  { sNo: 15, fieldKey: 'NettWeight', fieldName: 'NettWeight', isSelected: true, displayOrder: 15 },
  { sNo: 16, fieldKey: 'lesswt', fieldName: 'lesswt', isSelected: false, displayOrder: 16 },
  { sNo: 17, fieldKey: 'Finwt', fieldName: 'Finwt', isSelected: false, displayOrder: 17 },
  { sNo: 18, fieldKey: 'MoisRate', fieldName: 'MoisRate', isSelected: false, displayOrder: 18 },
  { sNo: 19, fieldKey: 'Amount', fieldName: 'Amount', isSelected: true, displayOrder: 19 },
  { sNo: 20, fieldKey: 'IMAGE1', fieldName: 'IMAGE1', isSelected: false, displayOrder: 20 },
  { sNo: 21, fieldKey: 'IMAGE2', fieldName: 'IMAGE2', isSelected: false, displayOrder: 21 },
  { sNo: 22, fieldKey: 'IMAGE3', fieldName: 'IMAGE3', isSelected: false, displayOrder: 22 },
  { sNo: 23, fieldKey: 'IMAGE4', fieldName: 'IMAGE4', isSelected: false, displayOrder: 23 },
  { sNo: 24, fieldKey: 'udt', fieldName: 'udt', isSelected: false, displayOrder: 24 },
  { sNo: 25, fieldKey: 'Deduction', fieldName: 'Deduction', isSelected: false, displayOrder: 25 },
  { sNo: 26, fieldKey: 'LocationName', fieldName: 'LocationName', isSelected: false, displayOrder: 26 },
  { sNo: 27, fieldKey: 'CultivatorName', fieldName: 'CultivatorName', isSelected: true, displayOrder: 27 },
  { sNo: 28, fieldKey: 'LoadSlipNo', fieldName: 'LoadSlipNo', isSelected: true, displayOrder: 28 },
  { sNo: 29, fieldKey: 'BagsBales', fieldName: 'BagsBales', isSelected: true, displayOrder: 29 },
  { sNo: 30, fieldKey: 'Rate', fieldName: 'Rate', isSelected: true, displayOrder: 30 },
  { sNo: 31, fieldKey: 'Moisture', fieldName: 'Moisture', isSelected: true, displayOrder: 31 },
  { sNo: 32, fieldKey: 'ChessNo', fieldName: 'ChessNo', isSelected: true, displayOrder: 32 },
  { sNo: 33, fieldKey: 'ChessName', fieldName: 'ChessName', isSelected: false, displayOrder: 33 },
  { sNo: 34, fieldKey: 'ChessAmount', fieldName: 'ChessAmount', isSelected: true, displayOrder: 34 },
  { sNo: 35, fieldKey: 'FatherName', fieldName: 'FatherName', isSelected: false, displayOrder: 35 },
  { sNo: 36, fieldKey: 'Mandal', fieldName: 'Mandal', isSelected: false, displayOrder: 36 },
  { sNo: 37, fieldKey: 'Village', fieldName: 'Village', isSelected: true, displayOrder: 37 },
  { sNo: 38, fieldKey: 'BankName', fieldName: 'BankName', isSelected: false, displayOrder: 38 },
  { sNo: 39, fieldKey: 'BranchName', fieldName: 'BranchName', isSelected: false, displayOrder: 39 },
  { sNo: 40, fieldKey: 'IFSCODE', fieldName: 'IFSCODE', isSelected: false, displayOrder: 40 },
  { sNo: 41, fieldKey: 'TraderName', fieldName: 'TraderName', isSelected: false, displayOrder: 41 },
  { sNo: 42, fieldKey: 'AllotedMil', fieldName: 'AllotedMil', isSelected: false, displayOrder: 42 },
  { sNo: 43, fieldKey: 'AccountNo', fieldName: 'AccountNo', isSelected: false, displayOrder: 43 },
  { sNo: 44, fieldKey: 'Heap', fieldName: 'Heap', isSelected: false, displayOrder: 44 },
  { sNo: 45, fieldKey: 'FinalRate', fieldName: 'FinalRate', isSelected: false, displayOrder: 45 },
  { sNo: 46, fieldKey: 'MobileNo', fieldName: 'MobileNo', isSelected: true, displayOrder: 46 },
  { sNo: 47, fieldKey: 'FinalWeight', fieldName: 'FinalWeight', isSelected: false, displayOrder: 47 }
];

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions?: WeighbridgeSession[];
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();

  // 1. Fields State (all 47 fields initialized)
  const [fields, setFields] = useState<ReportFieldConfig[]>(DEFAULT_47_FIELDS);
  const [highlightedFieldKey, setHighlightedFieldKey] = useState<string>('TransactionNo');
  const [isSavingFields, setIsSavingFields] = useState(false);

  // 2. Conditions / Filters State matching Screenshot 1
  const [filterParams, setFilterParams] = useState<ReportFilterParams>({
    dateFrom: '2026-11-12',
    dateTo: new Date().toISOString().split('T')[0],
    partyName: '',
    product: '',
    status: '',
    transNoFrom: '',
    transNoTo: '',
    vehicleNo: '',
    fwUser: '',
    swUser: '',
    firstDateWise: true
  });

  const [filterOptions, setFilterOptions] = useState<{
    parties: string[];
    products: string[];
    statuses: string[];
    users: string[];
  }>({
    parties: [],
    products: [],
    statuses: [],
    users: []
  });

  // 3. Search Results & View Mode
  const [searchResults, setSearchResults] = useState<WeighmentReportTransaction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  // View mode: 'grid' = transaction data grid; 'layout' = Screenshot 1 numbered fields layout
  const [viewMode, setViewMode] = useState<'grid' | 'layout'>('grid');

  // 4. Party Totals State
  const [isPartyTotalOpen, setIsPartyTotalOpen] = useState(false);
  const [partyTotalsData, setPartyTotalsData] = useState<PartyTotalsResponse | null>(null);
  const [isLoadingPartyTotals, setIsLoadingPartyTotals] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    loadFieldConfigs();
    loadFilterOptions();
    executeSearch();
  }, [isOpen]);

  const loadFieldConfigs = async () => {
    try {
      const serverFields = await api.getReportFields('default', 'weighment_report');
      if (serverFields && serverFields.length === 47) {
        setFields(serverFields);
      }
    } catch (err) {
      console.warn('Using default 47 report fields config:', err);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const opts = await api.getReportFilterOptions();
      if (opts) {
        setFilterOptions({
          parties: opts.parties || [],
          products: opts.products || [],
          statuses: opts.statuses || [],
          users: opts.users || []
        });
      }
    } catch (e) {
      console.warn('Failed to load filter options:', e);
    }
  };

  const executeSearch = async () => {
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await api.searchReports(filterParams);
      if (res && res.data) {
        setSearchResults(res.data);
      }
    } catch (err: any) {
      toast({
        title: 'Search Failed',
        description: err.message || 'Error searching reports',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const activeSelectedFields = useMemo(() => {
    return [...fields]
      .filter((f) => f.isSelected)
      .sort((a, b) => a.displayOrder - b.displayOrder);
  }, [fields]);

  const toggleFieldSelection = (fieldKey: string) => {
    setFields((prev) =>
      prev.map((f) => (f.fieldKey === fieldKey ? { ...f, isSelected: !f.isSelected } : f))
    );
  };

  const allSelected = useMemo(() => fields.length > 0 && fields.every((f) => f.isSelected), [fields]);
  const toggleSelectAll = () => {
    const nextState = !allSelected;
    setFields((prev) => prev.map((f) => ({ ...f, isSelected: nextState })));
  };

  const handleMoveUp = () => {
    if (!highlightedFieldKey) return;
    setFields((prev) => {
      const sorted = [...prev].sort((a, b) => a.displayOrder - b.displayOrder);
      const index = sorted.findIndex((f) => f.fieldKey === highlightedFieldKey);
      if (index <= 0) return prev;
      const current = sorted[index];
      const prevField = sorted[index - 1];
      const temp = current.displayOrder;
      current.displayOrder = prevField.displayOrder;
      prevField.displayOrder = temp;
      return [...sorted].sort((a, b) => a.sNo - b.sNo);
    });
  };

  const handleMoveDown = () => {
    if (!highlightedFieldKey) return;
    setFields((prev) => {
      const sorted = [...prev].sort((a, b) => a.displayOrder - b.displayOrder);
      const index = sorted.findIndex((f) => f.fieldKey === highlightedFieldKey);
      if (index < 0 || index >= sorted.length - 1) return prev;
      const current = sorted[index];
      const nextField = sorted[index + 1];
      const temp = current.displayOrder;
      current.displayOrder = nextField.displayOrder;
      nextField.displayOrder = temp;
      return [...sorted].sort((a, b) => a.sNo - b.sNo);
    });
  };

  const handleSaveSelectedFields = async () => {
    setIsSavingFields(true);
    try {
      await api.saveReportFields(fields, 'default', 'weighment_report');
      toast({
        title: 'Fields Configuration Saved',
        description: `Saved ${activeSelectedFields.length} selected fields and custom display order.`,
      });
    } catch (err: any) {
      toast({
        title: 'Save Warning',
        description: err.message || 'Saved locally for active session',
        variant: 'destructive',
      });
    } finally {
      setIsSavingFields(false);
    }
  };

  const handleOpenPartyTotal = async () => {
    setIsLoadingPartyTotals(true);
    setIsPartyTotalOpen(true);
    try {
      const res = await api.getPartyTotals(filterParams);
      if (res) setPartyTotalsData(res);
    } catch (err: any) {
      toast({
        title: 'Party Totals Error',
        description: err.message || 'Failed to calculate party totals',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingPartyTotals(false);
    }
  };

  const handleExportCSV = async () => {
    let dataToExport = searchResults;
    if (dataToExport.length === 0) {
      try {
        setIsSearching(true);
        const res = await api.searchReports(filterParams);
        if (res && res.data && res.data.length > 0) {
          dataToExport = res.data;
          setSearchResults(res.data);
        }
      } catch (e: any) {
        console.warn('Auto search before export warning:', e);
      } finally {
        setIsSearching(false);
      }
    }

    if (dataToExport.length === 0) {
      toast({
        title: 'No Data to Export',
        description: 'No weighment records found for the selected date range and criteria.',
        variant: 'destructive',
      });
      return;
    }

    const fieldsToExport = activeSelectedFields.length > 0 ? activeSelectedFields : fields.filter((f) => f.isSelected);
    const resolvedFields = fieldsToExport.length > 0 ? fieldsToExport : fields;
    const headers = resolvedFields.map((f) => `"${f.fieldName.replace(/"/g, '""')}"`);

    const rows = dataToExport.map((row) => {
      return resolvedFields.map((f) => {
        const val = (row as any)[f.fieldKey];
        if (val === undefined || val === null) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const fromStr = filterParams.dateFrom || 'start';
    const toStr = filterParams.dateTo || 'end';
    link.download = `weighment_report_${fromStr}_to_${toStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'CSV Export Successful',
      description: `Downloaded ${dataToExport.length} weighment records in CSV format.`,
    });
  };

  const handleExportPartyTotalsCSV = () => {
    if (!partyTotalsData || !partyTotalsData.partyTotals.length) {
      toast({
        title: 'No Data to Export',
        description: 'No party totals available to download.',
        variant: 'destructive',
      });
      return;
    }

    const headers = ['Party Name', 'Total Trips', 'Total Net Weight (kg)', 'Total Final Weight (kg)', 'Total Amount (₹)'];
    const rows = partyTotalsData.partyTotals.map((pt) => [
      `"${(pt.partyName || '').replace(/"/g, '""')}"`,
      pt.totalTransactions,
      pt.totalNetWeight,
      pt.totalFinalWeight,
      pt.totalAmount
    ].join(','));

    const summaryRow = [
      '"GRAND TOTAL"',
      partyTotalsData.grandTotals.totalTransactions,
      partyTotalsData.grandTotals.totalNetWeight,
      partyTotalsData.grandTotals.totalFinalWeight,
      partyTotalsData.grandTotals.totalAmount
    ].join(',');

    const csvContent = '\uFEFF' + [headers.join(','), ...rows, summaryRow].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `party_totals_summary_${filterParams.dateFrom || 'start'}_to_${filterParams.dateTo || 'end'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: 'Party Totals Exported',
      description: `Downloaded summary for ${partyTotalsData.partyTotals.length} parties in CSV format.`,
    });
  };

  const formatCellValue = (key: string, val: any) => {
    if (val === undefined || val === null || val === '') return '—';
    if (typeof val === 'number') {
      if (['FWeight', 'SWeight', 'NettWeight', 'lesswt', 'Finwt', 'Deduction', 'FinalWeight'].includes(key)) {
        return `${val.toLocaleString()} kg`;
      }
      if (['Amount', 'Charges', 'ChessAmount', 'Rate', 'FinalRate', 'MoisRate'].includes(key)) {
        return `₹ ${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      if (key === 'Moisture') {
        return `${val}%`;
      }
      return val.toLocaleString();
    }
    return String(val);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-lg shadow-2xl border border-slate-300 dark:border-slate-800 w-full max-w-7xl max-h-[94vh] flex flex-col overflow-hidden">
        
        {/* 1. Header matching Screenshot 1 (Master Weighment Reports Tools Settings Help Exit + 000000 Scale) */}
        <div className="bg-slate-800 text-white px-3 py-1.5 flex items-center justify-between border-b border-slate-700 shadow-xs relative">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="px-2 py-0.5 rounded text-slate-300">Master</span>
            <span className="px-2 py-0.5 rounded text-slate-300 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-teal-400" />
              <span>Weighment</span>
            </span>
            <span className="px-2.5 py-0.5 rounded bg-teal-700 text-white font-bold flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-white" />
              <span>Reports</span>
            </span>
            <span className="px-2 py-0.5 rounded text-slate-300">Tools</span>
            <span className="px-2 py-0.5 rounded text-slate-300">Settings</span>
            <span className="px-2 py-0.5 rounded text-slate-300">Help</span>
            <button
              onClick={onClose}
              className="px-2 py-0.5 rounded text-rose-300 hover:text-white hover:bg-rose-900/40"
            >
              Exit
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-mono text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">LIVE SCALE</span>
              <span className="text-lg font-black text-emerald-400">000000</span>
              <span className="text-xs text-slate-400">kg</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white ml-2"
              title="Close Dialog"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Main Body: Left Panel (47 Fields) | Reorder Arrows | Center (Conditions + Dynamic Table) */}
        <div className="p-3 flex-1 flex flex-col gap-2 overflow-hidden bg-slate-50/60 dark:bg-slate-950/60">
          <div className="grid grid-cols-12 gap-2 flex-1 min-h-[520px]">
            
            {/* PANEL A: LEFT PANEL - 47 REPORT FIELDS (Screenshot 1 & 2) */}
            <div className="col-span-12 lg:col-span-3 flex flex-col border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 overflow-hidden shadow-xs text-xs">
              <div className="bg-slate-200 dark:bg-slate-800 border-b border-slate-300 dark:border-slate-700 grid grid-cols-12 font-bold py-1 px-2 text-center text-[11px] text-slate-700 dark:text-slate-200">
                <span className="col-span-2 border-r border-slate-300 dark:border-slate-700">Sno</span>
                <span className="col-span-7 border-r border-slate-300 dark:border-slate-700 text-left pl-2">Fields</span>
                <span className="col-span-3">Select</span>
              </div>

              {/* 47 Vertically Scrollable Fields in Strict Screenshot Order */}
              <div className="flex-1 overflow-y-auto max-h-[420px] divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950 font-mono">
                {fields.map((f) => {
                  const isHighlighted = highlightedFieldKey === f.fieldKey;
                  return (
                    <div
                      key={f.fieldKey}
                      onClick={() => setHighlightedFieldKey(f.fieldKey)}
                      className={`grid grid-cols-12 items-center py-1 px-2 cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-blue-100 dark:bg-blue-950 text-blue-900 dark:text-blue-100 font-bold border-l-4 border-blue-600'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span className="col-span-2 text-center text-slate-500 font-normal">{f.sNo}</span>
                      <span className="col-span-7 truncate font-sans text-left pl-1 font-medium" title={f.fieldName}>
                        {f.fieldName}
                      </span>
                      <div className="col-span-3 flex justify-center">
                        <input
                          type="checkbox"
                          checked={f.isSelected}
                          onChange={() => toggleFieldSelection(f.fieldKey)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-3.5 h-3.5 text-teal-600 rounded border-slate-300 cursor-pointer"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom controls of Left Panel matching Screenshot 1 */}
              <div className="p-1.5 border-t border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-between text-[11px]">
                <label className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 text-teal-600 rounded"
                  />
                  <span>Select All</span>
                </label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveSelectedFields}
                  disabled={isSavingFields}
                  className="h-6 text-[10px] font-bold text-teal-700 border-teal-600 hover:bg-teal-50 dark:text-teal-400 dark:border-teal-500 px-2"
                >
                  <Save className="w-3 h-3 mr-1" />
                  <span>{isSavingFields ? 'Saving...' : 'Save Selected Fields'}</span>
                </Button>
              </div>
            </div>

            {/* PANEL B: MIDDLE ORDERING CONTROLS (Screenshot 1 Up & Down Blue Arrows) */}
            <div className="hidden lg:flex col-span-1 flex-col items-center justify-center gap-3">
              <button
                onClick={handleMoveUp}
                title="Move Highlighted Field Up"
                className="w-9 h-14 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow transition-transform active:scale-95"
              >
                <ArrowUp className="w-6 h-6 stroke-[3]" />
              </button>
              <button
                onClick={handleMoveDown}
                title="Move Highlighted Field Down"
                className="w-9 h-14 rounded bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow transition-transform active:scale-95"
              >
                <ArrowDown className="w-6 h-6 stroke-[3]" />
              </button>
            </div>

            {/* PANEL C: CENTER AREA - CONDITIONS & DYNAMIC REPORT TABLE */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-2">
              
              {/* Conditions Panel matching Screenshot 1 */}
              <div className="border border-slate-300 dark:border-slate-700 rounded p-2.5 bg-white dark:bg-slate-900 shadow-xs text-xs">
                <span className="font-bold block mb-1 text-[11px] uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Conditions
                </span>

                <div className="grid grid-cols-12 gap-x-2 gap-y-1.5 items-center text-[11px]">
                  {/* Row 1: Date From & To */}
                  <span className="col-span-3 text-right pr-1 font-semibold text-slate-600 dark:text-slate-400">Date From</span>
                  <div className="col-span-4">
                    <Input
                      type="date"
                      value={filterParams.dateFrom}
                      onChange={(e) => setFilterParams({ ...filterParams, dateFrom: e.target.value })}
                      className="h-6 text-[11px] p-1 bg-white dark:bg-slate-950 border-slate-300"
                    />
                  </div>
                  <span className="col-span-1 text-center font-semibold text-slate-600 dark:text-slate-400">To</span>
                  <div className="col-span-4">
                    <Input
                      type="date"
                      value={filterParams.dateTo}
                      onChange={(e) => setFilterParams({ ...filterParams, dateTo: e.target.value })}
                      className="h-6 text-[11px] p-1 bg-white dark:bg-slate-950 border-slate-300"
                    />
                  </div>

                  {/* Row 2: Party Name */}
                  <span className="col-span-3 text-right pr-1 font-semibold text-slate-600 dark:text-slate-400">Party Name</span>
                  <div className="col-span-9">
                    <select
                      value={filterParams.partyName}
                      onChange={(e) => setFilterParams({ ...filterParams, partyName: e.target.value })}
                      className="w-full h-6 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1 text-[11px] outline-none"
                    >
                      <option value="">-- All Parties --</option>
                      {filterOptions.parties.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Row 3: Product */}
                  <span className="col-span-3 text-right pr-1 font-semibold text-slate-600 dark:text-slate-400">Product</span>
                  <div className="col-span-9">
                    <select
                      value={filterParams.product}
                      onChange={(e) => setFilterParams({ ...filterParams, product: e.target.value })}
                      className="w-full h-6 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1 text-[11px] outline-none"
                    >
                      <option value="">-- All Products --</option>
                      {filterOptions.products.map((prod) => (
                        <option key={prod} value={prod}>{prod}</option>
                      ))}
                    </select>
                  </div>

                  {/* Row 4: Status */}
                  <span className="col-span-3 text-right pr-1 font-semibold text-slate-600 dark:text-slate-400">Status</span>
                  <div className="col-span-9">
                    <select
                      value={filterParams.status}
                      onChange={(e) => setFilterParams({ ...filterParams, status: e.target.value })}
                      className="w-full h-6 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1 text-[11px] outline-none"
                    >
                      <option value="">-- All Statuses --</option>
                      <option value="Inward">Inward</option>
                      <option value="Outward">Outward</option>
                    </select>
                  </div>

                  {/* Row 5: Trans No From & To */}
                  <span className="col-span-3 text-right pr-1 font-semibold text-slate-600 dark:text-slate-400">Trans No</span>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      placeholder="From"
                      value={filterParams.transNoFrom}
                      onChange={(e) => setFilterParams({ ...filterParams, transNoFrom: e.target.value })}
                      className="h-6 text-[11px] p-1 bg-white dark:bg-slate-950 border-slate-300"
                    />
                  </div>
                  <span className="col-span-1 text-center font-semibold text-slate-600 dark:text-slate-400">To</span>
                  <div className="col-span-4">
                    <Input
                      type="number"
                      placeholder="To"
                      value={filterParams.transNoTo}
                      onChange={(e) => setFilterParams({ ...filterParams, transNoTo: e.target.value })}
                      className="h-6 text-[11px] p-1 bg-white dark:bg-slate-950 border-slate-300"
                    />
                  </div>

                  {/* Row 6: Vehicle No */}
                  <span className="col-span-3 text-right pr-1 font-semibold text-slate-600 dark:text-slate-400">Vehicle No</span>
                  <div className="col-span-9">
                    <Input
                      type="text"
                      placeholder="e.g. MH12AB1234 or AP28"
                      value={filterParams.vehicleNo}
                      onChange={(e) => setFilterParams({ ...filterParams, vehicleNo: e.target.value })}
                      className="h-6 text-[11px] uppercase p-1 bg-white dark:bg-slate-950 border-slate-300 font-mono"
                    />
                  </div>

                  {/* Row 7: FW User & SW User */}
                  <span className="col-span-3 text-right pr-1 font-semibold text-slate-600 dark:text-slate-400">FW User</span>
                  <div className="col-span-4">
                    <select
                      value={filterParams.fwUser}
                      onChange={(e) => setFilterParams({ ...filterParams, fwUser: e.target.value })}
                      className="w-full h-6 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1 text-[11px] outline-none"
                    >
                      <option value="">All Users</option>
                      {filterOptions.users.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <span className="col-span-2 text-right pr-1 font-semibold text-slate-600 dark:text-slate-400">SW User</span>
                  <div className="col-span-3">
                    <select
                      value={filterParams.swUser}
                      onChange={(e) => setFilterParams({ ...filterParams, swUser: e.target.value })}
                      className="w-full h-6 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1 text-[11px] outline-none"
                    >
                      <option value="">All Users</option>
                      {filterOptions.users.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Table Area with Dual Mode (Screenshot 1 Layout vs Transaction Grid) */}
              <div className="border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 flex-1 flex flex-col overflow-hidden min-h-[220px]">
                
                {/* Table View Mode Switcher Header */}
                <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs">
                  <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    {viewMode === 'grid' ? (
                      <>
                        <TableIcon className="w-3.5 h-3.5 text-teal-600" />
                        <span>Transaction Report Grid ({searchResults.length} records matching conditions)</span>
                      </>
                    ) : (
                      <>
                        <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
                        <span>Configured Fields Layout ({activeSelectedFields.length} active fields in report & print)</span>
                      </>
                    )}
                  </span>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        viewMode === 'grid'
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Data Grid
                    </button>
                    <button
                      onClick={() => setViewMode('layout')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        viewMode === 'layout'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-900 border text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Fields Layout (Screenshot 1)
                    </button>
                  </div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-auto max-h-[260px]">
                  {viewMode === 'layout' ? (
                    /* Exact Screenshot 1 Table: Numbered List of Selected Fields */
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 sticky top-0 z-10 border-b text-[10px] font-bold uppercase">
                        <tr>
                          <th className="py-1 px-3 w-12 text-center border-r">S.No</th>
                          <th className="py-1 px-3 text-left border-r">Selected Field Name</th>
                          <th className="py-1 px-3 text-left border-r">Order</th>
                          <th className="py-1 px-3 text-left">Print & Report Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                        {activeSelectedFields.map((field, idx) => (
                          <tr key={field.fieldKey} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-1 px-3 text-center font-bold text-slate-700 dark:text-slate-300 border-r">{idx + 1}</td>
                            <td className="py-1 px-3 font-sans font-bold text-slate-900 dark:text-slate-100 border-r">{field.fieldName}</td>
                            <td className="py-1 px-3 text-slate-500 border-r">Column #{field.displayOrder}</td>
                            <td className="py-1 px-3 text-teal-700 dark:text-teal-400 font-semibold font-sans">Active in Report & F5 Print</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    /* Responsive Data Grid with Configured Field Columns */
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 sticky top-0 z-10 border-b border-slate-300 text-[10px] font-bold uppercase">
                        <tr>
                          <th className="py-1.5 px-2 text-center border-r">#</th>
                          {activeSelectedFields.map((field) => (
                            <th key={field.fieldKey} className="py-1.5 px-2.5 text-left border-r whitespace-nowrap">
                              {field.fieldName}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-[11px]">
                        {searchResults.length > 0 ? (
                          searchResults.map((row, idx) => (
                            <tr key={row.TransactionNo || idx} className="hover:bg-teal-50/50 dark:hover:bg-slate-800/60">
                              <td className="py-1 px-1.5 text-center text-slate-400 border-r">{idx + 1}</td>
                              {activeSelectedFields.map((field) => (
                                <td key={field.fieldKey} className="py-1 px-2.5 border-r whitespace-nowrap">
                                  {formatCellValue(field.fieldKey, row[field.fieldKey])}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={activeSelectedFields.length + 1} className="py-10 text-center text-slate-400 font-sans">
                              {isSearching ? (
                                <span>Loading weighment transactions...</span>
                              ) : (
                                <span>No matching records found for selected conditions. Click "Search" to execute query.</span>
                              )}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Bottom Actions matching Screenshot 1 */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800 text-xs">
                {/* First Date Wise Checkbox */}
                <label className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterParams.firstDateWise}
                    onChange={(e) => setFilterParams({ ...filterParams, firstDateWise: e.target.checked })}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                  />
                  <span>First Date Wise</span>
                </label>

                {/* Search, Party Total, Close Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={executeSearch}
                    disabled={isSearching}
                    className="bg-teal-700 hover:bg-teal-800 text-white font-bold h-7 px-4 text-xs shadow"
                  >
                    <Search className="w-3.5 h-3.5 mr-1" />
                    <span>{isSearching ? 'Searching...' : 'Search'}</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleOpenPartyTotal}
                    className="font-bold h-7 px-3 text-xs border-slate-400 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                  >
                    <Users className="w-3.5 h-3.5 mr-1 text-teal-600" />
                    <span>Party Total</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExportCSV}
                    className="font-bold h-7 px-3 text-xs border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    title="Export searched weighment records to CSV file"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    <span>Export CSV</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 font-bold h-7 px-3 text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 3. Party Totals Dialog */}
        <Dialog open={isPartyTotalOpen} onOpenChange={setIsPartyTotalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-teal-800 dark:text-teal-400 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-teal-600" />
                <span>Weighment Party Totals Summary</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Summary grouped by party for current report search criteria.
              </DialogDescription>
            </DialogHeader>

            {isLoadingPartyTotals ? (
              <div className="py-8 text-center text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-teal-600" />
                <span>Aggregating party totals from MySQL...</span>
              </div>
            ) : partyTotalsData ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-4 gap-2 bg-slate-100 dark:bg-slate-800 p-2.5 rounded text-center font-mono">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Trips</span>
                    <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                      {partyTotalsData.grandTotals.totalTransactions}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Net Weight</span>
                    <span className="font-black text-sm text-teal-700 dark:text-teal-400">
                      {partyTotalsData.grandTotals.totalNetWeight.toLocaleString()} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Final Weight</span>
                    <span className="font-black text-sm text-blue-700 dark:text-blue-400">
                      {partyTotalsData.grandTotals.totalFinalWeight.toLocaleString()} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Revenue</span>
                    <span className="font-black text-sm text-amber-600 dark:text-amber-400">
                      ₹ {partyTotalsData.grandTotals.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded max-h-60 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 font-bold border-b text-[10px] uppercase">
                      <tr>
                        <th className="py-1.5 px-3 text-left">Party Name</th>
                        <th className="py-1.5 px-2 text-center">Trips</th>
                        <th className="py-1.5 px-3 text-right">Net Weight</th>
                        <th className="py-1.5 px-3 text-right">Final Weight</th>
                        <th className="py-1.5 px-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                      {partyTotalsData.partyTotals.map((pt, i) => (
                        <tr key={pt.partyName || i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-1.5 px-3 font-sans font-bold text-slate-900 dark:text-slate-100">{pt.partyName}</td>
                          <td className="py-1.5 px-2 text-center">{pt.totalTransactions}</td>
                          <td className="py-1.5 px-3 text-right font-bold text-teal-700 dark:text-teal-400">{pt.totalNetWeight.toLocaleString()} kg</td>
                          <td className="py-1.5 px-3 text-right font-bold text-blue-700 dark:text-blue-400">{pt.totalFinalWeight.toLocaleString()} kg</td>
                          <td className="py-1.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            ₹ {pt.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button
                size="sm"
                variant="outline"
                onClick={handleExportPartyTotalsCSV}
                className="text-xs h-7 border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                <span>Export Party Totals CSV</span>
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsPartyTotalOpen(false)} className="text-xs h-7">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};
