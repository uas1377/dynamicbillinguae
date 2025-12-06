import React, { useEffect, useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X, ScanLine } from "lucide-react";

const BarcodeScanner = ({ open, onClose, onScan }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const streamRef = useRef(null);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [open]);

  const startCamera = async () => {
    try {
      setError(null);
      setScanning(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start scanning for barcodes
        scanForBarcode();
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Unable to access camera. Please ensure camera permissions are granted.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    setScanning(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const scanForBarcode = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Check if BarcodeDetector API is available
    if ('BarcodeDetector' in window) {
      const barcodeDetector = new window.BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
      });

      const detectBarcode = async () => {
        if (!scanning || !videoRef.current) return;
        
        try {
          const barcodes = await barcodeDetector.detect(video);
          if (barcodes.length > 0) {
            const barcode = barcodes[0].rawValue;
            console.log('Barcode detected:', barcode);
            onScan(barcode);
            stopCamera();
            onClose();
            return;
          }
        } catch (err) {
          console.error('Barcode detection error:', err);
        }
        
        if (scanning) {
          requestAnimationFrame(detectBarcode);
        }
      };

      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        detectBarcode();
      };
    } else {
      // Fallback: Manual barcode entry prompt
      setError('Barcode scanner not supported in this browser. Please enter barcode manually.');
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Scan Barcode
          </DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          {error ? (
            <div className="p-8 text-center">
              <p className="text-destructive text-sm">{error}</p>
              <Button onClick={startCamera} className="mt-4" variant="outline">
                Try Again
              </Button>
            </div>
          ) : (
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-32 border-2 border-primary rounded-lg">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ScanLine className="w-full h-1 text-primary animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-primary rounded-tl" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-primary rounded-tr" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-primary rounded-bl" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-primary rounded-br" />
                </div>
              </div>
              
              <p className="absolute bottom-4 left-0 right-0 text-center text-white text-sm bg-black/50 py-2">
                Point camera at barcode
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
