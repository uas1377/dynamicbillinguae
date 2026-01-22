import { getBusinessSettings } from "./localStorageData";
import { getStoredFlats } from "./buildingFlatStorage";
import { sendToBluetoothPrinter } from "./bluetoothPrintService";

export const printHistoricalReceipt = async (invoice) => {
  // Check if Bluetooth printer is connected
  const isBluetoothActive = typeof window !== 'undefined' && !!window.bluetoothPrinterCharacteristic;
  
  if (isBluetoothActive) {
    try {
      console.log("Routing historical receipt to Bluetooth Printer...");
      await sendToBluetoothPrinter(invoice);
      return;
    } catch (error) {
      console.error("Bluetooth print failed, falling back to Browser Print:", error);
      // Fall through to browser print below
    }
  }
  
  // Fallback: Browser Print Dialog
  const settings = getBusinessSettings();
  const flats = getStoredFlats();
  // Detect currency from settings or default to AED
  const currencyCode = settings.currencyCode || 'AED';

  const flatInfo = flats.find(f => f.id === invoice.flat_id);

  const printWindow = window.open('', '_blank', 'width=350,height=600');
  
  const html = `
    <html>
      <head>
        <style>
          /* Optimized for 2.5 inch (64mm) paper */
          @page { size: 64mm auto; margin: 0; }
          body { 
            font-family: Arial, sans-serif; 
            width: 58mm; 
            padding: 2mm; 
            font-size: 11px; 
            line-height: 1.2;
            margin: 0 auto;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .border-top { border-top: 1px dashed #000; margin-top: 6px; padding-top: 6px; }
          .flex { display: flex; justify-content: space-between; }
          .items-table { width: 100%; margin: 8px 0; border-collapse: collapse; font-size: 10px; }
          .items-table th { border-bottom: 1px solid #000; padding: 3px 0; text-transform: uppercase; }
          .items-table td { padding: 3px 0; vertical-align: top; }
          .logo { width: 60px; height: auto; object-fit: contain; margin-bottom: 5px; display: inline-block; }
          /* Status style matching the look of a thermal print badge */
          .status-banner {
            margin: 5px 0;
            padding: 3px;
            border: 1px solid #000;
            text-transform: uppercase;
            font-weight: bold;
            display: inline-block;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <div class="center">
          ${settings.logo ? `<img src="${settings.logo}" class="logo" alt="Logo" />` : ''}
          <div class="bold" style="font-size: 14px;">${settings.name || 'BUSINESS NAME'}</div>
          <div>${settings.address || ''}</div>
          <div>Tel: ${settings.phone || ''}</div>
          
          <div class="status-banner">
            ${invoice.status === 'paid' ? '*** PAID ***' : '*** UNPAID ***'}
          </div>
        </div>

        <div class="border-top">
          <div class="flex"><span>Inv No:</span> <span class="bold">${invoice.invoice_number}</span></div>
          <div class="flex"><span>Date:</span> <span>${new Date(invoice.created_at || invoice.date).toLocaleDateString()}</span></div>
          
          <div class="flex"><span>Cashier:</span> <span>${invoice.cashier_name || 'Admin'}</span></div>
          ${invoice.status === 'paid' ? `
            <div class="flex"><span>Received By:</span> <span class="bold">${invoice.paid_by_cashier || invoice.cashier_name || 'Admin'}</span></div>
          ` : ''}
          
          <div class="flex"><span>Flat:</span> <span class="bold">${invoice.customer_name || 'N/A'}</span></div>
          <div class="flex"><span>Cust ID:</span> <span class="bold">${flatInfo?.user_id || 'N/A'}</span></div>
        </div>

        <table class="items-table">
          <thead>
            <tr>
              <th style="text-align:left">Item</th>
              <th style="text-align:center">Qty</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td style="text-align:center">${item.quantity}</td>
                <td style="text-align:right">${(item.amount * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="border-top">
          <div class="flex bold" style="font-size: 12px;">
            <span>GRAND TOTAL:</span>
            <span>${currencyCode} ${Number(invoice.grand_total).toFixed(2)}</span>
          </div>
        </div>

        <div class="center border-top" style="margin-top: 10px; font-size: 9px;">
          <div>${settings.footerNote || 'Thank you!'}</div>
        </div>

        <script>
          window.onload = () => { 
            window.print(); 
            setTimeout(() => { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
