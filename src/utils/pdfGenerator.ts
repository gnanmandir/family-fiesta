import jsPDF from 'jspdf';
import { Order } from '../types';

import { INITIAL_STUDENTS } from '../data/students';
import familyFiestaLogo from '../assets/images/family_fiesta_logo_new.png';
import gnanMandirStamp from '../assets/images/gnan_mandir_stamp.jpg';

import { formatNameDisplay } from './nameFormatter';

export const generateAndDownloadPDFReceipt = async (order: Order) => {
  const doc = new jsPDF();
  const student = INITIAL_STUDENTS.find((s) => s.id === order.studentId || s.fullName === order.fullName);
  const cleanStudentName = formatNameDisplay(order.studentName);
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

  // Deep Purple: 88, 28, 135
  // Vibrant Orange: 234, 88, 12

  // 1. Logo
  let imgHeight = 0;
  if (logoImg.width > 0) {
    const imgWidth = 50; 
    imgHeight = (logoImg.height * imgWidth) / logoImg.width;
    doc.addImage(logoImg, 'JPEG', 105 - (imgWidth / 2), 10, imgWidth, imgHeight);
  }

  // 2. Banner
  let y = 15 + imgHeight;
  doc.setFillColor(88, 28, 135);
  doc.rect(15, y, 180, 12, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('OFFICIAL FOOD COUPONS', 105, y + 8, { align: 'center' });

  y += 20;

  // 3. Two Column Details Box
  // Left: Student Info
  doc.setTextColor(88, 28, 135);
  doc.setFontSize(10);
  doc.text('STUDENT DETAILS', 20, y);
  
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`Name: ${cleanStudentName}`, 20, y + 7);
  doc.text(`GM No: ${gmNumber}`, 20, y + 13);
  doc.text(`Grade: ${grade}`, 20, y + 19);
  doc.text(`Guests: ${order.peopleCount} Person(s)`, 20, y + 25);

  // Right: Order Info
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(88, 28, 135);
  doc.text('ORDER DETAILS', 120, y);
  
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${order.dateDisplay || ''}`, 120, y + 7);
  doc.text(`Time: ${order.timeDisplay || ''}`, 120, y + 13);
  
  // Line Separator
  y += 25;
  doc.setDrawColor(200, 200, 220);
  doc.setLineWidth(0.5);
  doc.line(15, y, 195, y);
  y += 10;

  // 4. Ordered Items Table Header
  doc.setFillColor(88, 28, 135);
  doc.rect(15, y, 180, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Item Description', 20, y + 7);
  doc.text('Price', 120, y + 7, { align: 'right' });
  doc.text('Qty', 150, y + 7, { align: 'center' });
  doc.text('Total', 190, y + 7, { align: 'right' });

  y += 10;

  // 5. Table Rows
  order.items.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(250, 245, 255);
      doc.rect(15, y, 180, 8, 'F');
    }
    
    doc.setTextColor(40, 40, 40);
    doc.setFont('helvetica', 'normal');
    doc.text(item.name, 20, y + 5.5);
    doc.text(`Rs. ${item.price}`, 120, y + 5.5, { align: 'right' });
    doc.text(`${item.quantity}`, 150, y + 5.5, { align: 'center' });
    doc.text(`Rs. ${item.total}`, 190, y + 5.5, { align: 'right' });
    y += 8;

    if (y > 230) {
      doc.addPage();
      y = 20;
    }
  });

  // 6. Total Summary
  y += 5;
  doc.setFillColor(255, 240, 230);
  doc.rect(110, y, 85, 12, 'F');
  
  doc.setTextColor(88, 28, 135);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('TOTAL:', 115, y + 8);
  
  doc.setTextColor(234, 88, 12);
  doc.text(`Rs. ${order.totalAmount}`, 190, y + 8, { align: 'right' });

  // 7. Footer / Official Stamp
  const stampY = 245;
  if (stampImg.width > 0) {
    const stampSize = 42;
    doc.addImage(stampImg, 'JPEG', 145, stampY, stampSize, stampSize);
  }
  
  // Disclaimer Texts (Bottom Left)
  doc.setTextColor(100, 100, 100);
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text('• Please present this receipt at the food counter.', 15, stampY - 5);
  doc.text('• Not valid for cash exchange.', 15, stampY);
  doc.text('• System generated official digital token.', 15, stampY + 5);

  doc.save(`Family_Fiesta_Receipt_GM_${gmNumber}.pdf`);
};
