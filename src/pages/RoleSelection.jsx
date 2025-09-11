import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { User, ShoppingCart, Shield, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const RoleSelection = () => {
  const [loginModal, setLoginModal] = useState(null);
  const [credentials, setCredentials] = useState({ username: '', password: '', phone: '' });
  const navigate = useNavigate();

  const handleLogin = async (role) => {
    if (role === 'customer') {
      if (!credentials.phone) {
        toast.error('Please enter phone number');
        return;
      }
      sessionStorage.setItem('currentUser', JSON.stringify({ role: 'customer', phone: credentials.phone }));
      navigate('/customer');
    } else {
      try {
        // Check credentials based on role
        if (role === 'admin') {
          const { data: adminSettings, error } = await supabase
            .from('admin_settings')
            .select('setting_value')
            .eq('setting_key', 'admin_credentials')
            .single();

          if (error || !adminSettings) {
            toast.error('Failed to verify admin credentials');
            return;
          }

          const adminCreds = adminSettings.setting_value;
          if (credentials.username !== adminCreds.username || credentials.password !== adminCreds.password) {
            toast.error('Invalid admin credentials');
            return;
          }
        } else if (role === 'cashier') {
          const { data: cashiers, error } = await supabase
            .from('cashiers')
            .select('*')
            .eq('username', credentials.username)
            .eq('password', credentials.password)
            .single();

          if (error || !cashiers) {
            toast.error('Invalid cashier credentials');
            return;
          }
        }
        
        sessionStorage.setItem('currentUser', JSON.stringify({ role, username: credentials.username }));
        navigate(`/${role}`);
      } catch (error) {
        toast.error('Login failed: ' + error.message);
        return;
      }
    }
    setLoginModal(null);
    setCredentials({ username: '', password: '', phone: '' });
  };

  const openModal = (role) => {
    setLoginModal(role);
    setCredentials({ username: '', password: '', phone: '' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <Card className="gradient-card shadow-soft border-0 mb-8">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Billing Management System
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
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    placeholder="Enter your phone number"
                    value={credentials.phone}
                    onChange={(e) => setCredentials({ ...credentials, phone: e.target.value })}
                    className="pl-10"
                  />
                </div>
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
    </div>
  );
};

export default RoleSelection;