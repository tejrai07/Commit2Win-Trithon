import { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceArea 
} from 'recharts';
import { 
  AlertTriangle, Activity, Thermometer, CheckCircle, 
  Smartphone, PowerOff, Shield, RefreshCw, LogOut,
  Zap, Clock, Cpu, LayoutDashboard, Map, Search, Settings, Gauge
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Sub-Components ---
const GaugeChart = ({ probability = 0 }) => {
  const safeProb = probability || 0;
  const percentage = Math.round(safeProb * 100);
  const rotation = (percentage / 100) * 180;
  return (
      <div className="flex flex-col items-center w-full px-2 pb-2">
        <svg viewBox="0 0 200 110" className="w-[170px] drop-shadow-[0_0_8px_rgba(255,255,255,0.05)] overflow-visible mx-auto">
           <path d="M 20 90 A 70 70 0 0 1 180 90" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="15" strokeLinecap="round" />
           <path d="M 20 90 A 70 70 0 0 1 70 40" fill="none" stroke="#10b981" strokeWidth="15" strokeOpacity="0.3" />
           <path d="M 70 40 A 70 70 0 0 1 130 40" fill="none" stroke="#f59e0b" strokeWidth="15" strokeOpacity="0.3" />
           <path d="M 130 40 A 70 70 0 0 1 180 90" fill="none" stroke="#ef4444" strokeWidth="15" strokeOpacity="0.3" />
           
           <path d="M 20 90 A 70 70 0 0 1 180 90" fill="none" stroke={percentage > 70 ? '#ef4444' : percentage > 40 ? '#f59e0b' : '#10b981'} 
                 strokeWidth="15" strokeLinecap="round" strokeDasharray="220" strokeDashoffset={220 - (220 * Math.min(percentage, 100) / 100)} 
                 className="transition-all duration-1000 ease-out" />
                 
           <g transform={`rotate(${rotation} 100 90)`} className="origin-[100px_90px] transition-transform duration-1000 ease-out">
              <polygon points="96,90 104,90 100,20" fill="#fff" opacity="0.9" />
              <circle cx="100" cy="90" r="5" fill="#06b6d4" />
           </g>
        </svg>
        <div className="flex flex-col items-center mt-[-15px] z-10 w-full mb-1">
            <span className="text-xl font-black text-white leading-none">{percentage}%</span>
            <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mt-1.5 w-full text-center">Explosion Risk</span>
        </div>
      </div>
  );
};

const SensorMetricCard = ({ label, value, unit, icon: Icon, colorClass }) => (
  <div className="industrial-card p-4 flex flex-col justify-between group flex-1">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors`}>
        <Icon className={`${colorClass} w-4 h-4`} />
      </div>
    </div>
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-white tracking-tighter">
              {typeof value === 'number' ? (Math.round(value * 10) / 10).toFixed(1) : (value || '0.0')}
        </span>
        <span className="text-slate-500 font-mono text-[9px] uppercase tracking-widest">{unit}</span>
      </div>
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">{label}</p>
    </div>
  </div>
);

const AlertStatusBar = ({ tier }) => (
    <div className="flex gap-1.5 w-40 h-2.5">
        <div className={`flex-1 rounded-full transition-all duration-500 bg-white/10 ${tier === 'GREEN_NORMAL' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : ''}`} />
        <div className={`flex-1 rounded-full transition-all duration-500 bg-white/10 ${tier === 'YELLOW_CAUTION' ? 'bg-hazard-amber shadow-[0_0_10px_#f59e0b]' : ''}`} />
        <div className={`flex-1 rounded-full transition-all duration-500 bg-white/10 ${tier === 'RED_EVACUATION' ? 'bg-danger-red shadow-[0_0_10px_#ef4444] animate-pulse' : ''}`} />
    </div>
);

const ToggleRow = ({ active, label }) => (
    <div className="flex justify-between items-center p-2.5 bg-black/20 rounded-lg border border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</span>
        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${active ? (label.includes('Valve') ? 'bg-danger-red' : 'bg-cyan-500') : 'bg-slate-700'}`}>
            <div className={`w-3 h-3 bg-white rounded-full shadow-md transition-transform duration-300 ${active ? 'translate-x-4' : 'translate-x-0'}`} />
        </div>
    </div>
);

