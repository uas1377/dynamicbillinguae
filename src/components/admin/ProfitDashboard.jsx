import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TrendingUp, DollarSign, Percent, Calendar, Infinity } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { format } from "date-fns";
import { getStoredInvoices } from "@/utils/localStorageData";

const ProfitDashboard = () => {
  const [showAllTime, setShowAllTime] = useState(false);
  const [startDate, setStartDate] = useState(format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [additionalCosts, setAdditionalCosts] = useState(0);
  const [extraProfit, setExtraProfit] = useState(0);
  const [profitData, setProfitData] = useState({
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    profitPercentage: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProfitData();
  }, [startDate, endDate, showAllTime, additionalCosts, extraProfit]);

  const loadProfitData = () => {
    setLoading(true);
    try {
      let invoices = getStoredInvoices();
      
      if (!showAllTime) {
        invoices = invoices.filter(inv => {
          const invDate = inv.date || inv.created_at;
          return invDate >= startDate && invDate <= endDate + 'T23:59:59';
        });
      }

      let totalRevenue = 0;
      let totalCost = 0;

      for (const invoice of invoices) {
        const items = invoice.items || [];
        
        for (const item of items) {
          totalRevenue += parseFloat(item.amount || 0) * parseFloat(item.quantity || 0);
          totalCost += parseFloat(item.buying_price || 0) * parseFloat(item.quantity || 0);
        }
      }

      const baseProfit = totalRevenue - totalCost;
      const adjustedProfit = baseProfit - parseFloat(additionalCosts || 0) + parseFloat(extraProfit || 0);
      const profitPercentage = totalRevenue > 0 ? (adjustedProfit / totalRevenue) * 100 : 0;

      setProfitData({
        totalRevenue,
        totalCost: totalCost + parseFloat(additionalCosts || 0),
        totalProfit: adjustedProfit,
        profitPercentage
      });
    } catch (error) {
      toast.error('Failed to calculate profit: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="gradient-card shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Profit Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* All Time Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Infinity className="w-4 h-4" />
            <Label htmlFor="allTime" className="cursor-pointer">Show All Time Profit</Label>
          </div>
          <Switch
            id="allTime"
            checked={showAllTime}
            onCheckedChange={setShowAllTime}
          />
        </div>

        {/* Date Filter */}
        {!showAllTime && (
        <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="startDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Start Date
            </Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate" className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              End Date
            </Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        )}

        {/* Profit Adjustments */}
        <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label htmlFor="additionalCosts">Additional Costs (AED)</Label>
            <Input
              id="additionalCosts"
              type="number"
              placeholder="Enter additional costs"
              value={additionalCosts}
              onChange={(e) => setAdditionalCosts(e.target.value)}
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">Costs to deduct from profit (e.g., rent, utilities)</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="extraProfit">Extra Profit (AED)</Label>
            <Input
              id="extraProfit"
              type="number"
              placeholder="Enter extra profit"
              value={extraProfit}
              onChange={(e) => setExtraProfit(e.target.value)}
              min="0"
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">Additional income to add (e.g., services, tips)</p>
          </div>
        </div>

        {/* Profit Metrics */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading profit data...
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(profitData.totalRevenue)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(profitData.totalCost)}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-orange-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Profit</p>
                    <p className={`text-2xl font-bold ${profitData.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(profitData.totalProfit)}
                    </p>
                  </div>
                  <TrendingUp className={`w-8 h-8 ${profitData.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'} opacity-50`} />
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Profit Margin</p>
                    <p className={`text-2xl font-bold ${profitData.profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitData.profitPercentage.toFixed(2)}%
                    </p>
                  </div>
                  <Percent className={`w-8 h-8 ${profitData.profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProfitDashboard;
