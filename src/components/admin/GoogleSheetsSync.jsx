import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sheet, RefreshCw, CheckCircle, AlertCircle, Settings, Trash2, Save } from "lucide-react";
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
  const [syncStats, setSyncStats] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [autoSync, setAutoSync] = useState(false);
  const [syncInterval, setSyncInterval] = useState(30);
  const [syncingToSheet, setSyncingToSheet] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-sync polling
  useEffect(() => {
    if (!autoSync || !apiKey || !spreadsheetId) return;

    const pollSheets = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('poll-sheets-for-changes', {
          body: { apiKey, spreadsheetId }
        });

        if (error) throw error;
        
        if (data.changes > 0) {
          console.log(`Auto-sync: ${data.changes} changes from sheets`);
        }
      } catch (error) {
        console.error('Auto-sync error:', error);
      }
    };

    const intervalId = setInterval(pollSheets, syncInterval * 1000);
    pollSheets(); // Run immediately

    return () => clearInterval(intervalId);
  }, [autoSync, apiKey, spreadsheetId, syncInterval]);

  const loadSettings = () => {
    const savedApiKey = localStorage.getItem('googleSheetsApiKey') || '';
    const savedSpreadsheetId = localStorage.getItem('googleSheetsSpreadsheetId') || '';
    const savedAutoSync = localStorage.getItem('googleSheetsAutoSync');
    const savedSyncInterval = localStorage.getItem('googleSheetsSyncInterval');
    
    setApiKey(savedApiKey);
    setSpreadsheetId(savedSpreadsheetId);
    if (savedAutoSync) setAutoSync(savedAutoSync === 'true');
    if (savedSyncInterval) setSyncInterval(parseInt(savedSyncInterval));
  };

  const handleSaveSettings = () => {
    localStorage.setItem('googleSheetsApiKey', apiKey);
    localStorage.setItem('googleSheetsSpreadsheetId', spreadsheetId);
    localStorage.setItem('googleSheetsAutoSync', autoSync.toString());
    localStorage.setItem('googleSheetsSyncInterval', syncInterval.toString());
    toast.success('Settings saved successfully');
    setEditMode(false);
  };

  const handleClearSettings = () => {
    localStorage.removeItem('googleSheetsApiKey');
    localStorage.removeItem('googleSheetsSpreadsheetId');
    setApiKey('');
    setSpreadsheetId('');
    toast.success('Settings cleared successfully');
    setEditMode(false);
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

  const handleClearBusinessDetails = async () => {
    try {
      localStorage.removeItem('businessSettings');
      toast.success('Business details cleared successfully');
    } catch (error) {
      console.error('Error clearing business details:', error);
      toast.error('Failed to clear business details');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      console.log('Starting manual sync (Sheet → App)...');
      
      const { data, error } = await supabase.functions.invoke('poll-sheets-for-changes', {
        body: { 
          apiKey: apiKey,
          spreadsheetId: spreadsheetId 
        }
      });

      if (error) {
        console.error('Sync error:', error);
        toast.error('Failed to sync: ' + error.message);
        return;
      }

      console.log('Sync response:', data);
      setLastSync(new Date());
      
      if (data.changes > 0) {
        toast.success(`Synced ${data.changes} products from sheet to app`);
      } else {
        toast.info('No changes to sync');
      }
      
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Failed to sync: ' + error.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncToSheet = async () => {
    setSyncingToSheet(true);
    try {
      console.log('Starting sync (App → Sheet quantities)...');
      
      const { data, error } = await supabase.functions.invoke('sync-app-to-sheets', {
        body: { 
          apiKey: apiKey,
          spreadsheetId: spreadsheetId 
        }
      });

      if (error) {
        console.error('Sync error:', error);
        toast.error('Failed to sync: ' + error.message);
        return;
      }

      console.log('Sync response:', data);
      
      if (data.quantitiesUpdated > 0) {
        toast.success(`Updated ${data.quantitiesUpdated} quantities in sheet`);
      } else {
        toast.info('All quantities are up to date');
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Failed to sync: ' + error.message);
    } finally {
      setSyncingToSheet(false);
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
        {/* Settings Section */}
            {editMode ? (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Google Sheets API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter API key"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
                  <Input
                    id="spreadsheetId"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="Enter spreadsheet ID"
                  />
                </div>
                
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-sm font-medium">Auto-Sync</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically sync changes from Google Sheets
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={(e) => setAutoSync(e.target.checked)}
                      className="h-4 w-4"
                    />
                  </div>
                  
                  {autoSync && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Sync Interval (seconds)
                      </Label>
                      <Input
                        type="number"
                        min="10"
                        max="300"
                        value={syncInterval}
                        onChange={(e) => setSyncInterval(parseInt(e.target.value) || 30)}
                        placeholder="30"
                      />
                      <p className="text-xs text-muted-foreground">
                        How often to check for changes (10-300 seconds)
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSaveSettings} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                  <Button onClick={() => setEditMode(false)} variant="outline">
                    Cancel
                  </Button>
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
                          This will remove your API key and spreadsheet ID. You'll need to re-enter them to sync.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearSettings}>Clear</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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

                {autoSync && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Auto-sync enabled (every {syncInterval}s)
                  </div>
                )}
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
            {syncStats && (
              <div className="text-green-600 space-y-1">
                {syncStats.quantitiesUpdated > 0 && (
                  <p>• {syncStats.quantitiesUpdated} quantities updated in sheets</p>
                )}
                {syncStats.newProductsFromSheets > 0 && (
                  <p>• {syncStats.newProductsFromSheets} new products from sheets</p>
                )}
              </div>
            )}
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

          <Button 
            onClick={handleSyncToSheet} 
            disabled={syncingToSheet || !apiKey || !spreadsheetId}
            variant="outline"
            className="flex items-center gap-2"
          >
            {syncingToSheet ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {syncingToSheet ? 'Syncing...' : 'Sync to Sheet'}
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
                  This will permanently delete all products from the database. This action cannot be undone.
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
                  This will remove your business name, address, phone, and logo from the system.
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
            <div className="text-xs text-blue-700 dark:text-blue-300 space-y-2">
              <div>
                <strong>Real-time Sync:</strong> Products automatically sync between app and Google Sheets.
              </div>
              <ul className="space-y-1 list-disc list-inside ml-2">
                <li><strong>App → Sheets:</strong> Products added/updated/sold sync instantly</li>
                <li><strong>Sheets → App:</strong> Enable auto-sync to poll for changes</li>
                <li>Quantities update automatically when products are sold</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleSheetsSync;