
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, AttendanceRecord, AttendanceFilters, AttendanceStatus } from '../../../server/src/schema';
import { Search, CalendarIcon, Download, UserCheck, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AttendanceRecordsProps {
  currentUser: User;
}

export function AttendanceRecords({ currentUser }: AttendanceRecordsProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AttendanceFilters>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [error, setError] = useState<string | null>(null);

  // Use currentUser to conditionally show admin features
  const isAdmin = currentUser.role === 'admin';

  const loadRecords = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const searchFilters: AttendanceFilters = {
        ...filters,
        date_from: dateFrom,
        date_to: dateTo,
        student_name: searchTerm || undefined
      };

      const result = await trpc.getAttendanceRecords.query(searchFilters);
      setRecords(result);
    } catch (error) {
      console.error('Failed to load attendance records:', error);
      setError('Failed to load attendance records');
    } finally {
      setIsLoading(false);
    }
  }, [filters, dateFrom, dateTo, searchTerm]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleFilterChange = (key: keyof AttendanceFilters, value: string | undefined) => {
    setFilters((prev: AttendanceFilters) => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    const statusConfig = {
      present: { color: 'bg-green-500/20 text-green-300 border-green-500/50', icon: CheckCircle },
      late: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50', icon: Clock },
      absent: { color: 'bg-red-500/20 text-red-300 border-red-500/50', icon: AlertCircle },
      permitted: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/50', icon: CheckCircle },
      sick: { color: 'bg-purple-500/20 text-purple-300 border-purple-500/50', icon: AlertCircle },
      early_leave: { color: 'bg-orange-500/20 text-orange-300 border-orange-500/50', icon: Clock }
    };

    const config = statusConfig[status] || statusConfig.absent;
    const IconComponent = config.icon;

    return (
      <Badge variant="outline" className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <UserCheck className="h-5 w-5 mr-2" />
            Attendance Records
          </CardTitle>
          <CardDescription className="text-white/80">
            View and manage student attendance records
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert className="bg-red-500/20 border-red-500/50 text-white">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search and Status Filter Row */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
                  <Input
                    placeholder="Search by student name..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/60"
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Select value={filters.status || 'all'} onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value)}>
                  <SelectTrigger className="w-48 bg-white/10 border-white/30 text-white">
                    <SelectValue placeholder="Filter by status" />
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

                <Input
                  placeholder="Filter by class"
                  value={filters.class || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleFilterChange('class', e.target.value)
                  }
                  className="w-32 bg-white/10 border-white/30 text-white placeholder:text-white/60"
                />
              </div>
            </div>

            {/* Date Range Row */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-white/80 text-sm whitespace-nowrap">Date range:</span>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-48 justify-start text-left font-normal bg-white/10 border-white/30 text-white hover:bg-white/20"
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
                      className="w-48 justify-start text-left font-normal bg-white/10 border-white/30 text-white hover:bg-white/20"
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

              <div className="flex gap-2">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  Clear Filters
                </Button>
                
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records Table */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">
            Attendance Records ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-12 bg-white/10 rounded"></div>
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12">
              <UserCheck className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 text-lg mb-2">No attendance records found</p>
              <p className="text-white/40">
                {Object.keys(filters).length > 0 || searchTerm || dateFrom || dateTo
                  ? 'Try adjusting your filters'
                  : 'No attendance has been recorded yet'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white/80">Date</TableHead>
                    <TableHead className="text-white/80">Student ID</TableHead>
                    <TableHead className="text-white/80">Status</TableHead>
                    <TableHead className="text-white/80">Check In</TableHead>
                    <TableHead className="text-white/80">Check Out</TableHead>
                    <TableHead className="text-white/80">Notes</TableHead>
                    <TableHead className="text-white/80">Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record: AttendanceRecord) => (
                    <TableRow key={record.id} className="border-white/10">
                      <TableCell className="text-white">
                        {record.date.toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-white font-mono">
                        {record.student_id}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(record.status)}
                      </TableCell>
                      <TableCell className="text-white">
                        {record.check_in_time 
                          ? record.check_in_time.toLocaleTimeString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-white">
                        {record.check_out_time 
                          ? record.check_out_time.toLocaleTimeString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-white">
                        {record.notes || '-'}
                      </TableCell>
                      <TableCell className="text-white">
                        User #{record.recorded_by}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
