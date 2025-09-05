import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";

const AddCustomer = () => {
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    type: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!customer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    
    if (!customer.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    
    if (!customer.type) {
      toast.error('Customer type is required');
      return;
    }

    const customers = JSON.parse(localStorage.getItem('customers') || '[]');
    
    // Check if phone number already exists
    const existingCustomer = customers.find(c => c.phone === customer.phone.trim());
    if (existingCustomer) {
      toast.error('Customer with this phone number already exists');
      return;
    }

    const newCustomer = {
      id: Date.now().toString(),
      name: customer.name.trim(),
      phone: customer.phone.trim(),
      type: customer.type,
      createdAt: new Date().toISOString()
    };

    customers.push(newCustomer);
    localStorage.setItem('customers', JSON.stringify(customers));
    
    toast.success('Customer added successfully');
    setCustomer({ name: '', phone: '', type: '' });
  };

  return (
    <Card className="gradient-card shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Add New Customer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Customer Name *</Label>
              <Input
                id="name"
                placeholder="Enter customer name"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="type">Customer Type *</Label>
              <Select value={customer.type} onValueChange={(value) => setCustomer({ ...customer, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select customer type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="dealer">Dealer</SelectItem>
                  <SelectItem value="reseller">Reseller</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Button type="submit" className="gradient-primary text-white border-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddCustomer;