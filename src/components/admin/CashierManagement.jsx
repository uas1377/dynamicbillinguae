import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const CashierManagement = () => {
  const [cashiers, setCashiers] = useState([]);
  const [editingCashier, setEditingCashier] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });

  useEffect(() => {
    loadCashiers();
  }, []);

  const loadCashiers = () => {
    const loadedCashiers = JSON.parse(localStorage.getItem('cashiers') || '[{"id":"default","username":"aaa","password":"aaa","createdAt":"2024-01-01T00:00:00.000Z"}]');
    setCashiers(loadedCashiers);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.username.trim()) {
      toast.error('Username is required');
      return;
    }
    
    if (!formData.password.trim()) {
      toast.error('Password is required');
      return;
    }

    const updatedCashiers = [...cashiers];
    
    // Check if username already exists (excluding current editing cashier)
    const existingCashier = updatedCashiers.find(c => 
      c.username === formData.username.trim() && 
      (!editingCashier || c.id !== editingCashier.id)
    );
    
    if (existingCashier) {
      toast.error('Username already exists');
      return;
    }

    const cashierData = {
      username: formData.username.trim(),
      password: formData.password.trim(),
    };

    if (editingCashier) {
      const index = updatedCashiers.findIndex(c => c.id === editingCashier.id);
      updatedCashiers[index] = { ...editingCashier, ...cashierData };
      toast.success('Cashier updated successfully');
    } else {
      const newCashier = {
        id: Date.now().toString(),
        ...cashierData,
        createdAt: new Date().toISOString()
      };
      updatedCashiers.push(newCashier);
      toast.success('Cashier added successfully');
    }

    localStorage.setItem('cashiers', JSON.stringify(updatedCashiers));
    setCashiers(updatedCashiers);
    closeDialog();
  };

  const openDialog = (cashier = null) => {
    setEditingCashier(cashier);
    setFormData({
      username: cashier?.username || '',
      password: cashier?.password || ''
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingCashier(null);
    setFormData({ username: '', password: '' });
  };

  const deleteCashier = (cashierId) => {
    if (cashiers.length <= 1) {
      toast.error('Cannot delete the last cashier. At least one cashier must remain.');
      return;
    }
    
    const updatedCashiers = cashiers.filter(c => c.id !== cashierId);
    localStorage.setItem('cashiers', JSON.stringify(updatedCashiers));
    setCashiers(updatedCashiers);
    toast.success('Cashier deleted successfully');
  };

  return (
    <div className="space-y-6">
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Cashier Management ({cashiers.length} cashiers)
          </CardTitle>
          <Button onClick={() => openDialog()} className="gradient-primary text-white border-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Cashier
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {cashiers.map((cashier) => (
              <Card key={cashier.id} className="border shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{cashier.username}</h3>
                      <p className="text-sm text-muted-foreground">
                        Created: {new Date(cashier.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDialog(cashier)}
                        className="flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteCashier(cashier.id)}
                        disabled={cashiers.length <= 1}
                        className="flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                  
                  {cashiers.length <= 1 && (
                    <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
                      <AlertTriangle className="w-4 h-4" />
                      This is the last cashier and cannot be deleted.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="gradient-card border-0">
          <DialogHeader>
            <DialogTitle>
              {editingCashier ? 'Edit Cashier' : 'Add New Cashier'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            
            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary text-white border-0">
                {editingCashier ? 'Update Cashier' : 'Add Cashier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashierManagement;