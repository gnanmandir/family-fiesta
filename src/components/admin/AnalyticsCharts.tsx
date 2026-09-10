import React from 'react';
import { Order } from '../../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

interface AnalyticsChartsProps {
  orders: Order[];
}

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ orders }) => {
  // Aggregate Most Popular Food Items
  const foodCounts: Record<string, number> = {};
  orders.forEach((o) => {
    o.items.forEach((item) => {
      foodCounts[item.name] = (foodCounts[item.name] || 0) + item.quantity;
    });
  });

  const popularFoodData = Object.entries(foodCounts)
    .map(([name, count]) => ({
      fullName: name,
      name: name.length > 20 ? name.substring(0, 20) + '...' : name,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="w-full space-y-4">
      {/* Popular Food Chart */}
      <div className="p-5 sm:p-6 rounded-xl bg-white border border-stone-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm sm:text-base font-bold text-stone-900 tracking-tight">
            Most Ordered Dishes
          </h3>
          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
            Live Quantities
          </span>
        </div>

        {popularFoodData.length > 0 ? (
          <>
            <div className="h-64 sm:h-72 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularFoodData} margin={{ top: 24, right: 15, left: -15, bottom: 30 }}>
                  <XAxis dataKey="name" stroke="#78716c" fontSize={11} angle={-20} textAnchor="end" interval={0} fontWeight="500" />
                  <YAxis stroke="#78716c" fontSize={11} allowDecimals={false} domain={[0, 'dataMax + 2']} fontWeight="500" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E7E5E4',
                      borderRadius: '8px',
                      color: '#1C1917',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                      fontWeight: '600',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${value} Portions`, 'Quantity Ordered']}
                  />
                  <Bar dataKey="count" fill="#4F46E5" radius={[6, 6, 0, 0]}>
                    <LabelList dataKey="count" position="top" fill="#1C1917" fontSize={12} fontWeight="bold" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Exact Digit List Breakdown */}
            <div className="pt-4 border-t border-stone-100 space-y-2.5">
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                Dish Order Breakdown
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
                {popularFoodData.map((item, idx) => (
                  <div
                    key={item.fullName}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-stone-50 border border-stone-200 shadow-xs"
                  >
                    <span className="text-stone-800 font-medium truncate pr-1" title={item.fullName}>
                      <span className="text-indigo-600 font-bold mr-1">#{idx + 1}</span>
                      {item.fullName}
                    </span>
                    <span className="font-bold text-stone-900 px-2 py-0.5 rounded bg-white border border-stone-200 text-xs shrink-0 font-mono">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center text-slate-500 text-xs font-medium">
            No orders placed yet to calculate item popularity.
          </div>
        )}
      </div>
    </div>
  );
};

