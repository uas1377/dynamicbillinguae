import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BuildingFlatSelector from "@/components/ui/BuildingFlatSelector";

const AddCustomer = () => {
  const [customer, setCustomer] = useState({
    name: '',
    phone: '',
    email: ''
  });
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFlat, setSelectedFlat] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customer.name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    
    if (!selectedBuilding) {
      toast.error('Please select a building');
      return;
    }
    
    if (!selectedFlat) {
      toast.error('Please select a flat');
      return;
    }

    try {
      const building = buildings.find(b => b.id === selectedBuilding);
      const flat = flats.find(f => f.id === selectedFlat);

      // Check if customer already exists in this flat
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('building_id', selectedBuilding)
        .eq('flat_id', selectedFlat)
        .single();

      if (existingCustomer) {
        toast.error('A customer already exists for this flat');
        return;
      }

      const { error } = await supabase
        .from('customers')
        .insert({
          name: customer.name.trim(),
          phone: customer.phone.trim() || null,
          email: customer.email.trim() || null,
          building_id: selectedBuilding,
          flat_id: selectedFlat,
          address: `${building?.name || ''}, Flat ${flat?.flat_number || ''}`
        });

      if (error) {
        toast.error('Failed to add customer: ' + error.message);
        return;
      }
      
      toast.success('Customer added successfully');
      setCustomer({ name: '', phone: '', email: '' });
      setSelectedBuilding('');
      setSelectedFlat('');
    } catch (error) {
      // If no existing customer found, that's fine, continue with creation
      if (error.code === 'PGRST116') {
        try {
          const building = buildings.find(b => b.id === selectedBuilding);
          const flat = flats.find(f => f.id === selectedFlat);

          const { error: insertError } = await supabase
            .from('customers')
            .insert({
              name: customer.name.trim(),
              phone: customer.phone.trim() || null,
              email: customer.email.trim() || null,
              building_id: selectedBuilding,
              flat_id: selectedFlat,
              address: `${building?.name || ''}, Flat ${flat?.flat_number || ''}`
            });

          if (insertError) {
            toast.error('Failed to add customer: ' + insertError.message);
            return;
          }
          
          toast.success('Customer added successfully');
          setCustomer({ name: '', phone: '', email: '' });
          setSelectedBuilding('');
          setSelectedFlat('');
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
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={customer.phone}
                onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <BuildingFlatSelector
              selectedBuilding={selectedBuilding}
              setSelectedBuilding={setSelectedBuilding}
              selectedFlat={selectedFlat}
              setSelectedFlat={setSelectedFlat}
              buildings={buildings}
              setBuildings={setBuildings}
              flats={flats}
              setFlats={setFlats}
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
