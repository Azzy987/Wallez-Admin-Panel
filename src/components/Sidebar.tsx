
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, ImagePlus, Pencil, Sun, Moon, Menu, Sparkles, Grid3X3, Lock } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/categories', label: 'Categories & Banners', icon: Grid3X3 },
  { to: '/paywall-banners', label: 'Paywall Banners', icon: Lock },
  { to: '/add-wallpaper', label: 'Upload', icon: ImagePlus },
  { to: '/edit-wallpaper', label: 'Library', icon: Pencil },
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();
  
  const isActive = (path: string) => location.pathname === path;

  const SidebarContent = () => (
    <div className="w-full flex flex-col h-full">
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#2EE6C5] to-primary flex items-center justify-center shadow-lg shadow-[#2EE6C5]/20">
            <Sparkles className="h-5 w-5 text-[#0C0D11]" />
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/20" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground leading-tight tracking-tight">
              Wallez
            </h1>
            <p className="text-[11px] text-sidebar-foreground/50 uppercase tracking-widest">
              Admin
            </p>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-white/10 transition-all duration-200 hover:scale-105"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="mt-2 flex-1 px-3 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                'sidebar-item group relative',
                active && 'active'
              )}
            >
              {active ? (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-[#2EE6C5]" />
              ) : null}
              <Icon className={cn('h-5 w-5 transition-transform duration-200', 'group-hover:scale-110')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 mx-3 mb-4 rounded-xl border border-white/[0.06] bg-white/[0.03]">
        <p className="text-[11px] text-sidebar-foreground/45 leading-relaxed">
          Glass wallpapers for iOS · Liquid Glass & editorial categories
        </p>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 p-3 flex items-center bg-sidebar/95 backdrop-blur-xl border-b border-white/[0.06] z-40">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground mr-2">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar border-none">
              <SidebarContent />
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2EE6C5] to-primary flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-[#0C0D11]" />
            </div>
            <h1 className="text-base font-bold text-sidebar-foreground">Wallez</h1>
          </div>
        </div>
        <div className="h-14" />
      </>
    );
  }

  return (
    <div className="w-[260px] bg-sidebar/95 backdrop-blur-xl flex-shrink-0 flex flex-col h-screen sticky top-0 left-0 border-r border-white/[0.06]">
      <SidebarContent />
    </div>
  );
};

export default Sidebar;
