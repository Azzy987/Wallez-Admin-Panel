
import React from 'react';
import Sidebar from './Sidebar';
import FloatingScrollButton from './ui/floating-scroll-button';
import WallezAmbientBackground from './WallezAmbientBackground';
import { useIsMobile } from '@/hooks/use-mobile';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className="relative flex min-h-screen">
      <WallezAmbientBackground />
      <Sidebar />
      <main className={`flex-1 ${isMobile ? 'px-4 py-6 pt-2' : 'p-8'} overflow-y-auto`}>
        <div className="max-w-[1280px] mx-auto">
          {children}
        </div>
      </main>
      <FloatingScrollButton />
    </div>
  );
};

export default Layout;
