import { getBusinessSettings } from "./localStorageData";
import { getStoredFlats } from "./buildingFlatStorage";
import { isBluetoothPrinterConnected, sendToBluetoothPrinter } from "./bluetoothPrintService";

export const printHistoricalReceipt = async (invoice) => {
  const settings = getBusinessSettings();
  const flats = getStoredFlats();
  const currencyCode = settings.currencyCode || 'SR'; // Changed default to SR as per your print

  // Detect monthly summary (no invoice_number field or empty)
  const isMonthly = !invoice.invoice_number || invoice.invoice_number === '' || invoice.invoice_number === null;

  const flatInfo = flats.find(f => f.id === invoice.flat_id);

  // Bluetooth printing
  if (isBluetoothPrinterConnected()) {
    try {
      const bluetoothData = {
        invoiceNumber: invoice.invoice_number,
        invoice_number: invoice.invoice_number,
        customerName: invoice.customer_name || invoice.customerName,
        customer_name: invoice.customer_name || invoice.customerName,
        customerPhone: invoice.customer_phone || invoice.customerPhone,
        customer_phone: invoice.customer_phone || invoice.customerPhone,
        customerId: invoice.customer_id || invoice.customerId || flatInfo?.user_id,
        customer_id: invoice.customer_id || invoice.customerId || flatInfo?.user_id,
        cashierName: invoice.cashier_name || invoice.cashierName,
        cashier_name: invoice.cashier_name || invoice.cashierName,
        items: invoice.items || [],
        subTotal: invoice.sub_total || invoice.subTotal || 0,
        sub_total: invoice.sub_total || invoice.subTotal || 0,
        grandTotal: invoice.grand_total || invoice.grandTotal || 0,
        grand_total: invoice.grand_total || invoice.grandTotal || 0,
        status: invoice.status,
        yourCompany: settings,
        isMonthlySummary: isMonthly
      };

      await sendToBluetoothPrinter(bluetoothData);
      console.log('Receipt printed via Bluetooth');
      return;
    } catch (error) {
      console.error('Bluetooth print failed, falling back to browser:', error);
    }
  }

  // Browser print fallback
  const html = `
    <html>
      <head>
        <style>
          @page { size: 58mm auto; margin: 0; }
          body { 
            font-family: 'Courier New', monospace; 
            width: 58mm; 
            padding: 2mm 3mm; 
            font-size: 11px; 
            line-height: 1.3;
            box-sizing: border-box;
            color: #000;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .border-top { border-top: 1px dashed #000; margin: 6px 0; padding-top: 6px; }
          .flex { display: flex; justify-content: space-between; }
          table { width: 100%; border-collapse: collapse; margin: 6px 0; }
          th { 
            border-bottom: 1px solid #000; 
            text-align: left; 
            font-size: 9px; 
            padding: 3px 0; 
            text-transform: uppercase;
          }
          td { padding: 3px 0; font-size: 10px; vertical-align: top; }
          .amount { text-align: right; }
          .status-paid { color: green; font-weight: bold; }
          .status-unpaid { color: red; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="center">
          ${settings.logo ? `<img src="${settings.logo}" alt="Logo" style="width:70px;height:auto;margin-bottom:4px;" />` : ''}
          <div class="bold" style="font-size:14px;">${settings.name || 'GALAXY'}</div>
          <div style="font-size:10px;">${settings.address || 'shop 34, rassaz'}</div>
          <div style="font-size:10px;">Tel: ${settings.phone || '8291952317'}</div>
          <div style="font-size:9px;">${settings.email || 'ansaronline1377@gmail.com'}</div>
        </div>

        <div class="border-top">
          ${!isMonthly ? `
            <div class="flex"><span>Invoice No:</span><span class="bold">${invoice.invoice_number || '—'}</span></div>
            <div class="flex"><span>Date:</span><span>${new Date(invoice.created_at || Date.now()).toLocaleDateString('en-GB')}</span></div>
            <div class="flex"><span>Time:</span><span>${new Date(invoice.created_at || Date.now()).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</span></div>
          ` : ''}
          
          <div class="flex"><span>Customer:</span><span class="bold">${invoice.customer_name || invoice.customerName || 'N/A'}</span></div>
          <div class="flex"><span>Customer ID:</span><span class="bold">${invoice.customer_id || invoice.customerId || flatInfo?.user_id || 'N/A'}</span></div>
          
          ${!isMonthly ? `
            <div class="flex"><span>Cashier:</span><span>${invoice.cashier_name || invoice.cashierName || 'Admin'}</span></div>
            ${invoice.status === 'paid' ? `
              <div class="flex"><span>Received By:</span><span class="bold">${invoice.paid_by_cashier || '—'}</span></div>
            ` : ''}
          ` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align:left">${isMonthly ? 'Invoice No' : 'Item / SKU'}</th>
              ${isMonthly ? '<th style="text-align:left">Date</th>' : ''}
              <th style="text-align:center">${isMonthly ? 'Status' : 'Qty'}</th>
              ${!isMonthly ? '<th style="text-align:center">Rate</th>' : ''}
              <th class="amount">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.items?.map(item => {
              if (isMonthly) {
                return `
                  <tr>
                    <td>${item.invoice_number || item.name || '—'}</td>
                    <td>${item.date || '—'}</td>
                    <td class="center ${item.status?.toLowerCase() === 'paid' ? 'status-paid' : 'status-unpaid'}">
                      ${item.status || '—'}
                    </td>
                    <td class="amount">${Number(item.amount || 0).toFixed(2)}</td>
                  </tr>
                `;
              } else {
                return `
                  <tr>
                    <td>${item.name}<br><span style="font-size:9px;color:#555;">${item.sku || '—'}</span></td>
                    <td class="center">${item.quantity || 1}</td>
                    <td class="center">${Number(item.amount || 0).toFixed(2)}</td>
                    <td class="amount">${(item.quantity * item.amount || 0).toFixed(2)}</td>
                  </tr>
                `;
              }
            }).join('') || '<tr><td colspan="4" class="center">No items</td></tr>'}
          </tbody>
        </table>

        <div class="border-top">
          <div class="flex bold" style="font-size:13px;">
            <span>GRAND TOTAL:</span>
            <span>${currencyCode} ${Number(invoice.grand_total || invoice.grandTotal || 0).toFixed(2)}</span>
          </div>
        </div>

        <!-- Amount Paid / Change - ONLY for non-monthly -->
        ${!isMonthly && invoice.status === 'paid' ? `
          <div class="border-top mt-2">
            <div class="flex">
              <span>Amount Paid:</span>
              <span>${currencyCode} ${Number(invoice.amount_received || 0).toFixed(2)}</span>
            </div>
            ${Number(invoice.change_amount || 0) > 0 ? `
              <div class="flex">
                <span>Change:</span>
                <span>${currencyCode} ${Number(invoice.change_amount).toFixed(2)}</span>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div class="center border-top" style="margin-top:12px; font-size:9px;">
          <div>${settings.footerNote || 'Thank you for shopping!'}</div>
          <div>Visit again</div>
        </div>

        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank', 'width=380,height=650');
  printWindow.document.write(html);
  printWindow.document.close();
};
