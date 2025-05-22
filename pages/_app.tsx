import "@/styles/globals.css";
import type { AppProps } from "next/app";
import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <main className={`flex-1 transition-all duration-300
        ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
        ${isMobile ? 'ml-0 pt-16' : ''}
        p-4 md:p-8
      `}>
        {/* Added scrollable-content wrapper */}
        <div className="scrollable-content">
          <Component {...pageProps} />
        </div>
      </main>
    </div>
  );
}