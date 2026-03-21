import { useState, useEffect, useMemo } from 'react';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  AlertTriangle, Activity, Thermometer, CheckCircle, 
  Smartphone, PowerOff, Shield, RefreshCw, LogOut,
  Zap, Clock, Cpu, LayoutDashboard, Map, Search, Settings, Gauge
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- Sub-Components for Ultra-Premium Look ---

const AnomalyRing = ({ probability }) => {
  const percentage = Math.round(probability * 100);
  const strokeDasharray = `${percentage}, 100`;
  const color = probability > 0.7 ? '#ef4444' : probability > 0.4 ? '#f59e0b' : '#10b981';

  return (
    <div className="relative flex items-center justify-center w-32 h-32 group">
      <div className="absolute inset-0 bg-white/5 rounded-full backdrop-blur-3xl group-hover:bg-white/10 transition-colors" />
      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90 drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">
        <path
          className="stroke-white/5"
          strokeWidth="3"
          fill="none"
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
        <path
          stroke={color}
          strokeWidth="3"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black text-white tracking-tighter">{percentage}%</span>
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Risk</span>
      </div>
    </div>
  );
};

const MetricOrb = ({ label, value, unit, icon: Icon, colorClass, themeColor }) => (
  <div className="industrial-card p-6 flex flex-col justify-between group hover:scale-[1.02] transition-transform shadow-2xl relative overflow-hidden">
    <div className="flex justify-between items-start z-10">
      <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 group-hover:border-white/20 transition-colors`}>
        <Icon className={`${colorClass} w-5 h-5`} />
      </div>
      <Zap className="w-3 h-3 text-white/5 group-hover:text-white/20 transition-colors" />
    </div>
    <div className="mt-8 space-y-1 z-10">
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-black text-white tracking-tighter leading-none group-hover:scale-105 origin-left transition-transform">
              {typeof value === 'number' ? (Math.round(value * 10) / 10).toFixed(1) : (value || '0.0')}
        </span>
        <span className="text-slate-500 font-mono font-bold text-[10px] uppercase tracking-widest">{unit}</span>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{label}</p>
    </div>
    <div className={`absolute bottom-0 left-0 h-0.5 bg-blue-500 transition-all duration-500 w-0 group-hover:w-full opacity-30`} />
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
            return {
              time: timeStr,
              ch4: reading.ch4_concentration_ppm,
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
  const ch4Value = latestPrediction?.ch4_concentration_ppm || historicData[historicData.length - 1]?.ch4 || 0;
  
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
    setHistoricData(prev => [...prev.slice(-14), { 
        time: nowStr, ch4: 4250, temp: 48.5, pressure: 112.4, risk: 0.98 
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

  const handleLogout = () => navigate('/login');

  return (
    <div className="h-screen flex bg-industrial-void text-slate-200 overflow-hidden selection:bg-blue-500/30 font-sans">
      
      {/* --- SIDEBAR NAV --- */}
      <nav className="w-16 border-r border-white/5 bg-black/40 flex flex-col items-center py-6 gap-8 z-50 flex-shrink-0">
         <div className="p-2.5 bg-blue-600/20 rounded-xl border border-blue-500/30 mb-4 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
            <Activity className="text-blue-400 w-5 h-5" />
         </div>
         <div className="flex flex-col gap-6 text-slate-500">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-colors text-blue-400 border border-blue-500/20"><Shield className="w-5 h-5" /></button>
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
              <div className="flex flex-col items-end">
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">System Health</span>
                 <span className={`text-[10px] font-black uppercase ${alertTier === 'GREEN_NORMAL' ? 'text-emerald-400' : 'text-hazard-amber animate-pulse'}`}>
                    SYSTEM {alertTier === 'GREEN_NORMAL' ? 'NOMINAL' : 'COMPROMISED'}
                 </span>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <div className="flex flex-col items-end">
                 <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Forecasting Accuracy</span>
                 <span className="text-[10px] font-black text-white uppercase font-mono">99.93%</span>
              </div>
              <div className="h-6 w-[1px] bg-white/10" />
              <button 
                  onClick={isDemoMode ? () => setIsDemoMode(false) : triggerDemo}
                  className="px-4 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 rounded-lg text-[9px] font-bold text-blue-400 transition-all active:scale-95 shimmer uppercase tracking-widest"
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

                    <div className="flex-1 min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={historicData}>
                                <defs>
                                    <linearGradient id="colorDynamic" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={graphColor} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={graphColor} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="5 5" stroke="#ffffff08" vertical={false} />
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
                                    cursor={{ stroke: graphColor, strokeWidth: 1 }}
                                    contentStyle={{ backgroundColor: 'rgba(2, 6, 23, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="ch4" 
                                    stroke={graphColor} 
                                    strokeWidth={3} 
                                    fill="url(#colorDynamic)" 
                                    animationDuration={500} 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Breach Clock - Digital Reference Style */}
                <section className="flex-1 industrial-card p-6 flex flex-col justify-between border-t-4 border-t-hazard-amber group">
                    <div className="flex justify-between items-start mb-4">
                       <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em]">LEL Breach Vector</h3>
                       <div className="scale-50 origin-top-right grayscale opacity-50">
                          <AnomalyRing probability={latestPrediction?.spike_probability || 0} />
                       </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center py-6 bg-black/40 rounded-xl border border-white/5 shadow-inner grow my-2">
                       <span className={`text-6xl font-black font-mono tracking-tighter leading-none ${latestPrediction?.minutes_to_lel_breach < 5 ? 'text-danger-red animate-pulse' : 'text-white'}`}>
                          {(!latestPrediction || latestPrediction.minutes_to_lel_breach > 100) ? "SAFE" : latestPrediction.minutes_to_lel_breach.toFixed(1)}
                       </span>
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2">Minutes ETA</span>
                    </div>

                    <div className="flex flex-col gap-2 mt-auto">
                       <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-600 tracking-widest">
                          <span>Risk Certainty</span>
                          <span>{Math.round((latestPrediction?.spike_probability || 0) * 100)}%</span>
                       </div>
                       <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div 
                             className={`h-full transition-all duration-1000 ${latestPrediction?.minutes_to_lel_breach < 5 ? 'bg-danger-red' : 'bg-hazard-amber'}`}
                             style={{ width: `${Math.max(5, 100 - (latestPrediction?.minutes_to_lel_breach || 101))}%` }}
                          />
                       </div>
                    </div>
                </section>
            </div>

            {/* --- SECONDARY COMMAND ROW --- */}
            <div className="flex gap-5 flex-1 min-h-0">
                
                {/* AI Tactical Unit */}
                <section className="flex-[1.5] industrial-card p-8 bg-blue-600/[0.04] flex flex-col justify-center gap-4 relative group">
                   <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Cpu className="w-16 h-16 text-blue-400 rotate-12" />
                   </div>
                   <div className="flex items-center gap-4 text-blue-400">
                      <div className="w-10 h-[1px] bg-blue-500/30" />
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">Neural Insight Terminal 0xFLASH</h3>
                      <div className="w-10 h-[1px] bg-blue-500/30" />
                   </div>
                   <div className="border-l-4 border-blue-500/20 pl-8 overflow-hidden">
                      <p className="text-xl leading-snug text-slate-100 font-medium italic tracking-tight line-clamp-3">
                         "{aiReasoning}"
                      </p>
                   </div>
                   <div className="flex gap-8 mt-4 text-[9px] font-black uppercase text-slate-600 tracking-widest">
                      <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" /> Uplink Stable</div>
                      <div className="flex items-center gap-2"><RefreshCw className="w-3 h-3 animate-spin-slow" /> Optimized Logic</div>
                   </div>
                </section>

                {/* Sub-Metric Bento + Action Cluster */}
                <div className="flex-1 flex flex-col gap-5">
                   <div className="grid grid-cols-2 gap-5 flex-1">
                      <MetricOrb 
                         label="Thermal State" 
                         value={latestPrediction?.temperature_celsius || historicData[historicData.length-1]?.temp} 
                         unit="°C" 
                         icon={Thermometer} 
                         colorClass="text-fusion-orange"
                         themeColor="fusion-orange"
                      />
                      <MetricOrb 
                         label="Pressure PSI" 
                         value={latestPrediction?.pressure_kPa || historicData[historicData.length-1]?.pressure} 
                         unit="kPa" 
                         icon={Zap} 
                         colorClass="text-plasma-purple"
                         themeColor="plasma-purple"
                      />
                   </div>

                   {/* Action Toggles Cluster */}
                   <section className="industrial-card p-4 bg-black/40 flex items-center gap-4">
                      <div className="flex-1 flex items-center gap-4 px-4 py-3 bg-white/2 rounded-xl border border-white/5 hover:border-blue-500/20 transition-all group active:scale-[0.98] cursor-pointer">
                         <div className={`p-2.5 rounded-lg ${alertTier !== 'GREEN_NORMAL' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-600'}`}>
                            <Smartphone className="w-5 h-5" />
                         </div>
                         <div>
                            <div className="font-black text-white italic text-xs">BROADCAST</div>
                            <div className="text-[8px] font-black uppercase text-slate-500">GSM Link: {alertTier !== 'GREEN_NORMAL' ? 'ENCRYPTING' : 'READY'}</div>
                         </div>
                      </div>

                      <div className="flex-1 flex items-center gap-4 px-4 py-3 bg-white/2 rounded-xl border border-white/5 hover:border-danger-red/20 transition-all group active:scale-[0.98] cursor-pointer">
                         <div className={`p-2.5 rounded-lg ${alertTier === 'RED_EVACUATION' ? 'bg-danger-red/20 text-danger-red border border-danger-red/30' : 'bg-slate-800 text-slate-600'}`}>
                            <PowerOff className="w-5 h-5" />
                         </div>
                         <div>
                            <div className="font-black text-white italic text-xs">ISOLATION</div>
                            <div className="text-[8px] font-black uppercase text-slate-500">Relay: {alertTier === 'RED_EVACUATION' ? 'LOCKED' : 'READY'}</div>
                         </div>
                      </div>
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
