
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { User, AuthResponse } from '../../server/src/schema';
import { LoginForm } from '@/components/LoginForm';
import { Dashboard } from '@/components/Dashboard';
import { StudentManagement } from '@/components/StudentManagement';
import { TeacherManagement } from '@/components/TeacherManagement';
import { AttendanceRecords } from '@/components/AttendanceRecords';
import { QRScanner } from '@/components/QRScanner';
import { ClassScheduleManagement } from '@/components/ClassScheduleManagement';
import { Reports } from '@/components/Reports';
import { GenerateStudentQR } from '@/components/GenerateStudentQR';
import { 
  LogOut, 
  Users, 
  UserCheck, 
  Calendar, 
  QrCode, 
  GraduationCap, 
  Settings,
  FileText,
  Menu,
  X
} from 'lucide-react';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = useCallback(async (response: AuthResponse) => {
    setCurrentUser(response.user);
    localStorage.setItem('auth_token', response.token);
    setActiveTab('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem('auth_token');
    setActiveTab('dashboard');
  }, []);

  // Check for stored auth on app load
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      // In a real app, validate token with server
      // For now, we'll skip auto-login due to placeholder implementation
    }
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}></div>
        <LoginForm onLogin={handleLogin} />
      </div>
    );
  }

  const navigationItems = [
    { id: 'dashboard', label: '📊 Dashboard', icon: Calendar, roles: ['admin', 'teacher', 'student'] },
    { id: 'qr-scanner', label: '📱 Scan QR', icon: QrCode, roles: ['admin', 'teacher'] },
    { id: 'attendance', label: '📋 Attendance', icon: UserCheck, roles: ['admin', 'teacher'] },
    { id: 'generate-qr', label: '🎯 Generate QR Siswa', icon: QrCode, roles: ['admin', 'teacher'] },
    { id: 'students', label: '👥 Students', icon: Users, roles: ['admin'] },
    { id: 'teachers', label: '🎓 Teachers', icon: GraduationCap, roles: ['admin'] },
    { id: 'schedules', label: '⏰ Schedules', icon: Settings, roles: ['admin'] },
    { id: 'reports', label: '📊 Reports', icon: FileText, roles: ['admin', 'teacher'] },
  ];

  const filteredNavItems = navigationItems.filter(item => 
    item.roles.includes(currentUser.role)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
      }}></div>
      
      {/* Header */}
      <header className="relative z-10 bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-white">
                🎓 AbsensiQR Siswa
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                SMP IT Adifathi
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 text-white">
                <span className="text-sm opacity-80">Welcome,</span>
                <span className="font-medium">{currentUser.full_name}</span>
                <Badge variant="outline" className="border-white/30 text-white">
                  {currentUser.role.toUpperCase()}
                </Badge>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-white/20 hidden md:flex"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
              
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                className="text-white hover:bg-white/20 md:hidden"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="relative z-20 md:hidden bg-white/10 backdrop-blur-md border-b border-white/20">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-col space-y-2">
              <div className="text-white mb-4">
                <div className="font-medium">{currentUser.full_name}</div>
                <Badge variant="outline" className="border-white/30 text-white mt-1">
                  {currentUser.role.toUpperCase()}
                </Badge>
              </div>
              
              {filteredNavItems.map((item) => (
                <Button
                  key={item.id}
                  variant={activeTab === item.id ? "secondary" : "ghost"}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className="justify-start text-white hover:bg-white/20"
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              ))}
              
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="justify-start text-white hover:bg-white/20 mt-4 border-t border-white/20 pt-4"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 space-y-2">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {filteredNavItems.map((item) => (
                    <Button
                      key={item.id}
                      variant={activeTab === item.id ? "secondary" : "ghost"}
                      onClick={() => setActiveTab(item.id)}
                      className="w-full justify-start text-white hover:bg-white/20"
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.label}
                    </Button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>
          
          {/* Content Area */}
          <div className="flex-1">
            <div className="space-y-6">
              {activeTab === 'dashboard' && <Dashboard currentUser={currentUser} />}
              {activeTab === 'qr-scanner' && <QRScanner currentUser={currentUser} />}
              {activeTab === 'attendance' && <AttendanceRecords currentUser={currentUser} />}
              {activeTab === 'generate-qr' && <GenerateStudentQR />}
              {activeTab === 'students' && <StudentManagement />}
              {activeTab === 'teachers' && <TeacherManagement />}
              {activeTab === 'schedules' && <ClassScheduleManagement />}
              {activeTab === 'reports' && <Reports currentUser={currentUser} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
