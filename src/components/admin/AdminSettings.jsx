import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Save, Building2, Upload, Trash2 } from "lucide-react";
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

const AdminSettings = () => {
  const [adminCredentials, setAdminCredentials] = useState({
    username: '',
    password: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [businessSettings, setBusinessSettings] = useState({
    businessName: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
    defaultPanel: 'role-selection' // 'role-selection' or 'cashier'
  });

  const [logoFile, setLogoFile] = useState(null);

  // Load settings from Supabase on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_settings')
        .select('*');

      if (error) {
        toast.error('Failed to load settings: ' + error.message);
        return;
      }

      const settings = {};
      data.forEach(item => {
        settings[item.setting_key] = item.setting_value;
      });

      if (settings.admin_credentials) {
        setAdminCredentials(prev => ({
          ...prev,
          username: settings.admin_credentials.username,
          password: settings.admin_credentials.password
        }));
      }

      if (settings.business_settings) {
        setBusinessSettings({
          businessName: settings.business_settings.name || '',
          address: settings.business_settings.address || '',
          phone: settings.business_settings.phone || '',
          email: settings.business_settings.email || '',
          logo: settings.business_settings.logo || '',
          defaultPanel: settings.business_settings.defaultPanel || 'role-selection'
        });
      }
    } catch (error) {
      toast.error('Failed to load settings: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!adminCredentials.username.trim()) {
      toast.error('Username is required');
      return;
    }
    
    if (adminCredentials.newPassword && adminCredentials.newPassword !== adminCredentials.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      const newCredentials = {
        username: adminCredentials.username.trim(),
        password: adminCredentials.newPassword || adminCredentials.password
      };

      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: newCredentials })
        .eq('setting_key', 'admin_credentials');

      if (error) {
        toast.error('Failed to update admin settings: ' + error.message);
        return;
      }
      
      toast.success('Admin settings updated successfully');
      
      // Reset form
      setAdminCredentials({
        username: newCredentials.username,
        password: newCredentials.password,
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      toast.error('Failed to update admin settings: ' + error.message);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setLogoFile(file);
  };

  const handleBusinessSettingsSubmit = async (e) => {
    e.preventDefault();
    
    if (!businessSettings.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }

    try {
      let logoUrl = businessSettings.logo;

      // Upload logo if a new file was selected
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        // Delete old logo if exists
        if (businessSettings.logo) {
          const oldFileName = businessSettings.logo.split('/').pop();
          await supabase.storage
            .from('business-logos')
            .remove([oldFileName]);
        }

        const { error: uploadError, data } = await supabase.storage
          .from('business-logos')
          .upload(fileName, logoFile);

        if (uploadError) {
          toast.error('Failed to upload logo: ' + uploadError.message);
          return;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('business-logos')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      const businessData = {
        name: businessSettings.businessName,
        address: businessSettings.address,
        phone: businessSettings.phone,
        email: businessSettings.email,
        logo: logoUrl,
        defaultPanel: businessSettings.defaultPanel
      };

      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: businessData })
        .eq('setting_key', 'business_settings');

      if (error) {
        toast.error('Failed to update business settings: ' + error.message);
        return;
      }

      setBusinessSettings(prev => ({ ...prev, logo: logoUrl }));
      setLogoFile(null);
      toast.success('Business settings updated successfully');
    } catch (error) {
      toast.error('Failed to update business settings: ' + error.message);
    }
  };

  const handleClearAllData = async () => {
    try {
      console.log('Starting data deletion...');
      
      // Delete all invoices first (they reference customers via foreign key)
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .delete()
        .not('id', 'is', null)
        .select();
      
      if (invoicesError) {
        console.error('Error deleting invoices:', invoicesError);
        toast.error('Failed to delete invoices: ' + invoicesError.message);
        return;
      }
      console.log(`Deleted ${invoices?.length || 0} invoices`);

      // Delete all customers
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .delete()
        .not('id', 'is', null)
        .select();
      
      if (customersError) {
        console.error('Error deleting customers:', customersError);
        toast.error('Failed to delete customers: ' + customersError.message);
        return;
      }
      console.log(`Deleted ${customers?.length || 0} customers`);

      // Delete all products
      const { data: products, error: productsError } = await supabase
        .from('products')
        .delete()
        .not('id', 'is', null)
        .select();
      
      if (productsError) {
        console.error('Error deleting products:', productsError);
        toast.error('Failed to delete products: ' + productsError.message);
        return;
      }
      console.log(`Deleted ${products?.length || 0} products`);

      // Clear business settings
      const { error: businessError } = await supabase
        .from('admin_settings')
        .update({ setting_value: {} })
        .eq('setting_key', 'business_settings');
      
      if (businessError) {
        console.error('Error clearing business settings:', businessError);
      }

      // Clear localStorage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('All data cleared successfully');
      toast.success('All data cleared successfully from database!');
      
      // Reload page after short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear all data: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Business Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBusinessSettingsSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                placeholder="Enter business name"
                value={businessSettings.businessName}
                onChange={(e) => setBusinessSettings({ ...businessSettings, businessName: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="Enter business address"
                value={businessSettings.address}
                onChange={(e) => setBusinessSettings({ ...businessSettings, address: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="Enter business phone"
                value={businessSettings.phone}
                onChange={(e) => setBusinessSettings({ ...businessSettings, phone: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter business email"
                value={businessSettings.email}
                onChange={(e) => setBusinessSettings({ ...businessSettings, email: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="logo">Business Logo</Label>
              {businessSettings.logo && (
                <div className="mb-2">
                  <img 
                    src={businessSettings.logo} 
                    alt="Business Logo" 
                    className="h-20 w-auto object-contain border rounded p-2"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  id="logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="flex-1"
                />
                {logoFile && (
                  <span className="text-sm text-muted-foreground">
                    {logoFile.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload your business logo (recommended size: 200x200px)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="defaultPanel">Default Landing Panel</Label>
              <Select 
                value={businessSettings.defaultPanel} 
                onValueChange={(value) => setBusinessSettings({ ...businessSettings, defaultPanel: value })}
              >
                <SelectTrigger id="defaultPanel">
                  <SelectValue placeholder="Select default panel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role-selection">Role Selection (Default)</SelectItem>
                  <SelectItem value="cashier">Cashier Panel</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set which panel opens by default after login
              </p>
            </div>
            
            <Button type="submit" className="gradient-primary text-white border-0 flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Business Settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Admin Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="username">Admin Username *</Label>
              <Input
                id="username"
                placeholder="Enter admin username"
                value={adminCredentials.username}
                onChange={(e) => setAdminCredentials({ ...adminCredentials, username: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                placeholder="Current password"
                value={adminCredentials.password}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Current password is masked for security</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password (optional)</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={adminCredentials.newPassword}
                onChange={(e) => setAdminCredentials({ ...adminCredentials, newPassword: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={adminCredentials.confirmPassword}
                onChange={(e) => setAdminCredentials({ ...adminCredentials, confirmPassword: e.target.value })}
                disabled={!adminCredentials.newPassword}
              />
            </div>
            
            <Button type="submit" className="gradient-primary text-white border-0 flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Settings
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium">System Version:</span>
              <span>1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Database:</span>
              <span>Supabase</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Last Updated:</span>
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              variant="outline" 
              onClick={async () => {
                try {
                  const [productsRes, customersRes, invoicesRes, cashiersRes] = await Promise.all([
                    supabase.from('products').select('*'),
                    supabase.from('customers').select('*'),
                    supabase.from('invoices').select('*'),
                    supabase.from('cashiers').select('*')
                  ]);

                  const data = {
                    products: productsRes.data || [],
                    customers: customersRes.data || [],
                    invoices: invoicesRes.data || [],
                    cashiers: cashiersRes.data || []
                  };

                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `billing-backup-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success('Data exported successfully');
                } catch (error) {
                  toast.error('Failed to export data: ' + error.message);
                }
              }}
            >
              Export Data
            </Button>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear All Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all products, invoices, customers, and business settings. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAllData}>
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <p className="text-sm text-muted-foreground">
              Export all system data for backup purposes. This includes products, customers, invoices, and cashier accounts.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;