import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  Shield,
  Users,
  MapPin,
  Phone,
  AlertTriangle,
  CheckCircle,
  Clock,
  Compass,
  Edit3,
  Info,
  Navigation
} from 'lucide-react';

const SheltersEvacuation = () => {
  const { user } = useAuth();
  const [shelters, setShelters] = useState([]);
  const [evacPlan, setEvacPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  // Edit occupancy modal state
  const [selectedShelter, setSelectedShelter] = useState(null);
  const [newOccupancy, setNewOccupancy] = useState(0);
  const [newStatus, setNewStatus] = useState('Open');
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [sheltersRes, planRes] = await Promise.all([
        api.getShelters(),
        api.getEvacuationPlan()
      ]);
      setShelters(sheltersRes.data);
      setEvacPlan(planRes.data);
    } catch (err) {
      console.error("Failed to load shelter data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateOccupancySubmit = async (e) => {
    e.preventDefault();
    if (!selectedShelter) return;
    setSaving(true);
    try {
      await api.updateShelterOccupancy(selectedShelter.id, Number(newOccupancy), newStatus);
      setSelectedShelter(null);
      await fetchData();
    } catch (err) {
      console.error("Failed to update shelter", err);
      alert("Failed to update shelter occupancy.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accentCyan" />
      </div>
    );
  }

  const summary = evacPlan ? evacPlan.summary : {
    total_shelters: shelters.length,
    open_shelters: shelters.filter(s => s.status.toLowerCase() === 'open').length,
    total_capacity: shelters.reduce((acc, s) => acc + s.capacity, 0),
    total_occupied: shelters.reduce((acc, s) => acc + s.current_occupancy, 0),
    total_available: shelters.reduce((acc, s) => acc + (s.capacity - s.current_occupancy), 0),
    occupancy_rate_percent: 0
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title */}
      <div>
        <div className="flex items-center gap-2.5">
          <Home size={24} className="text-accentCyan" />
          <h2 className="text-xl md:text-2xl font-black tracking-wide text-white">
            Shelters & Evacuation Decision Support
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Regional relief camp capacity, real-time occupancy tracking, and nearest safe haven matching (DECIDE & ACT Phase).
        </p>
      </div>

      {/* KPI Capacity Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Total Camps</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {summary.total_shelters}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold mt-1">
            {summary.open_shelters} Operational (Open)
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Total Capacity</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {summary.total_capacity.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Max population intake</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Occupied Beds</div>
          <div className="text-2xl font-black text-cyan-400 font-mono mt-1">
            {summary.total_occupied.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Evacuees currently sheltered</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Available Beds</div>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
            {summary.total_available.toLocaleString()}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1">Immediate buffer capacity</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Occupancy Rate</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            {summary.occupancy_rate_percent}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Statewide utilization</div>
        </div>
      </div>

      {/* Evacuation Dispatch Advisor (District matching) */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass size={18} className="text-accentCyan" />
              <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
                Evacuation Dispatch Advisor
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated proximity recommendation: matches district centroids to nearest operational shelter with verified available capacity.
            </p>
          </div>

          <span className="text-[11px] text-slate-400 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
            Geodesic distance calculation &bull; No live road routing claimed
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {evacPlan?.district_evacuation_recommendations?.slice(0, 6).map((rec) => {
            const isPriority = rec.is_priority_zone;
            const shelter = rec.recommended_shelter;

            return (
              <div
                key={rec.location_id}
                className={`p-4 rounded-xl border space-y-3 transition-all ${
                  isPriority
                    ? 'bg-red-950/20 border-red-800/80 shadow-lg shadow-red-950/30'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin size={15} className={isPriority ? "text-red-400" : "text-cyan-400"} />
                    <span className="text-sm font-extrabold text-white">{rec.district_name}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    rec.risk_level === 'VERY_HIGH' ? 'bg-red-950 text-red-300 border border-red-800' :
                    rec.risk_level === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                    rec.risk_level === 'MODERATE' ? 'bg-yellow-950 text-yellow-300 border border-yellow-800' :
                    'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {rec.risk_level}
                  </span>
                </div>

                {shelter ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="text-[11px] text-slate-400 font-bold uppercase">
                      Recommended Primary Shelter:
                    </div>
                    <div className="font-bold text-slate-200">
                      {shelter.shelter_name}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Proximity: <strong className="text-accentCyan">{shelter.distance_km} km</strong></span>
                      <span>Available: <strong className="text-emerald-400">{shelter.available_capacity} beds</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <Phone size={12} className="text-slate-500" />
                      <span>{shelter.contact_number}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-amber-400 bg-amber-950/30 p-2 rounded-lg border border-amber-900/50">
                    No open shelters with remaining space currently registered near this zone.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shelter Inventory Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
            Emergency Shelter Roster & Status
          </h3>
          <span className="text-xs text-slate-400">
            {shelters.length} Shelters Registered
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="pb-3 px-3">Shelter Name</th>
                <th className="pb-3 px-3">Status</th>
                <th className="pb-3 px-3">Occupancy / Capacity</th>
                <th className="pb-3 px-3">Available</th>
                <th className="pb-3 px-3">Contact Officer</th>
                <th className="pb-3 px-3">Amenities</th>
                <th className="pb-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {shelters.map((s) => {
                const avail = Math.max(0, s.capacity - s.current_occupancy);
                const pct = Math.min(100, Math.round((s.current_occupancy / s.capacity) * 100));

                return (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-bold text-white">
                      {s.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        s.status.toLowerCase() === 'open' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        s.status.toLowerCase() === 'full' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-red-950 text-red-300 border border-red-800'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="space-y-1">
                        <div className="font-mono text-slate-200">
                          {s.current_occupancy} / {s.capacity} ({pct}%)
                        </div>
                        <div className="w-24 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct > 90 ? 'bg-red-500' : pct > 60 ? 'bg-amber-500' : 'bg-cyan-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                      {avail} beds
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">
                      {s.contact_number}
                    </td>
                    <td className="py-3 px-3 text-slate-400 max-w-xs truncate">
                      {s.amenities || "Food, Water, Medical"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          setSelectedShelter(s);
                          setNewOccupancy(s.current_occupancy);
                          setNewStatus(s.status);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 transition"
                      >
                        UPDATE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Update Shelter Occupancy */}
      {selectedShelter && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-white">
                Update Shelter Occupancy
              </h3>
              <button
                onClick={() => setSelectedShelter(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateOccupancySubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Shelter Name</label>
                <div className="text-sm font-extrabold text-white bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {selectedShelter.name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Current Occupancy</label>
                  <input
                    type="number"
                    min="0"
                    max={selectedShelter.capacity}
                    value={newOccupancy}
                    onChange={(e) => setNewOccupancy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Max: {selectedShelter.capacity} beds
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Operational Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accentCyan"
                  >
                    <option value="Open">Open</option>
                    <option value="Full">Full</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedShelter(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-accentCyan hover:bg-cyan-500 text-slate-950 text-xs font-black shadow-lg shadow-cyan-950/40"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SheltersEvacuation;
