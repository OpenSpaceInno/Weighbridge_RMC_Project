import React, { useEffect, useState } from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Camera, FileText, Loader2, ArrowLeft } from 'lucide-react';
import { WeighSlip } from '@/types/weighbridge';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/lib/api';
import { ReportFieldConfig, WeighmentReportTransaction } from '@/types/reports';

interface WeighmentF5PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionNo: number;
  activeSlip?: WeighSlip | null;
  formData?: any;
}

export const WeighmentF5PrintModal: React.FC<WeighmentF5PrintModalProps> = ({
  isOpen,
  onClose,
  transactionNo,
  activeSlip,
  formData,
}) => {
  const { company } = useCompany();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<WeighmentReportTransaction | null>(null);
  const [fieldConfigs, setFieldConfigs] = useState<ReportFieldConfig[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchTransactionPrintData = async () => {
      setLoading(true);
      try {
        const txId = transactionNo || activeSlip?.transactionNo || formData?.transactionNo || 1;
        const res = await api.getReportTransactionForPrint(txId);
        if (isMounted && res.success) {
          setReportData(res.transaction);
          setFieldConfigs(res.fieldConfigs || []);
          if (res.company) setCompanyInfo(res.company);
        }
      } catch (err) {
        console.warn('Failed to load transaction print data from API, using local fallback:', err);
        // Fallback using activeSlip or formData
        if (isMounted) {
          const fallbackData: any = {
            TransactionNo: activeSlip?.transactionNo || formData?.transactionNo || transactionNo || 1,
            FDate: activeSlip?.firstWeightTime ? new Date(activeSlip.firstWeightTime).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            Charges: activeSlip?.charges || formData?.charges || 0,
            VehicleNo: activeSlip?.vehicleRegNo || formData?.vehicleRegNo || '',
            PartyName: activeSlip?.partyName || formData?.partyName || '',
            Product: activeSlip?.product || activeSlip?.material || formData?.product || '',
            FTime: activeSlip?.firstWeightTime ? new Date(activeSlip.firstWeightTime).toTimeString().split(' ')[0] : '09:00:00',
            FWeight: activeSlip?.firstWeight || formData?.firstWeight || 0,
            SDate: activeSlip?.secondWeightTime ? new Date(activeSlip.secondWeightTime).toISOString().split('T')[0] : '',
            STime: activeSlip?.secondWeightTime ? new Date(activeSlip.secondWeightTime).toTimeString().split(' ')[0] : '',
            SWeight: activeSlip?.secondWeight || formData?.secondWeight || 0,
            Status: activeSlip?.secondWeight ? 'completed' : 'pending_2nd_weight',
            FWUser: activeSlip?.operatorName || 'System Operator',
            SWUser: activeSlip?.operatorName || '',
            NettWeight: activeSlip?.netWeight || 0,
            lesswt: (activeSlip?.deduction || 0) + ((activeSlip?.moisture || 0) * (activeSlip?.netWeight || 0) / 100),
            Finwt: activeSlip?.netWeight ? Math.max(0, activeSlip.netWeight - (activeSlip.deduction || 0)) : 0,
            MoisRate: activeSlip?.moisture || 0,
            Amount: activeSlip?.totalAmount || 0,
            IMAGE1: activeSlip?.evidence?.[0]?.url || '',
            IMAGE2: activeSlip?.evidence?.[1]?.url || '',
            IMAGE3: activeSlip?.evidence?.[2]?.url || '',
            IMAGE4: activeSlip?.evidence?.[3]?.url || '',
            udt: new Date().toISOString().replace('T', ' ').substring(0, 19),
            Deduction: activeSlip?.deduction || 0,
            LocationName: company.plantName || 'Plant 1 - Main Batching Yard',
            CultivatorName: activeSlip?.partyName || 'Customer Representative',
            LoadSlipNo: activeSlip?.slipNumber || `LS-${transactionNo}`,
            BagsBales: activeSlip?.bagsBales || formData?.bagsBales || '6 m³',
            Rate: activeSlip?.rate || formData?.rate || 0,
            Moisture: activeSlip?.moisture || formData?.moisture || 0,
            ChessNo: activeSlip?.chessNo || formData?.chessNo || '',
            ChessName: activeSlip?.chessName || formData?.chessName || 'Cess',
            ChessAmount: activeSlip?.chessAmount || formData?.chessAmount || 0,
            FatherName: '',
            Mandal: '',
            Village: activeSlip?.village || formData?.village || 'Customer Site',
            BankName: '',
            BranchName: '',
            IFSCODE: '',
            TraderName: activeSlip?.agent || formData?.agent || '',
            AllotedMil: activeSlip?.firmName || formData?.firmName || company.firmName || 'Aparna RMC',
            AccountNo: '',
            Heap: '',
            FinalRate: activeSlip?.finalRate || activeSlip?.rate || 0,
            MobileNo: '+91 9822019944',
            FinalWeight: activeSlip?.netWeight || 0,
          };
          setReportData(fallbackData);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTransactionPrintData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, transactionNo, activeSlip, formData, company]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (activeSlip) {
      api.createWeighSlip(activeSlip).catch((e) => console.warn('Save weigh slip on F5 print warning:', e));
    }
    window.print();
  };

  const selectedFields = fieldConfigs.length > 0
    ? fieldConfigs.filter((f) => f.isSelected).sort((a, b) => a.displayOrder - b.displayOrder)
    : [
        { sNo: 1, fieldKey: 'TransactionNo', fieldName: 'TransactionNo', isSelected: true, displayOrder: 1 },
        { sNo: 2, fieldKey: 'FDate', fieldName: 'FDate', isSelected: true, displayOrder: 2 },
        { sNo: 4, fieldKey: 'VehicleNo', fieldName: 'VehicleNo', isSelected: true, displayOrder: 4 },
        { sNo: 5, fieldKey: 'PartyName', fieldName: 'PartyName', isSelected: true, displayOrder: 5 },
        { sNo: 6, fieldKey: 'Product', fieldName: 'Product', isSelected: true, displayOrder: 6 },
        { sNo: 7, fieldKey: 'FTime', fieldName: 'FTime', isSelected: true, displayOrder: 7 },
        { sNo: 8, fieldKey: 'FWeight', fieldName: 'FWeight', isSelected: true, displayOrder: 8 },
        { sNo: 11, fieldKey: 'SWeight', fieldName: 'SWeight', isSelected: true, displayOrder: 11 },
        { sNo: 12, fieldKey: 'Status', fieldName: 'Status', isSelected: true, displayOrder: 12 },
        { sNo: 15, fieldKey: 'NettWeight', fieldName: 'NettWeight', isSelected: true, displayOrder: 15 },
        { sNo: 19, fieldKey: 'Amount', fieldName: 'Amount', isSelected: true, displayOrder: 19 },
        { sNo: 27, fieldKey: 'CultivatorName', fieldName: 'CultivatorName', isSelected: true, displayOrder: 27 },
        { sNo: 28, fieldKey: 'LoadSlipNo', fieldName: 'LoadSlipNo', isSelected: true, displayOrder: 28 },
        { sNo: 29, fieldKey: 'BagsBales', fieldName: 'BagsBales', isSelected: true, displayOrder: 29 },
        { sNo: 30, fieldKey: 'Rate', fieldName: 'Rate', isSelected: true, displayOrder: 30 },
        { sNo: 31, fieldKey: 'Moisture', fieldName: 'Moisture', isSelected: true, displayOrder: 31 },
        { sNo: 32, fieldKey: 'ChessNo', fieldName: 'ChessNo', isSelected: true, displayOrder: 32 },
        { sNo: 34, fieldKey: 'ChessAmount', fieldName: 'ChessAmount', isSelected: true, displayOrder: 34 },
        { sNo: 37, fieldKey: 'Village', fieldName: 'Village', isSelected: true, displayOrder: 37 },
        { sNo: 46, fieldKey: 'MobileNo', fieldName: 'MobileNo', isSelected: true, displayOrder: 46 },
      ];

  const formatFieldValue = (key: string, val: any) => {
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

  const cInfo = companyInfo || company;
  const f5AddressParts = [
    cInfo.address || 'Vikarabad',
    cInfo.city || 'Hyderabad',
    cInfo.state ? `${cInfo.state}${cInfo.pincode ? ` - ${cInfo.pincode}` : ''}` : (cInfo.pincode ? `Telangana - ${cInfo.pincode}` : 'Telangana - 500033')
  ].filter(Boolean);
  const f5CompanyAddress = f5AddressParts.join(', ');

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start bg-black/75 backdrop-blur-xs p-2 sm:p-4 md:py-6 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static">
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 w-full max-w-4xl overflow-hidden flex flex-col print:border-none print:shadow-none print:w-full print:max-w-none my-auto sm:my-4">
        
        {/* Modal Header Controls (Hidden during print) */}
        <div className="sticky top-0 z-30 bg-slate-900 text-white px-5 py-3 flex items-center justify-between shadow-lg border-b border-slate-700 print:hidden rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm leading-tight">Weighment Report Print (F5)</h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Generated with saved Reports field configuration ({selectedFields.length} configured fields)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow transition-all active:scale-95 cursor-pointer ring-1 ring-teal-400/50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Out Docket</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 bg-white font-sans text-slate-900 relative print:p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-teal-600 mb-2" />
              <p className="text-sm font-medium">Fetching transaction details and configured fields...</p>
            </div>
          ) : reportData ? (
            <>
              {/* Plant / Company Header */}
              <div className="border-b-2 border-slate-900 pb-4 mb-4">
                <div className="flex items-center justify-between gap-4">
                  {cInfo.logoUrl && (
                    <img
                      src={cInfo.logoUrl}
                      alt="Company Logo"
                      className="h-14 w-auto max-w-[140px] object-contain rounded"
                    />
                  )}
                  <div className="text-center flex-1">
                    <h1 className="text-2xl font-black uppercase tracking-wider text-slate-900">
                      {cInfo.firmName || cInfo.companyName || 'DHARANI COTTON MILLS'}
                    </h1>
                    <p className="text-xs text-slate-700 font-semibold mt-0.5">
                      {f5CompanyAddress}
                    </p>
                    <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                      Phone: <strong className="text-slate-900">{cInfo.phone || '+91 20 2712 8899'}</strong>
                      {` · License: ${cInfo.weighbridgeLicense || 'WB/2026/RMC-449'}`}
                      {` · GSTIN: ${cInfo.gstin || '27AAAAA0000A1Z5'}`}
                    </p>
                  </div>
                  <div className="text-right text-[11px] font-mono text-slate-600 border border-slate-300 rounded p-2 bg-slate-50 hidden sm:block">
                    <div>Model: <strong className="text-slate-900">{cInfo.scaleModel || 'VENTEK VMS-WB'}</strong></div>
                    <div>Capacity: <strong className="text-slate-900">{cInfo.scaleCapacity || '50,000 kg (50 MT)'}</strong></div>
                    <div className="text-teal-700 font-bold mt-0.5">Accuracy Class III</div>
                  </div>
                </div>
              </div>

              {/* Title & Key Badge */}
              <div className="flex items-center justify-between bg-slate-100 border border-slate-300 px-4 py-2 rounded mb-4">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm uppercase tracking-wide text-slate-900">
                    CERTIFIED WEIGHMENT DOCKET / REPORT
                  </span>
                  <span className="bg-teal-700 text-white font-mono text-xs font-bold px-2 py-0.5 rounded">
                    TX #{reportData.TransactionNo}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span>
                    <strong>Date:</strong> {reportData.FDate || new Date().toISOString().split('T')[0]}
                  </span>
                  <span>
                    <strong>Vehicle:</strong>{' '}
                    <span className="bg-slate-900 text-white px-2 py-0.5 rounded font-bold">
                      {reportData.VehicleNo || '—'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Dynamic Configured Fields Grid */}
              <div className="mb-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 border-b pb-1">
                  Configured Report Data (From Saved Reports Settings)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                  {selectedFields.map((field) => {
                    const rawVal = reportData[field.fieldKey];
                    const formatted = formatFieldValue(field.fieldKey, rawVal);

                    // Check if image field
                    if (['IMAGE1', 'IMAGE2', 'IMAGE3', 'IMAGE4'].includes(field.fieldKey)) {
                      return (
                        <div
                          key={field.fieldKey}
                          className="col-span-1 border border-slate-200 bg-slate-50/50 rounded p-2 flex flex-col justify-between"
                        >
                          <span className="text-[11px] font-semibold text-slate-500">{field.fieldName}</span>
                          {rawVal ? (
                            <img
                              src={rawVal}
                              alt={field.fieldName}
                              className="mt-1 h-20 w-full object-cover rounded border border-slate-300"
                            />
                          ) : (
                            <div className="mt-1 h-20 w-full bg-slate-100 border border-dashed border-slate-300 rounded flex flex-col items-center justify-center text-slate-400">
                              <Camera className="w-5 h-5 mb-1" />
                              <span className="text-[10px]">No Snapshot</span>
                            </div>
                          )}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={field.fieldKey}
                        className="border border-slate-200 bg-slate-50/60 rounded px-3 py-2 flex flex-col justify-center"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                          {field.fieldName}
                        </span>
                        <span className="font-bold text-slate-900 text-xs mt-0.5 font-mono truncate" title={String(rawVal)}>
                          {formatted}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Weight & Financial Summary Banner */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-900 text-white rounded mb-6 text-center">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase tracking-wider">Gross / 2nd Weight</div>
                  <div className="text-lg font-black font-mono text-white">
                    {(reportData.SWeight || 0).toLocaleString()} kg
                  </div>
                </div>
                <div className="border-x border-slate-700">
                  <div className="text-[11px] text-teal-400 uppercase tracking-wider">Nett Weight</div>
                  <div className="text-lg font-black font-mono text-teal-300">
                    {(reportData.NettWeight || 0).toLocaleString()} kg
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-amber-400 uppercase tracking-wider">Total Amount</div>
                  <div className="text-lg font-black font-mono text-amber-300">
                    ₹ {(reportData.Amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Signatures & Verification Area */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-300 text-center text-xs mt-8">
                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
                  <p className="font-semibold text-slate-800">Weighbridge Operator</p>
                  <p className="text-[10px] text-slate-500 font-mono">({reportData.FWUser || 'Authorized Signatory'})</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
                  <p className="font-semibold text-slate-800">Driver / Transporter</p>
                  <p className="text-[10px] text-slate-500 font-mono">({reportData.VehicleNo || 'Vehicle Driver'})</p>
                </div>
                <div>
                  <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
                  <p className="font-semibold text-slate-800">Customer / Security Verification</p>
                  <p className="text-[10px] text-slate-500 font-mono">(Aparna Gate Security)</p>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="mt-6 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400">
                This is a computer-generated weighment certificate generated via RMC Weighbridge Automation System.
                Certified tamper-proof. System Time: {new Date().toLocaleString()}
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-400" />
              <p>No weighment data found for Transaction #{transactionNo}.</p>
            </div>
          )}
        </div>

        {/* Bottom Action Bar (Hidden during print) */}
        <div className="bg-slate-100 border-t border-slate-300 px-6 py-3.5 flex items-center justify-between print:hidden rounded-b-xl">
          <div className="text-xs text-slate-600 font-medium">
            <span>Transaction #{transactionNo} · Weighment Report Slip</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow transition-all active:scale-95 cursor-pointer ring-1 ring-teal-400/50"
            >
              <Printer className="w-4 h-4" />
              <span>Print Out Docket</span>
            </button>
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-white hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-300 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
