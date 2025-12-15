import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Home, Plus, Edit, Trash2, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  getStoredBuildings,
  getStoredFlats,
  addBuildingToStorage,
  addFlatToStorage,
  updateFlatPhoneInStorage,
  setStoredBuildings,
  setStoredFlats,
} from "@/utils/buildingFlatStorage";

const CustomerManagement = () => {
  const [buildings, setBuildings] = useState([]);
  const [allFlats, setAllFlats] = useState([]);
  
  // Add Building Dialog
  const [showAddBuildingDialog, setShowAddBuildingDialog] = useState(false);
  const [newBuildingName, setNewBuildingName] = useState('');
  
  // Add/Edit Flat Dialog
  const [showFlatDialog, setShowFlatDialog] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [flatForm, setFlatForm] = useState({
    building_id: '',
    flat_number: '',
    phone: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const storedBuildings = getStoredBuildings();
    const storedFlats = getStoredFlats();
    setBuildings(storedBuildings);
    setAllFlats(storedFlats);
  };

  const handleAddBuilding = () => {
    if (!newBuildingName.trim()) {
      toast.error('Building name is required');
      return;
    }

    const building = addBuildingToStorage(newBuildingName.trim());
    setBuildings([...buildings, building]);
    setNewBuildingName('');
    setShowAddBuildingDialog(false);
    toast.success('Building added successfully');
  };

  const handleDeleteBuilding = (buildingId) => {
    const buildingFlats = allFlats.filter(f => f.building_id === buildingId);
    if (buildingFlats.length > 0) {
      toast.error('Cannot delete building with flats. Delete flats first.');
      return;
    }
    
    const updatedBuildings = buildings.filter(b => b.id !== buildingId);
    setStoredBuildings(updatedBuildings);
    setBuildings(updatedBuildings);
    toast.success('Building deleted');
  };

  const openFlatDialog = (flat = null, buildingId = '') => {
    setEditingFlat(flat);
    setFlatForm({
      building_id: flat?.building_id || buildingId,
      flat_number: flat?.flat_number || '',
      phone: flat?.phone || ''
    });
    setShowFlatDialog(true);
  };

  const handleSaveFlat = () => {
    if (!flatForm.building_id) {
      toast.error('Please select a building');
      return;
    }
    
    if (!flatForm.flat_number.trim()) {
      toast.error('Flat number is required');
      return;
    }

    if (editingFlat) {
      // Update existing flat
      const updatedFlats = allFlats.map(f => 
        f.id === editingFlat.id 
          ? { ...f, flat_number: flatForm.flat_number.trim(), phone: flatForm.phone.trim() || null }
          : f
      );
      setStoredFlats(updatedFlats);
      setAllFlats(updatedFlats);
      toast.success('Flat updated successfully');
    } else {
      // Add new flat
      const flat = addFlatToStorage(flatForm.building_id, flatForm.flat_number.trim());
      if (flatForm.phone.trim()) {
        updateFlatPhoneInStorage(flat.id, flatForm.phone.trim());
      }
      loadData();
      toast.success('Flat added successfully');
    }

    setShowFlatDialog(false);
    setEditingFlat(null);
    setFlatForm({ building_id: '', flat_number: '', phone: '' });
  };

  const handleDeleteFlat = (flatId) => {
    const updatedFlats = allFlats.filter(f => f.id !== flatId);
    setStoredFlats(updatedFlats);
    setAllFlats(updatedFlats);
    toast.success('Flat deleted');
  };

  const getBuildingName = (buildingId) => {
    return buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Buildings Section */}
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Buildings ({buildings.length})
          </CardTitle>
          <Button 
            onClick={() => setShowAddBuildingDialog(true)} 
            className="gradient-primary text-white border-0 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Building
          </Button>
        </CardHeader>
        <CardContent>
          {buildings.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-lg font-semibold mb-1">No Buildings</p>
              <p className="text-muted-foreground text-sm">Add your first building to get started.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {buildings.map((building) => {
                const buildingFlats = allFlats.filter(f => f.building_id === building.id);
                return (
                  <Card key={building.id} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{building.name}</h3>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBuilding(building.id)}
                          className="text-destructive hover:text-destructive h-7 w-7 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {buildingFlats.length} flat{buildingFlats.length !== 1 ? 's' : ''}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openFlatDialog(null, building.id)}
                        className="w-full flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Flat
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Flats Section */}
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            All Flats/Houses ({allFlats.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allFlats.length === 0 ? (
            <div className="text-center py-8">
              <Home className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-lg font-semibold mb-1">No Flats</p>
              <p className="text-muted-foreground text-sm">Add buildings first, then add flats.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {allFlats.map((flat) => (
                <Card key={flat.id} className="border shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{getBuildingName(flat.building_id)} - Flat {flat.flat_number}</p>
                        {flat.phone && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {flat.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openFlatDialog(flat)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteFlat(flat.id)}
                          className="text-destructive hover:text-destructive h-7 w-7 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add Building Dialog */}
      <Dialog open={showAddBuildingDialog} onOpenChange={setShowAddBuildingDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Building</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Building Name *</Label>
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
            <Button onClick={handleAddBuilding} className="gradient-primary text-white border-0">
              Add Building
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Flat Dialog */}
      <Dialog open={showFlatDialog} onOpenChange={setShowFlatDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingFlat ? 'Edit Flat' : 'Add New Flat'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Building *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={flatForm.building_id}
                onChange={(e) => setFlatForm({ ...flatForm, building_id: e.target.value })}
                disabled={!!editingFlat}
              >
                <option value="">Select building</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Flat/House Number *</Label>
              <Input
                placeholder="e.g., 101, A-201, House 5"
                value={flatForm.flat_number}
                onChange={(e) => setFlatForm({ ...flatForm, flat_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number (Optional)</Label>
              <Input
                placeholder="Enter phone number"
                value={flatForm.phone}
                onChange={(e) => setFlatForm({ ...flatForm, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFlatDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFlat} className="gradient-primary text-white border-0">
              {editingFlat ? 'Update' : 'Add Flat'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagement;
