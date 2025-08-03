
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
import type { ClassSchedule, CreateClassScheduleInput, UpdateClassScheduleInput } from '../../../server/src/schema';
import { Plus, Edit, Trash2, Clock, Settings } from 'lucide-react';

export function ClassScheduleManagement() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ClassSchedule | null>(null);
  const [formData, setFormData] = useState<CreateClassScheduleInput>({
    class_name: '',
    check_in_time: '',
    late_tolerance_minutes: 15,
    min_checkout_time: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSchedules = useCallback(async () => {
    try {
      const result = await trpc.getClassSchedules.query();
      setSchedules(result);
    } catch (error) {
      console.error('Failed to load class schedules:', error);
      setError('Failed to load class schedules');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const resetForm = () => {
    setFormData({
      class_name: '',
      check_in_time: '',
      late_tolerance_minutes: 15,
      min_checkout_time: ''
    });
    setEditingSchedule(null);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (editingSchedule) {
        const updateData: UpdateClassScheduleInput = {
          id: editingSchedule.id,
          ...formData
        };
        const updatedSchedule = await trpc.updateClassSchedule.mutate(updateData);
        setSchedules((prev: ClassSchedule[]) => 
          prev.map(s => s.id === editingSchedule.id ? updatedSchedule : s)
        );
        setSuccess('Class schedule updated successfully!');
      } else {
        const newSchedule = await trpc.createClassSchedule.mutate(formData);
        setSchedules((prev: ClassSchedule[]) => [...prev, newSchedule]);
        setSuccess('Class schedule created successfully!');
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save class schedule:', error);
      setError('Failed to save class schedule. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (schedule: ClassSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      class_name: schedule.class_name,
      check_in_time: schedule.check_in_time,
      late_tolerance_minutes: schedule.late_tolerance_minutes,
      min_checkout_time: schedule.min_checkout_time
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this class schedule?')) return;
    
    try {
      await trpc.deleteClassSchedule.mutate(id);
      setSchedules((prev: ClassSchedule[]) => prev.filter(s => s.id !== id));
      setSuccess('Class schedule deleted successfully!');
    } catch (error) {
      console.error('Failed to delete class schedule:', error);
      setError('Failed to delete class schedule. Please try again.');
    }
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (isLoading && schedules.length === 0) {
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
            <Settings className="h-5 w-5 mr-2" />
            Class Schedule Management
          </CardTitle>
          <CardDescription className="text-white/80">
            Configure attendance schedules for each class
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
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={handleOpenDialog}
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Schedule
                </Button>
              </DialogTrigger>
              
              <DialogContent className="bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>
                    {editingSchedule ? 'Edit Class Schedule' : 'Add New Class Schedule'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-300">
                    {editingSchedule ? 'Update class schedule settings' : 'Create a new class schedule configuration'}
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="class_name">Class Name</Label>
                    <Input
                      id="class_name"
                      value={formData.class_name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateClassScheduleInput) => ({ ...prev, class_name: e.target.value }))
                      }
                      placeholder="e.g., 7A, 8B, 9C"
                      required
                      className="bg-slate-800 border-slate-600"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="check_in_time">Check-in Time</Label>
                      <Input
                        id="check_in_time"
                        type="time"
                        value={formData.check_in_time}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateClassScheduleInput) => ({ ...prev, check_in_time: e.target.value }))
                        }
                        required
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="min_checkout_time">Min Check-out Time</Label>
                      <Input
                        id="min_checkout_time"
                        type="time"
                        value={formData.min_checkout_time}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setFormData((prev: CreateClassScheduleInput) => ({ ...prev, min_checkout_time: e.target.value }))
                        }
                        required
                        className="bg-slate-800 border-slate-600"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="late_tolerance_minutes">Late Tolerance (minutes)</Label>
                    <Input
                      id="late_tolerance_minutes"
                      type="number"
                      min="0"
                      max="60"
                      value={formData.late_tolerance_minutes}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData((prev: CreateClassScheduleInput) => ({ ...prev, late_tolerance_minutes: parseInt(e.target.value) || 0 }))
                      }
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
                      {isLoading ? 'Saving...' : (editingSchedule ? 'Update' : 'Create')}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Schedules Table */}
      <Card className="bg-white/10 backdrop-blur-md border-white/20">
        <CardHeader>
          <CardTitle className="text-white">
            Class Schedules ({schedules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 text-white/40 mx-auto mb-4" />
              <p className="text-white/60 text-lg mb-2">No class schedules found</p>
              <p className="text-white/40">Add your first class schedule to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white/80">Class Name</TableHead>
                    <TableHead className="text-white/80">Check-in Time</TableHead>
                    <TableHead className="text-white/80">Late Tolerance</TableHead>
                    <TableHead className="text-white/80">Min Check-out</TableHead>
                    <TableHead className="text-white/80">Status</TableHead>
                    <TableHead className="text-white/80">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule: ClassSchedule) => (
                    <TableRow key={schedule.id} className="border-white/10">
                      <TableCell className="text-white font-medium">{schedule.class_name}</TableCell>
                      <TableCell className="text-white font-mono">{schedule.check_in_time}</TableCell>
                      <TableCell className="text-white">{schedule.late_tolerance_minutes} min</TableCell>
                      <TableCell className="text-white font-mono">{schedule.min_checkout_time}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={schedule.is_active ? "default" : "secondary"}
                          className={schedule.is_active ? "bg-green-500/20 text-green-300 border-green-500/50" : "bg-gray-500/20 text-gray-300 border-gray-500/50"}
                        >
                          {schedule.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(schedule)}
                            className="text-white/60 hover:text-white hover:bg-white/10"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(schedule.id)}
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
