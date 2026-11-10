import React, { useState } from 'react';
import { X, Calculator as CalcIcon, Equal, Delete } from 'lucide-react';

interface CalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyResult?: (val: number) => void;
}

export const CalculatorModal: React.FC<CalculatorModalProps> = ({
  isOpen,
  onClose,
  onApplyResult,
}) => {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [mode, setMode] = useState<'standard' | 'concrete'>('standard');
  const [volumeM3, setVolumeM3] = useState('');
  const [density, setDensity] = useState('2.4'); // Concrete standard density 2.4 t/m3

  if (!isOpen) return null;

  const handleNum = (num: string) => {
    setDisplay((prev) => (prev === '0' ? num : prev + num));
  };

  const handleOp = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
  };

  const handleCalculate = () => {
    try {
      const fullExpr = equation + display;
      // Sanitize input to only allowed math characters
      if (/^[\d\s+\-*/.()]+$/.test(fullExpr)) {
        // Safe evaluation
        const res = Function(`'use strict'; return (${fullExpr})`)();
        const rounded = Math.round(res * 100) / 100;
        setDisplay(String(rounded));
        setEquation('');
      }
    } catch {
      setDisplay('Error');
    }
  };

  const calculateConcreteWeight = () => {
    const vol = parseFloat(volumeM3) || 0;
    const den = parseFloat(density) || 2.4;
    const weightKg = Math.round(vol * den * 1000);
    setDisplay(String(weightKg));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-80 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalcIcon className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-sm">Industrial Calculator</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 text-xs font-semibold">
          <button
            onClick={() => setMode('standard')}
            className={`py-1.5 rounded transition-colors ${
              mode === 'standard'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Standard Math
          </button>
          <button
            onClick={() => setMode('concrete')}
            className={`py-1.5 rounded transition-colors ${
              mode === 'concrete'
                ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            m³ to Weight
          </button>
        </div>

        {mode === 'standard' ? (
          <div className="p-4 space-y-3">
            {/* Display Screen */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-right font-mono">
              <div className="text-[11px] text-slate-500 h-4">{equation}</div>
              <div className="text-2xl font-black text-cyan-400 truncate">
                {display}
              </div>
            </div>

            {/* Keypad */}
            <div className="grid grid-cols-4 gap-2 font-mono text-sm">
              <button
                onClick={handleClear}
                className="p-2.5 col-span-2 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-500/30"
              >
                C
              </button>
              <button
                onClick={() => handleOp('/')}
                className="p-2.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                ÷
              </button>
              <button
                onClick={() => handleOp('*')}
                className="p-2.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                ×
              </button>

              {['7', '8', '9'].map((n) => (
                <button
                  key={n}
                  onClick={() => handleNum(n)}
                  className="p-2.5 rounded bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white font-bold hover:bg-slate-200"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => handleOp('-')}
                className="p-2.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                -
              </button>

              {['4', '5', '6'].map((n) => (
                <button
                  key={n}
                  onClick={() => handleNum(n)}
                  className="p-2.5 rounded bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white font-bold hover:bg-slate-200"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => handleOp('+')}
                className="p-2.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                +
              </button>

              {['1', '2', '3'].map((n) => (
                <button
                  key={n}
                  onClick={() => handleNum(n)}
                  className="p-2.5 rounded bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white font-bold hover:bg-slate-200"
                >
                  {n}
                </button>
              ))}
              <button
                onClick={handleCalculate}
                className="p-2.5 row-span-2 rounded bg-teal-600 text-white font-bold hover:bg-teal-700 flex items-center justify-center shadow"
              >
                <Equal className="w-5 h-5" />
              </button>

              <button
                onClick={() => handleNum('0')}
                className="p-2.5 col-span-2 rounded bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white font-bold hover:bg-slate-200"
              >
                0
              </button>
              <button
                onClick={() => handleNum('.')}
                className="p-2.5 rounded bg-slate-100 dark:bg-slate-800/60 text-slate-900 dark:text-white font-bold hover:bg-slate-200"
              >
                .
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3 text-xs">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">
                Volume in m³ (Cubic Meters)
              </label>
              <input
                type="number"
                placeholder="e.g. 6.0"
                value={volumeM3}
                onChange={(e) => setVolumeM3(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 font-medium">
                Density (ton / m³)
              </label>
              <input
                type="number"
                value={density}
                onChange={(e) => setDensity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded font-mono text-sm"
              />
            </div>
            <button
              onClick={calculateConcreteWeight}
              className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded shadow transition-colors"
            >
              Convert to Estimated kg
            </button>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-center font-mono mt-3">
              <span className="text-[11px] text-slate-400 block">
                Calculated Concrete Weight:
              </span>
              <span className="text-xl font-bold text-cyan-400">
                {display} kg
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        {onApplyResult && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-2">
            <button
              onClick={() => {
                const val = parseFloat(display);
                if (!isNaN(val)) onApplyResult(val);
                onClose();
              }}
              className="px-3 py-1.5 bg-teal-600 text-white text-xs font-semibold rounded hover:bg-teal-700"
            >
              Apply to Weight Input
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

