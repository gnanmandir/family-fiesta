import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Order, OrderStatus, Student } from '../../types';
import { generateAndDownloadPDFReceipt } from '../../utils/pdfGenerator';
import { INITIAL_STUDENTS } from '../../data/students';
import { formatNameDisplay } from '../../utils/nameFormatter';
import gnanMandirStamp from '../../assets/images/gnan_mandir_stamp.png';
import {
  Search,
  Filter,
  Eye,
  X,
  CheckCircle2,
  ChefHat,
  Sparkles,
  Download,
  FileSpreadsheet,
  Users,
  IndianRupee,
  ShoppingBag,
  Copy,
  Check,
  Printer,
  FileText,
  Trash2,
  ShieldAlert,
  EyeOff,
} from 'lucide-react';

interface OrderTableProps {
  orders: Order[];
  students?: Student[];
  onUpdateStatus?: (orderNumber: string, status: OrderStatus) => void;
  onDeleteOrder?: (orderNumber: string) => void;
}

export function getOrderGmNo(order: Order, studentsList?: Student[]): number {
  const pool = studentsList && studentsList.length > 0 ? studentsList : INITIAL_STUDENTS;
  const found = pool.find(
    (s) =>
      s.id.toLowerCase() === order.studentId.toLowerCase() ||
      s.fullName.toLowerCase() === (order.fullName || '').toLowerCase() ||
      s.fullName.toLowerCase() === order.studentName.toLowerCase()
  );
  if (found && found.gmNo) return found.gmNo;

  const match = order.studentId.match(/-(\d+)$/);
  if (match) return parseInt(match[1], 10);

  const num = parseInt(order.studentId, 10);
  if (!isNaN(num)) return num;

  return 999999;
}

