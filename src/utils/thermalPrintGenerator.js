import html2canvas from 'html2canvas';
import { getPaperConfig } from './paperSizes';

// Store the active Bluetooth connection
let activeBluetoothDevice = null;
let activeGattServer = null;

// Check if a Bluetooth printer is connected
export const isBluetoothPrinterConnected = () => {
  const savedDevice = localStorage.getItem('connectedBluetoothPrinter');
  return !!savedDevice;
};

// Get connected Bluetooth printer info
export const getConnectedPrinter = () => {
  const savedDevice = localStorage.getItem('connectedBluetoothPrinter');
  if (savedDevice) {
    try {
      return JSON.parse(savedDevice);
    } catch (e) {
      return null;
    }
  }
  return null;
};

// Set the active Bluetooth device (called from BluetoothPrinterDialog)
export const setActiveBluetoothDevice = (device, server) => {
  activeBluetoothDevice = device;
  activeGattServer = server;
};

// Get the active Bluetooth device
export const getActiveBluetoothDevice = () => {
  return { device: activeBluetoothDevice, server: activeGattServer };
};

// Clear active connection
export const clearActiveBluetoothDevice = () => {
  activeBluetoothDevice = null;
  activeGattServer = null;
};

// Generate receipt HTML content for printing
const generateReceiptHTML = (invoiceData, businessName = 'Business Name') => {
  const businessSettings = invoiceData.yourCompany || {};
  const actualBusinessName = businessSettings.name || businessName;
  const currencyCode = businessSettings.currencyCode || 'currency';
  const isPaid = invoiceData.status !== 'unpaid';
  const amountPaidDisplay = isPaid ? invoiceData.amountReceived : '0.00 (unpaid)';
  
  // Get paper configuration with font sizes
  const paperConfig = getPaperConfig();
  const { width: paperWidth, paddingSide, baseFontSize, largeFontSize, smallFontSize, itemFontSize } = paperConfig;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Thermal Receipt</title>
      <style>
        body {
          margin: 0;
          padding: ${paddingSide};
          font-family: Arial, sans-serif;
          font-size: ${baseFontSize};
          line-height: 1.3;
          width: ${paperWidth};
          box-sizing: border-box;
          background: white;
          color: black;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .large { font-size: ${largeFontSize}; }
        .small { font-size: ${smallFontSize}; }
        .dashed-line { 
          border-bottom: 1px dashed #000; 
          margin: 8px 0; 
        }
        .flex { 
          display: flex; 
          justify-content: space-between; 
        }
        .item-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: ${itemFontSize};
        }
        .item-name { flex: 1; min-width: 0; }
        .item-sku { width: 50px; font-size: ${smallFontSize}; color: #666; }
        .item-qty { width: 25px; text-align: center; }
        .item-rate { width: 45px; text-align: right; }
        .item-amount { width: 50px; text-align: right; }
        .change-box {
          background: #f0f0f0;
          padding: 8px;
          margin: 8px 0;
          border-radius: 4px;
        }
        .customer-id {
          background: #e8f5e9;
          padding: 6px;
          margin: 6px 0;
          border-radius: 4px;
          text-align: center;
        }
        @media print {
          @page { size: ${paperWidth} auto; margin: 0; }
          body { width: ${paperWidth}; padding: ${paddingSide}; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="center dashed-line">
        ${businessSettings.logo ? `<img src="${businessSettings.logo}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain; margin: 0 auto 8px;" />` : ''}
        <div class="large bold">${actualBusinessName}</div>
        ${businessSettings.address ? `<div class="small">${businessSettings.address}</div>` : ''}
        ${businessSettings.phone ? `<div class="small">Tel: ${businessSettings.phone}</div>` : ''}
        ${businessSettings.email ? `<div class="small">${businessSettings.email}</div>` : ''}
      </div>
      
      <div>
        <div class="flex">
          <span>Invoice: ${invoiceData.invoiceNumber}</span>
        </div>
        <div class="flex">
          <span>Date: ${new Date().toLocaleDateString()}</span>
          <span>Time: ${new Date().toLocaleTimeString()}</span>
        </div>
        ${invoiceData.customerName ? `<div>Customer: ${invoiceData.customerName}</div>` : ''}
        ${invoiceData.customerId ? `
          <div class="customer-id">
            <span class="small">Customer ID:</span>
            <span class="bold" style="font-size: calc(${baseFontSize} + 2px); font-family: monospace;">${invoiceData.customerId}</span>
          </div>
        ` : ''}
        ${invoiceData.customerPhone && !invoiceData.customerId ? `<div>Phone: ${invoiceData.customerPhone}</div>` : ''}
        ${invoiceData.cashierName ? `<div>Cashier: ${invoiceData.cashierName}</div>` : ''}
      </div>
      
      <div class="dashed-line">
        <div class="item-row bold">
          <span class="item-name">Item</span>
          <span class="item-sku">SKU</span>
          <span class="item-qty">Qty</span>
          <span class="item-rate">Rate</span>
          <span class="item-amount">Amount</span>
        </div>
      </div>
      
      ${invoiceData.items.map(item => `
        <div class="item-row">
          <span class="item-name">${item.name}</span>
          <span class="item-sku">${item.sku || '-'}</span>
          <span class="item-qty">${item.quantity}</span>
          <span class="item-rate">${item.amount}</span>
          <span class="item-amount">${(item.quantity * item.amount).toFixed(2)}</span>
        </div>
      `).join('')}
      
      <div class="dashed-line">
        <div class="flex">
          <span>Subtotal:</span>
          <span>${currencyCode} ${invoiceData.subTotal}</span>
        </div>
        ${invoiceData.discountAmount > 0 ? `
          <div class="flex">
            <span>Discount:</span>
            <span>-${currencyCode} ${invoiceData.discountAmount}</span>
          </div>
        ` : ''}
        ${invoiceData.taxAmount > 0 ? `
          <div class="flex">
            <span>Tax (${invoiceData.taxRate}%):</span>
            <span>${currencyCode} ${invoiceData.taxAmount}</span>
          </div>
        ` : ''}
        <div class="flex bold large" style="border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
          <span>Total:</span>
          <span>${currencyCode} ${invoiceData.grandTotal}</span>
        </div>
      </div>
      
      <div class="change-box">
        <div class="flex">
          <span>Amount Paid:</span>
          <span class="bold">${currencyCode} ${amountPaidDisplay}</span>
        </div>
        ${isPaid && parseFloat(invoiceData.changeAmount) > 0 ? `
          <div class="flex bold large">
            <span>Change:</span>
            <span>${currencyCode} ${invoiceData.changeAmount}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="center small" style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #000;">
        <div>Thank you for shopping!</div>
        <div>Visit again</div>
      </div>
    </body>
    </html>
  `;
};

// Generate plain text receipt for direct printing
const generatePlainTextReceipt = (invoiceData, businessName = 'Business Name') => {
  const businessSettings = invoiceData.yourCompany || {};
  const actualBusinessName = businessSettings.name || businessName;
  const currencyCode = businessSettings.currencyCode || 'AED';
  const isPaid = invoiceData.status !== 'unpaid';
  const amountPaidDisplay = isPaid ? invoiceData.amountReceived : '0.00 (unpaid)';
  
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
  receipt += '\n';
  
  // Invoice details - Left align
  receipt += ESC + 'a' + '\x00'; // Left alignment
  receipt += '--------------------------------\n';
  receipt += 'Invoice: ' + invoiceData.invoiceNumber + '\n';
  receipt += 'Date: ' + new Date().toLocaleDateString() + '\n';
  receipt += 'Time: ' + new Date().toLocaleTimeString() + '\n';
  if (invoiceData.customerName) receipt += 'Customer: ' + invoiceData.customerName + '\n';
  if (invoiceData.customerId) receipt += 'ID: ' + invoiceData.customerId + '\n';
  if (invoiceData.cashierName) receipt += 'Cashier: ' + invoiceData.cashierName + '\n';
  receipt += '--------------------------------\n';
  
  // Items
  invoiceData.items.forEach(item => {
    const itemTotal = (item.quantity * item.amount).toFixed(2);
    const itemName = item.name.length > 16 ? item.name.substring(0, 16) : item.name.padEnd(16);
    receipt += itemName;
    receipt += (item.quantity + 'x' + item.amount).padStart(8);
    receipt += itemTotal.padStart(8) + '\n';
  });
  
  receipt += '--------------------------------\n';
  
  // Totals
  receipt += ('Subtotal: ' + currencyCode + ' ' + invoiceData.subTotal).padStart(32) + '\n';
  if (parseFloat(invoiceData.discountAmount) > 0) {
    receipt += ('Discount: -' + currencyCode + ' ' + invoiceData.discountAmount).padStart(32) + '\n';
  }
  if (parseFloat(invoiceData.taxAmount) > 0) {
    receipt += ('Tax (' + invoiceData.taxRate + '%): ' + currencyCode + ' ' + invoiceData.taxAmount).padStart(32) + '\n';
  }
  receipt += ESC + '!' + '\x10'; // Bold
  receipt += ('TOTAL: ' + currencyCode + ' ' + invoiceData.grandTotal).padStart(32) + '\n';
  receipt += ESC + '!' + '\x00'; // Normal
  
  receipt += '--------------------------------\n';
  receipt += 'Amount Paid: ' + currencyCode + ' ' + amountPaidDisplay + '\n';
  if (isPaid && parseFloat(invoiceData.changeAmount) > 0) {
    receipt += 'Change: ' + currencyCode + ' ' + invoiceData.changeAmount + '\n';
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

// Try to send to Bluetooth printer using stored connection
const sendToBluetoothPrinter = async (invoiceData, businessName = 'Business Name') => {
  const { device, server } = getActiveBluetoothDevice();
  
  if (!device || !server) {
    throw new Error('No active Bluetooth connection');
  }
  
  try {
    // Check if still connected
    if (!server.connected) {
      // Try to reconnect
      await device.gatt.connect();
    }
    
    // Generate plain text receipt
    const receiptText = generatePlainTextReceipt(invoiceData, businessName);
    
    // Try to find a writable characteristic
    const services = await server.getPrimaryServices();
    
    for (const service of services) {
      try {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            const encoder = new TextEncoder();
            const data = encoder.encode(receiptText);
            
            // Send data in chunks (max 512 bytes for BLE)
            const chunkSize = 512;
            for (let i = 0; i < data.length; i += chunkSize) {
              const chunk = data.slice(i, i + chunkSize);
              if (char.properties.writeWithoutResponse) {
                await char.writeValueWithoutResponse(chunk);
              } else {
                await char.writeValue(chunk);
              }
              // Small delay between chunks
              await new Promise(resolve => setTimeout(resolve, 50));
            }
            
            return true;
          }
        }
      } catch (serviceError) {
        console.log('Service error, trying next:', serviceError);
      }
    }
    
    throw new Error('No writable characteristic found');
  } catch (error) {
    console.error('Bluetooth print error:', error);
    throw error;
  }
};

export const generateThermalPrint = async (invoiceData, businessName = 'Business Name') => {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if Bluetooth printer is connected and try direct printing
      const connectedPrinter = getConnectedPrinter();
      const { device, server } = getActiveBluetoothDevice();
      
      if (connectedPrinter && device && server && navigator.bluetooth) {
        try {
          await sendToBluetoothPrinter(invoiceData, businessName);
          console.log('Printed directly to Bluetooth printer');
          resolve();
          return;
        } catch (btError) {
          console.log('Bluetooth print failed, falling back to system print:', btError.message);
          // Fall through to system print dialog
        }
      }
      
      // Fallback: Generate HTML and use system print (for Thermer app or regular printing)
      const htmlContent = generateReceiptHTML(invoiceData, businessName);
      
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      const printDocument = printWindow.document;
      
      printDocument.write(htmlContent);
      printDocument.close();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
        resolve();
      }, 500);
      
    } catch (error) {
      reject(error);
    }
  });
};

