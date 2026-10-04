import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import HistoricalFloodReplay from '../components/HistoricalFloodReplay';
import {
  Cpu,
  ShieldCheck,
  AlertTriangle,
  BarChart2,
  Layers,
  Info,
  CheckCircle,
  Sliders,
  HelpCircle,
  Database
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const ModelIntelligence = () => {
  const [analytics, setAnalytics] = useState(null);
  const [modeData, setModeData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [anRes, modeRes] = await Promise.all([
          api.getAnalytics(),
          api.getOperatingMode()
        ]);
        setAnalytics(anRes.data);
        setModeData(modeRes.data);
      } catch (err) {
        console.error("Failed to load model intelligence data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-accentCyan" />
      </div>
    );
  }

  const features = analytics?.feature_importance || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2.5">
          <Cpu size={24} className="text-accentCyan" />
          <h2 className="text-xl md:text-2xl font-black tracking-wide text-white">
            Model Intelligence & Architectural Governance
          </h2>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Full algorithmic transparency, 29 contributing feature importances, and dual operating-mode benchmarks (UNDERSTAND Phase).
        </p>
      </div>

      {/* Primary Verified Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Model Accuracy</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            83.14%
          </div>
          <div className="text-[10px] text-emerald-400 mt-1 font-bold">
            &ge;80% Requirement Met
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Safety Recall</div>
          <div className="text-2xl font-black text-accentCyan font-mono mt-1">
            85.29%
          </div>
          <div className="text-[10px] text-cyan-300/80 mt-1">
            29 of 34 Floods Caught
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">Precision</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            1.56%
          </div>
          <div className="text-[10px] text-amber-400 mt-1">
            5.0&times; Over Base Rate
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">F1-Score</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            0.0307
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Harmonic Balance
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">ROC-AUC</div>
          <div className="text-2xl font-black text-white font-mono mt-1">
            0.9314
          </div>
          <div className="text-[10px] text-emerald-400 mt-1">
            Excellent Discrimination
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 backdrop-blur-md">
          <div className="text-[10px] font-extrabold uppercase text-slate-400">PR-AUC</div>
          <div className="text-2xl font-black text-accentCyan font-mono mt-1">
            0.0873
          </div>
          <div className="text-[10px] text-cyan-300/80 mt-1">
            28&times; Random Baseline
          </div>
        </div>
      </div>

      {/* Methodology & Chronological Split Protocol */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Database size={18} className="text-accentCyan" />
          <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
            Leakage-Safe Chronological Validation Protocol
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-extrabold text-cyan-400 uppercase tracking-wider block">
              1. Training Partition
            </span>
            <div className="text-base font-extrabold text-white">2010 &ndash; 2020 (Historical)</div>
            <p className="text-slate-400 leading-relaxed">
              38,747 daily observations across 10 Tamil Nadu districts. Climatological monthly rainfall baselines derived exclusively from this window.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider block">
              2. Strict Buffer Exclusion
            </span>
            <div className="text-base font-extrabold text-white">14d Pre / 7d Post Exclusion</div>
            <p className="text-slate-400 leading-relaxed">
              Excludes 14 days prior to documented flood events and 7 days post-event to eliminate transitional label contamination across all partitions.
            </p>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider block">
              3. Final Test Partition
            </span>
            <div className="text-base font-extrabold text-white">2021 &ndash; 2023 (Untouched)</div>
            <p className="text-slate-400 leading-relaxed">
              10,866 observations containing exactly 34 documented flood days (0.31% base rate). Completely untouched during feature engineering and tuning.
            </p>
          </div>
        </div>

        {/* Validation Anomaly Disclosure */}
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400 space-y-1">
          <div className="flex items-center gap-2 text-slate-300 font-bold">
            <Info size={14} className="text-cyan-400" />
            <span>2018–2020 Validation Partition Diagnostic Finding</span>
          </div>
          <p className="leading-relaxed">
            The lower validation ROC-AUC (0.4852) was traced to a specific outlier event in the validation window: entry <code className="text-cyan-300">UEI-IMD-FL-2019-0134</code> (Coimbatore, 60-day dry-season label with 0.0 mm rainfall). When evaluated on the clean, untouched 2021–2023 test set, the model reliably achieves 0.9314 ROC-AUC.
          </p>
        </div>
      </div>

      {/* Side-by-Side Model Benchmarks Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
            Side-by-Side Model Performance Comparison (2021–2023 Test Set)
          </h3>
          <span className="text-xs text-slate-400 font-mono">10,866 Samples &bull; 34 Floods</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="pb-3 px-3">Model & Strategy</th>
                <th className="pb-3 px-3">Threshold (&tau;)</th>
                <th className="pb-3 px-3">Accuracy</th>
                <th className="pb-3 px-3">Recall</th>
                <th className="pb-3 px-3">Precision</th>
                <th className="pb-3 px-3">F1</th>
                <th className="pb-3 px-3">ROC-AUC</th>
                <th className="pb-3 px-3">PR-AUC</th>
                <th className="pb-3 px-3">False Positives (FP)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {/* Improved XGBoost Standard */}
              <tr className="bg-cyan-950/20 font-bold text-white">
                <td className="py-3 px-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span>Improved XGBoost (Standard Mode - Default)</span>
                </td>
                <td className="py-3 px-3 font-mono text-cyan-300">0.58</td>
                <td className="py-3 px-3 font-mono text-emerald-400">83.14%</td>
                <td className="py-3 px-3 font-mono text-cyan-300">85.29%</td>
                <td className="py-3 px-3 font-mono">1.56%</td>
                <td className="py-3 px-3 font-mono">0.0307</td>
                <td className="py-3 px-3 font-mono">0.9314</td>
                <td className="py-3 px-3 font-mono text-accentCyan">0.0873</td>
                <td className="py-3 px-3 font-mono text-slate-300">1,827 (16.87% FPR)</td>
              </tr>

              {/* Improved XGBoost Emergency */}
              <tr className="bg-amber-950/15">
                <td className="py-3 px-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <span>Improved XGBoost (Emergency Mode - Opt-in)</span>
                </td>
                <td className="py-3 px-3 font-mono text-amber-300">0.33</td>
                <td className="py-3 px-3 font-mono text-amber-400">71.24%*</td>
                <td className="py-3 px-3 font-mono text-amber-300 font-bold">97.06%</td>
                <td className="py-3 px-3 font-mono">1.05%</td>
                <td className="py-3 px-3 font-mono">0.0207</td>
                <td className="py-3 px-3 font-mono">0.9314</td>
                <td className="py-3 px-3 font-mono">0.0873</td>
                <td className="py-3 px-3 font-mono text-amber-400">3,124 (28.84% FPR)</td>
              </tr>

              {/* Baseline XGBoost */}
              <tr>
                <td className="py-3 px-3 text-slate-400">Baseline XGBoost (16 Features)</td>
                <td className="py-3 px-3 font-mono text-slate-400">0.50</td>
                <td className="py-3 px-3 font-mono text-slate-400">93.76%</td>
                <td className="py-3 px-3 font-mono text-slate-400">61.76%</td>
                <td className="py-3 px-3 font-mono text-slate-400">3.06%</td>
                <td className="py-3 px-3 font-mono text-slate-400">0.0583</td>
                <td className="py-3 px-3 font-mono text-slate-400">0.8976</td>
                <td className="py-3 px-3 font-mono text-slate-400">0.0516</td>
                <td className="py-3 px-3 font-mono text-slate-400">665 (6.14% FPR)</td>
              </tr>

              {/* Gradient Boosting */}
              <tr>
                <td className="py-3 px-3 text-slate-400">Gradient Boosting Benchmark</td>
                <td className="py-3 px-3 font-mono text-slate-400">0.50</td>
                <td className="py-3 px-3 font-mono text-slate-400">79.88%</td>
                <td className="py-3 px-3 font-mono text-slate-400">88.24%</td>
                <td className="py-3 px-3 font-mono text-slate-400">1.36%</td>
                <td className="py-3 px-3 font-mono text-slate-400">0.0267</td>
                <td className="py-3 px-3 font-mono text-slate-400">0.9366</td>
                <td className="py-3 px-3 font-mono text-slate-400">0.1084</td>
                <td className="py-3 px-3 font-mono text-slate-400">2,182 (20.14% FPR)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          * Notice: Emergency Mode deliberately trades off accuracy (71.24% vs requirement 80%) in favor of maximizing life-safety recall (97.06%, 33/34 floods caught). Standard Mode is default and strictly satisfies Accuracy &ge; 80%.
        </p>
      </div>

      {/* Confusion Matrices (Standard vs Emergency) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Standard Mode Matrix */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-extrabold text-white uppercase">
              Standard Mode Confusion Matrix (&tau; = 0.58)
            </span>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
              ACCURACY 83.14%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">True Negative (TN)</div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-1">9,005</div>
              <div className="text-[10px] text-slate-500">Correct non-flood days</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">False Positive (FP)</div>
              <div className="text-xl font-mono font-bold text-amber-400 mt-1">1,827</div>
              <div className="text-[10px] text-slate-500">Controlled false alarms</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">False Negative (FN)</div>
              <div className="text-xl font-mono font-bold text-red-400 mt-1">5</div>
              <div className="text-[10px] text-slate-500">Missed flood events</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">True Positive (TP)</div>
              <div className="text-xl font-mono font-bold text-cyan-400 mt-1">29</div>
              <div className="text-[10px] text-slate-500">Captured flood disasters</div>
            </div>
          </div>
        </div>

        {/* Emergency Mode Matrix */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-extrabold text-white uppercase">
              Emergency Mode Confusion Matrix (&tau; = 0.33)
            </span>
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
              RECALL 97.06%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">True Negative (TN)</div>
              <div className="text-xl font-mono font-bold text-emerald-400 mt-1">7,708</div>
              <div className="text-[10px] text-slate-500">Correct non-flood days</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">False Positive (FP)</div>
              <div className="text-xl font-mono font-bold text-amber-400 mt-1">3,124</div>
              <div className="text-[10px] text-slate-500">Higher alarm volume</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">False Negative (FN)</div>
              <div className="text-xl font-mono font-bold text-red-400 mt-1">1</div>
              <div className="text-[10px] text-slate-500">Only 1 event missed</div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-[10px] text-slate-400 uppercase">True Positive (TP)</div>
              <div className="text-xl font-mono font-bold text-cyan-400 mt-1">33</div>
              <div className="text-[10px] text-slate-500">33 of 34 captured</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top 29 Causal Feature Importances */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
              Top Contributing Model Features (29-Feature Pipeline)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ensemble feature gain scores derived from chronological XGBoost trees.
            </p>
          </div>
          <span className="text-[11px] text-slate-500 italic">
            Feature gain reflects tree utility &bull; Does not prove physical causality
          </span>
        </div>

        {/* Feature Importance Bar Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={features.slice(0, 10)} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '8px' }}
                labelStyle={{ color: '#94a3b8', fontSize: '11px' }}
                formatter={(val) => [(val * 100).toFixed(2) + '%', 'Importance']}
              />
              <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Feature Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="pb-3 px-3">Rank</th>
                <th className="pb-3 px-3">Feature Name</th>
                <th className="pb-3 px-3">Importance Weight</th>
                <th className="pb-3 px-3">Hydrological Mechanism</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
              {features.map((f, idx) => (
                <tr key={idx} className="hover:bg-slate-800/40 transition">
                  <td className="py-2.5 px-3 font-mono font-bold text-slate-500">#{idx + 1}</td>
                  <td className="py-2.5 px-3 font-bold text-white">{f.name}</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-300">{(f.value * 100).toFixed(2)}%</td>
                  <td className="py-2.5 px-3 text-slate-400">
                    {idx === 0 ? "Spatial prior & regional terrain elevation patterns" :
                     idx === 1 ? "Catchment saturation and two-week water table retention" :
                     idx === 2 ? "Multi-day monsoonal depression accumulation" :
                     idx === 3 ? "Immediate short-window flash storm impact" :
                     "Atmospheric thermodynamic and seasonal driver"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Embedded Historical Flood Replay */}
      <HistoricalFloodReplay />
    </div>
  );
};

export default ModelIntelligence;
