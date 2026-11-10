import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Radio,
  FileText,
  Network,
  Terminal,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Power,
  RotateCcw,
  Sliders,
  Copy,
  Check,
  Send,
  Scale
} from 'lucide-react';
import { WeightReading, ScaleProtocol, ThirdPartyScaleMode } from '@/types/weighbridge';
import { webSerialScale } from '@/lib/scaleIntegration';
import { IndustrialDigitalIndicator } from './IndustrialDigitalIndicator';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ThirdPartyScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeight: WeightReading;
  onWeightUpdate?: (reading: WeightReading) => void;
}

export const ThirdPartyScaleModal: React.FC<ThirdPartyScaleModalProps> = ({
  isOpen,
  onClose,
  currentWeight,
  onWeightUpdate,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ThirdPartyScaleMode>('web_serial');

  // Web Serial State
  const [baudRate, setBaudRate] = useState<number>(9600);
  const [protocol, setProtocol] = useState<ScaleProtocol>('standard_ascii');
  const [isSerialConnected, setIsSerialConnected] = useState(false);
  const [serialPortName, setSerialPortName] = useState<string>('');
  const [serialLogs, setSerialLogs] = useState<string[]>([]);

  // File Monitor State
  const [filePath, setFilePath] = useState('C:\\Weighbridge\\live_weight.txt');
  const [fileTesting, setFileTesting] = useState(false);
  const [fileStatus, setFileStatus] = useState<{ success: boolean; message: string } | null>(null);

  // TCP Socket State
  const [tcpHost, setTcpHost] = useState('127.0.0.1');
  const [tcpPort, setTcpPort] = useState(4001);
  const [tcpTesting, setTcpTesting] = useState(false);
  const [tcpStatus, setTcpStatus] = useState<{ success: boolean; message: string } | null>(null);

  // HTTP Webhook State
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [simWeightInput, setSimWeightInput] = useState<number>(24580);

  useEffect(() => {
    setIsSerialConnected(webSerialScale.isConnected());
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Web Serial Connect
  const handleConnectSerial = async () => {
    try {
      setSerialLogs((prev) => [...prev, `[INIT] Requesting COM Port at ${baudRate} baud...`]);
      const res = await webSerialScale.connect(
        { baudRate, protocol },
        (reading, rawText) => {
          onWeightUpdate?.(reading);
          setSerialLogs((prev) => [`[RX] ${rawText.trim()} -> ${reading.weight} kg (STABLE: ${reading.stable})`, ...prev.slice(0, 19)]);
        },
        (err) => {
          setSerialLogs((prev) => [`[ERR] ${err.message}`, ...prev.slice(0, 19)]);
          setIsSerialConnected(false);
        }
      );

      setIsSerialConnected(true);
      setSerialPortName(res.portName);
      setSerialLogs((prev) => [`[OK] Connected to ${res.portName}`, ...prev.slice(0, 19)]);
      toast({
        title: 'Weighbridge Indicator Connected',
        description: `Streaming live weight from ${res.portName} @ ${baudRate} bps`,
      });
    } catch (err: any) {
      setIsSerialConnected(false);
      setSerialLogs((prev) => [`[FAIL] ${err.message}`, ...prev.slice(0, 19)]);
      toast({
        title: 'Connection Cancelled / Failed',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectSerial = async () => {
    await webSerialScale.disconnect();
    setIsSerialConnected(false);
    setSerialPortName('');
    setSerialLogs((prev) => ['[INFO] Serial port disconnected', ...prev.slice(0, 19)]);
    toast({
      title: 'Indicator Disconnected',
      description: 'Scale reverted to standby / manual mode',
    });
  };

  // 2. Zero Scale (Reset to 00000)
  const handleZeroScale = async () => {
    try {
      const res = await api.zeroScale();
      if (res && res.reading) {
        onWeightUpdate?.(res.reading);
      }
      toast({
        title: 'Scale Zeroed (00000)',
        description: 'Tare zero reference point calibrated.',
      });
    } catch (err: any) {
      toast({
        title: 'Zero Scale Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // 3. Test File Source
  const handleTestFileSource = async () => {
    try {
      setFileTesting(true);
      setFileStatus(null);
      const res = await api.testScaleSource({
        mode: 'file_monitor',
        filePath,
      });
      setFileStatus({
        success: res.success,
        message: res.message,
      });
      if (res.success) {
        toast({ title: 'File Verified', description: res.message });
      }
    } catch (err: any) {
      setFileStatus({ success: false, message: err.message });
    } finally {
      setFileTesting(false);
    }
  };

  // 4. Test TCP Socket
  const handleTestTcp = async () => {
    try {
      setTcpTesting(true);
      setTcpStatus(null);
      const res = await api.testScaleSource({
        mode: 'tcp_socket',
        tcpHost,
        tcpPort,
      });
      setTcpStatus({ success: res.success, message: res.message });
    } catch (err: any) {
      setTcpStatus({ success: false, message: err.message });
    } finally {
      setTcpTesting(false);
    }
  };

  // 5. Simulate Third-Party Push
  const handleSimulatePush = async (val: number) => {
    try {
      const res = await api.pushThirdPartyWeight({
        weight: val,
        unit: 'kg',
        stable: true,
        source: 'Third-Party Weighbridge Test Bridge',
      });
      if (res && res.reading) {
        onWeightUpdate?.(res.reading);
      }
      toast({
        title: 'Weight Pushed from Third-Party Software',
        description: `Live reading set to ${val} kg (${val === 0 ? '00000' : val}).`,
      });
    } catch (err: any) {
      toast({ title: 'Push Failed', description: err.message, variant: 'destructive' });
    }
  };

  const curlSnippet = `curl -X POST "http://localhost:3001/api/weighbridge/third-party/push" \\
  -H "Content-Type: application/json" \\
  -d '{"weight": 24580, "unit": "kg", "stable": true, "source": "Avery Weigh-Tronix"}'`;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-sm tracking-wide">
                Third-Party Weighbridge Software Integration
              </h3>
              <p className="text-[11px] text-slate-400">
                Direct RS-232 / COM port, desktop shared file, TCP socket, or REST API bridge
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Scale Reading Banner */}
        <div className="bg-slate-950 p-3.5 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <IndustrialDigitalIndicator reading={currentWeight} mode="GROSS" digitsCount={5} />
            <div className="text-xs text-slate-400">
              <span className="block font-mono text-[10px] text-slate-500 uppercase">Current Source</span>
              <span className="font-semibold text-slate-200">
                {isSerialConnected ? `RS-232 COM Port (${serialPortName})` : 'Standby / 00000'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleZeroScale}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-sm"
              title="Zero scale reading back to 00000"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Zero (00000)</span>
            </button>
          </div>
        </div>

        {/* Integration Mode Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'web_serial' as const, label: 'Direct COM / RS-232', icon: Radio },
            { id: 'file_monitor' as const, label: 'Desktop File Sync', icon: FileText },
            { id: 'tcp_socket' as const, label: 'TCP / Network Scale', icon: Network },
            { id: 'http_push' as const, label: 'REST API / Webhook', icon: Terminal },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2.5 px-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-cyan-500 text-cyan-700 dark:text-cyan-400 font-bold bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* TAB 1: Web Serial COM Port */}
          {activeTab === 'web_serial' && (
            <div className="space-y-3">
              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900 rounded-md">
                <span className="font-bold text-cyan-900 dark:text-cyan-300 block mb-1">
                  Browser-Native Web Serial API (Zero Software Install Required)
                </span>
                <p className="text-[11px] text-cyan-800 dark:text-cyan-400">
                  Connect your PC directly to the physical weighbridge indicator (Avery, Essae, Toledo, Eagle) via RS-232 or USB-to-Serial cable.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Indicator Protocol
                  </label>
                  <select
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value as ScaleProtocol)}
                    disabled={isSerialConnected}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs"
                  >
                    <option value="standard_ascii">Standard ASCII Continuous (Auto-Detect)</option>
                    <option value="avery_e1205">Avery Weigh-Tronix (E1205 / E1110 / ZM300)</option>
                    <option value="essae">Essae Teraoka (DS-215 / DS-415 / Matrix)</option>
                    <option value="toledo">Mettler Toledo (IND231 / IND570)</option>
                    <option value="eagle">Eagle / Bilanciai / Tulsi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Baud Rate
                  </label>
                  <select
                    value={baudRate}
                    onChange={(e) => setBaudRate(Number(e.target.value))}
                    disabled={isSerialConnected}
                    className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  >
                    <option value={9600}>9600 bps (Most Common)</option>
                    <option value={4800}>4800 bps</option>
                    <option value={2400}>2400 bps</option>
                    <option value={1200}>1200 bps</option>
                    <option value={19200}>19200 bps</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {!isSerialConnected ? (
                  <button
                    type="button"
                    onClick={handleConnectSerial}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Radio className="w-4 h-4" />
                    <span>Connect Scale COM Port</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDisconnectSerial}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded flex items-center gap-1.5 transition-colors shadow"
                  >
                    <Power className="w-4 h-4" />
                    <span>Disconnect ({serialPortName})</span>
                  </button>
                )}

                <span className="text-[11px] text-slate-500 font-mono">
                  {isSerialConnected ? '● STREAMING LIVE PACKETS' : '○ DISCONNECTED'}
                </span>
              </div>

              {/* Raw Packet Monitor Terminal */}
              <div className="mt-2 bg-slate-950 text-emerald-400 p-2.5 rounded border border-slate-800 font-mono text-[11px] h-32 overflow-y-auto">
                <div className="text-slate-500 text-[10px] pb-1 border-b border-slate-800 mb-1 flex items-center justify-between">
                  <span>LIVE RS-232 PACKET STREAM</span>
                  <span className="text-[9px]">20 packets retained</span>
                </div>
                {serialLogs.length === 0 ? (
                  <span className="text-slate-600 italic">No serial communication active. Click "Connect Scale COM Port" to start.</span>
                ) : (
                  serialLogs.map((log, i) => <div key={i} className="leading-tight">{log}</div>)
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Third-Party Desktop Software File Monitor */}
          {activeTab === 'file_monitor' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-300">
                Many third-party desktop weighbridge programs (WinWeigh, Avery, Tulsi, Essae) export continuous live weights to a local text file. Enter the path to monitor:
              </p>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Exported File Path
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="C:\Weighbridge\live_weight.txt"
                    className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleTestFileSource}
                    disabled={fileTesting}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-white rounded font-semibold text-xs flex items-center gap-1 transition-colors"
                  >
                    {fileTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                    <span>Verify File</span>
                  </button>
                </div>
              </div>

              {fileStatus && (
                <div className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                  fileStatus.success ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300'
                }`}>
                  {fileStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{fileStatus.message}</span>
                </div>
              )}

              {/* Quick file test simulator buttons */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Test Sync Simulators (Updates live reading):
                </span>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSimulatePush(0)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  >
                    Set 00000 (Empty Deck)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulatePush(14800)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  >
                    Set 14,800 kg (Tare)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulatePush(34520)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  >
                    Set 34,520 kg (Gross)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TCP / Network Scale */}
          {activeTab === 'tcp_socket' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-300">
                For indicators with built-in Ethernet or Moxa/USR-TCP232 Serial-to-Ethernet converters:
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    Scale IP / Host
                  </label>
                  <input
                    type="text"
                    value={tcpHost}
                    onChange={(e) => setTcpHost(e.target.value)}
                    placeholder="127.0.0.1 or 192.168.0.50"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                    TCP Port
                  </label>
                  <input
                    type="number"
                    value={tcpPort}
                    onChange={(e) => setTcpPort(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestTcp}
                disabled={tcpTesting}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-xs flex items-center gap-1.5 transition-colors shadow"
              >
                {tcpTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Network className="w-3.5 h-3.5" />}
                <span>Test TCP Stream</span>
              </button>

              {tcpStatus && (
                <div className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                  tcpStatus.success ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300'
                }`}>
                  {tcpStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{tcpStatus.message}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Inbound REST Webhook */}
          {activeTab === 'http_push' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-300">
                Third-party programs can push the live weight directly via HTTP POST to this endpoint:
              </p>

              <div className="bg-slate-950 text-slate-200 p-2.5 rounded border border-slate-800 font-mono text-[11px] relative">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(curlSnippet);
                    setCopiedSnippet(true);
                    setTimeout(() => setCopiedSnippet(false), 2000);
                  }}
                  className="absolute right-2 top-2 p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                  title="Copy curl command"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre className="overflow-x-auto whitespace-pre-wrap">{curlSnippet}</pre>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  value={simWeightInput}
                  onChange={(e) => setSimWeightInput(Number(e.target.value))}
                  className="w-32 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  placeholder="Weight in kg"
                />
                <button
                  type="button"
                  onClick={() => handleSimulatePush(simWeightInput)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-bold text-xs flex items-center gap-1.5 transition-colors shadow"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Weight ({simWeightInput} kg)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold">Scale System Ready</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

