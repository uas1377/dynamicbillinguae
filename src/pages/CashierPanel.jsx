import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { Package, Users, FileText, List, LogOut } from "lucide-react";
import AddProduct from "@/components/cashier/AddProduct";
import CustomerManagement from "@/components/cashier/CustomerManagement";
import CreateInvoiceTabs from "@/components/cashier/CreateInvoiceTabs";
import AllInvoices from "@/components/cashier/AllInvoices";

const CashierPanel = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Lifted invoice tabs state to persist across main tab switches
  const [invoiceTabs, setInvoiceTabs] = useState([{ id: 1, name: 'Tab 1' }]);
  const [activeInvoiceTab, setActiveInvoiceTab] = useState(1);
  const [nextInvoiceTabId, setNextInvoiceTabId] = useState(2);
  
  // Store each tab's data to persist when switching tabs
  const [tabsData, setTabsData] = useState({});

  useEffect(() => {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    if (!user.role || user.role !== 'cashier') {
      navigate('/');
      return;
    }
    setCurrentUser(user);
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/');
  };

  const addNewInvoiceTab = useCallback(() => {
    const newTab = { id: nextInvoiceTabId, name: `Tab ${nextInvoiceTabId}` };
    setInvoiceTabs(prev => [...prev, newTab]);
    setActiveInvoiceTab(nextInvoiceTabId);
    setNextInvoiceTabId(prev => prev + 1);
  }, [nextInvoiceTabId]);

  const closeInvoiceTab = useCallback((tabId) => {
    // Remove data for the closed tab
    setTabsData(prev => {
      const newData = { ...prev };
      delete newData[tabId];
      return newData;
    });
    
    setInvoiceTabs(prev => {
      if (prev.length === 1) {
        // If it's the last tab, reset it
        const newId = nextInvoiceTabId;
        setActiveInvoiceTab(newId);
        setNextInvoiceTabId(id => id + 1);
        return [{ id: newId, name: `Tab ${newId}` }];
      }

      const tabIndex = prev.findIndex(t => t.id === tabId);
      const newTabs = prev.filter(t => t.id !== tabId);
      
      // If closing active tab, switch to adjacent tab
      if (activeInvoiceTab === tabId) {
        if (tabIndex > 0) {
          setActiveInvoiceTab(newTabs[tabIndex - 1].id);
        } else {
          setActiveInvoiceTab(newTabs[0].id);
        }
      }
      
      return newTabs;
    });
  }, [activeInvoiceTab, nextInvoiceTabId]);
  
  const updateTabData = useCallback((tabId, data) => {
    setTabsData(prev => ({
      ...prev,
      [tabId]: data
    }));
  }, []);

  if (!currentUser) return null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <Card className="gradient-card shadow-soft border-0 mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold text-primary">Cashier Panel</CardTitle>
              <p className="text-muted-foreground mt-2">Welcome back, {currentUser.username}</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </CardHeader>
        </Card>

        <Tabs defaultValue="create-invoice" className="w-full">
          <TabsList className="grid w-full grid-cols-2 gap-2 h-auto mb-6">
            <TabsTrigger value="add-product" className="flex items-center gap-2 py-3">
              <Package className="w-4 h-4" />
              <span>Add Product</span>
            </TabsTrigger>
            <TabsTrigger value="add-customer" className="flex items-center gap-2 py-3">
              <Users className="w-4 h-4" />
              <span>Add Customer</span>
            </TabsTrigger>
            <TabsTrigger value="create-invoice" className="flex items-center gap-2 py-3">
              <FileText className="w-4 h-4" />
              <span>Create Invoice</span>
            </TabsTrigger>
            <TabsTrigger value="all-invoices" className="flex items-center gap-2 py-3">
              <List className="w-4 h-4" />
              <span>All Invoices</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="add-product">
            <AddProduct />
          </TabsContent>

            <TabsContent value="add-customer">
              <CustomerManagement />
            </TabsContent>

          <TabsContent value="create-invoice">
            <CreateInvoiceTabs 
              tabs={invoiceTabs}
              activeTab={activeInvoiceTab}
              setActiveTab={setActiveInvoiceTab}
              addNewTab={addNewInvoiceTab}
              closeTab={closeInvoiceTab}
              tabsData={tabsData}
              updateTabData={updateTabData}
            />
          </TabsContent>

          <TabsContent value="all-invoices">
            <AllInvoices />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CashierPanel;