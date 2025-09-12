import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sheet, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const GoogleSheetsSync = ({ onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncStats, setSyncStats] = useState(null);

  const handleSync = async () => {
    setSyncing(true);
    try {
      console.log('Starting manual sync...');
      
      const { data, error } = await supabase.functions.invoke('sync-products-sheets', {
        body: {}
      });

      if (error) {
        console.error('Sync error:', error);
        toast.error('Failed to sync products: ' + error.message);
        return;
      }

      console.log('Sync response:', data);
      
      setLastSync(new Date());
      setSyncStats(data);
      
      if (data.synced > 0) {
        toast.success(`Successfully synced ${data.synced} products from Google Sheets`);
      } else {
        toast.info('No new products to sync');
      }
      
      // Notify parent component to refresh products
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error) {
      console.error('Error during sync:', error);
      toast.error('Failed to sync products: ' + error.message);
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
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            Connected
          </Badge>
          <span className="text-sm text-muted-foreground">
            Spreadsheet ID: 1ykvSgP7...uzdiA
          </span>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">Column mapping:</p>
          <ul className="space-y-1 text-xs">
            <li>• Column A: Product Name</li>
            <li>• Column B: Barcode</li>
            <li>• Column C: SKU Number</li>
            <li>• Column D: Quantity</li>
            <li>• Column E: Price</li>
          </ul>
        </div>

        {lastSync && (
          <div className="text-sm">
            <p className="text-muted-foreground">Last sync: {lastSync.toLocaleString()}</p>
            {syncStats && (
              <p className="text-green-600">
                {syncStats.synced} products synced
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={handleSync} 
            disabled={syncing}
            className="gradient-primary text-white border-0 flex items-center gap-2"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> Changes in Google Sheets will sync to this app. 
              Products with matching names or SKU numbers will be updated. 
              New products will be added automatically.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleSheetsSync;