import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AddCustomer = () => {
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    
    if (!customer.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    try {
      // Check if phone number already exists
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', customer.phone.trim())
        .single();

      if (existingCustomer) {
        toast.error('Customer with this phone number already exists');
        return;
      }

      const { error } = await supabase
        .from('customers')
        .insert({
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          email: customer.email.trim() || null,
          address: customer.address.trim() || null
        });

      if (error) {
        toast.error('Failed to add customer: ' + error.message);
        return;
      }
      
      toast.success('Customer added successfully');
      setCustomer({ name: '', phone: '', email: '', address: '' });
    } catch (error) {
      // If no existing customer found, that's fine, continue with creation
      if (error.code === 'PGRST116') {
        try {
          const { error: insertError } = await supabase
            .from('customers')
            .insert({
              name: customer.name.trim(),
              phone: customer.phone.trim(),
              email: customer.email.trim() || null,
              address: customer.address.trim() || null
            });

          if (insertError) {
            toast.error('Failed to add customer: ' + insertError.message);
            return;
          }
          
          toast.success('Customer added successfully');
          setCustomer({ name: '', phone: '', email: '', address: '' });
        } catch (insertErr) {
          toast.error('Failed to add customer: ' + insertErr.message);
        }
      } else {
        toast.error('Failed to add customer: ' + error.message);
      }
    }
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
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={customer.email}
                onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                placeholder="Enter customer address"
                value={customer.address}
                onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
              />
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