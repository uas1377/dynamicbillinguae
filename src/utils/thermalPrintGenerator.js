import html2canvas from 'html2canvas';

export const generateThermalPrint = async (invoiceData, businessName = 'Business Name') => {
  return new Promise((resolve, reject) => {
    try {
      // Create thermal receipt content
      const businessSettings = JSON.parse(localStorage.getItem('businessSettings') || '{}');
      const actualBusinessName = businessSettings.businessName || businessName;
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      const printDocument = printWindow.document;
      
      printDocument.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Thermal Receipt</title>
          <style>
            body {
              margin: 0;
              padding: 10px;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
              width: 270px;
              background: white;
              color: black;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .large { font-size: 16px; }
            .small { font-size: 10px; }
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
              margin-bottom: 2px;
              font-size: 10px;
            }
            .item-name { width: 140px; }
            .item-qty { width: 30px; text-align: center; }
            .item-rate { width: 40px; text-align: right; }
            .item-amount { width: 50px; text-align: right; }
            @media print {
              body { width: 280px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="center dashed-line">
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
            ${invoiceData.customerPhone ? `<div>Phone: ${invoiceData.customerPhone}</div>` : ''}
          </div>
          
          <div class="dashed-line">
            <div class="item-row bold">
              <span class="item-name">Item</span>
              <span class="item-qty">Qty</span>
              <span class="item-rate">Rate</span>
              <span class="item-amount">Amount</span>
            </div>
          </div>
          
          ${invoiceData.items.map(item => `
            <div class="item-row">
              <span class="item-name">${item.name}</span>
              <span class="item-qty">${item.quantity}</span>
              <span class="item-rate">₹${item.amount}</span>
              <span class="item-amount">₹${(item.quantity * item.amount).toFixed(2)}</span>
            </div>
          `).join('')}
          
          <div class="dashed-line">
            <div class="flex">
              <span>Subtotal:</span>
              <span>₹${invoiceData.subTotal}</span>
            </div>
            ${invoiceData.discountAmount > 0 ? `
              <div class="flex">
                <span>Discount:</span>
                <span>-₹${invoiceData.discountAmount}</span>
              </div>
            ` : ''}
            ${invoiceData.taxAmount > 0 ? `
              <div class="flex">
                <span>Tax (${invoiceData.taxRate}%):</span>
                <span>₹${invoiceData.taxAmount}</span>
              </div>
            ` : ''}
            <div class="flex bold large" style="border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
              <span>Total:</span>
              <span>₹${invoiceData.grandTotal}</span>
            </div>
          </div>
          
          <div class="center small" style="margin-top: 12px; padding-top: 8px; border-top: 1px dashed #000;">
            <div>Thank you for your business!</div>
            <div>Visit again</div>
          </div>
        </body>
        </html>
      `);
      
      printDocument.close();
      
      // Wait for content to load then print
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
      
      const businessSettings = JSON.parse(localStorage.getItem('businessSettings') || '{}');
      const actualBusinessName = businessSettings.businessName || businessName;
      
      printContent.innerHTML = `
        <div style="
          width: 280px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.2;
          padding: 10px;
          background: white;
          color: black;
        ">
          <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">${actualBusinessName}</div>
            ${businessSettings.address ? `<div style="font-size: 10px;">${businessSettings.address}</div>` : ''}
            ${businessSettings.phone ? `<div style="font-size: 10px;">Tel: ${businessSettings.phone}</div>` : ''}
            ${businessSettings.email ? `<div style="font-size: 10px;">${businessSettings.email}</div>` : ''}
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
            ${invoiceData.customerPhone ? `<div>Phone: ${invoiceData.customerPhone}</div>` : ''}
          </div>
          
          <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 4px 0; margin: 8px 0;">
            <div style="display: flex; justify-content: space-between; font-weight: bold;">
              <span style="width: 140px;">Item</span>
              <span style="width: 40px; text-align: center;">Qty</span>
              <span style="width: 50px; text-align: right;">Rate</span>
              <span style="width: 60px; text-align: right;">Amount</span>
            </div>
          </div>
          
          ${invoiceData.items.map(item => `
            <div style="margin-bottom: 2px;">
              <div style="display: flex; justify-content: space-between;">
                <span style="width: 140px; font-size: 10px;">${item.name}</span>
                <span style="width: 40px; text-align: center; font-size: 10px;">${item.quantity}</span>
                <span style="width: 50px; text-align: right; font-size: 10px;">₹${item.amount}</span>
                <span style="width: 60px; text-align: right; font-size: 10px;">₹${(item.quantity * item.amount).toFixed(2)}</span>
              </div>
            </div>
          `).join('')}
          
          <div style="border-top: 1px dashed #000; padding-top: 4px; margin-top: 8px;">
            <div style="display: flex; justify-content: space-between;">
              <span>Subtotal:</span>
              <span>₹${invoiceData.subTotal}</span>
            </div>
            ${invoiceData.discountAmount > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span>Discount:</span>
                <span>-₹${invoiceData.discountAmount}</span>
              </div>
            ` : ''}
            ${invoiceData.taxAmount > 0 ? `
              <div style="display: flex; justify-content: space-between;">
                <span>Tax (${invoiceData.taxRate}%):</span>
                <span>₹${invoiceData.taxAmount}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px;">
              <span>Total:</span>
              <span>₹${invoiceData.grandTotal}</span>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 12px; padding-top: 8px; border-top: 1px dashed #000; font-size: 10px;">
            <div>Thank you for your business!</div>
            <div>Visit again</div>
          </div>
        </div>
      `;
      
      printContent.style.position = 'absolute';
      printContent.style.left = '-9999px';
      printContent.style.top = '0';
      
      const canvas = await html2canvas(printContent, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: 'white'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `invoice_${invoiceData.invoiceNumber}_${new Date().getTime()}.png`;
      link.href = imgData;
      link.click();
      
      document.body.removeChild(printContent);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};