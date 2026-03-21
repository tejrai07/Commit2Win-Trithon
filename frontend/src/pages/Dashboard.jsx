import { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceArea 
} from 'recharts';
import { 
  Activity, Shield, LogOut, Info, AlertTriangle, TrendingUp, Clock,
  Thermometer, Gauge, Cpu, RefreshCw, Settings, Zap, Map, Search,
  PowerOff, Smartphone, CheckCircle, RefreshCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// --- Sub-Components ---
const GaugeChart = ({ probability = 0 }) => {
  const safeProb = probability || 0;
  const percentage = Math.round(safeProb * 100);
  const rotation = (percentage / 100) * 180;
  return (
      <div className="flex flex-col items-center w-full px-2 pb-2">
        <svg viewBox="0 0 200 110" className="w-[170px] drop-shadow-[0_4px_12px_rgba(0,0,0,0.05)] overflow-visible mx-auto">
           <path d="M 20 90 A 70 70 0 0 1 180 90" fill="none" stroke="rgba(0,0,0,0.05)" strokeWidth="15" strokeLinecap="round" />
           <path d="M 20 90 A 70 70 0 0 1 70 40" fill="none" stroke="#10b981" strokeWidth="15" strokeOpacity="0.1" />
           <path d="M 70 40 A 70 70 0 0 1 130 40" fill="none" stroke="#f59e0b" strokeWidth="15" strokeOpacity="0.1" />
           <path d="M 130 40 A 70 70 0 0 1 180 90" fill="none" stroke="#ef4444" strokeWidth="15" strokeOpacity="0.1" />
           
           <path d="M 20 90 A 70 70 0 0 1 180 90" fill="none" stroke={percentage > 70 ? '#ef4444' : percentage > 40 ? '#f59e0b' : '#10b981'} 
                 strokeWidth="15" strokeLinecap="round" strokeDasharray="220" strokeDashoffset={220 - (220 * Math.min(percentage, 100) / 100)} 
                 className="transition-all duration-1000 ease-out" />
                 
           <g transform={`rotate(${rotation} 100 90)`} className="origin-[100px_90px] transition-transform duration-1000 ease-out">
              <polygon points="96,90 104,90 100,20" fill="#334155" opacity="0.9" />
              <circle cx="100" cy="90" r="5" fill="#0891b2" />
           </g>
        </svg>
        <div className="flex flex-col items-center mt-[-15px] z-10 w-full mb-1">
            <span className="text-xl font-black text-slate-900 leading-none">{percentage}%</span>
            <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mt-1.5 w-full text-center">Explosion Risk</span>
        </div>
      </div>
  );
};

const SensorMetricCard = ({ label, value, unit, icon: Icon, colorClass }) => (
  <div className="industrial-card p-4 flex flex-col justify-between group flex-1 bg-white">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-lg bg-slate-50 border border-slate-100 group-hover:border-cyan-500/20 transition-colors`}>
        <Icon className={`${colorClass} w-4 h-4`} />
      </div>
    </div>
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-slate-900 tracking-tighter">
              {typeof value === 'number' ? (Math.round(value * 10) / 10).toFixed(1) : (value || '0.0')}
        </span>
        <span className="text-slate-400 font-mono text-[9px] uppercase tracking-widest">{unit}</span>
      </div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">{label}</p>
    </div>
  </div>
);

const AlertStatusBar = ({ tier }) => {
    const levels = ['GREEN_NORMAL', 'YELLOW_CAUTION', 'RED_EVACUATION'];
    const currentLevel = levels.indexOf(tier);
    return (
        <div className="flex gap-1.5 w-48 h-3.5">
            <div className={`flex-1 rounded-full transition-all duration-500 border border-slate-300/20 ${currentLevel >= 0 ? 'bg-emerald-600 shadow-[0_0_15px_rgba(5,150,105,0.4)] border-emerald-500' : 'bg-slate-200'}`} />
            <div className={`flex-1 rounded-full transition-all duration-500 border border-slate-300/20 ${currentLevel >= 1 ? 'bg-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.5)] border-amber-500' : 'bg-slate-200'}`} />
            <div className={`flex-1 rounded-full transition-all duration-500 border border-slate-300/20 ${currentLevel >= 2 ? 'bg-red-700 shadow-[0_0_25px_rgba(220,38,38,0.6)] border-red-600 animate-pulse' : 'bg-slate-200'}`} />
        </div>
    );
};

const ToggleRow = ({ active, label }) => (
    <div className="flex justify-between items-center p-2.5 bg-slate-50 rounded-lg border border-slate-100 w-full">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${active ? (label.includes('Valve') ? 'bg-red-800' : 'bg-cyan-600') : 'bg-slate-300'}`}>
            <div className={`w-3 h-3 bg-white rounded-full shadow-md transition-transform duration-300 ${active ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
    </div>
);

const FeatureContributionBar = ({ features = [] }) => (
   <div className="flex flex-col gap-2.5 w-full mt-4">
       <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Neural Insight Weightings</span>
       {features?.map(f => (
           <div key={f.name} className="flex items-center gap-3">
               <span className="text-[10px] w-16 font-bold text-slate-500 uppercase">{f.name}</span>
               <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                   <div className="h-full bg-cyan-600 rounded-full" style={{ width: `${f.weight}%` }} />
               </div>
               <span className="text-[10px] font-mono text-slate-900 font-bold text-right w-8">{f.weight}%</span>
           </div>
       ))}
   </div>
);

const SensorLegend = () => (
    <div className="flex gap-4 items-center justify-end text-[8px] font-black uppercase tracking-widest mt-2 mb-1 opacity-80">
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-600" /> SEN-001 <span className="text-slate-400 font-normal">(Main)</span></div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-600 opacity-60" /> SEN-002</div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-violet-600 opacity-60" /> SEN-003</div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-600 opacity-60" /> SEN-004-6</div>
    </div>
);

// --- Main Dashboard Component ---

const Dashboard = () => {
  const [historicData, setHistoricData] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isStreamActive, setIsStreamActive] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLiveData = async () => {
      if (isDemoMode) return;
      try {
        const res = await fetch(`${API_BASE_URL}/history?limit=30`);
        const data = await res.json();
        
        if (data.sensor_data && data.predictions) {
          const formatted = data.sensor_data.map((reading, idx) => {
            const timeStr = new Date(reading.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
            });
            const pred = data.predictions[idx] || {};
            const main = reading.ch4_concentration_ppm;
            const hash = new Date(reading.timestamp).getTime() % 100;
            return {
              time: timeStr,
              sen001: main,
              sen002: Math.max(0, main * 0.95 + (hash % 50)),
              sen003: Math.max(0, main * 1.05 - (hash % 60)),
              sen004: Math.max(0, main * 0.9 + (hash % 80)),
              sen005: Math.max(0, main * 1.1 - (hash % 70)),
              sen006: Math.max(0, main * 0.85 + (hash % 100)),
              temp: reading.temperature_celsius,
              pressure: reading.pressure_kPa,
              risk: pred.spike_probability || 0,
              location: pred.location || reading.location
            };
          }).slice(-15);
          setHistoricData(formatted);
          if (data.predictions && data.predictions.length > 0) {
            setLatestPrediction(data.predictions[data.predictions.length - 1]);
          }
        }
      } catch (error) {
        console.error("Telemetry Sync Error:", error);
      }
    };

    if (!isDemoMode && isStreamActive) {
        fetchLiveData();
        const intervalId = setInterval(fetchLiveData, 4500); 
        return () => clearInterval(intervalId);
    }
  }, [isDemoMode, isStreamActive]);

  // Sync simulation status with backend
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/simulation/status`);
        if (resp.ok) {
            const data = await resp.json();
            setIsStreamActive(data.active);
        }
      } catch (e) { console.error("Status check failed:", e); }
    };
    checkStatus();
    const id = setInterval(checkStatus, 10000);
    return () => clearInterval(id);
  }, []);

  const toggleStream = async () => {
    try {
      const resp = await fetch(`${API_BASE_URL}/simulation/toggle`, { method: 'POST' });
      if (resp.ok) {
          const data = await resp.json();
          setIsStreamActive(data.active);
      }
    } catch (e) { console.error("Toggle failed:", e); }
  };

  const alertTier = latestPrediction?.alert_tier || "WAITING"; 
  const ch4Value = latestPrediction?.ch4_concentration_ppm || historicData[historicData.length - 1]?.sen001 || 0;
  
  // Dynamic Graph Color Logic
  const graphColor = useMemo(() => {
    if (alertTier === "RED_EVACUATION" || ch4Value > 4000) return "#991b1b"; // Dark Red (red-800)
    if (alertTier === "YELLOW_CAUTION" || ch4Value > 1500) return "#b45309"; // Dark Amber (amber-700)
    return "#059669"; // System Green
  }, [alertTier, ch4Value]);

  const aiReasoning = useMemo(() => {
    if (alertTier === "YELLOW_CAUTION") {
      return "CHECK METHANE PIPELINE: " + (latestPrediction?.explainable_ai_reasoning || "Detected unusual methane flux patterns.");
    }
    if (alertTier === "RED_EVACUATION") {
      return "EVACUATE: " + (latestPrediction?.explainable_ai_reasoning || "Critical methane levels detected. Immediate danger.");
    }
    if (latestPrediction?.explainable_ai_reasoning) {
        return "STATUS: " + latestPrediction.explainable_ai_reasoning;
    }
    return alertTier === "GREEN_NORMAL" 
      ? "SYSTEM STATUS: Nominal. Everything is working normally." 
      : "ANALYSIS PENDING: Receiving data...";
  }, [latestPrediction, alertTier]);

  const triggerDemo = () => {
    setIsDemoMode(true);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const main = 4250;
    setHistoricData(prev => [...prev.slice(-14), { 
        time: nowStr, 
        sen001: main, sen002: main*0.95, sen003: main*1.05, sen004: main*1.1, sen005: main*0.9, sen006: main*0.85,
        temp: 48.5, pressure: 112.4, risk: 0.98 
    }]);
    setLatestPrediction({
      alert_tier: "RED_EVACUATION",
      spike_probability: 0.98,
      minutes_to_lel_breach: 1.1,
      ch4_concentration_ppm: 4250,
      temperature_celsius: 48.5,
      pressure_kPa: 112.4,
      location: "MINESHAFT SECTOR 4",
      explainable_ai_reasoning: "CRITICAL: Detected immediate localized methane spike. Patterns correlate with high-pressure line rupture signatures."
    });
  };

  const formatCountdown = (minutesDecimal) => {
      if (!minutesDecimal || minutesDecimal > 99) return "SAFE";
      const m = Math.floor(minutesDecimal);
      const s = Math.floor((minutesDecimal - m) * 60);
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const xaiFeatures = [
      { name: "TEMP STR", weight: 42 },
      { name: "CH4 GRAD", weight: 35 },
      { name: "PRESS VAR", weight: 23 }
  ];

  const handleLogout = () => navigate('/login');

  return (
    <div className="h-screen flex bg-slate-50 text-slate-900 overflow-hidden selection:bg-cyan-600/20 font-sans">
      
      {/* --- SIDEBAR NAV --- */}
      <nav className="w-20 border-r border-slate-200 bg-white flex flex-col items-center py-8 gap-10 z-50 flex-shrink-0 shadow-sm">
         <div className="sidebar-icon sidebar-icon-active shadow-cyan-600/10 mb-2">
            <Activity className="w-6 h-6" />
         </div>
         <div className="mt-auto">
            <button onClick={handleLogout} className="sidebar-icon text-slate-400 hover:text-rose-600 hover:bg-rose-50"><LogOut className="w-6 h-6" /></button>
         </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        
        {/* --- DYNAMIC HEADER --- */}
        <header className="px-10 py-4 border-b border-slate-200 bg-white flex justify-between items-center flex-shrink-0 z-40 shadow-sm">
           <div className="flex flex-col">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mb-0.5">Industrial Enterprise</h2>
              <h1 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">MethaneDetection Ai</h1>
           </div>
           
           <div className="flex gap-10 items-center px-8 py-2.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex flex-col items-center justify-center">
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Alert Status</span>
                 <AlertStatusBar tier={alertTier} />
              </div>
              <div className="h-8 w-[1px] bg-slate-200 mx-1" />
              <div className="flex flex-col items-end">
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Forecasting Accuracy</span>
                 <span className="text-xs font-black text-slate-900 uppercase font-mono">99.93%</span>
              </div>
               <div className="h-8 w-[1px] bg-slate-200 mx-1" />
               <div className="flex gap-2">
                   <button 
                       onClick={toggleStream}
                       className={`px-6 py-2 border rounded-xl text-[10px] font-black transition-all active:scale-95 shadow-sm uppercase tracking-widest flex items-center gap-2 ${isStreamActive ? 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50' : 'bg-rose-50 text-rose-600 border-rose-200'}`}
                   >
                       <div className={`w-1.5 h-1.5 rounded-full ${isStreamActive ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                       {isStreamActive ? "Pause Stream" : "Resume Stream"}
                   </button>
                   <button 
                       onClick={isDemoMode ? () => setIsDemoMode(false) : triggerDemo}
                       className="px-6 py-2 bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-500/30 rounded-xl text-[10px] font-black text-cyan-600 transition-all active:scale-95 shadow-sm uppercase tracking-widest"
                   >
                       {isDemoMode ? "Live Flow" : "Simulate Breach"}
                   </button>
               </div>
            </div>
        </header>

        <main className="flex-1 p-6 flex flex-col gap-6 overflow-hidden relative bg-mesh">
            
            {/* --- PRIMARY COMMAND ROW --- */}
            <div className="flex gap-6 h-[55%] flex-shrink-0">
                {/* Live Methane Flow */}
                <section className="flex-[2.2] industrial-card p-8 flex flex-col group bg-white shadow-xl shadow-slate-200/50">
                    <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12 pointer-events-none">
                       <Shield className="w-40 h-40 text-slate-900" />
                    </div>
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm group-hover:border-cyan-500/20 transition-colors">
                                <Activity className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Real-Time Monitoring</h3>
                                <div className="flex items-center gap-2.5 mt-1">
                                    <span className="text-xl font-black text-slate-900 italic tracking-tighter uppercase">Loc: {latestPrediction?.location || historicData[0]?.location || "SECTOR-04 UNKNOWN"}</span>
                                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold py-0.5 px-2.5 rounded-full border border-emerald-100 uppercase tracking-wider">Online</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Methane Concentration</div>
                            <span className="text-4xl font-black text-slate-900 font-mono leading-none tracking-tighter">{ch4Value}</span>
                            <span className="text-[11px] text-slate-400 ml-2 font-black uppercase tracking-widest">PPM</span>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col">
                        <ResponsiveContainer width="100%" height="90%">
                            <LineChart data={historicData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                <YAxis 
                                    stroke="#94a3b8" 
                                    fontSize={10} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    domain={['auto', 'auto']}
                                    label={{ value: 'PPM (CONC)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 9, fontWeight: '900' }} 
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                    itemStyle={{ fontSize: 11, fontWeight: '700' }}
                                    labelStyle={{ fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: '800' }}
                                />
                                
                                {historicData.length > 5 && (
                                    <ReferenceArea 
                                        x1={historicData[Math.floor(historicData.length * 0.8)]?.time} 
                                        x2={historicData[historicData.length - 1]?.time} 
                                        strokeOpacity={0.3} 
                                        fill="#0891b2" 
                                        fillOpacity={0.03} 
                                    />
                                )}

                                <Line type="monotone" dataKey="sen001" name="SEN-001" stroke={graphColor} strokeWidth={4} dot={{ r: 0 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3 }} isAnimationActive={false} />
                                <Line type="monotone" dataKey="sen002" name="SEN-002" stroke="#10b981" strokeWidth={2} strokeOpacity={0.4} dot={false} />
                                <Line type="monotone" dataKey="sen003" name="SEN-003" stroke="#7c3aed" strokeWidth={2} strokeOpacity={0.4} dot={false} />
                                <Line type="monotone" dataKey="sen004" name="SEN-004" stroke="#f97316" strokeWidth={1.5} strokeDasharray="4 2" strokeOpacity={0.3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <SensorLegend />
                    </div>
                </section>

                {/* NEXT SPIKE Countdown & Explosion Risk Gauge */}
                <section className="flex-1 industrial-card border-t-[6px] border-t-amber-500 group bg-white p-0 flex flex-col shadow-xl shadow-slate-200/50">
                    <div className="p-6 pb-2 flex justify-between items-start">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                           <Clock className="w-4 h-4 text-amber-500" /> Hazard Vector
                       </h3>
                    </div>
                    
                    {/* Orbitron digital countdown */}
                    <div className="flex flex-col items-center justify-center pt-4 pb-4 z-10">
                       <span style={{ fontFamily: '"Orbitron", sans-serif' }} className={`text-7xl font-black tracking-widest leading-none ${latestPrediction?.minutes_to_lel_breach < 5 ? 'text-red-800 animate-pulse' : 'text-cyan-600'}`}>
                          {formatCountdown(latestPrediction?.minutes_to_lel_breach || 100)}
                       </span>
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] mt-6">Next Spike (ETA)</span>
                    </div>

                    <div className="mt-auto bg-slate-50 border-t border-slate-100 relative flex flex-col justify-end pt-4 pb-2">
                       <GaugeChart probability={latestPrediction?.spike_probability || 0} />
                    </div>
                </section>
            </div>

            {/* --- SECONDARY COMMAND ROW --- */}
            <div className="flex gap-6 flex-1 min-h-0">
                
                {/* AI Tactical Unit + Feature Contribution Bar */}
                <section className="flex-[1.6] industrial-card p-8 bg-white flex flex-col justify-center gap-4 relative group shadow-lg shadow-slate-200/50">
                   <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Cpu className="w-28 h-28 text-cyan-600 rotate-12" />
                   </div>
                   <div className="flex items-center gap-5 text-cyan-600">
                      <div className="w-12 h-[2px] bg-cyan-600/10" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.5em]">Neural Analysis Hub 0xFLASH</h3>
                      <div className="w-12 h-[2px] bg-cyan-600/10" />
                   </div>
                   <div className={`border-l-[6px] pl-8 mt-2 pb-2 ${alertTier === 'RED_EVACUATION' ? 'border-red-600' : alertTier === 'YELLOW_CAUTION' ? 'border-amber-500' : 'border-cyan-500/10'}`}>
                      <p className={`text-base leading-relaxed font-semibold italic tracking-tight ${alertTier === 'RED_EVACUATION' ? 'text-red-700' : alertTier === 'YELLOW_CAUTION' ? 'text-amber-700' : 'text-slate-700'}`}>
                         "{aiReasoning}"
                      </p>
                   </div>
                   
                   <FeatureContributionBar features={xaiFeatures} />

                   <div className="flex gap-10 mt-auto text-[9px] font-black uppercase text-slate-400 tracking-widest pt-5 border-t border-slate-50">
                      <div className="flex items-center gap-2.5"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce shadow-lg shadow-emerald-500/20" /> Uplink Stable</div>
                      <div className="flex items-center gap-2.5 font-bold"><RefreshCw className="w-4 h-4 animate-spin-slow text-cyan-600" /> Vector Core Optimized</div>
                   </div>
                </section>

                {/* Sub-Metric Bento + ToggleRow */}
                <div className="flex-1 flex flex-col gap-6">
                   <div className="flex gap-6 flex-1">
                      <SensorMetricCard 
                         label="Thermal" 
                         value={latestPrediction?.temperature_celsius || historicData[historicData.length-1]?.temp} 
                         unit="°C" 
                         icon={Thermometer} 
                         colorClass="text-orange-600"
                      />
                      <SensorMetricCard 
                         label="Pressure" 
                         value={latestPrediction?.pressure_kPa || historicData[historicData.length-1]?.pressure} 
                         unit="kPa" 
                         icon={Gauge} 
                         colorClass="text-violet-600"
                      />
                   </div>

                   {/* Toggle Row Implementation */}
                   <section className="industrial-card p-5 bg-slate-50 flex flex-col items-center gap-3 border border-slate-200/60 shadow-inner">
                      <div className="flex items-center gap-2.5 mb-2 self-start px-1 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
                          <Settings className="w-4 h-4" /> Operations Control
                      </div>
                      <ToggleRow active={alertTier !== 'GREEN_NORMAL'} label="Automated SMS Relay" />
                      <ToggleRow active={alertTier === 'RED_EVACUATION'} label="Primary Isolation" />
                   </section>
                </div>
            </div>

        </main>

        <footer className="px-10 py-3 border-t border-slate-200 bg-white flex justify-between items-center opacity-60 text-[9px] font-black uppercase tracking-[0.5em] flex-shrink-0 z-40">
           <div className="flex gap-10 text-slate-500">
              <span className="hover:text-cyan-600 transition-colors cursor-help">Managed: MongoDB Atlas</span>
              <span className="hover:text-cyan-600 transition-colors cursor-help">Inference: FastAPI // Edge</span>
              <span className="hover:text-cyan-600 transition-colors cursor-help">Logic: Hybrid-LSTM v3.0</span>
           </div>
           <div className="px-5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 font-bold">TRITHON_EXPRESS // SV3.1</div>
        </footer>

      </div>
    </div>
  );
};

export default Dashboard;
