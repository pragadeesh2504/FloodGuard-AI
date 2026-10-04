import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AlertTriangle,
  ShieldAlert,
  Radio,
  Plus,
  Filter,
  CheckCircle,
  Clock,
  Send,
  MapPin,
  UserCheck,
  FileText,
  ChevronDown
} from 'lucide-react';

const STATUS_COLORS = {
  NEW: 'bg-blue-950 text-blue-300 border-blue-800',
  INVESTIGATING: 'bg-yellow-950 text-yellow-300 border-yellow-800',
  ACTIVE: 'bg-orange-950 text-orange-300 border-orange-800',
  ESCALATED: 'bg-red-950 text-red-300 border-red-800',
  RESOLVED: 'bg-emerald-950 text-emerald-300 border-emerald-800'
};

const SEVERITY_COLORS = {
  LOW: 'text-emerald-400 bg-emerald-950/40 border-emerald-800',
  MODERATE: 'text-yellow-400 bg-yellow-950/40 border-yellow-800',
  HIGH: 'text-orange-400 bg-orange-950/40 border-orange-800',
  CRITICAL: 'text-red-400 bg-red-950/40 border-red-800'
};

const AlertsIncidents = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [locations, setLocations] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [showTestRecords, setShowTestRecords] = useState(false);
  const [loading, setLoading] = useState(true);

  // New incident modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newLocationId, setNewLocationId] = useState('');
  const [newSeverity, setNewSeverity] = useState('HIGH');
  const [newFactors, setNewFactors] = useState('');
  const [newActionPlan, setNewActionPlan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status update modal state
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [targetStatus, setTargetStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const fetchData = async () => {
    try {
      const [incRes, locRes, alertRes] = await Promise.all([
        api.getIncidents(),
        api.getLocations(),
        api.getActiveAlerts()
      ]);
      setIncidents(incRes.data);
      setLocations(locRes.data);
      setActiveAlerts(alertRes.data);
      if (locRes.data.length > 0 && !newLocationId) {
        setNewLocationId(locRes.data[0].id);
      }
    } catch (err) {
      console.error("Failed to load incidents data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateIncident = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLocationId) return;
    setSubmitting(true);
    try {
      await api.createIncident({
        location_id: Number(newLocationId),
        title: newTitle,
        severity: newSeverity,
        contributing_factors: newFactors || "Contributing risk factor: Rapidly escalating precipitation and water accumulation",
        action_plan: newActionPlan || "Deploy rapid assessment team, review nearest shelter readiness.",
        assigned_to: "NDRF Unit / TN-SDRF Rapid Response"
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewFactors('');
      setNewActionPlan('');
      await fetchData();
    } catch (err) {
      console.error("Failed to create incident", err);
      alert("Failed to create incident. Check required fields.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChangeSubmit = async () => {
    if (!selectedIncident || !targetStatus) return;
    try {
      await api.updateIncidentStatus(selectedIncident.id, targetStatus, statusNotes);
      setSelectedIncident(null);
      setTargetStatus('');
      setStatusNotes('');
      await fetchData();
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update status.");
    }
  };

  const handleBroadcast = async (incidentId) => {
    if (!window.confirm("Are you sure you want to broadcast an emergency public advisory for this incident?")) {
      return;
    }
    try {
      await api.broadcastIncidentAlert(incidentId);
      alert("Emergency broadcast sent successfully!");
      await fetchData();
    } catch (err) {
      console.error("Failed to broadcast alert", err);
      alert("Failed to broadcast alert.");
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    if (!showTestRecords) {
      const title = (inc.title || '').toLowerCase();
      const plan = (inc.action_plan || '').toLowerCase();
      if (title.includes('test') || title.includes('diagnostic') || title.includes('automated') || plan.includes('automated test')) {
        return false;
      }
    }
    if (statusFilter !== 'ALL' && inc.lifecycle_status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
    return true;
  });

  // Calculate lifecycle counters
  const counts = {
    NEW: incidents.filter(i => i.lifecycle_status === 'NEW').length,
    INVESTIGATING: incidents.filter(i => i.lifecycle_status === 'INVESTIGATING').length,
    ACTIVE: incidents.filter(i => i.lifecycle_status === 'ACTIVE').length,
    ESCALATED: incidents.filter(i => i.lifecycle_status === 'ESCALATED').length,
    RESOLVED: incidents.filter(i => i.lifecycle_status === 'RESOLVED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accentCyan" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & New Incident Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <AlertTriangle size={24} className="text-hazardOrange" />
            <h2 className="text-xl md:text-2xl font-black tracking-wide text-white">
              Alerts & Operational Incident Response
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Mission-critical lifecycle management: NEW &rarr; INVESTIGATING &rarr; ACTIVE &rarr; ESCALATED &rarr; RESOLVED (ACT Phase).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accentCyan hover:bg-cyan-500 text-slate-950 text-xs font-black transition shadow-lg shadow-cyan-950/40"
        >
          <Plus size={15} />
          DECLARE INCIDENT
        </button>
      </div>

      {/* Lifecycle Status Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {['NEW', 'INVESTIGATING', 'ACTIVE', 'ESCALATED', 'RESOLVED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(statusFilter === st ? 'ALL' : st)}
            className={`p-3.5 rounded-xl border text-left transition-all ${
              statusFilter === st
                ? 'bg-slate-800 border-accentCyan shadow-md'
                : 'bg-slate-900/60 border-slate-800 hover:bg-slate-800/60'
            }`}
          >
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {st}
            </div>
            <div className="text-2xl font-black text-white font-mono mt-1">
              {counts[st]}
            </div>
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-300">Filters:</span>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="INVESTIGATING">INVESTIGATING</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ESCALATED">ESCALATED</option>
            <option value="RESOLVED">RESOLVED</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MODERATE">MODERATE</option>
            <option value="LOW">LOW</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer hover:text-slate-200 ml-2">
            <input
              type="checkbox"
              checked={showTestRecords}
              onChange={(e) => setShowTestRecords(e.target.checked)}
              className="rounded bg-slate-950 border-slate-700 text-accentCyan focus:ring-0"
            />
            <span>Include Diagnostic Runs</span>
          </label>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="text-white font-mono font-bold">{filteredIncidents.length}</span> of {incidents.length} Incidents
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-4">
        {filteredIncidents.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
            <CheckCircle size={32} className="mx-auto text-emerald-400" />
            <h3 className="text-sm font-bold text-white">No Incidents Matching Selected Filter</h3>
            <p className="text-xs text-slate-500">All districts operating under standard surveillance conditions.</p>
          </div>
        ) : (
          filteredIncidents.map((inc) => (
            <div
              key={inc.id}
              className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition backdrop-blur-md"
            >
              {/* Card Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-500">#{inc.id}</span>
                    <h3 className="text-sm font-extrabold text-white">{inc.title}</h3>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${SEVERITY_COLORS[inc.severity] || SEVERITY_COLORS.HIGH}`}>
                      {inc.severity}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase border ${STATUS_COLORS[inc.lifecycle_status] || STATUS_COLORS.NEW}`}>
                      {inc.lifecycle_status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin size={12} className="text-cyan-400" />
                      {inc.location_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-500" />
                      {new Date(inc.created_at).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <UserCheck size={12} className="text-slate-500" />
                      {inc.assigned_to}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedIncident(inc);
                      setTargetStatus(inc.lifecycle_status);
                      setStatusNotes('');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
                  >
                    UPDATE STATUS
                  </button>

                  <button
                    onClick={() => handleBroadcast(inc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-hazardRed/20 hover:bg-hazardRed/30 text-red-300 text-xs font-bold border border-red-800/80 transition"
                    title="Dispatch Emergency Broadcast to Field Units"
                  >
                    <Radio size={12} className="animate-pulse" />
                    BROADCAST
                  </button>
                </div>
              </div>

              {/* Card Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Contributing Factors */}
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Contributing Factors
                  </div>
                  <p className="text-slate-300 leading-relaxed font-mono">
                    {inc.contributing_factors || "No automated contributing risk factors recorded."}
                  </p>
                </div>

                {/* Action Plan */}
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Operational Action Plan
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {inc.action_plan || "Establish perimeter, verify storm drainage, standby shelter mobilization."}
                  </p>
                </div>
              </div>

              {/* Operator Notes History */}
              {inc.notes && (
                <div className="bg-slate-950/40 rounded-xl p-2.5 text-[11px] text-slate-400 border border-slate-800/40 font-mono whitespace-pre-line">
                  {inc.notes}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal: Create Incident */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">Declare New Operational Incident</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Severe Inundation at Tambaram Bridge"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Location *</label>
                  <select
                    value={newLocationId}
                    onChange={(e) => setNewLocationId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
                  >
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Severity *</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MODERATE">MODERATE</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Contributing Factors</label>
                <input
                  type="text"
                  placeholder="Contributing risk factor: 7-day rainfall accumulation surge..."
                  value={newFactors}
                  onChange={(e) => setNewFactors(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Initial Action Plan</label>
                <textarea
                  rows="2"
                  placeholder="Deploy pumps, verify safe shelter path..."
                  value={newActionPlan}
                  onChange={(e) => setNewActionPlan(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-accentCyan hover:bg-cyan-500 text-slate-950 text-xs font-black shadow-lg shadow-cyan-950/40"
                >
                  {submitting ? "Creating..." : "Confirm Declaration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Lifecycle Status */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">
                Update Status — #{selectedIncident.id}
              </h3>
              <button
                onClick={() => setSelectedIncident(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Lifecycle Status</label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
                >
                  <option value="NEW">NEW</option>
                  <option value="INVESTIGATING">INVESTIGATING</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ESCALATED">ESCALATED</option>
                  <option value="RESOLVED">RESOLVED</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Operator Notes / Debrief</label>
                <textarea
                  rows="3"
                  placeholder="Record operational observations, units deployed, or resolution notes..."
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedIncident(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStatusChangeSubmit}
                  className="px-4 py-2 rounded-xl bg-accentCyan hover:bg-cyan-500 text-slate-950 text-xs font-black shadow-lg shadow-cyan-950/40"
                >
                  Save Transition
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlertsIncidents;
