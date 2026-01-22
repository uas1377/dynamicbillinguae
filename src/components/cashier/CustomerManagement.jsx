import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Building2, Home, Plus, Edit, Trash2, Search, 
  FileText, ChevronDown, ChevronRight, ArrowLeft, 
  Printer, Image as ImageIcon, Calendar, CheckCircle2, User, QrCode
} from "lucide-react";
import QRCodeButton from "@/components/ui/QRCodeButton";
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
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', description: '', onConfirm: null });
  
  // Log whenever confirmDialog changes
  useEffect(() => {
    console.log('🔔 confirmDialog state changed:', confirmDialog);
  }, [confirmDialog]);
  
  // Flag to track if switch change is user-initiated
  const isUserActionRef = React.useRef(false);
  
  // Flag to prevent clicks during view transitions
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Track last click time to prevent double clicks
  const lastClickTimeRef = React.useRef(0);

  // Get current cashier info
  const getCurrentCashier = () => {
    try {
      const user = JSON.parse(sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '{}');
      return user?.username || user?.name || "Unknown Cashier";
    } catch {
      return "Unknown Cashier";
    }
  };

  useEffect(() => { 
    loadData(); 
    setBusinessSettings(getBusinessSettings());
  }, []);

  const loadData = () => {
    setBuildings(getStoredBuildings());
    setAllFlats(getStoredFlats());
  };

  // Toggle single invoice payment status with confirmation
  const requestToggleInvoiceStatus = (invoice, e) => {
    if (e) e.stopPropagation();
    const newStatus = invoice.status === 'paid' ? 'unpaid' : 'paid';
    
    // Force immediate state update to show dialog right away
    flushSync(() => {
      setConfirmDialog({
        open: true,
        title: `Mark Invoice as ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}?`,
        description: `Are you sure you want to mark invoice #${invoice.invoice_number} as ${newStatus}?`,
        onConfirm: () => executeToggleInvoiceStatus(invoice, newStatus)
      });
    });
  };
  
  const executeToggleInvoiceStatus = (invoice, newStatus) => {
    const cashierName = getCurrentCashier();
    
    const updates = {
      status: newStatus,
      paid_by_cashier: newStatus === 'paid' ? cashierName : null,
      paid_at: newStatus === 'paid' ? new Date().toISOString() : null
    };
    
    // Update in storage
    updateInvoiceInStorage(invoice.id, updates);
    
    // Create updated invoice object
    const updatedInvoice = { ...invoice, ...updates };
    
    // Refresh flat invoices from storage
    const allUpdatedInvoices = getStoredInvoices().filter(inv => inv.flat_id === selectedFlat.id);
    setFlatInvoices(allUpdatedInvoices);
    
    // Update selectedMonth if in invoices view or months view
    if (selectedMonth) {
      const date = new Date(invoice.created_at || invoice.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const updatedMonthInvoices = allUpdatedInvoices.filter(inv => {
        const invDate = new Date(inv.created_at || inv.date);
        return `${invDate.getFullYear()}-${invDate.getMonth()}` === key;
      });
      setSelectedMonth({
        ...selectedMonth,
        invoices: updatedMonthInvoices,
        paid: updatedMonthInvoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.grand_total, 0),
        unpaid: updatedMonthInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.grand_total, 0)
      });
    }
    
    // Update selectedInvoice if in detail view - CRITICAL FIX
    if (selectedInvoice && selectedInvoice.id === invoice.id) {
      setSelectedInvoice(updatedInvoice);
    }
    
    toast.success(`Invoice marked as ${newStatus}`);
    setConfirmDialog({ open: false, title: '', description: '', onConfirm: null });
  };

  // Toggle all invoices in a month with confirmation
  const requestToggleMonthStatus = (group, targetStatus) => {
    console.log(`[${new Date().toISOString()}] requestToggleMonthStatus called`, { group: group.label, targetStatus });
    
    // Force immediate state update to show dialog right away
    flushSync(() => {
      setConfirmDialog({
        open: true,
        title: `Mark All Invoices as ${targetStatus.charAt(0).toUpperCase() + targetStatus.slice(1)}?`,
        description: `Are you sure you want to mark all ${group.invoices.length} invoices in ${group.label} as ${targetStatus}?`,
        onConfirm: () => executeToggleMonthStatus(group, targetStatus)
      });
    });
  };
  
  const executeToggleMonthStatus = (group, targetStatus) => {
    const cashierName = getCurrentCashier();
    
    // Update all invoices in the group
    group.invoices.forEach(inv => {
      const updates = {
        status: targetStatus,
        paid_by_cashier: targetStatus === 'paid' ? cashierName : null,
        paid_at: targetStatus === 'paid' ? new Date().toISOString() : null
      };
      updateInvoiceInStorage(inv.id, updates);
    });
    
    // Refresh flat invoices from storage
    const freshInvoices = getStoredInvoices().filter(inv => inv.flat_id === selectedFlat.id);
    setFlatInvoices(freshInvoices);
    
    toast.success(`All invoices marked as ${targetStatus}`);
    setConfirmDialog({ open: false, title: '', description: '', onConfirm: null });
  };

  const enterFlatView = (flat) => {
    setSelectedFlat(flat);
    const invoices = getStoredInvoices().filter(inv => inv.flat_id === flat.id);
    setFlatInvoices(invoices);
    setViewMode('months');
  };

  const getMonthlyGroups = () => {
    const grouped = {};
    flatInvoices.forEach(inv => {
      const date = new Date(inv.created_at || inv.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!grouped[key]) {
        grouped[key] = {
          key,
          label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          invoices: [],
          paid: 0,
          unpaid: 0
        };
      }
      grouped[key].invoices.push(inv);
      if (inv.status === 'paid') {
        grouped[key].paid += inv.grand_total;
      } else {
        grouped[key].unpaid += inv.grand_total;
      }
    });
    return Object.values(grouped).sort((a, b) => b.key.localeCompare(a.key));
  };

  const printMonthlySummary = async (group) => {
    const flatInfo = selectedFlat;
    const buildingInfo = buildings.find(b => b.id === flatInfo?.building_id);
    
    const summaryData = {
      invoice_number: `MONTHLY-${group.key}`,
      created_at: new Date().toISOString(),
      customer_name: `Flat ${flatInfo?.flat_number}`,
      customer_phone: flatInfo?.user_id || '',
      building_name: buildingInfo?.name || '',
      flat_number: flatInfo?.flat_number || '',
      items: group.invoices.map(inv => ({
        name: `Invoice ${inv.invoice_number}`,
        sku: new Date(inv.created_at).toLocaleDateString(),
        quantity: 1,
        amount: inv.grand_total
      })),
      sub_total: group.paid + group.unpaid,
      tax_rate: 0,
      tax_amount: 0,
      grand_total: group.paid + group.unpaid,
      amount_received: group.paid,
      change_amount: 0,
      status: group.unpaid > 0 ? 'unpaid' : 'paid',
      cashier_name: getCurrentCashier(),
      notes: `Monthly Summary for ${group.label}
Total Invoices: ${group.invoices.length}
Paid: ${formatCurrency(group.paid, businessSettings.currencyCode || 'currency')}
Unpaid: ${formatCurrency(group.unpaid, businessSettings.currencyCode || 'currency')}`
    };

    try {
      await generateThermalPrint(summaryData, businessSettings);
      toast.success('Monthly summary sent to printer');
    } catch (error) {
      toast.error('Print failed: ' + error.message);
    }
  };

  const handleSaveDetailImage = async () => {
    try {
      await saveAsImage(selectedInvoice, businessSettings);
      toast.success('Invoice saved as image');
    } catch (error) {
      toast.error('Save failed: ' + error.message);
    }
  };

  const handleEditBuilding = (building) => {
    setEditingBuilding(building);
    setBuildingName(building.name);
    setShowBuildingDialog(true);
  };

  const saveBuilding = () => {
    if (!buildingName.trim()) {
      toast.error('Building name is required');
      return;
    }
    
    if (editingBuilding) {
      updateBuildingInStorage(editingBuilding.id, { name: buildingName.trim() });
      toast.success('Building updated');
    } else {
      addBuildingToStorage(buildingName.trim());
      toast.success('Building added');
    }
    
    loadData();
    setShowBuildingDialog(false);
    setBuildingName('');
    setEditingBuilding(null);
  };

  const handleEditFlat = (flat) => {
    setEditingFlat(flat);
    setFlatNumber(flat.flat_number);
    setActiveBuildingId(flat.building_id);
    setShowFlatDialog(true);
  };

  const saveFlat = () => {
    if (!flatNumber.trim()) {
      toast.error('Flat number is required');
      return;
    }
    
    if (editingFlat) {
      updateFlatInStorage(editingFlat.id, { flat_number: flatNumber.trim() });
      toast.success('Flat updated');
    } else {
      if (!activeBuildingId) {
        toast.error('Please select a building');
        return;
      }
      addFlatToStorage(activeBuildingId, flatNumber.trim());
      toast.success('Flat added');
    }
    
    loadData();
    setShowFlatDialog(false);
    setFlatNumber('');
    setEditingFlat(null);
    setActiveBuildingId(null);
  };

  // Render content based on view mode
  const renderContent = () => {  // --- DETAIL VIEW (Thermal Receipt Style) ---
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
                onCheckedChange={(checked) => {
                  requestToggleInvoiceStatus(selectedInvoice);
                }}
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
               {businessSettings.logo && <img src={businessSettings.logo} alt="Logo" className="w-16 h-16 object-contain mx-auto mb-2" />}
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
                    <td className="text-right">{formatCurrency(item.amount * item.quantity, businessSettings.currencyCode || 'currency')}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-black border-dashed pt-2 space-y-1">
              <div className="flex justify-between font-bold"><span>TOTAL:</span> <span>{formatCurrency(selectedInvoice.grand_total, businessSettings.currencyCode || 'currency')}</span></div>
              <div className="flex justify-between text-[10px]"><span>CASHIER:</span> <span>{selectedInvoice.cashier_name || 'Admin'}</span></div>
              {selectedInvoice.status === 'paid' && (
                <div className="flex justify-between text-[10px] font-bold text-green-700">
                  <span>RECEIVED BY:</span> 
                  <span>{selectedInvoice.paid_by_cashier || selectedInvoice.cashier_name || 'Admin'}</span>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 no-print">
              <Button size="sm" className="h-8" onClick={() => printHistoricalReceipt(selectedInvoice)}><Printer className="mr-1 h-3 w-3"/> Print</Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => handleSaveDetailImage()}><ImageIcon className="mr-1 h-3 w-3"/> Save</Button>
              <QRCodeButton amount={selectedInvoice.grand_total} size="sm" className="h-8" />
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

    const handleBackClick = () => {
      // Refresh invoices from storage
      const freshInvoices = getStoredInvoices().filter(inv => inv.flat_id === selectedFlat.id);
      setFlatInvoices(freshInvoices);
      setViewMode('months');
    };

    return (
      <div className="space-y-4 animate-in slide-in-from-right">
        <Button variant="ghost" onClick={handleBackClick}><ArrowLeft className="mr-2 h-4 w-4"/> Back</Button>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-xl font-bold">{selectedMonth.label}</h2>
            <p className="text-sm text-destructive font-semibold">Month Unpaid: {formatCurrency(selectedMonth.unpaid, businessSettings.currencyCode || 'currency')}</p>
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-md">
            {['all', 'paid', 'unpaid'].map(f => (
              <Button key={f} size="sm" variant={invoiceFilter === f ? 'default' : 'ghost'} className="capitalize h-7 px-2" onClick={() => setInvoiceFilter(f)}>{f}</Button>
            ))}
          </div>
        </div>
        {filteredInvoices.map(inv => (
          <Card key={inv.invoice_number} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => { setSelectedInvoice(inv); setViewMode('detail'); }}>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">{inv.invoice_number}</p>
                  <p className="text-xs opacity-60">{new Date(inv.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(inv.grand_total, businessSettings.currencyCode || 'currency')}</p>
                  <Badge variant={inv.status === 'paid' ? 'success' : 'destructive'} className="text-[10px]">{inv.status?.toUpperCase()}</Badge>
                </div>
              </div>
              {inv.status === 'paid' && inv.paid_by_cashier && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
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
    console.log('Rendering months view');
    const totalUnpaid = flatInvoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.grand_total, 0);
    const monthlyGroups = getMonthlyGroups();
    
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => {
          console.log(`[${new Date().toISOString()}] Back to Flats clicked`);
          // Clear any pending confirmation dialogs
          setConfirmDialog({ open: false, title: '', description: '', onConfirm: null });
          setIsTransitioning(true);
          setViewMode('list');
          setTimeout(() => setIsTransitioning(false), 100);
        }}><ArrowLeft className="mr-2 h-4 w-4"/> Back to Flats</Button>
        <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/20 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold">Flat {selectedFlat.flat_number} History</h2>
            <p className="text-sm">Total Pending Balance</p>
          </div>
          <p className="text-2xl font-black text-destructive">{formatCurrency(totalUnpaid, businessSettings.currencyCode || 'currency')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {monthlyGroups.map(group => {
            const allPaid = group.invoices.every(inv => inv.status === 'paid');
            
            return (
              <Card key={group.key} className="hover:border-primary border-2">
                <CardHeader className="p-4 pb-2 cursor-pointer" onClick={() => { setSelectedMonth(group); setViewMode('invoices'); setInvoiceFilter('all'); }}>
                  <CardTitle className="text-md flex items-center gap-2"><Calendar className="h-4 w-4"/> {group.label}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex justify-between text-xs cursor-pointer" onClick={() => { setSelectedMonth(group); setViewMode('invoices'); setInvoiceFilter('all'); }}>
                    <span className="text-green-600 font-bold">Paid: {formatCurrency(group.paid, businessSettings.currencyCode || 'currency')}</span>
                    <span className="text-destructive font-bold">Unpaid: {formatCurrency(group.unpaid, businessSettings.currencyCode || 'currency')}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Mark all as {allPaid ? 'Unpaid' : 'Paid'}</span>
                    <div
                      onMouseDown={(e) => {
                        const now = Date.now();
                        const timeSinceLastClick = now - lastClickTimeRef.current;
                        
                        console.log(`[${new Date().toISOString()}] Toggle onMouseDown fired`, {
                          group: group.label,
                          allPaid,
                          targetStatus: allPaid ? 'unpaid' : 'paid',
                          eventType: e.type,
                          isTrusted: e.isTrusted,
                          buttons: e.buttons,
                          clientX: e.clientX,
                          clientY: e.clientY,
                          timeSinceLastClick: `${timeSinceLastClick}ms`
                        });
                        
                        // Prevent clicks within 1 second
                        if (timeSinceLastClick < 1000) {
                          console.warn('⚠️ CLICK BLOCKED - Too soon after previous click (debounced)');
                          e.preventDefault();
                          e.stopPropagation();
                          return;
                        }
                        
                        // Log a clear warning
                        console.warn('⚠️ TOGGLE WAS CLICKED AT POSITION:', e.clientX, e.clientY);
                        
                        // Check if this is a real user click
                        if (!e.isTrusted) {
                          console.log('IGNORED - Not a trusted user event');
                          return;
                        }
                        
                        if (isTransitioning) {
                          console.log('IGNORED - Currently transitioning');
                          return;
                        }
                        
                        // Update last click time
                        lastClickTimeRef.current = now;
                        
                        e.preventDefault();
                        e.stopPropagation();
                        requestToggleMonthStatus(group, allPaid ? 'unpaid' : 'paid');
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full cursor-pointer transition-colors ${
                        allPaid ? 'bg-primary' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          allPaid ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full" 
                      onClick={(e) => { e.stopPropagation(); printMonthlySummary(group); }}
                    >
                      <Printer className="h-3 w-3 mr-1"/> Print
                    </Button>
                    <QRCodeButton amount={group.paid + group.unpaid} size="sm" className="w-full" />
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
  }; // End of renderContent

  // Main return - AlertDialog is always rendered
  return (
    <>
      {renderContent()}
      
      {/* Confirmation Dialog - Always rendered */}
      <AlertDialog 
        key={confirmDialog.open ? 'open' : 'closed'} 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, title: '', description: '', onConfirm: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CustomerManagement;
