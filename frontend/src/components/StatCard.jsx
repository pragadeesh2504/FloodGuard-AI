import React from 'react';

const StatCard = ({ title, value, unit, icon: Icon, trend, trendType, colorClass = "text-accentCyan" }) => {
  return (
    <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase mb-1">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight text-slate-100">
          {value} <span className="text-sm font-medium text-slate-400">{unit}</span>
        </h3>

        {trend && (
          <p className={`text-xs mt-2 flex items-center gap-1 ${
            trendType === 'danger' ? 'text-hazardRed' :
            trendType === 'warning' ? 'text-hazardOrange' : 'text-safeGreen'
          }`}>
            {trend}
          </p>
        )}
      </div>
      <div className={`p-4 rounded-xl bg-slate-900/60 border border-slate-800 ${colorClass}`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export default StatCard;