export const OrderTable: React.FC<OrderTableProps> = ({
  orders,
  students,
  onDeleteOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<Order | null>(null);

  // Password-protected Wipe Modal State
  const [orderToWipe, setOrderToWipe] = useState<Order | null>(null);
  const [wipePassword, setWipePassword] = useState('');
  const [wipePasswordError, setWipePasswordError] = useState('');
  const [showWipePassword, setShowWipePassword] = useState(false);
  const [isWipingInProgress, setIsWipingInProgress] = useState(false);

  const handleOpenWipeModal = (order: Order) => {
    setOrderToWipe(order);
    setWipePassword('');
    setWipePasswordError('');
    setShowWipePassword(false);
  };

  const handleConfirmWipeWithPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToWipe || !onDeleteOrder) return;

    const entered = wipePassword.trim();
    if (!entered) {
      setWipePasswordError('Please enter password to authorize.');
      return;
    }

    let currentAdminPass = 'niruma0212';
    try {
      const { api } = await import('../../services/api');
      const creds = await api.getAdminCredentials();
      if (creds && creds.password) {
        currentAdminPass = creds.password;
      }
    } catch (err) {}

    const pool = students && students.length > 0 ? students : INITIAL_STUDENTS;
    const foundStudent = pool.find(
      (s) =>
        s.id.toLowerCase() === orderToWipe.studentId.toLowerCase() ||
        s.fullName.toLowerCase() === (orderToWipe.fullName || '').toLowerCase() ||
        s.fullName.toLowerCase() === orderToWipe.studentName.toLowerCase()
    );
    const studentBirthDate = (foundStudent?.birthDate || '').trim();

    const isAuthorized =
      entered === 'niruma0212' ||
      entered === currentAdminPass ||
      (studentBirthDate && entered === studentBirthDate);

    if (!isAuthorized) {
      setWipePasswordError('Incorrect password. Authorization failed.');
      return;
    }

    setIsWipingInProgress(true);
    try {
      await onDeleteOrder(orderToWipe.orderNumber);
      alert(`Order #${orderToWipe.orderNumber} wiped successfully!`);
      setOrderToWipe(null);
      setWipePassword('');
      setWipePasswordError('');
    } catch (err: any) {
      console.error('Failed to wipe order:', err);
      setWipePasswordError(`Failed to wipe order: ${err?.message || 'Please try again.'}`);
    } finally {
      setIsWipingInProgress(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    const gmNo = getOrderGmNo(o, students);
    return (
      o.orderNumber.toLowerCase().includes(query) ||
      o.studentName.toLowerCase().includes(query) ||
      o.parentName.toLowerCase().includes(query) ||
      o.fullName.toLowerCase().includes(query) ||
      o.studentId.toLowerCase().includes(query) ||
      (gmNo !== 999999 && String(gmNo).includes(query))
    );
  });

  // Sort orders by GM No in ascending order (1, 2, 3, ...)
  const sortedOrders = [...filteredOrders].sort(
    (a, b) => getOrderGmNo(a, students) - getOrderGmNo(b, students)
  );

  // Calculate sheet totals
  const sheetTotalRevenue = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const sheetTotalPeople = filteredOrders.reduce((sum, o) => sum + o.peopleCount, 0);

  // Download single receipt as text file
  const handleDownloadSingleReceipt = (o: Order) => {
    const cleanStudentName = o.studentName.replace(/\s*\(.*\)/, '').trim();
    const gmNo = getOrderGmNo(o, students);
    const receiptText = `=========================================
  FAMILY FIESTA - RECEIPT
=========================================
GM Number    : ${gmNo !== 999999 ? gmNo : '-'}
Date & Time  : ${o.dateDisplay || ''} ${o.timeDisplay}
Status       : ${o.status}

---------------- STUDENT DETAILS ----------------
Student Name : ${cleanStudentName}
Parent Name  : ${o.parentName}
Full Name    : ${o.fullName}
Group Size   : ${o.peopleCount} Person(s)
Budget Limit : ₹${o.allowedBudget}

---------------- ORDERED ITEMS ------------------
${o.items.map((i) => `${i.quantity}x ${i.name.padEnd(24)} ₹${i.total}`).join('\n')}

-------------------------------------------------
TOTAL AMOUNT : ₹${o.totalAmount}
BUDGET CHECK : ${o.totalAmount <= o.allowedBudget ? 'PASSED (Within Budget)' : 'EXCEEDED BUDGET'}
NOTE         : All orders are completely cashless.
=========================================
Thank you for ordering from Family Fiesta!
`;

    const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Family_Fiesta_Receipt_${cleanStudentName.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export all orders directly to Microsoft Excel (.xlsx)
  const handleExportExcel = () => {
    if (orders.length === 0) {
      alert('No order data available to export.');
      return;
    }

    // Get all unique food items across all orders
    const allFoodItems = new Set<string>();
    orders.forEach((o) => {
      o.items.forEach((i) => {
        allFoodItems.add(i.name);
      });
    });
    const foodItemsArray = Array.from(allFoodItems).sort();

    // Sheet 1: Master Orders Registry
    const ordersData = orders.map((o, idx) => {
      const budgetStatus = o.totalAmount <= o.allowedBudget ? 'Within Budget' : 'Exceeded';
      const gmNo = getOrderGmNo(o, students);

      const row: any = {
        'S.No': idx + 1,
        'GM No.': gmNo !== 999999 ? gmNo : '',
        'Student Name': o.fullName || o.studentName,
        'People Count': o.peopleCount,
        'Allowed Budget (INR)': o.allowedBudget,
        'Order Total (INR)': o.totalAmount,
        'Budget Status': budgetStatus,
      };

      // Add dedicated column for each food item with its quantity
      foodItemsArray.forEach((foodName) => {
        const item = o.items.find((i) => i.name === foodName);
        row[foodName] = item ? item.quantity : 0;
      });

      // Add trailing columns
      row['Order Date'] = o.dateDisplay;
      row['Order Time'] = o.timeDisplay;

      return row;
    });

    const wb = XLSX.utils.book_new();
    const wsOrders = XLSX.utils.json_to_sheet(ordersData);

    // Set professional column widths for Excel
    const cols = [
      { wch: 6 },  // S.No
      { wch: 12 }, // GM No.
      { wch: 24 }, // Student Name
      { wch: 13 }, // People Count
      { wch: 18 }, // Allowed Budget
      { wch: 16 }, // Order Total
      { wch: 14 }, // Budget Status
    ];

    // Add width for each food item column
    foodItemsArray.forEach((name) => {
      cols.push({ wch: Math.max(name.length, 10) });
    });

    // Add width for trailing columns
    cols.push(
      { wch: 14 }, // Order Date
      { wch: 12 }  // Order Time
    );

    wsOrders['!cols'] = cols;

    XLSX.utils.book_append_sheet(wb, wsOrders, 'All Orders');

    // Sheet 2: Food Stall Aggregation Summary
    const itemCounts: Record<string, { name: string; totalQty: number; totalRevenue: number }> = {};
    orders.forEach((o) => {
      o.items.forEach((it) => {
        if (!itemCounts[it.id]) {
          itemCounts[it.id] = { name: it.name, totalQty: 0, totalRevenue: 0 };
        }
        itemCounts[it.id].totalQty += it.quantity;
        itemCounts[it.id].totalRevenue += it.total;
      });
    });

    const itemSummaryData = Object.values(itemCounts).map((it, idx) => ({
      'S.No': idx + 1,
      'Food Item Name': it.name,
      'Total Portions Ordered': it.totalQty,
      'Total Revenue (INR)': it.totalRevenue,
    }));

    const wsItems = XLSX.utils.json_to_sheet(itemSummaryData);
    wsItems['!cols'] = [{ wch: 6 }, { wch: 32 }, { wch: 24 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsItems, 'Food Stall Summary');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Family_Fiesta_Food_Orders_${dateStr}.xlsx`);
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner Sheet Action & Metrics Bar */}
      <div className="bg-white border border-stone-200 p-4 rounded-xl shadow-xs space-y-4">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-stone-700" />
              <h2 className="text-base font-bold text-stone-900">All Master Orders Sheet</h2>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Live comprehensive registry of all {orders.length} student food orders for Family Fiesta 2026.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Export to Excel */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold tracking-wide shadow-xs active:scale-95 flex items-center space-x-2 cursor-pointer transition-all"
              title="Export all orders directly to Excel (.xlsx)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Export to Excel</span>
            </button>
          </div>
        </div>

        {/* Quick Sheet Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center">
            <div>
              <div className="text-[10px] text-stone-500 uppercase font-semibold">Total Orders</div>
              <div className="text-lg font-bold text-stone-900 font-mono">{filteredOrders.length}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center">
            <div>
              <div className="text-[10px] text-stone-500 uppercase font-semibold">Total Revenue</div>
              <div className="text-lg font-bold text-stone-900 font-mono">₹{sheetTotalRevenue}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex justify-between items-center">
            <div>
              <div className="text-[10px] text-stone-500 uppercase font-semibold">Total Attendees</div>
              <div className="text-lg font-bold text-stone-900 font-mono">{sheetTotalPeople}</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-white border border-stone-200 text-stone-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

      </div>

      {/* Search Controls */}
      <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-xs">
        <div className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name or GM No..."
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-stone-900 placeholder-stone-400 text-xs focus:outline-none focus:border-indigo-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Full Detailed Spreadsheet Table Container */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="p-3.5 whitespace-nowrap">GM No.</th>
                <th className="p-3.5 whitespace-nowrap">Student Name</th>
                <th className="p-3.5 whitespace-nowrap text-center">Group</th>
                <th className="p-3.5 whitespace-nowrap min-w-[200px]">Ordered Items Breakdown</th>
                <th className="p-3.5 whitespace-nowrap">Total ₹</th>
                <th className="p-3.5 whitespace-nowrap">Budget Status</th>
                <th className="p-3.5 whitespace-nowrap">Date / Time</th>
                <th className="p-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-stone-700">
              {sortedOrders.length > 0 ? (
                sortedOrders.map((order) => {
                  const itemsSummary = order.items
                    .map((i) => `${i.quantity}x ${i.name} (₹${i.total})`)
                    .join(', ');

                  const isWithinBudget = order.totalAmount <= order.allowedBudget;
                  const studentName = order.fullName || order.studentName.replace(/\s*\(.*\)/, '').trim();
                  const gmNo = getOrderGmNo(order, students);

                  return (
                    <tr key={order.orderNumber} className="hover:bg-stone-50/80 transition-colors">
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-mono font-bold text-stone-900 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded text-xs">
                          {gmNo !== 999999 ? gmNo : '-'}
                        </span>
                      </td>
                      <td className="p-3.5 font-bold text-stone-900 whitespace-nowrap">
                        {studentName}
                      </td>
                      <td className="p-3.5 font-bold text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200">
                          {order.peopleCount} p.
                        </span>
                      </td>
                      <td className="p-3.5 text-stone-600 max-w-xs truncate font-medium" title={itemsSummary}>
                        {itemsSummary}
                      </td>
                      <td className="p-3.5 font-bold text-stone-900 text-sm whitespace-nowrap font-mono">
                        ₹{order.totalAmount}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isWithinBudget
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                              : 'bg-amber-50 border border-amber-300 text-amber-900'
                          }`}
                        >
                          {isWithinBudget ? `OK (Max ₹${order.allowedBudget})` : `Over by ₹${order.totalAmount - order.allowedBudget}`}
                        </span>
                      </td>
                      <td className="p-3.5 text-stone-500 text-[11px] whitespace-nowrap font-mono">
                        {order.dateDisplay || ''} {order.timeDisplay}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForReceipt(order)}
                            title="View Full Order Receipt & Details"
                            className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold inline-flex items-center space-x-1 border border-stone-200 active:scale-95 transition-all cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                          {onDeleteOrder && (
                            <button
                              type="button"
                              onClick={() => handleOpenWipeModal(order)}
                              title="Wipe/Delete Order"
                              className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-semibold inline-flex items-center space-x-1 active:scale-95 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                              <span>Wipe</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-stone-500 font-medium">
                    No order records found matching your query.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Order Detail Sheet Modal */}
      {selectedOrderForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto">
          <div className="printable-receipt w-full max-w-lg max-h-[90vh] flex flex-col bg-white border border-stone-200 rounded-2xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 overflow-hidden my-auto">
            <button
              type="button"
              onClick={() => setSelectedOrderForReceipt(null)}
              className="no-print absolute top-3.5 right-3.5 p-2 rounded-lg bg-stone-100 text-stone-600 hover:bg-stone-200 hover:text-stone-900 cursor-pointer transition-all z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Fixed Header */}
            <div className="p-5 sm:p-6 border-b border-stone-100 shrink-0">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                Order Receipt
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-stone-900 mt-1 pr-8">
                {formatNameDisplay(selectedOrderForReceipt.fullName || selectedOrderForReceipt.studentName)}
              </h3>
              <p className="text-xs text-stone-500">
                Placed on {selectedOrderForReceipt.dateDisplay || ''} at {selectedOrderForReceipt.timeDisplay}
              </p>
            </div>

            {/* Scrollable Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-stone-50 p-3.5 rounded-xl border border-stone-200">
                <div>
                  <span className="text-stone-400 text-[10px] block uppercase font-bold">Student First Name</span>
                  <span className="font-bold text-stone-900 text-sm">{formatNameDisplay(selectedOrderForReceipt.studentName).split(' ')[0] || selectedOrderForReceipt.studentName}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] block uppercase font-bold">Parent Name</span>
                  <span className="font-bold text-stone-900 text-sm">{selectedOrderForReceipt.parentName}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-stone-200/60">
                  <span className="text-stone-400 text-[10px] block uppercase font-bold">Full Registered Name</span>
                  <span className="font-semibold text-stone-900">{formatNameDisplay(selectedOrderForReceipt.fullName || selectedOrderForReceipt.studentName)}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] block uppercase font-bold">GM No.</span>
                  <span className="font-semibold text-stone-900 font-mono">
                    {getOrderGmNo(selectedOrderForReceipt, students) !== 999999 ? getOrderGmNo(selectedOrderForReceipt, students) : selectedOrderForReceipt.studentId}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] block uppercase font-bold">Guests</span>
                  <span className="font-semibold text-stone-900">{selectedOrderForReceipt.peopleCount}</span>
                </div>
                <div>
                  <span className="text-stone-400 text-[10px] block uppercase font-bold">Budget</span>
                  <span className="font-semibold text-stone-900 font-mono">₹{selectedOrderForReceipt.allowedBudget}</span>
                </div>
                <div className="col-span-2 pt-1 border-t border-stone-200/60 font-mono text-[10px] text-stone-400">
                  Device ID: {selectedOrderForReceipt.deviceId}
                </div>
              </div>

              <div className="border-t border-stone-100 pt-3 space-y-2">
                <div className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                  Line Items & Quantities
                </div>
                <div className="space-y-1.5 pr-1">
                  {selectedOrderForReceipt.items.map((it) => (
                    <div key={it.id} className="flex justify-between text-xs py-1.5 px-3 rounded-lg bg-stone-50 border border-stone-200 text-stone-800">
                      <span className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-stone-900 font-bold">{it.quantity}×</strong> {it.name}
                        {it.portion && (
                          <span className="text-[10px] text-stone-500 font-mono bg-white px-1 py-0.5 rounded border border-stone-200">
                            ({it.portion})
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-stone-900 font-mono">₹{it.total}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Official Gnan Mandir Stamp Verification */}
              <div className="flex items-center justify-between border-t border-stone-100 pt-3">
                <div className="text-[10px] text-stone-400">
                  <span className="font-semibold text-stone-700 block">Official Voucher</span>
                  <span>Issued by Gnan Mandir</span>
                </div>
                <img
                  src={gnanMandirStamp}
                  alt="Gnan Mandir Stamp"
                  className="h-11 sm:h-12 w-auto object-contain"
                />
              </div>
            </div>

            {/* Fixed Footer with Total & Actions */}
            <div className="p-4 sm:p-5 border-t border-stone-100 bg-stone-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div>
                <span className="text-stone-400 text-[10px] block font-bold uppercase tracking-wider">Total Bill</span>
                <span className="text-indigo-600 font-bold text-xl sm:text-2xl font-mono">₹{selectedOrderForReceipt.totalAmount}</span>
              </div>
              <div className="no-print flex items-center space-x-2 flex-wrap gap-y-2">
                <button
                  type="button"
                  onClick={() => generateAndDownloadPDFReceipt(selectedOrderForReceipt)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs tracking-wide flex items-center space-x-1.5 shadow-md shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
                  title="Download official PDF receipt"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSingleReceipt(selectedOrderForReceipt)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                  title="Save order receipt as text file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>TXT</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderForReceipt(null)}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Password-protected Wipe Order Authorization Modal */}
      {orderToWipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Authorize Order Wipe</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Password Verification Required</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOrderToWipe(null);
                  setWipePassword('');
                  setWipePasswordError('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-red-50/80 border border-red-200 rounded-xl p-3.5 mb-4 text-xs text-red-900 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <span>Student: {orderToWipe.fullName || orderToWipe.studentName}</span>
              </div>
              <div className="text-red-700">
                Order Token: <span className="font-mono font-bold">#{orderToWipe.orderNumber}</span> | Total:{' '}
                <span className="font-mono font-bold">₹{orderToWipe.totalAmount}</span>
              </div>
              <p className="text-[11px] text-red-600/90 pt-1">
                ⚠️ This will permanently delete this order and allow the student to place a fresh order.
              </p>
            </div>

            <form onSubmit={handleConfirmWipeWithPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Admin / System Password
                </label>
                <div className="relative">
                  <input
                    type={showWipePassword ? 'text' : 'password'}
                    value={wipePassword}
                    onChange={(e) => {
                      setWipePassword(e.target.value);
                      if (wipePasswordError) setWipePasswordError('');
                    }}
                    placeholder="Enter password to authorize wipe..."
                    autoFocus
                    required
                    className={`w-full pl-3 pr-10 py-2.5 bg-white border rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
                      wipePasswordError
                        ? 'border-red-300 focus:ring-red-200 text-red-900'
                        : 'border-slate-200 focus:ring-red-500/20 focus:border-red-500 text-slate-900'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowWipePassword(!showWipePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showWipePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {wipePasswordError && (
                  <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center space-x-1">
                    <span>{wipePasswordError}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  disabled={isWipingInProgress}
                  onClick={() => {
                    setOrderToWipe(null);
                    setWipePassword('');
                    setWipePasswordError('');
                  }}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWipingInProgress || !wipePassword.trim()}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs whitespace-nowrap cursor-pointer transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isWipingInProgress ? 'Wiping Order...' : 'Authorize & Wipe Order'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
