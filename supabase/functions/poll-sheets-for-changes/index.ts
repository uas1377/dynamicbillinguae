import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { apiKey, spreadsheetId } = await req.json();
    
    console.log('Poll sheets - API Key present:', !!apiKey, 'Spreadsheet ID:', spreadsheetId);
    
    if (!apiKey || !spreadsheetId) {
      return new Response(
        JSON.stringify({ error: 'API key and spreadsheet ID required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch data from Google Sheets
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:F?key=${apiKey}`;
    console.log('Fetching from Google Sheets API...');
    
    const sheetsResponse = await fetch(sheetsUrl);
    
    if (!sheetsResponse.ok) {
      const errorText = await sheetsResponse.text();
      console.error('Sheets API error:', sheetsResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Google Sheets API error', 
          details: `Status ${sheetsResponse.status}: ${errorText}` 
        }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];
    console.log('Rows received:', rows.length);
    
    if (rows.length <= 1) {
      return new Response(
        JSON.stringify({ message: 'No data in sheet', changes: 0 }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let changesCount = 0;

    // Process rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || !row[0].toString().trim()) continue;

      const product = {
        name: row[0]?.toString().trim() || '',
        barcode: row[1]?.toString().trim() || null,
        sku: row[2]?.toString().trim() || null,
        quantity: parseInt(row[3]?.toString()) || 0,
        price: parseFloat(row[4]?.toString()) || 0,
        buying_price: parseFloat(row[5]?.toString()) || 0,
      };

      console.log('Processing:', product.name);

      // Find existing product by SKU, barcode, or name
      let existing = null;
      
      if (product.sku) {
        const { data } = await supabase.from('products').select('*').eq('sku', product.sku).maybeSingle();
        existing = data;
      }
      if (!existing && product.barcode) {
        const { data } = await supabase.from('products').select('*').eq('barcode', product.barcode).maybeSingle();
        existing = data;
      }
      if (!existing) {
        const { data } = await supabase.from('products').select('*').eq('name', product.name).maybeSingle();
        existing = data;
      }

      if (!existing) {
        // Insert new product
        const { error } = await supabase.from('products').insert(product);
        if (!error) {
          changesCount++;
          console.log('Added:', product.name);
        } else {
          console.error('Insert error:', error);
        }
      } else {
        // Update if changed
        const needsUpdate = 
          existing.quantity !== product.quantity ||
          existing.price !== product.price ||
          existing.buying_price !== product.buying_price ||
          existing.barcode !== product.barcode ||
          existing.sku !== product.sku;

        if (needsUpdate) {
          const { error } = await supabase.from('products').update(product).eq('id', existing.id);
          if (!error) {
            changesCount++;
            console.log('Updated:', product.name);
          } else {
            console.error('Update error:', error);
          }
        }
      }
    }

    console.log('Sync complete. Changes:', changesCount);
    
    return new Response(
      JSON.stringify({ message: 'Sync completed', changes: changesCount }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Server error', details: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
