
import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { User, AttendanceRecord, QrScanInput } from '../../../server/src/schema';
import { QrCode, Camera, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface QRScannerProps {
  currentUser: User;
}

export function QRScanner({ currentUser }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<AttendanceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleScanQR = useCallback(async (qrCode: string) => {
    try {
      setError(null);
      const scanInput: QrScanInput = {
        qr_code: qrCode,
        recorded_by: currentUser.id
      };
      
      const result = await trpc.scanQrCodeForAttendance.mutate(scanInput);
      setScanResult(result);
      setSuccess('Attendance recorded successfully!');
    } catch (error) {
      console.error('Failed to scan QR code:', error);
      setError('Failed to record attendance. Please try again.');
    }
  }, [currentUser.id]);

  const startScanning = () => {
    setIsScanning(true);
    // Simulate QR scanning delay
    setTimeout(() => {
      const sampleQRCode = 'QR_123456789';
      handleScanQR(sampleQRCode);
      setIsScanning(false);
    }, 2000);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      present: { color: 'bg-green-500/20 text-green-300 border-green-500/50', icon: CheckCircle },
      late: { color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50', icon: Clock },
      absent: { color: 'bg-red-500/20 text-red-300 border-red-500/50', icon: AlertCircle },
      permitted: { color: 'bg-blue-500/20 text-blue-300 border-blue-500/50', icon: CheckCircle },
      sick: { color: 'bg-purple-500/20 text-purple-300 border-purple-500/50', icon: AlertCircle },
      early_leave: { color: 'bg-orange-500/20 text-orange-300 border-orange-500/50', icon: Clock }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.absent;
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
            <QrCode className="h-5 w-5 mr-2" />
            QR Code Scanner
          </CardTitle>
          <CardDescription className="text-white/80">
            Scan student QR codes to record attendance automatically
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert className="bg-red-500/20 border-red-500/50 text-white">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-500/20 border-green-500/50 text-white">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Scanner Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera/Scanner Area */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Camera Scanner</CardTitle>
            <CardDescription className="text-white/80">
              Position the QR code in front of the camera
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera view */}
            <div className="aspect-video bg-black/30 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center relative overflow-hidden">
              {isScanning ? (
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white">Scanning QR Code...</p>
                </div>
              ) : (
                <div className="text-center">
                  <Camera className="h-16 w-16 text-white/40 mx-auto mb-4" />
                  <p className="text-white/60">Camera will appear here</p>
                  <p className="text-white/40 text-sm mt-2">Click "Start Scanner" below</p>
                </div>
              )}
              
              {/* Scanning overlay */}
              {isScanning && (
                <div className="absolute inset-0 border-2 border-blue-400 rounded-lg">
                  <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-blue-400"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-blue-400"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-blue-400"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-blue-400"></div>
                </div>
              )}
            </div>
            
            <Button
              onClick={startScanning}
              disabled={isScanning}
              className="w-full bg-white/20 hover:bg-white/30 text-white border border-white/30"
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  Scanning...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Scanner
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Scan Results */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Scan Results</CardTitle>
            <CardDescription className="text-white/80">
              Latest attendance record
            </CardDescription>
          </CardHeader>
          <CardContent>
            {scanResult ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-medium">Attendance Recorded</h3>
                    {getStatusBadge(scanResult.status)}
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/60">Student ID:</span>
                      <span className="text-white">{scanResult.student_id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Date:</span>
                      <span className="text-white">
                        {scanResult.date.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/60">Check-in Time:</span>
                      <span className="text-white">
                        {scanResult.check_in_time 
                          ? scanResult.check_in_time.toLocaleTimeString()
                          : 'Not recorded'
                        }
                      </span>
                    </div>
                    {scanResult.notes && (
                      <div className="flex justify-between">
                        <span className="text-white/60">Notes:</span>
                        <span className="text-white text-right">{scanResult.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <Button
                  onClick={() => {
                    setScanResult(null);
                    setSuccess(null);
                  }}
                  variant="outline"
                  className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  Scan Next Student
                </Button>
              </div>
            ) : (
              <div className="text-center py-12">
                <QrCode className="h-12 w-12 text-white/40 mx-auto mb-4" />
                <p className="text-white/60">No scans yet</p>
                <p className="text-white/40 text-sm">Scan a student QR code to see results here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-300 font-bold">1</span>
              </div>
              <h3 className="text-white font-medium mb-2">Start Scanner</h3>
              <p className="text-white/60 text-sm">Click "Start Scanner" to activate the camera</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-300 font-bold">2</span>
              </div>
              <h3 className="text-white font-medium mb-2">Position QR Code</h3>
              <p className="text-white/60 text-sm">Hold the student's QR code in front of the camera</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-300 font-bold">3</span>
              </div>
              <h3 className="text-white font-medium mb-2">Automatic Recording</h3>
              <p className="text-white/60 text-sm">Attendance will be recorded automatically</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
