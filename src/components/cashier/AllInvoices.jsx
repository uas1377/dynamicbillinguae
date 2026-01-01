import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Filter, Search, Printer, Download, Clock, User, UserCheck } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { generateThermalPrint, saveAsImage } from "@/utils/thermalPrintGenerator";
import { 
  getStoredInvoices, 
  setStoredInvoices,
  getStoredCustomers,
  getBusinessSettings
} from "@/utils/localStorageData";

const AllInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [businessSettings, setBusinessSettings] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: '',
    currencyCode: 'AED'
  });
  const [filters, setFilters] = useState({
    status: 'all',
    customer: 'all',
    search: '',
    month: 'all'
  });
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({ open: false, invoice: null, newStatus: '' });

  // Get current cashier info
  const getCurrentCashier = () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '{}');
      return user?.username || user?.name || "Unknown Cashier";
    } catch {
      return "Unknown Cashier";
    }
  };

  useEffect(() => {
    loadInvoices();
    loadCustomers();
    loadBusinessSettings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [invoices, filters]);

  const loadInvoices = () => {
    const storedInvoices = getStoredInvoices();
    setInvoices(storedInvoices);
  };

  const loadCustomers = () => {
    const storedCustomers = getStoredCustomers();
    setCustomers(storedCustomers);
  };
  
  const loadBusinessSettings = () => {
    const settings = getBusinessSettings();
    setBusinessSettings(settings);
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filters.status);
    }

    // Filter by customer
    if (filters.customer !== 'all') {
      filtered = filtered.filter(invoice => invoice.customer_phone === filters.customer);
    }
    
    // Filter by month
    if (filters.month !== 'all') {
      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.created_at);
        const [year, month] = filters.month.split('-');
        return invoiceDate.getFullYear() === parseInt(year) && 
               invoiceDate.getMonth() === parseInt(month) - 1;
      });
    }

    // Filter by search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(search) ||
        (invoice.customer_name && invoice.customer_name.toLowerCase().includes(search)) ||
        (invoice.customer_phone && invoice.customer_phone.includes(search)) ||
        (invoice.cashier_name && invoice.cashier_name.toLowerCase().includes(search))
      );
    }

    setFilteredInvoices(filtered);
  };
  
  const exportToCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error('No invoices to export');
      return;
    }

    // Create CSV header
    const headers = ['Invoice Number', 'Date', 'Time', 'Cashier', 'Customer Name', 'Customer Phone', 'Status', 'Items', 'Subtotal', 'Amount Paid', 'Change', 'Total Amount'];
    
    // Create CSV rows
    const rows = filteredInvoices.map(invoice => {
      const dateTime = new Date(invoice.created_at);
      const date = dateTime.toLocaleDateString();
      const time = dateTime.toLocaleTimeString();
      const items = invoice.items.map(item => `${item.sku || ''} ${item.name} (${item.quantity})`).join('; ');
      const amountPaid = invoice.status === 'unpaid' ? '0 (unpaid)' : (invoice.amount_received || invoice.grand_total);
      return [
        invoice.invoice_number,
        date,
        time,
        invoice.cashier_name || 'N/A',
        invoice.customer_name || 'N/A',
        invoice.customer_phone || 'N/A',
        invoice.status,
        items,
        invoice.sub_total,
        amountPaid,
        invoice.change_amount || 0,
        invoice.grand_total
      ];
    });

    // Combine headers and rows
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const monthLabel = filters.month !== 'all' ? `_${filters.month}` : '';
    link.download = `invoices${monthLabel}_${new Date().toISOString().split('T')[0]}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully');
  };
  
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      months.push({
        value: `${year}-${month}`,
        label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
      });
    }
    return months;
  };

  const requestToggleInvoiceStatus = (invoiceId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    setConfirmDialog({
      open: true,
      invoice,
      newStatus
    });
  };
  
  const executeToggleInvoiceStatus = () => {
    const { invoice, newStatus } = confirmDialog;
    if (!invoice) return;
    
    const cashierName = getCurrentCashier();
    
    const updatedInvoices = invoices.map(inv =>
      inv.id === invoice.id ? { 
        ...inv, 
        status: newStatus,
        paid_by_cashier: newStatus === 'paid' ? cashierName : null,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null
      } : inv
    );
    
    setStoredInvoices(updatedInvoices);
    setInvoices(updatedInvoices);
    toast.success(`Invoice status updated to ${newStatus}`);
    setConfirmDialog({ open: false, invoice: null, newStatus: '' });
  };

  const printInvoice = async (invoice) => {
    // Find customer to get proper customer ID
    const customer = customers.find(c => c.id === invoice.customer_id);
    
    const invoiceData = {
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name || '',
      customerId: customer?.phone || invoice.customer_phone || '',
      customerPhone: customer?.phone || invoice.customer_phone || '',
      items: invoice.items,
      subTotal: parseFloat(invoice.sub_total).toFixed(2),
      discountAmount: parseFloat(invoice.discount_amount || 0).toFixed(2),
      taxRate: invoice.tax_rate || 0,
      taxAmount: parseFloat(invoice.tax_amount || 0).toFixed(2),
      grandTotal: parseFloat(invoice.grand_total).toFixed(2),
      amountReceived: invoice.status === 'paid' ? parseFloat(invoice.amount_received || invoice.grand_total).toFixed(2) : '0.00',
      changeAmount: parseFloat(invoice.change_amount || 0).toFixed(2),
      cashierName: invoice.cashier_name || '',
      status: invoice.status,
      yourCompany: businessSettings
    };
    
    try {
      await generateThermalPrint(invoiceData);
      toast.success('Invoice sent to printer');
    } catch (error) {
      toast.error('Failed to print invoice');
    }
  };

  const saveInvoiceAsImage = async (invoice) => {
    // Find customer to get proper customer ID
    const customer = customers.find(c => c.id === invoice.customer_id);
    
    const invoiceData = {
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name || '',
      customerId: customer?.phone || invoice.customer_phone || '',
      customerPhone: customer?.phone || invoice.customer_phone || '',
      items: invoice.items,
      subTotal: parseFloat(invoice.sub_total).toFixed(2),
      discountAmount: parseFloat(invoice.discount_amount || 0).toFixed(2),
      taxRate: invoice.tax_rate || 0,
      taxAmount: parseFloat(invoice.tax_amount || 0).toFixed(2),
      grandTotal: parseFloat(invoice.grand_total).toFixed(2),
      amountReceived: invoice.status === 'paid' ? parseFloat(invoice.amount_received || invoice.grand_total).toFixed(2) : '0.00',
      changeAmount: parseFloat(invoice.change_amount || 0).toFixed(2),
      cashierName: invoice.cashier_name || '',
      status: invoice.status,
      yourCompany: businessSettings
    };
    
    try {
      await saveAsImage(invoiceData);
      toast.success('Invoice saved as image');
    } catch (error) {
      toast.error('Failed to save invoice as image');
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filter Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-filter">Customer</Label>
              <Select value={filters.customer} onValueChange={(value) => setFilters({ ...filters, customer: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.phone}>
                      {customer.name} - {customer.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="month-filter">Month</Label>
              <Select value={filters.month} onValueChange={(value) => setFilters({ ...filters, month: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {getMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search invoices..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={exportToCSV} 
              variant="outline" 
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              All Invoices ({filteredInvoices.length})
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.grand_total), 0), businessSettings.currencyCode || 'AED')}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-semibold mb-2">No Invoices Found</p>
              <p className="text-muted-foreground">
                {invoices.length === 0 ? 'No invoices have been created yet.' : 'No invoices match your current filters.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredInvoices.map((invoice) => {
                const { date, time } = formatDateTime(invoice.created_at || invoice.date);
                const amountPaid = invoice.status === 'unpaid' ? '0.00 (unpaid)' : formatCurrency(invoice.amount_received || invoice.grand_total, businessSettings.currencyCode || 'AED');
                
                return (
                  <Card key={invoice.id} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">#{invoice.invoice_number}</h3>
                          <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                            {invoice.status.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                          <Button
                            onClick={() => printInvoice(invoice)}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 w-full sm:w-auto"
                          >
                            <Printer className="w-3 h-3" />
                            Print
                          </Button>
                          
                          <Button
                            onClick={() => saveInvoiceAsImage(invoice)}
                            size="sm"
                            variant="outline"
                            className="flex items-center gap-1 w-full sm:w-auto"
                          >
                            <Download className="w-3 h-3" />
                            Save
                          </Button>
                          
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`status-${invoice.id}`} className="text-sm">
                              {invoice.status === 'paid' ? 'Paid' : 'Unpaid'}
                            </Label>
                            <Switch
                              id={`status-${invoice.id}`}
                              checked={invoice.status === 'paid'}
                              onCheckedChange={() => requestToggleInvoiceStatus(invoice.id, invoice.status)}
                            />
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-primary">{formatCurrency(invoice.grand_total, businessSettings.currencyCode || 'AED')}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span className="font-medium">Date:</span> {date} at {time}
                          </p>
                          <p className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="font-medium">Cashier:</span> {invoice.cashier_name || 'N/A'}
                          </p>
                          {invoice.customer_name && (
                            <p><span className="font-medium">Customer:</span> {invoice.customer_name}</p>
                          )}
                          {invoice.customer_phone && (
                            <p><span className="font-medium">Phone:</span> {invoice.customer_phone}</p>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <p><span className="font-medium">Items:</span> {invoice.items.length}</p>
                          <p><span className="font-medium">Subtotal:</span> {formatCurrency(invoice.sub_total, businessSettings.currencyCode || 'AED')}</p>
                          {parseFloat(invoice.discount_amount || 0) > 0 && (
                            <p><span className="font-medium">Discount:</span> -{formatCurrency(invoice.discount_amount, businessSettings.currencyCode || 'AED')}</p>
                          )}
                          {parseFloat(invoice.tax_amount) > 0 && (
                            <p><span className="font-medium">Tax ({invoice.tax_rate}%):</span> {formatCurrency(invoice.tax_amount, businessSettings.currencyCode || 'AED')}</p>
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <p><span className="font-medium">Amount Paid:</span> {amountPaid}</p>
                          {invoice.status === 'paid' && parseFloat(invoice.change_amount || 0) > 0 && (
                            <p><span className="font-medium">Change:</span> {formatCurrency(invoice.change_amount, businessSettings.currencyCode || 'AED')}</p>
                          )}
                          {invoice.status === 'paid' && invoice.paid_by_cashier && (
                            <p className="flex items-center gap-1 text-green-600">
                              <UserCheck className="w-3 h-3" />
                              <span className="font-medium">Received by:</span> {invoice.paid_by_cashier}
                            </p>
                          )}
                        </div>
                      </div>

                      {invoice.items.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="font-medium mb-2">Items:</p>
                          <div className="grid gap-1 text-sm">
                            {invoice.items.map((item, index) => (
                              <div key={index} className="flex justify-between">
                                <span>
                                  {item.sku && <span className="text-muted-foreground mr-2">[{item.sku}]</span>}
                                  {item.name} x {item.quantity}
                                </span>
                                <span>{formatCurrency(item.quantity * item.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, invoice: null, newStatus: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Payment Status?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark invoice #{confirmDialog.invoice?.invoice_number} as {confirmDialog.newStatus}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeToggleInvoiceStatus}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AllInvoices;