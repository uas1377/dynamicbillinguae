import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Plus, Edit, Trash2, AlertTriangle, QrCode, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from 'qrcode.react';
import * as htmlToImage from 'html-to-image';

const CashierManagement = () => {
  const [cashiers, setCashiers] = useState([]);
  const [editingCashier, setEditingCashier] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // QR Modal States
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedQRUser, setSelectedQRUser] = useState(null);
  const qrRef = useRef(null);

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
    if (!formData.username.trim() || !formData.password.trim()) {
      toast.error('All fields are required');
      return;
    }

    const updatedCashiers = [...cashiers];
    const existingCashier = updatedCashiers.find(c => 
      c.username === formData.username.trim() && (!editingCashier || c.id !== editingCashier.id)
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
      updatedCashiers.push({
        id: Date.now().toString(),
        ...cashierData,
        createdAt: new Date().toISOString()
      });
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

  // --- QR Badge Logic ---
  const openQRModal = (cashier) => {
    setSelectedQRUser(cashier);
    setIsQRModalOpen(true);
  };

  const saveQRAsImage = async () => {
    if (!qrRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(qrRef.current, { 
        backgroundColor: 'white',
        pixelRatio: 3,
        filter: (node) => {
          // Exclude Vite's error overlay elements
          if (node.tagName === 'VITE-ERROR-OVERLAY') return false;
          return true;
        }
      });
      const link = document.createElement('a');
      link.download = `Badge-${selectedQRUser.username}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Badge saved to gallery");
    } catch (err) {
      console.error('Image save error:', err);
      toast.error("Failed to save image");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="gradient-card shadow-soft border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Cashier Management ({cashiers.length})
          </CardTitle>
          <Button onClick={() => openDialog()} className="gradient-primary text-white border-0 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Cashier
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {cashiers.map((cashier) => (
              <Card key={cashier.id} className="border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{cashier.username}</h3>
                    <p className="text-xs text-muted-foreground uppercase font-medium">
                      Status: Active • Since {new Date(cashier.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openQRModal(cashier)}
                      className="border-primary text-primary hover:bg-primary/5 gap-1"
                    >
                      <QrCode className="w-4 h-4" />
                      QR Badge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDialog(cashier)}
                      className="gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={cashiers.length <= 1}
                      onClick={() => {
                        const updated = cashiers.filter(c => c.id !== cashier.id);
                        localStorage.setItem('cashiers', JSON.stringify(updated));
                        setCashiers(updated);
                        toast.success('Cashier removed');
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ADD/EDIT DIALOG */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="gradient-card border-0">
          <DialogHeader>
            <DialogTitle>{editingCashier ? 'Update Credentials' : 'Create Staff Account'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
            </div>
            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" className="gradient-primary">Save Changes</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR BADGE MODAL */}
      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="sm:max-w-[350px] border-2 border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-center">Cashier Login Badge</DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center gap-6 py-4">
            {/* The Badge Visual */}
            <div 
              ref={qrRef}
              className="p-6 bg-white rounded-xl shadow-xl flex flex-col items-center text-center border-4 border-slate-100"
            >
              <div className="mb-4 bg-primary text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                Official Staff ID
              </div>
              
              <QRCodeSVG 
                value={`<id>${selectedQRUser?.username}<pass>${selectedQRUser?.password}`} 
                size={160}
                level="H"
                includeMargin={true}
              />
              
              <h2 className="mt-4 text-xl font-black text-slate-900 tracking-tight">
                {selectedQRUser?.username.toUpperCase()}
              </h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Scan at Login Panel</p>
            </div>

            <div className="grid grid-cols-2 gap-3 w-full">
              <Button variant="outline" className="gap-2" onClick={saveQRAsImage}>
                <Download className="w-4 h-4" /> Save
              </Button>
              <Button className="gradient-primary gap-2" onClick={() => window.print()}>
                <Printer className="w-4 h-4" /> Print
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CashierManagement;
