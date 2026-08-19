import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Menu,
  X,
  LogOut,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

interface AppLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: "Tableau de bord", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Gestion Stock", icon: Package, path: "/stock" },
  { label: "Produits", icon: ShoppingCart, path: "/products" },
  // { label: "Personnel", icon: Users, path: "/staff" },
];

export const AppLayout = ({ children }: AppLayoutProps) => {
  const { logout, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const getNavItems = () => {
    if (user?.role === 'admin') {
      return [
        { label: "Dashboard Général", icon: LayoutDashboard, path: "/admin" },
        { label: "Magasins", icon: Store, path: "/stores" },
      ];
    }
    // Magasinier Default
    return [
      { label: "Tableau de bord", icon: LayoutDashboard, path: "/dashboard" },
      { label: "Gestion Stock", icon: Package, path: "/stock" },
      { label: "Produits", icon: ShoppingCart, path: "/products" },
    ];
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0 md:h-screen",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-screen">
          {/* Logo / Header */}
          <div className="h-16 flex items-center px-6 border-b border-border gap-2 bg-gradient-to-r from-green-50 to-emerald-50">
            <img src="/favicon.png" alt="Logo" className="h-16 w-16" />
            <span className="text-xl font-bold bg-gradient-to-r from-green-700 to-emerald-500 bg-clip-text text-transparent">
              Green Stock
            </span>
            <button
              className="ml-auto md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all hover:bg-primary/10 hover:text-primary",
                    isActive
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Footer - Fixed at bottom */}
          <div className="mt-auto p-4 border-t border-border">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen bg-muted/10">
        {/* Mobile Header */}
        <header className="md:hidden h-16 flex items-center px-4 border-b border-border bg-card shadow-sm">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu className="h-6 w-6" />
          </Button>
          <img src="/favicon.png" alt="Logo" className="ml-4 h-12 w-12" />
          <span className="ml-2 font-semibold">Green Stock</span>
        </header>

        {/* Page Content with Watermark */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto relative">
          {/* GV Watermark */}
          <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
            <div className="relative">
              <span
                className="text-[20rem] font-black tracking-tighter select-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(22,163,74,0.03) 50%, rgba(34,197,94,0.06) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  filter: 'blur(1px)',
                  fontFamily: 'Inter, system-ui, sans-serif',
                  letterSpacing: '-0.05em',
                }}
              >
                GV
              </span>
            </div>
          </div>
          {/* Page Content */}
          <div className="relative z-10">
            {children}
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/50 py-3 px-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} <span className="font-semibold text-green-600">Green Stock</span> — Gestion de Stock Intelligente
        </footer>
      </div>
    </div>
  );
};
