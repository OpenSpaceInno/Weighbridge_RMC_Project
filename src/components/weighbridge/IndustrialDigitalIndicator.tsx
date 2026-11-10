import React from 'react';
import { WeightReading } from '@/types/weighbridge';

interface IndustrialDigitalIndicatorProps {
  reading: WeightReading;
  mode?: 'GROSS' | 'TARE' | 'NET';
  digitsCount?: number;
}

export const IndustrialDigitalIndicator: React.FC<IndustrialDigitalIndicatorProps> = ({
  reading,
  mode = 'GROSS',
  digitsCount = 5,
}) => {
  // Format to 5 digits (e.g. 00000 or 24580)
  const weightVal = Math.max(0, Math.round(reading.weight || 0));
  const formattedDigits = String(weightVal).padStart(digitsCount, '0');

  return (
    <div className="flex items-center gap-2.5 bg-slate-900 border-2 border-slate-700 px-3 py-1 rounded-md shadow-inner select-none h-11 shrink-0">
      {/* Status Annunciator Flags */}
      <div className="flex flex-col gap-0.5 text-[9px] font-bold font-mono tracking-wider leading-none">
        <span
          className={`px-1 py-0.5 rounded transition-colors ${
            reading.stable
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-slate-800 text-slate-500'
          }`}
        >
          STABLE
        </span>
        <span
          className={`px-1 py-0.5 rounded transition-colors ${
            weightVal === 0
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
              : 'bg-slate-800 text-slate-500'
          }`}
        >
          ZERO
        </span>
      </div>

      {/* 5-Digit 7-Segment Digital Scale Display e.g. 00000 */}
      <div className="flex items-baseline gap-1 font-mono">
        <div className="text-2xl sm:text-3xl font-black tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
          {formattedDigits}
        </div>
        <div className="text-[10px] font-bold text-cyan-500 tracking-wider">
          {(reading.unit || 'kg').toUpperCase()}
        </div>
      </div>

      {/* Current Weighment Mode Flag */}
      <div className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-mono">
        {mode}
      </div>
    </div>
  );
};
