import React from 'react';
import { Order } from '../types';
import { Lock, Edit3 } from 'lucide-react';
import { OrderConfirmation } from './OrderConfirmation';

interface AlreadySubmittedViewProps {
  order: Order;
  onRefreshOrder?: (updated: Order) => void;
  onEditOrder?: () => void;
}

export const AlreadySubmittedView: React.FC<AlreadySubmittedViewProps> = ({ order, onRefreshOrder, onEditOrder }) => {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      
      {/* Status Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-3 shadow-md">
        <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6 text-amber-500" />
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">
            Order Already Registered
          </h2>
          <p className="text-sm text-slate-500">
            An order has been recorded for this account.
          </p>
        </div>

        <p className="text-xs text-slate-400">
          You can modify your dishes anytime.
        </p>

        {onEditOrder && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onEditOrder}
              className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl py-2.5 px-5 font-bold text-sm inline-flex items-center space-x-2 transition-all shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit / Change Order Items</span>
            </button>
          </div>
        )}
      </div>

      {/* Embedded Order Confirmation View */}
      <OrderConfirmation order={order} onRefreshOrder={onRefreshOrder} onEditOrder={onEditOrder} />

    </div>
  );
};
