import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openMenus, setOpenMenus] = useState({});

  useEffect(() => {
    setOpenMenus({ 'Tools': true });
    
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = (label) => {
    setOpenMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const menuItems = [
    { href: '/', icon: 'home', label: 'Home' },
    { href: '/machines', icon: 'bar_chart', label: 'Machines' },
    { href: '/time-tracker', icon: 'timer', label: 'Efficiencies' },
    { 
      label: 'Tools', 
      icon: 'build',
      items: [
        { href: '/tools/purchase-orders', icon: 'receipt', label: 'POs ApparelMagic' },
      ]
    }
  ];

  return (
    <div className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar to-sidebar-light text-sidebar-text shadow-lg transition-all duration-300 z-50
      ${isCollapsed ? 'w-16' : 'w-64'}
      ${isMobile && !isCollapsed ? 'w-64' : ''}
    `}>
      <div className={`p-4 flex items-center justify-between border-b border-sidebar-lighter
        ${isCollapsed ? 'flex-col h-20' : ''}
      `}>
        {!isCollapsed && <div className="text-2xl font-bold">LekkerCMMS</div>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-full hover:bg-sidebar-light transition-colors"
        >
          <span className="material-icons">
            {isCollapsed ? 'chevron_right' : 'chevron_left'}
          </span>
        </button>
      </div>
      
      <nav className="p-4 overflow-y-auto h-[calc(100vh-180px)]">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.label}>
              {item.href ? (
                <Link href={item.href} passHref>
                  <div
                    className={`flex items-center p-3 rounded-lg transition-all hover:bg-sidebar-light
                      ${router.pathname === item.href ? 'bg-sidebar' : ''}
                      ${isCollapsed ? 'justify-center' : ''}
                    `}
                  >
                    <span className={`material-icons ${isCollapsed ? 'mr-0' : 'mr-3'}`}>{item.icon}</span>
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>
                </Link>
              ) : (
                <>
                  <div
                    onClick={() => toggleMenu(item.label)}
                    className={`flex items-center p-3 rounded-lg transition-all hover:bg-sidebar-light cursor-pointer
                      ${isCollapsed ? 'justify-center' : 'justify-between'}
                    `}
                  >
                    <div className="flex items-center">
                      <span className={`material-icons ${isCollapsed ? 'mr-0' : 'mr-3'}`}>{item.icon}</span>
                      {!isCollapsed && <span>{item.label}</span>}
                    </div>
                    {!isCollapsed && (
                      <span className="material-icons text-sm">
                        {openMenus[item.label] ? 'expand_less' : 'expand_more'}
                      </span>
                    )}
                  </div>
                  
                  {(!isCollapsed || isMobile) && openMenus[item.label] && (
                    <ul className={`${isCollapsed ? 'ml-0' : 'ml-6'} mt-1 space-y-1`}>
                      {item.items.map((subItem) => (
                        <li key={subItem.label}>
                          <Link href={subItem.href} passHref>
                            <div
                              className={`flex items-center p-2 ${isCollapsed ? 'pl-2 justify-center' : 'pl-3'} rounded-lg transition-all hover:bg-sidebar-light
                                ${router.pathname === subItem.href ? 'bg-sidebar' : ''}
                              `}
                            >
                              <span className={`material-icons ${isCollapsed ? 'text-lg' : 'text-sm mr-3'}`}>{subItem.icon}</span>
                              {!isCollapsed && <span className="text-sm">{subItem.label}</span>}
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>
      
      <div className={`absolute bottom-0 w-full p-4 border-t border-sidebar-lighter
        ${isCollapsed ? 'flex justify-center' : ''}
      `}>
        <div className={`flex items-center ${isCollapsed ? 'flex-col' : ''}`}>
          <div className="w-10 h-10 rounded-full bg-sidebar-light flex items-center justify-center mr-3">
            <span className="material-icons">person</span>
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