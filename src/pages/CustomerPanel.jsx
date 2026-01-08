import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, FileText, DollarSign, Clock, Share2, Calendar, User, Building2, Home } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { getStoredInvoices, getStoredFlats } from "@/utils/localStorageData";

const CustomerPanel = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sharedUserId = searchParams.get('id');

  useEffect(() => {
    if (sharedUserId) {
      // Direct access via shared link
      const sharedUser = { userId: sharedUserId, role: 'customer' };
      setCurrentUser(sharedUser);
      loadCustomerInvoices(sharedUserId);
    } else {
      // Regular login access
      const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
      if (!user.role || user.role !== 'customer') {
        navigate('/');
        return;
      }
      setCurrentUser(user);
      loadCustomerInvoices(user.userId);
    }
  }, [navigate, sharedUserId]);

  const loadCustomerInvoices = (userId) => {
    try {
      // Get all invoices from localStorage
      const allInvoices = getStoredInvoices();
      
      // Get flat info to find matching invoices
      const flats = getStoredFlats();
      const userFlat = flats.find(f => f.user_id === userId);
      
      // Filter invoices by user_id (stored in customer_phone field) or by flat phone
      const customerInvoices = allInvoices.filter(invoice => {
        // Match by user_id in customer_phone
        if (invoice.customer_phone === userId) return true;
        // Match by flat phone if exists
        if (userFlat && invoice.customer_phone === userFlat.phone) return true;
        return false;
      });
      
      // Sort by created_at descending
      customerInvoices.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      setCustomerInvoices(customerInvoices);
    } catch (error) {
      console.error('Failed to load customer invoices:', error.message);
    }
  };

  const handleLogout = () => {
    if (!sharedUserId) {
      sessionStorage.clear();
    }
    navigate('/');
  };

  const shareCustomerLink = () => {
    const shareUrl = `${window.location.origin}/customer?id=${encodeURIComponent(currentUser.userId)}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Customer Access Link',
        text: 'Direct link to view your invoices',
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Customer link copied to clipboard!');
    }
  };

  if (!currentUser) return null;

  const totalAmount = customerInvoices.reduce((sum, invoice) => sum + parseFloat(invoice.grand_total), 0);
  const paidAmount = customerInvoices.filter(inv => inv.status === 'paid').reduce((sum, invoice) => sum + parseFloat(invoice.grand_total), 0);
  const unpaidAmount = totalAmount - paidAmount;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card className="gradient-card shadow-soft border-0 mb-6">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-3xl font-bold text-primary">Customer Portal</CardTitle>
              <div className="mt-2 space-y-1">
                <p className="text-muted-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  User ID: <span className="font-mono font-semibold text-primary">{currentUser.userId}</span>
                </p>
                {currentUser.buildingName && (
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    {currentUser.buildingName}
                    {currentUser.flatNumber && (
                      <span className="flex items-center gap-1">
                        <Home className="w-4 h-4" />
                        Flat {currentUser.flatNumber}
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={shareCustomerLink} variant="outline" className="flex items-center gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
              <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                {sharedUserId ? 'Back' : 'Logout'}
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                        <h3 className="font-semibold text-lg">Invoice #{invoice.invoice_number}</h3>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(invoice.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-semibold">{formatCurrency(invoice.grand_total)}</span>
                          </div>
                        </div>
                        
                         <div className="space-y-2">
                           <p><span className="font-medium">Items:</span> {invoice.items.length}</p>
                            <p><span className="font-medium">Subtotal:</span> {formatCurrency(invoice.sub_total)}</p>
                            {parseFloat(invoice.discount_amount || 0) > 0 && (
                              <p><span className="font-medium">Discount:</span> -{formatCurrency(invoice.discount_amount)}</p>
                            )}
                            {parseFloat(invoice.tax_amount || 0) > 0 && <p><span className="font-medium">Tax:</span> {formatCurrency(invoice.tax_amount)}</p>}
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