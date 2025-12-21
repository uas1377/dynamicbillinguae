import FingerprintJS from '@fingerprintjs/fingerprintjs';
import CryptoJS from 'crypto-js';

// IMPORTANT: This must match your 'generateKey.js' script exactly!
const SECRET = 'GalaxyBilling2025-UltraSecretKey-ChangeThis!'; 

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

// This checks if the app is ALREADY activated (so they don't see the screen every time)
export const isActivated = async () => {
  try {
    const savedKey = localStorage.getItem('activationKey');
    if (!savedKey) return false;
    return await verifyActivationKey(savedKey);
  } catch (error) {
    return false;
  }
};

// This saves the key to the computer if it's correct
export const activateApp = async (key) => {
  const valid = await verifyActivationKey(key);
  if (valid) {
    localStorage.setItem('activationKey', key);
    return true;
  }
  return false;
};

// Generate key for a device (admin tool)
export const generateKeyForDevice = async () => {
  const deviceId = await getDeviceId();
  return CryptoJS.HmacSHA256(deviceId, SECRET).toString();
};
