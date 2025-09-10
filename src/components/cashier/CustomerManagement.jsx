import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CustomerManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast.error('Failed to load customers: ' + error.message);
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      toast.error('Failed to load customers: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      // Check if phone number already exists (excluding current customer when editing)
      const { data: existingCustomers, error } = await supabase
        .from('customers')
        .select('id, phone')
        .eq('phone', formData.phone.trim());

      if (error) {
        toast.error('Failed to validate phone: ' + error.message);
        return;
      }

      const duplicatePhone = existingCustomers?.find(c => c.id !== editingCustomer?.id);
      if (duplicatePhone) {
        toast.error('Customer with this phone number already exists');
        return;
      }

      const customerData = {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', editingCustomer.id);

        if (error) {
          toast.error('Failed to update customer: ' + error.message);
          return;
        }
        toast.success('Customer updated successfully');
      } else {
        const { error } = await supabase
          .from('customers')
          .insert(customerData);

        if (error) {
          toast.error('Failed to add customer: ' + error.message);
          return;
        }
        toast.success('Customer added successfully');
      }

      await loadCustomers();
      closeDialog();
    } catch (error) {
      toast.error('Failed to save customer: ' + error.message);
    }
  };

  const openDialog = (customer = null) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer?.name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      address: customer?.address || ''
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
    setFormData({ name: '', phone: '', email: '', address: '' });
  };

  const deleteCustomer = async (customerId) => {
    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerId);

      if (error) {
        toast.error('Failed to delete customer: ' + error.message);
        return;
      }

      toast.success('Customer deleted successfully');
      await loadCustomers();
    } catch (error) {
      toast.error('Failed to delete customer: ' + error.message);
    }
  };

  const shareCustomerLink = (customer) => {
    const shareUrl = `${window.location.origin}/customer?phone=${encodeURIComponent(customer.phone)}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Customer Access for ${customer.name}`,
        text: `Direct link to view invoices for ${customer.name}`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Customer link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customer Management ({customers.length} customers)
          </CardTitle>
          <Button onClick={() => openDialog()} className="gradient-primary text-white border-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </CardHeader>
        <CardContent>
          {customers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl font-semibold mb-2">No Customers Found</p>
              <p className="text-muted-foreground">Start by adding your first customer to the system.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {customers.map((customer) => (
                <Card key={customer.id} className="border shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{customer.name}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                          <p>Phone: {customer.phone}</p>
                          {customer.email && <p>Email: {customer.email}</p>}
                          {customer.address && <p>Address: {customer.address}</p>}
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => shareCustomerLink(customer)}
                          className="flex items-center gap-1"
                        >
                          <Share2 className="w-3 h-3" />
                          Share
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDialog(customer)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteCustomer(customer.id)}
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
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter customer name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address (Optional)</Label>
                <Input
                  id="address"
                  placeholder="Enter customer address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary text-white border-0">
                {editingCustomer ? 'Update Customer' : 'Add Customer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagement;