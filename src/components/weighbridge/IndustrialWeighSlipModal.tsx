import React from 'react';
import { X, Printer, CheckCircle2, ShieldCheck, Mail } from 'lucide-react';
import { WeighSlip } from '@/types/weighbridge';
import { useCompany } from '@/contexts/CompanyContext';

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
  onEmail,
}) => {
  const { company } = useCompany();
  if (!isOpen || !slip) return null;

  const handlePrint = () => {
    window.print();
  };

  const isDuplicate = slip.printOptions?.printDuplicate;
  const showQr = slip.printOptions?.printQrCode ?? true;
  const showImages = slip.printOptions?.printImages ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-300 w-full max-w-2xl overflow-hidden flex flex-col print:border-none print:shadow-none print:w-full print:max-w-none">
        {/* Modal Controls (Hidden in print) */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-sm">Industrial Weighment Docket Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded flex items-center gap-1.5 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Slip</span>
            </button>
            {onEmail && (
              <button
                onClick={() => onEmail(slip)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded flex items-center gap-1.5 shadow"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>E-Mail PDF</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Slip Paper Container */}
        <div className="p-6 bg-white font-sans text-slate-900 relative">
          {/* Watermark for duplicate */}
          {isDuplicate && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-10">
              <span className="text-8xl font-black rotate-[-30deg] tracking-widest text-slate-900">
                DUPLICATE
              </span>
            </div>
          )}

          {/* Plant Header */}
          <div className="border-b-2 border-slate-900 pb-3 mb-3">
            <div className="flex items-center justify-between gap-4 mb-1">
              {company.logoUrl && (
                <img
                  src={company.logoUrl}
                  alt="Company Logo"
                  className="h-12 w-auto max-w-[150px] object-contain rounded"
                />
              )}
              <div className="text-center flex-1">
                <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">
                  {slip.firmName || company.firmName || company.companyName}
                </h1>
                <p className="text-xs text-slate-600 font-medium">
                  {company.address ? `${company.address}, ${company.city} - ${company.pincode}` : 'Weighbridge Terminal & Automated Dispatch Center'}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Certified Scale Accuracy · License No: {company.weighbridgeLicense || 'WB/2026/RMC-449'} · GSTIN: {company.gstin}
                </p>
              </div>
              <div className="text-right text-[11px] font-mono text-slate-500 hidden sm:block">
                <div>Model: {company.scaleModel || 'E1205'}</div>
                <div>Cap: {company.scaleCapacity || '100 MT'}</div>
              </div>
            </div>
          </div>

          {/* Slip Meta Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs mb-3 bg-slate-50 p-2.5 rounded border border-slate-200">
            <div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-medium">Slip No:</span>
                <span className="font-bold font-mono text-slate-900">{slip.slipNumber}</span>
              </div>
              <div className="flex mt-1">
                <span className="w-28 text-slate-500 font-medium">Transaction No:</span>
                <span className="font-bold font-mono text-slate-900">{slip.transactionNo}</span>
              </div>
              <div className="flex mt-1">
                <span className="w-28 text-slate-500 font-medium">Vehicle Reg No:</span>
                <span className="font-bold font-mono text-sm bg-slate-900 text-white px-2 py-0.2 rounded">
                  {slip.vehicleRegNo}
                </span>
              </div>
              <div className="flex mt-1">
                <span className="w-28 text-slate-500 font-medium">Vehicle Type:</span>
                <span className="font-medium text-slate-800">{slip.vehicleType || 'Transit Mixer'}</span>
              </div>
            </div>

            <div>
              <div className="flex">
                <span className="w-28 text-slate-500 font-medium">Date & Time:</span>
                <span className="font-mono text-slate-800">
                  {new Date(slip.dateTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                </span>
              </div>
              <div className="flex mt-1">
                <span className="w-28 text-slate-500 font-medium">Party Name:</span>
                <span className="font-bold text-slate-900">{slip.partyName || 'Cash / Walk-in'}</span>
              </div>
              <div className="flex mt-1">
                <span className="w-28 text-slate-500 font-medium">Product / Grade:</span>
                <span className="font-bold text-slate-900">{slip.product || slip.material || 'M30 Concrete'}</span>
              </div>
              <div className="flex mt-1">
                <span className="w-28 text-slate-500 font-medium">Site / Village:</span>
                <span className="font-medium text-slate-800">{slip.village || 'Plant Site'}</span>
              </div>
            </div>
          </div>

          {/* Weighment Table */}
          <div className="border border-slate-900 mb-3 rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-1.5 px-3 text-left">Weighment Parameter</th>
                  <th className="py-1.5 px-3 text-right">Value (kg / ton)</th>
                  <th className="py-1.5 px-3 text-left">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono text-xs">
                <tr>
                  <td className="py-1.5 px-3 font-semibold text-slate-800">1st Weight</td>
                  <td className="py-1.5 px-3 text-right font-bold">{slip.firstWeight.toLocaleString()} kg</td>
                  <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                    {slip.firstWeightTime ? new Date(slip.firstWeightTime).toLocaleString() : new Date(slip.dateTime).toLocaleDateString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 font-semibold text-slate-800">2nd Weight</td>
                  <td className="py-1.5 px-3 text-right font-bold">{slip.secondWeight.toLocaleString()} kg</td>
                  <td className="py-1.5 px-3 text-slate-600 text-[11px]">
                    {slip.secondWeightTime ? new Date(slip.secondWeightTime).toLocaleString() : new Date(slip.dateTime).toLocaleDateString()}
                  </td>
                </tr>
                <tr className="bg-slate-100 font-bold">
                  <td className="py-1.5 px-3 text-slate-900">Nett Weight (|1st - 2nd|)</td>
                  <td className="py-1.5 px-3 text-right text-sm text-teal-800">
                    {slip.netWeight.toLocaleString()} kg
                  </td>
                  <td className="py-1.5 px-3 text-slate-600 text-[11px]">Computed Difference</td>
                </tr>
                {((slip.deduction && slip.deduction > 0) || (slip.moisture && slip.moisture > 0)) && (
                  <>
                    {slip.moisture && slip.moisture > 0 && (
                      <tr className="text-slate-600">
                        <td className="py-1 px-3">Moisture Deduction ({slip.moisture}%)</td>
                        <td className="py-1 px-3 text-right text-rose-600">
                          - {Math.round(slip.netWeight * (slip.moisture / 100)).toLocaleString()} kg
                        </td>
                        <td className="py-1 px-3 text-[11px]">Lab Certified</td>
                      </tr>
                    )}
                    {slip.deduction && slip.deduction > 0 && (
                      <tr className="text-slate-600">
                        <td className="py-1 px-3">Physical Deduction / Tare Allowance</td>
                        <td className="py-1 px-3 text-right text-rose-600">
                          - {slip.deduction.toLocaleString()} kg
                        </td>
                        <td className="py-1 px-3 text-[11px]">Manual adjustment</td>
                      </tr>
                    )}
                  </>
                )}
                <tr className="bg-teal-50 dark:bg-teal-950/20 font-black border-t-2 border-slate-900 text-sm">
                  <td className="py-2 px-3 text-slate-900">Final Commercial Weight</td>
                  <td className="py-2 px-3 text-right text-teal-900">
                    {Math.max(0, Math.round(slip.netWeight - (slip.deduction || 0) - (slip.netWeight * ((slip.moisture || 0) / 100)))).toLocaleString()} kg
                  </td>
                  <td className="py-2 px-3 text-[11px] text-teal-700">
                    {((Math.max(0, Math.round(slip.netWeight - (slip.deduction || 0) - (slip.netWeight * ((slip.moisture || 0) / 100))))) / 1000).toFixed(2)} MT
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Commercial Settlement Details */}
          {(slip.rate || slip.charges || slip.totalAmount) && (
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200 mb-3 text-xs grid grid-cols-3 gap-2 font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Rate / Ton</span>
                <span className="font-bold text-slate-900">₹ {(slip.finalRate || slip.rate || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Weighment Charges</span>
                <span className="font-bold text-slate-900">₹ {(slip.charges || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Commercial Amount</span>
                <span className="font-black text-sm text-teal-700">₹ {(slip.totalAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Camera Snapshots & QR Verification Code (conditional on printOptions) */}
          <div className="flex gap-4 items-center justify-between border-t border-slate-200 pt-3">
            {showImages && slip.evidence && slip.evidence.length > 0 && (
              <div className="flex gap-2.5">
                {slip.evidence.slice(0, 3).map((ev, i) => (
                  <div key={i} className="w-28 h-20 print:w-32 print:h-22 border border-slate-400 rounded overflow-hidden relative shadow-xs bg-slate-100">
                    <img
                      src={ev.url}
                      alt={ev.angle ? `Camera ${ev.angle}` : `Evidence ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-0 inset-x-0 bg-slate-900/85 text-[8px] text-white text-center py-0.5 font-mono uppercase font-bold tracking-tight">
                      {ev.angle === 'front' ? 'Cam 1 · Front (ANPR)' : ev.angle === 'side' ? 'Cam 2 · Scale Deck' : `Cam ${i + 1} · ${ev.angle || 'Evidence'}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {showQr && (
              <div className="flex items-center gap-2 border border-slate-300 p-1.5 rounded bg-slate-50">
                {/* SVG QR Code Simulation */}
                <div className="w-14 h-14 bg-slate-900 p-1 flex items-center justify-center rounded">
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
                <div className="text-[10px] text-slate-500 font-mono leading-tight">
                  <div className="font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </div>
                  <div>TX: #{slip.transactionNo}</div>
                  <div>Gate Scan Valid</div>
                </div>
              </div>
            )}

            {/* Signature Blocks */}
            <div className="flex gap-8 text-[11px] text-slate-600">
              <div className="text-center pt-6 border-t border-slate-400 w-28">
                Driver Signature
              </div>
              <div className="text-center pt-6 border-t border-slate-400 w-28">
                Operator Signature
              </div>
            </div>
          </div>

          {/* Statutory Footer Disclaimer */}
          {company.weighSlipNotes && (
            <div className="mt-3 pt-2 border-t border-slate-200 text-[10px] text-slate-400 text-center font-mono">
              {company.weighSlipNotes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

