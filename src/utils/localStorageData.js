// Utility functions for storing all app data in localStorage
// App runs completely offline without any cloud database

const PRODUCTS_KEY = "productsData";
const INVOICES_KEY = "invoicesData";
const CUSTOMERS_KEY = "customersData";
const BUSINESS_SETTINGS_KEY = "businessSettings";

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : (typeof parsed === 'object' ? parsed : fallback);
  } catch {
    return fallback;
  }
};

const hasWindow = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// Products
export const getStoredProducts = () => {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem(PRODUCTS_KEY);
  return safeParse(raw, []);
};

export const setStoredProducts = (products) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const addProductToStorage = (product) => {
  const products = getStoredProducts();
  const newProduct = {
    id: generateId(),
    ...product,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const updated = [newProduct, ...products];
  setStoredProducts(updated);
  return newProduct;
};

export const updateProductInStorage = (productId, updates) => {
  const products = getStoredProducts();
  const updated = products.map((p) =>
    p.id === productId ? { ...p, ...updates, updated_at: new Date().toISOString() } : p
  );
  setStoredProducts(updated);
  return updated;
};

export const deleteProductFromStorage = (productId) => {
  const products = getStoredProducts();
  const updated = products.filter((p) => p.id !== productId);
  setStoredProducts(updated);
  return updated;
};

export const clearAllProducts = () => {
  if (!hasWindow()) return;
  window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify([]));
};

// Invoices
export const getStoredInvoices = () => {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem(INVOICES_KEY);
  return safeParse(raw, []);
};

export const setStoredInvoices = (invoices) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
};

export const addInvoiceToStorage = (invoice) => {
  const invoices = getStoredInvoices();
  const newInvoice = {
    id: generateId(),
    ...invoice,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const updated = [newInvoice, ...invoices];
  setStoredInvoices(updated);
  return newInvoice;
};

export const updateInvoiceInStorage = (invoiceId, updates) => {
  const invoices = getStoredInvoices();
  const updated = invoices.map((inv) =>
    inv.id === invoiceId ? { ...inv, ...updates, updated_at: new Date().toISOString() } : inv
  );
  setStoredInvoices(updated);
  return updated;
};

export const deleteInvoiceFromStorage = (invoiceId) => {
  const invoices = getStoredInvoices();
  const updated = invoices.filter((inv) => inv.id !== invoiceId);
  setStoredInvoices(updated);
  return updated;
};

export const generateInvoiceNumber = () => {
  const invoices = getStoredInvoices();
  if (invoices.length === 0) {
    return 'glxy0001';
  }
  
  const lastNumber = invoices.reduce((max, inv) => {
    const num = parseInt(inv.invoice_number?.replace('glxy', '') || '0');
    return num > max ? num : max;
  }, 0);
  
  return `glxy${String(lastNumber + 1).padStart(4, '0')}`;
};

// Customers
export const getStoredCustomers = () => {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem(CUSTOMERS_KEY);
  return safeParse(raw, []);
};

export const setStoredCustomers = (customers) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(customers));
};

export const addCustomerToStorage = (customer) => {
  const customers = getStoredCustomers();
  const newCustomer = {
    id: generateId(),
    ...customer,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const updated = [newCustomer, ...customers];
  setStoredCustomers(updated);
  return newCustomer;
};

// Business Settings
export const getBusinessSettings = () => {
  if (!hasWindow()) return { name: '', address: '', phone: '', email: '', logo: '', defaultPanel: 'role-selection', currencyCode: 'AED' };
  const raw = window.localStorage.getItem(BUSINESS_SETTINGS_KEY);
  return safeParse(raw, { name: '', address: '', phone: '', email: '', logo: '', defaultPanel: 'role-selection', currencyCode: 'AED' });
};

export const setBusinessSettings = (settings) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(BUSINESS_SETTINGS_KEY, JSON.stringify(settings));
};

// Buildings & Flats (re-export from buildingFlatStorage for convenience)
export const getStoredBuildings = () => {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem('buildingsData');
  return safeParse(raw, []);
};

export const getStoredFlats = () => {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem('flatsData');
  return safeParse(raw, []);
};
