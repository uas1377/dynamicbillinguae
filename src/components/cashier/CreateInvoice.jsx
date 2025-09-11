import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Minus, ShoppingCart, FileText, Printer, Download, Image } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import { generateThermalPrint, saveAsImage } from "@/utils/thermalPrintGenerator";
import SearchableCustomerSelect from "@/components/ui/SearchableCustomerSelect";

const CreateInvoice = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [invoiceStatus, setInvoiceStatus] = useState('unpaid');
  const [discountType, setDiscountType] = useState('amount'); // 'amount' or 'percentage'
  const [discountValue, setDiscountValue] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsRes, customersRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false })
      ]);

      if (productsRes.error) {
        toast.error('Failed to load products: ' + productsRes.error.message);
      } else {
        setProducts(productsRes.data || []);
      }

      if (customersRes.error) {
        toast.error('Failed to load customers: ' + customersRes.error.message);
      } else {
        setCustomers(customersRes.data || []);
        setFilteredCustomers(customersRes.data || []);
      }
    } catch (error) {
      toast.error('Failed to load data: ' + error.message);
    }
  };

  const filterCustomers = (searchTerm) => {
    setCustomerSearch(searchTerm);
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
      return;
    }
    
    const filtered = customers.filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
    );
    setFilteredCustomers(filtered);
  };

  const addProductToInvoice = (product) => {
    const existingIndex = selectedProducts.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      const updatedProducts = [...selectedProducts];
      updatedProducts[existingIndex].quantity += 1;
      setSelectedProducts(updatedProducts);
    } else {
      setSelectedProducts([...selectedProducts, { ...product, quantity: 1, amount: product.price || 0 }]);
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

  const calculateDiscount = () => {
    const subtotal = calculateSubtotal();
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    return discountValue;
  };

  const calculateTax = () => {
    const subtotalAfterDiscount = calculateSubtotal() - calculateDiscount();
    return (subtotalAfterDiscount * taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount() + calculateTax();
  };

  const generateInvoiceNumber = async () => {
    try {
      const { data } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(1);

      const lastNumber = data && data.length > 0 ? 
        parseInt(data[0].invoice_number.replace('glxy', '')) : 0;
      return `glxy${String(lastNumber + 1).padStart(4, '0')}`;
    } catch (error) {
      const timestamp = Date.now();
      return `glxy${String(timestamp).slice(-4)}`;
    }
  };

  const saveInvoice = async () => {
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

    try {
      const invoiceNumber = await generateInvoiceNumber();
      const customer = selectedCustomer ? customers.find(c => c.phone === selectedCustomer) : null;

      const newInvoice = {
        invoice_number: invoiceNumber,
        customer_id: customer?.id || null,
        customer_phone: selectedCustomer || null,
        customer_name: customer?.name || null,
        items: selectedProducts,
        sub_total: calculateSubtotal(),
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: calculateDiscount(),
        tax_rate: taxRate,
        tax_amount: calculateTax(),
        grand_total: calculateTotal(),
        status: invoiceStatus
      };

      // Save invoice to Supabase
      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert(newInvoice);

      if (invoiceError) {
        toast.error('Failed to save invoice: ' + invoiceError.message);
        return;
      }

      // Update product quantities in Supabase
      const updatePromises = selectedProducts.map(async (soldProduct) => {
        const product = products.find(p => p.id === soldProduct.id);
        if (product) {
          const newQuantity = Math.max(0, product.quantity - soldProduct.quantity);
          return supabase
            .from('products')
            .update({ quantity: newQuantity })
            .eq('id', product.id);
        }
      });

      await Promise.all(updatePromises);
      
      toast.success(`Invoice ${invoiceNumber} saved successfully`);
      
      // Reset form and reload data
      setSelectedProducts([]);
      setSelectedCustomer('');
      setCustomerSearch('');
      setTaxRate(0);
      setDiscountType('amount');
      setDiscountValue(0);
      setInvoiceStatus('unpaid');
      await loadData();
    } catch (error) {
      toast.error('Failed to save invoice: ' + error.message);
    }
  };

  const printInvoice = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please add products to print invoice');
      return;
    }
    
    const invoiceNumber = await generateInvoiceNumber();
    const customer = customers.find(c => c.phone === selectedCustomer);
    
    const invoiceData = {
      invoiceNumber,
      customerName: customer?.name || '',
      customerPhone: selectedCustomer || '',
      items: selectedProducts,
      subTotal: calculateSubtotal().toFixed(2),
      discountAmount: calculateDiscount().toFixed(2),
      taxRate: taxRate,
      taxAmount: calculateTax().toFixed(2),
      grandTotal: calculateTotal().toFixed(2)
    };
    
    try {
      await generateThermalPrint(invoiceData);
      toast.success('Invoice sent to printer');
    } catch (error) {
      toast.error('Failed to print invoice');
    }
  };

  const saveAsImageHandler = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please add products to save invoice');
      return;
    }
    
    const invoiceNumber = await generateInvoiceNumber();
    const customer = customers.find(c => c.phone === selectedCustomer);
    
    const invoiceData = {
      invoiceNumber,
      customerName: customer?.name || '',
      customerPhone: selectedCustomer || '',
      items: selectedProducts,
      subTotal: calculateSubtotal().toFixed(2),
      discountAmount: calculateDiscount().toFixed(2),
      taxRate: taxRate,
      taxAmount: calculateTax().toFixed(2),
      grandTotal: calculateTotal().toFixed(2)
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
      {/* Product Selection */}
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Select Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
                <div key={product.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold">{product.name}</h3>
                    {product.sku && <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
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
                    
                    <div className="w-full sm:w-24">
                      <Input
                        type="number"
                        placeholder="Rate"
                        value={product.amount}
                        onChange={(e) => updateProductAmount(product.id, e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>
                    
                    <div className="w-full sm:w-24 text-left sm:text-right font-semibold">
                      {formatCurrency(product.quantity * product.amount)}
                    </div>
                  </div>
                </div>
              ))}
              
              <div className="border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer (Optional)</Label>
                    <div className="relative">
                      <Input
                        placeholder="Search customer by name or phone..."
                        value={customerSearch}
                        onChange={(e) => filterCustomers(e.target.value)}
                        className="mb-2"
                      />
                      {customerSearch && filteredCustomers.length > 0 && (
                        <div className="absolute z-10 w-full bg-background border rounded-md shadow-lg max-h-40 overflow-y-auto">
                          {filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                              onClick={() => {
                                setSelectedCustomer(customer.phone);
                                setCustomerSearch(`${customer.name} - ${customer.phone}`);
                                setFilteredCustomers([]);
                              }}
                            >
                              <div className="font-medium">{customer.name}</div>
                              <div className="text-sm text-muted-foreground">{customer.phone}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {!customerSearch && (
                        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                          <SelectTrigger>
                            <SelectValue placeholder="Or select from dropdown" />
                          </SelectTrigger>
                          <SelectContent className="bg-background">
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.phone}>
                                {customer.name} - {customer.phone}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="discountType">Discount Type</Label>
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select discount type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="amount">Amount</SelectItem>
                        <SelectItem value="percentage">Percentage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">
                      Discount {discountType === 'percentage' ? '(%)' : `(${formatCurrency(0).replace(/[\d.,]/g, '')})`}
                    </Label>
                    <Input
                      id="discountValue"
                      type="number"
                      placeholder={`Enter ${discountType === 'percentage' ? 'percentage' : 'amount'}`}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      min="0"
                      max={discountType === 'percentage' ? "100" : undefined}
                      step={discountType === 'percentage' ? "0.1" : "0.01"}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Discount Amount</Label>
                    <div className="p-3 bg-muted rounded-md">
                      <span className="font-semibold">{formatCurrency(calculateDiscount())}</span>
                    </div>
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <p className="text-lg">Subtotal: <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span></p>
                  {calculateDiscount() > 0 && (
                    <p className="text-lg text-green-600">Discount: <span className="font-semibold">-{formatCurrency(calculateDiscount())}</span></p>
                  )}
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
                  
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <Button onClick={printInvoice} variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                      <Printer className="w-4 h-4" />
                      Print
                    </Button>
                    <Button onClick={saveAsImageHandler} variant="outline" className="flex items-center gap-2 w-full sm:w-auto">
                      <Image className="w-4 h-4" />
                      Save as Image
                    </Button>
                    <Button onClick={saveInvoice} className="gradient-primary text-white border-0 w-full sm:w-auto">
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