import React, { useState, useRef, useEffect } from 'react';
import { Student } from '../types';
import { getStudentDisplayName } from '../data/students';
import { Search, ChevronDown, Check, User } from 'lucide-react';

interface StudentSelectProps {
  students: Student[];
  selectedStudent: Student | null;
  onSelectStudent: (student: Student | null) => void;
  disabled?: boolean;
}

export const StudentSelect: React.FC<StudentSelectProps> = ({
  students,
  selectedStudent,
  onSelectStudent,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredStudents = students.filter((s) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      s.fullName.toLowerCase().includes(query) ||
      String(s.gmNo) === query ||
      `gm ${s.gmNo}`.includes(query) ||
      s.grade.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
        <span className="flex items-center space-x-1.5">
          <span>Registered Student</span>
          <span className="text-blue-600">*</span>
        </span>
        <span className="text-[11px] font-normal text-slate-400 lowercase">mandatory</span>
      </label>

      {/* Selected Student Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-left px-4 py-3.5 rounded-2xl flex items-center justify-between border transition-all duration-200 ${
          isOpen
            ? 'border-blue-500 bg-white ring-2 ring-blue-500/20 shadow-lg'
            : selectedStudent
            ? 'border-blue-300 bg-white text-slate-900 shadow-sm'
            : 'border-slate-200 bg-white/95 text-slate-700 hover:border-slate-300 hover:bg-white shadow-sm'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center space-x-3.5 overflow-hidden">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex-shrink-0 shadow-md">
            <User className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="truncate">
            {selectedStudent ? (
              <div className="flex flex-col">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
                  {selectedStudent.fullName}
                </span>
                <span className="text-xs text-blue-600 font-medium">
                  GM #{selectedStudent.gmNo} • {selectedStudent.grade} • Verified Attendee
                </span>
              </div>
            ) : (
              <span className="text-slate-400 text-sm font-medium">Search student name or GM No...</span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in duration-150">
          {/* Search Box inside dropdown */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/90">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type name, GM No, or standard..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-2 px-1">
              Select verified student from the Gurukul register.
            </p>
          </div>

          {/* Student List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => {
                const isSelected = selectedStudent?.id === student.id;

                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => {
                      onSelectStudent(student);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full px-4 py-3.5 text-left flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50 text-blue-900 font-bold'
                        : 'text-slate-800 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                        isSelected 
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {student.gmNo}
                      </div>
                      <div>
                        <div className="font-bold text-sm sm:text-base text-slate-900">{student.fullName}</div>
                        <div className="text-xs text-slate-500 font-medium">GM #{student.gmNo} • {student.grade}</div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="p-1 rounded-full bg-blue-600 text-white shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-slate-400 font-medium text-sm">
                No matching student found in roster.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
