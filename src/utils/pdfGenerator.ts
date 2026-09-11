import jsPDF from 'jspdf';
import { Order } from '../types';

import { INITIAL_STUDENTS } from '../data/students';
import familyFiestaLogo from '../assets/images/family_fiesta_logo_new.png';

export const generateAndDownloadPDFReceipt = async (order: Order) => {
  const doc = new jsPDF();
  const cleanStudentName = order.studentName.replace(/\s*\(.*\)/, '').trim();
  const student = INITIAL_STUDENTS.find((s) => s.id === order.studentId || s.fullName === order.fullName);
  const gmNumber = student ? String(student.gmNo) : 'N/A';

  const img = new Image();
  img.src = familyFiestaLogo;
  await new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve; // Resolve anyway to avoid hanging the receipt download
  });

  // Header Logo (Centered, no background)
  let imgHeight = 0;
  if (img.width > 0) {
    const imgWidth = 60; 
    imgHeight = (img.height * imgWidth) / img.width;
    doc.addImage(img, 'JPEG', 105 - (imgWidth / 2), 10, imgWidth, imgHeight);
  }

  // Order Summary Box
  const summaryBoxY = 15 + imgHeight; // dynamically position below the logo
  doc.setDrawColor(180, 150, 240);
  doc.setLineWidth(0.5);
  doc.roundedRect(15, summaryBoxY, 180, 32, 3, 3);

  const dy = summaryBoxY - 45;

  doc.setTextColor(30, 16, 60);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`GM Number   : ${gmNumber}`, 22, 55 + dy);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  doc.text(`Date & Time : ${order.dateDisplay || ''} ${order.timeDisplay}`, 22, 63 + dy);
  doc.text(`Guests : ${order.peopleCount}`, 140, 63 + dy);
  doc.text(`Budget : Rs. ${order.allowedBudget}`, 22, 71 + dy);

  // Student & Parent Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 16, 60);
  doc.text('STUDENT & PARENT DETAILS', 15, 88 + dy);

  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 220);
  doc.line(15, 91 + dy, 195, 91 + dy);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text(`Student Name : ${cleanStudentName}`, 20, 99 + dy);
  doc.text(`GM Number    : ${gmNumber}`, 120, 99 + dy);
  doc.text(`Parent Name  : ${order.parentName}`, 20, 107 + dy);

  // Ordered Items
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 16, 60);
  doc.text('ORDERED ITEMS', 15, 122 + dy);
  doc.line(15, 125 + dy, 195, 125 + dy);

  // Table Header
  doc.setFillColor(240, 235, 255);
  doc.rect(15, 129 + dy, 180, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 16, 60);
  doc.text('Item Description', 20, 135 + dy);
  doc.text('Qty', 125, 135 + dy, { align: 'center' });
  doc.text('Price', 155, 135 + dy, { align: 'right' });
  doc.text('Total', 190, 135 + dy, { align: 'right' });

  let y = 143 + dy;
  order.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(250, 250, 253);
      doc.rect(15, y - 5, 180, 8, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(item.name, 20, y);
    doc.text(`${item.quantity}`, 125, y, { align: 'center' });
    doc.text(`Rs. ${item.price}`, 155, y, { align: 'right' });
    doc.text(`Rs. ${item.total}`, 190, y, { align: 'right' });
    y += 8;
  });

  // Total Summary
  doc.setLineWidth(0.5);
  doc.setDrawColor(30, 16, 60);
  doc.line(15, y, 195, y);
  y += 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 16, 60);
  doc.text('TOTAL AMOUNT PAID:', 100, y);
  doc.setTextColor(180, 90, 0);
  doc.text(`Rs. ${order.totalAmount}`, 190, y, { align: 'right' });

  // Footer
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Thank you for ordering with Family Fiesta!', 105, 280, { align: 'center' });

  doc.save(`Family_Fiesta_Receipt_GM_${gmNumber}_${cleanStudentName.replace(/\s+/g, '_')}.pdf`);
};
