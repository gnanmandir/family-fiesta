import React, { useEffect, useState } from 'react';
import { Order } from '../types';
import { CheckCircle2, Ticket, Edit3, Download, Lock } from 'lucide-react';
import { generateAndDownloadPDFReceipt } from '../utils/pdfGenerator';
import { INITIAL_STUDENTS } from '../data/students';
interface OrderConfirmationProps {
  order: Order;
  onRefreshOrder?: (updated: Order) => void;
  onEditOrder?: () => void;
  ordersOpen?: boolean;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({ order, onRefreshOrder, onEditOrder, ordersOpen = true }) => {
  const [currentOrder, setCurrentOrder] = useState<Order>(order);

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 flex flex-col justify-center min-h-[calc(100vh-4rem)] py-2">
      
      {/* Single Unified Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
        
        {/* Subtle Background Pattern/Color for the header part */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-emerald-50 to-white/0 pointer-events-none" />

        {/* Success Section (Now inside the card) */}
        <div className="text-center relative z-10 mb-4">
          <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shadow-sm">
            <CheckCircle2 className="text-emerald-600 w-5 h-5" />
          </div>
          <div className="mt-2">
            <div className="text-[10px] sm:text-[11px] font-bold text-emerald-600 uppercase tracking-widest">
              Official Digital Receipt
            </div>
            <div className="text-xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight mt-0.5">
              GM {INITIAL_STUDENTS.find((s) => s.id === currentOrder.studentId || s.fullName === currentOrder.fullName)?.gmNo || currentOrder.studentId}
            </div>
            <div className="text-[10px] sm:text-xs text-slate-500 mt-1 font-medium">
              Present this receipt at the coupon counter
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 relative z-10">
          <div className="flex items-center space-x-2 text-slate-800 font-bold uppercase tracking-wider text-xs">
            <Ticket className="w-4 h-4 text-indigo-600" />
            <span>Order Details</span>
          </div>
          <span className="text-slate-400 font-mono text-[9px] sm:text-[10px]">
            {currentOrder.dateDisplay} • {currentOrder.timeDisplay}
          </span>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 sm:p-2.5 rounded-xl border border-slate-100 mt-2">
          <div>
            <span className="text-slate-500 text-[9px] sm:text-[10px] uppercase tracking-wider font-bold block">Student</span>
            <span className="text-slate-800 font-bold text-xs">{currentOrder.studentName}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] sm:text-[10px] uppercase tracking-wider font-bold block">GM Number</span>
            <span className="text-slate-800 font-bold text-xs font-mono">{INITIAL_STUDENTS.find((s) => s.id === currentOrder.studentId || s.fullName === currentOrder.fullName)?.gmNo || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] sm:text-[10px] uppercase tracking-wider font-bold block">Guests</span>
            <span className="text-slate-800 font-bold text-xs">{currentOrder.peopleCount}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] sm:text-[10px] uppercase tracking-wider font-bold block">Budget</span>
            <span className="text-slate-800 font-bold text-xs font-mono">₹{currentOrder.allowedBudget}</span>
          </div>
        </div>

        {/* Items List */}
        <div className="mt-3 mb-2 space-y-0.5 overflow-y-auto custom-scrollbar pr-1" style={{ maxHeight: '15vh' }}>
          {currentOrder.items.map((item) => (
            <div key={item.id} className="flex justify-between py-1 text-xs sm:text-[13px]">
              <span className="text-slate-600">
                <span className="text-slate-900 font-bold mr-1.5">{item.quantity}×</span> 
                {item.name}
              </span>
              <span className="text-indigo-600 font-mono font-bold">₹{item.total}</span>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-slate-100 pt-2 flex justify-between items-center mb-3">
          <span className="text-slate-500 uppercase text-[9px] sm:text-[10px] tracking-wider font-bold">Total Amount</span>
          <span className="text-lg sm:text-xl text-indigo-600 font-mono font-bold">₹{currentOrder.totalAmount}</span>
        </div>

        {/* Action Buttons */}
        <div className="no-print flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={() => generateAndDownloadPDFReceipt(currentOrder)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-2 font-bold flex items-center justify-center space-x-2 shadow-md shadow-indigo-500/30 transition-all text-xs sm:text-sm"
          >
            <Ticket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Download Coupons Receipt</span>
          </button>

          {onEditOrder && (
            <button
              type="button"
              onClick={onEditOrder}
              className="flex-1 bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl py-2 font-bold flex items-center justify-center space-x-2 transition-all shadow-sm text-xs sm:text-sm"
            >
              <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Edit / Change Order Items</span>
            </button>
          )}

          {!ordersOpen && !onEditOrder && (
            <div className="flex-1 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl py-2 font-bold flex items-center justify-center space-x-2 text-xs sm:text-sm cursor-not-allowed">
              <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Editing Locked — Orders Closed</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
