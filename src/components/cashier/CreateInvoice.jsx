import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, ShoppingCart, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";

const CreateInvoice = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [invoiceStatus, setInvoiceStatus] = useState('unpaid');

  useEffect(() => {
    const loadedProducts = JSON.parse(localStorage.getItem('products') || '[]');
    const loadedCustomers = JSON.parse(localStorage.getItem('customers') || '[]');
    setProducts(loadedProducts);
    setCustomers(loadedCustomers);
  }, []);

  const addProductToInvoice = (product) => {
    const existingIndex = selectedProducts.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      const updatedProducts = [...selectedProducts];
      updatedProducts[existingIndex].quantity += 1;
      setSelectedProducts(updatedProducts);
    } else {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1, amount: 0 }]);
    }
  };

  const updateProductQuantity = (productId, change) => {
    const updatedProducts = selectedProducts.map(product => {
      if (product.id === productId) {
        const newQuantity = Math.max(0, product.quantity + change);
        return { ...product, quantity: newQuantity };
      }
      return product;
    }).filter(product => product.quantity > 0);
    
    setSelectedProducts(updatedProducts);
  };

  const updateProductAmount = (productId, amount) => {
    const updatedProducts = selectedProducts.map(product => {
      if (product.id === productId) {
        return { ...product, amount: parseFloat(amount) || 0 };
      }
      return product;
    });
    
    setSelectedProducts(updatedProducts);
  };

  const calculateSubtotal = () => {
    return selectedProducts.reduce((sum, product) => sum + (product.quantity * product.amount), 0);
  };

  const calculateTax = () => {
    return (calculateSubtotal() * taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const generateInvoiceNumber = () => {
    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    const lastNumber = invoices.length > 0 ? 
      Math.max(...invoices.map(inv => parseInt(inv.invoiceNumber.replace('glxy', '')))) : 0;
    return `glxy${String(lastNumber + 1).padStart(4, '0')}`;
  };

  const saveInvoice = () => {
    if (selectedProducts.length === 0) {
      toast.error('Please add at least one product to the invoice');
      return;
    }

    // Check if all products have amounts set
    const productsWithoutAmount = selectedProducts.filter(p => p.amount <= 0);
    if (productsWithoutAmount.length > 0) {
      toast.error('Please set amount for all products');
      return;
    }

    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    const newInvoice = {
      id: Date.now().toString(),
      invoiceNumber: generateInvoiceNumber(),
      date: new Date().toISOString(),
      customerPhone: selectedCustomer || null,
      customerName: selectedCustomer ? customers.find(c => c.phone === selectedCustomer)?.name : null,
      items: selectedProducts,
      subTotal: calculateSubtotal().toFixed(2),
      taxRate: taxRate,
      taxAmount: calculateTax().toFixed(2),
      grandTotal: calculateTotal().toFixed(2),
      status: invoiceStatus
    };

    // Update product quantities
    const updatedProducts = products.map(product => {
      const soldProduct = selectedProducts.find(sp => sp.id === product.id);
      if (soldProduct) {
        return {
          ...product,
          quantity: Math.max(0, product.quantity - soldProduct.quantity)
        };
      }
      return product;
    });
    
    localStorage.setItem('products', JSON.stringify(updatedProducts));
    
    invoices.push(newInvoice);
    localStorage.setItem('invoices', JSON.stringify(invoices));
    
    toast.success(`Invoice ${newInvoice.invoiceNumber} saved successfully`);
    
    // Reset form
    setSelectedProducts([]);
    setSelectedCustomer('');
    setTaxRate(0);
    setInvoiceStatus('unpaid');
    setProducts(updatedProducts);
  };

  const printInvoice = () => {
    if (selectedProducts.length === 0) {
      toast.error('Please add products to print invoice');
      return;
    }
    
    // Create print content
    const printContent = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>Invoice Preview</h1>
        <p><strong>Invoice Number:</strong> ${generateInvoiceNumber()}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
        ${selectedCustomer ? `<p><strong>Customer:</strong> ${customers.find(c => c.phone === selectedCustomer)?.name} (${selectedCustomer})</p>` : ''}
        <hr>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 2px solid #333;">
              <th style="text-align: left; padding: 8px;">Product</th>
              <th style="text-align: center; padding: 8px;">Qty</th>
              <th style="text-align: right; padding: 8px;">Rate</th>
              <th style="text-align: right; padding: 8px;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${selectedProducts.map(product => `
              <tr style="border-bottom: 1px solid #ddd;">
                <td style="padding: 8px;">${product.name}</td>
                <td style="text-align: center; padding: 8px;">${product.quantity}</td>
                <td style="text-align: right; padding: 8px;">${formatCurrency(product.amount)}</td>
                <td style="text-align: right; padding: 8px;">${formatCurrency(product.quantity * product.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <hr>
        <div style="text-align: right; margin-top: 20px;">
          <p><strong>Subtotal: ${formatCurrency(calculateSubtotal())}</strong></p>
          ${taxRate > 0 ? `<p><strong>Tax (${taxRate}%): ${formatCurrency(calculateTax())}</strong></p>` : ''}
          <p style="font-size: 18px;"><strong>Total: ${formatCurrency(calculateTotal())}</strong></p>
        </div>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-6">
      {/* Product Selection */}
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Select Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-md transition-shadow border"
                onClick={() => addProductToInvoice(product)}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg gradient-primary flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">Qty: {product.quantity}</p>
                  {product.sku && <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {products.length === 0 && (
            <div className="text-center py-8">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-semibold mb-2">No Products Available</p>
              <p className="text-muted-foreground">Please add products first to create invoices.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Products */}
      {selectedProducts.length > 0 && (
        <Card className="gradient-card shadow-soft border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {selectedProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateProductQuantity(product.id, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-semibold">{product.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateProductQuantity(product.id, 1)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="Rate"
                        value={product.amount}
                        onChange={(e) => updateProductAmount(product.id, e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="w-24 text-right font-semibold">
                      {formatCurrency(product.quantity * product.amount)}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer (Optional)</Label>
                    <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.phone}>
                            {customer.name} - {customer.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tax">Tax Rate (%)</Label>
                    <Input
                      id="tax"
                      type="number"
                      placeholder="Enter tax rate"
                      value={taxRate}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="100"
                      step="0.1"
                    />
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <p className="text-lg">Subtotal: <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span></p>
                  {taxRate > 0 && (
                    <p className="text-lg">Tax ({taxRate}%): <span className="font-semibold">{formatCurrency(calculateTax())}</span></p>
                  )}
                  <p className="text-xl font-bold">Total: <span className="text-primary">{formatCurrency(calculateTotal())}</span></p>
                </div>
                
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={() => setInvoiceStatus(invoiceStatus === 'paid' ? 'unpaid' : 'paid')}
                      variant={invoiceStatus === 'paid' ? 'default' : 'destructive'}
                    >
                      {invoiceStatus === 'paid' ? 'Paid' : 'Unpaid'}
                    </Button>
                    <Badge variant={invoiceStatus === 'paid' ? 'default' : 'destructive'}>
                      {invoiceStatus.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button onClick={printInvoice} variant="outline" className="flex items-center gap-2">
                      <Printer className="w-4 h-4" />
                      Print
                    </Button>
                    <Button onClick={saveInvoice} className="gradient-primary text-white border-0">
                      Save Invoice
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CreateInvoice;