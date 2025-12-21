// ============================================
// ACTIVATION KEY GENERATOR (Admin Tool)
// ============================================
// Run this script in Node.js to generate activation keys
// Usage: node generateKey.js <deviceId>
// 
// Example:
// node generateKey.js abc123def456
// ============================================

const crypto = require('crypto');

// IMPORTANT: This MUST match the SECRET in src/utils/activation.js
const SECRET = 'GalaxyBilling2025-UltraSecretKey-ChangeThis!';

function generateKey(deviceId) {
  if (!deviceId) {
    console.error('Error: Please provide a device ID');
    console.log('Usage: node generateKey.js <deviceId>');
    process.exit(1);
  }

  const key = crypto
    .createHmac('sha256', SECRET)
    .update(deviceId)
    .digest('hex');

  console.log('\n========================================');
  console.log('ACTIVATION KEY GENERATOR');
  console.log('========================================');
  console.log('Device ID:', deviceId);
  console.log('----------------------------------------');
  console.log('Activation Key:', key);
  console.log('========================================\n');

  return key;
}

// Get device ID from command line argument
const deviceId = process.argv[2];
generateKey(deviceId);
