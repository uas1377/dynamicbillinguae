import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, ShoppingCart, FileText, Printer, Download, Image, ArrowRight, Building2, Home } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import { generateThermalPrint, saveAsImage } from "@/utils/thermalPrintGenerator";
import {
  getStoredBuildings,
  getStoredFlats,
  addBuildingToStorage,
  addFlatToStorage,
} from "@/utils/buildingFlatStorage";

const CreateInvoice = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFlat, setSelectedFlat] = useState('');
  const [flatSearch, setFlatSearch] = useState('');
  const [taxRate, setTaxRate] = useState(0);
  const [invoiceStatus, setInvoiceStatus] = useState('paid');
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
  
  // Add Building/Flat dialogs
  const [showAddBuildingDialog, setShowAddBuildingDialog] = useState(false);
  const [showAddFlatDialog, setShowAddFlatDialog] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newFlatNumber, setNewFlatNumber] = useState('');

  useEffect(() => {
    loadData();
    loadLocalData();
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    setCashierName(user.username || 'Cashier');
  }, []);

  useEffect(() => {
    if (selectedBuilding) {
      loadFlatsForBuilding(selectedBuilding);
    } else {
      setFlats([]);
      setSelectedFlat('');
    }
  }, [selectedBuilding]);

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
        supabase.from('admin_settings').select('*').eq('setting_key', 'business_settings').single(),
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

  const loadLocalData = () => {
    const storedBuildings = getStoredBuildings();
    setBuildings(storedBuildings);
  };

  const loadFlatsForBuilding = (buildingId) => {
    const allFlats = getStoredFlats();
    const buildingFlats = allFlats.filter(f => f.building_id === buildingId);
    setFlats(buildingFlats);
  };

  const handleAddBuilding = () => {
    if (!newBuildingName.trim()) {
      toast.error('Building name is required');
      return;
    }
    const building = addBuildingToStorage(newBuildingName.trim());
    setBuildings([...buildings, building]);
    setSelectedBuilding(building.id);
    setNewBuildingName('');
    setShowAddBuildingDialog(false);
    toast.success('Building added');
  };

  const handleAddFlat = () => {
    if (!newFlatNumber.trim()) {
      toast.error('Flat number is required');
      return;
    }
    if (!selectedBuilding) {
      toast.error('Select a building first');
      return;
    }
    const flat = addFlatToStorage(selectedBuilding, newFlatNumber.trim());
    loadFlatsForBuilding(selectedBuilding);
    setSelectedFlat(flat.id);
    setNewFlatNumber('');
    setShowAddFlatDialog(false);
    toast.success('Flat added');
  };

  const getCustomerFromSelection = () => {
    if (!selectedBuilding || !selectedFlat) return null;
    return customers.find(c => c.building_id === selectedBuilding && c.flat_id === selectedFlat);
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

  const updateProductQuantityDirect = (productId, quantity) => {
    const newQuantity = Math.max(0, parseInt(quantity) || 0);
    if (newQuantity === 0) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== productId));
    } else {
      setSelectedProducts(selectedProducts.map(product => 
        product.id === productId ? { ...product, quantity: newQuantity } : product
      ));
    }
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
      const customer = getCustomerFromSelection();
      const building = buildings.find(b => b.id === selectedBuilding);
      const flat = flats.find(f => f.id === selectedFlat);

      const newInvoice = {
        invoice_number: invoiceNumber,
        customer_id: customer?.id || null,
        customer_phone: customer?.phone || null,
        customer_name: customer?.name || (building && flat ? `${building.name}, Flat ${flat.flat_number}` : null),
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
      setSelectedBuilding('');
      setSelectedFlat('');
      setFlatSearch('');
      setTaxRate(0);
      setDiscountType('amount');
      setDiscountValue(0);
      setInvoiceStatus('paid');
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
    const customer = getCustomerFromSelection();
    const building = buildings.find(b => b.id === selectedBuilding);
    const flat = flats.find(f => f.id === selectedFlat);
    
    const invoiceData = {
      invoiceNumber,
      customerName: customer?.name || (building && flat ? `${building.name}, Flat ${flat.flat_number}` : ''),
      customerPhone: customer?.phone || '',
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
    const customer = getCustomerFromSelection();
    const building = buildings.find(b => b.id === selectedBuilding);
    const flat = flats.find(f => f.id === selectedFlat);
    
    const invoiceData = {
      invoiceNumber,
      customerName: customer?.name || (building && flat ? `${building.name}, Flat ${flat.flat_number}` : ''),
      customerPhone: customer?.phone || '',
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

  const filteredFlats = flats.filter(flat => 
    flat.flat_number.toLowerCase().includes(flatSearch.toLowerCase())
  );

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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto">
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
                <CardContent className="p-3 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-lg gradient-primary flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-xs mb-1 line-clamp-2">{product.name}</h3>
                  <p className="text-xs text-muted-foreground">₹{product.price}</p>
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
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 p-3 sm:p-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-sm px-2 py-1">
                {selectedProducts.length} Item{selectedProducts.length > 1 ? 's' : ''}
              </Badge>
              <span className="text-sm font-semibold">
                {formatCurrency(calculateSubtotal())}
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
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="w-5 h-5" />
              Selected Items ({selectedProducts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-2 sm:p-3 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm truncate block">{product.name}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateProductQuantity(product.id, -1)}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{product.quantity}</span>
                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateProductQuantity(product.id, 1)}>
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="ml-2 font-semibold text-sm w-16 text-right">
                      {formatCurrency(product.quantity * product.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkout Dialog - Mobile Friendly */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              Invoice Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Cashier Info */}
            <div className="text-sm text-muted-foreground">
              Cashier: <span className="font-semibold text-foreground">{cashierName}</span>
            </div>

            {/* Products Table - Responsive */}
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Product</TableHead>
                    <TableHead className="text-center text-xs w-28">Qty</TableHead>
                    <TableHead className="text-right text-xs w-20">Rate</TableHead>
                    <TableHead className="text-right text-xs w-20">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="text-xs">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-muted-foreground text-[10px]">{product.barcode || product.sku || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateProductQuantity(product.id, -1)}>
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            value={product.quantity}
                            onChange={(e) => updateProductQuantityDirect(product.id, e.target.value)}
                            className="w-12 h-6 text-xs text-center p-1"
                            min="1"
                          />
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateProductQuantity(product.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(product.amount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs">
                        {formatCurrency(product.quantity * product.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Subtotal and Total */}
            <div className="flex justify-end">
              <div className="w-full sm:w-64 space-y-1 text-sm">
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
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal())}</span>
                </div>
              </div>
            </div>

            {/* Customer Selection - Building/Flat */}
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <Label className="text-sm font-semibold">Customer (Optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs">
                    <Building2 className="w-3 h-3" />
                    Building
                  </Label>
                  <div className="flex gap-1">
                    <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => setShowAddBuildingDialog(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs">
                    <Home className="w-3 h-3" />
                    Flat
                  </Label>
                  <div className="space-y-1">
                    <Input
                      placeholder="Search flat..."
                      value={flatSearch}
                      onChange={(e) => setFlatSearch(e.target.value)}
                      disabled={!selectedBuilding}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-1">
                      <Select 
                        value={selectedFlat} 
                        onValueChange={setSelectedFlat}
                        disabled={!selectedBuilding}
                      >
                        <SelectTrigger className="h-9 flex-1">
                          <SelectValue placeholder={selectedBuilding ? "Select flat" : "Select building first"} />
                        </SelectTrigger>
                        <SelectContent className="bg-background z-50 max-h-40">
                          {filteredFlats.map((flat) => (
                            <SelectItem key={flat.id} value={flat.id}>
                              {flat.flat_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setShowAddFlatDialog(true)}
                        disabled={!selectedBuilding}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tax and Discount */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tax Rate (%)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="h-9"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">Discount Type</Label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background">
                    <SelectItem value="amount">Amount</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs">
                  Discount {discountType === 'percentage' ? '(%)' : '(₹)'}
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  min="0"
                  max={discountType === 'percentage' ? "100" : undefined}
                  className="h-9"
                />
              </div>
            </div>

            {/* Amount Received and Change */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Amount Received</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="h-10 text-base"
                />
              </div>
              
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Change to Give</Label>
                <div className="p-2 bg-background rounded-md border-2 border-primary h-10 flex items-center">
                  <span className="text-lg font-bold text-primary">{formatCurrency(calculateChange())}</span>
                </div>
              </div>
            </div>

            {/* Paid/Unpaid Switch */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold">Payment Status</Label>
                <Badge variant={invoiceStatus === 'paid' ? 'default' : 'destructive'}>
                  {invoiceStatus.toUpperCase()}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Unpaid</span>
                <Switch
                  checked={invoiceStatus === 'paid'}
                  onCheckedChange={(checked) => setInvoiceStatus(checked ? 'paid' : 'unpaid')}
                />
                <span className="text-xs text-muted-foreground">Paid</span>
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <Button onClick={printInvoice} variant="outline" className="flex items-center justify-center gap-1 h-10">
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </Button>
              <Button onClick={saveAsImageHandler} variant="outline" className="flex items-center justify-center gap-1 h-10">
                <Image className="w-4 h-4" />
                <span className="hidden sm:inline">Image</span>
              </Button>
              <Button onClick={saveInvoice} className="gradient-primary text-white border-0 h-10">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Building Dialog */}
      <Dialog open={showAddBuildingDialog} onOpenChange={setShowAddBuildingDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Building</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Building Name</Label>
              <Input
                placeholder="Enter building name"
                value={newBuildingName}
                onChange={(e) => setNewBuildingName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBuilding()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddBuildingDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBuilding} className="gradient-primary text-white border-0">
              Add Building
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Flat Dialog */}
      <Dialog open={showAddFlatDialog} onOpenChange={setShowAddFlatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Flat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Flat Number</Label>
              <Input
                placeholder="Enter flat number (e.g., 101, A-201)"
                value={newFlatNumber}
                onChange={(e) => setNewFlatNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFlat()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFlatDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFlat} className="gradient-primary text-white border-0">
              Add Flat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreateInvoice;
