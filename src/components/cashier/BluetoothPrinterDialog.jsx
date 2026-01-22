import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bluetooth, BluetoothConnected, BluetoothOff, Loader2, Printer, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { setActiveBluetoothDevice, clearActiveBluetoothDevice } from "@/utils/thermalPrintGenerator";

const BluetoothPrinterDialog = ({ open, onOpenChange }) => {
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [bluetoothSupported, setBluetoothSupported] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if Web Bluetooth is supported
    if (!navigator.bluetooth) {
      setBluetoothSupported(false);
      setError('Web Bluetooth is not supported in this browser. Please use Chrome on Android or a compatible browser.');
    }
    
    // Load previously connected device from storage
    const savedDevice = localStorage.getItem('connectedBluetoothPrinter');
    if (savedDevice) {
      try {
        const parsedDevice = JSON.parse(savedDevice);
        setConnectedDevice(parsedDevice);
      } catch (e) {
        localStorage.removeItem('connectedBluetoothPrinter');
      }
    }
  }, []);

  const scanForDevices = async () => {
    if (!navigator.bluetooth) {
      toast.error('Bluetooth is not supported in this browser');
      return;
    }

    setIsScanning(true);
    setError(null);
    setDevices([]);

    try {
      // Request Bluetooth device - this opens the native device picker
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'battery_service', 
          '00001101-0000-1000-8000-00805f9b34fb', // Serial Port Profile UUID
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
          '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
          '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2'  // Common printer service
        ]
      });

      if (device) {
        const deviceInfo = {
          id: device.id,
          name: device.name || 'Unknown Device',
          device: device
        };
        
        setDevices([deviceInfo]);
        
        // Auto-connect after selection
        await connectToDevice(deviceInfo);
      }
    } catch (err) {
      if (err.name === 'NotFoundError') {
        // User cancelled the device selection
        setError('No device selected. Please try again.');
      } else if (err.name === 'SecurityError') {
        setError('Bluetooth permission denied. Please allow Bluetooth access.');
      } else {
        setError(`Error scanning: ${err.message}`);
      }
    } finally {
      setIsScanning(false);
    }
  };

  const connectToDevice = async (deviceInfo) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const device = deviceInfo.device;
      
      if (!device.gatt) {
        throw new Error('GATT is not available on this device');
      }

      // Attempt to connect
      const server = await device.gatt.connect();
      
      const savedInfo = {
        id: device.id,
        name: device.name || 'Unknown Device'
      };
      
      // Store the active connection for direct printing
      setActiveBluetoothDevice(device, server);
      
      setConnectedDevice(savedInfo);
      localStorage.setItem('connectedBluetoothPrinter', JSON.stringify(savedInfo));
      
      toast.success(`Connected to ${device.name || 'printer'}`, {
        description: 'Printer is ready for direct printing'
      });
      
      // Set up disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        setConnectedDevice(null);
        clearActiveBluetoothDevice();
        localStorage.removeItem('connectedBluetoothPrinter');
        toast.info('Printer disconnected');
      });
      
    } catch (err) {
      console.error('Connection error:', err);
      toast.error(`Failed to connect: ${err.message}`);
      setError(`Connection failed: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectDevice = () => {
    setConnectedDevice(null);
    clearActiveBluetoothDevice();
    localStorage.removeItem('connectedBluetoothPrinter');
    setDevices([]);
    toast.success('Printer disconnected');
  };

  const testPrint = async () => {
    try {
      // Generate a simple test receipt
      const { generateThermalPrint } = await import('@/utils/thermalPrintGenerator');
      
      const testData = {
        invoiceNumber: 'TEST-001',
        customerName: 'Test Customer',
        cashierName: 'Test Cashier',
        items: [
          { name: 'Test Item 1', sku: 'T001', quantity: 1, amount: 10 },
          { name: 'Test Item 2', sku: 'T002', quantity: 2, amount: 5 }
        ],
        subTotal: '20.00',
        taxRate: 5,
        taxAmount: '1.00',
        grandTotal: '21.00',
        amountReceived: '25.00',
        changeAmount: '4.00',
        status: 'paid',
        yourCompany: {
          name: 'Test Business',
          currencyCode: 'AED'
        }
      };
      
      await generateThermalPrint(testData);
      toast.success('Test print sent!');
    } catch (error) {
      toast.error('Test print failed: ' + error.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="w-5 h-5" />
            Bluetooth Printer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!bluetoothSupported ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Bluetooth Not Supported</p>
                <p className="text-sm mt-1">
                  Web Bluetooth is not available in this browser. For Bluetooth printing:
                </p>
                <ul className="text-sm mt-2 list-disc list-inside space-y-1">
                  <li>Use Chrome on Android device</li>
                  <li>Or use a thermal printer app like "Thermer" from Play Store</li>
                </ul>
                <a 
                  href="https://play.google.com/store/apps/details?id=mate.bluetoothprint" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary underline mt-2 block"
                >
                  Download Thermer App
                </a>
              </div>
            </div>
          ) : (
            <>
              {/* Connected Device */}
              {connectedDevice && (
                <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium">{connectedDevice.name}</p>
                        <p className="text-sm text-green-600">Connected & Ready</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={disconnectDevice}
                    >
                      Disconnect
                    </Button>
                  </div>
                  
                  {/* Test Print Button */}
                  <Button 
                    onClick={testPrint}
                    variant="outline"
                    className="w-full mt-3"
                    size="sm"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Test Print
                  </Button>
                </div>
              )}

              {/* Scan Button */}
              <Button 
                onClick={scanForDevices} 
                disabled={isScanning || isConnecting}
                className="w-full"
                variant={connectedDevice ? "outline" : "default"}
              >
                {isScanning || isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isScanning ? 'Scanning...' : 'Connecting...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {connectedDevice ? 'Connect Different Printer' : 'Connect Printer'}
                  </>
                )}
              </Button>

              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Device List (if manually added without auto-connect) */}
              {devices.length > 0 && !connectedDevice && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-muted-foreground">Available Devices</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {devices.map((device) => (
                      <div 
                        key={device.id}
                        className="p-3 rounded-lg border bg-background hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => connectToDevice(device)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Printer className="w-5 h-5 text-primary" />
                            <p className="font-medium">{device.name}</p>
                          </div>
                          <Button size="sm" variant="ghost" disabled={isConnecting}>
                            {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p className="font-medium mb-1">How it works:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>First pair your printer via phone's Bluetooth settings</li>
                  <li>Click "Connect Printer" to select your device</li>
                  <li>Once connected, printing will be automatic</li>
                  <li>Use "Test Print" to verify the connection</li>
                </ol>
                <p className="text-xs mt-2 text-amber-600">
                  Note: For best compatibility, use the Thermer app for printing.
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BluetoothPrinterDialog;
