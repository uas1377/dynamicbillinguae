import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const compressImage = (canvas, quality = 0.7) => {
  return canvas.toDataURL('image/jpeg', quality);
};

export const generateReceiptPDF = async (receiptElement) => {
  try {
    const canvas = await html2canvas(receiptElement, {
      scale: 3,
      useCORS: true,
      logging: false,
    });

    // 56mm width = approx 212 points at 96 DPI, convert to mm for PDF
    const pdfWidth = 56; // 56mm
    const pdfHeight = (canvas.height / canvas.width) * pdfWidth;
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    const timestamp = new Date().getTime();
    const fileName = `Receipt_${timestamp}.pdf`;

    pdf.save(fileName);
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
};
