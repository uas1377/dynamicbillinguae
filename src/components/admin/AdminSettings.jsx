import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
    email: ''
  });

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
          email: settings.business_settings.email || ''
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

  const handleBusinessSettingsSubmit = async (e) => {
    e.preventDefault();
    
    if (!businessSettings.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }

    try {
      const businessData = {
        name: businessSettings.businessName,
        address: businessSettings.address,
        phone: businessSettings.phone,
        email: businessSettings.email
      };

      const { error } = await supabase
        .from('admin_settings')
        .update({ setting_value: businessData })
        .eq('setting_key', 'business_settings');

      if (error) {
        toast.error('Failed to update business settings: ' + error.message);
        return;
      }

      toast.success('Business settings updated successfully');
    } catch (error) {
      toast.error('Failed to update business settings: ' + error.message);
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