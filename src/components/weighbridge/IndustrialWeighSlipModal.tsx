import React, { useState } from 'react';
import { X, Printer, ShieldCheck, CheckCircle2, FileDown, Loader2 } from 'lucide-react';
import { WeighSlip } from '@/types/weighbridge';
import { useCompany } from '@/contexts/CompanyContext';
import { api } from '@/lib/api';
import { downloadWeighSlipPDF } from '@/utils/weighSlipPdfGenerator';
import { useToast } from '@/hooks/use-toast';

interface IndustrialWeighSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: WeighSlip | null;
  onEmail?: (slip: WeighSlip) => void;
}

export const IndustrialWeighSlipModal: React.FC<IndustrialWeighSlipModalProps> = ({
  isOpen,
  onClose,
  slip,
}) => {
  const { company } = useCompany();
  const { toast } = useToast();
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  if (!isOpen || !slip) return null;

  const handlePrint = () => {
    if (slip) {
      api.createWeighSlip(slip).catch((e) => console.warn('Save weigh slip on print warning:', e));
    }
    window.print();
  };

  const isDuplicate = slip.printOptions?.printDuplicate;
  const showQr = slip.printOptions?.printQrCode ?? true;
  const showImages = slip.printOptions?.printImages ?? true;

  // 1 Quintal (Qtl) = 100 kg
  const firstWeightKg = slip.firstWeight || 0;
  const firstWeightQtl = (firstWeightKg / 100).toFixed(2);

  const secondWeightKg = slip.secondWeight || 0;
  const secondWeightQtl = secondWeightKg > 0 ? (secondWeightKg / 100).toFixed(2) : '-';

  const nettWeightKg = slip.nettWeight !== undefined ? slip.nettWeight : (slip.netWeight || Math.abs(secondWeightKg - firstWeightKg));
  const nettWeightQtl = (nettWeightKg / 100).toFixed(2);

  // Dates & Times
  const formatTimeStr = (timeString?: string | null) => {
    if (!timeString || timeString === '-') return '-';
    if (typeof timeString === 'string' && /^\d{1,2}:\d{2}(?::\d{2})?$/.test(timeString.trim())) {
      return timeString.trim();
    }
    try {
      const d = new Date(timeString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    } catch {}
    return timeString;
  };

  const formatDateStr = (dateString?: string | null, dateOverride?: string) => {
    if (dateOverride && dateOverride.trim() && dateOverride !== '-') return dateOverride.trim();
    if (!dateString || dateString === '-') return '-';
    if (typeof dateString === 'string' && /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})$/.test(dateString.trim())) {
      return dateString.trim();
    }
    try {
      const d = new Date(dateString);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString();
      }
    } catch {}
    return dateString;
  };

  const firstWeightDate = formatDateStr(slip.firstWeightTime, slip.firstWeightDate);
  const firstWeightTime = formatTimeStr(slip.firstWeightTime);

  const secondWeightDate = secondWeightKg > 0 ? formatDateStr(slip.secondWeightTime, slip.secondWeightDate) : '-';
  const secondWeightTime = secondWeightKg > 0 ? formatTimeStr(slip.secondWeightTime) : '-';

  const nettWeightDate = secondWeightKg > 0 ? secondWeightDate : firstWeightDate;
  const nettWeightTime = secondWeightKg > 0 ? secondWeightTime : firstWeightTime;

  // Company Information Resolution from Company Profile Module
  const companyDisplayName = (
    company.firmName ||
    company.companyName ||
    (slip.companyName && slip.companyName !== 'APARNA RMC & WEIGHBRIDGE' ? slip.companyName : '') ||
    'DHARANI COTTON MILLS'
  ).toUpperCase();

  // Format full address: Vikarabad, Hyderabad, Telangana - 500033
  const addressParts = [
    company.address || (slip.companyAddress && slip.companyAddress !== 'Industrial Zone, Highway Bypass' ? slip.companyAddress : 'Vikarabad'),
    company.city || 'Hyderabad',
    company.state ? `${company.state}${company.pincode ? ` - ${company.pincode}` : ''}` : (company.pincode ? `Telangana - ${company.pincode}` : 'Telangana - 500033')
  ].filter(Boolean);
  const companyAddress = addressParts.join(', ');

  const phoneNo = company.phone || slip.phoneNo || '+91 20 2712 8899';
  const licenseNo = company.weighbridgeLicense || 'WB/2026/RMC-449';
  const gstinNo = company.gstin || '27AAAAA0000A1Z5';
  const scaleModel = company.scaleModel || 'VENTEK VMS-WB';
  const scaleCapacity = company.scaleCapacity || '50,000 kg (50 MT)';
  const adminName = slip.adminName || slip.operatorName || 'System Admin';

  // Security Auth Token
  const authToken = `AUTH-WB-2026-TX${slip.transactionNo}-${(firstWeightKg % 997).toString().padStart(3, '0')}`;

  const handleExportPDF = async () => {
    if (!slip) return;
    try {
      setIsExportingPdf(true);
      await downloadWeighSlipPDF(slip, company);
      toast({
        title: 'PDF Downloaded',
        description: `Weighment Slip #${slip.transactionNo} (${slip.vehicleNo || slip.vehicleRegNo || 'Vehicle'}) saved to your system.`,
      });
    } catch (err: any) {
      console.error('Failed to export PDF:', err);
      toast({
        title: 'Export Failed',
        description: 'Could not export weighment slip to PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start bg-black/75 backdrop-blur-xs p-2 sm:p-4 md:py-6 overflow-y-auto animate-fade-in print:p-0 print:bg-white print:static">
      <style>{`
        @media print {
          body { visibility: hidden !important; }
          .weigh-slip-paper, .weigh-slip-paper * { visibility: visible !important; }
          .weigh-slip-paper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 12px !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      <div className="bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden flex flex-col print:border-none print:shadow-none print:w-full print:max-w-none my-auto sm:my-4">
        {/* Modal Controls Bar (Always sticky and visible at the top, hidden in print) */}
        <div className="sticky top-0 z-30 bg-slate-900 text-white px-5 py-3 flex items-center justify-between shadow-lg border-b border-slate-700 print:hidden rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm block leading-tight">Weighment Slip Preview (Save & Print F4)</span>
              <span className="text-[10px] text-slate-400 font-mono">TX #{slip.transactionNo} · {slip.vehicleNo || slip.vehicleRegNo || 'Vehicle'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer disabled:opacity-60"
              title="Export Weighment Slip as PDF (Download to system)"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Export PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow transition-all active:scale-95 cursor-pointer ring-1 ring-teal-400/50"
              title="Print Weighment Slip (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
              <span>Print Out Slip</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer ml-1"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Slip Paper Container */}
        <div className="weigh-slip-paper p-6 bg-white font-sans text-slate-900 relative">
          {/* Watermark for duplicate */}
          {isDuplicate && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10">
              <span className="text-8xl font-black rotate-[-30deg] tracking-widest text-slate-900">
                DUPLICATE
              </span>
            </div>
          )}

          {/* 1. Centered Header: WEIGHMENT SLIP */}
          <div className="text-center border-b-2 border-slate-900 pb-1.5 mb-2">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-widest text-slate-900">
              WEIGHMENT SLIP
            </h2>
          </div>

          {/* 2. Company Details Header (Matches Company Profile exactly) */}
          <div className="border-b border-slate-300 pb-3 mb-2.5">
            <div className="flex items-start justify-between gap-4">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt="Company Logo"
                  className="h-12 w-auto max-w-[130px] object-contain rounded mt-1"
                />
              ) : (
                <div className="w-16 hidden sm:block" />
              )}
              
              <div className="text-center flex-1">
                <h1 className="text-lg sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                  {companyDisplayName}
                </h1>
                <p className="text-xs text-slate-700 font-semibold mt-0.5">
                  {companyAddress}
                </p>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  Phone: <strong className="text-slate-900">{phoneNo}</strong>
                  {` · License: ${licenseNo}`}
                  {` · GSTIN: ${gstinNo}`}
                </p>
              </div>

              <div className="text-right text-[11px] font-mono text-slate-600 hidden sm:block pt-1 min-w-[140px]">
                <div>Model: <strong className="text-slate-900">{scaleModel}</strong></div>
                <div>Cap: <strong className="text-slate-900">{scaleCapacity}</strong></div>
                <div className="text-[10px] text-teal-800 font-bold uppercase tracking-wider mt-0.5">
                  Accuracy Class III
                </div>
              </div>
            </div>
          </div>

          {/* Authenticated Verification Strip */}
          <div className="flex items-center justify-between bg-slate-100 border border-slate-300 px-3 py-1 rounded text-[10px] font-mono mb-2.5 text-slate-700">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span className="font-bold text-slate-900 uppercase">LEGAL METROLOGY CERTIFIED WEIGHBRIDGE</span>
            </div>
            <div className="flex items-center gap-2">
              <span>SECURITY TOKEN:</span>
              <strong className="text-slate-950 bg-white px-1.5 py-0.5 rounded border border-slate-300">
                {authToken}
              </strong>
            </div>
          </div>

          {/* 3. Primary Slip Parameters Grid (Exact 2-column arrangement matching Image 2) */}
          <div className="mb-3 bg-slate-50 p-3 rounded border border-slate-300 font-sans text-xs">
            {/* Header row: Transaction No matching Image 2 top bar */}
            <div className="flex items-center justify-between border-b border-slate-300 pb-1.5 mb-2 font-mono">
              <span className="text-slate-600 font-bold uppercase text-[11px] tracking-wider">
                Transaction No:
              </span>
              <span className="font-black text-slate-950 text-base">
                #{slip.transactionNo}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {/* Left Column (8 items: Vehicle No, Party Name, Product, Status, LocationName, CultivatorName, LoadSlipNo, BagsBales) */}
              <div className="space-y-1">
                {/* 1. Vehicle No */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-700 font-bold">Vehicle No:</span>
                  <span className="font-mono font-black text-xs bg-slate-900 text-white px-2 py-0.5 rounded shadow-xs">
                    {slip.vehicleNo || slip.vehicleRegNo || '-'}
                  </span>
                </div>

                {/* 2. Party Name */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-700 font-bold">Party Name:</span>
                  <span className="font-bold text-slate-900 text-right truncate max-w-[180px]" title={slip.partyName || '-'}>
                    {slip.partyName || '-'}
                  </span>
                </div>

                {/* 3. Product */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">Product:</span>
                  <span className="font-bold text-slate-900 text-right truncate max-w-[180px]" title={slip.product || slip.material || '-'}>
                    {slip.product || slip.material || '-'}
                  </span>
                </div>

                {/* 4. Status */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">Status:</span>
                  <span className="font-mono font-bold text-[11px] uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {slip.status || 'Inward'}
                  </span>
                </div>

                {/* 5. LocationName */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">LocationName:</span>
                  <span className="font-semibold text-slate-900 text-right truncate max-w-[180px]">
                    {slip.locationName || '-'}
                  </span>
                </div>

                {/* 6. CultivatorName */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">CultivatorName:</span>
                  <span className="font-semibold text-slate-900 text-right truncate max-w-[180px]">
                    {slip.cultivatorName || '-'}
                  </span>
                </div>

                {/* 7. LoadSlipNo */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">LoadSlipNo:</span>
                  <span className="font-mono font-bold text-slate-900 text-right">
                    {slip.loadSlipNo || '-'}
                  </span>
                </div>

                {/* 8. BagsBales */}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-600 font-medium">BagsBales:</span>
                  <span className="font-mono font-semibold text-slate-900 text-right">
                    {slip.bagsBales || '-'}
                  </span>
                </div>
              </div>

              {/* Right Column (8 items: Charges, Rate, Moisture, ChessNo, ChessName, ChessAmount, Village, MobileNo) */}
              <div className="space-y-1">
                {/* 1. Charges */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">Charges:</span>
                  <span className="font-mono font-bold text-slate-900 text-right">
                    {slip.charges !== undefined && slip.charges !== null && slip.charges !== '' && slip.charges !== 0
                      ? `₹ ${Number(slip.charges).toLocaleString()}`
                      : '-'}
                  </span>
                </div>

                {/* 2. Rate */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">Rate:</span>
                  <span className="font-mono font-bold text-slate-900 text-right">
                    {slip.rate !== undefined && slip.rate !== null && slip.rate !== '' && slip.rate !== 0
                      ? `₹ ${Number(slip.rate).toLocaleString()}`
                      : '-'}
                  </span>
                </div>

                {/* 3. Moisture */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">Moisture:</span>
                  <span className="font-mono font-semibold text-slate-900 text-right">
                    {slip.moisture !== undefined && slip.moisture !== null && slip.moisture !== '' && slip.moisture !== 0
                      ? `${slip.moisture} %`
                      : '-'}
                  </span>
                </div>

                {/* 4. ChessNo */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">ChessNo:</span>
                  <span className="font-mono font-bold text-slate-900 text-right">
                    {slip.chessNo || '-'}
                  </span>
                </div>

                {/* 5. ChessName */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">ChessName:</span>
                  <span className="font-semibold text-slate-900 text-right">
                    {slip.chessName || '-'}
                  </span>
                </div>

                {/* 6. ChessAmount */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">ChessAmount:</span>
                  <span className="font-mono font-bold text-slate-900 text-right">
                    {slip.chessAmount !== undefined && slip.chessAmount !== null && slip.chessAmount !== '' && slip.chessAmount !== 0
                      ? `₹ ${Number(slip.chessAmount).toLocaleString()}`
                      : '-'}
                  </span>
                </div>

                {/* 7. Village */}
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-0.5">
                  <span className="text-slate-600 font-medium">Village:</span>
                  <span className="font-semibold text-slate-900 text-right truncate max-w-[180px]">
                    {slip.village || '-'}
                  </span>
                </div>

                {/* 8. MobileNo */}
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-slate-600 font-medium">MobileNo:</span>
                  <span className="font-mono font-semibold text-slate-900 text-right">
                    {slip.mobileNo || '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Weighment Table with explicit headers: Date, Time, Weight, Qtl (Quintal) */}
          <div className="border-2 border-slate-900 mb-3 rounded overflow-hidden shadow-xs">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-2 px-3 text-left">Weighment Parameter</th>
                  <th className="py-2 px-3 text-left">Date</th>
                  <th className="py-2 px-3 text-left">Time</th>
                  <th className="py-2 px-3 text-right">Weight (kg)</th>
                  <th className="py-2 px-3 text-right">Qtl (Quintal)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 font-mono text-xs">
                {/* 1st Weight */}
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-bold text-slate-900">1st Weight</td>
                  <td className="py-2 px-3 text-slate-700">{firstWeightDate}</td>
                  <td className="py-2 px-3 text-slate-700">{firstWeightTime}</td>
                  <td className="py-2 px-3 text-right font-black text-slate-900">
                    {firstWeightKg.toLocaleString()} kg
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-800">
                    {firstWeightQtl} Qtl
                  </td>
                </tr>

                {/* 2nd Weight */}
                <tr className="hover:bg-slate-50">
                  <td className="py-2 px-3 font-bold text-slate-900">2nd Weight</td>
                  <td className="py-2 px-3 text-slate-700">{secondWeightDate}</td>
                  <td className="py-2 px-3 text-slate-700">{secondWeightTime}</td>
                  <td className="py-2 px-3 text-right font-black text-slate-900">
                    {secondWeightKg > 0 ? `${secondWeightKg.toLocaleString()} kg` : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-800">
                    {secondWeightKg > 0 ? `${secondWeightQtl} Qtl` : '-'}
                  </td>
                </tr>

                {/* Nett Weight (Highlighted Row) */}
                <tr className="bg-amber-100/80 border-t-2 border-slate-900 font-black text-sm">
                  <td className="py-2.5 px-3 text-amber-950 font-black">
                    Nett Weight (|1st - 2nd|)
                  </td>
                  <td className="py-2.5 px-3 text-slate-900 text-xs font-semibold">{nettWeightDate}</td>
                  <td className="py-2.5 px-3 text-slate-900 text-xs font-semibold">{nettWeightTime}</td>
                  <td className="py-2.5 px-3 text-right text-amber-950 font-black">
                    {nettWeightKg.toLocaleString()} kg
                  </td>
                  <td className="py-2.5 px-3 text-right text-amber-950 font-black">
                    {nettWeightQtl} Qtl
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5. Additional Commercial Breakdown (Charges, Rate, Total) if configured */}
          {Boolean((slip.charges && Number(slip.charges) > 0) || (slip.totalAmount && Number(slip.totalAmount) > 0)) ? (
            <div className="bg-slate-50 p-2.5 rounded border border-slate-300 mb-3 text-xs grid grid-cols-3 gap-2 font-mono text-center">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Rate</span>
                <span className="font-bold text-slate-900">₹ {(slip.finalRate || slip.rate || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Charges / Cess</span>
                <span className="font-bold text-slate-900">₹ {((slip.charges || 0) + (slip.chessAmount || 0)).toLocaleString()}</span>
              </div>
              <div className="border-l border-slate-200 pl-2">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Commercial Amount</span>
                <span className="font-black text-base text-teal-800">₹ {(slip.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          ) : null}

          {/* 6. Camera Snapshots & Verification QR Code & Signatures */}
          <div className="flex gap-4 items-center justify-between border-t border-slate-300 pt-3">
            {Boolean(showImages && slip.evidence && slip.evidence.length > 0) ? (
              <div className="flex gap-2">
                {slip.evidence.slice(0, 3).map((ev, i) => (
                  <div
                    key={i}
                    className="w-24 h-16 print:w-28 print:h-20 border border-slate-400 rounded overflow-hidden relative shadow-xs bg-slate-100"
                  >
                    <img
                      src={ev.url}
                      alt={ev.angle ? `Camera ${ev.angle}` : `Evidence ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/85 text-[8px] text-white text-center py-0.5 font-mono uppercase font-bold">
                      {ev.angle === 'front' ? 'Cam 1 (ANPR)' : ev.angle === 'side' ? 'Cam 2 (Deck)' : `Cam ${i + 1}`}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}

            {Boolean(showQr) ? (
              <div className="flex items-center gap-2 border border-slate-300 p-1.5 rounded bg-slate-50">
                <div className="w-12 h-12 bg-slate-900 p-1 flex items-center justify-center rounded">
                  <div className="w-full h-full bg-white flex flex-col items-center justify-center p-0.5">
                    <div className="grid grid-cols-4 gap-0.5 w-full h-full">
                      {[...Array(16)].map((_, idx) => (
                        <div
                          key={idx}
                          className={`${(idx % 2 === 0 || idx % 5 === 0) ? 'bg-black' : 'bg-white'}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 font-mono leading-tight">
                  <div className="font-bold text-slate-900 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>AUTHENTIC</span>
                  </div>
                  <div>TX #{slip.transactionNo}</div>
                  <div className="text-[9px] text-slate-500 font-semibold">{licenseNo}</div>
                </div>
              </div>
            ) : null}

            {/* Official Signature Blocks */}
            <div className="flex gap-8 text-[11px] text-slate-700">
              <div className="text-center pt-6 border-t border-slate-400 w-32">
                <span className="block font-semibold">Cultivator / Driver</span>
                <span className="text-[9px] text-slate-500">(Signature)</span>
              </div>
              <div className="text-center pt-6 border-t border-slate-400 w-36 font-medium">
                <span className="block font-bold text-slate-900">{adminName}</span>
                <span className="text-[9px] text-slate-500 font-mono">Weighmaster / Authorized</span>
              </div>
            </div>
          </div>

          {/* Statutory Footer Disclaimer */}
          <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-500 text-center font-mono leading-relaxed">
            {company.weighSlipNotes || 'Certified under Legal Metrology Act, 2009. Scale calibrated and stamped by Govt. Inspector. Computer generated electronic ticket requires no manual stamp.'}
          </div>
        </div>

        {/* Bottom Action Footer (Always visible on screen, hidden in print) */}
        <div className="bg-slate-100 border-t border-slate-300 px-6 py-3.5 flex items-center justify-between print:hidden rounded-b-xl">
          <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Ticket verified and recorded. Ready to print.</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer disabled:opacity-60"
              title="Export Weighment Slip as PDF (Download to system)"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Exporting PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Export PDF</span>
                </>
              )}
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow transition-all active:scale-95 cursor-pointer ring-1 ring-teal-400/40"
              title="Print Weighment Slip"
            >
              <Printer className="w-4 h-4" />
              <span>Print Out Slip</span>
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

export default IndustrialWeighSlipModal;
