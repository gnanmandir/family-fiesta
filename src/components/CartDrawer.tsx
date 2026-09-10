import React, { useState } from 'react';
import { CartItem, Student } from '../types';
import { X, Trash2, Plus, Minus, ShoppingBag, ShieldCheck, AlertTriangle, ArrowRight, CheckCircle2, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateAllowedBudget } from '../utils/budget';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (foodId: string, delta: number) => void;
  onRemoveItem: (foodId: string) => void;
  selectedStudent: Student;
  peopleCount: number;
  onPlaceOrder: () => Promise<void> | void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  selectedStudent,
  peopleCount,
  onPlaceOrder,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const allowedBudget = calculateAllowedBudget(peopleCount);
  const currentTotal = cart.reduce((sum, item) => sum + item.food.price * item.quantity, 0);
  const isExceeded = currentTotal > allowedBudget;
  const exceededAmount = currentTotal - allowedBudget;
  const remainingBudget = allowedBudget - currentTotal;
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0 || isExceeded || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onPlaceOrder();
      setShowConfirmModal(false);
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      
      <div className="w-full max-w-3xl max-h-[95vh] h-full lg:h-auto lg:max-h-[90vh] bg-white lg:rounded-2xl lg:border flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300 mx-auto rounded-t-3xl border-t border-slate-200">
        <div className="w-10 h-1 rounded-full bg-slate-200 mx-auto mt-3 mb-1 lg:hidden"></div>
        
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-slate-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 leading-tight">Order Summary</h3>
              <p className="text-[11px] font-medium text-slate-500">{totalItemsCount} items selected</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cart Value</div>
              <div className="font-mono text-sm font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
                ₹{currentTotal}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 lg:p-8">
          {cart.length === 0 ? (
            <div className="py-20 flex flex-col items-center text-center">
              <ShoppingBag className="w-16 h-16 text-slate-200 mb-4" />
              <p className="text-base text-slate-400 font-medium max-w-[250px]">
                Your cart is empty. Click "+ Add" on dishes to order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.food.id} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-100 rounded-xl hover:border-slate-200 transition-colors">
                  <div className="flex-1 pr-4">
                    <h4 className="text-base font-bold text-slate-900 leading-tight mb-1.5">{item.food.name}</h4>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-mono font-bold text-blue-600">₹{item.food.price}</span>
                      <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                        <button onClick={() => onUpdateQuantity(item.food.id, -1)} className="px-3 py-1 text-slate-500 hover:text-slate-900 transition-colors"><Minus className="w-4 h-4" /></button>
                        <span className="px-2 text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => {
                            if (currentTotal + item.food.price > allowedBudget) {
                              alert(`Cannot add more ${item.food.name}. Budget limit exceeded.`);
                            } else {
                              onUpdateQuantity(item.food.id, 1);
                            }
                          }} 
                          className="px-3 py-1 text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-mono font-black text-slate-900">
                    ₹{item.food.price * item.quantity}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer with Budget Analysis */}
        <div className="p-6 border-t border-slate-100 flex-shrink-0 bg-white lg:rounded-b-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">Budget Status</span>
            <span className={`text-xs font-bold ${isExceeded ? 'text-red-500' : 'text-slate-700'}`}>
              {Math.min(100, Math.round((currentTotal / allowedBudget) * 100)) || 0}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 mb-3 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${isExceeded ? 'bg-red-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(100, Math.round((currentTotal / allowedBudget) * 100)) || 0}%` }}
            />
          </div>
          <div className="flex items-end justify-between mb-6">
            <span className="text-sm font-medium text-slate-500">Total:</span>
            <div className="font-mono text-lg font-black tracking-tight">
              <span className={isExceeded ? 'text-red-500' : 'text-slate-900'}>₹{currentTotal}</span>
              <span className="text-slate-400 text-sm ml-1">/ ₹{allowedBudget}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={cart.length === 0 || isExceeded}
            onClick={() => setShowConfirmModal(true)}
            className={`w-full py-3.5 rounded-xl font-bold text-sm shadow-sm flex items-center justify-center space-x-2 transition-all ${
              cart.length === 0 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : isExceeded
                ? 'bg-red-50 text-red-500 border border-red-200 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-black text-white active:scale-95'
            }`}
          >
            <span>Review & Place Order</span>
            {cart.length > 0 && !isExceeded && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Confirmation Modal - Full Page View */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] bg-slate-50 flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* Header Bar */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between shadow-sm">
            <button
              type="button"
              onClick={() => setShowConfirmModal(false)}
              className="flex items-center space-x-1.5 text-slate-500 hover:text-slate-900 font-bold text-sm transition-colors"
            >
              <ArrowRight className="w-5 h-5 rotate-180" />
              <span>Back to Cart</span>
            </button>
            <div className="font-bold text-slate-900 tracking-tight text-sm">
              Checkout Step
            </div>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>

          {/* Main Content Centered */}
          <div className="flex-1 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 text-center">
              
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                <HelpCircle className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Confirm Order Placement</h3>
                <p className="text-xs sm:text-sm text-slate-500">
                  Please verify your order details before submitting:
                </p>
              </div>

              {/* Summary Details */}
              <div className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center text-slate-500">
                  <span>Student:</span>
                  <span className="text-slate-900 font-bold">{selectedStudent.firstName} ({selectedStudent.parentName})</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Guests:</span>
                  <span className="text-slate-900 font-bold">{peopleCount}</span>
                </div>
                <div className="flex justify-between items-center text-slate-500">
                  <span>Total Items:</span>
                  <span className="text-slate-900 font-bold">{totalItemsCount} {totalItemsCount === 1 ? 'Dish' : 'Dishes'}</span>
                </div>
                <div className="flex justify-between items-center text-slate-700 border-t border-slate-200 pt-2 text-sm sm:text-base font-bold">
                  <span className="text-slate-900">Total Amount:</span>
                  <span className="text-blue-600 font-mono text-lg sm:text-xl tracking-tight">₹{currentTotal}</span>
                </div>

              </div>

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full py-3 sm:py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 stroke-[2]" />
                  )}
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Order'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-2.5 sm:py-3 px-6 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-sm cursor-pointer transition-all"
                >
                  Return to Cart
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
