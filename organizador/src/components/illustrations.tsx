import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import type { Module } from './theme';

type P = { size?: number };

// Ilustraciones propias, planas y redondeadas. Todas en un viewBox de 120×120.

export function Sun({ size = 120 }: P) {
  const rays = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G stroke="#FF9A4D" strokeWidth={6} strokeLinecap="round">
        {rays.map((a) => (
          <Path
            key={a}
            d={`M${60 + Math.cos(a) * 46} ${60 + Math.sin(a) * 46} L${60 + Math.cos(a) * 55} ${60 + Math.sin(a) * 55}`}
          />
        ))}
      </G>
      <Circle cx={60} cy={60} r={36} fill="#FF7A2E" />
      <Path d="M36 70 A36 36 0 0 0 96 60 A34 34 0 0 1 36 70 Z" fill="#F0651A" />
      <Circle cx={44} cy={66} r={5} fill="#FF9E8A" opacity={0.8} />
      <Circle cx={78} cy={66} r={5} fill="#FF9E8A" opacity={0.8} />
      <G stroke="#3A2414" strokeWidth={3.2} strokeLinecap="round" fill="none">
        <Path d="M46 56 Q50 60 54 56" />
        <Path d="M66 56 Q70 60 74 56" />
        <Path d="M53 69 Q60 75 67 69" />
      </G>
    </Svg>
  );
}

export function Moon({ size = 120 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path d="M74 22 A40 40 0 1 0 98 82 A32 32 0 1 1 74 22 Z" fill="#FFD23F" />
      <Path d="M30 86 A40 40 0 0 0 98 82 A40 40 0 0 1 30 86 Z" fill="#F2B800" />
      <G stroke="#3A2414" strokeWidth={3} strokeLinecap="round" fill="none">
        <Path d="M44 66 Q48 70 52 66" />
        <Path d="M50 78 Q55 82 60 78" />
      </G>
      <Path d="M96 24 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="#FFFFFF" />
      <Circle cx={22} cy={34} r={2.5} fill="#FFFFFF" />
      <Circle cx={104} cy={58} r={2} fill="#FFFFFF" />
      <Rect x={70} y={92} width={40} height={14} rx={7} fill="#B9C8FF" />
      <Rect x={82} y={86} width={20} height={14} rx={7} fill="#B9C8FF" />
    </Svg>
  );
}

export function Checklist({ size = 120 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <G rotation={-6} origin="60, 60">
        <Rect x={22} y={16} width={76} height={92} rx={16} fill="#FFFFFF" />
        <Rect x={44} y={10} width={32} height={14} rx={7} fill="#2D2A26" />
        {[40, 62, 84].map((y, i) => (
          <G key={y}>
            <Circle cx={40} cy={y} r={8} fill={i < 2 ? '#1E9E5A' : '#FFE1CC'} />
            {i < 2 && (
              <Path
                d={`M36 ${y} l3 3 6 -6`}
                stroke="#FFFFFF"
                strokeWidth={2.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
            <Rect x={54} y={y - 4} width={i === 1 ? 26 : 34} height={8} rx={4} fill="#FFD0AE" />
          </G>
        ))}
      </G>
    </Svg>
  );
}

export function Calendar({ size = 120 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Rect x={16} y={22} width={88} height={84} rx={18} fill="#FFFFFF" />
      <Path d="M16 40 A18 18 0 0 1 34 22 H86 A18 18 0 0 1 104 40 V46 H16 Z" fill="#FF7A2E" />
      <Rect x={36} y={14} width={8} height={18} rx={4} fill="#2D2A26" />
      <Rect x={76} y={14} width={8} height={18} rx={4} fill="#2D2A26" />
      {[0, 1, 2, 3].map((c) =>
        [0, 1, 2].map((r) => {
          const hit = c === 2 && r === 1;
          return (
            <Circle
              key={`${c}-${r}`}
              cx={32 + c * 19}
              cy={60 + r * 15}
              r={hit ? 7 : 4}
              fill={hit ? '#1652F0' : '#FFD8B8'}
            />
          );
        }),
      )}
    </Svg>
  );
}

export function Notebook({ size = 120 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      <Path d="M24 18 H78 L96 36 V102 A6 6 0 0 1 90 108 H30 A6 6 0 0 1 24 102 Z" fill="#FFFFFF" />
      <Path d="M78 18 V30 A6 6 0 0 0 84 36 H96 Z" fill="#E4D9FF" />
      {[50, 64, 78, 92].map((y, i) => (
        <Rect key={y} x={36} y={y} width={i === 3 ? 30 : 48} height={6} rx={3} fill="#D7C8FF" />
      ))}
      <G rotation={35} origin="92, 76">
        <Rect x={86} y={46} width={12} height={52} rx={4} fill="#FFB31F" />
        <Path d="M86 98 L92 110 L98 98 Z" fill="#FFE2B0" />
        <Rect x={86} y={46} width={12} height={9} rx={4} fill="#FF7A9E" />
      </G>
    </Svg>
  );
}

/** Ilustración por defecto de cada módulo. */
export function ModuleArt({ module, size }: { module: Module } & P) {
  switch (module) {
    case 'hoy':
      return <Sun size={size} />;
    case 'tareas':
      return <Checklist size={size} />;
    case 'agenda':
      return <Calendar size={size} />;
    case 'notas':
      return <Notebook size={size} />;
    case 'habitos':
      return <Moon size={size} />;
  }
}
