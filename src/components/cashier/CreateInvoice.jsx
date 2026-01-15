import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Minus, ShoppingCart, FileText, Printer, Download, Image, ArrowRight, Building2, Home } from "lucide-react";
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
  
  const [showAddBuildingDialog, setShowAddBuildingDialog] = useState(false);
  const [showAddFlatDialog, setShowAddFlatDialog] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newFlatNumber, setNewFlatNumber] = useState('');

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
        flat_id: selectedFlat,
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
      selectedProducts.forEach((soldProduct) => {
        const product = products.find(p => p.id === soldProduct.id);
        if (product) {
          const newQuantity = Math.max(0, product.quantity - soldProduct.quantity);
          updateProductInStorage(product.id, { quantity: newQuantity });
        }
      });

      toast.success(`Invoice ${invoiceNumber} saved successfully`);
      setShowCheckoutDialog(false);
    } catch (error) {
      toast.error('Failed to save invoice: ' + error.message);
    }
  };

  // ... (printInvoice, saveAsImageHandler, handleOpenCheckout functions remain the same)

  return (
    <div className="space-y-6 pb-24">
      {/* ... Product Selection, Bottom Bar, Selected Products Preview ... */}

      {/* Checkout Dialog - FIXED LABELS & Added Description */}
      <Dialog open={showCheckoutDialog} onOpenChange={setShowCheckoutDialog}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              Invoice Details
            </DialogTitle>
            <DialogDescription>
              Review selected products, customer details, tax, payment status, and finalize the invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
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
                            id={`qty-${product.id}`} // Unique ID to match label if needed
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
                        {formatCurrency(product.amount, businessSettings.currencyCode || 'currency')}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-xs">
                        {formatCurrency(product.quantity * product.amount, businessSettings.currencyCode || 'currency')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Subtotal, Tax, Total - no changes needed */}

            {/* Customer Selection - FIXED LABELS */}
            <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
              <Label className="text-sm font-semibold">Customer (Optional)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

export default CreateInvoice;
