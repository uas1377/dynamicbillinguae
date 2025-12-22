import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import InvoiceTab from "./InvoiceTab";

const CreateInvoiceTabs = () => {
  const [tabs, setTabs] = useState([{ id: 1, name: 'Tab 1' }]);
  const [activeTab, setActiveTab] = useState(1);
  const [nextTabId, setNextTabId] = useState(2);

  const addNewTab = () => {
    const newTab = { id: nextTabId, name: `Tab ${nextTabId}` };
    setTabs([...tabs, newTab]);
    setActiveTab(nextTabId);
    setNextTabId(nextTabId + 1);
  };

  const closeTab = (tabId, e) => {
    e.stopPropagation();
    
    if (tabs.length === 1) {
      // If it's the last tab, just reset it
      setTabs([{ id: nextTabId, name: `Tab ${nextTabId}` }]);
      setActiveTab(nextTabId);
      setNextTabId(nextTabId + 1);
      return;
    }

    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    // If closing active tab, switch to adjacent tab
    if (activeTab === tabId) {
      if (tabIndex > 0) {
        setActiveTab(newTabs[tabIndex - 1].id);
      } else {
        setActiveTab(newTabs[0].id);
      }
    }
  };

  const handleInvoiceSaved = useCallback((tabId) => {
    closeTab(tabId, { stopPropagation: () => {} });
  }, [tabs]);

  return (
    <div className="space-y-4">
      {/* Chrome-like Tab Bar */}
      <div className="flex items-end border-b overflow-x-auto">
        <div className="flex items-end gap-0.5 min-w-0 flex-1 pb-0">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "group flex items-center gap-2 px-4 py-2 cursor-pointer rounded-t-lg border border-b-0 transition-all min-w-[100px] max-w-[180px]",
                activeTab === tab.id
                  ? "bg-background border-border -mb-px z-10"
                  : "bg-muted/50 border-transparent hover:bg-muted/80"
              )}
            >
              <span className="text-sm font-medium truncate flex-1">
                {tab.name}
              </span>
              <button
                onClick={(e) => closeTab(tab.id, e)}
                className={cn(
                  "p-0.5 rounded hover:bg-destructive/20 transition-colors",
                  activeTab === tab.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
        </div>
        
        {/* New Tab Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={addNewTab}
          className="h-8 w-8 p-0 mb-1 ml-1 rounded-full hover:bg-muted"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Tab Content */}
      <div className="relative">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={cn(
              activeTab === tab.id ? "block" : "hidden"
            )}
          >
            <InvoiceTab 
              tabId={tab.id} 
              onSave={() => handleInvoiceSaved(tab.id)} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreateInvoiceTabs;
