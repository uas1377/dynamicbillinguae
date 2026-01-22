import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { getDeviceId, activateApp, isActivated } from '@/utils/activation';
import { Shield, Key, Copy, Check, Clock } from 'lucide-react';

const ActivationPage = ({ onActivated }) => {
  const [activationKey, setActivationKey] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const checkActivation = async () => {
      try {
        const activated = await isActivated();
        if (activated) {
          onActivated();
          return;
        }
        const id = await getDeviceId();
        setDeviceId(id);
      } catch (error) {
        console.error('Error checking activation:', error);
      } finally {
        setIsChecking(false);
      }
    };
    checkActivation();
  }, [onActivated]);

  const handleActivate = async () => {
    if (!activationKey.trim()) {
      toast.error('Please enter an activation key');
      return;
    }

    setIsLoading(true);
    try {
      const success = await activateApp(activationKey.trim());
      if (success) {
        // Check if it's a trial activation
        if (activationKey.trim().toLowerCase() === 'dynamictrail') {
          toast.success('Trial version activated for 24 hours!', {
            description: 'All data will be cleared after trial expires.'
          });
        } else {
          toast.success('App activated successfully!');
        }
        onActivated();
      } else {
        toast.error('Invalid activation key. Please check and try again.');
      }
    } catch (error) {
      toast.error('Activation failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyDeviceId = () => {
    navigator.clipboard.writeText(deviceId);
    setCopied(true);
    toast.success('Device ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="w-12 h-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Checking activation status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Activate Dynamic Billing</CardTitle>
          <CardDescription>
            Enter your activation key to unlock the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Device ID Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Your Device ID</label>
            <div className="flex gap-2">
              <Input 
                value={deviceId} 
                readOnly 
                className="font-mono text-xs bg-muted"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={copyDeviceId}
                className="shrink-0"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this Device ID with admin to get your activation key
            </p>
          </div>

          {/* Activation Key Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Activation Key</label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter your activation key"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value)}
                className="pl-10 font-mono"
                onKeyPress={(e) => e.key === 'Enter' && handleActivate()}
              />
            </div>
          </div>

          <Button 
            onClick={handleActivate} 
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Activating...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Activate
              </>
            )}
          </Button>

          {/* Trial Info */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-600">Try Before You Buy</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Type <span className="font-mono font-bold">dynamictrail</span> to start a 24-hour trial.
                  All data will be cleared when trial expires.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-00 text-center">
            <p className="text-[15px] text-slate-500 mb-1">
              Contact: dynamiceffects1377@gmail.com
            </p>
            <p className="text-xs[15px] font-bold tracking- text-primary uppercase">
              Powered by DYNAMIC EFFECTS
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivationPage;
