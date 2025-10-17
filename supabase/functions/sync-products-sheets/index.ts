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
    console.log('Starting Google Sheets product sync...');
    
    // Initialize Supabase client first to get settings
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Google Sheets settings from database
    const { data: settings, error: settingsError } = await supabase
      .from('google_sheets_settings')
      .select('*')
      .single();

    if (settingsError || !settings) {
      console.error('Settings not found:', settingsError);
      return new Response(JSON.stringify({ error: 'Google Sheets settings not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = settings.api_key;
    const spreadsheetId = settings.spreadsheet_id;
    const range = 'A:F'; // Columns A to F (name, barcode, sku, quantity, price, buying_price)
    
    if (!apiKey) {
      console.error('Google Sheets API key not found');
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch data from Google Sheets
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${apiKey}`;
    console.log('Fetching from Google Sheets:', sheetsUrl);
    
    const sheetsResponse = await fetch(sheetsUrl);
    
    if (!sheetsResponse.ok) {
      console.error('Failed to fetch from Google Sheets:', sheetsResponse.status, sheetsResponse.statusText);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch from Google Sheets',
        details: `${sheetsResponse.status}: ${sheetsResponse.statusText}`
      }), {
        status: sheetsResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sheetsData = await sheetsResponse.json();
    console.log('Raw sheets data:', JSON.stringify(sheetsData, null, 2));
    
    if (!sheetsData.values || sheetsData.values.length <= 1) {
      console.log('No data found in sheets or only header row');
      return new Response(JSON.stringify({ 
        message: 'No product data found in sheets',
        synced: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // Process the sheets data (skip header row)
    const rows = sheetsData.values.slice(1);
    const syncedProducts = [];
    let syncCount = 0;

    for (const row of rows) {
      // Skip rows that don't have at least a product name
      if (!row[0] || !row[0].trim()) {
        continue;
      }

      const productData = {
        name: row[0].trim(),
        barcode: row[1] ? row[1].trim() : null,
        sku: row[2] ? row[2].trim() : null,
        quantity: row[3] ? parseInt(row[3]) || 0 : 0,
        price: row[4] ? parseFloat(row[4]) || 0 : 0,
        buying_price: row[5] ? parseFloat(row[5]) || 0 : 0,
      };

      console.log('Processing product:', productData);

      try {
        // Check if product exists by name or SKU
        let existingProduct = null;
        
        if (productData.sku) {
          const { data: skuProduct } = await supabase
            .from('products')
            .select('*')
            .eq('sku', productData.sku)
            .single();
          existingProduct = skuProduct;
        }
        
        if (!existingProduct) {
          const { data: nameProduct } = await supabase
            .from('products')
            .select('*')
            .eq('name', productData.name)
            .single();
          existingProduct = nameProduct;
        }

        if (existingProduct) {
          // Update existing product
          const { error } = await supabase
            .from('products')
            .update(productData)
            .eq('id', existingProduct.id);

          if (error) {
            console.error('Error updating product:', error);
          } else {
            console.log('Updated product:', productData.name);
            syncCount++;
            syncedProducts.push({ ...productData, action: 'updated' });
          }
        } else {
          // Insert new product
          const { error } = await supabase
            .from('products')
            .insert(productData);

          if (error) {
            console.error('Error inserting product:', error);
          } else {
            console.log('Inserted new product:', productData.name);
            syncCount++;
            syncedProducts.push({ ...productData, action: 'created' });
          }
        }
      } catch (productError) {
        console.error('Error processing product:', productData.name, productError);
      }
    }

    console.log(`Sync completed. ${syncCount} products processed.`);
    
    return new Response(JSON.stringify({ 
      message: 'Products synced successfully',
      synced: syncCount,
      products: syncedProducts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-products-sheets function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});