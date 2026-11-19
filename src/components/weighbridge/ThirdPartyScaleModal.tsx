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
  Scale,
  Settings,
  Activity,
  HardDrive
} from 'lucide-react';
import { WeightReading, ScaleProtocol, ThirdPartyScaleMode, WeighbridgeDeviceConfig } from '@/types/weighbridge';
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
  const [activeTab, setActiveTab] = useState<ThirdPartyScaleMode>('ventek_vms');

  // Ventek VMS Hardware Config State
  const [deviceConfig, setDeviceConfig] = useState<WeighbridgeDeviceConfig>({
    id: 'dev-vms-001',
    deviceCode: 'VMS',
    displayName: 'New VMS',
    manufacturer: 'VENTEK',
    model: 'VMS-WB',
    serialNumber: '168',
    capacityKg: 50000,
    port: 'COM3',
    baudRate: 2400,
    interfaceType: 'RS232',
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    sampleTimeMs: 1000,
    byteRange: '1-8',
    unitType: 'Qtl',
    isActive: true,
  });

  const [availablePorts, setAvailablePorts] = useState<Array<{ path: string; manufacturer: string; friendlyName: string }>>([]);
  const [serverSerialStatus, setServerSerialStatus] = useState<{
    connected: boolean;
    lastError: string | null;
    lastReadingTime: string | null;
    lastRawPacket: string;
    currentWeightKg: number;
    currentWeightQtl: number;
  }>({
    connected: false,
    lastError: null,
    lastReadingTime: null,
    lastRawPacket: '',
    currentWeightKg: 0,
    currentWeightQtl: 0,
  });

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isTestingPort, setIsTestingPort] = useState(false);
  const [portTestResult, setPortTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Web Serial State
  const [baudRate, setBaudRate] = useState<number>(2400);
  const [protocol, setProtocol] = useState<ScaleProtocol>('ventek_vms');
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
  const [simQtlInput, setSimQtlInput] = useState<number>(245.8);

  // Load hardware config and port list when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setIsSerialConnected(webSerialScale.isConnected());

    const loadData = async () => {
      try {
        const [configRes, portsRes] = await Promise.allSettled([
          api.getWeighbridgeDeviceConfig(),
          api.getSerialPorts(),
        ]);

        if (configRes.status === 'fulfilled' && configRes.value && configRes.value.device) {
          setDeviceConfig((prev) => ({
            ...prev,
            ...configRes.value.device,
          }));
          if (configRes.value.status) {
            setServerSerialStatus(configRes.value.status);
          }
        }

        if (portsRes.status === 'fulfilled' && portsRes.value && portsRes.value.ports) {
          setAvailablePorts(portsRes.value.ports);
        }
      } catch (err) {
        console.warn('Error loading weighbridge device config:', err);
      }
    };

    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Save and apply Ventek hardware config
  const handleSaveDeviceConfig = async () => {
    try {
      setIsSavingConfig(true);
      const res = await api.updateWeighbridgeDeviceConfig(deviceConfig);
      if (res && res.success) {
        toast({
          title: 'Ventek Configuration Saved',
          description: `Active on ${deviceConfig.port} @ ${deviceConfig.baudRate} baud (Unit: ${deviceConfig.unitType}).`,
        });
      }
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingConfig(false);
    }
  };

  // 2. Test COM Port reachability
  const handleTestPort = async () => {
    try {
      setIsTestingPort(true);
      setPortTestResult(null);
      const res = await api.testWeighbridgeDevice({
        port: deviceConfig.port,
        baudRate: deviceConfig.baudRate,
      });
      setPortTestResult({
        success: res.availableOnSystem,
        message: res.message,
      });
      if (res.availableOnSystem) {
        toast({
          title: `Port ${deviceConfig.port} Detected`,
          description: 'Host system recognizes USB/Serial converter on this port.',
        });
      } else {
        toast({
          title: `Port ${deviceConfig.port} Not Found`,
          description: 'Ensure the USB-to-RS232 cable from Ventek weighbridge is plugged in.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      setPortTestResult({
        success: false,
        message: err.message,
      });
    } finally {
      setIsTestingPort(false);
    }
  };

  // 3. Web Serial Connect (Direct from browser)
  const handleConnectSerial = async () => {
    try {
      setSerialLogs((prev) => [...prev, `[INIT] Requesting COM Port at ${baudRate} baud (${protocol})...`]);
      const res = await webSerialScale.connect(
        { baudRate, protocol },
        (reading, rawText) => {
          onWeightUpdate?.(reading);
          setSerialLogs((prev) => [
            `[RX] ${rawText.trim()} -> ${reading.weight} kg (${reading.weightQtl || (reading.weight / 100).toFixed(2)} Qtl) [STABLE: ${reading.stable}]`,
            ...prev.slice(0, 19),
          ]);
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
        title: 'Ventek Indicator Connected',
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
      description: 'Scale reverted to standby / background server mode',
    });
  };

  // 4. Zero Scale (Reset to 00000)
  const handleZeroScale = async () => {
    try {
      const res = await api.zeroScale();
      if (res && res.reading) {
        onWeightUpdate?.(res.reading);
      }
      toast({
        title: 'Scale Zeroed (00000)',
        description: '0.00 Qtl / 0 kg reference point set.',
      });
    } catch (err: any) {
      toast({
        title: 'Zero Scale Error',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  // 5. Simulate Weight Push (Accepts kg or Qtl)
  const handleSimulateWeight = async (kg: number, qtl?: number) => {
    try {
      const computedQtl = qtl !== undefined ? qtl : Number((kg / 100).toFixed(2));
      const res = await api.simulateScaleWeight({
        weight: kg,
        weightQtl: computedQtl,
        stable: true,
      });
      if (res && res.reading) {
        onWeightUpdate?.(res.reading);
      }
      toast({
        title: 'Weight Updated',
        description: `Live scale simulated: ${kg.toLocaleString()} kg (${computedQtl} Qtl).`,
      });
    } catch (err: any) {
      toast({ title: 'Simulation Failed', description: err.message, variant: 'destructive' });
    }
  };

  // 6. Test File Source
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

  // 7. Test TCP Socket
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

  const curlSnippet = `curl -X POST "http://localhost:3001/api/weighbridge/third-party/push" \\
  -H "Content-Type: application/json" \\
  -d '{"weight": 24580, "weightQtl": 245.80, "unit": "kg", "stable": true, "source": "VENTEK VMS-WB"}'`;

  const isHardwareLive = serverSerialStatus.connected || isSerialConnected;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg shadow-2xl max-w-3xl w-full flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-800 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm tracking-wide">
                  Weighbridge Device & Indicator Integration
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                  VENTEK VMS-WB 50,000 KG
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Real-time RS232 serial communication, direct indicator telemetry & auxiliary Quintal converter
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
              <span className="block font-mono text-[10px] text-slate-500 uppercase">Hardware Link Status</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isHardwareLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="font-semibold text-slate-200">
                  {isHardwareLive
                    ? `VENTEK VMS Connected on ${deviceConfig.port}`
                    : `VENTEK VMS Standby (${deviceConfig.port} @ ${deviceConfig.baudRate} bps)`}
                </span>
              </div>
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

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-2 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'ventek_vms' as const, label: 'Ventek VMS-WB (Hardware)', icon: HardDrive },
            { id: 'web_serial' as const, label: 'Browser Direct COM (Web Serial)', icon: Radio },
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
          {/* TAB 1: Ventek VMS Hardware Configuration & Diagnostics */}
          {activeTab === 'ventek_vms' && (
            <div className="space-y-4">
              {/* Device Profile Card */}
              <div className="p-3.5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-lg border border-slate-700 text-slate-200 shadow-sm">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-sm text-cyan-300">
                      {deviceConfig.manufacturer} {deviceConfig.model} — {deviceConfig.displayName}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    DEVICE CODE: {deviceConfig.deviceCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
                  <div>
                    <span className="text-slate-400 block text-[10px]">MANUFACTURER</span>
                    <span className="font-bold text-slate-100">{deviceConfig.manufacturer}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">MODEL NUMBER</span>
                    <span className="font-bold text-slate-100">{deviceConfig.model}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">SERIAL NUMBER</span>
                    <span className="font-bold text-slate-100">{deviceConfig.serialNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">CAPACITY</span>
                    <span className="font-bold text-cyan-300">{deviceConfig.capacityKg.toLocaleString()} KG (50 MT)</span>
                  </div>
                </div>
              </div>

              {/* Hardware Serial Port Settings Form */}
              <div className="bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Serial Port & Communication Parameters</span>
                  </h4>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await api.getSerialPorts();
                      if (res && res.ports) setAvailablePorts(res.ports);
                    }}
                    className="text-cyan-600 hover:text-cyan-700 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Scan Host Ports</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      COM Port
                    </label>
                    <div className="flex gap-1">
                      <select
                        value={deviceConfig.port}
                        onChange={(e) => setDeviceConfig({ ...deviceConfig, port: e.target.value })}
                        className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold"
                      >
                        {availablePorts.map((p) => (
                          <option key={p.path} value={p.path}>
                            {p.path} ({p.manufacturer || 'Serial'})
                          </option>
                        ))}
                        {!availablePorts.some((p) => p.path === deviceConfig.port) && (
                          <option value={deviceConfig.port}>{deviceConfig.port} (Configured)</option>
                        )}
                        <option value="COM1">COM1</option>
                        <option value="COM2">COM2</option>
                        <option value="COM3">COM3</option>
                        <option value="COM4">COM4</option>
                        <option value="COM5">COM5</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Baud Rate
                    </label>
                    <select
                      value={deviceConfig.baudRate}
                      onChange={(e) => setDeviceConfig({ ...deviceConfig, baudRate: Number(e.target.value) })}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold"
                    >
                      <option value={2400}>2400 bps (Ventek Default)</option>
                      <option value={9600}>9600 bps</option>
                      <option value={4800}>4800 bps</option>
                      <option value={1200}>1200 bps</option>
                      <option value={19200}>19200 bps</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Interface
                    </label>
                    <input
                      type="text"
                      value={deviceConfig.interfaceType}
                      onChange={(e) => setDeviceConfig({ ...deviceConfig, interfaceType: e.target.value })}
                      placeholder="RS232 / RS485"
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Type / Stream Unit
                    </label>
                    <select
                      value={deviceConfig.unitType}
                      onChange={(e) => setDeviceConfig({ ...deviceConfig, unitType: e.target.value as 'Qtl' | 'kg' })}
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold"
                    >
                      <option value="Qtl">Qtl (Quintals — 1 Qtl = 100 kg)</option>
                      <option value="kg">kg (Kilograms direct)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Data Bits / Parity / Stop
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      <select
                        value={deviceConfig.dataBits}
                        onChange={(e) => setDeviceConfig({ ...deviceConfig, dataBits: Number(e.target.value) })}
                        className="px-1 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-center"
                      >
                        <option value={8}>8</option>
                        <option value={7}>7</option>
                      </select>
                      <select
                        value={deviceConfig.parity}
                        onChange={(e) => setDeviceConfig({ ...deviceConfig, parity: e.target.value as any })}
                        className="px-1 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-center uppercase"
                      >
                        <option value="none">None</option>
                        <option value="even">Even</option>
                        <option value="odd">Odd</option>
                      </select>
                      <select
                        value={deviceConfig.stopBits}
                        onChange={(e) => setDeviceConfig({ ...deviceConfig, stopBits: Number(e.target.value) })}
                        className="px-1 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-center"
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Byte Range
                    </label>
                    <input
                      type="text"
                      value={deviceConfig.byteRange}
                      onChange={(e) => setDeviceConfig({ ...deviceConfig, byteRange: e.target.value })}
                      placeholder="1-8"
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Sample Time (ms)
                    </label>
                    <input
                      type="number"
                      value={deviceConfig.sampleTimeMs}
                      onChange={(e) => setDeviceConfig({ ...deviceConfig, sampleTimeMs: Number(e.target.value) })}
                      placeholder="1000"
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                      Max Capacity (KG)
                    </label>
                    <input
                      type="number"
                      value={deviceConfig.capacityKg}
                      onChange={(e) => setDeviceConfig({ ...deviceConfig, capacityKg: Number(e.target.value) })}
                      placeholder="50000"
                      className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-center font-bold text-cyan-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleTestPort}
                    disabled={isTestingPort}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-white rounded font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {isTestingPort ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 text-cyan-500" />}
                    <span>Test Port {deviceConfig.port}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDeviceConfig}
                    disabled={isSavingConfig}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {isSavingConfig ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Save & Apply Settings</span>
                  </button>
                </div>

                {portTestResult && (
                  <div
                    className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                      portTestResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-300'
                    }`}
                  >
                    {portTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                    )}
                    <span>{portTestResult.message}</span>
                  </div>
                )}
              </div>

              {/* Real-time Ventek Diagnostics & Quick Simulators */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block text-xs">
                  Quick Scale Bench Simulators (Test in Quintals & Kilograms):
                </span>
                <div className="flex gap-2 flex-wrap items-center">
                  <button
                    type="button"
                    onClick={() => handleSimulateWeight(0, 0)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  >
                    00000 (0.00 Qtl)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateWeight(15000, 150.0)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  >
                    15,000 kg (150.00 Qtl)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateWeight(25000, 250.0)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  >
                    25,000 kg (250.00 Qtl)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateWeight(38550, 385.5)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-slate-50 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                  >
                    38,550 kg (385.50 Qtl)
                  </button>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <input
                      type="number"
                      value={simQtlInput}
                      onChange={(e) => {
                        const qtl = Number(e.target.value);
                        setSimQtlInput(qtl);
                        setSimWeightInput(Math.round(qtl * 100));
                      }}
                      className="w-20 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-center"
                      placeholder="Qtl"
                    />
                    <span className="text-[10px] text-slate-500 font-bold">Qtl</span>
                    <button
                      type="button"
                      onClick={() => handleSimulateWeight(Math.round(simQtlInput * 100), simQtlInput)}
                      className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded font-bold text-xs"
                    >
                      Set
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Web Serial COM Port (Direct Browser Connection) */}
          {activeTab === 'web_serial' && (
            <div className="space-y-3">
              <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-900 rounded-md">
                <span className="font-bold text-cyan-900 dark:text-cyan-300 block mb-1">
                  Browser-Native Web Serial API (Zero Software Install Required)
                </span>
                <p className="text-[11px] text-cyan-800 dark:text-cyan-400">
                  Connect your browser directly to the physical weighbridge indicator (Ventek, Avery, Essae, Toledo, Eagle) via USB-to-Serial converter.
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
                    <option value="ventek_vms">Ventek VMS-WB (Range 1-8 / Qtl / 2400-8-N-1)</option>
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
                    <option value={2400}>2400 bps (Ventek Default)</option>
                    <option value={9600}>9600 bps</option>
                    <option value={4800}>4800 bps</option>
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
                    <span>Connect Direct Browser Web Serial</span>
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
                  <span className="text-slate-600 italic">No serial communication active. Click "Connect Direct Browser Web Serial" to start.</span>
                ) : (
                  serialLogs.map((log, i) => <div key={i} className="leading-tight">{log}</div>)
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Desktop File Monitor */}
          {activeTab === 'file_monitor' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-300">
                Desktop weighbridge software can export continuous live weights to a local text file. Enter the path to monitor:
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
                <div
                  className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                    fileStatus.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300'
                  }`}
                >
                  {fileStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{fileStatus.message}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TCP / Network Scale */}
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
                <div
                  className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                    tcpStatus.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300'
                  }`}
                >
                  {tcpStatus.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{tcpStatus.message}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: Inbound REST Webhook */}
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
                  onClick={() => handleSimulateWeight(simWeightInput)}
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
            <span
              className={`w-2 h-2 rounded-full ${
                isHardwareLive ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            />
            <span className="font-semibold">
              {isHardwareLive ? 'Scale Stream Active' : 'Scale Standby'}
            </span>
            <span className="text-slate-400 font-mono text-[11px] ml-1">
              (Port: {deviceConfig.port} @ {deviceConfig.baudRate} 8-N-1)
            </span>
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
