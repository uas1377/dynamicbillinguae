import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Polling Google Sheets for changes...');
    
    const { apiKey, spreadsheetId } = await req.json();
    const range = 'A:F';
    
    if (!apiKey || !spreadsheetId) {
      return new Response(JSON.stringify({ error: 'API key and spreadsheet ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch from Google Sheets
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    const sheetsResponse = await fetch(sheetsUrl);
    
    if (!sheetsResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch from Google Sheets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sheetsData = await sheetsResponse.json();
    const rows = sheetsData.values || [];
    
    if (rows.length <= 1) {
      return new Response(JSON.stringify({ message: 'No data in sheets', changes: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let changesCount = 0;

    // Process each row from sheets
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || !row[0].trim()) continue;

      const sheetProduct = {
        name: row[0].trim(),
        barcode: row[1] ? row[1].trim() : null,
        sku: row[2] ? row[2].trim() : null,
        quantity: row[3] ? parseInt(row[3]) || 0 : 0,
        price: row[4] ? parseFloat(row[4]) || 0 : 0,
        buying_price: row[5] ? parseFloat(row[5]) || 0 : 0,
      };

      // Check if product exists in database
      let existingProduct = null;
      
      if (sheetProduct.sku) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('sku', sheetProduct.sku)
          .maybeSingle();
        existingProduct = data;
      }
      
      if (!existingProduct) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('name', sheetProduct.name)
          .maybeSingle();
        existingProduct = data;
      }

      if (!existingProduct) {
        // Insert new product
        const { error } = await supabase
          .from('products')
          .insert(sheetProduct);
        
        if (!error) {
          changesCount++;
          console.log('Added new product from sheets:', sheetProduct.name);
        }
      } else {
        // Check if product needs update (excluding quantity which is managed by app)
        const needsUpdate = 
          existingProduct.name !== sheetProduct.name ||
          existingProduct.barcode !== sheetProduct.barcode ||
          existingProduct.sku !== sheetProduct.sku ||
          existingProduct.price !== sheetProduct.price ||
          existingProduct.buying_price !== sheetProduct.buying_price;

        if (needsUpdate) {
          const { error } = await supabase
            .from('products')
            .update({
              name: sheetProduct.name,
              barcode: sheetProduct.barcode,
              sku: sheetProduct.sku,
              price: sheetProduct.price,
              buying_price: sheetProduct.buying_price,
            })
            .eq('id', existingProduct.id);
          
          if (!error) {
            changesCount++;
            console.log('Updated product from sheets:', sheetProduct.name);
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Polling completed',
      changes: changesCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in poll-sheets-for-changes:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
