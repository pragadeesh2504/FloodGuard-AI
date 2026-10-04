import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import HistoricalFloodReplay from '../components/HistoricalFloodReplay';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Calendar,
  CloudRain,
  Activity,
  Info,
  Layers,
  ChevronRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid
} from 'recharts';

const RiskTrends = () => {
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [latestPredictions, setLatestPredictions] = useState([]);
  const [predictionHistory, setPredictionHistory] = useState([]);
  const [weatherHistory, setWeatherHistory] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locRes, predRes, anRes] = await Promise.all([
          api.getLocations(),
          api.getLatestPredictions(),
          api.getAnalytics()
        ]);
        setLocations(locRes.data);
        setLatestPredictions(predRes.data);
        setAnalyticsData(anRes.data);
        if (locRes.data.length > 0) {
          setSelectedLocationId(locRes.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load trends data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchDistrictDetail = async () => {
      if (!selectedLocationId) return;
      try {
        const [histRes, wRes] = await Promise.all([
          api.getPredictionHistory(selectedLocationId),
          api.getWeatherHistory(selectedLocationId)
        ]);
        // Order chronologically for charts
        const reversedHist = [...histRes.data].reverse();
        setPredictionHistory(reversedHist);
        setWeatherHistory(wRes.data);
      } catch (err) {
        console.error("Failed to fetch district history", err);
      }
    };
    fetchDistrictDetail();
  }, [selectedLocationId]);

  const selectedLoc = locations.find(l => l.id === selectedLocationId) || locations[0];
  const selectedLatest = latestPredictions.find(p => p.location_id === selectedLocationId);

  // Compute 24h probability change for selected district
  let probChange = 0.0;
  let trendDirection = 'STABLE';
  if (predictionHistory.length >= 2) {
    const latestP = predictionHistory[predictionHistory.length - 1].flood_probability;
    const prevP = predictionHistory[predictionHistory.length - 2].flood_probability;
    probChange = latestP - prevP;
    if (probChange > 0.05) trendDirection = 'INCREASING';
    else if (probChange < -0.05) trendDirection = 'DECREASING';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accentCyan" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2.5">
          <TrendingUp size={24} className="text-accentCyan" />
          <h2 className="text-xl md:text-2xl font-black tracking-wide text-white">
            Short-Term Risk Monitoring & Hydrological Trajectories
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Observational rate-of-change indicators and multi-district historical risk curves (UNDERSTAND & DECIDE Phase).
        </p>
      </div>

      {/* Mandatory Scope & Methodology Notice */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1 backdrop-blur-md">
        <div className="flex items-center gap-2 text-cyan-300 font-extrabold text-[11px] uppercase tracking-wider">
          <Info size={15} />
          <span>SCOPE NOTICE — SHORT-TERM RISK MONITORING ONLY</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          This module tracks how hydrological stress and model-estimated flood risk are evolving over recent daily monitoring intervals. It does <strong>NOT</strong> present unvalidated 6-hour, 12-hour, or 24-hour forward forecasts.
        </p>
      </div>

      {/* Multi-District Risk Trajectory Summary Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
            Statewide District Risk Trajectories (10 Stations)
          </h3>
          <span className="text-xs text-slate-400">Select district to inspect chart</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="pb-3 px-3">District</th>
                <th className="pb-3 px-3">Current Risk Level</th>
                <th className="pb-3 px-3">Model Probability</th>
                <th className="pb-3 px-3">24h Trajectory</th>
                <th className="pb-3 px-3">Standard (&tau; 0.58)</th>
                <th className="pb-3 px-3">Emergency (&tau; 0.33)</th>
                <th className="pb-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {locations.map((loc) => {
                const pred = latestPredictions.find(p => p.location_id === loc.id);
                const prob = pred ? pred.flood_probability : 0.0;
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
                    <td className="py-3 px-3 font-mono font-bold text-accentCyan">
                      {(prob * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-3">
                      {prob >= 0.58 ? (
                        <span className="flex items-center gap-1 text-red-400 font-bold text-[11px]">
                          <TrendingUp size={13} /> ESCALATING
                        </span>
                      ) : prob >= 0.33 ? (
                        <span className="flex items-center gap-1 text-amber-400 font-bold text-[11px]">
                          <TrendingUp size={13} /> ELEVATED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                          <Minus size={13} /> STABLE
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {prob >= 0.58 ? (
                        <span className="text-red-400 font-bold">BREACHED</span>
                      ) : (
                        <span className="text-slate-400">NORMAL</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {prob >= 0.33 ? (
                        <span className="text-amber-400 font-bold">ACTIVE</span>
                      ) : (
                        <span className="text-slate-400">NORMAL</span>
                      )}
                    </td>
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

      {/* Selected District Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Probability Trajectory Chart */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
              Model Risk Probability Curve — {selectedLoc ? selectedLoc.name : "Station"}
            </h3>
            <span className="text-xs text-slate-400">Chronological history</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={predictionHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(t) => {
                    if (!t) return '';
                    const d = new Date(t);
                    return `${d.getMonth()+1}/${d.getDate()}`;
                  }}
                />
                <YAxis domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                  formatter={(val) => [`${(val * 100).toFixed(1)}%`, 'Probability']}
                />
                <ReferenceLine y={0.58} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Std 0.58', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={0.33} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Emg 0.33', fill: '#f59e0b', fontSize: 10 }} />
                <Line type="monotone" dataKey="flood_probability" stroke="#06b6d4" strokeWidth={2.5} dot={{ r: 2 }} name="Probability" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rainfall History Chart */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
              Precipitation Accumulation — {selectedLoc ? selectedLoc.name : "Station"}
            </h3>
            <span className="text-xs text-slate-400">Observed 24h (mm)</span>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weatherHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="timestamp"
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(t) => {
                    if (!t) return '';
                    const d = new Date(t);
                    return `${d.getMonth()+1}/${d.getDate()}`;
                  }}
                />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} unit=" mm" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                />
                <Bar dataKey="rainfall_24h" fill="#38bdf8" radius={[4, 4, 0, 0]} name="Precipitation" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Embedded Historical Flood Replay */}
      <HistoricalFloodReplay />
    </div>
  );
};

export default RiskTrends;
