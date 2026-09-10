import React, { useState, useRef } from 'react';
import { FoodItem } from '../../types';
import { Plus, Edit2, Trash2, X, Check, Image as ImageIcon, Sparkles, Upload, Camera } from 'lucide-react';

interface FoodManagerProps {
  menuItems: FoodItem[];
  onSaveMenuItems: (items: FoodItem[]) => void;
}

export const FoodManager: React.FC<FoodManagerProps> = ({
  menuItems,
  onSaveMenuItems,
}) => {
  const [isAddingOrEditing, setIsAddingOrEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(100);
  const [image, setImage] = useState('');
  const [isChefSpecial, setIsChefSpecial] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setDescription('');
    setPrice(120);
    setImage('');
    setIsChefSpecial(false);
    setIsAddingOrEditing(true);
  };

  const handleOpenEdit = (item: FoodItem) => {
    setEditingItem(item);
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price);
    setImage(item.image);
    setIsChefSpecial(!!item.isChefSpecial);
    setIsAddingOrEditing(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WebP).');
      return;
    }

    setIsUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) {
        setIsUploadingImage(false);
        return;
      }

      // Optimize image resolution via canvas for compact storage & rapid load
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = Math.round(width);
        canvas.height = Math.round(height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setImage(compressed);
        } else {
          setImage(result);
        }
        setIsUploadingImage(false);
      };
      img.onerror = () => {
        setImage(result);
        setIsUploadingImage(false);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleToggleAvailable = (itemId: string) => {
    const updated = menuItems.map((item) =>
      item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item
    );
    onSaveMenuItems(updated);
  };

  const handleDeleteItem = (itemId: string) => {
    if (confirm('Are you sure you want to delete this menu item?')) {
      const updated = menuItems.filter((item) => item.id !== itemId);
      onSaveMenuItems(updated);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const defaultPlaceholder =
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';
    const finalImage = image.trim() || editingItem?.image || defaultPlaceholder;

    if (editingItem) {
      // Update
      const updated = menuItems.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              name,
              category: item.category || 'Dishes',
              description,
              price: Number(price),
              image: finalImage,
              isChefSpecial,
            }
          : item
      );
      onSaveMenuItems(updated);
    } else {
      // Create
      const newItem: FoodItem = {
        id: 'FOOD-' + Math.floor(100 + Math.random() * 900),
        name,
        category: 'Dishes',
        description,
        price: Number(price),
        image: finalImage,
        isVeg: true,
        isChefSpecial,
        isAvailable: true,
      };
      onSaveMenuItems([...menuItems, newItem]);
    }

    setIsAddingOrEditing(false);
  };

  return (
    <div className="space-y-4">
      
      {/* Top Header & Add Button */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
        <div>
          <h3 className="text-base font-bold text-stone-900">Food Menu Catalog</h3>
          <p className="text-xs text-stone-500">Add dishes, edit prices, upload photos, or toggle availability.</p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide shadow-md shadow-indigo-500/20 flex items-center space-x-2 active:scale-95 cursor-pointer transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-xl bg-white border shadow-xs transition-all flex space-x-3 relative ${
              item.isAvailable
                ? 'border-stone-200'
                : 'border-stone-200 opacity-60 bg-stone-50'
            }`}
          >
            <img
              src={item.image}
              alt={item.name}
              className="w-20 h-20 rounded-lg object-cover border border-stone-200 flex-shrink-0 bg-stone-100"
            />

            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-bold text-stone-900 truncate">{item.name}</h4>
                  <span className="text-sm font-bold text-stone-900 ml-2 font-mono">₹{item.price}</span>
                </div>
                <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">{item.description}</p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-100 mt-2">
                <button
                  type="button"
                  onClick={() => handleToggleAvailable(item.id)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                    item.isAvailable
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-stone-100 text-stone-600 border-stone-200'
                  }`}
                >
                  {item.isAvailable ? 'Available' : 'Unavailable'}
                </button>

                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 cursor-pointer transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 rounded-lg bg-stone-100 text-stone-400 hover:text-red-600 hover:bg-stone-200 cursor-pointer transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isAddingOrEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-5 shadow-2xl relative space-y-4 animate-in fade-in zoom-in-95 duration-150">
            
            <button
              type="button"
              onClick={() => setIsAddingOrEditing(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 cursor-pointer transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-stone-900">
              {editingItem ? 'Edit Dish Details' : 'Add New Dish'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Dish Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Price (₹)</label>
                <input
                  type="number"
                  required
                  min={10}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all font-mono"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">Dish Image</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {image ? (
                  <div className="flex items-center space-x-3 p-2.5 bg-stone-50 border border-stone-200 rounded-xl">
                    <img
                      src={image}
                      alt="Dish preview"
                      className="w-14 h-14 rounded-lg object-cover border border-stone-200 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-800">Dish Photo Added</p>
                      <p className="text-[10px] text-stone-500">Image selected from device</p>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 rounded-md bg-stone-200 hover:bg-stone-300 text-stone-800 text-[11px] font-semibold border border-stone-300 cursor-pointer transition-all flex items-center space-x-1"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Change Photo</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setImage('');
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="px-2.5 py-1 rounded-md bg-white hover:bg-stone-100 text-stone-500 hover:text-red-600 text-[11px] font-semibold border border-stone-200 cursor-pointer transition-all flex items-center space-x-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="w-full p-4 border-2 border-dashed border-stone-300 hover:border-indigo-600 rounded-xl bg-stone-50 hover:bg-indigo-50/20 flex flex-col items-center justify-center cursor-pointer transition-all group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center mb-1.5 group-hover:text-indigo-600 transition-colors">
                      <Upload className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-stone-800 group-hover:text-indigo-600">
                      {isUploadingImage ? 'Processing photo...' : 'Click to Upload Dish Image'}
                    </span>
                    <span className="text-[10px] text-stone-400 mt-0.5">
                      Upload from phone or computer (JPG, PNG, WebP)
                    </span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chefSpec"
                  checked={isChefSpecial}
                  onChange={(e) => setIsChefSpecial(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-600 border-stone-300"
                />
                <label htmlFor="chefSpec" className="text-stone-800 font-medium cursor-pointer">
                  Tag as Chef's Special
                </label>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-wide shadow-md shadow-indigo-500/20 mt-2 cursor-pointer transition-all"
              >
                {editingItem ? 'Save Changes' : 'Create Dish'}
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
