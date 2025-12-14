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
