import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Clock,
  AlertOctagon,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  ChevronRight,
  Shield,
  FileSpreadsheet,
  Users,
  Briefcase,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { ScreenId, Submission } from '../types';
import { mockSubmissions } from '../data/mockData';

interface UnderwriterDashboardProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push') => void;
}

export const UnderwriterDashboard: React.FC<UnderwriterDashboardProps> = ({ onNavigate }) => {
  const [submissions] = useState<Submission[]>(mockSubmissions);
  const [filterLOB, setFilterLOB] = useState<string>('All');

  const filtered = filterLOB === 'All'
    ? submissions
    : submissions.filter((s) => s.lineOfBusiness.toLowerCase().includes(filterLOB.toLowerCase()));

  return (
    <div id="underwriter-dashboard-view" className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner Alert / Actionable Notification */}
      <div className="bg-gradient-to-r from-blue-950/80 via-indigo-950/70 to-slate-900 border border-blue-800/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Submission Queue: Referral Escalation Pending
              <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-[3px] font-mono">
                ACTION REQUIRED
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Apex Logistics & Freight Corp ($148,500 premium, 142 power units) has 2 authority limit triggers.
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <button
            id="dashboard-open-workbench-btn"
            data-path="underwriting-workbench"
            onClick={() => onNavigate('underwriting-workbench', 'none')}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-blue-600/30 flex items-center gap-1.5 transition"
          >
            <Briefcase className="w-3.5 h-3.5" />
            Open in Workbench
          </button>
          <button
            id="dashboard-view-referral-btn"
            data-path="user-permissions-workflows"
            onClick={() => onNavigate('user-permissions-workflows', 'push')}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
          >
            View Referrals
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Bound Premium (YTD)</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">$14.28M</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            +18.4% vs target ($12.0M)
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Portfolio Loss Ratio</span>
            <PieChart className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">44.6%</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Within plan (Target &lt;52%)
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Active Submissions</span>
            <Briefcase className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">24</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">
            5 New • 8 In Triage • 11 Active
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Avg Quote Turnaround</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">1.8 Days</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
            <span>-0.4 days vs SLA (2.5d)</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pending Referrals</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-2 font-mono">2 Escalated</div>
          <div className="text-[11px] text-amber-400/90 flex items-center gap-1 mt-1 font-medium">
            <span>Awaiting CUO Sign-off</span>
          </div>
        </div>
      </div>

      {/* Submissions Pipeline & Quick Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <h2 className="text-sm font-bold text-white">Priority Underwriting Queue</h2>
            <span className="text-xs text-slate-400">({filtered.length} submissions)</span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">Filter LOB:</span>
            {['All', 'Auto', 'HazMat', 'Cargo'].map((lob) => (
              <button
                key={lob}
                onClick={() => setFilterLOB(lob)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition ${
                  filterLOB === lob
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {lob}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800/80">
              <tr>
                <th className="px-4 py-3">Submission / Insured</th>
                <th className="px-4 py-3">Line of Business</th>
                <th className="px-4 py-3">Broker</th>
                <th className="px-4 py-3">Est. Premium</th>
                <th className="px-4 py-3">Loss Ratio</th>
                <th className="px-4 py-3">Risk Index</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-800/40 transition group cursor-pointer"
                  onClick={() => onNavigate('underwriting-workbench', 'none')}
                >
                  <td className="px-4 py-3.5">
                    <div className="font-semibold text-white group-hover:text-blue-400 transition flex items-center gap-1.5">
                      {item.insuredName}
                      {item.priority === 'High' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="High Priority"></span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                      <span>{item.id}</span>
                      <span>•</span>
                      <span>Eff: {item.effectiveDate}</span>
                      {item.fleetSize && (
                        <span className="text-slate-400">({item.fleetSize} units)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-slate-200 font-medium">{item.lineOfBusiness}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="text-slate-200">{item.broker}</div>
                    <div className="text-[11px] text-slate-400">{item.brokerFirm}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-slate-100 font-bold">
                    ${item.premium.toLocaleString()}
                  </td>
                  <td className="px-4 py-3.5 font-mono">
                    <span
                      className={`font-semibold ${
                        item.lossRatio > 60
                          ? 'text-rose-400'
                          : item.lossRatio > 45
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {item.lossRatio}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.riskScore >= 75
                              ? 'bg-emerald-500'
                              : item.riskScore >= 60
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${item.riskScore}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-[11px] text-slate-300 font-semibold">
                        {item.riskScore}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-[3px] text-[11px] font-medium ${
                        item.status === 'Referral'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : item.status === 'Quoted'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : item.status === 'Underwriting'
                          ? 'bg-blue-500/15 text-blue-300 border border-blue-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      id={`action-workbench-${item.id}`}
                      data-path="underwriting-workbench"
                      onClick={() => onNavigate('underwriting-workbench', 'none')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 rounded text-[11px] font-medium border border-slate-700 transition"
                    >
                      Workbench
                    </button>
                    <button
                      id={`action-quote-${item.id}`}
                      data-path="quote-workspace"
                      onClick={() => onNavigate('quote-workspace', 'none')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 rounded text-[11px] font-medium border border-slate-700 transition"
                    >
                      Quote
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Underwriting Appetite & Portfolio Analytics Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Underwriting Appetite Guide */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" />
              Underwriting Appetite Matrix (Q3/Q4)
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">v2026.2</span>
          </div>
          <p className="text-xs text-slate-400">
            Automated eligibility rules enforced during broker ingestion and rating.
          </p>
          <div className="space-y-2 pt-1">
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-emerald-300">Target Appetite</span>
                <p className="text-[11px] text-slate-400">Dry Van Freight, Intermodal Drayage, Samsara-equipped fleets</p>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                AUTO-PASS
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-amber-300">Conditional Appetite</span>
                <p className="text-[11px] text-slate-400">HazMat Class 3, Fleet size &gt;100 units, Refrigerated Goods</p>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                REFERRAL
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-800/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-rose-300">Restricted / Prohibited</span>
                <p className="text-[11px] text-slate-400">Explosives (Class 1), Over-the-road Hotshots without ELD</p>
              </div>
              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono font-bold">
                DECLINE
              </span>
            </div>
          </div>
        </div>

        {/* Quick Navigation Cards */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Key Account Workspaces
          </h3>
          <p className="text-xs text-slate-400">
            Instant jump to active policyholder records, loss runs, and quotes.
          </p>
          <div className="space-y-2">
            <a
              id="dash-jump-customer"
              data-path="customer-workspace"
              href="#customer-workspace"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('customer-workspace', 'none');
              }}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition group"
            >
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-blue-400">
                  Apex Logistics & Freight Corp
                </div>
                <div className="text-[11px] text-slate-400">DOT #2981044 • 4 Active Policies • 142 Units</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
            </a>

            <a
              id="dash-jump-policy"
              data-path="policy-workspace"
              href="#policy-workspace"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('policy-workspace', 'none');
              }}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition group"
            >
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-blue-400">
                  Policy Administration (Fleet Auto)
                </div>
                <div className="text-[11px] text-slate-400">POL-CA-2025-9921 • In-Force • $142,000/yr</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
            </a>

            <a
              id="dash-jump-claims"
              data-path="claim-workspace"
              href="#claim-workspace"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('claim-workspace', 'none');
              }}
              className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition group"
            >
              <div>
                <div className="text-xs font-semibold text-white group-hover:text-blue-400">
                  Active Claim File (Collision I-35)
                </div>
                <div className="text-[11px] text-slate-400">CLM-2026-0412 • $45,000 Incurred • Adjuster: R. Sterling</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
            </a>
          </div>
        </div>

        {/* Product Studio & Governance */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            Studio & Delegation Controls
          </h3>
          <p className="text-xs text-slate-400">
            Configure rating algorithms, insurance product forms, or inspect approval limits.
          </p>
          <div className="space-y-2 pt-1">
            <a
              id="dash-jump-factory"
              data-path="product-factory-designer"
              href="#product-factory-designer"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('product-factory-designer', 'none');
              }}
              className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 block transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white group-hover:text-cyan-400">
                  Product Factory Designer
                </span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-mono">v2.2</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Visual coverage hierarchy, rating matrix table, and automated rule test simulator.
              </p>
            </a>

            <a
              id="dash-jump-permissions"
              data-path="user-permissions-workflows"
              href="#user-permissions-workflows"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('user-permissions-workflows', 'none');
              }}
              className="p-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 block transition group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white group-hover:text-amber-400">
                  Referral Delegation Matrix
                </span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono">
                  2 In Queue
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Inspect CUO sign-off queues, underwriter authority tiers, and audit history.
              </p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