export const saveAsImage = async (invoiceData, businessName = 'Business Name') => {
  return new Promise(async (resolve, reject) => {
    try {
      const printContent = document.createElement('div');
      printContent.style.position = 'absolute';
      printContent.style.left = '-9999px';
      printContent.style.top = '0';
      printContent.style.backgroundColor = 'white';
      printContent.style.padding = '10px';
      document.body.appendChild(printContent);
      
      const businessSettings = invoiceData.yourCompany || {};
      const actualBusinessName = businessSettings.name || businessName;
      const currencyCode = businessSettings.currencyCode || 'currency';
      const isPaid = invoiceData.status !== 'unpaid';
      const amountPaidDisplay = isPaid ? invoiceData.amountReceived : '0.00 (unpaid)';
      
      // Get paper configuration with font sizes
      const paperConfig = getPaperConfig();
      const { width: paperWidth, paddingSide, baseFontSize, largeFontSize, smallFontSize, itemFontSize } = paperConfig;
      
      printContent.innerHTML = `
        <div style="
          width: ${paperWidth};
          font-family: Arial, sans-serif;
          font-size: ${baseFontSize};
          line-height: 1.3;
          padding: ${paddingSide};
          box-sizing: border-box;
          background: white;
          color: black;
        ">
          <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
            ${businessSettings.logo ? `<img src="${businessSettings.logo}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain; margin: 0 auto 8px; display: block;" />` : ''}
            <div style="font-size: ${largeFontSize}; font-weight: bold; margin-bottom: 4px;">${actualBusinessName}</div>
            ${businessSettings.address ? `<div style="font-size: ${smallFontSize};">${businessSettings.address}</div>` : ''}
            ${businessSettings.phone ? `<div style="font-size: ${smallFontSize};">Tel: ${businessSettings.phone}</div>` : ''}
            ${businessSettings.email ? `<div style="font-size: ${smallFontSize};">${businessSettings.email}</div>` : ''}
          </div>
          
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Invoice: ${invoiceData.invoiceNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Date: ${new Date().toLocaleDateString()}</span>
              <span>Time: ${new Date().toLocaleTimeString()}</span>
            </div>
            ${invoiceData.customerName ? `<div>Customer: ${invoiceData.customerName}</div>` : ''}
            ${invoiceData.customerId ? `
              <div style="background: #e8f5e9; padding: 6px; margin: 6px 0; border-radius: 4px; text-align: center;">
                <span style="font-size: ${smallFontSize};">Customer ID: </span>
                <span style="font-weight: bold; font-size: calc(${baseFontSize} + 2px); font-family: monospace;">${invoiceData.customerId}</span>
              </div>
            ` : ''}
            ${invoiceData.customerPhone && !invoiceData.customerId ? `<div>Phone: ${invoiceData.customerPhone}</div>` : ''}
            ${invoiceData.cashierName ? `<div>Cashier: ${invoiceData.cashierName}</div>` : ''}
          </div>
          
          <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 8px 0;">
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${itemFontSize};">
              <span style="width: 90px;">Item</span>
              <span style="width: 50px;">SKU</span>
              <span style="width: 30px; text-align: center;">Qty</span>
              <span style="width: 45px; text-align: right;">Rate</span>
              <span style="width: 55px; text-align: right;">Amount</span>
            </div>
          </div>
          
          ${invoiceData.items.map(item => `
            <div style="margin-bottom: 4px;">
              <div style="display: flex; justify-content: space-between; font-size: ${itemFontSize};">
                <span style="width: 90px;">${item.name}</span>
                <span style="width: 50px; font-size: ${smallFontSize}; color: #666;">${item.sku || '-'}</span>
                <span style="width: 30px; text-align: center;">${item.quantity}</span>
                <span style="width: 45px; text-align: right;">${item.amount}</span>
                <span style="width: 55px; text-align: right;">${(item.quantity * item.amount).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
          
          <div style="border-top: 1px dashed #000; padding-top: 4px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>${currencyCode} ${invoiceData.subTotal}</span>
            </div>
            ${invoiceData.discountAmount > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span>Discount:</span>
                <span>-${currencyCode} ${invoiceData.discountAmount}</span>
              </div>
            ` : ''}
            ${invoiceData.taxAmount > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span>Tax (${invoiceData.taxRate}%):</span>
                <span>${currencyCode} ${invoiceData.taxAmount}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${largeFontSize}; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
              <span>Total:</span>
              <span>${currencyCode} ${invoiceData.grandTotal}</span>
            </div>
          </div>
          
          <div style="background: #f0f0f0; padding: 8px; margin: 8px 0; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Amount Paid:</span>
              <span style="font-weight: bold;">${currencyCode} ${amountPaidDisplay}</span>
            </div>
            ${isPaid && parseFloat(invoiceData.changeAmount) > 0 ? `
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${largeFontSize};">
                <span>Change:</span>
                <span>${currencyCode} ${invoiceData.changeAmount}</span>
              </div>
            ` : ''}
          </div>
          
          <div style="text-align: center; font-size: ${smallFontSize}; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #000;">
            <div>Thank you for shopping!</div>
            <div>Visit again</div>
          </div>
        </div>
      `;
      
      const canvas = await html2canvas(printContent, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false
      });
      
      document.body.removeChild(printContent);
      
      const link = document.createElement('a');
      link.download = `invoice-${invoiceData.invoiceNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};
