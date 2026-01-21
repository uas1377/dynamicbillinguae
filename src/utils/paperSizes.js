// Paper size configurations for thermal printers
// All sizes include 3mm padding on both sides
// Font sizes scale with paper size

export const PAPER_SIZES = {
  '2inch': {
    label: '2 inches (50mm)',
    width: '50mm',
    contentWidth: '44mm', // 50mm - 6mm padding
    paddingSide: '3mm',
    baseFontSize: '10px',
    largeFontSize: '14px',
    smallFontSize: '8px',
    itemFontSize: '9px'
  },
  '8cm': {
    label: '8cm (80mm)',
    width: '80mm',
    contentWidth: '74mm', // 80mm - 6mm padding
    paddingSide: '3mm',
    baseFontSize: '12px',
    largeFontSize: '18px',
    smallFontSize: '10px',
    itemFontSize: '11px'
  },
  '3.5inch': {
    label: '3.5 inches (89mm)',
    width: '89mm',
    contentWidth: '83mm', // 89mm - 6mm padding
    paddingSide: '3mm',
    baseFontSize: '13px',
    largeFontSize: '20px',
    smallFontSize: '11px',
    itemFontSize: '12px'
  },
  '4inch': {
    label: '4 inches (101mm)',
    width: '101mm',
    contentWidth: '95mm', // 101mm - 6mm padding
    paddingSide: '3mm',
    baseFontSize: '14px',
    largeFontSize: '22px',
    smallFontSize: '12px',
    itemFontSize: '13px'
  }
};

export const getSelectedPaperSize = () => {
  const businessSettings = JSON.parse(localStorage.getItem('businessSettings') || '{}');
  return businessSettings.paperSize || '2inch';
};

export const getPaperConfig = () => {
  const size = getSelectedPaperSize();
  return PAPER_SIZES[size] || PAPER_SIZES['2inch'];
};
