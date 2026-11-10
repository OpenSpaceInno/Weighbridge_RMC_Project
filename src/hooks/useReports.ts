import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  ReportConfig, 
  GeneratedReport, 
  ScheduledReport, 
  ReportStats,
  ReportGenerateRequest,
  ScheduleReportRequest,
  TripSummaryData,
  FuelConsumptionData
} from '@/types/reports';

const mockReportConfigs: ReportConfig[] = [
  {
    id: 'config-001',
    name: 'Trip Summary Report',
    type: 'trip_summary',
    description: 'Comprehensive summary of all mixer trips including concrete delivery volume, on-time rates, slump variance, and driver metrics',
    parameters: [
      { name: 'dateRange', label: 'Date Range', type: 'daterange', required: true },
      { name: 'status', label: 'Trip Status', type: 'multiselect', required: false, options: [
        { value: 'completed', label: 'Completed' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'cancelled', label: 'Cancelled' },
      ]},
    ],
    availableFormats: ['csv', 'excel', 'pdf'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'config-002',
    name: 'Fuel Consumption Report',
    type: 'fuel_consumption',
    description: 'Detailed diesel consumption analysis across Transit Mixers with mileage (km/L), total cost, and engine idling analysis',
    parameters: [
      { name: 'dateRange', label: 'Date Range', type: 'daterange', required: true },
      { name: 'vehicleId', label: 'Transit Mixer', type: 'select', required: false },
    ],
    availableFormats: ['csv', 'excel', 'pdf'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'config-003',
    name: 'Transit Mixer Performance',
    type: 'vehicle_performance',
    description: 'Mixer-wise operational metrics including trip counts, total distance, drum rotation wear, and maintenance spend',
    parameters: [
      { name: 'dateRange', label: 'Date Range', type: 'daterange', required: true },
      { name: 'vehicleId', label: 'Transit Mixer', type: 'select', required: false },
    ],
    availableFormats: ['csv', 'excel', 'pdf'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'config-004',
    name: 'Driver Performance & Safety',
    type: 'driver_performance',
    description: 'Driver efficiency breakdown with total deliveries completed, slump handling score, safety ratings, and turnaround delays',
    parameters: [
      { name: 'dateRange', label: 'Date Range', type: 'daterange', required: true },
      { name: 'driverId', label: 'Driver', type: 'select', required: false },
    ],
    availableFormats: ['csv', 'excel', 'pdf'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'config-005',
    name: 'Raw Materials & Silo Stock Audit',
    type: 'inventory_status',
    description: 'Current batching plant inventory: OPC 53 cement silos, 10mm/20mm aggregate bins, sand, admixtures, and minimum buffer warnings',
    parameters: [
      { name: 'category', label: 'Material Category', type: 'select', required: false, options: [
        { value: 'cement', label: 'Cement Silos' },
        { value: 'aggregates', label: 'Aggregates' },
        { value: 'admixtures', label: 'Chemical Admixtures' },
      ]},
    ],
    availableFormats: ['csv', 'excel', 'pdf'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'config-006',
    name: 'Commercial GST Billing Summary',
    type: 'billing_summary',
    description: 'Tax invoices, CGST/SGST breakdowns, commercial client billing (L&T, Shapoorji, BuildCorp), and outstanding receivables',
    parameters: [
      { name: 'dateRange', label: 'Date Range', type: 'daterange', required: true },
      { name: 'status', label: 'Payment Status', type: 'select', required: false },
    ],
    availableFormats: ['csv', 'excel', 'pdf'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'config-007',
    name: 'Weighbridge Calibrations & Gross Log',
    type: 'weighbridge_log',
    description: 'Entry & Exit weighbridge scale logs, tare weight comparisons, net concrete batch weights vs delivery challans',
    parameters: [
      { name: 'dateRange', label: 'Date Range', type: 'daterange', required: true },
    ],
    availableFormats: ['csv', 'excel', 'pdf'],
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'config-008',
    name: 'Quality Assurance & Incident Log',
    type: 'incident_log',
    description: 'Concrete cube test results, 7/28 day compressive strength variance, slump rejections at gate, and water added on site',
    parameters: [
      { name: 'dateRange', label: 'Date Range', type: 'daterange', required: true },
    ],
    availableFormats: ['csv', 'excel', 'pdf'],
    createdAt: '2025-01-01T00:00:00Z',
  },
];

const INITIAL_GENERATED_REPORTS: GeneratedReport[] = [
  {
    id: 'rep-001',
    name: 'RMC Trip Summary - January 2025',
    type: 'trip_summary',
    format: 'csv',
    parameters: { dateRange: '2025-01-01 to 2025-01-31', status: 'all' },
    generatedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    generatedBy: 'Plant Manager (P. Shinde)',
    status: 'completed',
    fileSize: 184320,
    content: `Trip_ID,Challan_No,Vehicle_Reg,Customer,Site_Location,Grade,Quantity_m3,Slump_mm,Status,Departure_Time,Delivery_Time,On_Time
TRIP-1021,CH-2025-881,MH-12-RN-4501,BuildCorp Infra,Pune Ring Road Pkg 4,M30,7.0,130,Completed,2025-01-15 08:30,2025-01-15 09:45,Yes
TRIP-1022,CH-2025-882,MH-12-RN-4502,Larsen & Toubro,Hinjewadi Tech Park Ph 3,M35,6.5,125,Completed,2025-01-15 09:10,2025-01-15 10:20,Yes
TRIP-1023,CH-2025-883,MH-12-RN-4503,Shapoorji Pallonji,Kharadi IT Park Tower B,M25,8.0,140,Completed,2025-01-15 10:00,2025-01-15 11:35,No
TRIP-1024,CH-2025-884,MH-14-EM-8821,Godrej Properties,Wakad High-Rise Sec 2,M40,6.0,120,Completed,2025-01-15 11:15,2025-01-15 12:25,Yes
TRIP-1025,CH-2025-885,MH-12-RN-4501,Tata Projects,Metro Line 3 Viaduct P-12,M35,7.5,135,Completed,2025-01-15 13:00,2025-01-15 14:15,Yes`,
    dataPreview: {
      totalTrips: 156,
      completedTrips: 148,
      totalVolumeM3: 1092,
      onTimeRate: '92.4%',
      avgSlump: '130 mm',
    }
  },
  {
    id: 'rep-002',
    name: 'Fleet Fuel Consumption & Mileage',
    type: 'fuel_consumption',
    format: 'excel',
    parameters: { dateRange: '2025-01-01 to 2025-01-31' },
    generatedAt: new Date(Date.now() - 3600000 * 26).toISOString(),
    generatedBy: 'Fleet Admin (A. Deshmukh)',
    status: 'completed',
    fileSize: 98304,
    content: `Vehicle_Reg,Model,Total_Distance_km,Fuel_Consumed_Liters,Avg_Mileage_km_per_L,Fuel_Cost_INR,Cost_per_Km_INR
MH-12-RN-4501,Ashok Leyland 2820 (8m3),3850,916.6,4.20,87077,22.62
MH-12-RN-4502,Tata Signa 2823 (8m3),4120,1056.4,3.90,100358,24.36
MH-12-RN-4503,BharatBenz 2828C (9m3),3690,838.6,4.40,79667,21.59
MH-14-EM-8821,Eicher Pro 6028 (7m3),3450,784.0,4.40,74480,21.59
MH-12-TK-9901,Ashok Leyland 2820 (8m3),2980,726.8,4.10,69046,23.17`,
    dataPreview: {
      totalFuelLiters: 4322,
      totalCostINR: 410628,
      avgFleetEfficiency: '4.2 km/L',
      activeVehicles: 5,
    }
  },
  {
    id: 'rep-003',
    name: 'Raw Materials & Silo Stock Audit',
    type: 'inventory_status',
    format: 'csv',
    parameters: { category: 'all' },
    generatedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    generatedBy: 'Quality In-charge (V. Kulkarni)',
    status: 'completed',
    fileSize: 45056,
    content: `Material_Code,Material_Name,Storage_Location,Current_Stock,Capacity,Unit,Reorder_Level,Stock_Percentage,Status
MAT-C01,OPC 53 Grade Cement,Silo 1 (Main Batcher),68.5,120.0,Tons,25.0,57.1%,Adequate
MAT-C02,PPC Portland Pozzolana Cement,Silo 2,42.0,100.0,Tons,20.0,42.0%,Adequate
MAT-A01,10mm Basalt Crushed Aggregates,Bin Bay 1,185.0,250.0,Tons,40.0,74.0%,Adequate
MAT-A02,20mm Basalt Crushed Aggregates,Bin Bay 2,210.0,300.0,Tons,50.0,70.0%,Adequate
MAT-S01,Crushed M-Sand (Manufactured),Aggregate Yard Bay 3,340.0,500.0,Tons,60.0,68.0%,Adequate
MAT-AD01,Sika ViscoCrete 20 HE PCE Admixture,Storage Drum Tank 1,1850.0,3000.0,Liters,600.0,61.7%,Adequate
MAT-AD02,Fosroc Conplast SP430 Retarder,Chemical Dosing Bay,420.0,1500.0,Liters,400.0,28.0%,Low Stock Warning`,
    dataPreview: {
      totalMaterialTypes: 7,
      lowStockAlerts: 1,
      totalCementTons: 110.5,
      totalAggregateTons: 735.0,
    }
  },
  {
    id: 'rep-004',
    name: 'Commercial GST Billing Summary - Q4',
    type: 'billing_summary',
    format: 'pdf',
    parameters: { dateRange: '2024-10-01 to 2024-12-31' },
    generatedAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    generatedBy: 'Accounts Officer (S. Patil)',
    status: 'completed',
    fileSize: 327680,
    content: `Invoice_Number,Invoice_Date,Customer_Name,GSTIN,Taxable_Value,CGST_9pct,SGST_9pct,Total_Invoice_INR,Status
INV-2025-001,2025-01-10,BuildCorp Infrastructure Ltd,27AABCB1234F1Z5,315000.00,28350.00,28350.00,371700.00,Paid
INV-2025-002,2025-01-12,Larsen & Toubro ECC,27AAACL0123M1Z2,455000.00,40950.00,40950.00,536900.00,Paid
INV-2025-003,2025-01-14,Shapoorji Pallonji Co.,27AAACS4567H1Z8,280000.00,25200.00,25200.00,330400.00,Pending
INV-2025-004,2025-01-15,Godrej Properties Ltd,27AAACG7890K1Z4,192000.00,17280.00,17280.00,226560.00,Sent
INV-2025-005,2024-12-28,Tata Projects Ltd,27AAACT3344P1Z1,265000.00,23850.00,23850.00,312700.00,Overdue`,
    dataPreview: {
      totalInvoices: 5,
      totalBilledINR: 1778260,
      totalGSTCollectedINR: 271260,
      collectedAmountINR: 908600,
      outstandingAmountINR: 869660,
    }
  }
];

const INITIAL_SCHEDULED_REPORTS: ScheduledReport[] = [
  {
    id: 'sched-001',
    name: 'Daily Plant Dispatch & Gate-Out Log',
    type: 'trip_summary',
    format: 'csv',
    frequency: 'daily',
    parameters: { status: 'completed' },
    recipients: ['dispatch.lead@rmc-plant.com', 'operations@rmc-plant.com'],
    isActive: true,
    lastRun: new Date(Date.now() - 3600000 * 14).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 10).toISOString(),
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'sched-002',
    name: 'Weekly Fleet Fuel & Mileage Audit',
    type: 'fuel_consumption',
    format: 'excel',
    frequency: 'weekly',
    parameters: {},
    recipients: ['fleet.admin@rmc-plant.com', 'accounts@rmc-plant.com'],
    isActive: true,
    lastRun: new Date(Date.now() - 3600000 * 96).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 72).toISOString(),
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'sched-003',
    name: 'Monthly GST Invoicing & Receivables Report',
    type: 'billing_summary',
    format: 'pdf',
    frequency: 'monthly',
    parameters: {},
    recipients: ['finance.head@rmc-plant.com', 'cfo@rmc-plant.com'],
    isActive: true,
    lastRun: new Date(Date.now() - 3600000 * 200).toISOString(),
    nextRun: new Date(Date.now() + 3600000 * 300).toISOString(),
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  },
  {
    id: 'sched-004',
    name: 'Bi-Weekly Raw Material Silo Audit',
    type: 'inventory_status',
    format: 'excel',
    frequency: 'weekly',
    parameters: {},
    recipients: ['quality.qc@rmc-plant.com', 'procurement@rmc-plant.com'],
    isActive: false,
    nextRun: new Date(Date.now() + 3600000 * 120).toISOString(),
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
  }
];

export function useReports() {
  const [configs] = useState<ReportConfig[]>(mockReportConfigs);
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>(() => {
    try {
      const stored = localStorage.getItem('rmc_generated_reports');
      return stored ? JSON.parse(stored) : INITIAL_GENERATED_REPORTS;
    } catch {
      return INITIAL_GENERATED_REPORTS;
    }
  });

  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>(() => {
    try {
      const stored = localStorage.getItem('rmc_scheduled_reports');
      return stored ? JSON.parse(stored) : INITIAL_SCHEDULED_REPORTS;
    } catch {
      return INITIAL_SCHEDULED_REPORTS;
    }
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ReportConfig | null>(null);
  const { toast } = useToast();

  // Save generated reports to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('rmc_generated_reports', JSON.stringify(generatedReports));
    } catch (e) {
      console.error('Failed to save generated reports:', e);
    }
  }, [generatedReports]);

  // Save scheduled reports to localStorage whenever changed
  useEffect(() => {
    try {
      localStorage.setItem('rmc_scheduled_reports', JSON.stringify(scheduledReports));
    } catch (e) {
      console.error('Failed to save scheduled reports:', e);
    }
  }, [scheduledReports]);

  const getStats = useCallback((): ReportStats => {
    const today = new Date().toISOString().split('T')[0];
    return {
      totalReports: generatedReports.length,
      generatedToday: generatedReports.filter(r => r.generatedAt.startsWith(today)).length,
      scheduledReports: scheduledReports.length,
      activeSchedules: scheduledReports.filter(s => s.isActive).length,
      failedReports: generatedReports.filter(r => r.status === 'failed').length,
    };
  }, [generatedReports, scheduledReports]);

  // Helper to generate dynamic mock report data based on requested type
  const createReportContent = (type: ReportConfig['type'], format: string): { content: string; dataPreview: any } => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    switch (type) {
      case 'trip_summary':
        return {
          content: `Trip_ID,Challan_No,Vehicle_Reg,Customer,Concrete_Grade,Volume_m3,Slump_mm,Status,Dispatch_Time\n` +
            `TRIP-1081,CH-${Math.floor(1000 + Math.random()*9000)},MH-12-RN-4501,BuildCorp Infra,M30,7.0,130,Delivered,${timestamp}\n` +
            `TRIP-1082,CH-${Math.floor(1000 + Math.random()*9000)},MH-12-RN-4502,Larsen & Toubro,M35,6.5,125,Delivered,${timestamp}\n` +
            `TRIP-1083,CH-${Math.floor(1000 + Math.random()*9000)},MH-12-RN-4503,Shapoorji Pallonji,M25,8.0,140,Delivered,${timestamp}\n` +
            `TRIP-1084,CH-${Math.floor(1000 + Math.random()*9000)},MH-14-EM-8821,Godrej Properties,M40,6.0,120,Delivered,${timestamp}\n` +
            `TRIP-1085,CH-${Math.floor(1000 + Math.random()*9000)},MH-12-TK-9901,Tata Projects,M35,7.5,135,Delivered,${timestamp}`,
          dataPreview: {
            totalTrips: 18,
            totalVolume: '131 m³',
            avgSlump: '130 mm',
            onTimeRate: '94.5%'
          }
        };

      case 'fuel_consumption':
        return {
          content: `Vehicle_Reg,Model,Distance_km,Fuel_Liters,Mileage_km_per_L,Cost_INR\n` +
            `MH-12-RN-4501,Ashok Leyland 2820,3850,916.6,4.20,87077\n` +
            `MH-12-RN-4502,Tata Signa 2823,4120,1056.4,3.90,100358\n` +
            `MH-12-RN-4503,BharatBenz 2828C,3690,838.6,4.40,79667\n` +
            `MH-14-EM-8821,Eicher Pro 6028,3450,784.0,4.40,74480`,
          dataPreview: {
            totalLiters: 3595.6,
            totalCost: '₹3,41,582',
            avgEfficiency: '4.2 km/L'
          }
        };

      case 'inventory_status':
        return {
          content: `Material_ID,Description,Silo_Bin,Current_Stock,Max_Capacity,Unit,Status\n` +
            `MAT-C01,OPC 53 Cement,Silo 1,74.2,120,Tons,Normal\n` +
            `MAT-C02,PPC Cement,Silo 2,46.8,100,Tons,Normal\n` +
            `MAT-A01,10mm Aggregates,Bin 1,192.5,250,Tons,Normal\n` +
            `MAT-A02,20mm Aggregates,Bin 2,215.0,300,Tons,Normal\n` +
            `MAT-S01,Manufactured Sand,Bay 3,365.0,500,Tons,Normal\n` +
            `MAT-AD01,Sika ViscoCrete,Drum 1,1850,3000,Liters,Normal\n` +
            `MAT-AD02,Fosroc Retarder,Drum 2,420,1500,Liters,Low Stock Warning`,
          dataPreview: {
            totalCementTons: 121.0,
            totalAggregatesTons: 772.5,
            siloCapacityUsed: '63%'
          }
        };

      case 'billing_summary':
        return {
          content: `Invoice_ID,Customer_Name,GSTIN,Taxable_Value,CGST,SGST,Total_INR,Status\n` +
            `INV-2025-001,BuildCorp Infra,27AABCB1234F1Z5,315000,28350,28350,371700,Paid\n` +
            `INV-2025-002,Larsen & Toubro,27AAACL0123M1Z2,455000,40950,40950,536900,Paid\n` +
            `INV-2025-003,Shapoorji Pallonji,27AAACS4567H1Z8,280000,25200,25200,330400,Pending\n` +
            `INV-2025-004,Godrej Properties,27AAACG7890K1Z4,192000,17280,17280,226560,Sent`,
          dataPreview: {
            totalBilled: '₹14,65,560',
            taxCollected: '₹2,23,560',
            pendingPayments: '₹5,56,960'
          }
        };

      default:
        return {
          content: `Metric,Value,Recorded_At,Status\n` +
            `Report_Type,${type},${timestamp},Generated\n` +
            `Plant_Location,Pune Central RMC Hub,${timestamp},Active\n` +
            `Compliance,IS 456 / IS 10262:2019,${timestamp},Compliant\n` +
            `Verification,System Auditor,${timestamp},Passed`,
          dataPreview: {
            generatedTime: timestamp,
            status: 'Completed successfully'
          }
        };
    }
  };

  const generateReport = useCallback(async (request: ReportGenerateRequest): Promise<GeneratedReport | null> => {
    setIsGenerating(true);

    try {
      // Simulate real report compile process
      await new Promise(r => setTimeout(r, 600));

      const config = configs.find(c => c.type === request.type);
      const generatedContent = createReportContent(request.type, request.format);
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const reportName = `${config?.name || request.type} (${dateStr})`;

      const newReport: GeneratedReport = {
        id: `rep-${Date.now().toString(36)}`,
        name: reportName,
        type: request.type,
        format: request.format,
        parameters: request.parameters || {},
        generatedAt: new Date().toISOString(),
        generatedBy: 'Operations Manager (Active User)',
        status: 'completed',
        fileSize: Math.floor(Math.random() * 250000) + 45000,
        content: generatedContent.content,
        dataPreview: generatedContent.dataPreview,
      };

      setGeneratedReports(prev => [newReport, ...prev]);

      // Emit cross-module audit trail event
      try {
        window.dispatchEvent(new CustomEvent('rmc-audit-event', {
          detail: {
            action: 'REPORT_GENERATED',
            module: 'Reports & Exports',
            description: `Generated ${reportName} in ${request.format.toUpperCase()} format`,
            user: 'Operations Manager',
            timestamp: new Date().toISOString(),
          }
        }));
      } catch (e) {
        console.error('Audit event error:', e);
      }

      toast({
        title: 'Report Generated Successfully',
        description: `${reportName} is ready for download in ${request.format.toUpperCase()} format.`,
      });

      return newReport;
    } catch (error: any) {
      toast({
        title: 'Report Generation Failed',
        description: error.message || 'An error occurred during report compiling.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [configs, toast]);

  const downloadReport = useCallback((report: GeneratedReport) => {
    try {
      const fileContent = report.content || 
        `Report: ${report.name}\nType: ${report.type}\nGenerated: ${report.generatedAt}\nGenerated By: ${report.generatedBy}\nStatus: ${report.status}\nFormat: ${report.format}`;
      
      let mimeType = 'text/csv;charset=utf-8;';
      let fileExt = 'csv';

      if (report.format === 'excel') {
        mimeType = 'application/vnd.ms-excel;charset=utf-8;';
        fileExt = 'csv';
      } else if (report.format === 'pdf') {
        mimeType = 'text/plain;charset=utf-8;';
        fileExt = 'txt';
      }

      const blob = new Blob([fileContent], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = report.name.replace(/[^a-zA-Z0-9_\-]/g, '_');
      link.download = `${safeName}.${fileExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Download Started',
        description: `Exported ${report.name} as .${fileExt}`,
      });
    } catch (error: any) {
      toast({
        title: 'Download Failed',
        description: error.message || 'Unable to download report file.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const scheduleReport = useCallback(async (request: ScheduleReportRequest) => {
    try {
      const now = new Date();
      let nextRun: Date;

      switch (request.frequency) {
        case 'daily':
          nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
          break;
        case 'weekly':
          nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          nextRun = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
          break;
        case 'quarterly':
          nextRun = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
          break;
        default:
          nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      }

      const newSchedule: ScheduledReport = {
        id: `sched-${Date.now().toString(36)}`,
        name: request.name,
        type: request.type,
        format: request.format,
        frequency: request.frequency,
        parameters: request.parameters || {},
        recipients: request.recipients,
        isActive: true,
        nextRun: nextRun.toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setScheduledReports(prev => [newSchedule, ...prev]);

      try {
        window.dispatchEvent(new CustomEvent('rmc-audit-event', {
          detail: {
            action: 'REPORT_SCHEDULED',
            module: 'Reports & Exports',
            description: `Scheduled report '${request.name}' with ${request.frequency} frequency`,
            user: 'Operations Manager',
            timestamp: new Date().toISOString(),
          }
        }));
      } catch (e) {
        console.error('Audit event error:', e);
      }

      toast({
        title: 'Schedule Created',
        description: `Automated ${request.frequency} report '${request.name}' scheduled for ${request.recipients.length} recipients.`,
      });

      return newSchedule;
    } catch (error: any) {
      toast({
        title: 'Schedule Failed',
        description: error.message || 'Unable to create automated schedule.',
        variant: 'destructive',
      });
      return null;
    }
  }, [toast]);

  const toggleScheduleActive = useCallback((id: string) => {
    setScheduledReports(prev => prev.map(s => {
      if (s.id === id) {
        const nextState = !s.isActive;
        toast({
          title: nextState ? 'Schedule Resumed' : 'Schedule Paused',
          description: `'${s.name}' is now ${nextState ? 'active' : 'paused'}.`,
        });
        return { ...s, isActive: nextState, updatedAt: new Date().toISOString() };
      }
      return s;
    }));
  }, [toast]);

  const deleteSchedule = useCallback((id: string) => {
    setScheduledReports(prev => {
      const schedule = prev.find(s => s.id === id);
      toast({
        title: 'Schedule Removed',
        description: schedule ? `Removed automated schedule for '${schedule.name}'.` : 'Schedule deleted.',
      });
      return prev.filter(s => s.id !== id);
    });
  }, [toast]);

  const runScheduledNow = useCallback(async (id: string) => {
    const schedule = scheduledReports.find(s => s.id === id);
    if (!schedule) return;

    await generateReport({
      type: schedule.type,
      format: schedule.format,
      parameters: schedule.parameters,
    });
  }, [scheduledReports, generateReport]);

  const deleteGeneratedReport = useCallback((id: string) => {
    setGeneratedReports(prev => {
      const report = prev.find(r => r.id === id);
      toast({
        title: 'Report Deleted',
        description: report ? `Deleted '${report.name}' from generated history.` : 'Report deleted.',
      });
      return prev.filter(r => r.id !== id);
    });
  }, [toast]);

  const getReportsByType = useCallback((type: ReportConfig['type']) => {
    return generatedReports.filter(r => r.type === type);
  }, [generatedReports]);

  const generateTripSummaryData = useCallback((): TripSummaryData => {
    return {
      period: 'January 2025',
      totalTrips: 156,
      completedTrips: 142,
      cancelledTrips: 8,
      totalDistance: 12450,
      avgDeliveryTime: 95,
      onTimeRate: 91.2,
      topDrivers: [
        { name: 'Rajesh Kumar', trips: 45, rating: 4.8 },
        { name: 'Suresh Patil', trips: 38, rating: 4.6 },
        { name: 'Amit Sharma', trips: 32, rating: 4.7 },
      ],
      topVehicles: [
        { regNo: 'MH-12-AB-1234', trips: 52, distance: 4200 },
        { regNo: 'MH-12-CD-5678', trips: 48, distance: 3850 },
        { regNo: 'MH-12-EF-9012', trips: 44, distance: 3600 },
      ],
    };
  }, []);

  const generateFuelConsumptionData = useCallback((): FuelConsumptionData => {
    return {
      period: 'January 2025',
      totalFuel: 4580,
      totalCost: 410850,
      avgCostPerLiter: 89.70,
      avgKmPerLiter: 4.2,
      byVehicle: [
        { regNo: 'MH-12-AB-1234', fuel: 1650, cost: 147675, efficiency: 4.5 },
        { regNo: 'MH-12-CD-5678', fuel: 1480, cost: 132760, efficiency: 4.1 },
        { regNo: 'MH-12-EF-9012', fuel: 1450, cost: 130415, efficiency: 3.9 },
      ],
      trend: [
        { date: '2025-01-01', quantity: 180, cost: 16110 },
        { date: '2025-01-05', quantity: 220, cost: 19800 },
        { date: '2025-01-10', quantity: 195, cost: 17550 },
        { date: '2025-01-15', quantity: 210, cost: 18900 },
      ],
    };
  }, []);

  return {
    configs,
    generatedReports,
    scheduledReports,
    selectedConfig,
    setSelectedConfig,
    isGenerating,
    stats: getStats(),
    generateReport,
    downloadReport,
    scheduleReport,
    toggleScheduleActive,
    deleteSchedule,
    runScheduledNow,
    deleteGeneratedReport,
    getReportsByType,
    generateTripSummaryData,
    generateFuelConsumptionData,
    refetch: () => {},
  };
}
