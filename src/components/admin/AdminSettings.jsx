import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save, Building2 } from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const [adminCredentials, setAdminCredentials] = useState({
    username: 'aaa',
    password: 'aaa',
    newPassword: '',
    confirmPassword: ''
  });

  const [businessSettings, setBusinessSettings] = useState({
    businessName: '',
    address: '',
    phone: '',
    email: ''
  });

  // Load business settings on mount
  React.useEffect(() => {
    const savedSettings = localStorage.getItem('businessSettings');
    if (savedSettings) {
      setBusinessSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!adminCredentials.username.trim()) {
      toast.error('Username is required');
      return;
    }
    
    if (adminCredentials.newPassword && adminCredentials.newPassword !== adminCredentials.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    // For now, we'll just store in localStorage
    // In a real application, this would be handled more securely
    const adminData = {
      username: adminCredentials.username.trim(),
      password: adminCredentials.newPassword || adminCredentials.password,
      updatedAt: new Date().toISOString()
    };

    localStorage.setItem('adminCredentials', JSON.stringify(adminData));
    
    toast.success('Admin settings updated successfully');
    
    // Reset form
    setAdminCredentials({
      username: adminData.username,
      password: adminData.password,
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleBusinessSettingsSubmit = (e) => {
    e.preventDefault();
    
    if (!businessSettings.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }

    localStorage.setItem('businessSettings', JSON.stringify(businessSettings));
    toast.success('Business settings updated successfully');
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
              <span>Local Storage</span>
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
              onClick={() => {
                const data = {
                  products: JSON.parse(localStorage.getItem('products') || '[]'),
                  customers: JSON.parse(localStorage.getItem('customers') || '[]'),
                  invoices: JSON.parse(localStorage.getItem('invoices') || '[]'),
                  cashiers: JSON.parse(localStorage.getItem('cashiers') || '[]'),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `billing-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Data exported successfully');
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