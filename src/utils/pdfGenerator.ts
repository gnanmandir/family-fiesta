import jsPDF from 'jspdf';
import { Order } from '../types';

import { INITIAL_STUDENTS } from '../data/students';
import familyFiestaLogo from '../assets/images/family_fiesta_logo_new.png';
import gnanMandirStamp from '../assets/images/gnan_mandir_stamp.png';

import { formatNameDisplay } from './nameFormatter';

export const generateAndDownloadPDFReceipt = async (order: Order) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const student = INITIAL_STUDENTS.find((s) => s.id === order.studentId || s.fullName === order.fullName);
  const cleanStudentName = formatNameDisplay(order.studentName || order.fullName || '');
  const gmNumber = student ? String(student.gmNo) : 'N/A';
  const grade = student ? student.grade : 'Gurukul Roster';

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(img);
    });
  };

  const [logoImg, stampImg] = await Promise.all([
    loadImage(familyFiestaLogo),
    loadImage(gnanMandirStamp),
  ]);

  // Executive Page Borders
  doc.setDrawColor(88, 28, 135);
  doc.setLineWidth(0.6);
  doc.rect(10, 10, 190, 277);

  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.2);
  doc.rect(12, 12, 186, 273);

  // 1. Centered Festival Logo
  let logoY = 16;
  let logoHeight = 0;
  if (logoImg.width > 0) {
    const logoWidth = 48;
    logoHeight = (logoImg.height * logoWidth) / logoImg.width;
    doc.addImage(logoImg, 'JPEG', 105 - (logoWidth / 2), logoY, logoWidth, logoHeight);
  }

  // 2. Official Header Banner
  let y = logoY + logoHeight + 4;
  doc.setFillColor(88, 28, 135);
  doc.roundedRect(18, y, 174, 10, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('OFFICIAL FOOD COUPONS', 105, y + 6.8, { align: 'center' });

  // 3. Two-Column Structured Details Card (no line overlaps)
  y += 15;
  const cardHeight = 36;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(18, y, 174, cardHeight, 2.5, 2.5, 'FD');

  // Vertical Separator between columns
  doc.setDrawColor(226, 232, 240);
  doc.line(105, y + 4, 105, y + cardHeight - 4);

  // Left: Student Details
  doc.setTextColor(88, 28, 135);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('STUDENT INFORMATION', 24, y + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Student Name:', 24, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(cleanStudentName, 52, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('GM Number:', 24, y + 21);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(gmNumber, 52, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Standard:', 24, y + 28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(grade, 52, y + 28);

  // Right: Order Details
  doc.setTextColor(88, 28, 135);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('EVENT DETAILS', 112, y + 7);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Attendees:', 112, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${order.peopleCount} Person(s)`, 140, y + 14);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Order Date:', 112, y + 21);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(order.dateDisplay || '', 140, y + 21);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Order Time:', 112, y + 28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(order.timeDisplay || '', 140, y + 28);

  // 4. Ordered Items Table
  y += cardHeight + 6;

  // Table Header
  doc.setFillColor(88, 28, 135);
  doc.roundedRect(18, y, 174, 9, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ITEM DESCRIPTION', 24, y + 6);
  doc.text('PRICE', 120, y + 6, { align: 'right' });
  doc.text('QTY', 145, y + 6, { align: 'center' });
  doc.text('TOTAL', 186, y + 6, { align: 'right' });

  y += 9;

  // Table Rows
  order.items.forEach((item, index) => {
    const rowHeight = 8.5;
    if (index % 2 === 0) {
      doc.setFillColor(250, 245, 255);
      doc.rect(18, y, 174, rowHeight, 'F');
    }

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(item.name, 24, y + 5.5);
    doc.text(`Rs. ${item.price}`, 120, y + 5.5, { align: 'right' });
    doc.text(`${item.quantity}`, 145, y + 5.5, { align: 'center' });
    doc.text(`Rs. ${item.total}`, 186, y + 5.5, { align: 'right' });
    y += rowHeight;

    if (y > 210) {
      doc.addPage();
      y = 20;
    }
  });

  // 5. Total Summary Box
  y += 4;
  doc.setFillColor(255, 241, 230);
  doc.setDrawColor(254, 215, 170);
  doc.setLineWidth(0.3);
  doc.roundedRect(105, y, 87, 12, 2, 2, 'FD');

  doc.setTextColor(88, 28, 135);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('TOTAL:', 112, y + 8);

  doc.setTextColor(234, 88, 12);
  doc.setFontSize(13);
  doc.text(`Rs. ${order.totalAmount}`, 186, y + 8, { align: 'right' });

  // 6. Verification & Instructions Box (Anchored Elegantly in the Lower Section)
  const footerBoxY = Math.max(y + 16, 210);
  const footerBoxHeight = 58;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(18, footerBoxY, 174, footerBoxHeight, 2.5, 2.5, 'FD');

  // Left Notice & Instructions
  doc.setTextColor(88, 28, 135);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('OFFICIAL VERIFICATION & TERMS', 24, footerBoxY + 8);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('• Please present this digital or printed voucher at the food stall counters.', 24, footerBoxY + 16);
  doc.text('• Valid only for the items specified above during Family Fiesta 2026.', 24, footerBoxY + 23);
  doc.text('• Non-transferable and cannot be exchanged or redeemed for cash.', 24, footerBoxY + 30);
  doc.text('• System generated official digital coupon issued by Gnan Mandir.', 24, footerBoxY + 37);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.text('May you enjoy a blessed, spiritually uplifting festival feast!', 24, footerBoxY + 47);

  // Right Stamp Embedded inside the Verification Box
  if (stampImg.width > 0) {
    const stampWidth = 48;
    const stampHeight = (stampImg.height * stampWidth) / stampImg.width;
    const stampX = 140;
    const stampY = footerBoxY + (footerBoxHeight - stampHeight) / 2;
    doc.addImage(stampImg, 'PNG', stampX, stampY, stampWidth, stampHeight);
  }

  doc.save(`Family_Fiesta_Receipt_GM_${gmNumber}.pdf`);
};
