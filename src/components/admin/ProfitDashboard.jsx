import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, DollarSign, Percent, Calendar, Infinity, ChevronLeft, X } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { getStoredInvoices, getBusinessSettings } from "@/utils/localStorageData";

const ADJUSTMENTS_KEY = "profitAdjustments";

const getStoredAdjustments = () => {
  try {
    const raw = localStorage.getItem(ADJUSTMENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const setStoredAdjustments = (adjustments) => {
  localStorage.setItem(ADJUSTMENTS_KEY, JSON.stringify(adjustments));
};

const ProfitDashboard = () => {
  const [monthsData, setMonthsData] = useState([]);
  const [allTimeData, setAllTimeData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [adjustments, setAdjustments] = useState(getStoredAdjustments());
  const [loading, setLoading] = useState(true);
  const [currencyCode, setCurrencyCode] = useState('currency');

  useEffect(() => {
    loadAllData();
    const settings = getBusinessSettings();
    setCurrencyCode(settings.currencyCode || 'currency');
  }, []);

  const loadAllData = () => {
    setLoading(true);
    try {
      const invoices = getStoredInvoices();
      
      // Group invoices by month
      const monthGroups = {};
      let allTimeRevenue = 0;
      let allTimeCost = 0;

      for (const invoice of invoices) {
        const invDate = invoice.date || invoice.created_at;
        if (!invDate) continue;
        
        const monthKey = format(parseISO(invDate.split('T')[0]), 'yyyy-MM');
        const monthName = format(parseISO(invDate.split('T')[0]), 'MMMM yyyy');
        
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = {
            key: monthKey,
            name: monthName,
            revenue: 0,
            cost: 0,
            invoices: []
          };
        }
        
        monthGroups[monthKey].invoices.push(invoice);
        
        const items = invoice.items || [];
        for (const item of items) {
          const revenue = parseFloat(item.amount || item.price || 0) * parseFloat(item.quantity || 0);
          const cost = parseFloat(item.buying_price || 0) * parseFloat(item.quantity || 0);
          
          monthGroups[monthKey].revenue += revenue;
          monthGroups[monthKey].cost += cost;
          allTimeRevenue += revenue;
          allTimeCost += cost;
        }
      }

      // Calculate profit for each month with adjustments
      const monthsArray = Object.values(monthGroups)
        .sort((a, b) => b.key.localeCompare(a.key))
        .map(month => {
          const adj = adjustments[month.key] || { additionalCosts: 0, extraProfit: 0 };
          const baseProfit = month.revenue - month.cost;
          const adjustedProfit = baseProfit - parseFloat(adj.additionalCosts || 0) + parseFloat(adj.extraProfit || 0);
          const profitMargin = month.revenue > 0 ? (adjustedProfit / month.revenue) * 100 : 0;
          
          return {
            ...month,
            profit: adjustedProfit,
            profitMargin,
            additionalCosts: adj.additionalCosts || 0,
            extraProfit: adj.extraProfit || 0
          };
        });

      // Calculate all-time with adjustments
      const allTimeAdj = adjustments['all-time'] || { additionalCosts: 0, extraProfit: 0 };
      const allTimeBaseProfit = allTimeRevenue - allTimeCost;
      const allTimeAdjustedProfit = allTimeBaseProfit - parseFloat(allTimeAdj.additionalCosts || 0) + parseFloat(allTimeAdj.extraProfit || 0);
      const allTimeProfitMargin = allTimeRevenue > 0 ? (allTimeAdjustedProfit / allTimeRevenue) * 100 : 0;

      setAllTimeData({
        key: 'all-time',
        name: 'All Time',
        revenue: allTimeRevenue,
        cost: allTimeCost + parseFloat(allTimeAdj.additionalCosts || 0),
        profit: allTimeAdjustedProfit,
        profitMargin: allTimeProfitMargin,
        additionalCosts: allTimeAdj.additionalCosts || 0,
        extraProfit: allTimeAdj.extraProfit || 0
      });

      setMonthsData(monthsArray);
    } catch (error) {
      toast.error('Failed to load profit data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustmentChange = (monthKey, field, value) => {
    const newAdjustments = {
      ...adjustments,
      [monthKey]: {
        ...adjustments[monthKey],
        [field]: parseFloat(value) || 0
      }
    };
    setAdjustments(newAdjustments);
    setStoredAdjustments(newAdjustments);
    
    // Recalculate data
    setTimeout(loadAllData, 100);
  };

  const MonthCard = ({ data, onClick }) => {
    const isProfit = data.profit >= 0;
    
    return (
      <Card 
        className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg border-2 ${
          isProfit ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
        }`}
        onClick={() => onClick(data)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg">{data.name}</h3>
            {isProfit ? (
              <TrendingUp className="w-5 h-5 text-green-600" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
            {isProfit ? '+' : ''}{formatCurrency(data.profit, currencyCode)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isProfit ? 'Profit' : 'Loss'}
          </p>
        </CardContent>
      </Card>
    );
  };

  const DetailView = ({ data, onBack }) => {
    const isProfit = data.profit >= 0;
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-bold">{data.name} - Details</h2>
        </div>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(data.revenue, currencyCode)}
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
                    {formatCurrency(data.cost, currencyCode)}
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
                  <p className="text-sm text-muted-foreground">Total {isProfit ? 'Profit' : 'Loss'}</p>
                  <p className={`text-2xl font-bold ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(data.profit), currencyCode)}
                  </p>
                </div>
                {isProfit ? (
                  <TrendingUp className="w-8 h-8 text-green-600 opacity-50" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-red-600 opacity-50" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profit Margin</p>
                  <p className={`text-2xl font-bold ${data.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {data.profitMargin.toFixed(2)}%
                  </p>
                </div>
                <Percent className={`w-8 h-8 ${data.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'} opacity-50`} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Adjustments */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Profit Adjustments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="additionalCosts">Additional Costs (AED)</Label>
                <Input
                  id="additionalCosts"
                  type="number"
                  placeholder="Enter additional costs"
                  value={data.additionalCosts}
                  onChange={(e) => handleAdjustmentChange(data.key, 'additionalCosts', e.target.value)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">Costs to deduct (e.g., rent, utilities)</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="extraProfit">Extra Profit (AED)</Label>
                <Input
                  id="extraProfit"
                  type="number"
                  placeholder="Enter extra profit"
                  value={data.extraProfit}
                  onChange={(e) => handleAdjustmentChange(data.key, 'extraProfit', e.target.value)}
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground">Additional income (e.g., services, tips)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="gradient-card shadow-soft border-0">
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading profit data...
        </CardContent>
      </Card>
    );
  }

  if (selectedMonth) {
    return (
      <Card className="gradient-card shadow-soft border-0">
        <CardContent className="p-6">
          <DetailView data={selectedMonth} onBack={() => setSelectedMonth(null)} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gradient-card shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Profit Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* All Time Card */}
        {allTimeData && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Infinity className="w-4 h-4" />
              Overall Summary
            </h3>
            <MonthCard data={allTimeData} onClick={setSelectedMonth} />
          </div>
        )}

        {/* Monthly Cards */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Monthly Breakdown
          </h3>
          {monthsData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No invoice data available. Create invoices to see monthly profit analysis.
            </p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {monthsData.map((month) => (
                <MonthCard key={month.key} data={month} onClick={setSelectedMonth} />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitDashboard;
