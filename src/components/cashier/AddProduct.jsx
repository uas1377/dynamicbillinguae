import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Plus } from "lucide-react";
import { toast } from "sonner";

const AddProduct = () => {
  const [product, setProduct] = useState({
    name: '',
    barcode: '',
    sku: '',
    quantity: '',
    price: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!product.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const newProduct = {
      id: Date.now().toString(),
      name: product.name.trim(),
      barcode: product.barcode.trim() || '',
      sku: product.sku.trim() || '',
      quantity: parseInt(product.quantity) || 0,
      price: parseFloat(product.price) || 0,
      createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    localStorage.setItem('products', JSON.stringify(products));
    
    toast.success('Product added successfully');
    setProduct({ name: '', barcode: '', sku: '', quantity: '', price: '' });
  };

  return (
    <Card className="gradient-card shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Add New Product
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                placeholder="Enter product name"
                value={product.name}
                onChange={(e) => setProduct({ ...product, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="barcode">Barcode Number</Label>
              <Input
                id="barcode"
                placeholder="Enter barcode (optional)"
                value={product.barcode}
                onChange={(e) => setProduct({ ...product, barcode: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku">SKU Number</Label>
              <Input
                id="sku"
                placeholder="Enter SKU (optional)"
                value={product.sku}
                onChange={(e) => setProduct({ ...product, sku: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Enter quantity (optional)"
                value={product.quantity}
                onChange={(e) => setProduct({ ...product, quantity: e.target.value })}
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                placeholder="Enter price (optional)"
                value={product.price}
                onChange={(e) => setProduct({ ...product, price: e.target.value })}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <Button type="submit" className="gradient-primary text-white border-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddProduct;