import React, { useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import InvoiceTab from "./InvoiceTab";

const CreateInvoiceTabs = ({ tabs, activeTab, setActiveTab, addNewTab, closeTab, tabsData, updateTabData }) => {

  const handleCloseTab = (tabId, e) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleInvoiceSaved = useCallback((tabId) => {
    closeTab(tabId);
  }, [closeTab]);

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
                onClick={(e) => handleCloseTab(tab.id, e)}
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
              tabData={tabsData[tab.id]}
              updateTabData={(data) => updateTabData(tab.id, data)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreateInvoiceTabs;
