import React, { useState, useEffect } from 'react';
import { GuestCredential } from '../../types';
import { api } from '../../services/api';
import { Plus, Trash2, KeyRound, Save, X, Edit2, Users } from 'lucide-react';

interface GuestManagerProps {
  adminRole?: import('../../types').AdminRole;
  allowEdit?: boolean;
}

export const GuestManager: React.FC<GuestManagerProps> = ({ adminRole = 'admin', allowEdit = true }) => {
  const isBoss = adminRole === 'boss';
  const canEdit = isBoss || allowEdit;
  const [guests, setGuests] = useState<GuestCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const fetchGuests = async () => {
    setIsLoading(true);
    const list = await api.getGuests();
    setGuests(list);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  const handleAddGuest = async () => {
    if (!newGuestName.trim() || !newPassword.trim()) return;
    const newGuest: GuestCredential = {
      id: `guest-${Date.now()}`,
      guestName: newGuestName.trim(),
      password: newPassword.trim(),
      createdAt: new Date().toISOString(),
    };
    await api.addGuest(newGuest);
    setNewGuestName('');
    setNewPassword('');
    setIsAdding(false);
    fetchGuests();
  };

  const handleUpdateGuest = async (id: string) => {
    if (!editName.trim() || !editPassword.trim()) return;
    await api.updateGuest(id, { guestName: editName.trim(), password: editPassword.trim() });
    setEditingId(null);
    fetchGuests();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this staff credential?')) {
      await api.deleteGuest(id);
      fetchGuests();
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="bg-white border border-stone-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">Staff Credentials</h2>
              <p className="text-xs text-stone-500">Manage names and passwords for staff members.</p>
            </div>
          </div>
          <button
            onClick={() => setIsAdding(true)}
            disabled={!canEdit}
            className={`px-4 py-2 text-sm font-bold rounded-xl shadow-sm transition-all flex items-center space-x-2 ${
              canEdit
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                : 'bg-stone-100 text-stone-400 opacity-50 cursor-not-allowed pointer-events-none'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Staff</span>
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {isAdding && (
            <div className="mb-6 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-stone-700 mb-1">Staff Name</label>
                <input
                  type="text"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  placeholder="e.g. Staff Member"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-stone-700 mb-1">Password Code</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="e.g. 12345"
                  className="w-full px-3 py-2 border border-stone-200 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="flex space-x-2 w-full sm:w-auto">
                <button
                  onClick={handleAddGuest}
                  className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold"
                >
                  Save
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-2 bg-stone-200 text-stone-700 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-8 text-stone-500 text-sm">Loading staff...</div>
          ) : guests.length === 0 ? (
            <div className="text-center py-8 text-stone-500 text-sm border-2 border-dashed border-stone-200 rounded-xl">
              No staff credentials added yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {guests.map((g) => (
                <div key={g.id} className="border border-stone-200 rounded-xl p-3 flex flex-col justify-between hover:shadow-xs transition-shadow">
                  {editingId === g.id ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm font-bold"
                      />
                      <input
                        type="text"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        className="w-full px-2 py-1.5 border border-stone-200 rounded text-sm text-stone-600 font-mono"
                      />
                      <div className="flex space-x-2 pt-1">
                        <button onClick={() => handleUpdateGuest(g.id)} className="flex-1 bg-emerald-500 text-white rounded py-1.5 text-xs font-bold">Save</button>
                        <button onClick={() => setEditingId(null)} className="flex-1 bg-stone-200 text-stone-700 rounded py-1.5 text-xs font-bold">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h3 className="font-bold text-stone-900 text-sm">{g.guestName}</h3>
                        <div className="flex items-center space-x-1.5 mt-1 text-stone-500 bg-stone-100 w-fit px-2 py-0.5 rounded text-xs font-mono">
                          <KeyRound className="w-3 h-3" />
                          <span>{g.password}</span>
                        </div>
                      </div>
                      <div className={`flex justify-end space-x-2 mt-3 pt-3 border-t border-stone-100 ${!canEdit ? 'opacity-40 pointer-events-none cursor-not-allowed' : ''}`}>
                        <button
                          disabled={!canEdit}
                          onClick={() => {
                            setEditingId(g.id);
                            setEditName(g.guestName);
                            setEditPassword(g.password);
                          }}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          disabled={!canEdit}
                          onClick={() => handleDelete(g.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
