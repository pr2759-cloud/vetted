import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, TrendingUp, HelpCircle, Check, MessageCircle } from 'lucide-react';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: 'Discover', icon: Search },
    { path: '/trending', label: 'Trending Products', icon: TrendingUp },
    { path: '/chat', label: 'AI Assistant', icon: MessageCircle },
    { path: '/about', label: 'How It Works', icon: HelpCircle },
  ];

  const isActive = (path: string) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/search')) {
      return true;
    }
    return location.pathname === path;
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <motion.div 
              className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Check className="w-4 h-4 text-white" strokeWidth={3} />
            </motion.div>
            <span className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
              Vetted
            </span>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative px-3 py-2 text-sm font-medium transition-colors hover:text-primary-600"
                >
                  <span
                    className={`flex items-center space-x-2 ${
                      active 
                        ? 'text-gray-900' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:block">{item.label}</span>
                  </span>
                  
                  {/* Active indicator */}
                  {active && (
                    <motion.div
                      layoutId="activeNavItem"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-full"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
};