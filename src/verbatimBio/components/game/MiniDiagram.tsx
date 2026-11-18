import React from 'react';
import { motion } from 'framer-motion';
import type { MiniDiagramKind } from '../../constants/bioEnums.ts';

interface MiniDiagramProps {
  kind: MiniDiagramKind;
}

export const MiniDiagram: React.FC<MiniDiagramProps> = ({ kind }) => {
  if (kind === 'osmosis_water') {
    return (
      <div className="rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] p-3">
        <svg viewBox="0 0 280 96" className="w-full h-24">
          <rect x="8" y="10" width="122" height="76" rx="8" fill="#E0F2FE" />
          <rect x="150" y="10" width="122" height="76" rx="8" fill="#FEF3C7" />
          {/* Selectively permeable membrane */}
          <line
            x1="140"
            y1="10"
            x2="140"
            y2="86"
            stroke="#0284C7"
            strokeWidth="4"
            strokeDasharray="6 4"
          />
          <text x="68" y="24" textAnchor="middle" fontSize="9" fill="#0369A1" fontWeight="600">
            High Water Potential
          </text>
          <text x="211" y="24" textAnchor="middle" fontSize="9" fill="#92400E" fontWeight="600">
            Salty / Low Water
          </text>
          {/* Animated water molecules crossing */}
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cy={42 + i * 16}
              r="5"
              fill="#0EA5E9"
              initial={{ cx: 48 }}
              animate={{ cx: [48, 224] }}
              transition={{ duration: 2.2, delay: i * 0.45, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
          {/* Blocked large salt solutes */}
          <circle cx="184" cy="48" r="8" fill="#D97706" opacity="0.7" />
          <circle cx="222" cy="64" r="8" fill="#D97706" opacity="0.7" />
          <text x="140" y="93" textAnchor="middle" fontSize="8.5" fill="#0F172A">
            Water crosses membrane toward higher solute concentration
          </text>
        </svg>
      </div>
    );
  }

  if (kind === 'photosynthesis_eq') {
    return (
      <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3">
        <svg viewBox="0 0 280 92" className="w-full h-24">
          <motion.g initial={{ opacity: 0.4 }} animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2.4, repeat: Infinity }}>
            <rect x="8" y="22" width="54" height="36" rx="8" fill="#FEF08A" stroke="#CA8A04" />
            <text x="35" y="43" textAnchor="middle" fontSize="10" fontWeight="700" fill="#854D0E">Light</text>
          </motion.g>
          <text x="71" y="44" textAnchor="middle" fontSize="12" fontWeight="700" fill="#065F46">+</text>
          <rect x="80" y="22" width="60" height="36" rx="8" fill="#E0F2FE" stroke="#0284C7" />
          <text x="110" y="43" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0369A1">CO₂ + H₂O</text>
          <motion.path
            d="M146 40 L166 40"
            stroke="#0D7A5F"
            strokeWidth="2.5"
            markerEnd="url(#arrow)"
            animate={{ x: [0, 3, 0] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <rect x="172" y="22" width="98" height="36" rx="8" fill="#D1FAE5" stroke="#059669" />
          <text x="221" y="43" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#065F46">Glucose + O₂ ↑</text>
          <text x="140" y="78" textAnchor="middle" fontSize="8.5" fill="#065F46">
            Chlorophyll captures light to convert CO₂ & water into sugar + oxygen
          </text>
        </svg>
      </div>
    );
  }

  if (kind === 'fermentation_eq') {
    return (
      <div className="rounded-xl bg-[#FFFBEB] border border-[#FDE68A] p-3">
        <svg viewBox="0 0 280 90" className="w-full h-22">
          <rect x="12" y="22" width="76" height="36" rx="8" fill="#FEF3C7" stroke="#D97706" />
          <text x="50" y="44" textAnchor="middle" fontSize="10" fontWeight="700" fill="#92400E">Glucose</text>
          <text x="108" y="34" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#B45309">Yeast</text>
          <text x="108" y="47" textAnchor="middle" fontSize="12" fontWeight="700" fill="#B45309">→</text>
          <rect x="128" y="22" width="140" height="36" rx="8" fill="#FFEDD5" stroke="#EA580C" />
          <text x="198" y="44" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#9A3412">Ethanol + 2 CO₂ Gas ↑</text>
          <text x="140" y="76" textAnchor="middle" fontSize="8.5" fill="#92400E">
            Anaerobic respiration releases CO₂ bubbles that inflate the balloon
          </text>
        </svg>
      </div>
    );
  }

  if (kind === 'heart_double_loop' || kind === 'alveoli_exchange') {
    return (
      <div className="rounded-xl bg-[#FFF1F2] border border-[#FECDD3] p-3">
        <svg viewBox="0 0 280 94" className="w-full h-24">
          {/* Lungs */}
          <rect x="110" y="6" width="60" height="22" rx="8" fill="#FCE7F3" stroke="#DB2777" />
          <text x="140" y="20" textAnchor="middle" fontSize="9" fontWeight="700" fill="#9D174D">Lungs (O₂)</text>
          {/* Right / Left Heart */}
          <rect x="26" y="40" width="84" height="32" rx="8" fill="#DBEAFE" stroke="#2563EB" />
          <text x="68" y="59" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#1E40AF">Right Heart (CO₂)</text>
          <rect x="170" y="40" width="84" height="32" rx="8" fill="#FEE2E2" stroke="#DC2626" />
          <text x="212" y="59" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#991B1B">Left Heart (O₂)</text>
          {/* Flow arcs */}
          <motion.circle r="4.5" fill="#2563EB" animate={{ cx: [68, 110], cy: [40, 17] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <motion.circle r="4.5" fill="#DC2626" animate={{ cx: [170, 212], cy: [17, 40] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <text x="140" y="88" textAnchor="middle" fontSize="8.5" fill="#881337">
            Deoxygenated blood picks up O₂ in lungs, then pumps body-wide
          </text>
        </svg>
      </div>
    );
  }

  if (kind === 'mitosis_pmat') {
    return (
      <div className="rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] p-3">
        <svg viewBox="0 0 280 90" className="w-full h-22">
          {['P', 'M', 'A', 'T'].map((letter, idx) => (
            <g key={letter} transform={`translate(${18 + idx * 66}, 14)`}>
              <circle cx="24" cy="24" r="20" fill="#EDE9FE" stroke="#7C3AED" strokeWidth="1.8" />
              <text x="24" y="28" textAnchor="middle" fontSize="11" fontWeight="700" fill="#5B21B6">
                {letter}
              </text>
            </g>
          ))}
          <text x="140" y="78" textAnchor="middle" fontSize="8.5" fill="#4C1D95">
            Prophase → Metaphase (Middle) → Anaphase (Apart) → Telophase (Two 2n)
          </text>
        </svg>
      </div>
    );
  }

  if (kind === 'xylem_transpiration') {
    return (
      <div className="rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] p-3">
        <svg viewBox="0 0 280 92" className="w-full h-24">
          <rect x="128" y="20" width="24" height="52" rx="4" fill="#BAE6FD" stroke="#0284C7" />
          <ellipse cx="140" cy="18" rx="44" ry="12" fill="#86EFAC" stroke="#15803D" />
          <text x="140" y="21" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#14532D">Leaves (Stomata ↑)</text>
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx="140"
              r="3.5"
              fill="#0284C7"
              animate={{ cy: [70, 26] }}
              transition={{ duration: 1.6, delay: i * 0.5, repeat: Infinity }}
            />
          ))}
          <text x="140" y="86" textAnchor="middle" fontSize="8.5" fill="#0369A1">
            Cohesion-tension pulls water upward from roots through xylem
          </text>
        </svg>
      </div>
    );
  }

  if (kind === 'factory_equation') {
    return (
      <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-3">
        <svg viewBox="0 0 280 96" className="w-full h-24">
          <rect x="8" y="14" width="66" height="44" rx="8" fill="#E0F2FE" stroke="#0284C7" strokeWidth="1.5" />
          <text x="41" y="33" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0369A1">6CO₂ + 6H₂O</text>
          <text x="41" y="48" textAnchor="middle" fontSize="8" fill="#0284C7">+ Sunlight</text>

          <motion.circle r="4" fill="#FACC15" animate={{ cx: [76, 108] }} transition={{ duration: 1.4, repeat: Infinity }} cy="36" />

          <rect x="110" y="10" width="66" height="52" rx="12" fill="#DCFCE7" stroke="#15803D" strokeWidth="2" />
          <text x="143" y="33" textAnchor="middle" fontSize="9" fontWeight="700" fill="#14532D">Chloroplast</text>
          <text x="143" y="47" textAnchor="middle" fontSize="8" fill="#166534">Solar Factory</text>

          <motion.circle r="4" fill="#10B981" animate={{ cx: [178, 206] }} transition={{ duration: 1.4, repeat: Infinity }} cy="36" />

          <rect x="208" y="14" width="64" height="44" rx="8" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" />
          <text x="240" y="33" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#92400E">C₆H₁₂O₆</text>
          <text x="240" y="48" textAnchor="middle" fontSize="8" fill="#0284C7">+ 6O₂ ↑</text>

          <text x="140" y="82" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#065F46">
            Solar Factory Equation: 6CO₂ + 6H₂O → Glucose (C₆H₁₂O₆) + 6O₂
          </text>
        </svg>
      </div>
    );
  }

  if (kind === 'limiting_factor_curve') {
    return (
      <div className="rounded-xl bg-[#F0F9FF] border border-[#BAE6FD] p-3">
        <svg viewBox="0 0 280 96" className="w-full h-24">
          <line x1="28" y1="12" x2="28" y2="70" stroke="#475569" strokeWidth="1.8" />
          <line x1="28" y1="70" x2="262" y2="70" stroke="#475569" strokeWidth="1.8" />
          {/* 0.04% CO2 plateau curve */}
          <path d="M 30 66 Q 75 40, 120 40 L 250 40" fill="none" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 3" />
          <text x="200" y="52" fontSize="8" fill="#475569" fontWeight="600">0.04% CO₂ (Plateau)</text>
          {/* 0.10% CO2 higher curve */}
          <motion.path
            d="M 30 66 Q 90 20, 165 18 L 250 18"
            fill="none"
            stroke="#0284C7"
            strokeWidth="2.5"
            initial={{ pathLength: 0.2 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <text x="195" y="14" fontSize="8" fill="#0369A1" fontWeight="700">0.10% CO₂</text>
          <text x="18" y="42" textAnchor="middle" fontSize="8" fill="#334155" transform="rotate(-90 18 42)">Rate</text>
          <text x="145" y="86" textAnchor="middle" fontSize="8.5" fontWeight="600" fill="#0369A1">
            Raising CO₂ removes the bottleneck so higher light drives faster O₂ bubbles
          </text>
        </svg>
      </div>
    );
  }

  // Default cell wall / starch / membrane / enzyme diagram
  return (
    <div className="rounded-xl bg-[#F2F9F5] border border-[#CBE0D4] p-3">
      <svg viewBox="0 0 280 88" className="w-full h-22">
        <rect x="20" y="14" width="70" height="44" rx="6" fill="#DCFCE7" stroke="#15803D" strokeWidth="2" />
        <rect x="100" y="14" width="70" height="44" rx="6" fill="#DCFCE7" stroke="#15803D" strokeWidth="2" />
        <rect x="180" y="14" width="70" height="44" rx="6" fill="#DCFCE7" stroke="#15803D" strokeWidth="2" />
        <circle cx="42" cy="32" r="6" fill="#92400E" />
        <circle cx="122" cy="32" r="6" fill="#92400E" />
        <circle cx="202" cy="32" r="6" fill="#92400E" />
        <text x="140" y="76" textAnchor="middle" fontSize="8.5" fill="#14532D">
          Stained cellular boundaries and nuclei revealed for inspection
        </text>
      </svg>
    </div>
  );
};
