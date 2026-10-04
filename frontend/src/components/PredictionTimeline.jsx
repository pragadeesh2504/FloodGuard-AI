import React, { useState } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, Clock, ShieldCheck } from 'lucide-react';

const PredictionTimeline = ({ predictions = [] }) => {
  const [expandedId, setExpandedId] = useState(null);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getRiskColor = (level) => {
    switch (level.toLowerCase()) {
      case 'safe': return 'text-safeGreen bg-emerald-500/10 border-emerald-500/20';
      case 'low risk': return 'text-hazardYellow bg-yellow-500/10 border-yellow-500/20';
      case 'moderate risk': return 'text-hazardOrange bg-orange-500/10 border-orange-500/20';
      case 'high risk': return 'text-hazardRed bg-red-500/10 border-red-500/20';
      case 'severe flood risk': return 'text-white bg-red-800 border-red-950';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-2">
      {predictions.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-sm">
          No historical predictions logged yet.
        </div>
      ) : (
        predictions.map((p) => {
          const isExpanded = expandedId === p.id;
          const pct = Math.round(p.flood_probability * 100);

          return (
            <div
              key={p.id}
              className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                isExpanded ? 'border-accentCyan/40 bg-slate-900/60 shadow-lg' : 'border-slate-800/80 bg-slate-950/20 hover:border-slate-700/60'
              }`}
            >
              {/* Header Header */}
              <div
                onClick={() => toggleExpand(p.id)}
                className="p-4 flex items-center justify-between cursor-pointer select-none"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <span className="text-xs font-semibold text-slate-500 block">
                      {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">
                      {new Date(p.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>

                  <div>
                    <span className="text-sm font-bold text-slate-200">
                      Surveillance Risk Run
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-full uppercase tracking-wider ${getRiskColor(p.risk_level)}`}>
                        {p.risk_level}
                      </span>
                      {p.estimated_time_hours && (
                        <span className="text-[10px] text-hazardOrange flex items-center gap-0.5 font-bold">
                          <Clock size={10} />
                          ETA: {p.estimated_time_hours}h
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-lg font-extrabold text-slate-100">
                    {pct}%
                  </span>
                  {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                </div>
              </div>

              {/* Explanations Tray */}
              {isExpanded && (
                <div className="px-6 pb-5 pt-1 border-t border-slate-900 bg-slate-950/40 text-xs">
                  <h5 className="font-extrabold text-accentCyan flex items-center gap-1.5 uppercase tracking-wider mb-2.5">
                    <AlertCircle size={12} />
                    Explainable AI (XAI) Insight
                  </h5>

                  <ul className="space-y-1.5 pl-5 list-disc text-slate-300">
                    {p.ai_explanation && p.ai_explanation.length > 0 ? (
                      p.ai_explanation.map((reason, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {reason}
                        </li>
                      ))
                    ) : (
                      <li>All parameters are operating within standard baseline limits.</li>
                    )}
                  </ul>

                  <div className="mt-4 pt-3.5 border-t border-slate-900/60 flex justify-between text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    <span>Model: {p.model_version || 'Ensemble-v1'}</span>
                    <span>Confidence Score: {(p.confidence_score * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default PredictionTimeline;
