// Utility functions for storing buildings and flats in localStorage
// This keeps all house/flat data on the device as requested.

const BUILDINGS_KEY = "buildingsData";
const FLATS_KEY = "flatsData";

const safeParse = (value, fallback) => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const hasWindow = () => typeof window !== "undefined" && typeof window.localStorage !== "undefined";

export const getStoredBuildings = () => {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem(BUILDINGS_KEY);
  return safeParse(raw, []);
};

export const getStoredFlats = () => {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem(FLATS_KEY);
  return safeParse(raw, []);
};

export const setStoredBuildings = (buildings) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(BUILDINGS_KEY, JSON.stringify(buildings));
};

export const setStoredFlats = (flats) => {
  if (!hasWindow()) return;
  window.localStorage.setItem(FLATS_KEY, JSON.stringify(flats));
};

const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// Generate a unique 6-character user ID for customer login
const generateUserId = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing chars like 0/O, 1/I
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const addBuildingToStorage = (name) => {
  const buildings = getStoredBuildings();
  const newBuilding = {
    id: generateId(),
    name,
    created_at: new Date().toISOString(),
  };
  const updated = [...buildings, newBuilding];
  setStoredBuildings(updated);
  return newBuilding;
};

export const addFlatToStorage = (buildingId, flatNumber) => {
  const flats = getStoredFlats();
  // Avoid exact duplicates for same building/flat number
  const exists = flats.find(
    (flat) => flat.building_id === buildingId && flat.flat_number === flatNumber
  );
  if (exists) return exists;

  const newFlat = {
    id: generateId(),
    building_id: buildingId,
    flat_number: flatNumber,
    phone: null,
    user_id: generateUserId(), // Auto-generated unique user ID for login
    created_at: new Date().toISOString(),
  };
  const updated = [...flats, newFlat];
  setStoredFlats(updated);
  return newFlat;
};

export const updateFlatPhoneInStorage = (flatId, phone) => {
  const flats = getStoredFlats();
  const updated = flats.map((flat) =>
    flat.id === flatId ? { ...flat, phone: phone || null } : flat
  );
  setStoredFlats(updated);
  return updated;
};

export const getFlatByUserId = (userId) => {
  const flats = getStoredFlats();
  return flats.find((flat) => flat.user_id === userId) || null;
};

export const updateBuildingInStorage = (buildingId, name) => {
  const buildings = getStoredBuildings();
  const updated = buildings.map((b) =>
    b.id === buildingId ? { ...b, name } : b
  );
  setStoredBuildings(updated);
  return updated;
};

export const deleteBuildingFromStorage = (buildingId) => {
  const buildings = getStoredBuildings();
  const updated = buildings.filter((b) => b.id !== buildingId);
  setStoredBuildings(updated);
  return updated;
};

export const deleteFlatFromStorage = (flatId) => {
  const flats = getStoredFlats();
  const updated = flats.filter((f) => f.id !== flatId);
  setStoredFlats(updated);
  return updated;
};

export const updateFlatInStorage = (flatId, updates) => {
  const flats = getStoredFlats();
  const updated = flats.map((flat) =>
    flat.id === flatId ? { ...flat, ...updates } : flat
  );
  setStoredFlats(updated);
  return updated;
};
