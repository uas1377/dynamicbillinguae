import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, ShoppingCart, FileText, Printer, Image, ArrowRight, Building2, Home, QrCode } from "lucide-react";
import QRCodeButton from "@/components/ui/QRCodeButton";
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

  const [showAddBuildingDialog, setShowAddBuildingDialog] = useState(false);
  const [showAddFlatDialog, setShowAddFlatDialog] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newFlatNumber, setNewFlatNumber] = useState('');
  const isActive = useRef(true);

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
      return;
    }

    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    const updatedProducts = selectedProducts.map(product => {
      if (product.id === productId) {
        return { ...product, quantity: numValue };
      }
      return product;
    }).filter(product => product.quantity > 0);

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

  const calculateChange = () => {
    return Math.max(0, amountReceived - calculateTotal());
  };

  const printInvoice = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    const customer = getCustomerFromSelection();
    const selectedFlatObj = flats.find(f => f.id === selectedFlat);
    const selectedBuildingObj = buildings.find(b => b.id === selectedBuilding);

    const invoiceData = {
      invoice_number: generateInvoiceNumber(),
      date: new Date().toISOString(),
      customer_name: customer?.name || selectedFlatObj?.owner_name || '',
      customer_phone: customer?.phone || selectedFlatObj?.phone || '',
      building_name: selectedBuildingObj?.name || '',
      flat_number: selectedFlatObj?.flat_number || '',
      items: selectedProducts.map(p => ({
        name: p.name,
        sku: p.sku || '',
        barcode: p.barcode || '',
        quantity: p.quantity,
        amount: p.amount
      })),
      sub_total: calculateSubtotal(),
      tax_rate: taxRate,
      tax_amount: calculateTax(),
      grand_total: calculateTotal(),
      amount_received: amountReceived,
      change_amount: calculateChange(),
      status: invoiceStatus,
      cashier_name: cashierName
    };

    try {
      await generateThermalPrint(invoiceData, businessSettings);
      toast.success('Invoice sent to printer');
    } catch (error) {
      toast.error('Print failed: ' + error.message);
    }
  };

  const saveAsImageHandler = async () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    const customer = getCustomerFromSelection();
    const selectedFlatObj = flats.find(f => f.id === selectedFlat);
    const selectedBuildingObj = buildings.find(b => b.id === selectedBuilding);

    const invoiceData = {
      invoice_number: generateInvoiceNumber(),
      date: new Date().toISOString(),
      customer_name: customer?.name || selectedFlatObj?.owner_name || '',
      customer_phone: customer?.phone || selectedFlatObj?.phone || '',
      building_name: selectedBuildingObj?.name || '',
      flat_number: selectedFlatObj?.flat_number || '',
      items: selectedProducts.map(p => ({
        name: p.name,
        sku: p.sku || '',
        barcode: p.barcode || '',
        quantity: p.quantity,
        amount: p.amount
      })),
      sub_total: calculateSubtotal(),
      tax_rate: taxRate,
      tax_amount: calculateTax(),
      grand_total: calculateTotal(),
      amount_received: amountReceived,
      change_amount: calculateChange(),
      status: invoiceStatus,
      cashier_name: cashierName
    };

    try {
      await saveAsImage(invoiceData, businessSettings);
      toast.success('Invoice saved as image');
    } catch (error) {
      toast.error('Save failed: ' + error.message);
    }
  };

  const saveInvoice = () => {
    if (selectedProducts.length === 0) {
      toast.error('No products selected');
      return;
    }

    const customer = getCustomerFromSelection();
    const selectedFlatObj = flats.find(f => f.id === selectedFlat);
    const selectedBuildingObj = buildings.find(b => b.id === selectedBuilding);

    const invoiceData = {
      invoice_number: generateInvoiceNumber(),
      created_at: new Date().toISOString(),
      customer_name: customer?.name || selectedFlatObj?.owner_name || '',
      customer_phone: customer?.phone || selectedFlatObj?.phone || '',
      building_id: selectedBuilding || '',
      building_name: selectedBuildingObj?.name || '',
      flat_id: selectedFlat || '',
      flat_number: selectedFlatObj?.flat_number || '',
      items: selectedProducts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku || '',
        barcode: p.barcode || '',
        quantity: p.quantity,
        amount: p.amount,
        buying_price: p.buying_price || 0
      })),
      sub_total: calculateSubtotal(),
      tax_rate: taxRate,
      tax_amount: calculateTax(),
      grand_total: calculateTotal(),
      amount_received: amountReceived,
      change_amount: calculateChange(),
      status: invoiceStatus,
      cashier_name: cashierName,
      paid_by_cashier: invoiceStatus === 'paid' ? cashierName : null
    };

    try {
      addInvoiceToStorage(invoiceData);
      
      // Update product quantities in storage
      selectedProducts.forEach(product => {
        const updatedProduct = {
          ...product,
          quantity: product.quantity - product.quantity
        };
        updateProductInStorage(updatedProduct);
      });

      toast.success('Invoice saved successfully');
      
      // Clear form
      setSelectedProducts([]);
      setSelectedBuilding('');
      setSelectedFlat('');
      setTaxRate(0);
      setAmountReceived(0);
      setInvoiceStatus('paid');
      setShowCheckoutDialog(false);
      
      // Reload products to reflect updated quantities
      loadData();
      
      if (onSave) {
        onSave(tabId);
      }
    } catch (error) {
      toast.error('Failed to save invoice: ' + error.message);
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase())) ||
    (product.barcode && product.barcode.toLowerCase().includes(productSearch.toLowerCase()))
  );

  const filteredFlats = flats.filter(flat =>
    flat.flat_number.toLowerCase().includes(flatSearch.toLowerCase()) ||
    (flat.owner_name && flat.owner_name.toLowerCase().includes(flatSearch.toLowerCase())) ||
    (flat.phone && flat.phone.includes(flatSearch))
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
      {/* Product List Section */}
      <Card className="gradient-card shadow-soft border-0 flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="w-5 h-5" />
            Available Products
          </CardTitle>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search products..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-3 h-9 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:shadow-md transition-shadow border"
                onClick={() => addProductToInvoice(product)}
              >
                <CardContent className="p-3">
                  <div className="flex flex-col gap-1">
                    <h4 className="font-semibold text-sm line-clamp-2">{product.name}</h4>
                    <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
                      {product.sku && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {product.sku}
                        </Badge>
                      )}
                      {product.barcode && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          {product.barcode}
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm font-bold text-primary">
                        {formatCurrency(product.price, businessSettings.currencyCode || 'currency')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Stock: {product.quantity}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Section */}
      <Card className="gradient-card shadow-soft border-0 flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Current Invoice
            </div>
            <Button 
              onClick={() => setShowCheckoutDialog(true)}
              disabled={selectedProducts.length === 0}
              className="gradient-primary text-white border-0 h-8 text-sm"
            >
              <ArrowRight className="w-4 h-4 mr-1" />
              Checkout
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Selected Products */}
          <div className="space-y-2">
            {selectedProducts.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No products selected</p>
              </div>
            ) : (
              selectedProducts.map((product) => (
                <Card key={product.id} className="border">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{product.name}</h4>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                        )}
                      </div>
                      <span className="text-sm font-bold">
                        {formatCurrency(product.quantity * product.amount, businessSettings.currencyCode || 'currency')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateProductQuantity(product.id, -1)}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        value={product.quantity}
                        onChange={(e) => updateProductQuantityDirect(product.id, e.target.value)}
                        className="h-7 w-16 text-center text-sm"
                        min="1"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateProductQuantity(product.id, 1)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <span className="text-xs text-muted-foreground ml-auto">
                        @ {formatCurrency(product.amount, businessSettings.currencyCode || 'currency')}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Summary */}
          {selectedProducts.length > 0 && (
            <Card className="border-2 border-primary">
              <CardContent className="p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(calculateSubtotal(), businessSettings.currencyCode || 'currency')}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-semibold">{formatCurrency(calculateTax(), businessSettings.currencyCode || 'currency')}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal(), businessSettings.currencyCode || 'currency')}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Invoice Checkout</DialogTitle>
            <DialogDescription>
              Review and complete the invoice details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Invoice Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Product</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.name}</div>
                          {product.sku && (
                            <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{product.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.amount, businessSettings.currencyCode || 'currency')}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(product.quantity * product.amount, businessSettings.currencyCode || 'currency')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals Summary */}
            <Card className="bg-muted/50">
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(calculateSubtotal(), businessSettings.currencyCode || 'currency')}</span>
                </div>
                {taxRate > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax ({taxRate}%):</span>
                    <span className="font-semibold">{formatCurrency(calculateTax(), businessSettings.currencyCode || 'currency')}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold border-t pt-2">
                  <span>Grand Total:</span>
                  <span className="text-primary">{formatCurrency(calculateTotal(), businessSettings.currencyCode || 'currency')}</span>
                </div>
              </CardContent>
            </Card>

            {/* Customer Selection */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="building-select" className="flex items-center gap-1 text-xs">
                    <Building2 className="w-3 h-3" />
                    Building
                  </Label>
                  <div className="flex gap-1">
                    <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                      <SelectTrigger id="building-select" className="h-9 flex-1">
                        <SelectValue placeholder="Select building" />
                      </SelectTrigger>
                      <SelectContent>
                        {buildings.map((building) => (
                          <SelectItem key={building.id} value={building.id}>
                            {building.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowAddBuildingDialog(true)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flat-search" className="flex items-center gap-1 text-xs">
                    <Home className="w-3 h-3" />
                    Flat
                  </Label>
                  <div className="space-y-1">
                    <Input
                      id="flat-search"
                      placeholder="Search flat..."
                      value={flatSearch}
                      onChange={(e) => setFlatSearch(e.target.value)}
                      disabled={!selectedBuilding}
                      className="h-8 text-xs"
                    />
                    <div className="flex gap-1">
                      <Select value={selectedFlat} onValueChange={setSelectedFlat} disabled={!selectedBuilding}>
                        <SelectTrigger id="flat-select" className="h-9 flex-1">
                          <SelectValue placeholder={selectedBuilding ? "Select flat" : "Select building first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredFlats.map((flat) => (
                            <SelectItem key={flat.id} value={flat.id}>
                              {flat.flat_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={() => setShowAddFlatDialog(true)} disabled={!selectedBuilding}>
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
                <Label htmlFor="tax-rate" className="text-xs">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
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
                <Label htmlFor="amount-received" className="text-sm font-semibold">Amount Received</Label>
                <Input
                  id="amount-received"
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
                  <span className="text-lg font-bold text-primary">{formatCurrency(calculateChange(), businessSettings.currencyCode || 'currency')}</span>
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
                  id="payment-status-switch"
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
              <Button 
                onClick={async () => {
                  await printInvoice();
                  saveInvoice();
                }} 
                className="bg-red-600 hover:bg-red-700 text-white h-10"
              >
                <Printer className="w-4 h-4 mr-1" />
                Print & Save
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <QRCodeButton amount={calculateTotal()} className="h-10 w-full" />
              <Button onClick={saveInvoice} className="gradient-primary text-white border-0 h-10">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Building Dialog */}
      <Dialog open={showAddBuildingDialog} onOpenChange={setShowAddBuildingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Building</DialogTitle>
            <DialogDescription>
              Enter the name of the new building.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-building-name">Building Name</Label>
              <Input
                id="new-building-name"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Flat</DialogTitle>
            <DialogDescription>
              Enter the flat number for the selected building.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-flat-number">Flat Number</Label>
              <Input
                id="new-flat-number"
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
