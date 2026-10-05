import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import { api } from '../services/api';

// Sub-component to force Leaflet to recalculate container dimensions after mount
const MapResizer = () => {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 150);
    const t2 = setTimeout(() => map.invalidateSize(), 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
};
import {
  ShieldAlert,
  MapPin,
  Home,
  AlertTriangle,
  Layers,
  Phone,
  CloudRain,
  Info,
  CheckCircle,
  Clock,
  Compass
} from 'lucide-react';

const GISMap = () => {
  const [locations, setLocations] = useState([]);
  const [latestPredictions, setLatestPredictions] = useState({});
  const [shelters, setShelters] = useState([]);
  const [reports, setReports] = useState([]);
  const [operatingMode, setOperatingMode] = useState("STANDARD");
  const [operatingThreshold, setOperatingThreshold] = useState(0.58);
  const [loading, setLoading] = useState(true);

  // Layer toggles
  const [showRiskLayer, setShowRiskLayer] = useState(true);
  const [showRainfallLayer, setShowRainfallLayer] = useState(false);
  const [showShelters, setShowShelters] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);

  const loadMapData = async () => {
    try {
      setLoading(true);
      const [locRes, predRes, shelterRes, reportRes, modeRes] = await Promise.all([
        api.getLocations(),
        api.getLatestPredictions(),
        api.getShelters(),
        api.getCitizenReports(),
        api.getOperatingMode()
      ]);

      setLocations(locRes.data);

      const predMap = {};
      predRes.data.forEach(p => {
        predMap[p.location_id] = p;
      });
      setLatestPredictions(predMap);

      setShelters(shelterRes.data);
      setReports(reportRes.data);
      setOperatingMode(modeRes.data.operating_mode);
      setOperatingThreshold(modeRes.data.threshold);

    } catch (err) {
      console.error("Error loading GIS map data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMapData();
  }, []);

  const getRiskColor = (prob) => {
    if (prob < 0.20) return '#10B981'; // Green (Safe)
    if (prob < 0.40) return '#F59E0B'; // Yellow (Moderate)
    if (prob < 0.58) return '#F97316'; // Orange (Elevated)
    return '#EF4444'; // Red (High / Very High)
  };

  const getSeverityColor = (severity) => {
    switch ((severity || '').toLowerCase()) {
      case 'low': return '#F59E0B';
      case 'moderate': return '#F97316';
      case 'high': return '#EF4444';
      case 'severe': return '#991B1B';
      default: return '#3B82F6';
    }
  };

  // Find nearest open shelter with distance
  const getNearestOpenShelter = (loc) => {
    let nearest = null;
    let minD = Infinity;

    shelters.forEach(s => {
      if ((s.status || '').toLowerCase() === 'open') {
        // Geodesic / Euclidean approximation in km
        const dLat = (loc.latitude - s.latitude) * 111.0;
        const dLon = (loc.longitude - s.longitude) * 111.0 * Math.cos(loc.latitude * Math.PI / 180);
        const distKm = Math.sqrt(dLat * dLat + dLon * dLon);
        if (distKm < minD) {
          minD = distKm;
          nearest = { ...s, distKm: Math.round(distKm) };
        }
      }
    });
    return nearest;
  };

  // Evacuation routing algorithm
  const calculateEvacRoutes = () => {
    const routes = [];
    locations.forEach(loc => {
      const pred = latestPredictions[loc.id];
      if (pred && pred.flood_probability >= 0.33) {
        const nearest = getNearestOpenShelter(loc);
        if (nearest) {
          routes.push({
            id: `route-${loc.id}-${nearest.id}`,
            fromName: loc.name,
            toName: nearest.name,
            distKm: nearest.distKm,
            positions: [
              [loc.latitude, loc.longitude],
              [nearest.latitude, nearest.longitude]
            ]
          });
        }
      }
    });
    return routes;
  };

  const evacRoutes = calculateEvacRoutes();

  return (
    <div className="min-h-[650px] h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-5">
      {/* Sidebar Control Panel */}
      <div className="w-full md:w-80 bg-slate-900/70 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between overflow-y-auto custom-scrollbar backdrop-blur-md shrink-0">
        <div className="space-y-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={20} className="text-accentCyan" />
              <h2 className="text-base font-extrabold tracking-wide text-white uppercase">
                GIS Risk & Evacuation Map
              </h2>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              Geospatial surveillance & evacuation router for Tamil Nadu (UNDERSTAND Phase).
            </p>
          </div>

          {/* Operating Mode Indicator */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs space-y-1">
            <div className="text-[10px] text-slate-400 font-extrabold uppercase">
              Current Operating Mode
            </div>
            <div className="flex items-center justify-between font-bold">
              <span className="text-white">{operatingMode} MODE</span>
              <span className="text-accentCyan font-mono">&tau; = {operatingThreshold}</span>
            </div>
          </div>

          {/* Toggle Layers */}
          <div className="space-y-2.5">
            <h4 className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
              <Layers size={13} className="text-accentCyan" />
              Surveillance Layers
            </h4>

            <div className="space-y-1.5 text-xs">
              <label className="flex items-center justify-between px-3 py-2 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 rounded-xl cursor-pointer transition">
                <span className="font-semibold text-slate-200">District ML Risk Layer</span>
                <input
                  type="checkbox"
                  checked={showRiskLayer}
                  onChange={() => setShowRiskLayer(!showRiskLayer)}
                  className="rounded border-slate-700 text-accentCyan focus:ring-accentCyan"
                />
              </label>

              <label className="flex items-center justify-between px-3 py-2 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 rounded-xl cursor-pointer transition">
                <span className="font-semibold text-slate-200">Rainfall Intensity Layer</span>
                <input
                  type="checkbox"
                  checked={showRainfallLayer}
                  onChange={() => setShowRainfallLayer(!showRainfallLayer)}
                  className="rounded border-slate-700 text-accentCyan focus:ring-accentCyan"
                />
              </label>

              <label className="flex items-center justify-between px-3 py-2 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 rounded-xl cursor-pointer transition">
                <span className="font-semibold text-slate-200">Emergency Shelters</span>
                <input
                  type="checkbox"
                  checked={showShelters}
                  onChange={() => setShowShelters(!showShelters)}
                  className="rounded border-slate-700 text-accentCyan focus:ring-accentCyan"
                />
              </label>

              <label className="flex items-center justify-between px-3 py-2 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 rounded-xl cursor-pointer transition">
                <span className="font-semibold text-slate-200">Citizen Eye-Witness Reports</span>
                <input
                  type="checkbox"
                  checked={showReports}
                  onChange={() => setShowReports(!showReports)}
                  className="rounded border-slate-700 text-accentCyan focus:ring-accentCyan"
                />
              </label>

              <label className="flex items-center justify-between px-3 py-2 bg-slate-950/60 hover:bg-slate-950 border border-slate-800/80 rounded-xl cursor-pointer transition">
                <span className="font-semibold text-slate-200">Evacuation Routes</span>
                <input
                  type="checkbox"
                  checked={showRoutes}
                  onChange={() => setShowRoutes(!showRoutes)}
                  className="rounded border-slate-700 text-accentCyan focus:ring-accentCyan"
                />
              </label>
            </div>
          </div>

          {/* Spatial Limitation Notice */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-300">
              <Info size={12} className="text-cyan-400" />
              <span>Spatial Boundary Limitation</span>
            </div>
            <p className="leading-relaxed">
              Weather observations represent district/headquarters locations and do not define exact micro-inundation boundaries. Visualizations reflect district-level flood-risk estimations.
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            Threat Legend
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300">Low (&lt;20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-300">Moderate</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-slate-300">Elevated</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-slate-300">High / Critical</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Leaflet Map */}
      <div className="flex-1 rounded-2xl overflow-hidden border border-slate-800/80 relative shadow-2xl min-h-[550px] h-full flex flex-col">
        <MapContainer
          center={[11.1271, 78.6569]} // Centered on Tamil Nadu
          zoom={7}
          style={{ height: '100%', minHeight: '550px', width: '100%' }}
          className="h-full w-full flex-1 bg-slate-950"
          zoomControl={true}
        >
          <MapResizer />
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* 1. Tactical Evacuation Routes Layer */}
          {showRoutes && evacRoutes.map((route) => (
            <Polyline
              key={route.id}
              positions={route.positions}
              color="#06b6d4"
              weight={2.5}
              dashArray="6, 8"
              opacity={0.8}
            >
              <LeafletTooltip permanent={false} direction="center" className="bg-slate-900 text-white font-mono text-xs border-0">
                Evac Vector: {route.fromName} &rarr; {route.toName} ({route.distKm} km)
              </LeafletTooltip>
            </Polyline>
          ))}

          {/* 2. District Risk Layer / Rainfall Layer */}
          {(showRiskLayer || showRainfallLayer) && locations.map((loc) => {
            const pred = latestPredictions[loc.id];
            const prob = pred ? pred.flood_probability : 0.05;
            const rLevel = pred ? pred.risk_level : "LOW";
            const rain24h = pred?.weather_reading?.rainfall_24h || 0.0;
            const nearestShelter = getNearestOpenShelter(loc);
            const districtReports = reports.filter(r => r.location_id === loc.id);

            // Radius for rainfall intensity layer
            const markerRadius = showRainfallLayer
              ? Math.max(8, Math.min(28, 8 + rain24h * 0.2))
              : 12;

            const markerColor = showRainfallLayer
              ? (rain24h > 100 ? '#ef4444' : rain24h > 50 ? '#f97316' : rain24h > 20 ? '#06b6d4' : '#38bdf8')
              : getRiskColor(prob);

            return (
              <CircleMarker
                key={`loc-${loc.id}`}
                center={[loc.latitude, loc.longitude]}
                radius={markerRadius}
                fillColor={markerColor}
                color="#ffffff"
                weight={2}
                opacity={0.9}
                fillOpacity={0.8}
              >
                <Popup className="custom-leaflet-popup">
                  <div className="p-2 space-y-2.5 text-slate-900 min-w-[240px]">
                    <div className="border-b pb-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-sm">{loc.name} Station</h4>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 font-bold">
                          {rLevel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E
                      </div>
                    </div>

                    <div className="space-y-1 text-xs font-medium">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Model Probability:</span>
                        <strong className="text-cyan-700">{(prob * 100).toFixed(1)}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Decision Threshold:</span>
                        <span>{operatingThreshold} ({prob >= operatingThreshold ? "BREACHED" : "NORMAL"})</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">24h Rainfall:</span>
                        <strong>{rain24h.toFixed(1)} mm</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Verified Reports:</span>
                        <span>{districtReports.filter(r => r.is_verified).length}</span>
                      </div>
                    </div>

                    {/* Contributing Factors */}
                    {pred?.ai_explanation && pred.ai_explanation.length > 0 && (
                      <div className="bg-slate-50 p-2 rounded text-[11px] text-slate-700 border space-y-0.5">
                        <span className="font-bold block text-[10px] uppercase text-slate-500">Key Explanation:</span>
                        <div>{pred.ai_explanation[0]}</div>
                      </div>
                    )}

                    {/* Nearest Shelter */}
                    {nearestShelter && (
                      <div className="bg-cyan-50 p-2 rounded text-[11px] text-cyan-900 border border-cyan-200">
                        <span className="font-bold block text-[10px] uppercase text-cyan-700">Nearest Open Shelter:</span>
                        <div>{nearestShelter.name} &bull; <strong>{nearestShelter.distKm} km</strong></div>
                        <div className="text-[10px] text-cyan-700 font-mono">
                          Avail: {nearestShelter.capacity - nearestShelter.current_occupancy} beds | {nearestShelter.contact_number}
                        </div>
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* 3. Emergency Shelters Layer */}
          {showShelters && shelters.map((s) => {
            const isOpen = (s.status || '').toLowerCase() === 'open';
            const avail = Math.max(0, s.capacity - s.current_occupancy);

            return (
              <CircleMarker
                key={`shelter-${s.id}`}
                center={[s.latitude, s.longitude]}
                radius={8}
                fillColor={isOpen ? "#10b981" : "#ef4444"}
                color="#ffffff"
                weight={2}
                opacity={1}
                fillOpacity={0.9}
              >
                <Popup>
                  <div className="p-2 space-y-1.5 text-slate-900 min-w-[200px]">
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>{s.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                        {s.status}
                      </span>
                    </div>
                    <div className="text-xs space-y-0.5">
                      <div>Capacity: <strong>{s.capacity}</strong> (Occupied: {s.current_occupancy})</div>
                      <div className="text-emerald-700 font-bold">Available: {avail} beds</div>
                      <div className="text-slate-600 font-mono text-[11px]">{s.contact_number}</div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* 4. Citizen Reports Layer */}
          {showReports && reports.map((r) => {
            const isVerified = r.is_verified || r.verification_status === 'VERIFIED' || r.verification_status === 'ESCALATED';

            return (
              <CircleMarker
                key={`report-${r.id}`}
                center={[r.latitude, r.longitude]}
                radius={isVerified ? 7 : 5}
                fillColor={isVerified ? getSeverityColor(r.severity) : "#94a3b8"}
                color={isVerified ? "#ffffff" : "#475569"}
                weight={1.5}
                opacity={0.9}
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="p-2 space-y-1 text-slate-900 min-w-[180px]">
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span className="capitalize">{r.category || "Report"}</span>
                      <span className="text-[10px] font-mono px-1 py-0.5 bg-slate-100 rounded">
                        {isVerified ? "VERIFIED" : "UNVERIFIED"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700">{r.description}</p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Severity: {r.severity}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default GISMap;
