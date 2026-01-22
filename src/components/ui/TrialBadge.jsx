import React, { useState, useEffect } from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { isOnTrial, getTrialRemainingTime, formatRemainingTime, clearTrialData } from "@/utils/activation";

const TrialBadge = () => {
  const [remainingTime, setRemainingTime] = useState(0);
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    // Check if on trial
    setIsTrial(isOnTrial());
    
    if (isOnTrial()) {
      // Update remaining time every minute
      const updateTime = () => {
        const remaining = getTrialRemainingTime();
        setRemainingTime(remaining);
        
        // If trial expired, clear data and reload
        if (remaining <= 0) {
          clearTrialData();
          window.location.href = '/';
        }
      };
      
      updateTime();
      const interval = setInterval(updateTime, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, []);

  if (!isTrial) return null;

  return (
    <Badge 
      variant="outline" 
      className="bg-amber-500/10 text-amber-600 border-amber-500/30 flex items-center gap-1"
    >
      <Clock className="w-3 h-3" />
      <span>Trial: {formatRemainingTime(remainingTime)}</span>
    </Badge>
  );
};

export default TrialBadge;
