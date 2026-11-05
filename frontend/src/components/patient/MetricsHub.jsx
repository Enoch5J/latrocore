import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import {
  Activity, CheckCircle, AlertCircle, ArrowRight,
  ClipboardCheck, FileText, Search, Droplets
} from 'lucide-react';
import { Badge } from '../../components/ui';
import { formatDate, formatTime, isToday, formatDateTime } from '../../data/demoDate';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, ReferenceLine, ComposedChart } from 'recharts';

const TABS = [
  { id: 'glucose', label: 'Glucose Monitor', icon: Activity },
  { id: 'checklist', label: 'Care Checklist', icon: ClipboardCheck },
  { id: 'investigations', label: 'Investigations', icon: FileText },
  { id: 'screening', label: 'Screening', icon: Search },
];

export default function MetricsHub({
  glucoseReadings = [],
  targets,
  checklistItems = [],
  investigations = [],
  screenings = [],
  healthEntries = [],
  adherence,
  patientId,
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('glucose');
  const [chartRange, setChartRange] = useState('7d');

  const checklistProgress = checklistItems.length > 0
    ? Math.round((checklistItems.filter(i => i.done).length / checklistItems.length) * 100)
    : 0;

  const chartData = useMemo(() => {
    const days = chartRange === '7d' ? 7 : 30;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return glucoseReadings
      .filter(r => new Date(r.dateTime) >= cutoff)
      .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
      .map(r => ({
        date: formatDate(r.dateTime, { month: 'short', day: 'numeric' }),
        time: formatTime(r.dateTime),
        value: r.value,
        context: r.context,
        full: `${formatDate(r.dateTime)} ${formatTime(r.dateTime)}`,
      }));
  }, [glucoseReadings, chartRange]);

  return (
    <div className="card border-2 border-slate-200 overflow-hidden">
      {/* Tab Navigation */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 pt-3 pb-0">
        <div className="flex items-center gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-extrabold rounded-t-xl border-2 border-b-0 transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-teal-900 border-slate-200 shadow-sm -mb-px z-10'
                  : 'bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <tab.icon size={15} />
              <span>{tab.label}</span>
              {tab.id === 'checklist' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  checklistProgress >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>{checklistProgress}%</span>
              )}
              {tab.id === 'investigations' && investigations.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-blue-100 text-blue-800">{investigations.length}</span>
              )}
              {tab.id === 'screening' && screenings.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-black bg-purple-100 text-purple-800">{screenings.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white">
        {/* ━━ Glucose Monitor ━━ */}
        {activeTab === 'glucose' && (
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                  <Activity size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-950">Glucose Trend Profile</h3>
                  <p className="text-xs font-semibold text-slate-600">Continuous clinical self-monitoring with glycemic target zones</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {['7d', '30d'].map(r => (
                    <button
                      key={r}
                      onClick={() => setChartRange(r)}
                      className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all cursor-pointer ${
                        chartRange === r
                          ? 'bg-teal-800 text-white shadow-xs'
                          : 'text-slate-800 hover:text-black hover:bg-slate-200/70'
                      }`}
                    >
                      {r === '7d' ? '7 Days' : '30 Days'}
                    </button>
                  ))}
                </div>
                <button onClick={() => navigate('/patient/metrics?tab=glucose')} className="btn-outline btn-sm">
                  <span>Full Analytics</span><ArrowRight size={14} />
                </button>
              </div>
            </div>
            {chartData.length > 0 ? (
              <div className="w-full min-w-0 overflow-hidden" style={{ minHeight: 280 }}>
                <ResponsiveContainer width="100%" height={290} minWidth={0}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#CBD5E1" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#090D16', fontWeight: 600 }} />
                    <YAxis domain={[60, 300]} tick={{ fontSize: 11, fill: '#090D16', fontWeight: 600 }} />
                    <ReTooltip
                      contentStyle={{ backgroundColor: '#090D16', border: 'none', borderRadius: 12, color: '#FFFFFF', fontSize: 12, fontWeight: 600, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)' }}
                      formatter={(val) => [`${val} mg/dL`, 'Blood Glucose']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    {targets && (
                      <>
                        <ReferenceLine y={targets.fastingGlucoseMax} stroke="#D97706" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Target Max (130)', fill: '#D97706', fontSize: 10, position: 'right' }} />
                        <ReferenceLine y={targets.fastingGlucoseMin} stroke="#D97706" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'Target Min (80)', fill: '#D97706', fontSize: 10, position: 'right' }} />
                      </>
                    )}
                    <Line type="monotone" dataKey="value" stroke="#0D7A71" strokeWidth={3} dot={{ r: 3.5, fill: '#0D7A71', stroke: '#FFFFFF', strokeWidth: 1.5 }} activeDot={{ r: 6, fill: '#0D7A71' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-800 font-bold">No glucose data recorded for this time range</div>
            )}
            {!targets && (
              <p className="text-xs font-bold text-amber-800 mt-2 flex items-center gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle size={14} className="text-amber-700 shrink-0" />
                Target range not configured by your clinician yet. Standard fasting targets: 80 – 130 mg/dL.
              </p>
            )}
          </div>
        )}

        {/* ━━ Care Checklist ━━ */}
        {activeTab === 'checklist' && (
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                  <ClipboardCheck size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-950">Clinical Care Checklist</h3>
                  <p className="text-xs font-semibold text-slate-600">ADA 2026 Protocol — Essential checkpoints for glycemic control</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-teal-900 bg-teal-100 px-2.5 py-1 rounded-lg border border-teal-200">
                  {checklistProgress}% Complete
                </span>
                <button onClick={() => navigate('/patient/metrics?tab=checklist')} className="btn-outline btn-sm">
                  <span>View All Cards</span><ArrowRight size={14} />
                </button>
              </div>
            </div>
            <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300 mb-4">
              <div className="h-full bg-teal-700 rounded-full transition-all duration-500" style={{ width: `${checklistProgress}%` }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {checklistItems.map((item, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
                  item.done ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/40 border-amber-200'
                }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    item.done ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {item.done ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-extrabold ${item.done ? 'text-emerald-900' : 'text-amber-900'}`}>{item.label}</p>
                    <p className="text-[10px] font-semibold text-slate-600 mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ━━ Investigations ━━ */}
        {activeTab === 'investigations' && (
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-800">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-950">Diagnostic Investigations</h3>
                  <p className="text-xs font-semibold text-slate-600">Lab test results & diagnostic records</p>
                </div>
              </div>
              <button onClick={() => navigate('/patient/metrics?tab=investigations')} className="btn-outline btn-sm">
                <span>Full Details</span><ArrowRight size={14} />
              </button>
            </div>
            {investigations.length === 0 ? (
              <div className="text-center py-10 text-slate-600 font-bold">No investigation records available</div>
            ) : (
              <div className="space-y-2.5">
                {investigations.slice(0, 6).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border-2 border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-slate-950">{inv.type || inv.name}</p>
                      <p className="text-[10px] font-semibold text-slate-600 mt-0.5">{formatDate(inv.date)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black text-blue-900">{inv.value}{inv.unit ? ` ${inv.unit}` : ''}</span>
                      <Badge variant={inv.status === 'completed' ? 'success' : 'warning'}>{inv.status || 'Recorded'}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ━━ Screening ━━ */}
        {activeTab === 'screening' && (
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-800">
                  <Search size={22} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-950">Preventive Screening</h3>
                  <p className="text-xs font-semibold text-slate-600">Annual screening schedule for complications prevention</p>
                </div>
              </div>
              <button onClick={() => navigate('/patient/metrics?tab=screening')} className="btn-outline btn-sm">
                <span>Full Schedule</span><ArrowRight size={14} />
              </button>
            </div>
            {screenings.length === 0 ? (
              <div className="text-center py-10 text-slate-600 font-bold">No screening records available</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {screenings.map(s => (
                  <div key={s.id} className={`p-3 rounded-xl border-2 transition-all ${
                    s.status === 'completed' ? 'bg-emerald-50/50 border-emerald-200' :
                    s.status === 'overdue' ? 'bg-rose-50 border-rose-200' :
                    'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-extrabold text-slate-950">{s.type}</p>
                      <Badge variant={s.status === 'completed' ? 'success' : s.status === 'overdue' ? 'danger' : 'warning'}>
                        {s.status ? s.status.charAt(0).toUpperCase() + s.status.slice(1) : 'Pending'}
                      </Badge>
                    </div>
                    {s.date && <p className="text-[10px] font-semibold text-slate-600 mt-1">{s.status === 'completed' ? 'Completed' : 'Due'}: {formatDate(s.date)}</p>}
                    {s.result && <p className="text-[10px] font-bold text-slate-800 mt-0.5">Result: {s.result}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

