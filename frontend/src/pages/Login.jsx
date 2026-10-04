import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Key, User, Mail, Sparkles } from 'lucide-react';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('citizen');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(username, password);
        navigate('/');
      } else {
        await register(username, email, password, role);
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Authentication failed. Verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-darkBg px-4">
      {/* Background radial glow */}
      <div className="absolute inset-0 bg-radial-gradient(circle at center, rgba(6,182,212,0.08) 0%, transparent 70%) pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl relative overflow-hidden">
        {/* Top Decorative bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accentCyan via-accentBlue to-accentCyan" />

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-cyan-950/60 border border-cyan-800/40 rounded-2xl text-accentCyan mb-4 shadow-lg shadow-cyan-950/30">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-2xl font-bold tracking-wider text-slate-100 uppercase">
            FloodGuard AI
          </h2>
          <p className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-semibold">
            National Surveillance Command Portal
          </p>
        </div>

        {error && (
          <div className={`p-4 rounded-xl border text-sm mb-6 ${
            error.includes('successful')
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400'
              : 'bg-red-950/20 border-red-500/30 text-red-400'
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
              Username
            </label>
            <div className="relative">
              <User size={16} className="absolute left-4 top-3.5 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accentCyan/60 focus:ring-1 focus:ring-accentCyan/30 text-sm transition-all duration-200"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-3.5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accentCyan/60 focus:ring-1 focus:ring-accentCyan/30 text-sm transition-all duration-200"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Key size={16} className="absolute left-4 top-3.5 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter secure password"
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-accentCyan/60 focus:ring-1 focus:ring-accentCyan/30 text-sm transition-all duration-200"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
                Portal Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-accentCyan/60 text-sm"
              >
                <option value="citizen">Citizen User</option>
                <option value="admin">Administrator (NDMA/SDMA)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-accentCyan hover:bg-cyan-500 text-slate-950 font-extrabold text-sm rounded-xl tracking-wider uppercase transition-all duration-200 shadow-lg shadow-cyan-950/20 disabled:opacity-50 mt-6"
          >
            <Sparkles size={16} />
            {loading ? 'Processing...' : isLogin ? 'Authenticate Access' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-slate-400 hover:text-accentCyan font-semibold underline"
          >
            {isLogin ? "Need a portal account? Register here" : "Already have an account? Login here"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
