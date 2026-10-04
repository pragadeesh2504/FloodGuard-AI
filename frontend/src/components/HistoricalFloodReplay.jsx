import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  CloudRain,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Activity,
  Info,
  Clock
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

const HistoricalFloodReplay = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('cuddalore_2021');
  const [eventData, setEventData] = useState(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load events list on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.getReplayEvents();
        setEvents(res.data);
      } catch (err) {
        console.error("Failed to load replay events", err);
      }
    };
    fetchEvents();
  }, []);

  // Load event details when selectedEventId changes
  useEffect(() => {
    const fetchEventDetail = async () => {
      setLoading(true);
      setError(null);
      setIsPlaying(false);
      try {
        const res = await api.getReplayDetail(selectedEventId);
        setEventData(res.data);
        setCurrentDayIndex(0);
      } catch (err) {
        console.error("Failed to fetch replay detail", err);
        setError("Could not load historical event sequence.");
      } finally {
        setLoading(false);
      }
    };
    if (selectedEventId) {
      fetchEventDetail();
    }
  }, [selectedEventId]);

  // Auto-play timeline timer
  useEffect(() => {
    let timer = null;
    if (isPlaying && eventData && eventData.sequence) {
      timer = setInterval(() => {
        setCurrentDayIndex((prev) => {
          if (prev >= eventData.sequence.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500); // 1.5 seconds per day
    }
    return () => clearInterval(timer);
  }, [isPlaying, eventData]);

  if (loading) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accentCyan" />
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <p className="text-red-400 font-semibold">{error || "No replay data available."}</p>
      </div>
    );
  }

  const currentDay = eventData.sequence[currentDayIndex] || eventData.sequence[0];

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-md">
      {/* Header & Event Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Clock size={20} className="text-accentCyan" />
            <h3 className="text-lg font-extrabold text-white tracking-wide">
              Historical Flood Replay & Validation
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Day-by-day reconstruction using actual ERA5 meteorological observations and Improved XGBoost model inference.
          </p>
        </div>

        {/* Event Select Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Event:
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-accentCyan"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Methodology Classification Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
        eventData.is_out_of_sample
          ? 'bg-emerald-950/20 border-emerald-800/60 text-emerald-300'
          : 'bg-amber-950/20 border-amber-800/60 text-amber-300'
      }`}>
        <div className="flex items-start gap-3">
          <Info size={18} className="shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold tracking-widest uppercase border border-current">
              {eventData.methodology_label}
            </span>
            <p className="text-xs font-medium text-slate-300 mt-1">
              {eventData.description}
            </p>
          </div>
        </div>
        <div className="text-right text-[11px] font-bold text-slate-400 shrink-0">
          Peak Rain: <span className="text-white font-mono">{eventData.peak_rainfall} mm</span> | Peak Risk: <span className="text-accentCyan font-mono">{(eventData.peak_probability * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Scrubber Controls */}
      <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-accentCyan" />
            <span className="text-sm font-extrabold text-white font-mono">
              Day {currentDayIndex + 1} of {eventData.total_days}: {currentDay.date}
            </span>
            {currentDay.is_documented_flood && (
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-950 border border-red-800 text-red-300 uppercase">
                Documented Flood Day
              </span>
            )}
          </div>

          {/* Playback Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentDayIndex(0)}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
              title="Reset to start"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={() => setCurrentDayIndex(prev => Math.max(0, prev - 1))}
              disabled={currentDayIndex === 0}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 disabled:opacity-30"
              title="Previous day"
            >
              <SkipBack size={14} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accentCyan hover:bg-cyan-500 text-slate-950 text-xs font-extrabold shadow-md shadow-cyan-950/20"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              {isPlaying ? 'PAUSE' : 'PLAY'}
            </button>
            <button
              onClick={() => setCurrentDayIndex(prev => Math.min(eventData.sequence.length - 1, prev + 1))}
              disabled={currentDayIndex === eventData.sequence.length - 1}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 disabled:opacity-30"
              title="Next day"
            >
              <SkipForward size={14} />
            </button>
          </div>
        </div>

        {/* Timeline Slider */}
        <input
          type="range"
          min="0"
          max={eventData.sequence.length - 1}
          value={currentDayIndex}
          onChange={(e) => setCurrentDayIndex(Number(e.target.value))}
          className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
        />
      </div>

      {/* Snapshot Cards for the selected day */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Daily Precipitation */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Daily Rainfall</span>
            <CloudRain size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {currentDay.rainfall_1d} <span className="text-xs font-normal text-slate-400">mm</span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            3-Day: <span className="text-slate-200 font-mono">{currentDay.rainfall_3d} mm</span> | 7-Day: <span className="text-slate-200 font-mono">{currentDay.rainfall_7d} mm</span>
          </div>
        </div>

        {/* Model Flood Probability */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Model Probability</span>
            <Activity size={16} className="text-accentCyan" />
          </div>
          <div className="mt-2 text-2xl font-black text-accentCyan font-mono">
            {(currentDay.flood_probability * 100).toFixed(1)}%
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Standard (&tau; 0.58): {currentDay.standard_breached ? <span className="text-red-400 font-bold">BREACHED</span> : <span className="text-emerald-400 font-bold">SAFE</span>}
          </div>
        </div>

        {/* Risk Classification */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Threat Classification</span>
            <AlertTriangle size={16} className={currentDay.flood_probability >= 0.58 ? "text-hazardRed" : "text-amber-400"} />
          </div>
          <div className="mt-2">
            <span className={`inline-block px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
              currentDay.risk_level === 'VERY_HIGH' ? 'bg-red-950 text-red-300 border border-red-800' :
              currentDay.risk_level === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
              currentDay.risk_level === 'MODERATE' ? 'bg-yellow-950 text-yellow-300 border border-yellow-800' :
              'bg-emerald-950 text-emerald-300 border border-emerald-800'
            }`}>
              {currentDay.risk_level}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Emergency (&tau; 0.33): {currentDay.emergency_breached ? <span className="text-amber-400 font-bold">ALERT</span> : <span className="text-emerald-400 font-bold">NORMAL</span>}
          </div>
        </div>

        {/* Atmospheric Context */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase">
            <span>Atmospheric Indices</span>
            <ShieldCheck size={16} className="text-slate-400" />
          </div>
          <div className="mt-2 text-xs text-slate-300 space-y-1 font-mono">
            <div>Pressure: {currentDay.pressure} hPa</div>
            <div>Humidity: {currentDay.humidity}%</div>
            <div>Wind Speed: {currentDay.wind_speed} km/h</div>
          </div>
        </div>
      </div>

      {/* Contributing Risk Factors */}
      {currentDay.contributing_factors && currentDay.contributing_factors.length > 0 && (
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
          <h4 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider mb-2">
            Model Explanation for {currentDay.date}:
          </h4>
          <ul className="space-y-1.5">
            {currentDay.contributing_factors.map((factor, idx) => (
              <li key={idx} className="text-xs text-cyan-200/90 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0" />
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Trajectory Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Rainfall Evolution Bar Chart */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              Rainfall Evolution (mm/day)
            </span>
            <span className="text-[10px] text-slate-400">ERA5 Historical Record</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eventData.sequence}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} unit="mm" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                />
                <Bar dataKey="rainfall_1d" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Precipitation" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Flood Probability Evolution Line Chart */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
              Model Probability Evolution
            </span>
            <span className="text-[10px] text-slate-400">Improved XGBoost</span>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={eventData.sequence}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                  formatter={(val) => [`${(val * 100).toFixed(1)}%`, 'Probability']}
                />
                <ReferenceLine y={0.58} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Std 0.58', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={0.33} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Emg 0.33', fill: '#f59e0b', fontSize: 10 }} />
                <Line type="monotone" dataKey="flood_probability" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 6 }} name="Probability" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalFloodReplay;
