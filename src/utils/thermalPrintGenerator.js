import html2canvas from 'html2canvas';
import { getPaperConfig } from './paperSizes';
import { isBluetoothPrinterConnected, sendToBluetoothPrinter } from './bluetoothPrintService';
// Add this import - it's referenced in the new code
import { printHistoricalReceipt } from './receiptService';

// Store the active Bluetooth connection
let activeBluetoothDevice = null;
let activeGattServer = null;

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
export const setActiveBluetoothDevice = (device, server, characteristic = null) => {
  activeBluetoothDevice = device;
  activeGattServer = server;
  if (characteristic && typeof window !== 'undefined') {
    window.bluetoothPrinterCharacteristic = characteristic;
  }
};

// Get the active Bluetooth device
export const getActiveBluetoothDevice = () => {
  return { device: activeBluetoothDevice, server: activeGattServer };
};

// Clear active connection
export const clearActiveBluetoothDevice = () => {
  activeBluetoothDevice = null;
  activeGattServer = null;
  if (typeof window !== 'undefined') {
    window.bluetoothPrinterCharacteristic = null;
  }
};

// Generate receipt HTML content for printing (UNCHANGED)
const generateReceiptHTML = (invoiceData, businessName = 'Business Name') => {
  const businessSettings = invoiceData.yourCompany || {};
  const actualBusinessName = businessSettings.name || businessName;
  const currencyCode = businessSettings.currencyCode || 'currency';
  const isPaid = invoiceData.status !== 'unpaid';
  
  // Handle both naming conventions (camelCase and snake_case)
  const invoiceNumber = invoiceData.invoiceNumber || invoiceData.invoice_number || 'N/A';
  const customerName = invoiceData.customerName || invoiceData.customer_name;
  const customerId = invoiceData.customerId || invoiceData.customer_id;
  const customerPhone = invoiceData.customerPhone || invoiceData.customer_phone;
  const cashierName = invoiceData.cashierName || invoiceData.cashier_name;
  const subTotal = invoiceData.subTotal || invoiceData.sub_total;
  const taxRate = invoiceData.taxRate || invoiceData.tax_rate;
  const taxAmount = invoiceData.taxAmount || invoiceData.tax_amount || 0;
  const discountAmount = invoiceData.discountAmount || invoiceData.discount_amount || 0;
  const grandTotal = invoiceData.grandTotal || invoiceData.grand_total;
  const amountReceived = invoiceData.amountReceived || invoiceData.amount_received;
  const changeAmount = invoiceData.changeAmount || invoiceData.change_amount || 0;
  const amountPaidDisplay = isPaid ? amountReceived : '0.00 (unpaid)';
  
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
          <span>Invoice: ${invoiceNumber}</span>
        </div>
        <div class="flex">
          <span>Date: ${new Date().toLocaleDateString()}</span>
          <span>Time: ${new Date().toLocaleTimeString()}</span>
        </div>
        ${customerName ? `<div>Customer: ${customerName}</div>` : ''}
        ${customerId ? `
          <div class="customer-id">
            <span class="small">Customer ID:</span>
            <span class="bold" style="font-size: calc(${baseFontSize} + 2px); font-family: monospace;">${customerId}</span>
          </div>
        ` : ''}
        ${customerPhone && !customerId ? `<div>Phone: ${customerPhone}</div>` : ''}
        ${cashierName ? `<div>Cashier: ${cashierName}</div>` : ''}
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
          <span>${currencyCode} ${subTotal}</span>
        </div>
        ${discountAmount > 0 ? `
          <div class="flex">
            <span>Discount:</span>
            <span>-${currencyCode} ${discountAmount}</span>
          </div>
        ` : ''}
        ${taxAmount > 0 ? `
          <div class="flex">
            <span>Tax (${taxRate}%):</span>
            <span>${currencyCode} ${taxAmount}</span>
          </div>
        ` : ''}
        <div class="flex bold large" style="border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
          <span>Total:</span>
          <span>${currencyCode} ${grandTotal}</span>
        </div>
      </div>
      
      <div class="change-box">
        <div class="flex">
          <span>Amount Paid:</span>
          <span class="bold">${currencyCode} ${amountPaidDisplay}</span>
        </div>
        ${isPaid && parseFloat(changeAmount) > 0 ? `
          <div class="flex bold large">
            <span>Change:</span>
            <span>${currencyCode} ${changeAmount}</span>
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

/**
 * MAIN ROUTER FUNCTION
 * Decides whether to use Bluetooth or Browser Print
 */
export const generateThermalPrint = async (invoiceData, businessName = 'Business Name') => {
  // 1. Check Bluetooth connection using the shared function
  if (isBluetoothPrinterConnected()) {
    try {
      console.log("Routing to Bluetooth Service...");
      return await sendToBluetoothPrinter(invoiceData);
    } catch (error) {
      console.error("Bluetooth print failed, falling back to Browser Print:", error);
      // continue to fallback
    }
  }
  
  // 2. Fallback: Browser Print
  console.log("No Bluetooth found or failed. Routing to Browser Print...");
  
  // Prefer printHistoricalReceipt if it exists (more domain-specific formatting)
  if (typeof printHistoricalReceipt === 'function') {
    return printHistoricalReceipt(invoiceData);
  }
  
  // Otherwise fall back to classic browser print window
  return new Promise(async (resolve, reject) => {
    try {
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

// Save as image function (UNCHANGED)
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
      
      // Handle both naming conventions
      const invoiceNumber = invoiceData.invoiceNumber || invoiceData.invoice_number || 'N/A';
      const customerName = invoiceData.customerName || invoiceData.customer_name;
      const customerId = invoiceData.customerId || invoiceData.customer_id;
      const customerPhone = invoiceData.customerPhone || invoiceData.customer_phone;
      const cashierName = invoiceData.cashierName || invoiceData.cashier_name;
      const subTotal = invoiceData.subTotal || invoiceData.sub_total;
      const taxRate = invoiceData.taxRate || invoiceData.tax_rate;
      const taxAmount = invoiceData.taxAmount || invoiceData.tax_amount || 0;
      const discountAmount = invoiceData.discountAmount || invoiceData.discount_amount || 0;
      const grandTotal = invoiceData.grandTotal || invoiceData.grand_total;
      const amountReceived = invoiceData.amountReceived || invoiceData.amount_received;
      const changeAmount = invoiceData.changeAmount || invoiceData.change_amount || 0;
      const amountPaidDisplay = isPaid ? amountReceived : '0.00 (unpaid)';
      
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
              <span>Invoice: ${invoiceNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span>Date: ${new Date().toLocaleDateString()}</span>
              <span>Time: ${new Date().toLocaleTimeString()}</span>
            </div>
            ${customerName ? `<div>Customer: ${customerName}</div>` : ''}
            ${customerId ? `
              <div style="background: #e8f5e9; padding: 6px; margin: 6px 0; border-radius: 4px; text-align: center;">
                <span style="font-size: ${smallFontSize};">Customer ID: </span>
                <span style="font-weight: bold; font-size: calc(${baseFontSize} + 2px); font-family: monospace;">${customerId}</span>
              </div>
            ` : ''}
            ${customerPhone && !customerId ? `<div>Phone: ${customerPhone}</div>` : ''}
            ${cashierName ? `<div>Cashier: ${cashierName}</div>` : ''}
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
              <span>${currencyCode} ${subTotal}</span>
            </div>
            ${discountAmount > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span>Discount:</span>
                <span>-${currencyCode} ${discountAmount}</span>
              </div>
            ` : ''}
            ${taxAmount > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span>Tax (${taxRate}%):</span>
                <span>${currencyCode} ${taxAmount}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${largeFontSize}; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
              <span>Total:</span>
              <span>${currencyCode} ${grandTotal}</span>
            </div>
          </div>
          
          <div style="background: #f0f0f0; padding: 8px; margin: 8px 0; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Amount Paid:</span>
              <span style="font-weight: bold;">${currencyCode} ${amountPaidDisplay}</span>
            </div>
            ${isPaid && parseFloat(changeAmount) > 0 ? `
              <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: ${largeFontSize};">
                <span>Change:</span>
                <span>${currencyCode} ${changeAmount}</span>
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
      link.download = `invoice-${invoiceNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};
