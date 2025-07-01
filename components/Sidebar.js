import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { getCurrentUser, hasPermission, logout } from '../lib/auth';

export default function Sidebar() {
  const router = useRouter();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check for logged in user
    const user = getCurrentUser();
    setCurrentUser(user);
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

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    router.push('/login');
  };

  const menuItems = [
    { href: '/', icon: 'home', label: 'Home', show: true },
     { 
      label: 'Maintenance', 
      icon: 'engineering',
      show: hasPermission(currentUser, ['maintenance', 'manager']), // Requires manager or higher
      items: [
        { 
          href: '/machines', 
          icon: 'precision_manufacturing', 
          label: 'Maquinas',
          show: hasPermission(currentUser, ['maintenance','manager'])
        },
        // Add more tools here as needed
                { 
          href: '/inventory', 
          icon: 'inventory', 
          label: 'Inventario',
          show: hasPermission(currentUser, ['maintenance', 'manager'])
        },
                { 
          href: '/tools/machine-orders', 
          icon: 'shopping_basket', 
          label: 'Ordenes mantenimiento',
          show: hasPermission(currentUser, ['maintenance', 'manager'])
        },
        { 
          href: '/transport', 
          icon: 'local_shipping', 
          label: 'Transportes',
          show: hasPermission(currentUser, [ 'manager'])
        },
      ]
    },
    { 
      href: '/time-tracker', 
      icon: 'timer', 
      label: 'Efficiencies',
      show: true // Requires at least user role
    },    
    { 
      href: '/open-orders', 
      icon: 'receipt_long', 
      label: 'Open Orders',
      show: true // Requires at least user role
    },
    { 
      label: 'Tools', 
      icon: 'build',
      show: true, // Requires manager or higher
      items: [
        { 
          href: '/tools/purchase-orders', 
          icon: 'receipt', 
          label: 'POs ApparelMagic',
          show: hasPermission(currentUser, [ 'manager'])
        },
        // Add more tools here as needed
        {
          href: '/tools/order-cards',
          icon: 'web_stories',
          label: 'Generador de cartas para Snapshot',
          show: true
        }
      ]
    },    { 
      label: 'Reports', 
      icon: 'article',
      show: true, // Requires manager or higher
      items: [
        { 
          href: '/reports/repairs', 
          icon: 'close', 
          label: 'Repairs',
          show: hasPermission(currentUser, [ 'manager', 'data', 'andrew'])
        },
        // Add more tools here as needed
        {
          href: '/reports/daily-flow',
          icon: 'air',
          label: 'Daily Flow',
          show: hasPermission(currentUser, [ 'manager', 'data', 'andrew'])
        },
         {
          href: '/reports/cutsheet',
          icon: 'content_cut',
          label: 'Cut Sheet',
          show: true
        }
      ]
    },   
     { 
      label: 'Admin', 
      icon: 'admin_panel_settings',
      show: hasPermission(currentUser, 'admin'), // Requires manager or higher
      items: [
        { 
          href: '/admin/users', 
          icon: 'manage_accounts', 
          label: 'Usuarios',
          show: hasPermission(currentUser, 'admin')
        },
        { 
          href: '/admin/roles', 
          icon: 'group', 
          label: 'Roles',
          show: hasPermission(currentUser, 'admin')
        },
        
        // Add more tools here as needed
      ]
    },

  {
  href: '/change-password',
  icon: 'lock',
  label: 'Change Password',
  show: Boolean(currentUser) // Only show when logged in
  }
  ].filter(item => item.show); // Filter out items that shouldn't be shown

  return (
    <div className={`fixed left-0 top-0 h-screen bg-gradient-to-b from-sidebar to-sidebar-light text-sidebar-text shadow-lg transition-all duration-300 z-50
      ${isCollapsed ? 'w-16' : 'w-64'}
      ${isMobile && !isCollapsed ? 'w-64' : ''}
    `}>
      <div className={`p-4 flex items-center justify-between border-b border-sidebar-lighter
        ${isCollapsed ? 'flex-col h-20' : ''}
      `}>
        {!isCollapsed && <div className="text-2xl font-bold">Lekker Sewing</div>}
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
                      {item.items.filter(subItem => subItem.show).map((subItem) => (
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
        {currentUser ? (
          <div className={`flex items-center ${isCollapsed ? 'flex-col' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-sidebar-light flex items-center justify-center mr-3">
              <span className="material-icons">person</span>
            </div>
            {!isCollapsed && (
              <div>
                <div className="font-medium">{currentUser.full_name}</div>
                <div className="text-xs text-sidebar-secondary capitalize">{currentUser.role}</div>
                <button 
                  onClick={handleLogout}
                  className="text-xs mt-1 text-sidebar-secondary hover:text-white"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" passHref>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''} p-2 rounded-lg hover:bg-sidebar-light cursor-pointer`}>
              <span className="material-icons mr-2">login</span>
              {!isCollapsed && <span>Login</span>}
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}