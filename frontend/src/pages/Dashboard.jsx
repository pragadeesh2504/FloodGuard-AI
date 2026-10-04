import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import FloodGauge from '../components/FloodGauge';
import {
  ShieldAlert,
  AlertTriangle,
  Activity,
  CloudRain,
  Home,
  MessageSquare,
  Map,
  FileText,
  Download,
  RefreshCw,
  Radio,
  Clock,
  ChevronRight,
  Sliders,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [locations, setLocations] = useState([]);
  const [selectedLocId, setSelectedLocId] = useState(null);
  const [latestPredictions, setLatestPredictions] = useState({});
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [shelterSummary, setShelterSummary] = useState(null);
  const [operatingMode, setOperatingModeState] = useState("STANDARD");
  const [operatingThreshold, setOperatingThreshold] = useState(0.58);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  // WebSocket message receiver
  const handleWebSocketMessage = (data) => {
    if (data.type === 'MONITORING_UPDATE') {
      setLatestPredictions(prev => ({
        ...prev,
        [data.location_id]: {
          ...data.prediction,
          location_id: data.location_id,
          timestamp: data.timestamp,
        }
      }));
    } else if (data.type === 'OPERATING_MODE_CHANGED') {
      setOperatingModeState(data.operating_mode);
      setOperatingThreshold(data.threshold);
    } else if (data.type === 'INCIDENT_CREATED' || data.type === 'INCIDENT_STATUS_CHANGED') {
      fetchIncidents();
    } else if (data.type === 'NEW_CITIZEN_REPORT') {
      setPendingReportsCount(prev => prev + 1);
    }
  };

  useWebSocket(handleWebSocketMessage);

  const fetchIncidents = async () => {
    try {
      const res = await api.getIncidents();
      setIncidents(res.data);
    } catch (e) {
      console.error("Failed to load incidents", e);
    }
  };

  const loadData = async () => {
    try {
      const [locRes, predRes, alertRes, incRes, repRes, planRes, modeRes] = await Promise.all([
        api.getLocations(),
        api.getLatestPredictions(),
        api.getActiveAlerts(),
        api.getIncidents(),
        api.getCitizenReports({ verification_status: 'NEW' }),
        api.getEvacuationPlan(),
        api.getOperatingMode()
      ]);

      setLocations(locRes.data);
      if (locRes.data.length > 0 && !selectedLocId) {
        setSelectedLocId(locRes.data[0].id);
      }

      const predMap = {};
      predRes.data.forEach(p => {
        predMap[p.location_id] = p;
      });
      setLatestPredictions(predMap);
      setActiveAlerts(alertRes.data);
      setIncidents(incRes.data);
      setPendingReportsCount(repRes.data.length);
      setShelterSummary(planRes.data.summary);
      setOperatingModeState(modeRes.data.operating_mode);
      setOperatingThreshold(modeRes.data.threshold);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Failed to load command center data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleModeToggle = async () => {
    const nextMode = operatingMode === "STANDARD" ? "EMERGENCY" : "STANDARD";
    try {
      const res = await api.setOperatingMode(nextMode);
      setOperatingModeState(res.data.operating_mode);
      setOperatingThreshold(res.data.threshold);
      alert(`System switched to ${res.data.operating_mode} MODE (Threshold: ${res.data.threshold})`);
    } catch (err) {
      console.error("Failed to switch operating mode", err);
      alert("Mode change requires authorized operator account.");
    }
  };

  const handleExportSITREP = () => {
    const activeIncCount = incidents.filter(i => i.lifecycle_status !== 'RESOLVED').length;
    const highestRisk = Object.values(latestPredictions).reduce((max, p) =>
      (p.flood_probability > (max?.flood_probability || 0) ? p : max), null
    );

    const sitrepContent = `=====================================================
FLOODGUARD AI — OFFICIAL SITUATION REPORT (SITREP)
Generated: ${new Date().toISOString()}
Target Region: Tamil Nadu (10 Monitored Districts)
=====================================================

1. OPERATIONAL POSTURE:
   - Operating Mode: ${operatingMode}
   - Operational Decision Threshold: ${operatingThreshold}
   - Active Emergency Incidents: ${activeIncCount}
   - Active Warning Broadcasts (24h): ${activeAlerts.length}
   - Citizen Reports Awaiting Review: ${pendingReportsCount}

2. REGIONAL RELIEF CAPACITY:
   - Open Shelters: ${shelterSummary?.open_shelters || 4}
   - Total Beds: ${shelterSummary?.total_capacity || 1550}
   - Occupied Beds: ${shelterSummary?.total_occupied || 69}
   - Available Evacuation Space: ${shelterSummary?.total_available || 1481}
   - Utilization Rate: ${shelterSummary?.occupancy_rate_percent || 4.5}%

3. HIGHEST-THREAT DISTRICT:
   - District Location: ${highestRisk ? locations.find(l => l.id === highestRisk.location_id)?.name : "N/A"}
   - Model Probability: ${highestRisk ? (highestRisk.flood_probability * 100).toFixed(1) + "%" : "N/A"}
   - Threat Classification: ${highestRisk?.risk_level || "LOW"}

4. DISTRICT RISK MATRIX:
${locations.map(loc => {
  const p = latestPredictions[loc.id];
  return `   - ${loc.name.padEnd(16)}: Prob ${(p ? (p.flood_probability * 100).toFixed(1) : "0.0")}% | Level: ${(p?.risk_level || "LOW")}`;
}).join('\n')}

=====================================================
STATE DISASTER MANAGEMENT SURVEILLANCE & RESPONSE CELL
=====================================================`;

    const blob = new Blob([sitrepContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SITREP_TN_${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedLoc = locations.find(l => l.id === selectedLocId) || locations[0];
  const selectedPred = selectedLocId ? latestPredictions[selectedLocId] : null;

  // Compute Overall Threat Level
  const activeIncidents = incidents.filter(i => i.lifecycle_status !== 'RESOLVED');
  const hasCritical = activeIncidents.some(i => i.severity === 'CRITICAL') ||
                      Object.values(latestPredictions).some(p => p.risk_level === 'VERY_HIGH');
  const hasHigh = activeIncidents.some(i => i.severity === 'HIGH') ||
                  Object.values(latestPredictions).some(p => p.risk_level === 'HIGH');

  const overallPosture = hasCritical ? 'CRITICAL' : (hasHigh ? 'HIGH' : (activeIncidents.length > 0 ? 'MODERATE' : 'LOW'));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accentCyan" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Executive Threat Posture Bar */}
      <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 backdrop-blur-md shadow-xl ${
        overallPosture === 'CRITICAL' ? 'bg-red-950/30 border-red-800/80 text-red-200' :
        overallPosture === 'HIGH' ? 'bg-orange-950/30 border-orange-800/80 text-orange-200' :
        overallPosture === 'MODERATE' ? 'bg-amber-950/20 border-amber-800/80 text-amber-200' :
        'bg-slate-900/80 border-slate-800 text-slate-200'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Statewide Threat Posture
            </span>
            <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider border ${
              overallPosture === 'CRITICAL' ? 'bg-red-950 text-red-300 border-red-700 animate-pulse' :
              overallPosture === 'HIGH' ? 'bg-orange-950 text-orange-300 border-orange-700' :
              overallPosture === 'MODERATE' ? 'bg-yellow-950 text-yellow-300 border-yellow-700' :
              'bg-emerald-950 text-emerald-300 border-emerald-700'
            }`}>
              {overallPosture} ALERT LEVEL
            </span>
          </div>
          <h2 className="text-lg md:text-xl font-black text-white">
            Tamil Nadu Disaster Intelligence & Response Command Center
          </h2>
          <p className="text-xs text-slate-400">
            Real-time multi-district early warning &bull; Improved XGBoost (29 Features) &bull; Threshold &tau; = {operatingThreshold}
          </p>
        </div>

        {/* Operating Mode Status & Switch */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
              Active Operating Mode
            </div>
            <div className="text-xs font-black text-white">
              {operatingMode} MODE (&tau; {operatingThreshold})
            </div>
          </div>
          <button
            onClick={handleModeToggle}
            className={`px-3 py-2 rounded-xl text-xs font-extrabold transition shadow-md flex items-center gap-1.5 ${
              operatingMode === 'EMERGENCY'
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
          >
            <Sliders size={13} />
            {operatingMode === 'EMERGENCY' ? 'SWITCH TO STANDARD' : 'EMERGENCY MODE'}
          </button>
        </div>
      </div>

      {/* Operational KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Incidents */}
        <div
          onClick={() => navigate('/incidents')}
          className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 hover:border-slate-700 transition cursor-pointer backdrop-blur-md"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Open Incidents</span>
            <AlertTriangle size={16} className="text-hazardOrange" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {activeIncidents.length}
          </div>
          <div className="mt-1 text-[11px] text-cyan-400 flex items-center gap-1">
            <span>View Response Lifecycle</span>
            <ChevronRight size={12} />
          </div>
        </div>

        {/* Active Warning Alerts */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>24h Alerts</span>
            <Radio size={16} className="text-hazardRed" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {activeAlerts.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Emergency broadcasts active
          </div>
        </div>

        {/* Citizen Reports Awaiting Review */}
        <div
          onClick={() => navigate('/citizen')}
          className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 hover:border-slate-700 transition cursor-pointer backdrop-blur-md"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Citizen Queue</span>
            <MessageSquare size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white font-mono">
            {pendingReportsCount}
          </div>
          <div className="mt-1 text-[11px] text-cyan-400 flex items-center gap-1">
            <span>Awaiting verification</span>
            <ChevronRight size={12} />
          </div>
        </div>

        {/* Shelter Capacity Buffer */}
        <div
          onClick={() => navigate('/shelters')}
          className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 hover:border-slate-700 transition cursor-pointer backdrop-blur-md"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
            <span>Available Shelter</span>
            <Home size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400 font-mono">
            {shelterSummary?.total_available?.toLocaleString() || "1,481"}
          </div>
          <div className="mt-1 text-[11px] text-slate-400">
            Beds ready across {shelterSummary?.open_shelters || 4} camps
          </div>
        </div>
      </div>

      {/* Operational Quick Actions Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Activity size={15} className="text-accentCyan" />
          <span>Quick Actions:</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/incidents')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
          >
            <AlertTriangle size={13} className="text-hazardOrange" />
            Declare Incident
          </button>

          <button
            onClick={() => navigate('/map')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
          >
            <Map size={13} className="text-cyan-400" />
            Inspect Risk Map
          </button>

          <button
            onClick={() => navigate('/shelters')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
          >
            <Home size={13} className="text-emerald-400" />
            Evacuation Advisor
          </button>

          <button
            onClick={handleExportSITREP}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accentCyan hover:bg-cyan-500 text-slate-950 text-xs font-black shadow-md shadow-cyan-950/30 transition"
          >
            <Download size={13} />
            Export SITREP
          </button>
        </div>
      </div>

      {/* Priority District Matrix & Gauge Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* District Matrix */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
                Priority District Threat Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time ML probability rankings across all 10 monitored Tamil Nadu stations.
              </p>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              Threshold: {operatingThreshold}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="pb-3 px-3">District</th>
                  <th className="pb-3 px-3">Risk Level</th>
                  <th className="pb-3 px-3">Model Probability</th>
                  <th className="pb-3 px-3">24h Rain</th>
                  <th className="pb-3 px-3">Threshold Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {locations.map((loc) => {
                  const pred = latestPredictions[loc.id];
                  const prob = pred ? pred.flood_probability : 0.0;
                  const rain = pred?.weather_reading?.rainfall_24h || 0.0;
                  const isSelected = loc.id === selectedLocId;

                  return (
                    <tr
                      key={loc.id}
                      onClick={() => setSelectedLocId(loc.id)}
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
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {rain.toFixed(1)} mm
                      </td>
                      <td className="py-3 px-3">
                        {prob >= operatingThreshold ? (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <AlertCircle size={12} /> BREACHED
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle size={12} /> SAFE
                          </span>
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

        {/* Selected District Drill-down Panel */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                District Focus
              </span>
              <h3 className="text-lg font-black text-white">
                {selectedLoc ? selectedLoc.name : "Station"}
              </h3>
            </div>

            {/* Gauge */}
            <div className="flex justify-center py-2">
              <FloodGauge
                probability={selectedPred ? selectedPred.flood_probability : 0.05}
                riskLevel={selectedPred?.risk_level || "LOW"}
              />
            </div>

            {/* Explanations */}
            {selectedPred?.ai_explanation && selectedPred.ai_explanation.length > 0 && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 block tracking-wider">
                  Model Explanation:
                </span>
                <ul className="space-y-1 text-xs text-cyan-200/90 font-mono">
                  {selectedPred.ai_explanation.slice(0, 3).map((exp, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-accentCyan mt-0.5">&bull;</span>
                      <span>{exp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate('/map')}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-1.5 mt-4"
          >
            <Map size={14} className="text-cyan-400" />
            Drilldown on GIS Map
          </button>
        </div>
      </div>

      {/* Real Live Activity Feed (Backed by actual database events) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-hazardRed animate-pulse" />
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
              Live Surveillance & Advisory Stream
            </h3>
          </div>
          <span className="text-xs text-slate-400">Verified Database Log</span>
        </div>

        {activeAlerts.length === 0 && incidents.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No active emergencies or advisories logged in the last 24 hours.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
            {activeAlerts.map((a, idx) => (
              <div
                key={`alert-${idx}`}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-3 text-xs"
              >
                <AlertTriangle size={15} className="text-hazardRed shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{a.location_name} Alert Broadcast</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(a.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-slate-300 font-medium">{a.alert_content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
