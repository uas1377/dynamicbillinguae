import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Filter, Search, Printer, Download } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { generateThermalPrint, saveAsImage } from "@/utils/thermalPrintGenerator";

const AllInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    customer: 'all',
    search: '',
    month: 'all'
  });

  useEffect(() => {
    loadInvoices();
    loadCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [invoices, filters]);

  const loadInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to load invoices: ' + error.message);
        return;
      }

      setInvoices(data || []);
    } catch (error) {
      toast.error('Failed to load invoices: ' + error.message);
    }
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to load customers: ' + error.message);
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      toast.error('Failed to load customers: ' + error.message);
    }
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
        (invoice.customer_phone && invoice.customer_phone.includes(search))
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
    const headers = ['Invoice Number', 'Date', 'Customer Name', 'Customer Phone', 'Status', 'Items', 'Total Amount'];
    
    // Create CSV rows
    const rows = filteredInvoices.map(invoice => {
      const date = new Date(invoice.created_at).toLocaleDateString();
      const items = invoice.items.map(item => `${item.name} (${item.quantity})`).join('; ');
      return [
        invoice.invoice_number,
        date,
        invoice.customer_name || 'N/A',
        invoice.customer_phone || 'N/A',
        invoice.status,
        items,
        invoice.total_amount
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

  const toggleInvoiceStatus = async (invoiceId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) {
        toast.error('Failed to update invoice status: ' + error.message);
        return;
      }

      const updatedInvoices = invoices.map(invoice =>
        invoice.id === invoiceId ? { ...invoice, status: newStatus } : invoice
      );
      
      setInvoices(updatedInvoices);
      toast.success(`Invoice status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update invoice status: ' + error.message);
    }
  };

  const printInvoice = async (invoice) => {
    const invoiceData = {
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name || '',
      customerPhone: invoice.customer_phone || '',
      items: invoice.items,
      subTotal: invoice.sub_total,
      discountAmount: invoice.discount_amount || 0,
      taxRate: invoice.tax_rate || 0,
      taxAmount: invoice.tax_amount || 0,
      grandTotal: invoice.grand_total
    };
    
    try {
      await generateThermalPrint(invoiceData);
      toast.success('Invoice sent to printer');
    } catch (error) {
      toast.error('Failed to print invoice');
    }
  };

  const saveInvoiceAsImage = async (invoice) => {
    const invoiceData = {
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name || '',
      customerPhone: invoice.customer_phone || '',
      items: invoice.items,
      subTotal: invoice.sub_total,
      discountAmount: invoice.discount_amount || 0,
      taxRate: invoice.tax_rate || 0,
      taxAmount: invoice.tax_amount || 0,
      grandTotal: invoice.grand_total
    };
    
    try {
      await saveAsImage(invoiceData);
      toast.success('Invoice saved as image');
    } catch (error) {
      toast.error('Failed to save invoice as image');
    }
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
              Total: {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.grand_total), 0))}
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
              {filteredInvoices.map((invoice) => (
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
                            onCheckedChange={() => toggleInvoiceStatus(invoice.id, invoice.status)}
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">{formatCurrency(invoice.grand_total)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p><span className="font-medium">Date:</span> {new Date(invoice.date).toLocaleDateString()}</p>
                        {invoice.customer_name && (
                          <p><span className="font-medium">Customer:</span> {invoice.customer_name}</p>
                        )}
                        {invoice.customer_phone && (
                          <p><span className="font-medium">Phone:</span> {invoice.customer_phone}</p>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p><span className="font-medium">Items:</span> {invoice.items.length}</p>
                        <p><span className="font-medium">Subtotal:</span> {formatCurrency(invoice.sub_total)}</p>
                        {parseFloat(invoice.discount_amount || 0) > 0 && (
                          <p><span className="font-medium">Discount:</span> -{formatCurrency(invoice.discount_amount)}</p>
                        )}
                        {parseFloat(invoice.tax_amount) > 0 && (
                          <p><span className="font-medium">Tax ({invoice.tax_rate}%):</span> {formatCurrency(invoice.tax_amount)}</p>
                        )}
                      </div>
                    </div>

                    {invoice.items.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="font-medium mb-2">Items:</p>
                        <div className="grid gap-1 text-sm">
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
  );
};

export default AllInvoices;