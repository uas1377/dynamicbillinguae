import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Filter, Search } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";

const AllInvoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all',
    customer: 'all',
    search: ''
  });

  useEffect(() => {
    loadInvoices();
    loadCustomers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [invoices, filters]);

  const loadInvoices = () => {
    const loadedInvoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    setInvoices(loadedInvoices);
  };

  const loadCustomers = () => {
    const loadedCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
    setCustomers(loadedCustomers);
  };

  const applyFilters = () => {
    let filtered = [...invoices];

    // Filter by status
    if (filters.status !== 'all') {
      filtered = filtered.filter(invoice => invoice.status === filters.status);
    }

    // Filter by customer
    if (filters.customer !== 'all') {
      filtered = filtered.filter(invoice => invoice.customerPhone === filters.customer);
    }

    // Filter by search
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(search) ||
        (invoice.customerName && invoice.customerName.toLowerCase().includes(search)) ||
        (invoice.customerPhone && invoice.customerPhone.includes(search))
      );
    }

    setFilteredInvoices(filtered);
  };

  const toggleInvoiceStatus = (invoiceId, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const updatedInvoices = invoices.map(invoice =>
      invoice.id === invoiceId ? { ...invoice, status: newStatus } : invoice
    );
    
    setInvoices(updatedInvoices);
    localStorage.setItem('invoices', JSON.stringify(updatedInvoices));
    toast.success(`Invoice status updated to ${newStatus}`);
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
          <div className="grid md:grid-cols-3 gap-4">
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
              Total: {formatCurrency(filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal), 0))}
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
                        <h3 className="font-semibold text-lg">#{invoice.invoiceNumber}</h3>
                        <Badge variant={invoice.status === 'paid' ? 'default' : 'destructive'}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-3">
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
                          <p className="text-2xl font-bold text-primary">{formatCurrency(invoice.grandTotal)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <p><span className="font-medium">Date:</span> {new Date(invoice.date).toLocaleDateString()}</p>
                        {invoice.customerName && (
                          <p><span className="font-medium">Customer:</span> {invoice.customerName}</p>
                        )}
                        {invoice.customerPhone && (
                          <p><span className="font-medium">Phone:</span> {invoice.customerPhone}</p>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <p><span className="font-medium">Items:</span> {invoice.items.length}</p>
                        <p><span className="font-medium">Subtotal:</span> {formatCurrency(invoice.subTotal)}</p>
                        {parseFloat(invoice.discountAmount || 0) > 0 && (
                          <p><span className="font-medium">Discount:</span> -{formatCurrency(invoice.discountAmount)}</p>
                        )}
                        {parseFloat(invoice.taxAmount) > 0 && (
                          <p><span className="font-medium">Tax ({invoice.taxRate}%):</span> {formatCurrency(invoice.taxAmount)}</p>
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