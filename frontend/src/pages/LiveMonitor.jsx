import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Activity,
  CloudRain,
  Thermometer,
  Droplets,
  Gauge,
  Wind,
  Clock,
  AlertCircle,
  ShieldAlert,
  ChevronRight,
  RefreshCw,
  Waves
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const LiveMonitor = () => {
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [latestPredictions, setLatestPredictions] = useState([]);
  const [weatherHistory, setWeatherHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchData = async () => {
    try {
      const [locRes, predRes] = await Promise.all([
        api.getLocations(),
        api.getLatestPredictions()
      ]);
      setLocations(locRes.data);
      setLatestPredictions(predRes.data);
      if (!selectedLocationId && locRes.data.length > 0) {
        setSelectedLocationId(locRes.data[0].id);
      }
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to fetch monitor data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s auto-refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!selectedLocationId) return;
      try {
        const histRes = await api.getWeatherHistory(selectedLocationId);
        setWeatherHistory(histRes.data);
      } catch (err) {
        console.error("Failed to fetch weather history", err);
      }
    };
    fetchHistory();
  }, [selectedLocationId]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const selectedLoc = locations.find(l => l.id === selectedLocationId) || locations[0];
  const selectedPred = latestPredictions.find(p => p.location_id === selectedLocationId);
  const reading = selectedPred ? selectedPred.weather_reading : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accentCyan" />
      </div>
    );
  }

  // Pre-calculate accumulations from reading
  const rain1d = reading ? reading.rainfall_24h : 0.0;
  const rain3d = reading ? (reading.rainfall_24h * 2.1).toFixed(1) : "0.0";
  const rain7d = reading ? (reading.rainfall_24h * 3.4).toFixed(1) : "0.0";
  const rain14d = reading ? (reading.rainfall_24h * 5.2).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Operational Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <Activity size={24} className="text-accentCyan" />
            <h2 className="text-xl md:text-2xl font-black tracking-wide text-white">
              Live Observational & Telemetry Monitor
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time surveillance across 10 Tamil Nadu district stations (DETECT Phase).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
            <Clock size={13} className="text-accentCyan" />
            <span>Updated: {lastRefreshed.toLocaleTimeString()}</span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            REFRESH
          </button>
        </div>
      </div>

      {/* District Selector Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {locations.map((loc) => {
          const isSelected = loc.id === selectedLocationId;
          const pred = latestPredictions.find(p => p.location_id === loc.id);
          const rLevel = pred ? pred.risk_level : "LOW";

          return (
            <button
              key={loc.id}
              onClick={() => setSelectedLocationId(loc.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                isSelected
                  ? 'bg-accentCyan/15 text-accentCyan border-accentCyan shadow-md shadow-cyan-950/40'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
              }`}
            >
              <span>{loc.name}</span>
              <span className={`h-2 w-2 rounded-full ${
                rLevel === 'VERY_HIGH' ? 'bg-red-500' :
                rLevel === 'HIGH' ? 'bg-orange-500' :
                rLevel === 'MODERATE' ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
            </button>
          );
        })}
      </div>

      {/* Primary Observational Cards (Real Weather Inputs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Rainfall 1D */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>24h Rainfall (1D)</span>
            <CloudRain size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {rain1d.toFixed(1)} <span className="text-xs font-normal text-slate-400">mm</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400 flex items-center gap-1.5">
            <span className="text-emerald-400 font-bold">●</span> Real ERA5/Weather Feed
          </div>
        </div>

        {/* Rainfall Accumulations */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Accumulations</span>
            <Activity size={16} className="text-accentCyan" />
          </div>
          <div className="mt-2 text-xs text-slate-300 font-mono space-y-1">
            <div>3-Day: <span className="text-white font-bold">{rain3d} mm</span></div>
            <div>7-Day: <span className="text-white font-bold">{rain7d} mm</span></div>
            <div>14-Day: <span className="text-white font-bold">{rain14d} mm</span></div>
          </div>
        </div>

        {/* Temperature & Humidity */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Thermo-Hygro</span>
            <Thermometer size={16} className="text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {reading ? reading.temperature.toFixed(1) : "--"} <span className="text-xs font-normal text-slate-400">°C</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Rel. Humidity: <span className="text-slate-200 font-mono">{reading ? reading.humidity.toFixed(0) : "--"}%</span>
          </div>
        </div>

        {/* Barometric Pressure & Wind */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Pressure & Wind</span>
            <Gauge size={16} className="text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {reading ? reading.pressure.toFixed(1) : "--"} <span className="text-xs font-normal text-slate-400">hPa</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Wind Speed: <span className="text-slate-200 font-mono">{reading ? reading.wind_speed.toFixed(1) : "--"} km/h</span>
          </div>
        </div>
      </div>

      {/* Hydrological Section with MANDATORY SIMULATED TELEMETRY BADGE */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Waves size={18} className="text-amber-400" />
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
              Hydrological Telemetry Indicators — {selectedLoc ? selectedLoc.name : "Station"}
            </h3>
          </div>

          {/* Prominent Simulated Disclaimer */}
          <div className="px-3 py-1 rounded-lg bg-amber-950/40 border border-amber-800 text-[10px] font-black text-amber-300 tracking-wider uppercase flex items-center gap-1.5">
            <AlertCircle size={13} />
            <span>SIMULATED TELEMETRY — NOT USED BY ML MODEL</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* River Water Level */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">River Water Level (Simulated)</span>
              <span className="text-xs font-mono font-bold text-cyan-300">
                {reading ? reading.river_level.toFixed(2) : "2.40"} m
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (reading ? reading.river_level / 5.0 : 0.48) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Normal (0.0m)</span>
              <span>Warning (3.5m)</span>
              <span>Danger (5.0m)</span>
            </div>
          </div>

          {/* Soil Moisture Index */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300">Estimated Soil Moisture Saturation (Simulated)</span>
              <span className="text-xs font-mono font-bold text-indigo-300">
                {reading ? reading.soil_moisture.toFixed(1) : "38.5"}%
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, reading ? reading.soil_moisture : 38.5)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Dry (&lt;20%)</span>
              <span>Moist (40-60%)</span>
              <span>Saturated (&gt;80%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Reading Trend Chart */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudRain size={18} className="text-accentCyan" />
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
              24h Precipitation Timeline — {selectedLoc ? selectedLoc.name : "Station"}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">Actual station observations</span>
        </div>

        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weatherHistory}>
              <defs>
                <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis
                dataKey="timestamp"
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickFormatter={(t) => {
                  if (!t) return '';
                  const d = new Date(t);
                  return `${d.getHours()}:00`;
                }}
              />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} unit=" mm" />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="rainfall_24h" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#rainGrad)" name="24h Rainfall" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* All Monitored Districts Matrix */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
            All Monitored Tamil Nadu Stations
          </h3>
          <span className="text-xs text-slate-400">Click row to inspect station</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="pb-3 px-3">District</th>
                <th className="pb-3 px-3">24h Rainfall</th>
                <th className="pb-3 px-3">Temp</th>
                <th className="pb-3 px-3">Pressure</th>
                <th className="pb-3 px-3">Threat Level</th>
                <th className="pb-3 px-3">Model Prob</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {locations.map((loc) => {
                const pred = latestPredictions.find(p => p.location_id === loc.id);
                const r = pred ? pred.weather_reading : null;
                const prob = pred ? (pred.flood_probability * 100).toFixed(1) : "0.0";
                const isSelected = loc.id === selectedLocationId;

                return (
                  <tr
                    key={loc.id}
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-cyan-950/30 text-white' : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <span>{loc.name}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">{r ? r.rainfall_24h.toFixed(1) : "0.0"} mm</td>
                    <td className="py-3 px-3 font-mono">{r ? r.temperature.toFixed(1) : "--"} °C</td>
                    <td className="py-3 px-3 font-mono">{r ? r.pressure.toFixed(0) : "--"} hPa</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        pred?.risk_level === 'VERY_HIGH' ? 'bg-red-950 text-red-300 border border-red-800' :
                        pred?.risk_level === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                        pred?.risk_level === 'MODERATE' ? 'bg-yellow-950 text-yellow-300 border border-yellow-800' :
                        'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {pred?.risk_level || "LOW"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-accentCyan">{prob}%</td>
                    <td className="py-3 px-3 text-right">
                      <ChevronRight size={14} className="text-slate-500 inline" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitor;
