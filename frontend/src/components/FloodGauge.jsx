import React from 'react';
import { motion } from 'framer-motion';

const FloodGauge = ({ probability = 0, riskLevel = "Safe", confidence = 1 }) => {
  const percent = Math.round(probability * 100);

  // Choose color scale
  const getColor = (val) => {
    if (val < 20) return '#10B981'; // Green
    if (val < 45) return '#F59E0B'; // Yellow
    if (val < 70) return '#F97316'; // Orange
    if (val < 85) return '#EF4444'; // Red
    return '#991B1B'; // Dark Red
  };

  const color = getColor(percent);

  // Circumference calculation for SVG circle
  const radius = 80;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/40 rounded-2xl border border-slate-800/80">
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Background Circle */}
        <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 200 200">
          <circle
            cx="100"
            cy="100"
            r={radius}
            stroke="rgba(30, 41, 59, 0.5)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Animated Gauge Circle */}
          <motion.circle
            cx="100"
            cy="100"
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>

        {/* Center Labels */}
        <div className="text-center z-10">
          <span className="text-4xl font-extrabold tracking-tight text-white block">
            {percent}%
          </span>
          <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold mt-1 block">
            Probability
          </span>
        </div>
      </div>

      <div className="text-center mt-4">
        <h4 className="text-lg font-bold tracking-wide" style={{ color }}>
          {riskLevel.toUpperCase()}
        </h4>
        <p className="text-xs text-slate-400 mt-1">
          Confidence Score: <span className="font-semibold text-slate-200">{(confidence * 100).toFixed(1)}%</span>
        </p>
      </div>
    </div>
  );
};

export default FloodGauge;
