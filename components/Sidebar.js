import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { href: '/', icon: '🏠', label: 'Home' },
    { href: '/machines', icon: '📊', label: 'Machines' },
    { href: '/time-tracker', icon: '⏳', label: 'Efficiencias' },
    { href: '/tools/purchase-orders', icon: '💸', label: 'POs ApparelMagic' },
  ];

  return (
    <div className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar to-sidebar-light text-sidebar-text shadow-lg transition-all duration-300 z-50
      ${isCollapsed ? 'w-20' : 'w-64'}
      ${isMobile && !isCollapsed ? 'w-full' : ''}
    `}>
      <div className={`p-4 flex items-center justify-between border-b border-sidebar-lighter
        ${isCollapsed ? 'flex-col h-20' : ''}
      `}>
        {!isCollapsed && <div className="text-2xl font-bold">LekkerCMMS</div>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-full hover:bg-sidebar-light transition-colors"
        >
          {isCollapsed ? '➡️' : '⬅️'}
        </button>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <div
                  className={`flex items-center p-3 rounded-lg transition-all hover:bg-sidebar-light
                    ${router.pathname === item.href ? 'bg-sidebar' : ''}
                    ${isCollapsed ? 'justify-center' : ''}
                  `}
                >
                  <span className={`text-xl ${isCollapsed ? 'mr-0' : 'mr-3'}`}>{item.icon}</span>
                  {!isCollapsed && <span>{item.label}</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className={`absolute bottom-0 w-full p-4 border-t border-sidebar-lighter
        ${isCollapsed ? 'flex justify-center' : ''}
      `}>
        <div className={`flex items-center ${isCollapsed ? 'flex-col' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-sidebar-light flex items-center justify-center mr-3">
            <span>👤</span>
          </div>
          {!isCollapsed && (
            <div>
              <div className="font-medium">Admin User</div>
              <div className="text-xs text-sidebar-secondary">admin@lekkercmms.com</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}