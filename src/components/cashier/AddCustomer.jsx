import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import BuildingFlatSelector from "@/components/ui/BuildingFlatSelector";

const AddCustomer = () => {
  const [phone, setPhone] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState('');
  const [selectedFlat, setSelectedFlat] = useState('');
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

      // Check if flat already has a customer entry
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('flat_id', selectedFlat)
        .maybeSingle();

      if (existingCustomer) {
        // Update existing customer with phone if provided
        if (phone.trim()) {
          const { error } = await supabase
            .from('customers')
            .update({ phone: phone.trim() })
            .eq('id', existingCustomer.id);

          if (error) {
            toast.error('Failed to update: ' + error.message);
            return;
          }
          toast.success('Flat phone number updated');
        } else {
          toast.info('This flat is already registered');
        }
      } else {
        // Create new customer entry for this flat
        const { error } = await supabase
          .from('customers')
          .insert({
            name: `${building?.name || 'Building'} - Flat ${flat?.flat_number || ''}`,
            phone: phone.trim() || null,
            building_id: selectedBuilding,
            flat_id: selectedFlat,
            address: `${building?.name || ''}, Flat ${flat?.flat_number || ''}`
          });

        if (error) {
          toast.error('Failed to add flat: ' + error.message);
          return;
        }
        
        toast.success('Flat added successfully');
      }

      setPhone('');
      setSelectedBuilding('');
      setSelectedFlat('');
    } catch (error) {
      toast.error('Failed to add flat: ' + error.message);
    }
  };

  return (
    <Card className="gradient-card shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Add Building / Flat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number (Optional)</Label>
            <Input
              id="phone"
              placeholder="Enter phone number for this flat"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          
          <Button type="submit" className="gradient-primary text-white border-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Flat
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddCustomer;
