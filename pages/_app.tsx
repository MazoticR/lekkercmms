import '@/styles/globals.css';
import type { AppProps } from "next/app";
import Sidebar from "@/components/Sidebar";
import { useState, useEffect } from 'react';
import Head from 'next/head';

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
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0" />
      </Head>
      <div className="flex min-h-screen w-full bg-background min-w-fit">
        <Sidebar />
        
        <main className={`flex-1 transition-all duration-300
          ${sidebarCollapsed ? 'ml-20' : 'ml-64'}
          ${isMobile ? 'ml-0 pt-16' : ''}
          p-4 md:p-8
          overflow-visible
          min-w-fit
        `}>
          <div className="w-full min-w-fit">
            <Component {...pageProps} />
          </div>
        </main>
      </div>
    </>
  );
}