import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Building2, Home, Plus, Edit, Trash2, Search, 
  FileText, ChevronDown, ChevronRight, ArrowLeft, 
  Printer, Image as ImageIcon, Calendar, CheckCircle2, User 
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatCurrency";
import { generateThermalPrint, saveAsImage } from "@/utils/thermalPrintGenerator";
import { printHistoricalReceipt } from "@/utils/receiptService";
import {
  getStoredBuildings,
  getStoredFlats,
  addBuildingToStorage,
  updateBuildingInStorage,
  addFlatToStorage,
  updateFlatInStorage,
  deleteBuildingFromStorage,
  deleteFlatFromStorage
} from "@/utils/buildingFlatStorage";
import { getStoredInvoices, updateInvoiceInStorage, getBusinessSettings } from "@/utils/localStorageData";

const CustomerManagement = () => {
  const [buildings, setBuildings] = useState([]);
  const [allFlats, setAllFlats] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBuildings, setExpandedBuildings] = useState({});
  const [businessSettings, setBusinessSettings] = useState({});
  
  // Navigation & Filtering
  const [viewMode, setViewMode] = useState('list'); // 'list', 'months', 'invoices', 'detail'
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [flatInvoices, setFlatInvoices] = useState([]);
  const [invoiceFilter, setInvoiceFilter] = useState('all'); // 'all', 'paid', 'unpaid'

  // Dialog States
  const [showBuildingDialog, setShowBuildingDialog] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [buildingName, setBuildingName] = useState('');
  const [showFlatDialog, setShowFlatDialog] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [flatNumber, setFlatNumber] = useState('');
  const [activeBuildingId, setActiveBuildingId] = useState(null);

  // Get current cashier info
  const getCurrentCashier = () => {
    const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
    return user.cashierId || user.userId || 'Admin';
  };

  useEffect(() => { 
    loadData(); 
    setBusinessSettings(getBusinessSettings());
  }, []);

  const loadData = () => {
    setBuildings(getStoredBuildings());
    setAllFlats(getStoredFlats());
  };

  // Toggle single invoice payment status
  const toggleInvoiceStatus = (invoice, e) => {
    if (e) e.stopPropagation();
    const newStatus = invoice.status === 'paid' ? 'unpaid' : 'paid';
    const cashierName = getCurrentCashier();
    
    const updates = {
      status: newStatus,
      paid_by_cashier: newStatus === 'paid' ? cashierName : null,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : null
    };
    
    updateInvoiceInStorage(invoice.id, updates);
    
    // Refresh flat invoices
    const updatedInvoices = getStoredInvoices().filter(inv => inv.flat_id === selectedFlat.id);
    setFlatInvoices(updatedInvoices);
    
    // Update selectedMonth if in invoices view
    if (selectedMonth) {
      const date = new Date(invoice.created_at || invoice.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const updatedMonthInvoices = updatedInvoices.filter(inv => {
        const invDate = new Date(inv.created_at || inv.date);
        return `${invDate.getFullYear()}-${invDate.getMonth()}` === key;
      });
      setSelectedMonth(prev => ({
        ...prev,
        invoices: updatedMonthInvoices,
        paid: updatedMonthInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.grand_total, 0),
        unpaid: updatedMonthInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.grand_total, 0)
      }));
    }
    
    // Update selectedInvoice if in detail view
    if (selectedInvoice && selectedInvoice.id === invoice.id) {
      setSelectedInvoice({ ...invoice, ...updates });
    }
    
    toast.success(`Invoice marked as ${newStatus}`);
  };

  // Toggle all invoices in a month
  const toggleMonthStatus = (group, targetStatus) => {
    const cashierName = getCurrentCashier();
    
    group.invoices.forEach(inv => {
      const updates = {
        status: targetStatus,
        paid_by_cashier: targetStatus === 'paid' ? cashierName : null,
        paid_at: targetStatus === 'paid' ? new Date().toISOString() : null
      };
      updateInvoiceInStorage(inv.id, updates);
    });
    
    // Refresh flat invoices
    const updatedInvoices = getStoredInvoices().filter(inv => inv.flat_id === selectedFlat.id);
    setFlatInvoices(updatedInvoices);
    
    toast.success(`All invoices in ${group.label} marked as ${targetStatus}`);
  };

  const handleEditBuilding = (b) => {
    setEditingBuilding(b);
    setBuildingName(b.name);
    setShowBuildingDialog(true);
  };

  const saveBuilding = () => {
    if (!buildingName.trim()) return;
    if (editingBuilding) {
      updateBuildingInStorage(editingBuilding.id, buildingName);
      toast.success("Building updated");
    } else {
      addBuildingToStorage(buildingName);
      toast.success("Building added");
    }
    loadData();
    setShowBuildingDialog(false);
  };

  const handleEditFlat = (f) => {
    setEditingFlat(f);
    setFlatNumber(f.flat_number);
    setActiveBuildingId(f.building_id);
    setShowFlatDialog(true);
  };

  const saveFlat = () => {
    if (!flatNumber.trim()) return;
    if (editingFlat) {
      updateFlatInStorage(editingFlat.id, { flat_number: flatNumber });
      toast.success("Flat updated");
    } else {
      addFlatToStorage(activeBuildingId, flatNumber);
      toast.success("Flat added");
    }
    loadData();
    setShowFlatDialog(false);
  };

  const enterFlatView = (flat) => {
    setSelectedFlat(flat);
    const invoices = getStoredInvoices().filter(inv => inv.flat_id === flat.id);
    setFlatInvoices(invoices);
    setViewMode('months');
  };

  const getMonthlyGroups = () => {
    const groups = {};
    flatInvoices.forEach(inv => {
      const date = new Date(inv.created_at || inv.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      if (!groups[key]) groups[key] = { label, paid: 0, unpaid: 0, invoices: [], key };
      if (inv.status === 'paid') groups[key].paid += inv.grand_total;
      else groups[key].unpaid += inv.grand_total;
      groups[key].invoices.push(inv);
    });
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  };

  // --- UPDATED: DETAIL VIEW (Thermal Receipt Style) ---
  if (viewMode === 'detail') {
    const flatInfo = allFlats.find(f => f.id === selectedInvoice.flat_id);
    const buildingInfo = buildings.find(b => b.id === selectedInvoice.building_id);

    return (
      <div className="space-y-4 animate-in slide-in-from-right">
        <Button variant="ghost" onClick={() => setViewMode('invoices')}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
        
        {/* Payment Status Toggle */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Payment Status:</span>
              <Badge variant={selectedInvoice.status === 'paid' ? 'default' : 'destructive'}>
                {selectedInvoice.status?.toUpperCase() || 'UNPAID'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Unpaid</span>
              <Switch 
                checked={selectedInvoice.status === 'paid'}
                onCheckedChange={() => toggleInvoiceStatus(selectedInvoice)}
              />
              <span className="text-sm text-muted-foreground">Paid</span>
            </div>
          </div>
          {selectedInvoice.status === 'paid' && selectedInvoice.paid_by_cashier && (
            <p className="text-xs text-muted-foreground mt-2">
              Received by: <span className="font-semibold">{selectedInvoice.paid_by_cashier}</span>
              {selectedInvoice.paid_at && ` on ${new Date(selectedInvoice.paid_at).toLocaleString()}`}
            </p>
          )}
        </Card>

        <Card id="receipt-content" className="max-w-[350px] mx-auto bg-white text-black font-mono shadow-md border-dashed">
          <CardContent className="p-4">
            <div className="text-center border-b border-black border-dashed pb-2 mb-2">
               <h2 className="font-bold text-lg uppercase">{businessSettings.name || 'RECEIPT'}</h2>
               <p className="text-[10px]">{businessSettings.address}</p>
            </div>
            
            <div className="text-[10px] space-y-0.5 mb-2">
              <div className="flex justify-between"><span>INV:</span> <span>{selectedInvoice.invoice_number}</span></div>
              <div className="flex justify-between"><span>DATE:</span> <span>{new Date(selectedInvoice.created_at).toLocaleString()}</span></div>
              <div className="flex justify-between"><span>BUILDING:</span> <span>{buildingInfo?.name}</span></div>
              <div className="flex justify-between"><span>FLAT:</span> <span>{selectedInvoice.customer_name}</span></div>
              <div className="flex justify-between font-bold"><span>CUST ID:</span> <span>{flatInfo?.user_id}</span></div>
            </div>

            <table className="w-full text-left text-[11px] mb-2 border-t border-black border-dashed pt-2">
              <thead>
                <tr className="border-b border-black">
                  <th className="py-1">ITEM</th>
                  <th className="text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-1">{item.name} x{item.quantity}</td>
                    <td className="text-right">{formatCurrency(item.amount * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-black border-dashed pt-2 space-y-1">
              <div className="flex justify-between font-bold"><span>TOTAL:</span> <span>{formatCurrency(selectedInvoice.grand_total)}</span></div>
              <div className="flex justify-between text-[10px]"><span>CASHIER:</span> <span>{selectedInvoice.cashier_name || 'Admin'}</span></div>
              {selectedInvoice.status === 'paid' && (
                <div className="flex justify-between text-[10px] font-bold text-green-700">
                  <span>RECEIVED BY:</span> 
                  <span>{selectedInvoice.paid_by_cashier || selectedInvoice.cashier_name || 'Admin'}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2 no-print">
              <Button size="sm" className="flex-1 h-8" onClick={() => printHistoricalReceipt(selectedInvoice)}><Printer className="mr-2 h-3 w-3"/> Thermal Print</Button>
              <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => saveAsImage('receipt-content')}><ImageIcon className="mr-2 h-3 w-3"/> Save Image</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. INVOICE LIST BY MONTH
  if (viewMode === 'invoices') {
    const filteredInvoices = selectedMonth.invoices.filter(inv => {
      if (invoiceFilter === 'paid') return inv.status === 'paid';
      if (invoiceFilter === 'unpaid') return inv.status !== 'paid';
      return true;
    });

    return (
      <div className="space-y-4 animate-in slide-in-from-right">
        <Button variant="ghost" onClick={() => setViewMode('months')}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold">{selectedMonth.label}</h2>
            <p className="text-sm text-destructive font-semibold">Month Unpaid: {formatCurrency(selectedMonth.unpaid)}</p>
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-md">
            {['all', 'paid', 'unpaid'].map(f => (
              <Button key={f} size="sm" variant={invoiceFilter === f ? 'default' : 'ghost'} className="capitalize h-7 px-2" onClick={() => setInvoiceFilter(f)}>{f}</Button>
            ))}
          </div>
        </div>
        {filteredInvoices.map(inv => (
          <Card key={inv.invoice_number} className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex justify-between items-center cursor-pointer" onClick={() => { setSelectedInvoice(inv); setViewMode('detail'); }}>
                <div>
                  <p className="font-bold">{inv.invoice_number}</p>
                  <p className="text-xs opacity-60">{new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(inv.grand_total)}</p>
                  <Badge variant={inv.status === 'paid' ? 'success' : 'destructive'} className="text-[10px]">{inv.status?.toUpperCase()}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-sm text-muted-foreground">Mark as {inv.status === 'paid' ? 'Unpaid' : 'Paid'}</span>
                <Switch 
                  checked={inv.status === 'paid'}
                  onCheckedChange={(e) => toggleInvoiceStatus(inv, e)}
                />
              </div>
              {inv.status === 'paid' && inv.paid_by_cashier && (
                <p className="text-xs text-muted-foreground mt-1">
                  Received by: {inv.paid_by_cashier}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // 3. MONTH SELECTION VIEW
  if (viewMode === 'months') {
    const totalUnpaid = flatInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.grand_total, 0);
    const monthlyGroups = getMonthlyGroups();
    
    return (
      <div className="space-y-4 animate-in slide-in-from-right">
        <Button variant="ghost" onClick={() => setViewMode('list')}><ArrowLeft className="mr-2 h-4 w-4"/> Back to Flats</Button>
        <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">Flat {selectedFlat.flat_number} History</h2>
            <p className="text-sm">Total Pending Balance</p>
          </div>
          <p className="text-2xl font-black text-destructive">{formatCurrency(totalUnpaid)}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {monthlyGroups.map(group => {
            const allPaid = group.invoices.every(inv => inv.status === 'paid');
            const hasUnpaid = group.invoices.some(inv => inv.status !== 'paid');
            
            return (
              <Card key={group.key} className="hover:border-primary border-2">
                <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => { setSelectedMonth(group); setViewMode('invoices'); setInvoiceFilter('all'); }}>
                  <CardTitle className="text-md flex items-center gap-2"><Calendar className="h-4 w-4"/> {group.label}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex justify-between text-xs cursor-pointer" onClick={() => { setSelectedMonth(group); setViewMode('invoices'); setInvoiceFilter('all'); }}>
                    <span className="text-green-600 font-bold">Paid: {formatCurrency(group.paid)}</span>
                    <span className="text-destructive font-bold">Unpaid: {formatCurrency(group.unpaid)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                    <span className="text-xs text-muted-foreground">Mark all as {allPaid ? 'Unpaid' : 'Paid'}</span>
                    <Switch 
                      checked={allPaid}
                      onCheckedChange={() => toggleMonthStatus(group, allPaid ? 'unpaid' : 'paid')}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // --- MAIN LIST VIEW ---
  const filteredBuildings = buildings.map(b => ({
    ...b,
    flats: allFlats.filter(f => {
      const matchSearch = 
        f.building_id === b.id && (
          f.flat_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (f.user_id && f.user_id.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      return matchSearch;
    })
  })).filter(b => b.flats.length > 0 || b.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search Flat or ID (e.g. A1B2)..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Button onClick={() => { setEditingBuilding(null); setBuildingName(''); setShowBuildingDialog(true); }}><Plus className="h-4 w-4 mr-2"/> Building</Button>
      </div>

      <div className="grid gap-3">
        {filteredBuildings.map(b => (
          <Card key={b.id} className="overflow-hidden border-l-4 border-l-primary">
            <CardHeader className="p-4 py-3 cursor-pointer bg-muted/20" onClick={() => setExpandedBuildings(p => ({...p, [b.id]: !p[b.id]}))}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold"><Building2 className="h-4 w-4 text-primary"/> {b.name}</div>
                <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditBuilding(b)}><Edit className="h-3 w-3"/></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if(confirm("Delete Building?")) { deleteBuildingFromStorage(b.id); loadData(); }}}><Trash2 className="h-3 w-3"/></Button>
                  {expandedBuildings[b.id] ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                </div>
              </div>
            </CardHeader>
            {expandedBuildings[b.id] && (
              <CardContent className="p-0 divide-y">
                {b.flats.map(f => (
                  <div key={f.id} className="p-3 px-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full"><Home className="h-4 w-4 text-primary"/></div>
                      <div>
                        <p className="font-bold">Flat {f.flat_number}</p>
                        <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 rounded">
                           <User className="h-2 w-2"/> ID: {f.user_id}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-8 text-primary border-primary/20 hover:bg-primary/10" onClick={() => enterFlatView(f)}><FileText className="h-3.5 w-3.5 mr-1"/> History</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditFlat(f)}><Edit className="h-3.5 w-3.5"/></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if(confirm("Delete Flat?")) { deleteFlatFromStorage(f.id); loadData(); }}}><Trash2 className="h-3.5 w-3.5"/></Button>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full rounded-none h-10 text-primary bg-primary/5 hover:bg-primary/10" onClick={() => { setActiveBuildingId(b.id); setEditingFlat(null); setFlatNumber(''); setShowFlatDialog(true); }}><Plus className="h-4 w-4 mr-2"/> Add Flat</Button>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Building Dialog */}
      <Dialog open={showBuildingDialog} onOpenChange={setShowBuildingDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingBuilding ? 'Rename Building' : 'Add New Building'}</DialogTitle></DialogHeader>
          <div className="py-2"><Label>Building Name</Label><Input value={buildingName} onChange={e => setBuildingName(e.target.value)} placeholder="e.g. Al Nakheel Tower" /></div>
          <DialogFooter><Button onClick={saveBuilding} className="w-full gradient-primary text-white border-0">Save Building</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flat Dialog */}
      <Dialog open={showFlatDialog} onOpenChange={setShowFlatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingFlat ? 'Edit Flat' : 'Add New Flat'}</DialogTitle></DialogHeader>
          <div className="py-2"><Label>Flat Number</Label><Input value={flatNumber} onChange={e => setFlatNumber(e.target.value)} placeholder="e.g. 101 or A-5" /></div>
          <DialogFooter><Button onClick={saveFlat} className="w-full gradient-primary text-white border-0">Save Flat</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerManagement;
