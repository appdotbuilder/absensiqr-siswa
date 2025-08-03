
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, DashboardStats } from '../../../server/src/schema';
import { Users, UserCheck, Clock, AlertTriangle, TrendingUp, Calendar } from 'lucide-react';

interface DashboardProps {
  currentUser: User;
}

export function Dashboard({ currentUser }: DashboardProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      const result = await trpc.getDashboardStats.query();
      setStats(result);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const today = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-white/20 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-white/20 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Welcome back, {currentUser.full_name}! 👋
          </CardTitle>
          <CardDescription className="text-white/80">
            Today is {today}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Total Students</p>
                <p className="text-3xl font-bold text-white">
                  {stats?.total_students || 0}
                </p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-full">
                <Users className="h-6 w-6 text-blue-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Present Today</p>
                <p className="text-3xl font-bold text-green-300">
                  {stats?.present_today || 0}
                </p>
              </div>
              <div className="bg-green-500/20 p-3 rounded-full">
                <UserCheck className="h-6 w-6 text-green-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Late Today</p>
                <p className="text-3xl font-bold text-yellow-300">
                  {stats?.late_today || 0}
                </p>
              </div>
              <div className="bg-yellow-500/20 p-3 rounded-full">
                <Clock className="h-6 w-6 text-yellow-300" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm font-medium">Permitted/Sick</p>
                <p className="text-3xl font-bold text-purple-300">
                  {stats?.permitted_sick_today || 0}
                </p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-full">
                <AlertTriangle className="h-6 w-6 text-purple-300" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Attendance Overview
            </CardTitle>
            <CardDescription className="text-white/80">
              Overall attendance distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.attendance_ratio && Object.entries(stats.attendance_ratio).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="outline" 
                      className={`border-white/30 text-white ${
                        status === 'present' ? 'bg-green-500/20' :
                        status === 'late' ? 'bg-yellow-500/20' :
                        status === 'absent' ? 'bg-red-500/20' :
                        'bg-purple-500/20'
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Badge>
                  </div>
                  <span className="text-white font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Quick Actions</CardTitle>
            <CardDescription className="text-white/80">
              Common tasks for today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentUser.role === 'admin' && (
                <>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium">📝 Manual Attendance</h4>
                    <p className="text-white/60 text-sm">Record attendance manually</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                    <h4 className="text-white font-medium">👥 Manage Students</h4>
                    <p className="text-white/60 text-sm">Add or update student information</p>
                  </div>
                </>
              )}
              {(currentUser.role === 'admin' || currentUser.role === 'teacher') && (
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <h4 className="text-white font-medium">📱 QR Scanner</h4>
                  <p className="text-white/60 text-sm">Scan student QR codes for attendance</p>
                </div>
              )}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <h4 className="text-white font-medium">📊 View Reports</h4>
                <p className="text-white/60 text-sm">Generate attendance reports</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
