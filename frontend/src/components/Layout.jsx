import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  LayoutDashboard,
  Activity,
  Map,
  AlertTriangle,
  Home,
  MessageSquare,
  TrendingUp,
  Cpu,
  Settings,
  LogOut,
  LogIn,
  Radio
} from 'lucide-react';

const Layout = ({ children, alertList = [] }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navSections = [
    {
      title: 'COMMAND',
      items: [
        { name: 'Command Center', path: '/', icon: LayoutDashboard },
        { name: 'Live Monitor', path: '/monitor', icon: Activity },
        { name: 'Flood Risk Map', path: '/map', icon: Map },
      ]
    },
    {
      title: 'RESPONSE',
      items: [
        { name: 'Alerts & Incidents', path: '/incidents', icon: AlertTriangle },
        { name: 'Shelters & Evacuation', path: '/shelters', icon: Home },
        { name: 'Citizen Reports', path: '/citizen', icon: MessageSquare },
      ]
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { name: 'Risk Trends', path: '/trends', icon: TrendingUp },
        { name: 'Model Intelligence', path: '/model-intelligence', icon: Cpu },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { name: 'Administration', path: '/admin', icon: Settings, adminOnly: true },
      ]
    }
  ];

  return (
    <div className="flex min-h-screen bg-darkBg text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-md flex flex-col z-20 shrink-0">
        {/* Brand */}
        <div className="p-5 flex items-center gap-3 border-b border-slate-900">
          <div className="p-2.5 bg-cyan-950/90 border border-cyan-700/80 rounded-xl text-accentCyan shadow-lg shadow-cyan-950/50">
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-wide bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
              FloodGuard AI
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block">
              Disaster Intelligence
            </span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
          {navSections.map((section) => {
            const filteredItems = section.items.filter(item => !item.adminOnly || (user && user.role === 'admin'));
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.title} className="space-y-1">
                <div className="px-3 text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                  {section.title}
                </div>
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      to={item.path}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                        isActive
                          ? 'bg-accentCyan/15 text-accentCyan border-l-4 border-accentCyan shadow-inner font-bold'
                          : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                      }`}
                    >
                      <Icon size={16} className={isActive ? 'text-accentCyan' : 'text-slate-400'} />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Footer Auth Control */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/50">
          {user ? (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 px-1">
                <div className="h-8 w-8 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center font-bold text-accentCyan text-xs">
                  {user.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-slate-200 truncate">{user.username}</p>
                  <p className="text-[10px] text-cyan-400 font-semibold capitalize tracking-wide">{user.role} Operator</p>
                </div>
              </div>
              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-slate-800 hover:border-red-900/50 hover:bg-red-950/20 text-slate-400 hover:text-red-400 text-xs font-semibold transition-all"
              >
                <LogOut size={13} />
                LOGOUT
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-accentCyan hover:bg-cyan-500 text-slate-950 text-xs font-extrabold transition-all shadow-md shadow-cyan-950/20"
            >
              <LogIn size={14} />
              SYSTEM LOGIN
            </button>
          )}
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar with active warnings */}
        <header className="h-14 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 text-hazardOrange font-extrabold text-[11px] tracking-wider uppercase whitespace-nowrap bg-hazardOrange/10 px-2.5 py-1 rounded-full border border-hazardOrange/30">
              <Radio size={12} className="animate-pulse" />
              Live Alerts
            </div>

            <div className="overflow-hidden relative w-full h-5 flex items-center">
              <div className="animate-marquee whitespace-nowrap flex gap-8 text-xs font-semibold text-slate-300">
                {alertList.length > 0 ? (
                  alertList.map((a, idx) => (
                    <span key={idx} className="flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-hazardRed shrink-0" />
                      {a.alert_content}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400 flex items-center gap-1.5">
                    🛡️ All 10 monitored Tamil Nadu districts are reporting normal parameters. Active surveillance running.
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 ml-4">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase">
              24/7 Engine Online
            </span>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
