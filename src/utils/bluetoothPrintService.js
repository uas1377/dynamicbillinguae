
// bluetoothPrintService.js - Dedicated Bluetooth printing service

// Generate plain text receipt for Bluetooth thermal printer (ESC/POS format)
const generateBluetoothReceipt = (invoiceData) => {
  const businessSettings = invoiceData.yourCompany || {};
  const actualBusinessName = businessSettings.name || 'Business Name';
  const currencyCode = businessSettings.currencyCode || 'AED';
  
  // Handle both naming conventions
  const invoiceNumber = invoiceData.invoiceNumber || invoiceData.invoice_number || 'N/A';
  const customerName = invoiceData.customerName || invoiceData.customer_name;
  const customerId = invoiceData.customerId || invoiceData.customer_id;
  const customerPhone = invoiceData.customerPhone || invoiceData.customer_phone;
  const cashierName = invoiceData.cashierName || invoiceData.cashier_name;
  const subTotal = invoiceData.subTotal || invoiceData.sub_total;
  const taxRate = invoiceData.taxRate || invoiceData.tax_rate;
  const taxAmount = invoiceData.taxAmount || invoiceData.tax_amount;
  const discountAmount = invoiceData.discountAmount || invoiceData.discount_amount || 0;
  const grandTotal = invoiceData.grandTotal || invoiceData.grand_total;
  const amountReceived = invoiceData.amountReceived || invoiceData.amount_received;
  const changeAmount = invoiceData.changeAmount || invoiceData.change_amount;
  const isPaid = invoiceData.status !== 'unpaid';
  const amountPaidDisplay = isPaid ? amountReceived : '0.00 (unpaid)';
  
  let receipt = '';
  
  // ESC/POS Commands
  const ESC = '\x1B';
  const GS = '\x1D';
  
  // Header - Initialize and center
  receipt += ESC + '@'; // Initialize printer
  receipt += ESC + 'a' + '\x01'; // Center alignment
  receipt += ESC + '!' + '\x30'; // Double height and width
  receipt += actualBusinessName + '\n';
  receipt += ESC + '!' + '\x00'; // Normal text
  if (businessSettings.address) receipt += businessSettings.address + '\n';
  if (businessSettings.phone) receipt += 'Tel: ' + businessSettings.phone + '\n';
  if (businessSettings.email) receipt += businessSettings.email + '\n';
  receipt += '\n';
  
  // Invoice details - Left align
  receipt += ESC + 'a' + '\x00'; // Left alignment
  receipt += '--------------------------------\n';
  receipt += 'Invoice: ' + invoiceNumber + '\n';
  receipt += 'Date: ' + new Date().toLocaleDateString() + '\n';
  receipt += 'Time: ' + new Date().toLocaleTimeString() + '\n';
  if (customerName) receipt += 'Customer: ' + customerName + '\n';
  if (customerId) receipt += 'ID: ' + customerId + '\n';
  if (customerPhone && !customerId) receipt += 'Phone: ' + customerPhone + '\n';
  if (cashierName) receipt += 'Cashier: ' + cashierName + '\n';
  receipt += '--------------------------------\n';
  
  // Items
  invoiceData.items.forEach(item => {
    const itemTotal = (item.quantity * item.amount).toFixed(2);
    const itemName = item.name.length > 16 ? item.name.substring(0, 16) : item.name.padEnd(16);
    receipt += itemName;
    receipt += (item.quantity + 'x' + item.amount).padStart(8);
    receipt += itemTotal.padStart(8) + '\n';
    
    // Add SKU on next line if exists
    if (item.sku) {
      receipt += '  SKU: ' + item.sku + '\n';
    }
  });
  
  receipt += '--------------------------------\n';
  
  // Totals
  receipt += ('Subtotal: ' + currencyCode + ' ' + subTotal).padStart(32) + '\n';
  if (parseFloat(discountAmount) > 0) {
    receipt += ('Discount: -' + currencyCode + ' ' + discountAmount).padStart(32) + '\n';
  }
  if (parseFloat(taxAmount) > 0) {
    receipt += ('Tax (' + taxRate + '%): ' + currencyCode + ' ' + taxAmount).padStart(32) + '\n';
  }
  receipt += ESC + '!' + '\x10'; // Bold
  receipt += ('TOTAL: ' + currencyCode + ' ' + grandTotal).padStart(32) + '\n';
  receipt += ESC + '!' + '\x00'; // Normal
  
  receipt += '--------------------------------\n';
  receipt += 'Amount Paid: ' + currencyCode + ' ' + amountPaidDisplay + '\n';
  if (isPaid && parseFloat(changeAmount) > 0) {
    receipt += 'Change: ' + currencyCode + ' ' + changeAmount + '\n';
  }
  
  // Footer - Center
  receipt += '\n';
  receipt += ESC + 'a' + '\x01'; // Center
  receipt += 'Thank you for shopping!\n';
  receipt += 'Visit again\n';
  receipt += '\n\n\n';
  receipt += GS + 'V' + '\x00'; // Cut paper (full cut)
  
  return receipt;
};

// Send receipt to Bluetooth printer
export const sendToBluetoothPrinter = async (invoiceData) => {
  // Check if Bluetooth characteristic is available
  if (typeof window === 'undefined' || !window.bluetoothPrinterCharacteristic) {
    throw new Error('No Bluetooth printer connected');
  }
  
  try {
    const characteristic = window.bluetoothPrinterCharacteristic;
    console.log('Using stored Bluetooth characteristic for printing');
    
    // Generate plain text receipt with ESC/POS commands
    const receiptText = generateBluetoothReceipt(invoiceData);
    const encoder = new TextEncoder();
    const data = encoder.encode(receiptText);
    
    // Send data in chunks (max 512 bytes for BLE)
    const chunkSize = 512;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      
      if (characteristic.properties.writeWithoutResponse) {
        await characteristic.writeValueWithoutResponse(chunk);
      } else {
        await characteristic.writeValue(chunk);
      }
      
      // Small delay between chunks to prevent buffer overflow
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    console.log('Receipt sent successfully to Bluetooth printer');
    return true;
  } catch (error) {
    console.error('Bluetooth print error:', error);
    throw error;
  }
};

// Check if Bluetooth printer is connected
export const isBluetoothPrinterConnected = () => {
  return typeof window !== 'undefined' && !!window.bluetoothPrinterCharacteristic;
};

// Print with automatic fallback
export const printReceipt = async (invoiceData, fallbackPrintFunction) => {
  // Try Bluetooth first if available
  if (isBluetoothPrinterConnected()) {
    try {
      await sendToBluetoothPrinter(invoiceData);
      console.log('Printed via Bluetooth');
      return { method: 'bluetooth', success: true };
    } catch (error) {
      console.error('Bluetooth print failed, falling back to normal print:', error);
      // Fall through to fallback
    }
  }
  
  // Use fallback (normal print)
  if (fallbackPrintFunction) {
    await fallbackPrintFunction(invoiceData);
    return { method: 'fallback', success: true };
  }
  
  throw new Error('No print method available');
};
