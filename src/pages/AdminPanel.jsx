import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Package, Users, Settings, LogOut, Shield, TrendingUp } from "lucide-react";
import ProductManagement from "@/components/admin/ProductManagement";
import CashierManagement from "@/components/admin/CashierManagement";
import AdminSettings from "@/components/admin/AdminSettings";
import ProfitDashboard from "@/components/admin/ProfitDashboard";
import TrialBadge from "@/components/ui/TrialBadge";

const AdminPanel = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    if (!user.role || user.role !== 'admin') {
      navigate('/');
      return;
    }
    setCurrentUser(user);
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  if (!currentUser) return null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="gradient-card shadow-soft border-0 mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-3">
                <CardTitle className="text-3xl font-bold text-primary flex items-center gap-3">
                  <Shield className="w-8 h-8" />
                  Admin Panel
                </CardTitle>
                <TrialBadge />
              </div>
              <p className="text-muted-foreground mt-2">System Administration Dashboard</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </CardHeader>
        </Card>

        <Tabs defaultValue="profit" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2 h-auto mb-6">
            <TabsTrigger value="profit" className="flex items-center gap-2 py-3">
              <TrendingUp className="w-4 h-4" />
              <span>Profit Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2 py-3">
              <Package className="w-4 h-4" />
              <span>Product Management</span>
            </TabsTrigger>
            <TabsTrigger value="cashiers" className="flex items-center gap-2 py-3">
              <Users className="w-4 h-4" />
              <span>Cashier Management</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 py-3">
              <Settings className="w-4 h-4" />
              <span>Admin Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profit">
            <ProfitDashboard />
          </TabsContent>

          <TabsContent value="products">
            <ProductManagement />
          </TabsContent>

          <TabsContent value="cashiers">
            <CashierManagement />
          </TabsContent>

          <TabsContent value="settings">
            <AdminSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminPanel;