'use client';

import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Hide navbar on login and register pages
  if (pathname === '/login' || pathname === '/register') return null;

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2 text-xl font-bold hover:text-blue-300 transition-colors">
              <span className="text-2xl">💰</span>
              <span>Expense Tracker</span>
            </Link>
          </div>

          {/* Navigation Links - Only show when authenticated */}
          {/* {session && (
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/expenses"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/expenses') 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                All Expenses
              </Link>
              <Link
                href="/analytics"
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive('/analytics') 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                }`}
              >
                Analytics
              </Link>
            </div>
          )} */}

          {/* User Section */}
          <div className="flex items-center">
            {session ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-gray-800 hover:bg-gray-700 px-3 py-2 transition-colors"
                >
                  {/* User Avatar */}
                  <div className="relative">
                    {session.user?.image ? (
                      <img
                        className="h-8 w-8 rounded-full object-cover border-2 border-gray-600"
                        src={session.user.image}
                        alt={session.user.name || 'User avatar'}
                        onError={(e) => {
                          console.log('Image failed to load:', session.user?.image);
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                          (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                        }}
                        onLoad={() => console.log('Image loaded successfully:', session.user?.image)}
                      />
                    ) : null}
                    
                    {/* Fallback avatar - always render but hide if image loads */}
                    <div 
                      className={`h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm border-2 border-gray-600 ${
                        session.user?.image ? 'hidden' : 'flex'
                      }`}
                      style={{ display: session.user?.image ? 'none' : 'flex' }}
                    >
                      {session.user?.name?.charAt(0).toUpperCase() || session.user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    
                    {/* Online indicator */}
                    <div className="absolute -bottom-0 -right-0 h-3 w-3 bg-green-400 border-2 border-gray-900 rounded-full"></div>
                  </div>
                  
                  {/* User Name */}
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-white">
                      {session.user?.name || 'User'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {session.user?.email}
                    </div>
                  </div>
                  
                  {/* Dropdown Arrow */}
                  <svg
                    className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-200">
                    <div className="py-2">
                      {/* User Info Section */}
                      <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          {session.user?.image ? (
                            <img
                              className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
                              src={session.user.image}
                              alt={session.user.name || 'User avatar'}
                              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                                (e.currentTarget.nextElementSibling as HTMLElement).style.display = 'flex';
                              }}
                            />
                          ) : null}
                          
                          {/* Fallback avatar for dropdown */}
                          <div 
                            className={`h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg ring-2 ring-white shadow-sm ${
                              session.user?.image ? 'hidden' : 'flex'
                            }`}
                            style={{ display: session.user?.image ? 'none' : 'flex' }}
                          >
                            {session.user?.name?.charAt(0).toUpperCase() || session.user?.email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">
                              {session.user?.name || 'User'}
                            </div>
                            <div className="text-xs text-gray-600 truncate">
                              {session.user?.email}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Links for Mobile */}
                      <div className="md:hidden py-2">
                        <Link
                          href="/"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <span className="mr-3">🏠</span>
                          <span>Dashboard</span>
                        </Link>
                        <Link
                          href="/expenses"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <span className="mr-3">📊</span>
                          <span>All Expenses</span>
                        </Link>
                        <Link
                          href="/analytics"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <span className="mr-3">📈</span>
                          <span>Analytics</span>
                        </Link>
                        <div className="border-t border-gray-200 my-2"></div>
                      </div>

                      {/* Profile & Settings */}
                      <div className="py-2">
                        <Link
                          href="/profile"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <span className="mr-3">👤</span>
                          <span>Profile Settings</span>
                        </Link>
                        
                        <Link
                          href="/settings"
                          className="flex items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <span className="mr-3">⚙️</span>
                          <span>Preferences</span>
                        </Link>
                      </div>

                      <div className="border-t border-gray-200"></div>
                      
                      {/* Sign Out */}
                      <div className="py-2">
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            handleSignOut();
                          }}
                          className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                        >
                          <span className="mr-3">🚪</span>
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/api/auth/signin"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        ></div>
      )}
    </nav>
  );
}