import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, ShoppingCart, FileText, Printer, Image, ArrowRight, Building2, Home } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { generateThermalPrint, saveAsImage } from "@/utils/thermalPrintGenerator";
import { 
  getStoredProducts, 
  updateProductInStorage,
  getStoredCustomers,
  addInvoiceToStorage,
  generateInvoiceNumber,
  getBusinessSettings 
} from "@/utils/localStorageData";
import {
  getStoredBuildings,
  getStoredFlats,
  addBuildingToStorage,
  addFlatToStorage
} from "@/utils/buildingFlatStorage";

const InvoiceTab = ({ tabId, onSave, tabData, updateTabData }) => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProducts, setSelectedProducts] = useState(tabData?.selectedProducts || []);
  const [selectedBuilding, setSelectedBuilding] = useState(tabData?.selectedBuilding || '');
  const [selectedFlat, setSelectedFlat] = useState(tabData?.selectedFlat || '');
  const [flatSearch, setFlatSearch] = useState('');
  const [taxRate, setTaxRate] = useState(tabData?.taxRate || 0);
  const [invoiceStatus, setInvoiceStatus] = useState(tabData?.invoiceStatus || 'paid');
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [amountReceived, setAmountReceived] = useState(tabData?.amountReceived || 0);
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

  const isActive = useRef(true);

  // Persist tab data when key state changes
  useEffect(() => {
    if (updateTabData) {
      updateTabData({
        selectedProducts,
        selectedBuilding,
        selectedFlat,
        taxRate,
        invoiceStatus,
        amountReceived
      });
    }
  }, [selectedProducts, selectedBuilding, selectedFlat, taxRate, invoiceStatus, amountReceived]);

  useEffect(() => {
    loadData();
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

  // Barcode scanner listener - only active for this tab
  useEffect(() => {
    let timeout;
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!isActive.current) return;
      
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

  const loadData = () => {
    try {
      const storedProducts = getStoredProducts();
      const storedCustomers = getStoredCustomers();
      const storedBuildings = getStoredBuildings();
      const storedSettings = getBusinessSettings();

      setProducts(storedProducts);
      setCustomers(storedCustomers);
      setBuildings(storedBuildings);
      setBusinessSettings(storedSettings);
    } catch (error) {
      toast.error('Failed to load data: ' + error.message);
    }
  };

  const loadFlatsForBuilding = (buildingId) => {
    try {
      const allFlats = getStoredFlats();
      const buildingFlats = allFlats.filter(f => f.building_id === buildingId);
      setFlats(buildingFlats);
    } catch (error) {
      toast.error('Failed to load flats');
      setFlats([]);
    }
  };

  const handleAddBuilding = () => {
    if (!newBuildingName.trim()) {
      toast.error('Building name is required');
      return;
    }
    
    try {
      const newBuilding = addBuildingToStorage(newBuildingName.trim());
      setBuildings([...buildings, newBuilding]);
      setSelectedBuilding(newBuilding.id);
      setNewBuildingName('');
      setShowAddBuildingDialog(false);
      toast.success('Building added');
    } catch (error) {
      toast.error('Failed to add building');
    }
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
    
    try {
      const newFlat = addFlatToStorage(selectedBuilding, newFlatNumber.trim());
      setFlats([...flats, newFlat]);
      setSelectedFlat(newFlat.id);
      setNewFlatNumber('');
      setShowAddFlatDialog(false);
      toast.success('Flat added');
    } catch (error) {
      toast.error('Failed to add flat');
    }
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

  const updateProductQuantityDirect = (productId, value) => {
    if (value === '' || value === null || value === undefined) {
      setSelectedProducts(selectedProducts.map(product => 
        product.id === productId ? { ...product, quantity: 0, quantityInput: '' } : product
      ));
      return;
    }
    
    const newQuantity = parseFloat(value);
    if (isNaN(newQuantity)) return;
    
    setSelectedProducts(selectedProducts.map(product => 
      product.id === productId ? { ...product, quantity: Math.max(0, newQuantity), quantityInput: value } : product
    ));
  };

  const calculateSubtotal = () => {
    return selectedProducts.reduce((sum, product) => sum + (product.quantity * product.amount), 0);
  };

  const calculateDiscount = () => 0;

  const calculateTax = () => {
    return (calculateSubtotal() * taxRate) / 100;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const calculateChange = () => {
    const change = amountReceived - calculateTotal();
    return change > 0 ? change : 0;
  };

  const getNextInvoiceNumber = () => {
    return generateInvoiceNumber();
  };

  const saveInvoice = () => {
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
      const invoiceNumber = getNextInvoiceNumber();
      const customer = getCustomerFromSelection();
      const building = buildings.find(b => b.id === selectedBuilding);
      const flat = flats.find(f => f.id === selectedFlat);

      const newInvoice = {
        invoice_number: invoiceNumber,
        customer_id: customer?.id || null,
        customer_phone: flat?.user_id || customer?.phone || null,
        customer_name: customer?.name || (building && flat ? `${building.name}, Flat ${flat.flat_number}` : null),
        items: selectedProducts,
        sub_total: calculateSubtotal(),
        tax_rate: taxRate,
        tax_amount: calculateTax(),
        grand_total: calculateTotal(),
        status: invoiceStatus,
        amount_received: invoiceStatus === 'paid' ? amountReceived : 0,
        change_amount: calculateChange(),
        cashier_name: cashierName,
        date: new Date().toISOString()
      };

      addInvoiceToStorage(newInvoice);

      // Update product quantities in localStorage
      selectedProducts.forEach((soldProduct) => {
        const product = products.find(p => p.id === soldProduct.id);
        if (product) {
          const newQuantity = Math.max(0, product.quantity - soldProduct.quantity);
          updateProductInStorage(product.id, { quantity: newQuantity });
        }
      });
      
      toast.success(`Invoice ${invoiceNumber} saved successfully`);
      setShowCheckoutDialog(false);
      
      // Call onSave to close the tab
      if (onSave) {
        onSave();
      }
    } catch (error) {
      toast.error('Failed to save invoice: ' + error.message);
    }
  };

  const printInvoice = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please add products to print invoice');
      return;
    }
    
    const invoiceNumber = getNextInvoiceNumber();
    const customer = getCustomerFromSelection();
    const building = buildings.find(b => b.id === selectedBuilding);
    const flat = flats.find(f => f.id === selectedFlat);
    
    const invoiceData = {
      invoiceNumber,
      customerName: customer?.name || (building && flat ? `${building.name}, Flat ${flat.flat_number}` : ''),
      customerId: flat?.user_id || '',
      customerPhone: customer?.phone || '',
      cashierName: cashierName,
      items: selectedProducts,
      subTotal: calculateSubtotal().toFixed(2),
      discountAmount: calculateDiscount().toFixed(2),
      taxRate: taxRate,
      taxAmount: calculateTax().toFixed(2),
      grandTotal: calculateTotal().toFixed(2),
      amountReceived: invoiceStatus === 'paid' ? amountReceived.toFixed(2) : '0.00',
      changeAmount: calculateChange().toFixed(2),
      status: invoiceStatus,
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
    
    const invoiceNumber = getNextInvoiceNumber();
    const customer = getCustomerFromSelection();
    const building = buildings.find(b => b.id === selectedBuilding);
    const flat = flats.find(f => f.id === selectedFlat);
    
    const invoiceData = {
      invoiceNumber,
      customerName: customer?.name || (building && flat ? `${building.name}, Flat ${flat.flat_number}` : ''),
      customerId: flat?.user_id || '',
      customerPhone: customer?.phone || '',
      cashierName: cashierName,
      items: selectedProducts,
      subTotal: calculateSubtotal().toFixed(2),
      discountAmount: calculateDiscount().toFixed(2),
      taxRate: taxRate,
      taxAmount: calculateTax().toFixed(2),
      grandTotal: calculateTotal().toFixed(2),
      amountReceived: invoiceStatus === 'paid' ? amountReceived.toFixed(2) : '0.00',
      changeAmount: calculateChange().toFixed(2),
      status: invoiceStatus,
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
                  <p className="text-xs text-muted-foreground">{businessSettings.currencyCode || 'AED'} {product.price}</p>
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
                {formatCurrency(calculateSubtotal(), businessSettings.currencyCode || 'AED')}
              </span>
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

      {/* Selected Products Preview */}
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
                      {formatCurrency(product.quantity * product.amount, businessSettings.currencyCode || 'AED')}
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

            {/* Products Table */}
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
                            value={product.quantityInput !== undefined ? product.quantityInput : product.quantity}
                            onChange={(e) => updateProductQuantityDirect(product.id, e.target.value)}
                            className="w-14 h-6 text-xs text-center p-1"
                            min="0"
                            step="0.01"
                          />
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => updateProductQuantity(product.id, 1)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatCurrency(product.amount, businessSettings.currencyCode || 'AED')}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs">
                        {formatCurrency(product.quantity * product.amount, businessSettings.currencyCode || 'AED')}
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
                  <span className="font-semibold">{formatCurrency(calculateSubtotal(), businessSettings.currencyCode || 'AED')}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-semibold">{formatCurrency(calculateTax(), businessSettings.currencyCode || 'AED')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal(), businessSettings.currencyCode || 'AED')}</span>
                </div>
              </div>
            </div>

            {/* Customer Selection */}
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
            
            {/* Tax Rate */}
            <div className="grid grid-cols-1 gap-3">
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
                  <span className="text-lg font-bold text-primary">{formatCurrency(calculateChange(), businessSettings.currencyCode || 'AED')}</span>
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

export default InvoiceTab;
