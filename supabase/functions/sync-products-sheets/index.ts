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
    console.log('Starting bi-directional Google Sheets product sync...');
    
    // Get API key and spreadsheet ID from request body
    const { apiKey, spreadsheetId } = await req.json();
    const range = 'A:F'; // Columns A to F (name, barcode, sku, quantity, price, buying_price)
    
    if (!apiKey) {
      console.error('Google Sheets API key not found');
      return new Response(JSON.stringify({ error: 'API key not configured' }), {
        status: 500,
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
      console.error('Error fetching products from database:', dbError);
      return new Response(JSON.stringify({ error: 'Failed to fetch products from database' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${dbProducts?.length || 0} products in database`);

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

    // Prepare updated rows for Google Sheets
    const updatedRows = [sheetsData.values[0]]; // Keep header row
    const sheetProductMap = new Map();
    
    // Map existing sheet products by name/SKU
    const rows = sheetsData.values.slice(1);
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] && row[0].trim()) {
        const key = row[2] ? row[2].trim() : row[0].trim(); // Use SKU or name as key
        sheetProductMap.set(key, { row, index: i + 2 }); // +2 because of header and 1-based indexing
      }
    }

    const syncedProducts = [];
    let syncCount = 0;
    let quantityUpdates = 0;
    let newFromSheets = 0;

    // Step 1: Update quantities in sheets from database
    console.log('Step 1: Updating quantities in Google Sheets from database...');
    for (const dbProduct of dbProducts || []) {
      const key = dbProduct.sku || dbProduct.name;
      const sheetProduct = sheetProductMap.get(key);
      
      if (sheetProduct) {
        // Update quantity in sheet from database
        const updatedRow = [...sheetProduct.row];
        updatedRow[3] = dbProduct.quantity.toString(); // Update quantity column
        updatedRows.push(updatedRow);
        sheetProductMap.delete(key); // Mark as processed
        quantityUpdates++;
        console.log(`Updated quantity for ${dbProduct.name} to ${dbProduct.quantity}`);
      }
    }

    // Add remaining sheet products that weren't in database (will be synced to DB)
    for (const [key, value] of sheetProductMap) {
      updatedRows.push(value.row);
    }

    // Step 2: Write updated data back to Google Sheets
    console.log('Step 2: Writing updated quantities back to Google Sheets...');
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
    } else {
      console.log(`Successfully updated ${quantityUpdates} quantities in Google Sheets`);
    }

    // Step 3: Sync new products from sheets to database
    console.log('Step 3: Syncing new products from Google Sheets to database...');
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

      // Check if product exists in database
      let existingProduct = null;
      
      if (productData.sku) {
        const { data: skuProduct } = await supabase
          .from('products')
          .select('*')
          .eq('sku', productData.sku)
          .maybeSingle();
        existingProduct = skuProduct;
      }
      
      if (!existingProduct) {
        const { data: nameProduct } = await supabase
          .from('products')
          .select('*')
          .eq('name', productData.name)
          .maybeSingle();
        existingProduct = nameProduct;
      }

      if (!existingProduct) {
        // Insert new product from sheet
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) {
          console.error('Error inserting product:', error);
        } else {
          console.log('Inserted new product from sheet:', productData.name);
          syncCount++;
          newFromSheets++;
          syncedProducts.push({ ...productData, action: 'created_from_sheet' });
        }
      }
    }

    console.log(`Sync completed. ${quantityUpdates} quantities updated in sheets, ${newFromSheets} new products from sheets.`);
    
    return new Response(JSON.stringify({ 
      message: 'Bi-directional sync completed successfully',
      quantitiesUpdated: quantityUpdates,
      newProductsFromSheets: newFromSheets,
      products: syncedProducts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in sync-products-sheets function:', error);
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