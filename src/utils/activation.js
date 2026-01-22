import FingerprintJS from '@fingerprintjs/fingerprintjs';
import CryptoJS from 'crypto-js';

// IMPORTANT: This must match your 'generateKey.js' script exactly!
const SECRET = 'GalaxyBilling2025-UltraSecretKey-ChangeThis!'; 

// Trial activation key
const TRIAL_KEY = 'dynamictrail';
const TRIAL_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

let visitorId = null;

// This gets the unique "Fingerprint" of the computer
const initFingerprint = async () => {
  if (visitorId) return visitorId;
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  visitorId = result.visitorId;
  return visitorId;
};

export const getDeviceId = async () => {
  return await initFingerprint();
};

// This verifies if the key the user typed matches the Device ID
export const verifyActivationKey = async (key) => {
  const deviceId = await getDeviceId();
  const expected = CryptoJS.HmacSHA256(deviceId, SECRET).toString();
  return key === expected;
};

// Check if trial is active
export const isTrialActive = () => {
  const trialData = localStorage.getItem('trialActivation');
  if (!trialData) return false;
  
  try {
    const { startTime } = JSON.parse(trialData);
    const now = Date.now();
    const elapsed = now - startTime;
    
    if (elapsed >= TRIAL_DURATION_MS) {
      // Trial expired - clear all data
      clearTrialData();
      return false;
    }
    return true;
  } catch (error) {
    return false;
  }
};

// Get remaining trial time in milliseconds
export const getTrialRemainingTime = () => {
  const trialData = localStorage.getItem('trialActivation');
  if (!trialData) return 0;
  
  try {
    const { startTime } = JSON.parse(trialData);
    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = TRIAL_DURATION_MS - elapsed;
    return remaining > 0 ? remaining : 0;
  } catch (error) {
    return 0;
  }
};

// Format remaining time as "Xh Ym"
export const formatRemainingTime = (ms) => {
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
};

// Start trial activation
export const startTrial = () => {
  const trialData = {
    startTime: Date.now(),
    isTrial: true
  };
  localStorage.setItem('trialActivation', JSON.stringify(trialData));
  return true;
};

// Clear all data when trial expires
export const clearTrialData = () => {
  // Clear all localStorage data except activation
  const keysToRemove = [
    'productsData',
    'invoicesData',
    'customersData',
    'buildingsData',
    'flatsData',
    'businessSettings',
    'cashiers',
    'trialActivation'
  ];
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  sessionStorage.clear();
};

// This checks if the app is ALREADY activated (so they don't see the screen every time)
export const isActivated = async () => {
  try {
    // Check for trial activation first
    if (isTrialActive()) {
      return true;
    }
    
    // Check for full activation
    const savedKey = localStorage.getItem('activationKey');
    if (!savedKey) return false;
    return await verifyActivationKey(savedKey);
  } catch (error) {
    return false;
  }
};

// Check if currently on trial mode
export const isOnTrial = () => {
  return isTrialActive() && !localStorage.getItem('activationKey');
};

// This saves the key to the computer if it's correct
export const activateApp = async (key) => {
  // Check for trial key
  if (key.toLowerCase() === TRIAL_KEY) {
    startTrial();
    return true;
  }
  
  const valid = await verifyActivationKey(key);
  if (valid) {
    localStorage.setItem('activationKey', key);
    // Remove trial if it exists (user upgraded)
    localStorage.removeItem('trialActivation');
    return true;
  }
  return false;
};

// Generate key for a device (admin tool)
export const generateKeyForDevice = async () => {
  const deviceId = await getDeviceId();
  return CryptoJS.HmacSHA256(deviceId, SECRET).toString();
};
