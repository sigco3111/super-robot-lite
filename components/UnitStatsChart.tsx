
import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { RobotInstance, RadarStat } from '../types'; // Changed from RobotDefinition
import { RADAR_FULL_MARKS } from '../constants';

interface UnitStatsChartProps {
  selectedUnit: RobotInstance | null; // Changed from robotDef
}

const UnitStatsChart: React.FC<UnitStatsChartProps> = ({ selectedUnit }) => {
  if (!selectedUnit) {
    return (
      <div className="p-4 bg-slate-800 rounded-lg shadow-md h-72 flex items-center justify-center border border-slate-700">
        <p className="text-slate-400 italic">유닛을 선택하여 능력치를 확인하세요.</p>
      </div>
    );
  }

  // Use effective stats from the RobotInstance
  const data: RadarStat[] = [
    { subject: '체력', value: selectedUnit.effectiveMaxHp, fullMark: RADAR_FULL_MARKS.maxHp },
    { subject: 'EN', value: selectedUnit.effectiveMaxEn, fullMark: RADAR_FULL_MARKS.maxEn },
    { subject: '공격', value: selectedUnit.effectiveAttack, fullMark: RADAR_FULL_MARKS.attack },
    { subject: '방어', value: selectedUnit.effectiveDefense, fullMark: RADAR_FULL_MARKS.defense },
    { subject: '기동', value: selectedUnit.effectiveMobility, fullMark: RADAR_FULL_MARKS.mobility },
  ];

  return (
    <div className="p-1 bg-slate-800 rounded-lg shadow-md h-72 border border-slate-700">
      <h3 className="text-md font-semibold my-2 text-center text-slate-200">{selectedUnit.name} (Lv. {selectedUnit.level}) - 현재 능력치</h3>
      <ResponsiveContainer width="100%" height="85%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#4A5568" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#A0AEC0', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={{ fill: '#718096', fontSize: 10 }} />
          <Radar name={selectedUnit.name} dataKey="value" stroke="#38B2AC" fill="#38B2AC" fillOpacity={0.6} />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(45, 55, 72, 0.8)', border: '1px solid #718096', borderRadius: '0.5rem' }}
            labelStyle={{ color: '#E2E8F0' }}
            itemStyle={{ color: '#A0AEC0' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default UnitStatsChart;