import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReports } from "@/hooks/useReports";
import { 
  FileText, 
  Calendar, 
  Download, 
  Play, 
  Clock, 
  Plus, 
  Trash2, 
  Eye, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Truck,
  Fuel,
  Package,
  CreditCard,
  Scale,
  ShieldAlert,
  Loader2,
  Send
} from "lucide-react";
import { format } from "date-fns";
import { GeneratedReport, ReportConfig, ReportFormat, ReportFrequency, ReportType } from "@/types/reports";

export default function Reports() {
  const { 
    configs, 
    generatedReports, 
    scheduledReports, 
    stats, 
    isGenerating, 
    generateReport, 
    downloadReport,
    deleteGeneratedReport,
    scheduleReport,
    toggleScheduleActive,
    deleteSchedule,
    runScheduledNow
  } = useReports();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [historyFormatFilter, setHistoryFormatFilter] = useState<string>("all");
  const [selectedFormatMap, setSelectedFormatMap] = useState<Record<string, ReportFormat>>({});

  // Preview Dialog State
  const [previewReport, setPreviewReport] = useState<GeneratedReport | null>(null);

  // New Schedule Dialog State
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleType, setScheduleType] = useState<ReportType>("trip_summary");
  const [scheduleFormat, setScheduleFormat] = useState<ReportFormat>("csv");
  const [scheduleFrequency, setScheduleFrequency] = useState<ReportFrequency>("daily");
  const [scheduleRecipients, setScheduleRecipients] = useState("plant.manager@rmc-plant.com, dispatch@rmc-plant.com");

  // Format selection per config
  const handleFormatChange = (configId: string, formatVal: ReportFormat) => {
    setSelectedFormatMap(prev => ({ ...prev, [configId]: formatVal }));
  };

  const handleGenerate = async (config: ReportConfig) => {
    const targetFormat = selectedFormatMap[config.id] || config.availableFormats[0] || 'csv';
    await generateReport({
      type: config.type,
      format: targetFormat,
      parameters: {
        dateRange: 'Current Month',
        generatedTimestamp: new Date().toISOString()
      }
    });
  };

  const handleCreateSchedule = async () => {
    if (!scheduleName.trim()) return;

    const emails = scheduleRecipients
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    await scheduleReport({
      name: scheduleName.trim(),
      type: scheduleType,
      format: scheduleFormat,
      frequency: scheduleFrequency,
      parameters: {},
      recipients: emails.length > 0 ? emails : ['admin@rmc-plant.com'],
    });

    setIsScheduleDialogOpen(false);
    setScheduleName("");
  };

  const getReportIcon = (type: ReportType) => {
    switch (type) {
      case 'trip_summary':
      case 'vehicle_performance':
      case 'driver_performance':
        return <Truck className="h-5 w-5 text-blue-500" />;
      case 'fuel_consumption':
        return <Fuel className="h-5 w-5 text-amber-500" />;
      case 'inventory_status':
        return <Package className="h-5 w-5 text-emerald-500" />;
      case 'billing_summary':
      case 'customer_statement':
        return <CreditCard className="h-5 w-5 text-purple-500" />;
      case 'weighbridge_log':
        return <Scale className="h-5 w-5 text-cyan-500" />;
      case 'incident_log':
        return <ShieldAlert className="h-5 w-5 text-rose-500" />;
      default:
        return <FileText className="h-5 w-5 text-primary" />;
    }
  };

  // Filtered lists
  const filteredConfigs = configs.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredHistory = generatedReports.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.generatedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFormat = historyFormatFilter === 'all' || r.format === historyFormatFilter;
    return matchesSearch && matchesFormat;
  });

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Reports & Exports
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate concrete batching summaries, fleet telematics, silo audits, and schedule automated exports
          </p>
        </div>
        <Button onClick={() => setIsScheduleDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Schedule Report
        </Button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Generated Reports</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-muted-foreground mt-1">Available in download archive</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Generated Today</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.generatedToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Freshly compiled exports</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Automated Schedules</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.scheduledReports}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.activeSchedules} active triggers</p>
          </CardContent>
        </Card>

        <Card className="border border-border/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Templates Ready</CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{configs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready-Mix operational templates</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="generate" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <TabsList className="grid grid-cols-3 w-full sm:w-[420px]">
            <TabsTrigger value="generate">Generate Report</TabsTrigger>
            <TabsTrigger value="history">Report History ({generatedReports.length})</TabsTrigger>
            <TabsTrigger value="scheduled">Schedules ({scheduledReports.length})</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports or metrics..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        {/* TAB 1: GENERATE REPORT */}
        <TabsContent value="generate" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredConfigs.map((config) => {
              const currentFormat = selectedFormatMap[config.id] || config.availableFormats[0] || 'csv';
              return (
                <Card key={config.id} className="flex flex-col justify-between hover:shadow-lg transition-all duration-200 border-border/80">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="p-2 rounded-lg bg-accent/60 w-fit">
                        {getReportIcon(config.type)}
                      </div>
                      <Badge variant="secondary" className="font-mono text-xs uppercase">
                        {config.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{config.name}</CardTitle>
                    <CardDescription className="text-xs line-clamp-3 mt-1 leading-relaxed">
                      {config.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-2">
                    {/* Format Selector Pills */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Select Export Format</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {config.availableFormats.map((f) => (
                          <Button
                            key={f}
                            type="button"
                            size="sm"
                            variant={currentFormat === f ? "default" : "outline"}
                            className="h-7 text-xs px-2.5 uppercase"
                            onClick={() => handleFormatChange(config.id, f)}
                          >
                            {f}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Button 
                      className="w-full flex items-center justify-center gap-2" 
                      onClick={() => handleGenerate(config)} 
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Compiling Data...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Generate {currentFormat.toUpperCase()}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredConfigs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-base font-medium">No report templates found</p>
              <p className="text-xs mt-1">Try clearing your search query</p>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: REPORT HISTORY */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Filter Format:</span>
              {['all', 'csv', 'excel', 'pdf'].map(fmt => (
                <Button
                  key={fmt}
                  size="sm"
                  variant={historyFormatFilter === fmt ? 'default' : 'outline'}
                  className="h-7 text-xs uppercase"
                  onClick={() => setHistoryFormatFilter(fmt)}
                >
                  {fmt}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Showing {filteredHistory.length} of {generatedReports.length} reports
            </p>
          </div>

          <div className="space-y-3">
            {filteredHistory.map((report) => (
              <Card key={report.id} className="hover:bg-accent/20 transition-colors">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start md:items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-accent/60">
                      {getReportIcon(report.type)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{report.name}</p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span>{format(new Date(report.generatedAt), 'dd MMM yyyy, HH:mm')}</span>
                        <span>•</span>
                        <span>By {report.generatedBy}</span>
                        <span>•</span>
                        <span>{report.fileSize ? `${Math.round(report.fileSize / 1024)} KB` : '120 KB'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Badge variant="outline" className="uppercase font-mono text-xs">
                      {report.format}
                    </Badge>
                    <Badge variant={report.status === 'completed' ? 'default' : 'destructive'} className="text-xs">
                      {report.status}
                    </Badge>

                    {/* View Preview Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewReport(report)}
                      title="View Report Preview"
                    >
                      <Eye className="h-4 w-4 mr-1.5" />
                      Preview
                    </Button>

                    {/* Download Button */}
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => downloadReport(report)}
                      title="Download Export File"
                    >
                      <Download className="h-4 w-4 mr-1.5" />
                      Download
                    </Button>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGeneratedReport(report.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      title="Delete Report"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredHistory.length === 0 && (
              <div className="text-center py-12 border rounded-lg bg-card text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
                <p className="font-medium text-sm">No generated reports match your criteria</p>
                <p className="text-xs mt-1">Generate a report from the first tab to view and download it here.</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: SCHEDULED REPORTS */}
        <TabsContent value="scheduled" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Active Automated Schedules</h3>
              <p className="text-xs text-muted-foreground">Automated exports dispatched via email to stakeholders</p>
            </div>
            <Button size="sm" onClick={() => setIsScheduleDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Schedule
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scheduledReports.map((schedule) => (
              <Card key={schedule.id} className="border border-border/80 flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{schedule.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Frequency: <span className="font-semibold capitalize">{schedule.frequency}</span> • Format: <span className="font-mono uppercase">{schedule.format}</span>
                        </p>
                      </div>
                    </div>
                    <Badge variant={schedule.isActive ? "default" : "secondary"}>
                      {schedule.isActive ? 'Active' : 'Paused'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {/* Recipients chips */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Recipients:</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {schedule.recipients.map((rec, i) => (
                        <Badge key={i} variant="outline" className="text-[11px] font-normal py-0">
                          {rec}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-accent/40 text-xs flex items-center justify-between">
                    <span className="text-muted-foreground">Next Scheduled Run:</span>
                    <span className="font-medium text-foreground">
                      {format(new Date(schedule.nextRun), 'dd MMM yyyy, HH:mm')}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => runScheduledNow(schedule.id)}
                      title="Run immediately"
                    >
                      <Play className="h-3.5 w-3.5 mr-1" />
                      Run Now
                    </Button>
                    <Button 
                      variant={schedule.isActive ? "secondary" : "default"} 
                      size="sm" 
                      onClick={() => toggleScheduleActive(schedule.id)}
                    >
                      {schedule.isActive ? 'Pause' : 'Resume'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteSchedule(schedule.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {scheduledReports.length === 0 && (
            <div className="text-center py-12 border rounded-lg text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="font-medium text-sm">No automated schedules active</p>
              <p className="text-xs mt-1">Click "Add Schedule" above to set up automated recurring exports.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL 1: REPORT PREVIEW DIALOG */}
      <Dialog open={!!previewReport} onOpenChange={(open) => !open && setPreviewReport(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <DialogTitle>{previewReport?.name}</DialogTitle>
            </div>
            <DialogDescription>
              Format: {previewReport?.format.toUpperCase()} • Generated by {previewReport?.generatedBy}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto py-2 flex-1">
            {/* Key Preview Stats */}
            {previewReport?.dataPreview && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {Object.entries(previewReport.dataPreview).map(([key, val]) => (
                  <div key={key} className="p-2.5 rounded-lg bg-accent/60 text-center">
                    <p className="text-[11px] text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </p>
                    <p className="text-sm font-bold text-foreground mt-0.5">{String(val)}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Raw Content Table / Box */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Report Content Preview</Label>
              <div className="p-3 rounded-lg border bg-muted/40 font-mono text-xs max-h-72 overflow-x-auto overflow-y-auto whitespace-pre">
                {previewReport?.content || "No raw preview content available for this report."}
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground">
              Size: {previewReport?.fileSize ? `${Math.round(previewReport.fileSize / 1024)} KB` : '120 KB'}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setPreviewReport(null)}>
                Close
              </Button>
              {previewReport && (
                <Button onClick={() => downloadReport(previewReport)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: SCHEDULE NEW REPORT DIALOG */}
      <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <DialogTitle>Schedule Automated Report</DialogTitle>
            </div>
            <DialogDescription>
              Configure an automated recurring export and specify recipient email addresses.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="sched-name" className="text-xs">Schedule Title *</Label>
              <Input
                id="sched-name"
                placeholder="e.g. Daily Concrete Batching Log"
                value={scheduleName}
                onChange={(e) => setScheduleName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Report Type *</Label>
              <Select value={scheduleType} onValueChange={(val) => setScheduleType(val as ReportType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {configs.map(c => (
                    <SelectItem key={c.type} value={c.type}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Export Format *</Label>
                <Select value={scheduleFormat} onValueChange={(val) => setScheduleFormat(val as ReportFormat)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Frequency *</Label>
                <Select value={scheduleFrequency} onValueChange={(val) => setScheduleFrequency(val as ReportFrequency)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sched-recipients" className="text-xs">Recipients (comma separated)</Label>
              <Input
                id="sched-recipients"
                placeholder="dispatch@rmc-plant.com, manager@rmc.com"
                value={scheduleRecipients}
                onChange={(e) => setScheduleRecipients(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                Multiple email addresses separated by commas will receive the export.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchedule} disabled={!scheduleName.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Save Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
