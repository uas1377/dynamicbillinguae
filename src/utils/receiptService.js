import { getBusinessSettings } from "./localStorageData";
import { getStoredFlats } from "./buildingFlatStorage";
import { isBluetoothPrinterConnected, sendToBluetoothPrinter } from "./bluetoothPrintService";

export const printHistoricalReceipt = async (invoice) => {
  const settings = getBusinessSettings();
  const flats = getStoredFlats();
  
  // Check if Bluetooth printer is connected
  if (isBluetoothPrinterConnected()) {
    try {
      // Format invoice data for Bluetooth printer
      const bluetoothData = {
        invoiceNumber: invoice.invoice_number,
        invoice_number: invoice.invoice_number,
        customerName: invoice.customer_name,
        customer_name: invoice.customer_name,
        customerPhone: invoice.customer_phone,
        customer_phone: invoice.customer_phone,
        customerId: flats.find(f => f.id === invoice.flat_id)?.user_id,
        customer_id: flats.find(f => f.id === invoice.flat_id)?.user_id,
        cashierName: invoice.cashier_name,
        cashier_name: invoice.cashier_name,
        items: invoice.items,
        subTotal: invoice.sub_total,
        sub_total: invoice.sub_total,
        taxRate: invoice.tax_rate,
        tax_rate: invoice.tax_rate,
        taxAmount: invoice.tax_amount,
        tax_amount: invoice.tax_amount,
        discountAmount: invoice.discount_amount || 0,
        discount_amount: invoice.discount_amount || 0,
        grandTotal: invoice.grand_total,
        grand_total: invoice.grand_total,
        amountReceived: invoice.amount_received,
        amount_received: invoice.amount_received,
        changeAmount: invoice.change_amount,
        change_amount: invoice.change_amount,
        status: invoice.status,
        yourCompany: settings
      };
      
      await sendToBluetoothPrinter(bluetoothData);
      console.log('Historical receipt printed via Bluetooth');
      return;
    } catch (error) {
      console.error('Bluetooth print failed, falling back to browser print:', error);
      // Fall through to browser print
    }
  }
  
  // Fallback to browser print dialog (original code unchanged)
  const currencyCode = settings.currencyCode || 'currency';
  const flatInfo = flats.find(f => f.id === invoice.flat_id);

  const printWindow = window.open('', '_blank', 'width=350,height=600');
  
  const html = `
    <html>
      <head>
        <style>
          @page { size: 56mm auto; margin: 0; }
          body { 
            font-family: Arial, sans-serif; 
            width: 56mm; padding: 3mm; box-sizing: border-box; font-size: 10px; line-height: 1.3;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .border-top { border-top: 1px dashed #000; margin-top: 8px; padding-top: 8px; }
          .flex { display: flex; justify-content: space-between; }
          .items-table { width: 100%; margin: 10px 0; border-collapse: collapse; font-size: 10px; }
          .items-table th { border-bottom: 1px solid #000; padding: 4px 0; text-transform: uppercase; }
          .items-table td { padding: 4px 0; vertical-align: top; }
        </style>
      </head>
      <body>
        <div class="center">
           ${settings.logo ? `<img src="${settings.logo}" alt="Logo" style="width: 80px; height: 80px; object-fit: contain; margin: 0 auto 8px;" />` : ''}

          <div class="bold" style="font-size: 16px;">${settings.name || 'BUSINESS NAME'}</div>
          <div>${settings.address || ''}</div>
          <div>Tel: ${settings.phone || ''}</div>
        </div>

        <div class="border-top">
          <div class="flex"><span>Invoice No:</span> <span class="bold">${invoice.invoice_number}</span></div>
          <div class="flex"><span>Date:</span> <span>${new Date(invoice.created_at).toLocaleString()}</span></div>
          
          <div class="flex"><span>Cashier:</span> <span>${invoice.cashier_name || 'Admin'}</span></div>
          ${invoice.status === 'paid' ? `
            <div class="flex"><span>Received By:</span> <span class="bold">${invoice.paid_by_cashier || invoice.cashier_name || 'Admin'}</span></div>
          ` : ''}
          
          <div class="flex"><span>Flat:</span> <span class="bold">${invoice.customer_name || 'N/A'}</span></div>
          <div class="flex"><span>Customer ID:</span> <span class="bold">${flatInfo?.user_id || 'N/A'}</span></div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="text-align:left">Item / SKU</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:center">Rate</th>
              <th style="text-align:right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.name}<br/><span style="font-size:8px; color:#555;">${item.sku || '-'}</span></td>
                <td style="text-align:center">${item.quantity}</td>
                <td style="text-align:center">${Number(item.amount).toFixed(2)}</td>
                <td style="text-align:right">${(item.amount * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="border-top">
          <div class="flex bold" style="font-size: 13px;">
            <span>GRAND TOTAL:</span>
            <span>${currencyCode} ${invoice.grand_total.toFixed(2)}</span>
          </div>
        </div>

        <div class="center border-top" style="margin-top: 15px; font-size: 10px;">
          <div>${settings.footerNote || 'Thank you!'}</div>
        </div>

        <script>
          window.onload = () => { window.print(); window.close(); };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
