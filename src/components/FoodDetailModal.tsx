import React, { useState } from 'react';
import { FoodItem } from '../types';
import { X, Plus, Minus, Sparkles, ShoppingBag } from 'lucide-react';

interface FoodDetailModalProps {
  food: FoodItem | null;
  onClose: () => void;
  onAddToCart: (food: FoodItem, quantity: number) => void;
  currentInCartQty?: number;
}

export const FoodDetailModal: React.FC<FoodDetailModalProps> = ({
  food,
  onClose,
  onAddToCart,
  currentInCartQty = 0,
}) => {
  const [quantity, setQuantity] = useState<number>(currentInCartQty > 0 ? currentInCartQty : 1);

  if (!food) return null;

  const itemTotal = food.price * quantity;

  const handleAdd = () => {
    onAddToCart(food, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-150">
      
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        
        {/* Header Image with close button */}
        <div className="relative h-56 sm:h-64 w-full bg-slate-50 flex-shrink-0">
          <img
            src={food.image}
            alt={food.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white to-transparent" />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 p-2 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Veg dot badge */}
          <div className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded-full bg-blue-50 backdrop-blur-md border border-blue-200 flex items-center space-x-1.5 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">100% Pure Veg</span>
          </div>

          {/* Special badge */}
          {food.isChefSpecial && (
            <div className="absolute bottom-3.5 left-3.5 px-2.5 py-1 rounded-md bg-amber-50 backdrop-blur-md border border-amber-200 text-amber-600 font-semibold text-xs shadow-sm flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Chef's Special</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          
          <div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 leading-tight tracking-tight">
                  {food.name}
                </h2>
                {food.portionValue && food.portionUnit && (
                  <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 font-mono">
                    {food.portionValue} {food.portionUnit}
                  </span>
                )}
              </div>
              <span className="text-xl font-bold text-slate-900 ml-3 flex-shrink-0 font-mono">
                ₹{food.price}
              </span>
            </div>
            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mt-0.5">
              {food.category}
            </p>
          </div>

          <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-normal">
            {food.description}
          </p>

          {/* Quantity Selector */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Quantity
            </label>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Portions:</span>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-center justify-center font-bold hover:text-slate-900 transition-colors active:scale-95 cursor-pointer shadow-sm"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <span className="text-base font-bold text-slate-900 w-6 text-center font-mono">
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Action */}
        <div className="p-4 border-t border-slate-200 flex-shrink-0">
          <button
            type="button"
            onClick={handleAdd}
            className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-4 h-4 stroke-[2]" />
              <span>Add to Order</span>
            </div>
            <span className="text-white font-bold font-mono text-base">
              ₹{itemTotal}
            </span>
          </button>
        </div>

      </div>

    </div>
  );
};
