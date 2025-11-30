import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Product change detected, updating Google Sheets...');
    
    const payload = await req.json();
    console.log('Webhook payload:', JSON.stringify(payload, null, 2));

    // Get API key and spreadsheet ID from environment or settings
    const apiKey = Deno.env.get('GOOGLE_SHEETS_API_KEY');
    const spreadsheetId = Deno.env.get('GOOGLE_SHEETS_SPREADSHEET_ID');
    
    if (!apiKey || !spreadsheetId) {
      console.log('Google Sheets not configured, skipping sync');
      return new Response(JSON.stringify({ message: 'Google Sheets not configured' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const range = 'A:F';
    
    // Fetch current data from Google Sheets
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    const sheetsResponse = await fetch(sheetsUrl);
    
    if (!sheetsResponse.ok) {
      console.error('Failed to fetch from Google Sheets');
      return new Response(JSON.stringify({ error: 'Failed to fetch from Google Sheets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];
    
    if (rows.length === 0) {
      // Initialize with header if empty
      rows.push(['Name', 'Barcode', 'SKU', 'Quantity', 'Price', 'Buying Price']);
    }

    const record = payload.record;
    const eventType = payload.type;

    // Find the row index for this product
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowSku = row[2] ? row[2].trim() : null;
      const rowName = row[0] ? row[0].trim() : null;
      
      if ((record.sku && rowSku === record.sku) || 
          (!record.sku && rowName === record.name)) {
        rowIndex = i;
        break;
      }
    }

    if (eventType === 'DELETE') {
      // Remove the row
      if (rowIndex !== -1) {
        rows.splice(rowIndex, 1);
      }
    } else {
      // INSERT or UPDATE
      const newRow = [
        record.name || '',
        record.barcode || '',
        record.sku || '',
        record.quantity?.toString() || '0',
        record.price?.toString() || '0',
        record.buying_price?.toString() || '0'
      ];

      if (rowIndex === -1) {
        // Add new row
        rows.push(newRow);
      } else {
        // Update existing row
        rows[rowIndex] = newRow;
      }
    }

    // Write back to Google Sheets
    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW&key=${apiKey}`;
    const updateResponse = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows
      })
    });

    if (!updateResponse.ok) {
      console.error('Failed to update Google Sheets');
      return new Response(JSON.stringify({ error: 'Failed to update Google Sheets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Successfully synced to Google Sheets');
    
    return new Response(JSON.stringify({ 
      message: 'Successfully synced to Google Sheets',
      action: eventType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in update-sheets-on-product-change:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
