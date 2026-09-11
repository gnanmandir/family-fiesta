import React, { useState } from 'react';
import { Student, Order } from '../../types';
import { Search, CheckCircle2, Clock } from 'lucide-react';
import { getStudentDisplayName } from '../../data/students';
import { formatNameDisplay } from '../../utils/nameFormatter';

interface StudentManagerProps {
  students: Student[];
  orders: Order[];
}

export const StudentManager: React.FC<StudentManagerProps> = ({ students, orders }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Ordered' | 'Remaining'>('All');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Map student orders
  const studentOrdersMap = new Map<string, Order>();
  orders.forEach((o) => {
    studentOrdersMap.set(o.studentId, o);
  });

  const totalStudents = students.length;
  const orderedCount = Array.from(studentOrdersMap.keys()).length;
  const remainingCount = totalStudents - orderedCount;

  const filteredStudents = students.filter((s) => {
    const hasOrdered = studentOrdersMap.has(s.id);
    if (filter === 'Ordered' && !hasOrdered) return false;
    if (filter === 'Remaining' && hasOrdered) return false;

    const query = searchQuery.toLowerCase().trim();
    return (
      s.fullName.toLowerCase().includes(query) ||
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
              placeholder="Search student, GM No, grade..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setEditingStudent({ id: '', fullName: '', firstName: '', lastName: '', parentName: '', gmNo: 0, grade: '' } as any)}
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
                <th className="p-3.5">GM NO.</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">Standard</th>
                <th className="p-3.5">Order Status</th>
                <th className="p-3.5 text-right">Order Total</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const existingOrder = studentOrdersMap.get(student.id);

                  return (
                    <tr key={student.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="p-3.5 font-mono text-stone-500 font-bold whitespace-nowrap">
                        GM #{student.gmNo}
                      </td>
                      <td className="p-3.5 font-bold text-stone-900 whitespace-nowrap">
                        {formatNameDisplay(student.fullName)}
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
                        <button
                          type="button"
                          onClick={() => setEditingStudent(student)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Edit
                        </button>
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
                const fullName = formData.get('fullName') as string;
                const gmNo = Number(formData.get('gmNo'));
                const grade = formData.get('grade') as string;
                
                const firstName = fullName.split(' ')[0] || fullName;
                const parentName = formData.get('parentName') as string || '';
                
                const newStudent: Student = {
                  ...editingStudent,
                  id: editingStudent.id || `ST-${Math.random().toString(36).substr(2, 9)}`,
                  fullName,
                  firstName,
                  parentName,
                  gmNo,
                  grade,
                };
                
                try {
                  const { saveStudent } = await import('../../services/storage');
                  await saveStudent(newStudent);
                  alert('Student saved successfully! Refresh page if list doesn\'t update immediately.');
                  setEditingStudent(null);
                } catch(err) {
                  alert('Error saving student.');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Student Full Name (Username)</label>
                <input type="text" name="fullName" required defaultValue={editingStudent.fullName} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">GM No. (Password)</label>
                <input type="number" name="gmNo" required defaultValue={editingStudent.gmNo || ''} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Grade / Standard</label>
                <input type="text" name="grade" defaultValue={editingStudent.grade || 'Gurukul Roster'} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
