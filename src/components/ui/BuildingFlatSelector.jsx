import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const BuildingFlatSelector = ({ 
  selectedBuilding, 
  setSelectedBuilding, 
  selectedFlat, 
  setSelectedFlat,
  buildings,
  setBuildings,
  flats,
  setFlats 
}) => {
  const [showAddBuildingDialog, setShowAddBuildingDialog] = useState(false);
  const [showAddFlatDialog, setShowAddFlatDialog] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newFlatNumber, setNewFlatNumber] = useState('');
  const [flatSearch, setFlatSearch] = useState('');

  useEffect(() => {
    loadBuildings();
  }, []);

  useEffect(() => {
    if (selectedBuilding) {
      loadFlats(selectedBuilding);
    } else {
      setFlats([]);
      setSelectedFlat('');
    }
  }, [selectedBuilding]);

  const loadBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      // If table doesn't exist, initialize with empty array
      setBuildings([]);
    }
  };

  const loadFlats = async (buildingId) => {
    try {
      const { data, error } = await supabase
        .from('flats')
        .select('*')
        .eq('building_id', buildingId)
        .order('flat_number', { ascending: true });

      if (error) throw error;
      setFlats(data || []);
    } catch (error) {
      setFlats([]);
    }
  };

  const handleAddBuilding = async () => {
    if (!newBuildingName.trim()) {
      toast.error('Building name is required');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('buildings')
        .insert({ name: newBuildingName.trim() })
        .select()
        .single();

      if (error) throw error;
      
      setBuildings([...buildings, data]);
      setSelectedBuilding(data.id);
      setNewBuildingName('');
      setShowAddBuildingDialog(false);
      toast.success('Building added successfully');
    } catch (error) {
      toast.error('Failed to add building: ' + error.message);
    }
  };

  const handleAddFlat = async () => {
    if (!newFlatNumber.trim()) {
      toast.error('Flat number is required');
      return;
    }

    if (!selectedBuilding) {
      toast.error('Please select a building first');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('flats')
        .insert({ 
          building_id: selectedBuilding, 
          flat_number: newFlatNumber.trim() 
        })
        .select()
        .single();

      if (error) throw error;
      
      setFlats([...flats, data]);
      setSelectedFlat(data.id);
      setNewFlatNumber('');
      setShowAddFlatDialog(false);
      toast.success('Flat added successfully');
    } catch (error) {
      toast.error('Failed to add flat: ' + error.message);
    }
  };

  const filteredFlats = flats.filter(flat => 
    flat.flat_number.toLowerCase().includes(flatSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Building Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Building2 className="w-4 h-4" />
          Building *
        </Label>
        <div className="flex gap-2">
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select building" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              {buildings.map((building) => (
                <SelectItem key={building.id} value={building.id}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            type="button" 
            variant="outline" 
            size="icon"
            onClick={() => setShowAddBuildingDialog(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Flat Selection */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Home className="w-4 h-4" />
          Flat Number *
        </Label>
        <div className="space-y-2">
          <Input
            placeholder="Search flat by number..."
            value={flatSearch}
            onChange={(e) => setFlatSearch(e.target.value)}
            disabled={!selectedBuilding}
          />
          <div className="flex gap-2">
            <Select 
              value={selectedFlat} 
              onValueChange={setSelectedFlat}
              disabled={!selectedBuilding}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={selectedBuilding ? "Select flat" : "Select building first"} />
              </SelectTrigger>
              <SelectContent className="bg-background z-50 max-h-60">
                {filteredFlats.map((flat) => (
                  <SelectItem key={flat.id} value={flat.id}>
                    {flat.flat_number}
                  </SelectItem>
                ))}
                {filteredFlats.length === 0 && flatSearch && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No flats found
                  </div>
                )}
              </SelectContent>
            </Select>
            <Button 
              type="button" 
              variant="outline" 
              size="icon"
              onClick={() => setShowAddFlatDialog(true)}
              disabled={!selectedBuilding}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Add Building Dialog */}
      <Dialog open={showAddBuildingDialog} onOpenChange={setShowAddBuildingDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Building</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Building Name</Label>
              <Input
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
            <Button onClick={handleAddBuilding}>
              Add Building
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Flat Dialog */}
      <Dialog open={showAddFlatDialog} onOpenChange={setShowAddFlatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Flat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Flat Number</Label>
              <Input
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
            <Button onClick={handleAddFlat}>
              Add Flat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BuildingFlatSelector;
