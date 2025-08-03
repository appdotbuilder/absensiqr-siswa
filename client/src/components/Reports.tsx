
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, AttendanceFilters, AttendanceStatus } from '../../../server/src/schema';
import { FileText, Download, Calendar as CalendarIcon, BarChart3, PieChart } from 'lucide-react';
import { format } from 'date-fns';

interface ReportsProps {
  currentUser: User;
}

export function Reports({ currentUser }: ReportsProps) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Use currentUser to show role-specific features
  const isAdmin = currentUser.role === 'admin';

  const handleExportExcel = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const filters: AttendanceFilters = {
        date_from: dateFrom,
        date_to: dateTo,
        class: selectedClass === 'all' ? undefined : selectedClass,
        status: selectedStatus === 'all' ? undefined : (selectedStatus as AttendanceStatus)
      };

      // In a real implementation, this would return a file download
      await trpc.exportAttendanceToExcel.query(filters);
      setSuccess('Excel report generated successfully!');
    } catch (error) {
      console.error('Failed to export Excel:', error);
      setError('Failed to generate Excel report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      
      const filters: AttendanceFilters = {
        date_from: dateFrom,
        date_to: dateTo,
        class: selectedClass === 'all' ? undefined : selectedClass,
        status: selectedStatus === 'all' ? undefined : (selectedStatus as AttendanceStatus)
      };

      // In a real implementation, this would return a file download
      await trpc.exportAttendanceToPdf.query(filters);
      setSuccess('PDF report generated successfully!');
    } catch (error) {
      console.error('Failed to export PDF:', error);
      setError('Failed to generate PDF report. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedClass('all');
    setSelectedStatus('all');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Reports & Analytics
          </CardTitle>
          <CardDescription className="text-white/80">
            Generate detailed attendance reports and analytics
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert className="bg-red-500/20 border-red-500/50 text-white">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-500/20 border-green-500/50 text-white">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Report Filters */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Report Filters</CardTitle>
          <CardDescription className="text-white/80">
            Configure your report parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range */}
          <div className="space-y-4">
            <h3 className="text-white font-medium">Date Range</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-64 justify-start text-left font-normal bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'PPP') : 'From date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                    className="bg-slate-900 border-slate-700"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full sm:w-64 justify-start text-left font-normal bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'PPP') : 'To date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                    className="bg-slate-900 border-slate-700"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Additional Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-white font-medium">Class Filter</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="bg-white/10 border-white/30 text-white">
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="7A">7A</SelectItem>
                  <SelectItem value="7B">7B</SelectItem>
                  <SelectItem value="8A">8A</SelectItem>
                  <SelectItem value="8B">8B</SelectItem>
                  <SelectItem value="9A">9A</SelectItem>
                  <SelectItem value="9B">9B</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-white font-medium">Status Filter</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="bg-white/10 border-white/30 text-white">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="permitted">Permitted</SelectItem>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="early_leave">Early Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={clearFilters}
              variant="outline"
              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Excel Export
            </CardTitle>
            <CardDescription className="text-white/80">
              Export attendance data to Excel spreadsheet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-white/60 text-sm">
              <p>Includes:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Student details</li>
                <li>Attendance records</li>
                <li>Summary statistics</li>
                <li>Charts and graphs</li>
              </ul>
            </div>
            <Button
              onClick={handleExportExcel}
              disabled={isGenerating || !isAdmin}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export to Excel
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              PDF Report
            </CardTitle>
            <CardDescription className="text-white/80">
              Generate comprehensive PDF report
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-white/60 text-sm">
              <p>Includes:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Formatted attendance tables</li>
                <li>Statistical analysis</li>
                <li>Visual charts</li>
                <li>School branding</li>
              </ul>
            </div>
            <Button
              onClick={handleExportPDF}
              disabled={isGenerating || !isAdmin}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate PDF Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Quick Report Templates */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Quick Report Templates</CardTitle>
          <CardDescription className="text-white/80">
            Pre-configured reports for common use cases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-white font-medium mb-2">📅 Daily Report</h3>
              <p className="text-white/60 text-sm mb-3">Today's attendance summary</p>
              <Button
                size="sm"
                variant="outline"
                disabled={!isAdmin}
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Generate
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-white font-medium mb-2">📊 Weekly Summary</h3>
              <p className="text-white/60 text-sm mb-3">Last 7 days attendance</p>
              <Button
                size="sm"
                variant="outline"
                disabled={!isAdmin}
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Generate
              </Button>
            </div>

            <div className="p-4 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-white font-medium mb-2">📈 Monthly Analysis</h3>
              <p className="text-white/60 text-sm mb-3">Current month detailed report</p>
              <Button
                size="sm"
                variant="outline"
                disabled={!isAdmin}
                className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                Generate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
