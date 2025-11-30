import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Syncing app quantities to Google Sheets...');
    
    const { apiKey, spreadsheetId } = await req.json();
    const range = 'A:F';
    
    if (!apiKey || !spreadsheetId) {
      return new Response(JSON.stringify({ error: 'API key and spreadsheet ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all products from database
    console.log('Fetching products from database...');
    const { data: dbProducts, error: dbError } = await supabase
      .from('products')
      .select('*');

    if (dbError) {
      console.error('Error fetching products:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to fetch products' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch data from Google Sheets
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    const sheetsResponse = await fetch(sheetsUrl);
    
    if (!sheetsResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch from Google Sheets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sheetsData = await sheetsResponse.json();
    
    if (!sheetsData.values || sheetsData.values.length <= 1) {
      return new Response(JSON.stringify({ 
        message: 'No data found in sheets',
        quantitiesUpdated: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a map of database products by SKU/Name
    const dbProductMap = new Map();
    for (const product of dbProducts || []) {
      const key = product.sku || product.name;
      dbProductMap.set(key, product);
    }

    // Update quantities in sheet rows
    const updatedRows = [sheetsData.values[0]]; // Keep header
    let quantitiesUpdated = 0;
    
    for (let i = 1; i < sheetsData.values.length; i++) {
      const row = sheetsData.values[i];
      if (!row[0] || !row[0].trim()) continue;

      const key = row[2] ? row[2].trim() : row[0].trim(); // SKU or Name
      const dbProduct = dbProductMap.get(key);
      
      const updatedRow = [...row];
      if (dbProduct) {
        // Update quantity (column D, index 3)
        if (updatedRow[3] !== dbProduct.quantity.toString()) {
          updatedRow[3] = dbProduct.quantity.toString();
          quantitiesUpdated++;
          console.log(`Updated ${dbProduct.name}: ${row[3]} → ${dbProduct.quantity}`);
        }
      }
      updatedRows.push(updatedRow);
    }

    // Write updated data back to Google Sheets
    if (quantitiesUpdated > 0) {
      console.log(`Writing ${quantitiesUpdated} quantity updates to Google Sheets...`);
      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW&key=${apiKey}`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: updatedRows
        })
      });

      if (!updateResponse.ok) {
        console.error('Failed to update Google Sheets:', updateResponse.status);
        return new Response(JSON.stringify({ error: 'Failed to update Google Sheets' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    console.log(`Sync completed. ${quantitiesUpdated} quantities updated in sheets.`);
    
    return new Response(JSON.stringify({ 
      message: 'Quantities synced to sheets successfully',
      quantitiesUpdated
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-app-to-sheets:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});