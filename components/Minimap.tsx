
import React from 'react';
import { RobotInstance, TerrainType } from '../types';
import { TERRAIN_ZONE_ASTEROID_FIELD_MAX_Y, TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y, TERRAIN_EFFECTS_MAP } from '../constants';

interface MinimapProps {
  playerUnits: RobotInstance[];
  enemyUnits: RobotInstance[];
  selectedPlayerUnitId: string | null;
  selectedEnemyTargetId: string | null;
}

const Minimap: React.FC<MinimapProps> = ({ playerUnits, enemyUnits, selectedPlayerUnitId, selectedEnemyTargetId }) => {
  const allUnits = [
    ...playerUnits.filter(u => u.currentHp > 0),
    ...enemyUnits.filter(u => u.currentHp > 0)
  ];

  const terrainZones = [
    { id: TerrainType.ASTEROID_FIELD, top: 0, height: TERRAIN_ZONE_ASTEROID_FIELD_MAX_Y, color: 'bg-slate-700/60', label: TERRAIN_EFFECTS_MAP.get(TerrainType.ASTEROID_FIELD)?.name || 'Asteroid Field' },
    { id: TerrainType.COLONY_INTERIOR, top: TERRAIN_ZONE_ASTEROID_FIELD_MAX_Y, height: TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y - TERRAIN_ZONE_ASTEROID_FIELD_MAX_Y, color: 'bg-emerald-800/50', label: TERRAIN_EFFECTS_MAP.get(TerrainType.COLONY_INTERIOR)?.name || 'Colony Interior' },
    { id: TerrainType.SPACE, top: TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y, height: 100 - TERRAIN_ZONE_COLONY_INTERIOR_MAX_Y, color: 'bg-indigo-900/40', label: TERRAIN_EFFECTS_MAP.get(TerrainType.SPACE)?.name || 'Space' },
  ];

  return (
    <div className="p-3 bg-slate-800 rounded-lg shadow-md border border-slate-700 h-48 relative overflow-hidden">
      {/* Terrain Zones Background */}
      {terrainZones.map(zone => (
        <div
          key={zone.id}
          className={`absolute left-0 right-0 ${zone.color} flex items-center justify-center`}
          style={{ top: `${zone.top}%`, height: `${zone.height}%` }}
          aria-hidden="true"
        >
          <span className="text-xs text-slate-400/70 font-semibold opacity-80 select-none">{zone.label}</span>
        </div>
      ))}

      {/* Grid Overlay (optional, kept from original style) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(100, 116, 139, 0.1) 1px, transparent 1px),
            linear-gradient(to right, rgba(100, 116, 139, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
        aria-hidden="true"
      />

      {/* Units */}
      {allUnits.map(unit => {
        const isSelectedPlayer = unit.isPlayerUnit && unit.id === selectedPlayerUnitId;
        const isSelectedTarget = !unit.isPlayerUnit && unit.id === selectedEnemyTargetId;

        let size = 'w-2.5 h-2.5';
        let borderColor = 'border-transparent';
        let zIndex = 10;
        let animation = '';

        if (isSelectedPlayer || isSelectedTarget) {
          size = 'w-3.5 h-3.5';
          borderColor = 'border-yellow-400';
          zIndex = 20; // Selected units on top
          animation = 'animate-pulse';
        }

        const unitColor = unit.isPlayerUnit ? 'bg-sky-500' : 'bg-red-500';

        return (
          <div
            key={unit.id}
            title={`${unit.name} (${unit.currentHp} HP) - 지형: ${TERRAIN_EFFECTS_MAP.get(unit.currentTerrainId ?? TerrainType.SPACE)?.name}`}
            className={`absolute ${size} ${unitColor} rounded-full border-2 ${borderColor} ${animation} transition-all duration-200`}
            style={{
              left: `${unit.minimapX}%`,
              top: `${unit.minimapY}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: zIndex,
              boxShadow: '0 0 5px rgba(0,0,0,0.5)',
            }}
            aria-label={`${unit.isPlayerUnit ? 'Player' : 'Enemy'} unit: ${unit.name} in ${TERRAIN_EFFECTS_MAP.get(unit.currentTerrainId ?? TerrainType.SPACE)?.name}`}
          />
        );
      })}
    </div>
  );
};

export default Minimap;
