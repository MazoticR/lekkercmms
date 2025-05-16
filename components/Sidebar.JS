import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Sidebar() {
  const router = useRouter();

  const menuItems = [
    { href: '/', icon: '🏠', label: 'Home' },
    { href: '/machines', icon: '📊', label: 'Dashboard' },
   
  ];

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-gradient-to-b from-purple-900 to-purple-700 text-white shadow-lg">
      <div className="p-4 text-2xl font-bold border-b border-purple-600">
        LekkerCMMS
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.href}>
              <Link href={item.href}>
                <div
                  className={`flex items-center p-3 rounded-lg transition-all hover:bg-purple-600 ${
                    router.pathname === item.href ? 'bg-purple-800' : ''
                  }`}
                >
                  <span className="mr-3 text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="absolute bottom-0 w-full p-4 border-t border-purple-600">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center mr-3">
            <span>👤</span>
          </div>
          <div>
            <div className="font-medium">Admin User</div>
            <div className="text-xs text-purple-200">admin@lekkercmms.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}