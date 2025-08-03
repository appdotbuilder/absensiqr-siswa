
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { Student, CreateStudentInput, UpdateStudentInput } from '../../../server/src/schema';
import { Plus, Edit, Trash2, Search, Upload, QrCode, Users } from 'lucide-react';

export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<CreateStudentInput>({
    nisn: '',
    name: '',
    class: '',
    user_id: null
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadStudents = useCallback(async () => {
    try {
      const result = await trpc.getStudents.query();
      setStudents(result);
    } catch (error) {
      console.error('Failed to load students:', error);
      setError('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.nisn.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.class.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      nisn: '',
      name: '',
      class: '',
      user_id: null
    });
    setEditingStudent(null);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (editingStudent) {
        const updateData: UpdateStudentInput = {
          id: editingStudent.id,
          ...formData
        };
        const updatedStudent = await trpc.updateStudent.mutate(updateData);
        setStudents((prev: Student[]) => 
          prev.map(s => s.id === editingStudent.id ? updatedStudent : s)
        );
        setSuccess('Student updated successfully!');
      } else {
        const newStudent = await trpc.createStudent.mutate(formData);
        setStudents((prev: Student[]) => [...prev, newStudent]);
        setSuccess('Student created successfully!');
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save student:', error);
      setError('Failed to save student. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      nisn: student.nisn,
      name: student.name,
      class: student.class,
      user_id: student.user_id
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
      await trpc.deleteStudent.mutate(id);
      setStudents((prev: Student[]) => prev.filter(s => s.id !== id));
      setSuccess('Student deleted successfully!');
    } catch (error) {
      console.error('Failed to delete student:', error);
      setError('Failed to delete student. Please try again.');
    }
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (isLoading && students.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-white/20 rounded w-1/3"></div>
              <div className="h-4 bg-white/20 rounded w-2/3"></div>
              <div className="h-64 bg-white/20 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Student Management
          
          </CardTitle>
          <CardDescription className="text-white/80">
            Manage student information and generate QR codes
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

      {/* Actions */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/10 border-white/30 text-white placeholder:text-white/60"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white hover:bg-white/20"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={handleOpenDialog}
                    className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>
                      {editingStudent ? 'Edit Student' : 'Add New Student'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-300">
                      {editingStudent ? 'Update student information' : 'Create a new student record'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nisn">NISN</Label>
                      <Input
                        id="nisn"
                        value={formData.nisn}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateStudentInput) => ({ ...prev, nisn: e.target.value }))
                        }
                        placeholder="Enter NISN"
                        required
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateStudentInput) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Enter full name"
                        required
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="class">Class</Label>
                      <Input
                        id="class"
                        value={formData.class}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateStudentInput) => ({ ...prev, class: e.target.value }))
                        }
                        placeholder="e.g., 7A, 8B, 9C"
                        required
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        className="border-slate-600 text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? 'Saving...' : (editingStudent ? 'Update' : 'Create')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">
            Students ({filteredStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 text-lg mb-2">No students found</p>
              <p className="text-white/40">
                {searchTerm ? 'Try adjusting your search' : 'Add your first student to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white/80">NISN</TableHead>
                    <TableHead className="text-white/80">Name</TableHead>
                    <TableHead className="text-white/80">Class</TableHead>
                    <TableHead className="text-white/80">Status</TableHead>
                    <TableHead className="text-white/80">QR Code</TableHead>
                    <TableHead className="text-white/80">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student: Student) => (
                    <TableRow key={student.id} className="border-white/10">
                      <TableCell className="text-white font-mono">{student.nisn}</TableCell>
                      <TableCell className="text-white font-medium">{student.name}</TableCell>
                      <TableCell className="text-white">{student.class}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={student.is_active ? "default" : "secondary"}
                          className={student.is_active ? "bg-green-500/20 text-green-300 border-green-500/50" : "bg-gray-500/20 text-gray-300 border-gray-500/50"}
                        >
                          {student.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-white/60 hover:text-white hover:bg-white/10"
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(student)}
                            className="text-white/60 hover:text-white hover:bg-white/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(student.id)}
                            className="text-white/60 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
