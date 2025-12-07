import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sheet, RefreshCw, CheckCircle, AlertCircle, Settings, Trash2, Save, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const GoogleSheetsSync = ({ onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    const savedApiKey = localStorage.getItem('googleSheetsApiKey') || '';
    const savedSpreadsheetId = localStorage.getItem('googleSheetsSpreadsheetId') || '';
    const savedLastSync = localStorage.getItem('googleSheetsLastSync');
    
    setApiKey(savedApiKey);
    setSpreadsheetId(savedSpreadsheetId);
    if (savedLastSync) setLastSync(new Date(savedLastSync));

    if (!savedApiKey || !savedSpreadsheetId) {
      setEditMode(true);
    }
  };

  const handleSaveSettings = () => {
    if (!apiKey.trim() || !spreadsheetId.trim()) {
      toast.error('Please enter both API Key and Spreadsheet ID');
      return;
    }

    localStorage.setItem('googleSheetsApiKey', apiKey.trim());
    localStorage.setItem('googleSheetsSpreadsheetId', spreadsheetId.trim());
    toast.success('Settings saved successfully');
    setEditMode(false);
  };

  const handleClearSettings = () => {
    localStorage.removeItem('googleSheetsApiKey');
    localStorage.removeItem('googleSheetsSpreadsheetId');
    localStorage.removeItem('googleSheetsLastSync');
    setApiKey('');
    setSpreadsheetId('');
    setLastSync(null);
    toast.success('Settings cleared successfully');
    setEditMode(true);
  };

  const handleClearAllProducts = async () => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (error) throw error;
      toast.success('All products cleared successfully');
      if (onSyncComplete) onSyncComplete();
    } catch (error) {
      console.error('Error clearing products:', error);
      toast.error('Failed to clear products');
    }
  };

  const handleClearBusinessDetails = () => {
    localStorage.removeItem('businessSettings');
    toast.success('Business details cleared successfully');
  };

  const handleSync = async () => {
    if (!apiKey || !spreadsheetId) {
      toast.error('Please configure API key and Spreadsheet ID first');
      setEditMode(true);
      return;
    }
    
    setSyncing(true);
    try {
      console.log('Starting sync from Google Sheets...');
      
      // Fetch directly from Google Sheets API
      const sheetRange = 'A:F';
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetRange)}?key=${apiKey}`;
      
      console.log('Fetching from:', url);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Sheets API error:', response.status, errorText);
        
        if (response.status === 403) {
          toast.error('API Key not authorized. Make sure Google Sheets API is enabled.');
        } else if (response.status === 404) {
          toast.error('Spreadsheet not found. Check the Spreadsheet ID.');
        } else if (response.status === 400) {
          toast.error('Invalid request. Check your API Key and Spreadsheet ID.');
        } else {
          toast.error(`Google Sheets error: ${response.status}`);
        }
        return;
      }

      const data = await response.json();
      console.log('Google Sheets response:', data);

      if (!data.values || data.values.length === 0) {
        toast.warning('No data found in the spreadsheet');
        return;
      }

      // Parse products from sheet data (skip header row if first cell looks like a header)
      const rows = data.values;
      const hasHeader = rows[0]?.[0]?.toString().toLowerCase().includes('name') || 
                        rows[0]?.[0]?.toString().toLowerCase().includes('product');
      const dataRows = hasHeader ? rows.slice(1) : rows;
      
      let syncedCount = 0;
      let updatedCount = 0;

      for (const row of dataRows) {
        if (!row[0] || row[0].toString().trim() === '') continue;

        const productData = {
          name: row[0]?.toString().trim() || '',
          barcode: row[1]?.toString().trim() || null,
          sku: row[2]?.toString().trim() || null,
          quantity: parseInt(row[3]) || 0,
          price: parseFloat(row[4]) || 0,
          buying_price: parseFloat(row[5]) || 0,
        };

        // Check if product exists by SKU or name
        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .or(`sku.eq.${productData.sku},name.eq.${productData.name}`)
          .limit(1);

        if (existing && existing.length > 0) {
          // Update existing product
          const { error } = await supabase
            .from('products')
            .update(productData)
            .eq('id', existing[0].id);
          
          if (!error) updatedCount++;
        } else {
          // Insert new product
          const { error } = await supabase
            .from('products')
            .insert(productData);
          
          if (!error) syncedCount++;
        }
      }

      const now = new Date();
      setLastSync(now);
      localStorage.setItem('googleSheetsLastSync', now.toISOString());

      toast.success(`Synced: ${syncedCount} new, ${updatedCount} updated`);
      console.log('Products synced to database:', syncedCount + updatedCount);
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="gradient-card shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sheet className="w-5 h-5" />
          Google Sheets Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {editMode ? (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="apiKey">Google Sheets API Key</Label>
              <div className="relative">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter API key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
              <Input
                id="spreadsheetId"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="Enter spreadsheet ID"
              />
              <p className="text-xs text-muted-foreground">
                Found in URL: docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
              </p>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSaveSettings} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              {(apiKey || spreadsheetId) && (
                <Button onClick={() => setEditMode(false)} variant="outline">
                  Cancel
                </Button>
              )}
              {(apiKey || spreadsheetId) && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear Settings?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will remove your API key and spreadsheet ID.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearSettings}>Clear</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  {apiKey && spreadsheetId ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      Connected
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-yellow-500" />
                      Not Configured
                    </>
                  )}
                </Badge>
                {spreadsheetId && (
                  <span className="text-sm text-muted-foreground">
                    ID: {spreadsheetId.substring(0, 10)}...
                  </span>
                )}
              </div>
              <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>
        )}
        
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">Column mapping:</p>
          <ul className="space-y-1 text-xs">
            <li>• Column A: Product Name</li>
            <li>• Column B: Barcode</li>
            <li>• Column C: SKU Number</li>
            <li>• Column D: Quantity</li>
            <li>• Column E: Price (Selling)</li>
            <li>• Column F: Buying Price (Cost)</li>
          </ul>
        </div>

        {lastSync && (
          <div className="text-sm">
            <p className="text-muted-foreground">Last sync: {lastSync.toLocaleString()}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={handleSync} 
            disabled={syncing || !apiKey || !spreadsheetId}
            className="gradient-primary text-white border-0 flex items-center gap-2"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {syncing ? 'Syncing...' : 'Sync from Sheet'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Clear All Products
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear All Products?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete all products from local storage.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearAllProducts} className="bg-destructive text-destructive-foreground">
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Clear Business Details
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Business Details?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove your business name, address, phone, and logo.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleClearBusinessDetails}>
                  Clear
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p>Products sync directly from Google Sheets to your browser's local storage. Make sure your spreadsheet is publicly accessible (View access) or the API key has proper permissions.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleSheetsSync;
