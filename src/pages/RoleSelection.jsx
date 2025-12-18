import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, ShoppingCart, Shield, KeyRound, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getFlatByUserId, getStoredBuildings } from "@/utils/buildingFlatStorage";
import { getBusinessSettings } from "@/utils/localStorageData";
import BarcodeScanner from "@/components/ui/BarcodeScanner";

const RoleSelection = () => {
  const [loginModal, setLoginModal] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '', userId: '' });
  const [defaultPanel, setDefaultPanel] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const navigate = useNavigate();

  // Initialize default credentials on first load
  useEffect(() => {
    // Set default admin credentials if not exists
    if (!localStorage.getItem('adminCredentials')) {
      localStorage.setItem('adminCredentials', JSON.stringify({ username: 'aaa', password: 'aaa' }));
    }
    // Set default cashier if not exists
    if (!localStorage.getItem('cashiers')) {
      localStorage.setItem('cashiers', JSON.stringify([{ id: 'default', username: 'aaa', password: 'aaa' }]));
    }
  }, []);

  // Check default panel setting on mount - using localStorage only
  useEffect(() => {
    const checkDefaultPanel = () => {
      const businessSettings = getBusinessSettings();
      if (businessSettings?.defaultPanel) {
        setDefaultPanel(businessSettings.defaultPanel);
      }
    };
    checkDefaultPanel();
  }, []);

  const handleQRScan = (scannedCode) => {
    if (scannedCode && scannedCode.length >= 6) {
      const username = scannedCode.substring(0, 6);
      const password = scannedCode.substring(6);
      
      // Validate cashier credentials
      const cashiers = JSON.parse(localStorage.getItem('cashiers') || '[{"id":"default","username":"aaa","password":"aaa"}]');
      const validCashier = cashiers.find(c => c.username === username && c.password === password);
      
      if (validCashier) {
        sessionStorage.setItem('currentUser', JSON.stringify({ role: 'cashier', username: username }));
        toast.success('Login successful via QR code');
        navigate('/cashier');
        setLoginModal(null);
      } else {
        toast.error('Invalid QR code credentials');
      }
    } else {
      toast.error('Invalid QR code format. Must be at least 6 characters.');
    }
    setShowQRScanner(false);
  };

  const handleLogin = (role) => {
    if (role === 'customer') {
      if (!credentials.userId.trim()) {
        toast.error('Please enter your User ID');
        return;
      }
      
      // Find flat by user ID
      const flat = getFlatByUserId(credentials.userId.trim().toUpperCase());
      if (!flat) {
        toast.error('Invalid User ID. Please check and try again.');
        return;
      }
      
      const buildings = getStoredBuildings();
      const building = buildings.find(b => b.id === flat.building_id);
      
      sessionStorage.setItem('currentUser', JSON.stringify({ 
        role: 'customer', 
        userId: flat.user_id,
        flatId: flat.id,
        flatNumber: flat.flat_number,
        buildingName: building?.name || '',
        phone: flat.phone 
      }));
      navigate('/customer');
    } else {
      // Check credentials based on role
      if (role === 'admin') {
        // Use localStorage for admin credentials (default: aaa/aaa)
        const adminCreds = JSON.parse(localStorage.getItem('adminCredentials') || '{"username":"aaa","password":"aaa"}');
        if (credentials.username !== adminCreds.username || credentials.password !== adminCreds.password) {
          toast.error('Invalid admin credentials');
          return;
        }
      } else if (role === 'cashier') {
        // Use localStorage for cashier credentials (default: aaa/aaa)
        const cashiers = JSON.parse(localStorage.getItem('cashiers') || '[{"id":"default","username":"aaa","password":"aaa"}]');
        const validCashier = cashiers.find(c => c.username === credentials.username && c.password === credentials.password);
        
        if (!validCashier) {
          toast.error('Invalid cashier credentials');
          return;
        }
      }
      
      sessionStorage.setItem('currentUser', JSON.stringify({ role, username: credentials.username }));
      navigate(`/${role}`);
    }
    setLoginModal(null);
    setCredentials({ username: '', password: '', userId: '' });
  };

  const openModal = (role) => {
    // If cashier is default panel, skip login but use default cashier name
    if (role === 'cashier' && defaultPanel === 'cashier') {
      const cashiers = JSON.parse(localStorage.getItem('cashiers') || '[{"id":"default","username":"aaa","password":"aaa"}]');
      const defaultCashierName = cashiers[0]?.username || 'Cashier';
      sessionStorage.setItem('currentUser', JSON.stringify({ role: 'cashier', username: defaultCashierName }));
      navigate('/cashier');
      return;
    }
    setLoginModal(role);
    setCredentials({ username: '', password: '', userId: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <Card className="gradient-card shadow-soft border-0 mb-8">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Galaxy Billing App
            </CardTitle>
            <CardDescription className="text-xl text-muted-foreground">
              Select your role to access the system
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="gradient-card shadow-soft border-0 hover:shadow-hover transition-all duration-300 cursor-pointer group" onClick={() => openModal('cashier')}>
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Cashier</CardTitle>
              <CardDescription>Manage products, customers and create invoices</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full gradient-primary text-white border-0 hover:opacity-90">
                Access Cashier Panel
              </Button>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-soft border-0 hover:shadow-hover transition-all duration-300 cursor-pointer group" onClick={() => openModal('customer')}>
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <User className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Customer</CardTitle>
              <CardDescription>View your invoices and purchase history</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full gradient-primary text-white border-0 hover:opacity-90">
                Access Customer Panel
              </Button>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-soft border-0 hover:shadow-hover transition-all duration-300 cursor-pointer group" onClick={() => openModal('admin')}>
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full gradient-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">Admin</CardTitle>
              <CardDescription>Manage system settings and user accounts</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button className="w-full gradient-primary text-white border-0 hover:opacity-90">
                Access Admin Panel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!loginModal} onOpenChange={() => setLoginModal(null)}>
        <DialogContent className="gradient-card border-0">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              {loginModal === 'customer' ? 'Customer Login' : `${loginModal} Login`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loginModal === 'customer' ? (
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="userId"
                    placeholder="Enter your 6-character User ID"
                    value={credentials.userId}
                    onChange={(e) => setCredentials({ ...credentials, userId: e.target.value.toUpperCase() })}
                    className="pl-10 font-mono uppercase"
                    maxLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your User ID is printed on your receipt
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter username"
                    value={credentials.username}
                    onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  />
                </div>
                
                {loginModal === 'cashier' && (
                  <Button 
                    onClick={() => setShowQRScanner(true)} 
                    variant="outline"
                    className="w-full flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Scan QR Code to Login
                  </Button>
                )}
              </>
            )}
            <Button 
              onClick={() => handleLogin(loginModal)} 
              className="w-full gradient-primary text-white border-0"
            >
              Login
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BarcodeScanner 
        open={showQRScanner} 
        onClose={() => setShowQRScanner(false)} 
        onScan={handleQRScan} 
      />
    </div>
  );
};

export default RoleSelection;