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
    
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const { apiKey, spreadsheetId } = body;
    
    console.log('API Key present:', !!apiKey);
    console.log('Spreadsheet ID:', spreadsheetId);
    
    if (!apiKey || !spreadsheetId) {
      return new Response(JSON.stringify({ error: 'API key and spreadsheet ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase environment variables not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try fetching with just A:F range (works for first sheet)
    const range = 'A:F';
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    console.log('Fetching from Google Sheets...');
    
    let sheetsResponse;
    try {
      sheetsResponse = await fetch(sheetsUrl);
    } catch (fetchError) {
      console.error('Network error fetching Google Sheets:', fetchError);
      return new Response(JSON.stringify({ 
        error: 'Failed to connect to Google Sheets API',
        details: fetchError instanceof Error ? fetchError.message : 'Network error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const responseText = await sheetsResponse.text();
    console.log('Sheets API status:', sheetsResponse.status);
    
    if (!sheetsResponse.ok) {
      console.error('Google Sheets API error:', responseText);
      return new Response(JSON.stringify({ 
        error: 'Google Sheets API error',
        details: responseText,
        status: sheetsResponse.status
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let sheetsData;
    try {
      sheetsData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse sheets response:', e);
      return new Response(JSON.stringify({ error: 'Invalid response from Google Sheets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const rows = sheetsData.values || [];
    console.log('Total rows from sheet:', rows.length);
    
    if (rows.length <= 1) {
      return new Response(JSON.stringify({ message: 'No data in sheets', changes: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let changesCount = 0;

    // Process each row from sheets (skip header row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || !row[0].toString().trim()) continue;

      const sheetProduct = {
        name: row[0].toString().trim(),
        barcode: row[1] ? row[1].toString().trim() : null,
        sku: row[2] ? row[2].toString().trim() : null,
        quantity: row[3] ? parseInt(row[3].toString()) || 0 : 0,
        price: row[4] ? parseFloat(row[4].toString()) || 0 : 0,
        buying_price: row[5] ? parseFloat(row[5].toString()) || 0 : 0,
      };

      console.log('Processing product:', sheetProduct.name);

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
      
      if (!existingProduct && sheetProduct.barcode) {
        const { data } = await supabase
          .from('products')
          .select('*')
          .eq('barcode', sheetProduct.barcode)
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
        } else {
          console.error('Failed to insert product:', error);
        }
      } else {
        // Check if product needs update (including quantity from sheet)
        const needsUpdate = 
          existingProduct.name !== sheetProduct.name ||
          existingProduct.barcode !== sheetProduct.barcode ||
          existingProduct.sku !== sheetProduct.sku ||
          existingProduct.quantity !== sheetProduct.quantity ||
          existingProduct.price !== sheetProduct.price ||
          existingProduct.buying_price !== sheetProduct.buying_price;

        if (needsUpdate) {
          const { error } = await supabase
            .from('products')
            .update({
              name: sheetProduct.name,
              barcode: sheetProduct.barcode,
              sku: sheetProduct.sku,
              quantity: sheetProduct.quantity,
              price: sheetProduct.price,
              buying_price: sheetProduct.buying_price,
            })
            .eq('id', existingProduct.id);
          
          if (!error) {
            changesCount++;
            console.log('Updated product from sheets:', sheetProduct.name);
          } else {
            console.error('Failed to update product:', error);
          }
        }
      }
    }

    console.log('Sync completed. Changes:', changesCount);

    return new Response(JSON.stringify({ 
      message: 'Sync from sheet completed',
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
