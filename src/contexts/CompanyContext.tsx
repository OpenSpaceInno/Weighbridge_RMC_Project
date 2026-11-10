import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CompanySettings } from '@/types/company';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const STORAGE_KEY_COMPANY = 'rmc_company_settings';

const defaultCompany: CompanySettings = {
  id: 'default_company',
  companyName: 'Dharani Cotton Mills / Aparna RMC Ltd.',
  firmName: 'Dharani Cotton Mills',
  plantName: 'Plant 1 - Main Batching Yard',
  plantCode: 'PLANT_001',
  tagline: 'Certified Electronic Weighbridge & Automated Concrete Dispatch',
  logoUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><rect width="200" height="60" rx="8" fill="%230f172a"/><path d="M20 18 h16 v24 h-16 z" fill="%230d9488"/><circle cx="28" cy="30" r="5" fill="%23ffffff"/><text x="46" y="28" fill="%23ffffff" font-family="Arial, sans-serif" font-weight="900" font-size="14" letter-spacing="1">DHARANI</text><text x="46" y="44" fill="%232dd4bf" font-family="Arial, sans-serif" font-weight="700" font-size="10" letter-spacing="1.5">RMC PLANT</text></svg>',
  address: 'Plot No. 44/2, Phase II, Industrial Estate, Chakan',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411057',
  phone: '+91 20 2712 8899',
  email: 'weighbridge@dharanimills.com',
  website: 'https://www.dharanimills.com',
  gstin: '27AAAAA0000A1Z5',
  weighbridgeLicense: 'WB/2026/RMC-449',
  scaleModel: 'Avery Weigh-Tronix E1205',
  scaleCapacity: '100 MT',
  scaleDivision: '10 kg',
  currency: '₹',
  weighbridgeDefaults: {
    defaultRate: 7520,
    defaultMoisture: 8,
    defaultDeduction: 50,
    defaultCharges: 250,
    printDuplicate: false,
    printQrCode: true,
    printImages: true,
    autoWeighInterval: 600,
    minTareWeight: 5000,
    maxGrossWeight: 60000,
    ftp: {
      enabled: false,
      host: '192.168.0.15',
      port: 21,
      user: 'weighbridge',
      password: '',
      secure: false,
      remoteDir: '/snapshots',
    },
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
    },
  },
  invoiceTerms: '1. Payment due within 15 days of invoice date. 2. Interest @ 18% p.a. charged on overdue bills. 3. Subject to Pune jurisdiction.',
  weighSlipNotes: 'Certified under Legal Metrology Act. Scale calibrated and stamped by Govt. Inspector. Computer generated electronic ticket requires no manual stamp.',
};

interface CompanyContextType {
  company: CompanySettings;
  isLoading: boolean;
  updateCompany: (data: Partial<CompanySettings>) => Promise<boolean>;
  uploadLogo: (logoUrl: string) => Promise<boolean>;
  refreshCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
  const [company, setCompany] = useState<CompanySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_COMPANY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.companyName) return parsed;
      }
    } catch (e) {}
    return defaultCompany;
  });

  const [isLoading, setIsLoading] = useState(false);

  const refreshCompany = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await api.getCompanySettings();
      if (res && res.companyName) {
        setCompany(res);
        try {
          localStorage.setItem(STORAGE_KEY_COMPANY, JSON.stringify(res));
        } catch (e) {}
      }
    } catch (err) {
      console.warn('Failed to fetch company settings from server, using cached:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCompany();
  }, [refreshCompany]);

  const updateCompany = async (data: Partial<CompanySettings>): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await api.updateCompanySettings(data);
      if (res && res.settings) {
        setCompany(res.settings);
        try {
          localStorage.setItem(STORAGE_KEY_COMPANY, JSON.stringify(res.settings));
        } catch (e) {}
        toast({
          title: 'Settings Saved',
          description: 'Company information and module configurations updated successfully.',
        });
        return true;
      }
      return false;
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save company settings.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadLogo = async (logoUrl: string): Promise<boolean> => {
    try {
      const res = await api.uploadCompanyLogo(logoUrl);
      if (res && res.success) {
        setCompany((prev) => {
          const updated = { ...prev, logoUrl };
          try {
            localStorage.setItem(STORAGE_KEY_COMPANY, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        toast({
          title: 'Logo Updated',
          description: 'Company logo has been updated across all modules.',
        });
        return true;
      }
      return false;
    } catch (err: any) {
      toast({
        title: 'Logo Upload Failed',
        description: err.message || 'Could not update logo.',
        variant: 'destructive',
      });
      return false;
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        company,
        isLoading,
        updateCompany,
        uploadLogo,
        refreshCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

