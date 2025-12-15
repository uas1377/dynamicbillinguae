import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Building2, Home, Plus, Edit, Trash2, Phone, Search, FileText, ChevronDown, ChevronRight, User } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { supabase } from "@/integrations/supabase/client";
import {
  getStoredBuildings,
  getStoredFlats,
  addBuildingToStorage,
  addFlatToStorage,
  updateFlatInStorage,
  setStoredBuildings,
  setStoredFlats,
} from "@/utils/buildingFlatStorage";

const CustomerManagement = () => {
  const [buildings, setBuildings] = useState([]);
  const [allFlats, setAllFlats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBuildings, setExpandedBuildings] = useState({});
  
  // Invoice viewing
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [flatInvoices, setFlatInvoices] = useState([]);
  const [showInvoicesDialog, setShowInvoicesDialog] = useState(false);
  
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
    
    // Expand all buildings by default
    const expanded = {};
    storedBuildings.forEach(b => { expanded[b.id] = true; });
    setExpandedBuildings(expanded);
  };

  const toggleBuilding = (buildingId) => {
    setExpandedBuildings(prev => ({
      ...prev,
      [buildingId]: !prev[buildingId]
    }));
  };

  const handleAddBuilding = () => {
    if (!newBuildingName.trim()) {
      toast.error('Building name is required');
      return;
    }

    const building = addBuildingToStorage(newBuildingName.trim());
    setBuildings([...buildings, building]);
    setExpandedBuildings(prev => ({ ...prev, [building.id]: true }));
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
        updateFlatInStorage(flat.id, { phone: flatForm.phone.trim() });
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

  const viewFlatInvoices = async (flat) => {
    setSelectedFlat(flat);
    const building = buildings.find(b => b.id === flat.building_id);
    const customerName = `${building?.name || ''}, Flat ${flat.flat_number}`;
    
    try {
      // Try to find invoices by customer_name or user_id in notes
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .or(`customer_name.ilike.%${flat.flat_number}%,customer_phone.eq.${flat.user_id}`)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error loading invoices:', error);
        setFlatInvoices([]);
      } else {
        // Filter more precisely
        const filtered = (data || []).filter(inv => 
          inv.customer_name?.includes(flat.flat_number) || 
          inv.customer_phone === flat.user_id
        );
        setFlatInvoices(filtered);
      }
    } catch (err) {
      console.error('Failed to load invoices:', err);
      setFlatInvoices([]);
    }
    
    setShowInvoicesDialog(true);
  };

  const getBuildingName = (buildingId) => {
    return buildings.find(b => b.id === buildingId)?.name || 'Unknown';
  };

  // Filter buildings and flats based on search query
  const filteredBuildings = buildings.filter(building => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    
    // Match building name
    if (building.name.toLowerCase().includes(query)) return true;
    
    // Match any flat in this building
    const buildingFlats = allFlats.filter(f => f.building_id === building.id);
    return buildingFlats.some(flat => 
      flat.flat_number.toLowerCase().includes(query) ||
      flat.user_id?.toLowerCase().includes(query)
    );
  });

  const getFilteredFlats = (buildingId) => {
    const buildingFlats = allFlats.filter(f => f.building_id === buildingId);
    if (!searchQuery.trim()) return buildingFlats;
    
    const query = searchQuery.toLowerCase();
    return buildingFlats.filter(flat =>
      flat.flat_number.toLowerCase().includes(query) ||
      flat.user_id?.toLowerCase().includes(query) ||
      getBuildingName(flat.building_id).toLowerCase().includes(query)
    );
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by building name, flat number, or user ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Buildings with Flats - Hierarchical View */}
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Buildings & Flats ({buildings.length} buildings, {allFlats.length} flats)
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
          {filteredBuildings.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-lg font-semibold mb-1">No Buildings Found</p>
              <p className="text-muted-foreground text-sm">
                {searchQuery ? 'No results match your search.' : 'Add your first building to get started.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBuildings.map((building) => {
                const buildingFlats = getFilteredFlats(building.id);
                const isExpanded = expandedBuildings[building.id];
                
                return (
                  <Card key={building.id} className="border shadow-sm overflow-hidden">
                    {/* Building Header */}
                    <div 
                      className="p-3 bg-muted/30 flex items-center justify-between cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => toggleBuilding(building.id)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <Building2 className="w-4 h-4 text-primary" />
                        <h3 className="font-semibold">{building.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          ({allFlats.filter(f => f.building_id === building.id).length} flats)
                        </span>
                      </div>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openFlatDialog(null, building.id)}
                          className="h-7 text-xs flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" />
                          Add Flat
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteBuilding(building.id)}
                          className="text-destructive hover:text-destructive h-7 w-7 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Flats List */}
                    {isExpanded && (
                      <div className="p-3 space-y-2">
                        {buildingFlats.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-2">
                            No flats in this building
                          </p>
                        ) : (
                          buildingFlats.map((flat) => (
                            <div 
                              key={flat.id} 
                              className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/20 transition-colors"
                            >
                              <div 
                                className="flex-1 cursor-pointer"
                                onClick={() => viewFlatInvoices(flat)}
                              >
                                <div className="flex items-center gap-2">
                                  <Home className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium">Flat {flat.flat_number}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    ID: <span className="font-mono font-semibold text-primary">{flat.user_id || 'N/A'}</span>
                                  </span>
                                  {flat.phone && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {flat.phone}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => viewFlatInvoices(flat)}
                                  className="h-7 w-7 p-0"
                                  title="View Invoices"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
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
                          ))
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
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
            {editingFlat && editingFlat.user_id && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <Label className="text-xs text-muted-foreground">Customer Login ID</Label>
                <p className="font-mono font-bold text-primary text-lg">{editingFlat.user_id}</p>
              </div>
            )}
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

      {/* Invoices Dialog */}
      <Dialog open={showInvoicesDialog} onOpenChange={setShowInvoicesDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Invoices - {selectedFlat && `${getBuildingName(selectedFlat.building_id)}, Flat ${selectedFlat.flat_number}`}
            </DialogTitle>
            {selectedFlat && (
              <p className="text-sm text-muted-foreground">
                Customer ID: <span className="font-mono font-semibold text-primary">{selectedFlat.user_id}</span>
              </p>
            )}
          </DialogHeader>
          <div className="space-y-3">
            {flatInvoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-lg font-semibold mb-1">No Invoices</p>
                <p className="text-muted-foreground text-sm">No invoices found for this flat.</p>
              </div>
            ) : (
              flatInvoices.map((invoice) => (
                <Card key={invoice.id} className="border shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">#{invoice.invoice_number}</span>
                      <span className={`text-xs px-2 py-1 rounded ${invoice.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {invoice.status?.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Date: {new Date(invoice.created_at).toLocaleDateString()}</p>
                      <p className="font-semibold text-foreground">Total: {formatCurrency(invoice.grand_total)}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagement;