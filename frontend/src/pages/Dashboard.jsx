import { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { 
  AlertTriangle, Activity, Thermometer, Gauge, CheckCircle, 
  Smartphone, PowerOff, Shield, RefreshCw, LogOut, Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
                hour: '2-digit', minute: '2-digit', second: '2-digit' 
            });
            const pred = data.predictions[idx] || {};
            return {
              time: timeStr,
              ch4: reading.ch4_concentration_ppm,
              temp: reading.temperature_celsius,
              pressure: reading.pressure_kPa,
              risk: pred.spike_probability || 0,
            };
          });
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
    const intervalId = setInterval(fetchLiveData, 4500); // 4.5s to match Gemini query rate
    return () => clearInterval(intervalId);
  }, [isDemoMode]);

  const alertTier = latestPrediction?.alert_tier || "WAITING"; 
  const aiReasoning = latestPrediction?.explainable_ai_reasoning || 
    (alertTier === "GREEN_NORMAL" 
      ? "AI Analysis: All sensor parameters are stable. No anomaly signatures detected in the current flow." 
      : "Initializing edge processing context. Waiting for stable sensor stream...");

  const triggerDemo = () => {
    setIsDemoMode(true);
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistoricData(prev => [...prev.slice(-29), { 
        time: nowStr, ch4: 4250, temp: 48.5, pressure: 112.4, risk: 0.98 
    }]);
    setLatestPrediction({
      alert_tier: "RED_EVACUATION",
      spike_probability: 0.98,
      minutes_to_lel_breach: 1.1,
      temperature_celsius: 48.5,
      pressure_kPa: 112.4,
      explainable_ai_reasoning: "[CRITICAL] Immediate spike (4,250 ppm) combined with rapid thermal rise (48.5°C). Signature matches severe pipe rupture. Automated safety protocols initiated."
    });
  };

  const handleLogout = () => navigate('/login');

  return (
    <div className="min-h-screen bg-industrial-void text-slate-200 bg-mesh pb-12">
      {/* Top Navigation Bar */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 rounded-lg border border-blue-500/20">
              <Shield className="text-blue-400 w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">MethaneSentinel</h1>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-[0.2em]">Node: SEN-SIM-01 // LIVE</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={isDemoMode ? () => setIsDemoMode(false) : triggerDemo}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                isDemoMode 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20 shadow-lg shadow-amber-950/20'
              }`}
            >
              {isDemoMode ? <RefreshCw className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {isDemoMode ? "RESUME STREAM" : "SIMULATE BREACH (JUDGES)"}
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="bento-grid mt-6">
        {/* Status Card - Large Span */}
        <section className={`md:col-span-4 industrial-card p-6 border-l-4 ${
          alertTier === 'RED_EVACUATION' ? 'border-l-danger-red' : 
          alertTier === 'YELLOW_CAUTION' ? 'border-l-hazard-amber' : 'border-l-toxic-green'
        }`}>
          <div className="flex justify-between items-start mb-6">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Health</span>
            <Activity className={alertTier === 'RED_EVACUATION' ? 'text-danger-red animate-pulse' : 'text-toxic-green'} />
          </div>
          <div className="space-y-1 mb-8">
            <h2 className="text-5xl font-black tracking-tighter text-white">
              {alertTier === 'RED_EVACUATION' ? 'DANGER' : 
               alertTier === 'YELLOW_CAUTION' ? 'CAUTION' : 
               alertTier === 'WAITING' ? 'SYNCING' : 'SECURE'}
            </h2>
            <p className="text-slate-500 flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
              AI Operational Tier: {alertTier}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Anomaly Prob.</span>
              <div className={`text-2xl font-mono font-bold ${
                (latestPrediction?.spike_probability || 0) > 0.7 ? 'text-danger-red' : 'text-toxic-green'
              }`}>
                {(latestPrediction?.spike_probability || 0).toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Time to Breach</span>
              <div className="text-2xl font-mono font-bold text-white">
                {latestPrediction ? (latestPrediction.minutes_to_lel_breach > 100 ? '>100m' : `${latestPrediction.minutes_to_lel_breach}m`) : '--'}
              </div>
            </div>
          </div>
        </section>

        {/* Real-time Methane Area Chart - Large Span */}
        <section className="md:col-span-8 industrial-card p-6 min-h-[350px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Gauge className="text-emerald-400 w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Live Methane Telemetry</h3>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicData}>
                <defs>
                  <linearGradient id="colorCh4" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="time" hide />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="ch4" stroke="#10b981" strokeWidth={2} fill="url(#colorCh4)" animationDuration={500} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Industrial Metrics - Mini Cards */}
        <section className="md:col-span-4 industrial-card p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <Thermometer className="text-blue-400 w-5 h-5" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ambient Temp</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-white">
              {latestPrediction?.temperature_celsius?.toFixed(1) || historicData[historicData.length-1]?.temp?.toFixed(1) || '0.0'}
            </span>
            <span className="text-slate-500 font-mono">°C</span>
          </div>
        </section>

        <section className="md:col-span-4 industrial-card p-5 flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="text-purple-400 w-5 h-5" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Atm. Pressure</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-mono font-bold text-white">
              {latestPrediction?.pressure_kPa?.toFixed(1) || historicData[historicData.length-1]?.pressure?.toFixed(1) || '0.0'}
            </span>
            <span className="text-slate-500 font-mono">kPa</span>
          </div>
        </section>

        {/* AI Explanation - Span 4 */}
        <section className="md:col-span-4 industrial-card p-6 bg-blue-600/[0.02]">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <Info className="w-3 h-3" /> Explainable AI Insights
          </h3>
          <div className="relative">
            <p className="text-sm leading-relaxed text-slate-300 font-medium italic">
              "{aiReasoning}"
            </p>
            <div className="mt-4 flex gap-2">
              <span className="w-1 h-1 bg-blue-500 rounded-full animate-ping" />
              <span className="text-[10px] text-slate-500 font-mono">GEMINI-2.5-FLASH // ANALYSIS_ACTIVE</span>
            </div>
          </div>
        </section>

        {/* Automated Protocols - Span 12 Bottom */}
        <section className="md:col-span-12 industrial-card p-6 mt-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Automated Safety Protocols</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-white/2 rounded-xl border border-white/5">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${alertTier !== 'GREEN_NORMAL' && alertTier !== 'WAITING' ? 'bg-blue-500/10' : 'bg-slate-800/10'}`}>
                  <Smartphone className={alertTier !== 'GREEN_NORMAL' && alertTier !== 'WAITING' ? 'text-blue-400' : 'text-slate-600'} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">SMS EMERGENCY ALERT</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Multi-Channel Broadcast</div>
                </div>
              </div>
              <span className={`badge-status ${alertTier !== 'GREEN_NORMAL' && alertTier !== 'WAITING' ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-slate-800 text-slate-600'}`}>
                {alertTier !== 'GREEN_NORMAL' && alertTier !== 'WAITING' ? 'DISPATCHED' : 'STANDBY'}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/2 rounded-xl border border-white/5">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${alertTier === 'RED_EVACUATION' ? 'bg-red-500/10' : 'bg-slate-800/10'}`}>
                  <PowerOff className={alertTier === 'RED_EVACUATION' ? 'text-danger-red' : 'text-slate-600'} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">AUTOMATED VALVE SHUTOFF</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">Pneumatic Locking Sequence</div>
                </div>
              </div>
              <span className={`badge-status ${alertTier === 'RED_EVACUATION' ? 'bg-red-500/20 text-danger-red animate-pulse' : 'bg-slate-800 text-slate-600'}`}>
                {alertTier === 'RED_EVACUATION' ? 'TRIGGERED' : 'STANDBY'}
              </span>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto px-6 mt-12 flex justify-between items-center opacity-40 grayscale">
        <div className="flex items-center gap-6">
          <img src="https://www.mongodb.com/assets/images/global/favicon.ico" className="h-4 w-4" alt="MongoDB" />
          <img src="https://www.gstatic.com/lamda/images/favicon_v2_7082343206be6f987258.png" className="h-4 w-4" alt="Gemini" />
          <img src="https://fastapi.tiangolo.com/img/favicon.png" className="h-4 w-4" alt="FastAPI" />
        </div>
        <div className="text-[10px] font-mono tracking-widest">COMMIT2WIN // TRITHON_2026</div>
      </footer>
    </div>
  );
};

export default Dashboard;
