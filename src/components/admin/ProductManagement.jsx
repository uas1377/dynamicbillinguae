import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Plus, Edit, Trash2, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import GoogleSheetsSync from "./GoogleSheetsSync";
import BarcodeScanner from "@/components/ui/BarcodeScanner";

import { getBusinessSettings } from "@/utils/localStorageData";

const ProductManagement = () => {
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [currencyCode, setCurrencyCode] = useState('currency');
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    sku: '',
    quantity: '',
    price: '',
    buyingPrice: '',
    discountLimit: ''
  });

  useEffect(() => {
    loadProducts();
    const settings = getBusinessSettings();
    setCurrencyCode(settings.currencyCode || 'currency');
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to load products: ' + error.message);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      toast.error('Failed to load products: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    // Check for duplicate SKU if SKU is provided
    if (formData.sku.trim()) {
      try {
        const { data: existingProducts, error } = await supabase
          .from('products')
          .select('id, sku')
          .eq('sku', formData.sku.trim());

        if (error) {
          toast.error('Failed to validate SKU: ' + error.message);
          return;
        }

        const duplicateSku = existingProducts?.find(p => p.id !== editingProduct?.id);
        if (duplicateSku) {
          toast.error('SKU number already exists. Please use a unique SKU.');
          return;
        }
      } catch (error) {
        toast.error('Failed to validate SKU: ' + error.message);
        return;
      }
    }

    const productData = {
      name: formData.name.trim(),
      barcode: formData.barcode.trim() || null,
      sku: formData.sku.trim() || null,
      quantity: parseInt(formData.quantity) || 0,
      price: parseFloat(formData.price) || 0,
      buying_price: parseFloat(formData.buyingPrice) || 0,
      discount_limit: parseFloat(formData.discountLimit) || 0,
    };

    try {
      if (editingProduct) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) {
          toast.error('Failed to update product: ' + error.message);
          return;
        }
        toast.success('Product updated successfully');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) {
          toast.error('Failed to add product: ' + error.message);
          return;
        }
        toast.success('Product added successfully');
      }

      await loadProducts();
      closeDialog();
    } catch (error) {
      toast.error('Failed to save product: ' + error.message);
    }
  };

  const openDialog = (product = null) => {
    setEditingProduct(product);
    setFormData({
      name: product?.name || '',
      barcode: product?.barcode || '',
      sku: product?.sku || '',
      quantity: product?.quantity?.toString() || '',
      price: product?.price?.toString() || '',
      buyingPrice: product?.buying_price?.toString() || '',
      discountLimit: product?.discount_limit?.toString() || ''
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setFormData({ name: '', barcode: '', sku: '', quantity: '', price: '', buyingPrice: '', discountLimit: '' });
  };

  const deleteProduct = async (productId) => {
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) {
        toast.error('Failed to delete product: ' + error.message);
        return;
      }

      toast.success('Product deleted successfully');
      await loadProducts();
    } catch (error) {
      toast.error('Failed to delete product: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <GoogleSheetsSync onSyncComplete={loadProducts} />
      
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Product Management ({products.length} products)
          </CardTitle>
          <Button onClick={() => openDialog()} className="gradient-primary text-white border-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-semibold mb-2">No Products Found</p>
              <p className="text-muted-foreground">Start by adding your first product to the inventory.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {products.map((product) => (
                <Card key={product.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{product.name}</h3>
                        <div className="grid md:grid-cols-4 gap-2 mt-2 text-sm text-muted-foreground">
                          {product.barcode && <p>Barcode: {product.barcode}</p>}
                          {product.sku && <p>SKU: {product.sku}</p>}
                          <p>Quantity: {product.quantity}</p>
                          <p>Price: {formatCurrency(product.price || 0, currencyCode)}</p>
                          {product.discount_limit > 0 && <p>Max Discount: {product.discount_limit}%</p>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(product)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteProduct(product.id)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="gradient-card border-0">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter product name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="barcode">Barcode Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    placeholder="Scan or enter barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setScannerOpen(true)}
                    className="px-3"
                  >
                    <ScanLine className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="sku">SKU Number</Label>
                <Input
                  id="sku"
                  placeholder="Enter SKU (optional)"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  placeholder="Enter quantity"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  min="0"
                />
              </div>
              
               <div className="space-y-2">
                 <Label htmlFor="price">Selling Price</Label>
                 <Input
                   id="price"
                   type="number"
                   placeholder="Enter selling price"
                   value={formData.price}
                   onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                   min="0"
                   step="0.01"
                 />
               </div>
               
               <div className="space-y-2">
                 <Label htmlFor="buyingPrice">Buying Price (Cost)</Label>
                 <Input
                   id="buyingPrice"
                   type="number"
                   placeholder="Enter buying/cost price"
                   value={formData.buyingPrice}
                   onChange={(e) => setFormData({ ...formData, buyingPrice: e.target.value })}
                   min="0"
                   step="0.01"
                 />
               </div>
               
               <div className="space-y-2">
                 <Label htmlFor="discountLimit">Discount Limit % (Optional)</Label>
                 <Input
                   id="discountLimit"
                   type="number"
                   min="0"
                   max="100"
                   step="0.01"
                   placeholder="Enter maximum discount percentage"
                   value={formData.discountLimit}
                   onChange={(e) => setFormData({ ...formData, discountLimit: e.target.value })}
                 />
               </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary text-white border-0">
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(barcode) => {
          setFormData({ ...formData, barcode });
          toast.success(`Barcode scanned: ${barcode}`);
        }}
      />
    </div>
  );
};

export default ProductManagement;