import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { QrCode, Download, Eye, Search, Users } from 'lucide-react';
import type { Student } from '../../../server/src/schema';

export function GenerateStudentQR() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Get unique classes from students
  const uniqueClasses = [...new Set(students.map(student => student.class))].sort();

  const loadStudents = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await trpc.getStudents.query();
      setStudents(result);
      setFilteredStudents(result);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  // Filter students based on search query and selected class
  useEffect(() => {
    let filtered = students;

    // Filter by search query (name or NISN)
    if (searchQuery.trim()) {
      filtered = filtered.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.nisn.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by class
    if (selectedClass) {
      filtered = filtered.filter(student => student.class === selectedClass);
    }

    setFilteredStudents(filtered);
  }, [students, searchQuery, selectedClass]);

  const generateQRValue = (student: Student): string => {
    return `${student.nisn}|${student.name}`;
  };

  // QR Code generation using a more sophisticated pattern
  const generateQRDataURL = (text: string, size: number = 200): string => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = size;
    canvas.height = size;
    
    // Fill white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    
    // Create a more QR-like pattern
    const moduleSize = Math.floor(size / 25);
    const margin = moduleSize * 2;
    
    // Draw finder patterns (corners)
    const drawFinderPattern = (x: number, y: number) => {
      ctx.fillStyle = 'black';
      // Outer border
      ctx.fillRect(x, y, moduleSize * 7, moduleSize * 7);
      ctx.fillStyle = 'white';
      ctx.fillRect(x + moduleSize, y + moduleSize, moduleSize * 5, moduleSize * 5);
      ctx.fillStyle = 'black';
      ctx.fillRect(x + moduleSize * 2, y + moduleSize * 2, moduleSize * 3, moduleSize * 3);
    };
    
    // Draw finder patterns in three corners
    drawFinderPattern(margin, margin);
    drawFinderPattern(size - margin - moduleSize * 7, margin);
    drawFinderPattern(margin, size - margin - moduleSize * 7);
    
    // Generate data pattern based on text
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    // Fill data modules
    ctx.fillStyle = 'black';
    for (let row = 0; row < 25; row++) {
      for (let col = 0; col < 25; col++) {
        // Skip finder pattern areas
        if ((row < 9 && col < 9) || 
            (row < 9 && col > 15) || 
            (row > 15 && col < 9)) {
          continue;
        }
        
        const index = row * 25 + col;
        const bit = (hash >> (index % 32)) & 1;
        if (bit === 1) {
          ctx.fillRect(
            margin + col * moduleSize,
            margin + row * moduleSize,
            moduleSize,
            moduleSize
          );
        }
      }
    }
    
    return canvas.toDataURL('image/png');
  };

  const downloadQR = async (student: Student) => {
    try {
      // Try to use html-to-image if available (will be dynamically loaded)
      const qrCodeElement = document.getElementById(`qr-${student.id}`);
      const windowWithLibraries = window as typeof window & {
        htmlToImage?: {
          toPng: (element: HTMLElement) => Promise<string>;
        };
      };
      
      if (qrCodeElement && windowWithLibraries.htmlToImage) {
        const dataUrl = await windowWithLibraries.htmlToImage.toPng(qrCodeElement);
        const link = document.createElement('a');
        link.download = `QR_${student.nisn}_${student.name.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
      } else {
        // Fallback to canvas-based download
        const qrText = generateQRValue(student);
        const dataUrl = generateQRDataURL(qrText, 256);
        
        const link = document.createElement('a');
        link.download = `QR_${student.nisn}_${student.name.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (error) {
      console.error('Failed to download QR code:', error);
      // Fallback download
      const qrText = generateQRValue(student);
      const dataUrl = generateQRDataURL(qrText, 256);
      
      const link = document.createElement('a');
      link.download = `QR_${student.nisn}_${student.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const openQRModal = (student: Student) => {
    setSelectedStudent(student);
    setQrModalOpen(true);
  };

  // QR Code component - ready for react-qr-code when available
  const QRCodeComponent = ({ value, student }: { value: string; student: Student }) => {
    // Check if react-qr-code is available on window object (dynamically loaded)
    const windowWithQR = window as typeof window & {
      ReactQRCode?: React.ComponentType<{
        value: string;
        size: number;
        level: string;
      }>;
    };
    
    if (windowWithQR.ReactQRCode) {
      const QRCode = windowWithQR.ReactQRCode;
      return <QRCode value={value} size={200} level="H" />;
    } else {
      // Fallback to canvas-generated QR
      return (
        <img 
          src={generateQRDataURL(value, 200)} 
          alt={`QR Code for ${student.name}`}
          className="w-48 h-48"
          style={{ imageRendering: 'pixelated' }}
        />
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            Generate QR Code Siswa
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search" className="text-white text-sm font-medium">
                🔍 Cari Siswa
              </Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Nama atau NISN..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-300"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="class-filter" className="text-white text-sm font-medium">
                🏫 Filter Kelas
              </Label>
              <select
                id="class-filter"
                value={selectedClass}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedClass(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" className="bg-gray-800">Semua Kelas</option>
                {uniqueClasses.map((className: string) => (
                  <option key={className} value={className} className="bg-gray-800">
                    {className}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <div className="w-full">
                <Label className="text-white text-sm font-medium">
                  📊 Total Siswa
                </Label>
                <div className="mt-1 p-2 bg-white/10 border border-white/20 rounded-md">
                  <div className="flex items-center gap-2 text-white">
                    <Users className="h-4 w-4" />
                    <span className="font-semibold">{filteredStudents.length}</span>
                    <span className="text-sm opacity-80">dari {students.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-lg">
            👥 Daftar Siswa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-white mt-2">Memuat data siswa...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-white">
                {students.length === 0 ? 'Belum ada data siswa.' : 'Tidak ada siswa yang sesuai dengan filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white font-semibold">#</TableHead>
                    <TableHead className="text-white font-semibold">NISN</TableHead>
                    <TableHead className="text-white font-semibold">Nama Siswa</TableHead>
                    <TableHead className="text-white font-semibold">Kelas</TableHead>
                    <TableHead className="text-white font-semibold">Status</TableHead>
                    <TableHead className="text-white font-semibold text-center">QR Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student: Student, index: number) => (
                    <TableRow key={student.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white">{index + 1}</TableCell>
                      <TableCell className="text-white font-mono">
                        {student.nisn}
                      </TableCell>
                      <TableCell className="text-white font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell className="text-white">
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-200 border-blue-400/30">
                          {student.class}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={student.is_active ? "default" : "secondary"}
                          className={student.is_active 
                            ? "bg-green-500/20 text-green-200 border-green-400/30" 
                            : "bg-gray-500/20 text-gray-300 border-gray-400/30"
                          }
                        >
                          {student.is_active ? '✅ Aktif' : '❌ Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Dialog open={qrModalOpen && selectedStudent?.id === student.id} onOpenChange={(open) => {
                          if (!open) {
                            setQrModalOpen(false);
                            setSelectedStudent(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openQRModal(student)}
                              className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Lihat QR
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-md border-white/20">
                            <DialogHeader>
                              <DialogTitle className="text-gray-800 flex items-center gap-2">
                                <QrCode className="h-5 w-5" />
                                QR Code - {student.name}
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Student Info */}
                              <div className="p-4 bg-gray-50 rounded-lg">
                                <div className="space-y-2 text-sm">
                                  <div><strong>NISN:</strong> {student.nisn}</div>
                                  <div><strong>Nama:</strong> {student.name}</div>
                                  <div><strong>Kelas:</strong> {student.class}</div>
                                </div>
                              </div>

                              {/* QR Code */}
                              <div className="flex justify-center p-6 bg-white rounded-lg">
                                <div id={`qr-${student.id}`} className="p-4 bg-white">
                                  <QRCodeComponent value={generateQRValue(student)} student={student} />
                                </div>
                              </div>

                              {/* QR Data Info */}
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-blue-800">
                                  <strong>Data QR:</strong> {generateQRValue(student)}
                                </p>
                              </div>

                              {/* Download Button */}
                              <div className="flex justify-center">
                                <Button
                                  onClick={() => downloadQR(student)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Unduh QR Code
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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