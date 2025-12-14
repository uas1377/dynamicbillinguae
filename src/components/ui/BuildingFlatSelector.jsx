import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Building2, Home } from "lucide-react";
import { toast } from "sonner";
import {
  getStoredBuildings,
  getStoredFlats,
  addBuildingToStorage,
  addFlatToStorage,
} from "@/utils/buildingFlatStorage";

const BuildingFlatSelector = ({ 
  selectedBuilding, 
  setSelectedBuilding, 
  selectedFlat, 
  setSelectedFlat,
  buildings,
  setBuildings,
  flats,
  setFlats,
}) => {
  const [showAddBuildingDialog, setShowAddBuildingDialog] = useState(false);
  const [showAddFlatDialog, setShowAddFlatDialog] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  const [newFlatNumber, setNewFlatNumber] = useState('');
  const [flatSearch, setFlatSearch] = useState('');

  useEffect(() => {
    // Load buildings from localStorage on mount
    const storedBuildings = getStoredBuildings();
    setBuildings(storedBuildings);
  }, [setBuildings]);

  useEffect(() => {
    // Load flats for the selected building from localStorage
    if (selectedBuilding) {
      const allFlats = getStoredFlats();
      const buildingFlats = allFlats.filter(
        (flat) => flat.building_id === selectedBuilding
      );
      setFlats(buildingFlats);
    } else {
      setFlats([]);
      setSelectedFlat('');
    }
  }, [selectedBuilding, setFlats, setSelectedFlat]);

  const handleAddBuilding = () => {
    if (!newBuildingName.trim()) {
      toast.error('Building name is required');
      return;
    }

    const building = addBuildingToStorage(newBuildingName.trim());
    setBuildings([...buildings, building]);
    setSelectedBuilding(building.id);
    setNewBuildingName('');
    setShowAddBuildingDialog(false);
    toast.success('Building added successfully');
  };

  const handleAddFlat = () => {
    if (!newFlatNumber.trim()) {
      toast.error('Flat number is required');
      return;
    }

    if (!selectedBuilding) {
      toast.error('Please select a building first');
      return;
    }

    const flat = addFlatToStorage(selectedBuilding, newFlatNumber.trim());
    // Reload flats for this building to reflect any updates from storage
    const allFlats = getStoredFlats();
    const buildingFlats = allFlats.filter(
      (f) => f.building_id === selectedBuilding
    );
    setFlats(buildingFlats);
    setSelectedFlat(flat.id);
    setNewFlatNumber('');
    setShowAddFlatDialog(false);
    toast.success('Flat added successfully');
  };

  const filteredFlats = flats.filter((flat) =>
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
