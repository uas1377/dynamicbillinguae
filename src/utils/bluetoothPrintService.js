import { getBusinessSettings } from "./localStorageData";

const formatCol = (val, len, align = 'left') => {
  const str = String(val || "").substring(0, len);
  return align === 'right' ? str.padStart(len) : str.padEnd(len);
};

export const sendToBluetoothPrinter = async (invoiceData) => {
  const settings = getBusinessSettings();
  
  // FIX: Ensure bizName is a string, not an object
  const bizName = typeof settings.name === 'object' ? settings.name.name : (settings.name || "MY BUSINESS");
  const currency = settings.currencyCode || 'AED';
  
  // NORMALIZE DATA
  const invNum = invoiceData.invoiceNumber || invoiceData.invoice_number || 'N/A';
  const items = invoiceData.items || [];
  const grandTotal = invoiceData.grandTotal || invoiceData.grand_total || 0;

  let r = '\n\n\n'; // 5mm top padding
  const ESC = '\x1B';
  
  // Header
  r += ESC + 'a' + '\x01'; // Center
  r += ESC + '!' + '\x30' + bizName + '\n'; 
  r += ESC + '!' + '\x00'; 
  r += (settings.address || '') + '\n';
  r += '--------------------------------\n';
  
  // Content
  r += ESC + 'a' + '\x00'; // Left
  r += `Inv: ${invNum}\n`;
  r += '--------------------------------\n';
  r += 'Item/SKU       Qty  Rate  Amount\n';
  r += '--------------------------------\n';
  
  items.forEach(item => {
    const rate = Number(item.amount || item.price || 0).toFixed(2);
    const amount = (Number(item.quantity) * Number(item.amount || item.price || 0)).toFixed(2);
    
    r += formatCol(item.name || "Item", 14) + 
         formatCol(item.quantity, 4, 'right') + 
         formatCol(rate, 6, 'right') + 
         formatCol(amount, 8, 'right') + '\n';
    
    if (item.sku) r += ` SKU: ${item.sku}\n`;
  });

  r += '--------------------------------\n';
  r += ESC + 'a' + '\x02'; // Right
  r += `GRAND TOTAL: ${currency} ${Number(grandTotal).toFixed(2)}\n`;
  r += '\n\n\n\n\x1D\x56\x00'; // 5mm bottom padding + Cut

  // SEND TO PRINTER
  const char = window.bluetoothPrinterCharacteristic;
  const encoder = new TextEncoder();
  await char.writeValue(encoder.encode(r));
  return true;
};
