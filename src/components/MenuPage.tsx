import React, { useState } from 'react';
import { FoodItem, CartItem, Student } from '../types';
import { 
  Sparkles, 
  Search, 
  ArrowRight,
  Plus,
  Minus,
  ShoppingBag,
  ShieldCheck,
  X,
  User,
  AlertTriangle
} from 'lucide-react';
import { calculateAllowedBudget } from '../utils/budget';

interface MenuPageProps {
  menuItems: FoodItem[];
  cart: CartItem[];
  selectedStudent: Student;
  peopleCount: number;
  onAddToCart: (food: FoodItem, quantity: number) => void;
  onOpenCart: () => void;
  onUpdateQuantity?: (foodId: string, delta: number) => void;
  onRemoveItem?: (foodId: string) => void;
  onPlaceOrder?: () => void;
  isEditing?: boolean;
}

export const MenuPage: React.FC<MenuPageProps> = ({
  menuItems,
  cart,
  selectedStudent,
  peopleCount,
  onAddToCart,
  onOpenCart,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  isEditing = false,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const allowedBudget = calculateAllowedBudget(peopleCount);
  const currentTotal = cart.reduce((sum, item) => sum + item.food.price * item.quantity, 0);
  const remainingBudget = allowedBudget - currentTotal;
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const isExceeded = currentTotal > allowedBudget;
  const progressPercentage = Math.min(100, Math.round((currentTotal / allowedBudget) * 100)) || 0;

  const categories = [
    'All',
    'Chaat & Street Food',
    'Main Course',
    'Beverages & Drinks',
    'Desserts',
    'Healthy Special',
  ];

  const filteredItems = menuItems.filter((item) => {
    if (!item.isAvailable) return false;
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  const handleStepQty = (e: React.MouseEvent, food: FoodItem, delta: number) => {
    e.stopPropagation();
    setErrorToast(null);

    const existing = cart.find((c) => c.food.id === food.id);
    const cur = existing ? existing.quantity : 0;
    const nextQty = cur + delta;
    
    // Prevent adding if it exceeds budget
    if (delta > 0 && currentTotal + food.price > allowedBudget) {
      setErrorToast(`Cannot add ${food.name}. Budget limit of ₹${allowedBudget} exceeded.`);
      setTimeout(() => setErrorToast(null), 3000);
      return;
    }

    if (nextQty <= 0) {
      if (onRemoveItem) onRemoveItem(food.id);
      else onAddToCart(food, 0);
    } else {
      if (onUpdateQuantity && existing) onUpdateQuantity(food.id, delta);
      else onAddToCart(food, nextQty);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

      {/* Main Layout: 1 Column */}
      <div className="w-full max-w-4xl mx-auto space-y-5">

          {/* Student Pill */}
          {selectedStudent && (
            <div className="flex">
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-white border border-slate-200 rounded-full shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
                <User className="w-4 h-4 text-orange-500 stroke-[2.5]" />
                <span className="text-sm font-medium text-slate-400">Student:</span>
                <span className="text-sm font-bold text-slate-700">{selectedStudent.fullName}</span>
              </div>
            </div>
          )}
          
          {/* Search Bar */}
          <div className="relative pb-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food items..."
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-sm"
            />
          </div>

          {/* Food Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
            {filteredItems.length > 0 ? (
              filteredItems.map((food) => {
                const inCartItem = cart.find((c) => c.food.id === food.id);
                const inCartQty = inCartItem ? inCartItem.quantity : 0;

                return (
                  <div
                    key={food.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-300 group flex shadow-sm"
                  >
                    {/* Image Area - Square Left Side */}
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 bg-slate-50 overflow-hidden flex-shrink-0 p-2">
                      <img
                        src={food.image}
                        alt={food.name}
                        className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded px-1.5 py-0.5 text-[8px] text-emerald-600 font-bold flex items-center shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                        VEG
                      </div>
                      {food.isChefSpecial && (
                        <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded px-1.5 py-0.5 text-[8px] text-amber-400 font-bold flex items-center space-x-1 shadow-sm">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Special</span>
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div className="p-3.5 flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors pr-2">
                            {food.name}
                          </h3>
                        </div>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider mt-0.5 mb-1.5">
                          {food.category}
                        </p>
                        <p className="text-xs text-slate-500 leading-snug">
                          {food.description}
                        </p>
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-base font-black text-slate-900">
                          ₹{food.price}
                        </span>

                        {inCartQty > 0 ? (
                          <div 
                            className="flex items-center bg-slate-50 border border-slate-200 rounded-full overflow-hidden h-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={(e) => handleStepQty(e, food, -1)}
                              className="w-8 h-full bg-slate-50 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-slate-900">
                              {inCartQty}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleStepQty(e, food, 1)}
                              className="w-8 h-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => handleStepQty(e, food, 1)}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-3 py-1.5 text-[11px] font-bold active:scale-95 transition-all flex items-center space-x-1 shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                            <span>Add</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-slate-400 font-medium text-sm bg-white rounded-2xl border border-slate-200">
                No items found matching your selection.
              </div>
            )}
          </div>
      </div>



      {/* Error Toast */}
      {errorToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2.5 rounded-full shadow-xl shadow-red-600/20 flex items-center space-x-2 text-sm font-bold animate-in slide-in-from-top-4 fade-in duration-300">
          <AlertTriangle className="w-4 h-4" />
          <span>{errorToast}</span>
        </div>
      )}

      {/* Sticky Cart Trigger (Desktop & Mobile) */}
      {totalCartCount > 0 && (
        <div className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t px-4 py-3 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] ${isExceeded ? 'border-red-200' : 'border-slate-200'}`}>
          <div className="max-w-4xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isExceeded ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {totalCartCount}
              </div>
              <div className="flex flex-col">
                <div className={`font-mono font-black text-lg leading-none ${isExceeded ? 'text-red-600' : 'text-slate-900'}`}>
                  ₹{currentTotal}
                </div>
                <div className={`text-[10px] font-medium uppercase tracking-wider mt-0.5 ${isExceeded ? 'text-red-500' : 'text-slate-500'}`}>
                  Total Amount
                </div>
              </div>
            </div>
            <button
              onClick={onOpenCart}
              disabled={isExceeded}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-colors ${
                isExceeded 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-slate-900 hover:bg-black text-white'
              }`}
            >
              {isExceeded ? 'Limit Exceeded' : 'View Cart'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
