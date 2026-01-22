import { getBusinessSettings } from "./localStorageData";

// Helper to align text for 32-character thermal printers
const formatCol = (val, len, align = 'left') => {
  const str = String(val || "").substring(0, len);
  return align === 'right' ? str.padStart(len) : str.padEnd(len);
};

const generateBluetoothReceipt = (invoiceData) => {
  // 1. FIX BUSINESS NAME: Always pull fresh from Admin Settings
  const settings = getBusinessSettings();
  const bizName = settings.name || 'MY BUSINESS';
  const bizAddr = settings.address || '';
  const bizPhone = settings.phone || '';
  const currency = settings.currencyCode || 'AED';
  
  // 2. NORMALIZE KEYS: Support both InvoiceTab and AllInvoicesTab data
  const invNum = invoiceData.invoiceNumber || invoiceData.invoice_number || 'N/A';
  const items = invoiceData.items || [];
  const total = invoiceData.grandTotal || invoiceData.grand_total || 0;
  const received = invoiceData.amountReceived || invoiceData.amount_received || 0;
  const change = invoiceData.changeAmount || invoiceData.change_amount || 0;
  const custId = invoiceData.customerId || invoiceData.customer_id || 'Walk-in';
  const date = new Date(invoiceData.date || invoiceData.created_at || Date.now()).toLocaleDateString();

  let r = '';
  const ESC = '\x1B';
  const GS = '\x1D';
  
  r += ESC + '@'; // Reset
  r += ESC + 'a' + '\x01'; // Center
  r += ESC + '!' + '\x30' + bizName + '\n'; // Double height/width
  r += ESC + '!' + '\x00'; // Normal
  if (bizAddr) r += bizAddr + '\n';
  if (bizPhone) r += 'Tel: ' + bizPhone + '\n';
  r += '\n';
  
  r += ESC + 'a' + '\x00'; // Left align
  r += '--------------------------------\n';
  r += `Inv: ${invNum}\n`;
  r += `Date: ${date}\n`;
  r += `Cust: ${custId}\n`;
  r += '--------------------------------\n';
  
  // 3. FIX ALIGNMENT: 32 Column Layout
  // Columns: Item/SKU(14) Qty(4) Rate(6) Total(8)
  r += 'Item/SKU       Qty  Rate  Total \n';
  r += '--------------------------------\n';
  
  items.forEach(item => {
    const rate = Number(item.amount || item.price || 0).toFixed(2);
    const lineTotal = (Number(item.quantity) * Number(item.amount || item.price)).toFixed(2);
    
    // First line: Name, Qty, Rate, Total
    r += formatCol(item.name, 14) + 
         formatCol(item.quantity, 4, 'right') + 
         formatCol(rate, 6, 'right') + 
         formatCol(lineTotal, 8, 'right') + '\n';
    
    // Second line: SKU (if available)
    if (item.sku) {
      r += ` SKU: ${item.sku}\n`;
    }
  });

  r += '--------------------------------\n';
  
  // 4. TOTALS
  r += ESC + 'a' + '\x02'; // Right align
  r += `GRAND TOTAL: ${currency} ${Number(total).toFixed(2)}\n`;
  r += `Received:    ${currency} ${Number(received).toFixed(2)}\n`;
  r += `Change:      ${currency} ${Number(change).toFixed(2)}\n`;
  
  r += '\n' + ESC + 'a' + '\x01'; // Center footer
  r += (settings.footerNote || 'Thank you for your visit!') + '\n\n\n\n' + GS + 'V' + '\x00';
  
  return r;
};

export const sendToBluetoothPrinter = async (invoiceData) => {
  const char = window.bluetoothPrinterCharacteristic;
  if (!char) {
    throw new Error('Printer not connected. Please connect via Bluetooth Dialog.');
  }

  try {
    const receiptText = generateBluetoothReceipt(invoiceData);
    const encoder = new TextEncoder();
    const data = encoder.encode(receiptText);
    
    // Chunk sending to prevent data loss on cheap printers
    const step = 512;
    for (let i = 0; i < data.length; i += step) {
      await char.writeValue(data.slice(i, i + step));
      await new Promise(res => setTimeout(res, 50));
    }
    return true;
  } catch (err) {
    console.error("BT Print Error:", err);
    throw err;
  }
};

export const isBluetoothPrinterConnected = () => {
  return !!window.bluetoothPrinterCharacteristic;
};
