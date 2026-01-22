import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Building2, Upload, Trash2, Printer, QrCode } from "lucide-react";
import { PAPER_SIZES } from "@/utils/paperSizes";
import { toast } from "sonner";
import { 
  getBusinessSettings, 
  setBusinessSettings as saveBusinessSettings,
  getStoredProducts,
  getStoredCustomers,
  getStoredInvoices
} from "@/utils/localStorageData";
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
    defaultPanel: 'role-selection',
    currencyCode: 'AED',
    paperSize: '2inch',
    upiLink: '',
    upiLinkEnabled: false
  });

  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    // Load admin credentials from localStorage
    const storedAdmins = JSON.parse(localStorage.getItem('admins') || '[]');
    if (storedAdmins.length > 0) {
      setAdminCredentials(prev => ({
        ...prev,
        username: storedAdmins[0].username,
        password: storedAdmins[0].password
      }));
    }

    // Load business settings from localStorage
    const storedBusinessSettings = getBusinessSettings();
    setBusinessSettings({
      businessName: storedBusinessSettings.name || '',
      address: storedBusinessSettings.address || '',
      phone: storedBusinessSettings.phone || '',
      email: storedBusinessSettings.email || '',
      logo: storedBusinessSettings.logo || '',
      defaultPanel: storedBusinessSettings.defaultPanel || 'role-selection',
      currencyCode: storedBusinessSettings.currencyCode || 'AED',
      paperSize: storedBusinessSettings.paperSize || '2inch',
      upiLink: storedBusinessSettings.upiLink || '',
      upiLinkEnabled: storedBusinessSettings.upiLinkEnabled || false
    });
  };

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

    const newCredentials = {
      username: adminCredentials.username.trim(),
      password: adminCredentials.newPassword || adminCredentials.password
    };

    // Update admins in localStorage
    localStorage.setItem('admins', JSON.stringify([newCredentials]));
    
    toast.success('Admin settings updated successfully');
    
    setAdminCredentials({
      username: newCredentials.username,
      password: newCredentials.password,
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Convert to base64 and store in localStorage
    const reader = new FileReader();
    reader.onloadend = () => {
      setBusinessSettings(prev => ({ ...prev, logo: reader.result }));
      setLogoFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleBusinessSettingsSubmit = (e) => {
    e.preventDefault();
    
    if (!businessSettings.businessName.trim()) {
      toast.error('Business name is required');
      return;
    }

    const businessData = {
      name: businessSettings.businessName,
      address: businessSettings.address,
      phone: businessSettings.phone,
      email: businessSettings.email,
      logo: businessSettings.logo,
      defaultPanel: businessSettings.defaultPanel,
      currencyCode: businessSettings.currencyCode,
      paperSize: businessSettings.paperSize,
      upiLink: businessSettings.upiLink,
      upiLinkEnabled: businessSettings.upiLinkEnabled
    };

    saveBusinessSettings(businessData);
    setLogoFile(null);
    toast.success('Business settings updated successfully');
  };

  const handleClearAllData = () => {
    try {
      // Clear all localStorage data
      localStorage.removeItem('productsData');
      localStorage.removeItem('invoicesData');
      localStorage.removeItem('customersData');
      localStorage.removeItem('buildingsData');
      localStorage.removeItem('flatsData');
      localStorage.removeItem('businessSettings');
      localStorage.removeItem('cashiers');
      
      // Keep admins credentials
      
      sessionStorage.clear();
      
      toast.success('All data cleared successfully!');
      
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
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currencyCode">Currency Code</Label>
              <Input
                id="currencyCode"
                placeholder="Enter currency code (e.g., AED, USD, EUR)"
                value={businessSettings.currencyCode}
                onChange={(e) => setBusinessSettings({ ...businessSettings, currencyCode: e.target.value.toUpperCase() })}
                maxLength={3}
              />
              <p className="text-xs text-muted-foreground">
                This currency code will be used throughout the app
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

            <div className="space-y-2">
              <Label htmlFor="paperSize" className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Thermal Paper Size
              </Label>
              <Select 
                value={businessSettings.paperSize} 
                onValueChange={(value) => setBusinessSettings({ ...businessSettings, paperSize: value })}
              >
                <SelectTrigger id="paperSize">
                  <SelectValue placeholder="Select paper size" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PAPER_SIZES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Set the thermal paper width for printing receipts (3mm padding on both sides)
              </p>
            </div>

            {/* UPI Link Settings */}
            <div className="space-y-2 pt-4 border-t">
              <Label htmlFor="upiLink" className="flex items-center gap-2">
                <QrCode className="w-4 h-4" />
                UPI/Payment QR Link
              </Label>
              <div className="flex items-center gap-3 mb-2">
                <Switch
                  id="upiLinkEnabled"
                  checked={businessSettings.upiLinkEnabled}
                  onCheckedChange={(checked) => setBusinessSettings({ ...businessSettings, upiLinkEnabled: checked })}
                />
                <Label htmlFor="upiLinkEnabled" className="text-sm">
                  {businessSettings.upiLinkEnabled ? 'QR Button Enabled' : 'QR Button Disabled'}
                </Label>
              </div>
              <Input
                id="upiLink"
                placeholder="e.g., upi://pay?pa=example@upi&am=[amount]"
                value={businessSettings.upiLink}
                onChange={(e) => setBusinessSettings({ ...businessSettings, upiLink: e.target.value })}
                disabled={!businessSettings.upiLinkEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Use <span className="font-mono font-bold">[amount]</span> as placeholder for invoice total. 
                This will be replaced with actual amount when generating QR.
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
              <span>Local Storage (Offline)</span>
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
                try {
                  const data = {
                    products: getStoredProducts(),
                    customers: getStoredCustomers(),
                    invoices: getStoredInvoices(),
                    buildings: JSON.parse(localStorage.getItem('buildingsData') || '[]'),
                    flats: JSON.parse(localStorage.getItem('flatsData') || '[]'),
                    cashiers: JSON.parse(localStorage.getItem('cashiers') || '[]'),
                    admins: JSON.parse(localStorage.getItem('admins') || '[]'),
                    adminCredentials: JSON.parse(localStorage.getItem('adminCredentials') || '{}'),
                    businessSettings: getBusinessSettings()
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
            
            <div className="space-y-2">
              <Label htmlFor="import-file">Import Data</Label>
              <Input
                id="import-file"
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const data = JSON.parse(event.target.result);
                      
                      if (data.products) localStorage.setItem('productsData', JSON.stringify(data.products));
                      if (data.customers) localStorage.setItem('customersData', JSON.stringify(data.customers));
                      if (data.invoices) localStorage.setItem('invoicesData', JSON.stringify(data.invoices));
                      if (data.buildings) localStorage.setItem('buildingsData', JSON.stringify(data.buildings));
                      if (data.flats) localStorage.setItem('flatsData', JSON.stringify(data.flats));
                      if (data.cashiers) localStorage.setItem('cashiers', JSON.stringify(data.cashiers));
                      if (data.admins) localStorage.setItem('admins', JSON.stringify(data.admins));
                      if (data.adminCredentials) localStorage.setItem('adminCredentials', JSON.stringify(data.adminCredentials));
                      if (data.businessSettings) localStorage.setItem('businessSettings', JSON.stringify(data.businessSettings));
                      
                      toast.success('Data imported successfully!');
                      setTimeout(() => window.location.reload(), 1000);
                    } catch (error) {
                      toast.error('Invalid backup file format');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </div>
            
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