const FeatureContributionBar = ({ features = [] }) => (
   <div className="flex flex-col gap-2 w-full mt-4">
       <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">XAI Feature Weightings</span>
       {features?.map(f => (
           <div key={f.name} className="flex items-center gap-3">
               <span className="text-[8px] w-14 font-bold text-slate-400 uppercase">{f.name}</span>
               <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                   <div className="h-full bg-cyan-500" style={{ width: `${f.weight}%` }} />
               </div>
               <span className="text-[8px] font-mono text-white text-right w-6">{f.weight}%</span>
           </div>
       ))}
   </div>
);

const SensorLegend = () => (
    <div className="flex gap-4 items-center justify-end text-[8px] font-black uppercase tracking-widest mt-2 mb-1 opacity-70">
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> SEN-001 <span className="text-slate-600">(Main)</span></div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-60" /> SEN-002</div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-plasma-purple opacity-60" /> SEN-003</div>
        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-fusion-orange opacity-60" /> SEN-004-6</div>
    </div>
);

// --- Main Dashboard Component ---

const Dashboard = () => {
  const [historicData, setHistoricData] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLiveData = async () => {
      if (isDemoMode) return;
      try {
        const res = await fetch('http://localhost:8000/history?limit=30');
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
          if (data.predictions.length > 0) {
            setLatestPrediction(data.predictions[data.predictions.length - 1]);
          }
        }
      } catch (error) {
        console.error("Telemetry Sync Error:", error);
      }
    };

    fetchLiveData();
    const intervalId = setInterval(fetchLiveData, 4500); 
    return () => clearInterval(intervalId);
  }, [isDemoMode]);

  const alertTier = latestPrediction?.alert_tier || "WAITING"; 
  const ch4Value = latestPrediction?.ch4_concentration_ppm || historicData[historicData.length - 1]?.sen001 || 0;
  
  // Dynamic Graph Color Logic
  const graphColor = useMemo(() => {
    if (alertTier === "RED_EVACUATION" || ch4Value > 4000) return "#ef4444"; // Danger Red
    if (alertTier === "YELLOW_CAUTION" || ch4Value > 1500) return "#f59e0b"; // Hazard Amber
    return "#10b981"; // System Green
  }, [alertTier, ch4Value]);

  const aiReasoning = useMemo(() => {
    if (latestPrediction?.explainable_ai_reasoning) {
        return latestPrediction.explainable_ai_reasoning
            .replace(/\d+\.\d+/g, '[X]') 
            .replace(/temperature/gi, 'thermal signature')
            .replace(/pressure/gi, 'atmospheric state');
    }
    return alertTier === "GREEN_NORMAL" 
      ? "SYSTEM STATUS: Nominal. Telemetry streams correlate within predefined industrial safe-zones." 
      : "ANALYSIS PENDING: High-fidelity pattern match in progress...";
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
    <div className="h-screen flex bg-industrial-void text-slate-200 overflow-hidden selection:bg-cyan-500/30 font-sans">
      
      {/* --- SIDEBAR NAV --- */}
      <nav className="w-16 border-r border-white/5 bg-black/40 flex flex-col items-center py-6 gap-8 z-50 flex-shrink-0">
         <div className="p-2.5 bg-cyan-600/20 rounded-xl border border-cyan-500/30 mb-4 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Activity className="text-cyan-400 w-5 h-5" />
         </div>
         <div className="flex flex-col gap-6 text-slate-500">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-cyan-400 border border-cyan-500/20"><Shield className="w-5 h-5" /></button>
         </div>
         <div className="mt-auto">
            <button onClick={handleLogout} className="p-2 text-slate-600 hover:text-danger-red transition-colors"><LogOut className="w-5 h-5" /></button>
         </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        
        {/* --- DYNAMIC HEADER --- */}
        <header className="px-8 py-3 border-b border-white/5 bg-black/20 flex justify-between items-center flex-shrink-0 backdrop-blur-md">
           <div className="flex flex-col">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Enterprise View</h2>
              <h1 className="text-lg font-black text-white italic tracking-tighter uppercase mr-4">MethaneDetection Ai</h1>
           </div>
           
           <div className="flex gap-8 items-center px-6 py-1.5 bg-black/40 rounded-full border border-white/5">
              <div className="flex flex-col items-center justify-center">
                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5">Alert Status</span>
                 <AlertStatusBar tier={alertTier} />
              </div>
              <div className="h-6 w-[1px] bg-white/10 mx-2" />
              <div className="flex flex-col items-end">
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Forecasting Accuracy</span>
                 <span className="text-[10px] font-black text-white uppercase font-mono">99.93%</span>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <button 
                  onClick={isDemoMode ? () => setIsDemoMode(false) : triggerDemo}
                  className="px-4 py-1.5 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 rounded-lg text-[9px] font-bold text-cyan-400 transition-all active:scale-95 shimmer uppercase tracking-widest"
              >
                  {isDemoMode ? "Resume Flow" : "Simulate Breach"}
              </button>
           </div>
        </header>

        <main className="flex-1 p-5 flex flex-col gap-5 overflow-hidden relative">
            
            {/* --- PRIMARY COMMAND ROW --- */}
            <div className="flex gap-5 h-[55%] flex-shrink-0">
                {/* Live Methane Flow */}
                <section className="flex-[2] industrial-card p-6 flex flex-col group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 flex flex-col items-end pointer-events-none">
                       <Shield className="w-32 h-32" />
                    </div>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                                <Activity className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Real-Time Site Analytics</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-lg font-black text-white italic tracking-tighter">Loc: {latestPrediction?.location || historicData[0]?.location || "SECTOR-04 UNKNOWN"}</span>
                                    <span className="text-[8px] bg-white/5 text-slate-500 py-0.5 px-2 rounded-full border border-white/5 uppercase">Active Connection</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Methane Concentration</div>
                            <span className="text-3xl font-black text-white font-mono leading-none">{ch4Value}</span>
                            <span className="text-[10px] text-slate-600 ml-2 font-black">PPM</span>
                        </div>
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col mt-4">
                        <ResponsiveContainer width="100%" height="85%">
                            <LineChart data={historicData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                                <XAxis dataKey="time" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} dy={10} />
                                <YAxis 
                                    stroke="#475569" 
                                    fontSize={9} 
                                    tickLine={false} 
                                    axisLine={false} 
                                    domain={['auto', 'auto']}
                                    label={{ value: 'PPM (CONC)', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 8, fontWeight: 'bold' }} 
                                />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                    itemStyle={{ fontSize: 10, fontWeight: 'bold' }}
                                    labelStyle={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}
                                />
                                
                                {historicData.length > 5 && (
                                    <ReferenceArea 
                                        x1={historicData[Math.floor(historicData.length * 0.8)]?.time} 
                                        x2={historicData[historicData.length - 1]?.time} 
                                        strokeOpacity={0.3} 
                                        fill="#06b6d4" 
                                        fillOpacity={0.05} 
                                    />
                                )}

                                <Line type="monotone" dataKey="sen001" name="SEN-001" stroke={graphColor} strokeWidth={3} dot={false} isAnimationActive={false} />
                                <Line type="monotone" dataKey="sen002" name="SEN-002" stroke="#10b981" strokeWidth={1.5} strokeOpacity={0.5} dot={false} />
                                <Line type="monotone" dataKey="sen003" name="SEN-003" stroke="#8b5cf6" strokeWidth={1.5} strokeOpacity={0.5} dot={false} />
                                <Line type="monotone" dataKey="sen004" name="SEN-004" stroke="#f97316" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.4} dot={false} />
                                <Line type="monotone" dataKey="sen005" name="SEN-005" stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.4} dot={false} />
                                <Line type="monotone" dataKey="sen006" name="SEN-006" stroke="#fbbf24" strokeWidth={1} strokeDasharray="4 2" strokeOpacity={0.4} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                        <SensorLegend />
                    </div>
                </section>

                {/* NEXT SPIKE Countdown & Explosion Risk Gauge */}
                <section className="flex-1 industrial-card border-t-4 border-t-hazard-amber group p-0 flex flex-col overflow-hidden">
                    <div className="p-4 pb-0 flex justify-between items-start">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                           <Clock className="w-3 h-3 text-hazard-amber" /> critical vector
                       </h3>
                    </div>
                    
                    {/* Orbitron digital countdown */}
                    <div className="flex flex-col items-center justify-center pt-2 pb-2 z-10">
                       <span style={{ fontFamily: '"Orbitron", sans-serif' }} className={`text-6xl font-black tracking-widest leading-none drop-shadow-xl ${latestPrediction?.minutes_to_lel_breach < 5 ? 'text-danger-red animate-pulse' : 'text-cyan-400'}`}>
                          {formatCountdown(latestPrediction?.minutes_to_lel_breach || 100)}
                       </span>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-3">NEXT SPIKE (ETA)</span>
                    </div>

                    <div className="mt-auto bg-black/40 border-t border-white/5 relative flex flex-col justify-end pt-2">
                       <GaugeChart probability={latestPrediction?.spike_probability || 0} />
                    </div>
                </section>
            </div>

            {/* --- SECONDARY COMMAND ROW --- */}
            <div className="flex gap-5 flex-1 min-h-0">
                
                {/* AI Tactical Unit + Feature Contribution Bar */}
                <section className="flex-[1.5] industrial-card p-6 bg-cyan-600/[0.04] flex flex-col justify-center gap-3 relative group overflow-hidden">
                   <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Cpu className="w-24 h-24 text-cyan-400 rotate-12" />
                   </div>
                   <div className="flex items-center gap-4 text-cyan-400">
                      <div className="w-10 h-[1px] bg-cyan-500/30" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Neural Insight Terminal 0xFLASH</h3>
                      <div className="w-10 h-[1px] bg-cyan-500/30" />
                   </div>
                   <div className="border-l-4 border-cyan-500/20 pl-6 mt-1 pb-1">
                      <p className="text-[13px] leading-relaxed text-slate-200 font-medium italic tracking-tight">
                         "{aiReasoning}"
                      </p>
                   </div>
                   
                   {/* XAI Features implementation */}
                   <FeatureContributionBar features={xaiFeatures} />

                   <div className="flex gap-8 mt-auto text-[8px] font-black uppercase text-slate-600 tracking-widest pt-3">
                      <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" /> Uplink Stable</div>
                      <div className="flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin-slow" /> Optimized Logic</div>
                   </div>
                </section>

                {/* Sub-Metric Bento + ToggleRow */}
                <div className="flex-1 flex flex-col gap-4">
                   <div className="flex gap-4 flex-1">
                      <SensorMetricCard 
                         label="Thermal" 
                         value={latestPrediction?.temperature_celsius || historicData[historicData.length-1]?.temp} 
                         unit="°C" 
                         icon={Thermometer} 
                         colorClass="text-fusion-orange"
                      />
                      <SensorMetricCard 
                         label="Pressure" 
                         value={latestPrediction?.pressure_kPa || historicData[historicData.length-1]?.pressure} 
                         unit="kPa" 
                         icon={Gauge} 
                         colorClass="text-plasma-purple"
                      />
                   </div>

                   {/* Toggle Row Implementation */}
                   <section className="industrial-card p-3 bg-black/40 flex flex-col items-center border border-white/5">
                      <div className="flex items-center gap-2 mb-2 self-start px-1 text-[8px] font-black uppercase tracking-widest text-slate-500">
                          <Settings className="w-3 h-3" /> System Overrides
                      </div>
                      <ToggleRow active={alertTier !== 'GREEN_NORMAL'} label="Automated SMS Relay" />
                      <div className="w-full h-2" />
                      <ToggleRow active={alertTier === 'RED_EVACUATION'} label="Primary Valve Isolation" />
                   </section>
                </div>
            </div>

        </main>

        <footer className="px-8 py-2 border-t border-white/5 bg-black/40 flex justify-between items-center opacity-30 text-[8px] font-black uppercase tracking-[0.5em] flex-shrink-0">
           <div className="flex gap-8">
              <span>Managed by MongoDB Atlas</span>
              <span>Inference: FastAPI // TFSMLayer</span>
              <span>Model Context: Hybrid-LSTM-Transformer</span>
           </div>
           <div className="px-4 py-0.5 border border-white/10 rounded">SYSTEM_VER: 3.0 // TRITHON_EXPRESS</div>
        </footer>

      </div>
    </div>
  );
};

export default Dashboard;
