import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, ShoppingCart, Shield, KeyRound, QrCode, Keyboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getFlatByUserId, getStoredBuildings } from "@/utils/buildingFlatStorage";
import { getBusinessSettings } from "@/utils/localStorageData";

const RoleSelection = () => {
  const [loginModal, setLoginModal] = useState(null);
  const [isScannerMode, setIsScannerMode] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '', userId: '' });
  const [defaultPanel, setDefaultPanel] = useState(null);
  const [businessSettings, setBusinessSettings] = useState({ name: '' });
  const navigate = useNavigate();

  // Hidden scanner input ref (no camera)
  const scannerInputRef = useRef(null);

  // Initialize default credentials on first load
  useEffect(() => {
    if (!localStorage.getItem('adminCredentials')) {
      localStorage.setItem('adminCredentials', JSON.stringify({ username: 'aaa', password: 'aaa' }));
    }
    if (!localStorage.getItem('cashiers')) {
      localStorage.setItem('cashiers', JSON.stringify([{ id: 'default', username: 'aaa', password: 'aaa' }]));
    }
  }, []);

  // Check default panel setting and load business settings
  useEffect(() => {
    const settings = getBusinessSettings();
    setBusinessSettings(settings);
    if (settings?.defaultPanel) {
      setDefaultPanel(settings.defaultPanel);
    }
  }, []);

  // Auto-focus scanner input when QR mode is active
  useEffect(() => {
    if (isScannerMode && loginModal === 'cashier' && scannerInputRef.current) {
      scannerInputRef.current.focus();
    }
  }, [isScannerMode, loginModal]);

  // Handle virtual QR scanner input (hidden input)
  const handleScannerInput = (e) => {
    if (e.key === 'Enter') {
      const code = e.target.value.trim();
      if (code.includes('<id>') && code.includes('<pass>')) {
        const username = code.split('<id>')[1].split('<pass>')[0].trim();
        const password = code.split('<pass>')[1].trim();

        // Validate cashier credentials
        const cashiers = JSON.parse(localStorage.getItem('cashiers') || '[{"id":"default","username":"aaa","password":"aaa"}]');
        const validCashier = cashiers.find(c => c.username === username && c.password === password);

        if (validCashier || (username === 'aaa' && password === 'aaa')) {
          sessionStorage.setItem('currentUser', JSON.stringify({
            role: 'cashier',
            username: validCashier?.username || 'aaa',
            id: validCashier?.id || 'default-cashier'
          }));
          toast.success('Login successful via QR code');
          navigate('/cashier');
          setLoginModal(null);
        } else {
          toast.error('Invalid QR credentials');
        }
      } else {
        toast.error('Invalid QR format. Use <id>username<pass>password');
      }

      e.target.value = ''; // Clear for next scan
      e.target.focus(); // Refocus for continuous scanning
    }
  };

  const handleLogin = (role) => {
    if (role === 'customer') {
      if (!credentials.userId.trim()) {
        toast.error('Please enter your User ID');
        return;
      }

      const flat = getFlatByUserId(credentials.userId.trim().toUpperCase());
      if (!flat) {
        toast.error('Invalid User ID');
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
      const { username, password } = credentials;

      if (role === 'admin') {
        const adminCreds = JSON.parse(localStorage.getItem('adminCredentials') || '{"username":"aaa","password":"aaa"}');
        if (username !== adminCreds.username || password !== adminCreds.password) {
          toast.error('Invalid admin credentials');
          return;
        }
      } else if (role === 'cashier') {
        const cashiers = JSON.parse(localStorage.getItem('cashiers') || '[{"id":"default","username":"aaa","password":"aaa"}]');
        const validCashier = cashiers.find(c => c.username === username && c.password === password);

        if (!validCashier) {
          toast.error('Invalid cashier credentials');
          return;
        }
      }

      sessionStorage.setItem('currentUser', JSON.stringify({ role, username }));
      navigate(`/${role}`);
    }

    setLoginModal(null);
    setCredentials({ username: '', password: '', userId: '' });
  };

  const openModal = (role) => {
    // Auto-login for default cashier panel
    if (role === 'cashier' && defaultPanel === 'cashier') {
      const cashiers = JSON.parse(localStorage.getItem('cashiers') || '[{"id":"default","username":"aaa","password":"aaa"}]');
      const defaultCashierName = cashiers[0]?.username || 'Cashier';
      sessionStorage.setItem('currentUser', JSON.stringify({ role: 'cashier', username: defaultCashierName }));
      navigate('/cashier');
      return;
    }

    setLoginModal(role);
    setCredentials({ username: '', password: '', userId: '' });
    setIsScannerMode(false); // Reset scanner mode on modal open
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <Card className="gradient-card shadow-soft border-0 mb-8">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {businessSettings.name || 'Billing App'}
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

      {/* Login Dialog */}
      <Dialog open={!!loginModal} onOpenChange={() => setLoginModal(null)}>
        <DialogContent className="gradient-card border-0">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              {loginModal ? `${loginModal.charAt(0).toUpperCase() + loginModal.slice(1)} Login` : 'Login'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {loginModal === 'cashier' && (
              <Button
                variant="outline"
                className={`w-full h-12 border-2 gap-2 ${isScannerMode ? 'bg-primary/10 border-primary' : ''}`}
                onClick={() => setIsScannerMode(!isScannerMode)}
              >
                {isScannerMode ? <Keyboard className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
              {isScannerMode ? "Switch to Manual Login" : "Switch to QR Scan"}
              </Button>
            )}

            {loginModal === 'cashier' && isScannerMode ? (
              <div className="text-center py-8 space-y-4">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <QrCode className="w-10 h-10 text-primary" />
                </div>
                <p className="text-lg font-medium">Scanner Ready</p>
                <p className="text-sm text-muted-foreground">
                  Scan QR code with USB scanner
                </p>
                {/* Hidden input inside dialog for USB scanner */}
                <input
                  ref={scannerInputRef}
                  type="text"
                  className="opacity-0 absolute w-0 h-0"
                  onKeyDown={handleScannerInput}
                  autoFocus
                  onBlur={(e) => {
                    if (isScannerMode && loginModal === 'cashier') {
                      setTimeout(() => e.target?.focus(), 50);
                    }
                  }}
                />
              </div>
            ) : loginModal === 'customer' ? (
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
                <p className="text-xs text-muted-foreground">Your User ID is printed on your receipt</p>
              </div>
            ) : (
              loginModal && (
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
                </>
              )
            )}

            {loginModal && !isScannerMode && (
              <Button
                onClick={() => handleLogin(loginModal)}
                className="w-full gradient-primary text-white border-0 h-12"
              >
                Login
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default RoleSelection;
