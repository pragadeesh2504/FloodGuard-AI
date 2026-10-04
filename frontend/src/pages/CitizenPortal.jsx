import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  MapPin,
  AlertOctagon,
  CheckCircle,
  Clock,
  Phone,
  Compass,
  ShieldAlert,
  Filter,
  FileText,
  ArrowUpRight,
  Info
} from 'lucide-react';

const CATEGORIES = [
  { id: 'waterlogging', label: 'Waterlogging' },
  { id: 'river overflow', label: 'River Overflow' },
  { id: 'road blocked', label: 'Road Blocked' },
  { id: 'drain overflow', label: 'Drain Overflow' },
  { id: 'house flooding', label: 'House Flooding' },
  { id: 'bridge risk', label: 'Bridge Risk' },
  { id: 'other', label: 'Other Hazard' }
];

const STATUS_BADGES = {
  NEW: 'bg-blue-950 text-blue-300 border-blue-800',
  VERIFIED: 'bg-emerald-950 text-emerald-300 border-emerald-800',
  REJECTED: 'bg-slate-900 text-slate-400 border-slate-700',
  DUPLICATE: 'bg-purple-950 text-purple-300 border-purple-800',
  ESCALATED: 'bg-red-950 text-red-300 border-red-800 font-black'
};

const CitizenPortal = () => {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [locationId, setLocationId] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Moderate');
  const [category, setCategory] = useState('waterlogging');
  const [imageUrl, setImageUrl] = useState('');

  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [showTestRecords, setShowTestRecords] = useState(false);

  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsFetching, setGpsFetching] = useState(false);
  const [escalatingId, setEscalatingId] = useState(null);

  const loadData = async () => {
    try {
      const [locRes, repRes] = await Promise.all([
        api.getLocations(),
        api.getCitizenReports()
      ]);
      setLocations(locRes.data);
      if (locRes.data.length > 0 && !locationId) {
        setLocationId(locRes.data[0].id);
        setLatitude(locRes.data[0].latitude.toString());
        setLongitude(locRes.data[0].longitude.toString());
      }
      setReports(repRes.data);
    } catch (err) {
      console.error("Error loading citizen reports data", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleLocationChange = (e) => {
    const locId = Number(e.target.value);
    setLocationId(locId);
    const matched = locations.find(l => l.id === locId);
    if (matched) {
      setLatitude(matched.latitude.toString());
      setLongitude(matched.longitude.toString());
    }
  };

  const fetchGPSLocation = () => {
    if (!navigator.geolocation) {
      alert("GPS Geolocation is not supported by your browser");
      return;
    }
    setGpsFetching(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        setGpsFetching(false);
      },
      (err) => {
        console.error("GPS retrieval error", err);
        alert("Could not fetch GPS location. Please enter coordinates or select district.");
        setGpsFetching(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!locationId || !description.trim()) {
      alert("Please fill in location and description.");
      return;
    }
    setLoading(true);
    setSuccessMsg('');
    try {
      await api.submitReport({
        location_id: Number(locationId),
        latitude: parseFloat(latitude) || 13.0827,
        longitude: parseFloat(longitude) || 80.2707,
        description,
        severity,
        category,
        image_url: imageUrl || null
      });
      setSuccessMsg("Your report has been logged and queued for emergency operator verification.");
      setDescription('');
      setImageUrl('');
      await loadData();
    } catch (err) {
      console.error("Failed to submit citizen report", err);
      alert("Submission failed. Please check network connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId, newStatus) => {
    try {
      await api.updateReportStatus(reportId, newStatus);
      await loadData();
    } catch (err) {
      console.error("Failed to update report status", err);
      alert("Status update failed. Admin privileges may be required.");
    }
  };

  const handleEscalateToIncident = async (reportId) => {
    if (!window.confirm("Escalate this verified citizen report into an active response incident?")) {
      return;
    }
    setEscalatingId(reportId);
    try {
      const res = await api.escalateReport(reportId);
      alert(`Report successfully escalated to Incident #${res.data.id}!`);
      await loadData();
    } catch (err) {
      console.error("Failed to escalate report", err);
      alert("Escalation failed.");
    } finally {
      setEscalatingId(null);
    }
  };

  const filteredReports = reports.filter(r => {
    if (!showTestRecords) {
      const desc = (r.description || '').toLowerCase();
      if (desc.includes('test') || desc.includes('diagnostic') || desc.includes('automated')) {
        return false;
      }
    }
    if (statusFilter !== 'ALL' && (r.verification_status || 'NEW') !== statusFilter) return false;
    if (categoryFilter !== 'ALL' && (r.category || 'waterlogging') !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <AlertOctagon size={24} className="text-accentCyan" />
          <h2 className="text-xl md:text-2xl font-black tracking-wide text-white">
            Citizen Flood Reports & Crowdsourced Intelligence
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Community flood observation intake and emergency operator verification queue (DETECT & VERIFY Phase).
        </p>
      </div>

      {/* Methodology Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
        <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
        <span>
          <strong>Operational Notice:</strong> Citizen reports represent crowdsourced eyewitness alerts and are NOT treated as machine learning ground-truth training data. Reports undergo operational review before escalation.
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Form Column: Submit Report */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 backdrop-blur-md">
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-base font-extrabold text-white">Submit Field Inundation Report</h3>
            <p className="text-xs text-slate-400 mt-0.5">Submit immediate observations to the State Disaster Management cell.</p>
          </div>

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Target District *</label>
              <select
                value={locationId}
                onChange={handleLocationChange}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
              >
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Hazard Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
                >
                  {CATEGORIES.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Perceived Severity *</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
                >
                  <option value="Low">Low (Water on road)</option>
                  <option value="Moderate">Moderate (Ankle to knee)</option>
                  <option value="High">High (Knee to waist)</option>
                  <option value="Severe">Severe (Waist deep / Submerged)</option>
                </select>
              </div>
            </div>

            {/* Coordinates / GPS */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">Coordinates</label>
                <button
                  type="button"
                  onClick={fetchGPSLocation}
                  disabled={gpsFetching}
                  className="text-[11px] font-bold text-accentCyan hover:underline flex items-center gap-1"
                >
                  <Compass size={12} />
                  {gpsFetching ? "Acquiring..." : "Use Current GPS"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Description / Landmarks *</label>
              <textarea
                rows="3"
                required
                placeholder="Describe current water level, blocked roads, or stranded citizens..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accentCyan hover:bg-cyan-500 text-slate-950 text-xs font-black transition shadow-lg shadow-cyan-950/40"
            >
              <Send size={14} />
              {loading ? "TRANSMITTING..." : "SUBMIT FLOOD REPORT"}
            </button>
          </form>
        </div>

        {/* Right Column: Operator Verification Queue */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-white">Verification & Response Queue</h3>
              <p className="text-xs text-slate-400 mt-0.5">Emergency operator review and incident escalation.</p>
            </div>

            {/* Filter controls */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
              >
                <option value="ALL">All Statuses</option>
                <option value="NEW">NEW</option>
                <option value="VERIFIED">VERIFIED</option>
                <option value="ESCALATED">ESCALATED</option>
                <option value="REJECTED">REJECTED</option>
                <option value="DUPLICATE">DUPLICATE</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
              >
                <option value="ALL">All Categories</option>
                {CATEGORIES.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>

              <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer hover:text-slate-200 ml-1">
                <input
                  type="checkbox"
                  checked={showTestRecords}
                  onChange={(e) => setShowTestRecords(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-700 text-accentCyan focus:ring-0"
                />
                <span>Diagnostic Logs</span>
              </label>
            </div>
          </div>

          {/* Reports List */}
          <div className="space-y-3 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
            {filteredReports.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No citizen reports found for the selected filter.
              </div>
            ) : (
              filteredReports.map((rep) => {
                const st = rep.verification_status || (rep.is_verified ? 'VERIFIED' : 'NEW');

                return (
                  <div
                    key={rep.id}
                    className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2.5 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">#{rep.id}</span>
                        <span className="text-xs font-bold text-white capitalize">{rep.location_name}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-slate-900 border border-slate-700 text-cyan-300">
                          {rep.category || "waterlogging"}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${STATUS_BADGES[st] || STATUS_BADGES.NEW}`}>
                          {st}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(rep.created_at).toLocaleDateString()} {new Date(rep.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 font-normal leading-relaxed">
                      {rep.description}
                    </p>

                    {/* Action Toolbar */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                      <div className="flex items-center gap-2">
                        {st === 'NEW' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(rep.id, 'VERIFIED')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 font-bold border border-emerald-800 text-[11px]"
                            >
                              VERIFY
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(rep.id, 'REJECTED')}
                              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold border border-slate-800 text-[11px]"
                            >
                              REJECT
                            </button>
                          </>
                        )}
                        {st === 'VERIFIED' && (
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                            <CheckCircle size={13} /> Verified by staff
                          </span>
                        )}
                      </div>

                      {/* Escalate Button */}
                      {st !== 'ESCALATED' ? (
                        <button
                          onClick={() => handleEscalateToIncident(rep.id)}
                          disabled={escalatingId === rep.id}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 text-[11px] font-bold border border-red-800 transition"
                          title="Convert this citizen report into an active emergency incident"
                        >
                          <ArrowUpRight size={13} />
                          {escalatingId === rep.id ? "ESCALATING..." : "ESCALATE TO INCIDENT"}
                        </button>
                      ) : (
                        <span className="text-[11px] text-red-400 font-bold uppercase tracking-wider">
                          Active Incident Created
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenPortal;
