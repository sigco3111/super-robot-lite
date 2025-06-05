
import React from 'react';
import { DelegationToggleProps } from '../types';

const DelegationToggle: React.FC<DelegationToggleProps> = ({ isActive, onToggle, label = "위임 모드", className = "" }) => {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
        ${isActive ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500' : 'bg-slate-600 hover:bg-slate-500 text-slate-200 focus:ring-sky-500'}
        ${className}`}
      aria-pressed={isActive}
    >
      {label}: <span className="font-bold">{isActive ? '켜짐' : '꺼짐'}</span>
    </button>
  );
};

export default DelegationToggle;
