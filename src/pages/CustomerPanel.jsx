import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { LogOut, FileText, Calendar, DollarSign } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

const CustomerPanel = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!user.role || user.role !== 'customer') {
      navigate('/');
      return;
    }
    setCurrentUser(user);

    // Load customer's invoices
    const allInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    const myInvoices = allInvoices.filter(invoice => invoice.customerPhone === user.phone);
    setCustomerInvoices(myInvoices);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  if (!currentUser) return null;

  const totalAmount = customerInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.grandTotal), 0);
  const paidAmount = customerInvoices.filter(inv => inv.status === 'paid').reduce((sum, invoice) => sum + parseFloat(invoice.grandTotal), 0);
  const unpaidAmount = totalAmount - paidAmount;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="gradient-card shadow-soft border-0 mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-3xl font-bold text-primary">Customer Portal</CardTitle>
              <p className="text-muted-foreground mt-2">Phone: {currentUser.phone}</p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </CardHeader>
        </Card>

        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="gradient-card shadow-soft border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{customerInvoices.length}</p>
                  <p className="text-muted-foreground">Total Invoices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-soft border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(paidAmount)}</p>
                  <p className="text-muted-foreground">Paid Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="gradient-card shadow-soft border-0">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(unpaidAmount)}</p>
                  <p className="text-muted-foreground">Pending Amount</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices List */}
        <Card className="gradient-card shadow-soft border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Your Invoices
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customerInvoices.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-xl font-semibold mb-2">No Invoices Found</p>
                <p className="text-muted-foreground">You don't have any invoices yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {customerInvoices.map((invoice) => (
                  <Card key={invoice.id} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-lg">Invoice #{invoice.invoiceNumber}</h3>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(invoice.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold">{formatCurrency(invoice.grandTotal)}</span>
                          </div>
                        </div>
                        
                         <div className="space-y-2">
                           <p><span className="font-medium">Items:</span> {invoice.items.length}</p>
                           <p><span className="font-medium">Subtotal:</span> {formatCurrency(invoice.subTotal)}</p>
                           {parseFloat(invoice.discountAmount || 0) > 0 && (
                             <p><span className="font-medium">Discount:</span> -{formatCurrency(invoice.discountAmount)}</p>
                           )}
                           {parseFloat(invoice.taxAmount || 0) > 0 && <p><span className="font-medium">Tax:</span> {formatCurrency(invoice.taxAmount)}</p>}
                         </div>
                      </div>

                      {invoice.items.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="font-medium mb-2">Items:</p>
                          <div className="space-y-1 text-sm">
                            {invoice.items.map((item, index) => (
                              <div key={index} className="flex justify-between">
                                <span>{item.name} x {item.quantity}</span>
                                <span>{formatCurrency(item.quantity * item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerPanel;