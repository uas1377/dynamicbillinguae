// bluetoothPrintService.js - Updated to fix missing items, SKU, and totals

const formatCol = (val, len, align = 'left') => {
  const str = String(val || "").substring(0, len);
  return align === 'right' ? str.padStart(len) : str.padEnd(len);
};

const generateBluetoothReceipt = (invoiceData) => {
  const businessSettings = invoiceData.yourCompany || {};
  const actualBusinessName = businessSettings.name || 'Business Name';
  const currencyCode = businessSettings.currencyCode || 'AED';
  
  // Data Mapping: Support both camelCase and snake_case
  const invoiceNumber = invoiceData.invoiceNumber || invoiceData.invoice_number || 'N/A';
  const customerId = invoiceData.customerId || invoiceData.customer_id || 'N/A';
  const cashierName = invoiceData.cashierName || invoiceData.cashier_name || 'Admin';
  const subTotal = invoiceData.subTotal || invoiceData.sub_total || 0;
  const taxAmount = invoiceData.taxAmount || invoiceData.tax_amount || 0;
  const grandTotal = invoiceData.grandTotal || invoiceData.grand_total || 0;
  const amountReceived = invoiceData.amountReceived || invoiceData.amount_received || 0;
  const changeAmount = invoiceData.changeAmount || invoiceData.change_amount || 0;
  
  // Status logic
  const status = (invoiceData.status || "").toLowerCase();
  const isPaid = status === 'paid' || status === 'completed';
  const statusText = isPaid ? "PAID" : "UNPAID";

  let receipt = '';
  const ESC = '\x1B';
  const GS = '\x1D';
  
  // Header
  receipt += ESC + '@'; 
  receipt += ESC + 'a' + '\x01'; // Center
  receipt += ESC + '!' + '\x30' + actualBusinessName + '\n'; 
  receipt += ESC + '!' + '\x00'; 
  if (businessSettings.address) receipt += businessSettings.address + '\n';
  if (businessSettings.phone) receipt += 'Tel: ' + businessSettings.phone + '\n';
  receipt += '\n';
  
  // Info Section
  receipt += ESC + 'a' + '\x00'; // Left align
  receipt += '--------------------------------\n';
  receipt += `STATUS: ${statusText}\n`;
  receipt += `Invoice: ${invoiceNumber}\n`;
  receipt += `Date: ${new Date(invoiceData.date || Date.now()).toLocaleDateString()}\n`;
  receipt += `Cust ID: ${customerId}\n`;
  receipt += `Cashier: ${cashierName}\n`;
  receipt += '--------------------------------\n';
  
  // Items Header
  // 32 chars: Item(14) Qty(4) Rate(6) Total(8)
  receipt += 'Item/SKU       Qty  Rate  Total \n';
  receipt += '--------------------------------\n';
  
  // Items Loop
  if (invoiceData.items && invoiceData.items.length > 0) {
    invoiceData.items.forEach(item => {
      const itemRate = Number(item.amount || 0).toFixed(2);
      const itemTotal = (Number(item.quantity || 0) * Number(item.amount || 0)).toFixed(2);
      
      // Line 1: Name, Qty, Rate, Total
      receipt += formatCol(item.name, 14) + 
                 formatCol(item.quantity, 4, 'right') + 
                 formatCol(itemRate, 6, 'right') + 
                 formatCol(itemTotal, 8, 'right') + '\n';
      
      // Line 2: SKU (If exists)
      if (item.sku) {
        receipt += ` SKU: ${item.sku}\n`;
      }
    });
  } else {
    receipt += '      No items listed       \n';
  }
  
  receipt += '--------------------------------\n';
  
  // Totals Section
  receipt += ESC + 'a' + '\x02'; // Right align
  receipt += `Subtotal: ${currencyCode} ${Number(subTotal).toFixed(2)}\n`;
  if (Number(taxAmount) > 0) {
    receipt += `Tax: ${currencyCode} ${Number(taxAmount).toFixed(2)}\n`;
  }
  receipt += ESC + '!' + '\x10'; // Bold
  receipt += `TOTAL: ${currencyCode} ${Number(grandTotal).toFixed(2)}\n`;
  receipt += ESC + '!' + '\x00'; // Normal
  receipt += '--------------------------------\n';
  
  // Payment Details
  receipt += ESC + 'a' + '\x00'; // Left
  receipt += `Received: ${currencyCode} ${Number(amountReceived).toFixed(2)}\n`;
  receipt += `Change:   ${currencyCode} ${Number(changeAmount).toFixed(2)}\n`;
  
  // Footer
  receipt += '\n' + ESC + 'a' + '\x01'; 
  receipt += (businessSettings.footerNote || 'Thank you! Visit again.') + '\n\n\n\n';
  receipt += GS + 'V' + '\x00'; // Cut
  
  return receipt;
};

export const sendToBluetoothPrinter = async (invoiceData) => {
  if (typeof window === 'undefined' || !window.bluetoothPrinterCharacteristic) {
    throw new Error('No Bluetooth printer connected');
  }
  
  try {
    const characteristic = window.bluetoothPrinterCharacteristic;
    const receiptText = generateBluetoothReceipt(invoiceData);
    const encoder = new TextEncoder();
    const data = encoder.encode(receiptText);
    
    // Chunking for stability
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await characteristic.writeValue(chunk);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return true;
  } catch (error) {
    console.error('Bluetooth print error:', error);
    throw error;
  }
};
