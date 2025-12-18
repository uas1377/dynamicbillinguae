import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Package, Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { 
  getStoredProducts, 
  addProductToStorage, 
  updateProductInStorage, 
  deleteProductFromStorage 
} from "@/utils/localStorageData";

const AddProduct = () => {
  const [product, setProduct] = useState({
    name: '',
    barcode: '',
    sku: '',
    quantity: '',
    price: '',
    buyingPrice: '',
    taxAmount: ''
  });
  const [products, setProducts] = useState([]);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    const storedProducts = getStoredProducts();
    setProducts(storedProducts);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!product.name.trim()) {
      toast.error('Product name is required');
      return;
    }

    try {
      if (editingProduct) {
        // Update existing product
        updateProductInStorage(editingProduct.id, {
          name: product.name.trim(),
          barcode: product.barcode.trim() || null,
          sku: product.sku.trim() || null,
          quantity: parseInt(product.quantity) || 0,
          price: parseFloat(product.price) || 0,
          buying_price: parseFloat(product.buyingPrice) || 0,
          tax_amount: parseFloat(product.taxAmount) || 0
        });

        toast.success('Product updated successfully');
        setEditingProduct(null);
      } else {
        // Add new product
        addProductToStorage({
          name: product.name.trim(),
          barcode: product.barcode.trim() || null,
          sku: product.sku.trim() || null,
          quantity: parseInt(product.quantity) || 0,
          price: parseFloat(product.price) || 0,
          buying_price: parseFloat(product.buyingPrice) || 0,
          tax_amount: parseFloat(product.taxAmount) || 0
        });

        toast.success('Product added successfully');
      }

      setProduct({ name: '', barcode: '', sku: '', quantity: '', price: '', buyingPrice: '', taxAmount: '' });
      loadProducts();
    } catch (error) {
      toast.error(`Failed to ${editingProduct ? 'update' : 'add'} product: ` + error.message);
    }
  };

  const handleEdit = (productToEdit) => {
    setProduct({
      name: productToEdit.name,
      barcode: productToEdit.barcode || '',
      sku: productToEdit.sku || '',
      quantity: productToEdit.quantity?.toString() || '',
      price: productToEdit.price?.toString() || '',
      buyingPrice: productToEdit.buying_price?.toString() || '',
      taxAmount: productToEdit.tax_amount?.toString() || ''
    });
    setEditingProduct(productToEdit);
  };

  const handleCancelEdit = () => {
    setProduct({ name: '', barcode: '', sku: '', quantity: '', price: '', buyingPrice: '', taxAmount: '' });
    setEditingProduct(null);
  };

  const handleDelete = (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      deleteProductFromStorage(productId);
      toast.success('Product deleted successfully');
      loadProducts();
    } catch (error) {
      toast.error('Failed to delete product: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            {editingProduct ? 'Edit Product' : 'Add New Product'}
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
                <Label htmlFor="price">Selling Price (includes tax)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="Enter selling price"
                  value={product.price}
                  onChange={(e) => setProduct({ ...product, price: e.target.value })}
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxAmount">Tax Amount (included in price)</Label>
                <Input
                  id="taxAmount"
                  type="number"
                  placeholder="Enter tax amount"
                  value={product.taxAmount}
                  onChange={(e) => setProduct({ ...product, taxAmount: e.target.value })}
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="buyingPrice">Buying Price (Purchase Cost)</Label>
                <Input
                  id="buyingPrice"
                  type="number"
                  placeholder="Enter buying/purchase price"
                  value={product.buyingPrice}
                  onChange={(e) => setProduct({ ...product, buyingPrice: e.target.value })}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" className="gradient-primary text-white border-0 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
              {editingProduct && (
                <Button type="button" onClick={handleCancelEdit} variant="outline">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Products List */}
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            All Products ({products.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-semibold mb-2">No Products Found</p>
              <p className="text-muted-foreground">No products have been added yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {products.map((prod) => (
                <Card key={prod.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{prod.name}</h3>
                        <div className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                          {prod.barcode && <p><span className="font-medium">Barcode:</span> {prod.barcode}</p>}
                          {prod.sku && <p><span className="font-medium">SKU:</span> {prod.sku}</p>}
                          <p><span className="font-medium">Quantity:</span> {prod.quantity}</p>
                          <p><span className="font-medium">Price:</span> {formatCurrency(prod.price)}</p>
                          {prod.tax_amount > 0 && <p><span className="font-medium">Tax (incl.):</span> {formatCurrency(prod.tax_amount)}</p>}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          onClick={() => handleEdit(prod)}
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </Button>
                        
                        <Button
                          onClick={() => handleDelete(prod.id)}
                          size="sm"
                          variant="destructive"
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
    </div>
  );
};

export default AddProduct;