import React, { useState, useMemo } from 'react';
import { Student, Order } from '../../types';
import { Search, CheckCircle2, Clock, Calendar, Trash2, ShieldAlert, X, Eye, EyeOff } from 'lucide-react';
import { INITIAL_STUDENTS, getStudentDisplayName } from '../../data/students';
import { formatNameDisplay } from '../../utils/nameFormatter';

interface StudentManagerProps {
  students: Student[];
  orders: Order[];
  onStudentUpdated?: (student: Student) => void;
  onDeleteOrder?: (orderNumber: string) => Promise<void> | void;
  onWipeStudentOrder?: (student: Student, order?: Order) => Promise<void> | void;
}

const PRESET_GRADES = [
  'Std 5',
  'Std 6',
  'Std 7',
  'Std 8',
  'Std 9',
  'Std 10',
  'Std 11',
  'Std 12',
  'Diploma',
  'College',
];

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  orders,
  onStudentUpdated,
  onDeleteOrder,
  onWipeStudentOrder,
}) => {
  const [localStudents, setLocalStudents] = useState<Student[]>(students);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Ordered' | 'Remaining'>('All');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>('Std 5');

  // Password-protected Wipe Modal State
  const [wipeModal, setWipeModal] = useState<{ student: Student; order?: Order } | null>(null);
  const [wipePassword, setWipePassword] = useState('');
  const [wipePasswordError, setWipePasswordError] = useState('');
  const [showWipePassword, setShowWipePassword] = useState(false);
  const [isWipingInProgress, setIsWipingInProgress] = useState(false);

  // Keep localStudents in sync if parent students array updates
  React.useEffect(() => {
    setLocalStudents(students);
  }, [students]);

  const normalize = (val: string) => (val || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Helper to reliably find an order for a student (by id, full_name, or student_name)
  const getStudentOrder = (student: Student): Order | undefined => {
    const normStudentName = normalize(student.fullName);
    return orders.find((o) => {
      if (o.studentId && student.id && o.studentId.toLowerCase() === student.id.toLowerCase()) {
        return true;
      }
      if (o.fullName && normalize(o.fullName) === normStudentName) {
        return true;
      }
      if (o.studentName && normalize(o.studentName) === normStudentName) {
        return true;
      }
      return false;
    });
  };

  const handleOpenWipeModal = (student: Student, existingOrder?: Order) => {
    setWipeModal({ student, order: existingOrder });
    setWipePassword('');
    setWipePasswordError('');
    setShowWipePassword(false);
  };

  const handleConfirmWipeWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wipeModal) return;

    const entered = wipePassword.trim();
    if (!entered) {
      setWipePasswordError('Please enter password to authorize.');
      return;
    }

    let currentAdminPass = 'niruma0212';
    try {
      const { api } = await import('../../services/api');
      const creds = await api.getAdminCredentials();
      if (creds && creds.password) {
        currentAdminPass = creds.password;
      }
    } catch (err) {}

    const studentBirthDate = (wipeModal.student.birthDate || '').trim();
    const isAuthorized =
      entered === 'niruma0212' ||
      entered === currentAdminPass ||
      (studentBirthDate && entered === studentBirthDate);

    if (!isAuthorized) {
      setWipePasswordError('Incorrect password. Authorization failed.');
      return;
    }

    setIsWipingInProgress(true);
    try {
      if (onWipeStudentOrder) {
        await onWipeStudentOrder(wipeModal.student, wipeModal.order);
      } else {
        const { wipeStudentOrder } = await import('../../services/storage');
        await wipeStudentOrder(wipeModal.student.id, wipeModal.student.fullName, wipeModal.order?.orderNumber);
        if (wipeModal.order?.orderNumber && onDeleteOrder) {
          await onDeleteOrder(wipeModal.order.orderNumber);
        }
      }
      alert(`Order for ${wipeModal.student.fullName} has been wiped successfully!\nThey can now submit a fresh order.`);
      setWipeModal(null);
      setWipePassword('');
      setWipePasswordError('');
    } catch (err: any) {
      console.error('Failed to wipe order:', err);
      setWipePasswordError(`Failed to wipe order: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsWipingInProgress(false);
    }
  };

  // Enrich students with authoritative birth dates from INITIAL_STUDENTS
  const enrichedStudents = useMemo(() => {
    return localStudents.map((s) => {
      const init = INITIAL_STUDENTS.find(
        (i) => normalize(i.fullName) === normalize(s.fullName) || i.id === s.id
      );
      return {
        ...s,
        birthDate: s.birthDate || init?.birthDate || '',
        gmNo: s.gmNo || init?.gmNo || 0,
      };
    });
  }, [localStudents]);

  const totalStudents = enrichedStudents.length;
  const orderedCount = enrichedStudents.filter((s) => Boolean(getStudentOrder(s))).length;
  const remainingCount = totalStudents - orderedCount;

  const filteredStudents = enrichedStudents.filter((s) => {
    const hasOrdered = Boolean(getStudentOrder(s));
    if (filter === 'Ordered' && !hasOrdered) return false;
    if (filter === 'Remaining' && hasOrdered) return false;

    const query = searchQuery.toLowerCase().trim();
    return (
      s.fullName.toLowerCase().includes(query) ||
      (s.birthDate && s.birthDate.toLowerCase().includes(query)) ||
      String(s.gmNo) === query ||
      `gm ${s.gmNo}`.includes(query) ||
      s.grade.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-4">
      
      {/* Stat Cards Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-white border border-stone-200 text-center shadow-xs">
          <div className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">Total Students</div>
          <div className="text-2xl font-bold text-stone-900 mt-1 font-mono">{totalStudents}</div>
        </div>

        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center shadow-xs">
          <div className="text-[10px] text-emerald-800 uppercase tracking-wider font-semibold">Ordered</div>
          <div className="text-2xl font-bold text-emerald-950 mt-1 font-mono">{orderedCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center shadow-xs">
          <div className="text-[10px] text-amber-800 uppercase tracking-wider font-semibold">Remaining</div>
          <div className="text-2xl font-bold text-amber-950 mt-1 font-mono">{remainingCount}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-stone-200 shadow-xs">
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student, birth date, standard..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingStudent({ id: '', fullName: '', firstName: '', lastName: '', parentName: '', birthDate: '', gmNo: 0, grade: 'Std 5' } as any);
              setSelectedGrade('Std 5');
            }}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm whitespace-nowrap transition-colors"
          >
            + Add Student
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          {(['All', 'Ordered', 'Remaining'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">Birth Date (Password)</th>
                <th className="p-3.5">Standard</th>
                <th className="p-3.5">Order Status</th>
                <th className="p-3.5 text-right">Order Total</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const existingOrder = getStudentOrder(student);

                  return (
                    <tr key={student.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-stone-900 whitespace-nowrap">
                        {formatNameDisplay(student.fullName)}
                      </td>
                      <td className="p-3.5 font-mono text-indigo-600 font-bold whitespace-nowrap">
                        {student.birthDate || 'Not set'}
                      </td>
                      <td className="p-3.5 text-stone-500 whitespace-nowrap font-medium">
                        {student.grade}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {existingOrder ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[11px] inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Ordered</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-stone-100 text-stone-600 border border-stone-200 font-medium text-[11px] inline-flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-stone-400" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right font-bold text-stone-900 whitespace-nowrap font-mono">
                        {existingOrder ? `₹${existingOrder.totalAmount}` : '-'}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStudent(student);
                              setSelectedGrade(student.grade || 'Std 5');
                            }}
                            className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            Edit
                          </button>
                          {existingOrder && (
                            <button
                              type="button"
                              onClick={() => handleOpenWipeModal(student, existingOrder)}
                              title={`Wipe order #${existingOrder.orderNumber} and allow re-ordering`}
                              className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-semibold rounded-lg transition-colors inline-flex items-center space-x-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Wipe Order</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-500 font-medium">
                    No students match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Add/Edit Student Modal */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              {editingStudent.id ? 'Edit Student' : 'Add New Student'}
            </h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const fullName = ((formData.get('fullName') as string) || editingStudent.fullName || '').trim();
                const birthDate = ((formData.get('birthDate') as string) || editingStudent.birthDate || '').trim();
                const grade = ((formData.get('grade') as string) || selectedGrade || editingStudent.grade || 'Std 5').trim();
                
                const firstName = fullName.split(' ')[0] || fullName;
                const parentName = ((formData.get('parentName') as string) || editingStudent.parentName || '').trim();
                
                const newStudent: Student = {
                  ...editingStudent,
                  id: editingStudent.id || `ST-${Math.random().toString(36).substr(2, 9)}`,
                  fullName,
                  firstName,
                  parentName: parentName || editingStudent.parentName || 'Parent',
                  birthDate,
                  gmNo: editingStudent.gmNo || 0,
                  grade,
                };
                
                try {
                  setIsSaving(true);
                  const { saveStudent } = await import('../../services/storage');
                  const saved = await saveStudent(newStudent);

                  // Update local list in StudentManager so table updates IMMEDIATELY without reload
                  setLocalStudents((prev) => {
                    const idx = prev.findIndex(
                      (s) => s.id === saved.id || s.fullName.toLowerCase() === saved.fullName.toLowerCase()
                    );
                    if (idx >= 0) {
                      const copy = [...prev];
                      copy[idx] = saved;
                      return copy;
                    }
                    return [...prev, saved];
                  });

                  onStudentUpdated?.(saved);
                  alert('Student saved successfully!');
                  setEditingStudent(null);
                } catch(err: any) {
                  console.error('Error saving student:', err);
                  alert(`Error saving student: ${err?.message || 'Please try again.'}`);
                } finally {
                  setIsSaving(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Full Name (Username)</label>
                <input type="text" name="fullName" required defaultValue={editingStudent.fullName} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Birth Date (Password - DD/MM/YYYY)</label>
                <div className="relative">
                  <input
                    type="text"
                    name="birthDate"
                    required
                    placeholder="DD/MM/YYYY"
                    defaultValue={editingStudent.birthDate || ''}
                    className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-lg text-sm font-medium"
                  />
                  <div
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 cursor-pointer flex items-center justify-center"
                    title="Select from calendar"
                  >
                    <Calendar className="w-4 h-4 pointer-events-none" />
                    <input
                      type="date"
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [y, m, d] = e.target.value.split('-');
                          const inputEl = e.currentTarget.parentElement?.previousElementSibling as HTMLInputElement;
                          if (inputEl && y && m && d) {
                            inputEl.value = `${d}/${m}/${y}`;
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Grade / Standard</label>
                
                {/* Pre-defined Standard Buttons */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {PRESET_GRADES.map((g) => {
                    const isSelected = selectedGrade === g;
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setSelectedGrade(g)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        {g}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  name="grade"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  placeholder="Select standard above or type custom..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg shadow-sm cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password-protected Wipe Order Authorization Modal */}
      {wipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Authorize Order Wipe</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Password Verification Required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setWipeModal(null);
                  setWipePassword('');
                  setWipePasswordError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-red-50/80 border border-red-200 rounded-xl p-3.5 mb-4 text-xs text-red-900 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <span>Student: {wipeModal.student.fullName}</span>
              </div>
              <div className="text-red-700">
                Order Token:{' '}
                <span className="font-mono font-bold">
                  #{wipeModal.order?.orderNumber || 'Active'}
                </span>{' '}
                | Total:{' '}
                <span className="font-mono font-bold">
                  ₹{wipeModal.order?.totalAmount || 0}
                </span>
              </div>
              <p className="text-[11px] text-red-600/90 pt-1">
                ⚠️ This will permanently delete this order and allow the student to place a fresh order.
              </p>
            </div>

            <form onSubmit={handleConfirmWipeWithPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Admin / System Password
                </label>
                <div className="relative">
                  <input
                    type={showWipePassword ? 'text' : 'password'}
                    value={wipePassword}
                    onChange={(e) => {
                      setWipePassword(e.target.value);
                      if (wipePasswordError) setWipePasswordError('');
                    }}
                    placeholder="Enter password to authorize wipe..."
                    autoFocus
                    required
                    className={`w-full pl-3 pr-10 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                      wipePasswordError
                        ? 'border-red-300 focus:ring-red-200 text-red-900'
                        : 'border-slate-200 focus:ring-red-500/20 focus:border-red-500 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowWipePassword(!showWipePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showWipePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {wipePasswordError && (
                  <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center space-x-1">
                    <span>{wipePasswordError}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  disabled={isWipingInProgress}
                  onClick={() => {
                    setWipeModal(null);
                    setWipePassword('');
                    setWipePasswordError('');
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWipingInProgress || !wipePassword.trim()}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isWipingInProgress ? 'Wiping Order...' : 'Authorize & Wipe Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
