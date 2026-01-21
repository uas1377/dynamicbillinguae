import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Bluetooth, BluetoothConnected, BluetoothOff, Loader2, Printer, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const BluetoothPrinterDialog = ({ open, onOpenChange }) => {
  const [devices, setDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
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
        setConnectedDevice(JSON.parse(savedDevice));
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
      // Request Bluetooth device with printer service
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', '00001101-0000-1000-8000-00805f9b34fb'] // Serial Port Profile UUID
      });

      if (device) {
        const deviceInfo = {
          id: device.id,
          name: device.name || 'Unknown Device',
          device: device
        };
        
        setDevices(prev => {
          // Avoid duplicates
          if (prev.some(d => d.id === device.id)) return prev;
          return [...prev, deviceInfo];
        });
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
      
      setConnectedDevice(savedInfo);
      localStorage.setItem('connectedBluetoothPrinter', JSON.stringify(savedInfo));
      localStorage.setItem('bluetoothPrinterServer', 'connected');
      
      toast.success(`Connected to ${device.name || 'printer'}`);
      
      // Set up disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        setConnectedDevice(null);
        localStorage.removeItem('connectedBluetoothPrinter');
        localStorage.removeItem('bluetoothPrinterServer');
        toast.info('Printer disconnected');
      });
      
    } catch (err) {
      console.error('Connection error:', err);
      toast.error(`Failed to connect: ${err.message}`);
      setError(`Connection failed: ${err.message}`);
    }
  };

  const disconnectDevice = () => {
    setConnectedDevice(null);
    localStorage.removeItem('connectedBluetoothPrinter');
    localStorage.removeItem('bluetoothPrinterServer');
    toast.success('Printer disconnected');
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
                <div className="bg-primary/10 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <BluetoothConnected className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">{connectedDevice.name}</p>
                        <p className="text-sm text-muted-foreground">Connected</p>
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
                </div>
              )}

              {/* Scan Button */}
              <Button 
                onClick={scanForDevices} 
                disabled={isScanning}
                className="w-full"
                variant={connectedDevice ? "outline" : "default"}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    {connectedDevice ? 'Scan for Other Devices' : 'Scan for Printers'}
                  </>
                )}
              </Button>

              {/* Error Message */}
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Device List */}
              {devices.length > 0 && (
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
                          <Button size="sm" variant="ghost">
                            Connect
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p className="font-medium mb-1">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-xs">
                  <li>Make sure your Bluetooth printer is turned on</li>
                  <li>Pair your printer with your device via system settings first</li>
                  <li>Click "Scan for Printers" to find available devices</li>
                  <li>Select your printer to connect</li>
                </ol>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BluetoothPrinterDialog;
