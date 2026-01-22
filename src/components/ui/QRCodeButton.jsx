import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QrCode } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { getBusinessSettings } from "@/utils/localStorageData";

const QRCodeButton = ({ amount, size = "sm", variant = "outline", className = "" }) => {
  const [showDialog, setShowDialog] = useState(false);
  const [qrLink, setQrLink] = useState('');

  const businessSettings = getBusinessSettings();
  
  // Check if UPI link is enabled
  const isEnabled = businessSettings.upiLinkEnabled && businessSettings.upiLink;

  const handleOpenQR = () => {
    if (!businessSettings.upiLink) return;
    
    // Replace [amount] placeholder with actual amount
    const formattedAmount = parseFloat(amount).toFixed(2);
    const generatedLink = businessSettings.upiLink.replace(/\[amount\]/gi, formattedAmount);
    setQrLink(generatedLink);
    setShowDialog(true);
  };

  // Don't render if UPI link is not enabled
  if (!isEnabled) return null;

  return (
    <>
      <Button
        onClick={handleOpenQR}
        size={size}
        variant={variant}
        className={`flex items-center gap-1 ${className}`}
      >
        <QrCode className="w-4 h-4" />
        <span className="hidden sm:inline">QR</span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-center justify-center">
              <QrCode className="w-5 h-5" />
              Payment QR Code
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center space-y-4 p-4">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG 
                value={qrLink} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-2xl font-bold text-primary">
                {businessSettings.currencyCode || 'AED'} {parseFloat(amount).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Scan this QR code to make payment
              </p>
            </div>

            <div className="w-full bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground break-all">
                {qrLink}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QRCodeButton;
