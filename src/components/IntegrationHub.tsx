import React, { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Activity,
  RefreshCw,
  Server,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { mockIntegrations } from '../data/mockData';

interface IntegrationHubProps {
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
}

export const IntegrationHub: React.FC<IntegrationHubProps> = ({
  onNavigate,
  densityMode,
}) => {
  const [integrations, setIntegrations] = useState(mockIntegrations);
  const [pinging, setPinging] = useState(false);

  const handlePingAll = () => {
    setPinging(true);
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) => ({
          ...item,
          latencyMs: Math.max(18, Math.round(item.latencyMs + (Math.random() * 12 - 6))),
          lastSynced: 'Just now',
        }))
      );
      setPinging(false);
    }, 600);
  };

  return (
    <div id="integration-hub-view" className="space-y-6 animate-in fade-in duration-150">
      {/* Top Banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                INTEGRATION GATEWAY
              </span>
              <span className="font-mono font-bold text-xs text-teal-700">KENYA MARKET INTERCONNECT</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                ● ALL SYSTEMS OPERATIONAL
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1.5">
              Enterprise Integration Hub & Real-time Webhook Fabric
            </h1>

            <p className="text-xs text-slate-500 mt-1">
              Active connections for mobile money rails, core banking ledger, statutory tax registries, and vehicle telematics feeds.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePingAll}
              disabled={pinging}
              className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
              <span>{pinging ? 'Pinging Endpoints...' : 'Ping All Endpoints'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {integrations.map((conn) => (
          <div
            key={conn.id}
            className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 hover:border-slate-300 transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                  {conn.type}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {conn.status}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-2">{conn.name}</h3>
              <p className="text-xs text-slate-500 mt-1 font-mono">{conn.provider}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Latency:</span>
                  <span className="font-mono font-bold text-slate-900">{conn.latencyMs} ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uptime (30D):</span>
                  <span className="font-mono font-bold text-emerald-700">{conn.uptimePct}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Last Synced:</span>
                  <span className="font-mono text-slate-600 text-[11px]">{conn.lastSynced}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">API v2.4 (mTLS)</span>
              <span className="font-semibold text-teal-700 hover:text-teal-900 cursor-pointer">
                Inspect Logs →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
