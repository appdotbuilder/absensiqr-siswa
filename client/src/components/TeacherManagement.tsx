
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
import type { Teacher, CreateTeacherInput, UpdateTeacherInput } from '../../../server/src/schema';
import { Plus, Edit, Trash2, Search, Upload, GraduationCap } from 'lucide-react';

export function TeacherManagement() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<CreateTeacherInput>({
    teacher_id: '',
    name: '',
    homeroom_class: null,
    user_id: null
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadTeachers = useCallback(async () => {
    try {
      const result = await trpc.getTeachers.query();
      setTeachers(result);
    } catch (error) {
      console.error('Failed to load teachers:', error);
      setError('Failed to load teachers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeachers();
  }, [loadTeachers]);

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.teacher_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.homeroom_class && teacher.homeroom_class.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const resetForm = () => {
    setFormData({
      teacher_id: '',
      name: '',
      homeroom_class: null,
      user_id: null
    });
    setEditingTeacher(null);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (editingTeacher) {
        const updateData: UpdateTeacherInput = {
          id: editingTeacher.id,
          ...formData
        };
        const updatedTeacher = await trpc.updateTeacher.mutate(updateData);
        setTeachers((prev: Teacher[]) => 
          prev.map(t => t.id === editingTeacher.id ? updatedTeacher : t)
        );
        setSuccess('Teacher updated successfully!');
      } else {
        const newTeacher = await trpc.createTeacher.mutate(formData);
        setTeachers((prev: Teacher[]) => [...prev, newTeacher]);
        setSuccess('Teacher created successfully!');
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save teacher:', error);
      setError('Failed to save teacher. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      teacher_id: teacher.teacher_id,
      name: teacher.name,
      homeroom_class: teacher.homeroom_class,
      user_id: teacher.user_id
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this teacher?')) return;
    
    try {
      await trpc.deleteTeacher.mutate(id);
      setTeachers((prev: Teacher[]) => prev.filter(t => t.id !== id));
      setSuccess('Teacher deleted successfully!');
    } catch (error) {
      console.error('Failed to delete teacher:', error);
      setError('Failed to delete teacher. Please try again.');
    }
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (isLoading && teachers.length === 0) {
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
            <GraduationCap className="h-5 w-5 mr-2" />
            Teacher Management
          </CardTitle>
          <CardDescription className="text-white/80">
            Manage teacher information and homeroom assignments
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
                  placeholder="Search teachers..."
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
                    Add Teacher
                  </Button>
                </DialogTrigger>
                
                <DialogContent className="bg-slate-900 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>
                      {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
                    </DialogTitle>
                    <DialogDescription className="text-slate-300">
                      {editingTeacher ? 'Update teacher information' : 'Create a new teacher record'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="teacher_id">Teacher ID</Label>
                      <Input
                        id="teacher_id"
                        value={formData.teacher_id}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateTeacherInput) => ({ ...prev, teacher_id: e.target.value }))
                        }
                        placeholder="Enter teacher ID"
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
                          setFormData((prev: CreateTeacherInput) => ({ ...prev, name: e.target.value }))
                        }
                        placeholder="Enter full name"
                        required
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="homeroom_class">Homeroom Class (Optional)</Label>
                      <Input
                        id="homeroom_class"
                        value={formData.homeroom_class || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateTeacherInput) => ({ 
                            ...prev, 
                            homeroom_class: e.target.value || null 
                          }))
                        }
                        placeholder="e.g., 7A, 8B, 9C"
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
                        {isLoading ? 'Saving...' : (editingTeacher ? 'Update' : 'Create')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Table */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">
            Teachers ({filteredTeachers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTeachers.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 text-lg mb-2">No teachers found</p>
              <p className="text-white/40">
                {searchTerm ? 'Try adjusting your search' : 'Add your first teacher to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white/80">Teacher ID</TableHead>
                    <TableHead className="text-white/80">Name</TableHead>
                    <TableHead className="text-white/80">Homeroom Class</TableHead>
                    <TableHead className="text-white/80">Status</TableHead>
                    <TableHead className="text-white/80">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher: Teacher) => (
                    <TableRow key={teacher.id} className="border-white/10">
                      <TableCell className="text-white font-mono">{teacher.teacher_id}</TableCell>
                      <TableCell className="text-white font-medium">{teacher.name}</TableCell>
                      <TableCell className="text-white">
                        {teacher.homeroom_class ? (
                          <Badge variant="outline" className="border-blue-500/50 text-blue-300 bg-blue-500/20">
                            {teacher.homeroom_class}
                          </Badge>
                        ) : (
                          <span className="text-white/40">No homeroom</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={teacher.is_active ? "default" : "secondary"}
                          className={teacher.is_active ? "bg-green-500/20 text-green-300 border-green-500/50" : "bg-gray-500/20 text-gray-300 border-gray-500/50"}
                        >
                          {teacher.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(teacher)}
                            className="text-white/60 hover:text-white hover:bg-white/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(teacher.id)}
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
