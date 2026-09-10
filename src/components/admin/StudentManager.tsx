import React, { useState } from 'react';
import { Student, Order } from '../../types';
import { Search, CheckCircle2, Clock } from 'lucide-react';
import { getStudentDisplayName } from '../../data/students';

interface StudentManagerProps {
  students: Student[];
  orders: Order[];
}

export const StudentManager: React.FC<StudentManagerProps> = ({ students, orders }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'All' | 'Ordered' | 'Remaining'>('All');

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
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, GM No, grade..."
            className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 text-xs focus:outline-none focus:border-orange-700 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center space-x-1.5">
          {(['All', 'Ordered', 'Remaining'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === f
                  ? 'bg-stone-900 text-white shadow-xs'
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
                        {student.fullName}
                      </td>
                      <td className="p-3.5 text-stone-500 whitespace-nowrap font-medium">
                        {student.grade}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {existingOrder ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium text-[11px] inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Ordered (#{existingOrder.orderNumber})</span>
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-500 font-medium">
                    No students match your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
