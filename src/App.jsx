import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { navItems } from "./nav-items";
import TemplatePage from "./pages/TemplatePage";
import ReceiptPage from "./pages/ReceiptPage";
import Index from "./pages/Index";
import RoleSelection from "./pages/RoleSelection";
import CashierPanel from "./pages/CashierPanel";
import CustomerPanel from "./pages/CustomerPanel";
import AdminPanel from "./pages/AdminPanel";
import ThemeToggle from "./components/ui/ThemeToggle";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <div className="status-bar-overlay"></div>
      <ThemeToggle />
      <Toaster />
      <BrowserRouter>
        <Routes>
          {navItems.map(({ to, page }) => (
            <Route key={to} path={to} element={page} />
          ))}
          <Route path="/" element={<RoleSelection />} />
          <Route path="/cashier" element={<CashierPanel />} />
          <Route path="/customer" element={<CustomerPanel />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/template" element={<TemplatePage />} />
          <Route path="/receipt" element={<ReceiptPage />} />
          <Route path="/index" element={<Index />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
