import React, { useState } from 'react';
import {
  Building2,
  Image as ImageIcon,
  Scale,
  KeyRound,
  Save,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  Printer,
  Globe,
  Phone,
  Mail,
  MapPin,
  FileBadge,
  Sparkles,
  Cpu,
} from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { CompanySettings as CompanySettingsType } from '@/types/company';

export const CompanySettings: React.FC = () => {
  const { company, isLoading, updateCompany, uploadLogo, refreshCompany } = useCompany();
  const { user, role } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'profile' | 'branding' | 'weighbridge' | 'security'>('profile');

  // Local form state
  const [formData, setFormData] = useState<CompanySettingsType>(company);
  const [logoInputUrl, setLogoInputUrl] = useState('');

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // FTP Storage form state
  const [isTestingFtp, setIsTestingFtp] = useState(false);
  const [ftpTestResult, setFtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showFtpPassword, setShowFtpPassword] = useState(false);

  // Third-Party Scale Indicator state
  const [isTestingScale, setIsTestingScale] = useState(false);
  const [scaleTestResult, setScaleTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state if context company updates
  React.useEffect(() => {
    setFormData(company);
  }, [company]);

  const handleChange = <K extends keyof CompanySettingsType>(field: K, value: CompanySettingsType[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDefaultsChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      weighbridgeDefaults: {
        ...prev.weighbridgeDefaults,
        [field]: value,
      },
    }));
  };

  const handleFtpChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      weighbridgeDefaults: {
        ...prev.weighbridgeDefaults,
        ftp: {
          enabled: false,
          host: '192.168.0.15',
          port: 21,
          user: 'weighbridge',
          password: '',
          secure: false,
          remoteDir: '/snapshots',
          ...(prev.weighbridgeDefaults?.ftp || {}),
          [field]: value,
        },
      },
    }));
  };

  const handleScaleConfigChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      weighbridgeDefaults: {
        ...prev.weighbridgeDefaults,
        thirdPartyScale: {
          enabled: true,
          mode: 'file_monitor',
          protocol: 'standard_ascii',
          baudRate: 9600,
          dataBits: 8,
          stopBits: 1,
          parity: 'none',
          filePath: 'C:\\Weighbridge\\live_weight.txt',
          tcpHost: '127.0.0.1',
          tcpPort: 4001,
          pollIntervalMs: 500,
          ...(prev.weighbridgeDefaults?.thirdPartyScale || {}),
          [field]: value,
        },
      },
    }));
  };

  const handleTestFtp = async () => {
    const ftpConfig = formData.weighbridgeDefaults?.ftp;
    if (!ftpConfig || !ftpConfig.host) {
      toast({
        title: 'FTP Host Required',
        description: 'Please specify the FTP Server Host IP or domain name before testing.',
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsTestingFtp(true);
      setFtpTestResult(null);
      const res = await api.testFtpConnection({
        host: ftpConfig.host,
        port: ftpConfig.port || 21,
        user: ftpConfig.user,
        password: ftpConfig.password,
        secure: ftpConfig.secure,
        remoteDir: ftpConfig.remoteDir,
      });
      if (res.success) {
        setFtpTestResult({ success: true, message: res.message });
        toast({
          title: 'FTP Connection Succeeded',
          description: res.message,
        });
      } else {
        setFtpTestResult({ success: false, message: res.error || 'Connection failed' });
        toast({
          title: 'FTP Connection Failed',
          description: res.error,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      setFtpTestResult({ success: false, message: err.message || 'Connection failed' });
      toast({
        title: 'FTP Test Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsTestingFtp(false);
    }
  };

  const handleTestScale = async () => {
    const scaleConfig = formData.weighbridgeDefaults?.thirdPartyScale;
    if (!scaleConfig) return;
    try {
      setIsTestingScale(true);
      setScaleTestResult(null);
      const res = await api.testScaleSource({
        mode: scaleConfig.mode,
        filePath: scaleConfig.filePath,
        tcpHost: scaleConfig.tcpHost,
        tcpPort: scaleConfig.tcpPort,
        protocol: scaleConfig.protocol,
      });
      if (res.success) {
        setScaleTestResult({ success: true, message: `Connected! Weight read: ${res.weight} kg (${res.message || 'OK'})` });
        toast({
          title: 'Scale Communication Verified',
          description: `Live scale reading: ${res.weight} kg`,
        });
      } else {
        setScaleTestResult({ success: false, message: res.error || 'Scale communication failed' });
        toast({
          title: 'Scale Test Failed',
          description: res.error,
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      setScaleTestResult({ success: false, message: err.message || 'Scale communication failed' });
      toast({
        title: 'Scale Test Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setIsTestingScale(false);
    }
  };

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    await updateCompany(formData);
  };

  // Logo file upload handler (converts file to Base64 Data URL)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please select an image file (PNG, JPG, SVG, or WEBP).',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setFormData((prev) => ({ ...prev, logoUrl: dataUrl }));
      await uploadLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Preset logo switcher
  const applyPresetLogo = (type: 'dharani' | 'aparna' | 'ultratech') => {
    const logos = {
      dharani: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><rect width="200" height="60" rx="8" fill="%230f172a"/><path d="M20 18 h16 v24 h-16 z" fill="%230d9488"/><circle cx="28" cy="30" r="5" fill="%23ffffff"/><text x="46" y="28" fill="%23ffffff" font-family="Arial, sans-serif" font-weight="900" font-size="14" letter-spacing="1">DHARANI</text><text x="46" y="44" fill="%232dd4bf" font-family="Arial, sans-serif" font-weight="700" font-size="10" letter-spacing="1.5">RMC PLANT</text></svg>`,
      aparna: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><rect width="200" height="60" rx="8" fill="%231e1b4b"/><polygon points="20,40 30,18 40,40" fill="%23f59e0b"/><text x="48" y="28" fill="%23ffffff" font-family="Arial, sans-serif" font-weight="900" font-size="14" letter-spacing="1">APARNA</text><text x="48" y="44" fill="%23fbbf24" font-family="Arial, sans-serif" font-weight="700" font-size="10" letter-spacing="1.5">CONCRETE</text></svg>`,
      ultratech: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><rect width="200" height="60" rx="8" fill="%23b91c1c"/><circle cx="28" cy="30" r="12" fill="%23facc15"/><text x="48" y="28" fill="%23ffffff" font-family="Arial, sans-serif" font-weight="900" font-size="14" letter-spacing="1">PRECISION</text><text x="48" y="44" fill="%23fef08a" font-family="Arial, sans-serif" font-weight="700" font-size="10" letter-spacing="1.5">BATCHING</text></svg>`,
    };
    const chosen = logos[type];
    setFormData((prev) => ({ ...prev, logoUrl: chosen }));
    uploadLogo(chosen);
  };

  // Change password submit handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all password fields.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Password Too Short',
        description: 'New password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: 'Passwords Do Not Match',
        description: 'New password and confirmation must match exactly.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsChangingPass(true);
      const res = await api.changePassword({
        userId: user?.id,
        currentPassword,
        newPassword,
      });

      if (res && res.success) {
        toast({
          title: 'Password Changed Successfully',
          description: 'Your login credentials have been securely updated.',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      toast({
        title: 'Password Change Failed',
        description: err.message || 'Incorrect current password or server error.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 rounded-xl border border-teal-200 dark:border-teal-800">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white">
                Company & System Settings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                {formData.plantCode || 'PLANT_001'}
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Configure company information, logos for weigh slips, legal weighbridge calibration, and account passwords.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshCompany()}
            disabled={isLoading}
            className="px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>
          <button
            onClick={() => handleSaveProfile()}
            disabled={isLoading}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-lg shadow flex items-center gap-2 transition-transform active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Save All Changes</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 rounded-t-xl gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'profile'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Company Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('branding')}
          className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'branding'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Branding & Logo</span>
        </button>

        <button
          onClick={() => setActiveTab('weighbridge')}
          className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'weighbridge'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Weighbridge & Module Defaults</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`py-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-teal-600 text-teal-600 dark:text-teal-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Change Password & Security</span>
        </button>
      </div>

      {/* TAB CONTENT PANELS */}
      <div className="bg-white dark:bg-slate-900 border border-t-0 border-slate-200 dark:border-slate-800 rounded-b-xl p-6 shadow-sm">
        {/* ========================================================= */}
        {/* TAB 1: COMPANY PROFILE */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Organization & Plant */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                  <Building2 className="w-4 h-4 text-teal-600" />
                  <span>Company Identity</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Full Legal Company Name *
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleChange('companyName', e.target.value)}
                    placeholder="e.g. Dharani Cotton Mills / Aparna RMC Ltd."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Printed at the top of formal tax invoices, gate passes, and legal dockets.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Short / Firm Name (Weighbridge Header) *
                  </label>
                  <input
                    type="text"
                    value={formData.firmName}
                    onChange={(e) => handleChange('firmName', e.target.value)}
                    placeholder="e.g. Dharani Cotton Mills"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Appears directly in the Weighbridge form, indicator banner, and ticket header.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Plant / Unit Name
                    </label>
                    <input
                      type="text"
                      value={formData.plantName}
                      onChange={(e) => handleChange('plantName', e.target.value)}
                      placeholder="e.g. Main Batching Yard"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Plant Code
                    </label>
                    <input
                      type="text"
                      value={formData.plantCode}
                      onChange={(e) => handleChange('plantCode', e.target.value)}
                      placeholder="e.g. PLANT_001"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tagline / Operational Subtitle
                  </label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => handleChange('tagline', e.target.value)}
                    placeholder="e.g. Certified Electronic Weighbridge & Automated Dispatch"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Right Column: Physical Address & Contact */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                  <MapPin className="w-4 h-4 text-teal-600" />
                  <span>Plant Location & Statutory Info</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Plant Street Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="Plot / Survey No., Industrial Area, Street"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      State
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      PIN Code
                    </label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(e) => handleChange('pincode', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Official Phone
                    </label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      placeholder="+91 20 2712 8899"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Official Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      placeholder="weighbridge@dharanimills.com"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      GSTIN / Tax ID
                    </label>
                    <input
                      type="text"
                      value={formData.gstin}
                      onChange={(e) => handleChange('gstin', e.target.value.toUpperCase())}
                      placeholder="27AAAAA0000A1Z5"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Weighbridge License No
                    </label>
                    <input
                      type="text"
                      value={formData.weighbridgeLicense}
                      onChange={(e) => handleChange('weighbridgeLicense', e.target.value)}
                      placeholder="WB/2026/RMC-449"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-teal-600 dark:text-teal-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-lg shadow flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Profile Settings</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 2: BRANDING & LOGO */}
        {/* ========================================================= */}
        {activeTab === 'branding' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Left Column: Logo Uploader (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-teal-600" />
                  <span>Upload Corporate Logo</span>
                </h3>
                <p className="text-xs text-slate-500">
                  This logo will dynamically render in the Weighbridge terminal ribbon, on printed weigh slips, invoices, and in the application sidebar.
                </p>

                {/* File Upload Drop Area */}
                <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50 dark:bg-slate-950 transition-colors group">
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-teal-600 mb-2 transition-colors" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Click to browse or drop logo file
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">
                    Supports SVG, PNG, JPG, or WEBP (Max 2MB)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Direct URL Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Or Enter Image URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png"
                      value={logoInputUrl}
                      onChange={(e) => setLogoInputUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (logoInputUrl.trim()) {
                          setFormData((prev) => ({ ...prev, logoUrl: logoInputUrl }));
                          uploadLogo(logoInputUrl);
                          setLogoInputUrl('');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Preset Brand Logos */}
                <div>
                  <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Quick Brand Presets:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPresetLogo('dharani')}
                      className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700"
                    >
                      Dharani
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetLogo('aparna')}
                      className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700"
                    >
                      Aparna
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPresetLogo('ultratech')}
                      className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700"
                    >
                      Precision
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Live Previews (7 cols) */}
              <div className="md:col-span-7 space-y-5">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Live Dynamic Previews</span>
                </h3>

                {/* Preview 1: Weighbridge Screen Header */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Weighbridge Terminal Banner Preview
                  </span>
                  <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 p-2.5 rounded-md flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                      {formData.logoUrl ? (
                        <img
                          src={formData.logoUrl}
                          alt="Logo"
                          className="h-9 w-auto max-w-[130px] object-contain rounded"
                        />
                      ) : (
                        <div className="h-9 w-9 bg-teal-600 text-white font-bold flex items-center justify-center rounded text-xs">
                          RMC
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-black text-slate-900 dark:text-white uppercase font-mono">
                          {formData.firmName || formData.companyName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {formData.tagline || 'Electronic Weighbridge Terminal'}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-900 px-3 py-1 rounded text-cyan-400 font-mono font-black text-lg">
                      024580 <span className="text-xs text-cyan-500">KG</span>
                    </div>
                  </div>
                </div>

                {/* Preview 2: Electronic Weigh Slip Printed Docket Preview */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Printed Weigh Slip Docket Header Preview
                  </span>
                  <div className="bg-white text-slate-900 border border-slate-300 p-4 rounded-md shadow-sm font-sans text-center">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      {formData.logoUrl && (
                        <img
                          src={formData.logoUrl}
                          alt="Docket Logo"
                          className="h-10 w-auto max-w-[140px] object-contain"
                        />
                      )}
                      <div>
                        <h4 className="text-sm font-black uppercase text-slate-900 tracking-wider">
                          {formData.firmName || formData.companyName}
                        </h4>
                        <p className="text-[10px] text-slate-600">
                          {formData.address}, {formData.city} - {formData.pincode}
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-b border-slate-300 py-1 flex justify-between text-[10px] font-mono text-slate-600">
                      <span>GSTIN: <strong>{formData.gstin}</strong></span>
                      <span>License: <strong>{formData.weighbridgeLicense}</strong></span>
                      <span>Scale: <strong>{formData.scaleModel}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Preview 3: Application Sidebar Preview */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Sidebar Brand Card Preview
                  </span>
                  <div className="w-64 bg-slate-900 text-white p-3 rounded-lg flex items-center gap-3">
                    {formData.logoUrl ? (
                      <img
                        src={formData.logoUrl}
                        alt="Sidebar Logo"
                        className="h-8 w-auto max-w-[80px] object-contain"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded bg-teal-600 flex items-center justify-center font-bold text-xs">
                        RMC
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <div className="text-xs font-bold truncate">
                        {formData.firmName}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {formData.plantName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: WEIGHBRIDGE & MODULE DEFAULTS */}
        {/* ========================================================= */}
        {activeTab === 'weighbridge' && (
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hardware & Calibration Specifications */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                  <Scale className="w-4 h-4 text-teal-600" />
                  <span>Hardware & Legal Metrology Calibration</span>
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Scale Indicator Make & Model
                  </label>
                  <input
                    type="text"
                    value={formData.scaleModel}
                    onChange={(e) => handleChange('scaleModel', e.target.value)}
                    placeholder="e.g. Avery Weigh-Tronix E1205"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Max Scale Capacity
                    </label>
                    <input
                      type="text"
                      value={formData.scaleCapacity}
                      onChange={(e) => handleChange('scaleCapacity', e.target.value)}
                      placeholder="e.g. 100 MT"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Scale Division / Accuracy
                    </label>
                    <input
                      type="text"
                      value={formData.scaleDivision}
                      onChange={(e) => handleChange('scaleDivision', e.target.value)}
                      placeholder="e.g. 10 kg (Class III)"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Weighbridge License & Stamping Reference
                  </label>
                  <input
                    type="text"
                    value={formData.weighbridgeLicense}
                    onChange={(e) => handleChange('weighbridgeLicense', e.target.value)}
                    placeholder="e.g. WB/2026/RMC-449"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-teal-600 dark:text-teal-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Weigh Slip Statutory Footer Notes
                  </label>
                  <textarea
                    rows={3}
                    value={formData.weighSlipNotes}
                    onChange={(e) => handleChange('weighSlipNotes', e.target.value)}
                    placeholder="Printed at the bottom of all generated weigh slips"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Operational Defaults & Pricing */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800">
                  <Printer className="w-4 h-4 text-teal-600" />
                  <span>Default Parameters & Print Controls</span>
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Default Material Rate (₹ / Ton)
                    </label>
                    <input
                      type="number"
                      value={formData.weighbridgeDefaults?.defaultRate || 7520}
                      onChange={(e) => handleDefaultsChange('defaultRate', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Default Moisture %
                    </label>
                    <input
                      type="number"
                      value={formData.weighbridgeDefaults?.defaultMoisture || 8}
                      onChange={(e) => handleDefaultsChange('defaultMoisture', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Default Deduction (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.weighbridgeDefaults?.defaultDeduction || 50}
                      onChange={(e) => handleDefaultsChange('defaultDeduction', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Weighment Charges (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.weighbridgeDefaults?.defaultCharges || 250}
                      onChange={(e) => handleDefaultsChange('defaultCharges', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Print Checkbox Defaults */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
                    Default Weigh Slip Print Options:
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.weighbridgeDefaults?.printDuplicate ?? false}
                      onChange={(e) => handleDefaultsChange('printDuplicate', e.target.checked)}
                      className="rounded text-teal-600"
                    />
                    <span>Print "DUPLICATE" watermark by default</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.weighbridgeDefaults?.printQrCode ?? true}
                      onChange={(e) => handleDefaultsChange('printQrCode', e.target.checked)}
                      className="rounded text-teal-600"
                    />
                    <span>Generate & Print Gate Verification QR Code</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.weighbridgeDefaults?.printImages ?? true}
                      onChange={(e) => handleDefaultsChange('printImages', e.target.checked)}
                      className="rounded text-teal-600"
                    />
                    <span>Print captured dual camera photos on weigh slip</span>
                  </label>
                </div>

                {/* FTP Camera Snapshot Storage & Remote Sync */}
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                        FTP Snapshot Server (Automated Camera Docket Sync)
                      </span>
                      <span className="text-[11px] text-slate-500">
                        When operator clicks "Get Weight F3", captured ANPR & IP camera photos are saved locally and synced to this FTP server for document printing.
                      </span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.weighbridgeDefaults?.ftp?.enabled ?? false}
                        onChange={(e) => handleFtpChange('enabled', e.target.checked)}
                        className="rounded text-teal-600 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-teal-700 dark:text-teal-400">Enable FTP Sync</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        FTP Server Host / IP Address
                      </label>
                      <input
                        type="text"
                        value={formData.weighbridgeDefaults?.ftp?.host || ''}
                        onChange={(e) => handleFtpChange('host', e.target.value)}
                        placeholder="e.g. 192.168.0.15 or ftp.rmcplant.com"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        FTP Port
                      </label>
                      <input
                        type="number"
                        value={formData.weighbridgeDefaults?.ftp?.port || 21}
                        onChange={(e) => handleFtpChange('port', parseInt(e.target.value) || 21)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        FTP Username
                      </label>
                      <input
                        type="text"
                        value={formData.weighbridgeDefaults?.ftp?.user || ''}
                        onChange={(e) => handleFtpChange('user', e.target.value)}
                        placeholder="e.g. weighbridge"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        FTP Password
                      </label>
                      <div className="relative">
                        <input
                          type={showFtpPassword ? 'text' : 'password'}
                          value={formData.weighbridgeDefaults?.ftp?.password || ''}
                          onChange={(e) => handleFtpChange('password', e.target.value)}
                          placeholder="FTP password"
                          className="w-full px-3 py-1.5 pr-8 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowFtpPassword(!showFtpPassword)}
                          className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showFtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Remote Directory
                      </label>
                      <input
                        type="text"
                        value={formData.weighbridgeDefaults?.ftp?.remoteDir || '/snapshots'}
                        onChange={(e) => handleFtpChange('remoteDir', e.target.value)}
                        placeholder="/snapshots"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                    <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.weighbridgeDefaults?.ftp?.secure ?? false}
                        onChange={(e) => handleFtpChange('secure', e.target.checked)}
                        className="rounded text-teal-600"
                      />
                      <span>Use FTPS / Secure TLS</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleTestFtp}
                      disabled={isTestingFtp || !formData.weighbridgeDefaults?.ftp?.host}
                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
                    >
                      {isTestingFtp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5 text-teal-600" />}
                      <span>{isTestingFtp ? 'Testing FTP...' : 'Test FTP Connection'}</span>
                    </button>
                  </div>

                  {ftpTestResult && (
                    <div className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                      ftpTestResult.success ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300'
                    }`}>
                      {ftpTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span>{ftpTestResult.message}</span>
                    </div>
                  )}
                </div>

                {/* Third-Party Scale Integration Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-slate-300 dark:border-slate-800 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-cyan-600" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          Third-Party Weighbridge Software & Digital Indicator Bridge
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Synchronize weights from external software (Avery WinWeigh, Essae, Tulsi, Mettler Toledo, Eagle) via COM Port, File Sync, or TCP Socket.
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.weighbridgeDefaults?.thirdPartyScale?.enabled ?? true}
                        onChange={(e) => handleScaleConfigChange('enabled', e.target.checked)}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                      />
                      <span>Active</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Interface Mode
                      </label>
                      <select
                        value={formData.weighbridgeDefaults?.thirdPartyScale?.mode || 'file_monitor'}
                        onChange={(e) => handleScaleConfigChange('mode', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      >
                        <option value="file_monitor">Desktop File Sync (WinWeigh / Tulsi)</option>
                        <option value="web_serial">Direct COM / RS-232 Port</option>
                        <option value="tcp_socket">TCP / Ethernet Socket</option>
                        <option value="http_push">Inbound HTTP REST Webhook</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Scale Protocol Format
                      </label>
                      <select
                        value={formData.weighbridgeDefaults?.thirdPartyScale?.protocol || 'standard_ascii'}
                        onChange={(e) => handleScaleConfigChange('protocol', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs"
                      >
                        <option value="standard_ascii">Standard ASCII Continuous</option>
                        <option value="avery_e1205">Avery E1205 / E1110</option>
                        <option value="essae">Essae Teraoka</option>
                        <option value="toledo">Mettler Toledo Continuous</option>
                        <option value="eagle">Eagle / Tulsi Indicator</option>
                      </select>
                    </div>

                    {(formData.weighbridgeDefaults?.thirdPartyScale?.mode === 'web_serial' ||
                      !formData.weighbridgeDefaults?.thirdPartyScale?.mode) && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Baud Rate (bps)
                          </label>
                          <select
                            value={formData.weighbridgeDefaults?.thirdPartyScale?.baudRate || 9600}
                            onChange={(e) => handleScaleConfigChange('baudRate', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs"
                          >
                            <option value={2400}>2400</option>
                            <option value={4800}>4800</option>
                            <option value={9600}>9600 (Standard)</option>
                            <option value={19200}>19200</option>
                            <option value={115200}>115200</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Poll Interval (ms)
                          </label>
                          <input
                            type="number"
                            value={formData.weighbridgeDefaults?.thirdPartyScale?.pollIntervalMs || 500}
                            onChange={(e) => handleScaleConfigChange('pollIntervalMs', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs"
                          />
                        </div>
                      </>
                    )}

                    {formData.weighbridgeDefaults?.thirdPartyScale?.mode === 'file_monitor' && (
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                          Exported Weight File Path
                        </label>
                        <input
                          type="text"
                          value={formData.weighbridgeDefaults?.thirdPartyScale?.filePath || 'C:\\Weighbridge\\live_weight.txt'}
                          onChange={(e) => handleScaleConfigChange('filePath', e.target.value)}
                          placeholder="C:\Weighbridge\live_weight.txt"
                          className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                        />
                      </div>
                    )}

                    {formData.weighbridgeDefaults?.thirdPartyScale?.mode === 'tcp_socket' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Scale Host IP / Domain
                          </label>
                          <input
                            type="text"
                            value={formData.weighbridgeDefaults?.thirdPartyScale?.tcpHost || '127.0.0.1'}
                            onChange={(e) => handleScaleConfigChange('tcpHost', e.target.value)}
                            placeholder="127.0.0.1"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            TCP Port
                          </label>
                          <input
                            type="number"
                            value={formData.weighbridgeDefaults?.thirdPartyScale?.tcpPort || 4001}
                            onChange={(e) => handleScaleConfigChange('tcpPort', Number(e.target.value))}
                            placeholder="4001"
                            className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[11px] text-slate-500">
                      Standard standby indicator displays strictly <code className="text-cyan-600 font-bold">00000</code> when idle.
                    </p>

                    <button
                      type="button"
                      onClick={handleTestScale}
                      disabled={isTestingScale}
                      className="px-3 py-1 bg-cyan-100 hover:bg-cyan-200 dark:bg-cyan-950 dark:hover:bg-cyan-900 disabled:opacity-50 text-cyan-800 dark:text-cyan-200 text-xs font-bold rounded flex items-center gap-1.5 transition-colors"
                    >
                      {isTestingScale ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Cpu className="w-3.5 h-3.5 text-cyan-600" />}
                      <span>{isTestingScale ? 'Connecting...' : 'Test Scale Source'}</span>
                    </button>
                  </div>

                  {scaleTestResult && (
                    <div className={`p-2.5 rounded text-xs flex items-center gap-2 ${
                      scaleTestResult.success ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-300'
                    }`}>
                      {scaleTestResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                      <span>{scaleTestResult.message}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Standard Commercial Invoice Terms
                  </label>
                  <textarea
                    rows={2}
                    value={formData.invoiceTerms}
                    onChange={(e) => handleChange('invoiceTerms', e.target.value)}
                    placeholder="Standard payment and dispute terms"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-lg shadow flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Module Defaults</span>
              </button>
            </div>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 4: CHANGE PASSWORD & USER SECURITY */}
        {/* ========================================================= */}
        {activeTab === 'security' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Current User Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-teal-600 text-white font-black text-lg flex items-center justify-center">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    {user?.name || 'Current User'}
                  </h4>
                  <p className="text-xs text-slate-500 font-mono">
                    {user?.email || 'user@rmc.com'} · User ID: {user?.id}
                  </p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                    Active Role: {role?.name || user?.roleName || 'Operator'}
                  </span>
                </div>
              </div>

              <div className="text-right text-xs text-slate-400 font-mono hidden sm:block">
                <div>Session Active</div>
                <div className="text-emerald-500 font-semibold flex items-center gap-1 justify-end">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Authenticated
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <KeyRound className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    Change Password
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update your account credentials to keep plant operations secure.
                  </p>
                </div>
              </div>

              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password * (Min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter secure new password"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password *
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-3 pr-10 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Quality Checklist */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1 text-slate-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>Security Recommendations:</span>
                </div>
                <div className={newPassword.length >= 6 ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                  • Minimum 6 characters ({newPassword.length}/6 entered)
                </div>
                <div className={/[0-9]/.test(newPassword) ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                  • Contains numeric digits
                </div>
                <div className={newPassword && newPassword === confirmPassword ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                  • Passwords match
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-lg shadow flex items-center justify-center gap-2 transition-transform active:scale-95"
                >
                  {isChangingPass ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanySettings;

