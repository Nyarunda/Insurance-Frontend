import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  FlaskConical,
  Play,
  CheckCircle2,
  AlertTriangle,
  Code2,
  BookOpen,
  DollarSign,
  ShieldCheck,
  Building2,
  ArrowRight,
  Sliders,
  Check,
  RotateCcw,
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';

interface ProductFactoryDesignerProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
  densityMode: DensityMode;
}

export const ProductFactoryDesigner: React.FC<ProductFactoryDesignerProps> = ({
  onNavigate,
  densityMode,
}) => {
  const [activeLayer, setActiveLayer] = useState<'base' | 'coverages' | 'rating' | 'testlab'>('testlab');

  // Interactive Test Lab State
  const [testVehicle, setTestVehicle] = useState<string>('Toyota Land Cruiser Prado TX');
  const [testValue, setTestValue] = useState<number>(4500000);
  const [testAge, setTestAge] = useState<number>(4); // 2022 model = 4 yrs
  const [isCommercial, setIsCommercial] = useState<boolean>(false);
  const [hasTelematics, setHasTelematics] = useState<boolean>(true);
  const [hasPVT, setHasPVT] = useState<boolean>(false);

  // Rating Engine Parameters
  const baseRate = 0.045; // 4.5%
  const ageFactor = testAge > 10 ? 1.25 : 1.0;
  const commercialFactor = isCommercial ? 1.35 : 1.0;
  const telematicsDiscount = hasTelematics ? 0.10 : 0.0;

  // Formula: Value * Base Rate * Age Factor * Commercial Factor * (1 - Telematics Discount)
  const calculatedBase = testValue * baseRate;
  const ageAdjusted = calculatedBase * ageFactor;
  const commercialAdjusted = ageAdjusted * commercialFactor;
  const discountAmount = commercialAdjusted * telematicsDiscount;
  const finalNetPremium = Math.round(commercialAdjusted - discountAmount + (hasPVT ? testValue * 0.0025 : 0));

  // Statutory levies
  const trainingLevy = Math.round(finalNetPremium * 0.002);
  const policyholdersFund = Math.round(finalNetPremium * 0.0025);
  const stampDuty = 40;
  const totalPayable = finalNetPremium + trainingLevy + policyholdersFund + stampDuty;

  return (
    <div id="product-factory-designer-view" className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                PRODUCT STUDIO
              </span>
              <span className="font-mono font-bold text-xs text-teal-700">PRD-MTR-COMP-v4.2</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                ● IN PRODUCTION
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              Motor Comprehensive Tariff Architecture & Rating Lab
            </h1>

            <p className="text-xs text-slate-500 mt-1">
              4-Layer Declarative Engine: Base Definition • Modular Coverages • Visual Formulas • Instant Simulation Sandbox
            </p>
          </div>

          {/* Quick Action Links */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigate('quote-360')}
              className="px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <span>Export to Quote 360</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 4 Layer Navigation Tabs */}
        <div className="mt-6 border-b border-slate-200 flex space-x-6 text-xs font-semibold overflow-x-auto">
          {(
            [
              { id: 'base', label: '1. Base Product Definition', icon: Building2 },
              { id: 'coverages', label: '2. Coverage Library', icon: BookOpen },
              { id: 'rating', label: '3. Rating Engine Formula', icon: Code2 },
              { id: 'testlab', label: '4. Product Test Lab Sandbox', icon: FlaskConical },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveLayer(tab.id)}
                className={`pb-3 transition-colors relative whitespace-nowrap flex items-center gap-1.5 ${
                  activeLayer === tab.id
                    ? 'text-teal-700 font-bold border-b-2 border-teal-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Layer 1: Base Product Definition */}
      {activeLayer === 'base' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Layer 1: Base Product Specification</h2>
            <p className="text-xs text-slate-500">Core regulatory taxonomy, territorial jurisdiction, and currency boundaries</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase font-bold">Line of Business</span>
              <div className="font-bold text-slate-900 text-sm">General Insurance • Motor</div>
              <div className="text-slate-500 text-[11px]">Class Code: MTR-GEN-01</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase font-bold">Territorial Jurisdiction</span>
              <div className="font-bold text-slate-900 text-sm">Republic of Kenya</div>
              <div className="text-slate-500 text-[11px]">COMESA Yellow Card Extension</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase font-bold">Settlement Currency</span>
              <div className="font-bold text-slate-900 font-mono text-sm">KES (Kenyan Shilling)</div>
              <div className="text-slate-500 text-[11px]">Sub-units: Cents (2 decimals)</div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
              <span className="font-mono text-[10px] text-slate-400 uppercase font-bold">Regulatory Authority</span>
              <div className="font-bold text-slate-900 text-sm">IRA Kenya Section 72</div>
              <div className="text-slate-500 text-[11px]">Tariff Band 4.5% - 7.5%</div>
            </div>
          </div>
        </div>
      )}

      {/* Layer 2: Coverage Library */}
      {activeLayer === 'coverages' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Layer 2: Modular Coverage Library</h2>
            <p className="text-xs text-slate-500">Atomic coverage modules assembled dynamically into the comprehensive policy schedule</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Accidental Damage, Fire & Theft</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700">MANDATORY CORE</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Full indemnity for physical damage, overturn, collision, lightning, and total vehicle theft.
              </p>
              <div className="font-mono text-[11px] text-slate-500">Rating Basis: 100% of Stated Market Value</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Third-Party Bodily Injury & Property Damage</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700">STATUTORY MANDATORY</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Unlimited bodily injury indemnity for third parties and passenger liability up to KES 20M limit.
              </p>
              <div className="font-mono text-[11px] text-slate-500">Rating Basis: Fixed statutory tariff rate</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Political Violence & Terrorism (PVT)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">OPTIONAL RIDER</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Loss or damage caused by riot, strike, civil commotion, malicious damage, or acts of terrorism.
              </p>
              <div className="font-mono text-[11px] text-slate-500">Rating Basis: +0.25% on Sum Insured</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Windscreen & Window Glass</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">ZERO EXCESS</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Direct replacement without deductible excess through authorized national glass networks.
              </p>
              <div className="font-mono text-[11px] text-slate-500">Limit: Up to KES 100,000 free with Comprehensive</div>
            </div>
          </div>
        </div>
      )}

      {/* Layer 3: Rating Engine Formula */}
      {activeLayer === 'rating' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Layer 3: Rating Engine Visual Expression</h2>
            <p className="text-xs text-slate-500">Executable mathematical formula tree parsed at quote calculation runtime</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs space-y-4">
            <div className="text-teal-400 font-bold">// Motor Comprehensive Formula Specification v4.2</div>
            <div className="space-y-1 text-slate-300">
              <div><span className="text-rose-400">const</span> Base_Rate = <span className="text-amber-300">0.045</span>; <span className="text-slate-500">// 4.5% statutory base</span></div>
              <div><span className="text-rose-400">const</span> Vehicle_Age_Factor = age &gt; <span className="text-amber-300">10</span> ? <span className="text-amber-300">1.25</span> : <span className="text-amber-300">1.00</span>;</div>
              <div><span className="text-rose-400">const</span> Commercial_Factor = isCommercial ? <span className="text-amber-300">1.35</span> : <span className="text-amber-300">1.00</span>;</div>
              <div><span className="text-rose-400">const</span> Telematics_Discount = hasTelematics ? <span className="text-amber-300">0.10</span> : <span className="text-amber-300">0.00</span>; <span className="text-slate-500">// 10% credit</span></div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-teal-300">
              Net_Premium = Sum_Insured * Base_Rate * Vehicle_Age_Factor * Commercial_Factor * (1 - Telematics_Discount);
            </div>
          </div>
        </div>
      )}

      {/* Layer 4: Product Test Lab Sandbox (Signature Feature) */}
      {activeLayer === 'testlab' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive Controls */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-teal-600" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
                  Test Lab Inputs
                </h2>
              </div>
              <button
                onClick={() => {
                  setTestValue(4500000);
                  setTestAge(4);
                  setIsCommercial(false);
                  setHasTelematics(true);
                  setHasPVT(false);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Prado Default</span>
              </button>
            </div>

            {/* Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Vehicle Description</label>
                <input
                  type="text"
                  value={testVehicle}
                  onChange={(e) => setTestVehicle(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs text-slate-900"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="font-semibold text-slate-700">Sum Insured Value (KES)</label>
                  <span className="font-mono font-bold text-teal-700">
                    KES {testValue.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={1000000}
                  max={25000000}
                  step={250000}
                  value={testValue}
                  onChange={(e) => setTestValue(parseInt(e.target.value))}
                  className="w-full accent-teal-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="font-semibold text-slate-700">Vehicle Age (Years)</label>
                  <span className="font-mono font-bold text-slate-900">{testAge} Years</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={testAge}
                  onChange={(e) => setTestAge(parseInt(e.target.value))}
                  className="w-full accent-teal-600"
                />
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {testAge > 10 ? 'Age > 10 applies 1.25x loading factor' : 'Standard age factor (1.0x)'}
                </div>
              </div>

              {/* Toggles */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 cursor-pointer">
                  <span className="font-medium text-slate-800">Commercial Usage (1.35x)</span>
                  <input
                    type="checkbox"
                    checked={isCommercial}
                    onChange={(e) => setIsCommercial(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 cursor-pointer">
                  <span className="font-medium text-slate-800">Telematics Fitted (-10% Credit)</span>
                  <input
                    type="checkbox"
                    checked={hasTelematics}
                    onChange={(e) => setHasTelematics(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                </label>

                <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/60 cursor-pointer">
                  <span className="font-medium text-slate-800">PVT Terrorism Extension (+0.25%)</span>
                  <input
                    type="checkbox"
                    checked={hasPVT}
                    onChange={(e) => setHasPVT(e.target.checked)}
                    className="w-4 h-4 text-teal-600 rounded"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Live Output & Rule Trace Breakdown */}
          <div className="lg:col-span-7 space-y-4">
            {/* Live Output Banner */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Instant Simulation Output
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{testVehicle}</h3>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-2xl font-bold font-mono text-teal-700">
                    KES {finalNetPremium.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Total with Levies: <strong>KES {totalPayable.toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              {/* Mathematical Rule Trace Execution */}
              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Runtime Rule Execution Trace
                </h4>

                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 font-mono text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-700">
                    <span>1. Base Premium (4.5% of KES {testValue.toLocaleString()}):</span>
                    <span className="font-bold text-slate-900">KES {calculatedBase.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between text-slate-700">
                    <span>2. Vehicle Age Factor ({ageFactor}x):</span>
                    <span className="font-bold text-slate-900">
                      {ageFactor > 1.0 ? `Loaded to KES ${ageAdjusted.toLocaleString()}` : 'No loading (1.0x)'}
                    </span>
                  </div>

                  <div className="flex justify-between text-slate-700">
                    <span>3. Commercial Factor ({commercialFactor}x):</span>
                    <span className="font-bold text-slate-900">
                      {isCommercial ? `Loaded to KES ${commercialAdjusted.toLocaleString()}` : 'Private use (1.0x)'}
                    </span>
                  </div>

                  <div className="flex justify-between text-emerald-700">
                    <span>4. Telematics Discount (-10%):</span>
                    <span className="font-bold">
                      {hasTelematics ? `- KES ${discountAmount.toLocaleString()}` : 'Not applied'}
                    </span>
                  </div>

                  {hasPVT && (
                    <div className="flex justify-between text-slate-700">
                      <span>5. PVT Terrorism Rider (0.25%):</span>
                      <span className="font-bold text-slate-900">+ KES {(testValue * 0.0025).toLocaleString()}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-teal-900">
                    <span>Net Rated Premium:</span>
                    <span>KES {finalNetPremium.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Ready to bind with these tariff parameters?</span>
                <button
                  onClick={() => onNavigate('quote-360')}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Launch in Quote 360</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
