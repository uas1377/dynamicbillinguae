import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Minus, ShoppingCart, FileText, Printer, Download, Image, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import { generateThermalPrint, saveAsImage } from "@/utils/thermalPrintGenerator";

const CreateInvoice = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [invoiceStatus, setInvoiceStatus] = useState('unpaid');
  const [discountType, setDiscountType] = useState('amount');
  const [discountValue, setDiscountValue] = useState(0);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState(0);
  const [cashierName, setCashierName] = useState('');
  const [businessSettings, setBusinessSettings] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo: ''
  });

  useEffect(() => {
    loadData();
    // Get cashier name from session
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    setCashierName(user.username || 'Cashier');
  }, []);

  // Barcode scanner listener
  useEffect(() => {
    let timeout;
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      clearTimeout(timeout);
      
      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        const product = products.find(p => p.barcode === barcodeBuffer.trim());
        if (product) {
          addProductToInvoice(product);
          toast.success(`Product added: ${product.name}`);
        } else {
          toast.error('Product not found with barcode: ' + barcodeBuffer);
        }
        setBarcodeBuffer('');
      } else if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
        timeout = setTimeout(() => setBarcodeBuffer(''), 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      clearTimeout(timeout);
    };
  }, [barcodeBuffer, products]);

  const loadData = async () => {
    try {
      const [productsRes, customersRes, settingsRes] = await Promise.all([
        supabase.from('products').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*').order('created_at', { ascending: false }),
        supabase.from('admin_settings').select('*').eq('setting_key', 'business_settings').single()
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

      if (settingsRes.data?.setting_value) {
        setBusinessSettings({
          name: settingsRes.data.setting_value.name || '',
          address: settingsRes.data.setting_value.address || '',
          phone: settingsRes.data.setting_value.phone || '',
          email: settingsRes.data.setting_value.email || '',
          logo: settingsRes.data.setting_value.logo || ''
        });
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
      setSelectedProducts([...selectedProducts, { 
        ...product, 
        quantity: 1, 
        amount: product.price || 0,
        buying_price: product.buying_price || 0
      }]);
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

  const calculateChange = () => {
    const change = amountReceived - calculateTotal();
    return change > 0 ? change : 0;
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
        status: invoiceStatus,
        cashier_name: cashierName,
        amount_received: amountReceived,
        change_amount: calculateChange()
      };

      const { error: invoiceError } = await supabase
        .from('invoices')
        .insert(newInvoice);

      if (invoiceError) {
        toast.error('Failed to save invoice: ' + invoiceError.message);
        return;
      }

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
      
      // Reset form
      setSelectedProducts([]);
      setSelectedCustomer('');
      setCustomerSearch('');
      setTaxRate(0);
      setDiscountType('amount');
      setDiscountValue(0);
      setInvoiceStatus('unpaid');
      setAmountReceived(0);
      setShowCheckoutDialog(false);
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
      cashierName: cashierName,
      items: selectedProducts,
      subTotal: calculateSubtotal().toFixed(2),
      discountAmount: calculateDiscount().toFixed(2),
      taxRate: taxRate,
      taxAmount: calculateTax().toFixed(2),
      grandTotal: calculateTotal().toFixed(2),
      amountReceived: amountReceived.toFixed(2),
      changeAmount: calculateChange().toFixed(2),
      yourCompany: businessSettings
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
      cashierName: cashierName,
      items: selectedProducts,
      subTotal: calculateSubtotal().toFixed(2),
      discountAmount: calculateDiscount().toFixed(2),
      taxRate: taxRate,
      taxAmount: calculateTax().toFixed(2),
      grandTotal: calculateTotal().toFixed(2),
      amountReceived: amountReceived.toFixed(2),
      changeAmount: calculateChange().toFixed(2),
      yourCompany: businessSettings || { name: '', address: '', phone: '', logo: '' }
    };
    
    try {
      await saveAsImage(invoiceData);
      toast.success('Invoice saved as image');
    } catch (error) {
      toast.error('Failed to save invoice as image');
    }
  };

  const handleOpenCheckout = () => {
    if (selectedProducts.length === 0) {
      toast.error('Please add at least one product');
      return;
    }
    setAmountReceived(calculateTotal());
    setShowCheckoutDialog(true);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Product Selection */}
      <Card id="product-selection" className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Select Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search products by name or SKU..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
            {products
              .filter(product => 
                product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase()))
              )
              .map((product) => (
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
                  <p className="text-xs text-muted-foreground">Price: ₹{product.price}</p>
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
      
      {/* Fixed Bottom Navigation Bar */}
      {selectedProducts.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {selectedProducts.length} Product{selectedProducts.length > 1 ? 's' : ''} Selected
              </Badge>
              <span className="text-sm font-semibold">
                Total: {formatCurrency(calculateSubtotal())}
              </span>
            </div>
            <Button 
              onClick={handleOpenCheckout}
              className="gradient-primary flex items-center gap-2"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Selected Products Preview (minimal) */}
      {selectedProducts.length > 0 && (
        <Card className="gradient-card shadow-soft border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Selected Items ({selectedProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-muted-foreground ml-2">x{product.quantity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => updateProductQuantity(product.id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-8 text-center">{product.quantity}</span>
                    <Button size="sm" variant="outline" onClick={() => updateProductQuantity(product.id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="ml-4 font-semibold w-20 text-right">
                      {formatCurrency(product.quantity * product.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoice Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Cashier Info */}
            <div className="text-sm text-muted-foreground">
              Cashier: <span className="font-semibold text-foreground">{cashierName}</span>
            </div>

            {/* Products Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barcode/SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-xs">{product.barcode || product.sku || '-'}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateProductQuantity(product.id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center">{product.quantity}</span>
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateProductQuantity(product.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          value={product.amount}
                          onChange={(e) => updateProductAmount(product.id, e.target.value)}
                          className="w-20 h-8 text-right ml-auto"
                          min="0"
                          step="0.01"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(product.quantity * product.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Subtotal and Total */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
                </div>
                {calculateDiscount() > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount:</span>
                    <span className="font-semibold">-{formatCurrency(calculateDiscount())}</span>
                  </div>
                )}
                {taxRate > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-semibold">{formatCurrency(calculateTax())}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>

            {/* Customer, Tax, Discount Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Amount Received and Change */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="amountReceived" className="text-lg font-semibold">Amount Received</Label>
                <Input
                  id="amountReceived"
                  type="number"
                  placeholder="Enter amount received"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="text-lg h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-lg font-semibold">Change to Give</Label>
                <div className="p-3 bg-background rounded-md border-2 border-primary h-12 flex items-center">
                  <span className="text-2xl font-bold text-primary">{formatCurrency(calculateChange())}</span>
                </div>
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
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
                <Button onClick={printInvoice} variant="outline" className="flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Print
                </Button>
                <Button onClick={saveAsImageHandler} variant="outline" className="flex items-center gap-2">
                  <Image className="w-4 h-4" />
                  Save as Image
                </Button>
                <Button onClick={saveInvoice} className="gradient-primary text-white border-0">
                  Save Invoice
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateInvoice;
