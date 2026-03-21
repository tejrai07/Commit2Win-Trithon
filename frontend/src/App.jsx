import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { AlertTriangle, Activity, Thermometer, Wind, CheckCircle, Smartphone, PowerOff } from 'lucide-react';

function App() {
  const [historicData, setHistoricData] = useState([]);
  const [latestPrediction, setLatestPrediction] = useState(null);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const res = await fetch('http://localhost:8000/history?limit=20');
        const data = await res.json();
        
        if (data.sensor_data && data.predictions) {
          // Format raw data for Recharts
          const formatted = data.sensor_data.map((reading, idx) => {
            const timeStr = new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            // Align with predictions array; if missing, default to 0
            const pred = data.predictions[idx] || {};
            return {
              time: timeStr,
              ch4: reading.ch4_concentration_ppm,
              risk: pred.spike_probability || 0,
            };
          });
          setHistoricData(formatted);
          if (data.predictions.length > 0) {
            setLatestPrediction(data.predictions[data.predictions.length - 1]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };

    fetchLiveData();
    const intervalId = setInterval(fetchLiveData, 2000); // Polling every 2s to match IoT stream
    return () => clearInterval(intervalId);
  }, []);

  const alertTier = latestPrediction?.alert_tier || "RED_EVACUATION"; // Mock state
  const aiReasoning = latestPrediction?.explainable_ai_reasoning || 
    "Methane rate of change (2.3ppm/m) combined with 28°C temperature indicates an accelerating dangerous leak.";

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      {/* Background Gradient Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className={`absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] ${alertTier === 'RED_EVACUATION' ? 'bg-red-600/20' : 'bg-emerald-600/20'} rounded-full blur-[150px] pointer-events-none transition-colors duration-1000`} />

      <header className="flex justify-between items-center mb-8 relative z-10 glass-panel p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Activity className="text-blue-400 w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Methane Predictive Safety
            </h1>
            <p className="text-sm text-slate-400">Edge-to-Cloud IoT Monitor</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 rounded-full border border-slate-700">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium text-slate-300">SEN-SIM-01 ONLINE</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {/* Left Column - Realtime Stats & AI */}
        <div className="flex flex-col gap-6">
          <div className={`glass-panel p-6 border-l-4 ${alertTier === 'RED_EVACUATION' ? 'border-l-red-500' : 'border-l-emerald-500'}`}>
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-lg font-semibold text-slate-200">System Status</h2>
              {alertTier === 'RED_EVACUATION' ? (
                <AlertTriangle className="text-red-500 animate-pulse w-7 h-7" />
              ) : (
                <CheckCircle className="text-emerald-500 w-7 h-7" />
              )}
            </div>
            
            <div className="mb-6">
              <div className="text-4xl font-bold text-white mb-1">
                {alertTier === 'RED_EVACUATION' ? 'EVACUATE' : 'NORMAL'}
              </div>
              <div className="text-sm text-slate-400 uppercase tracking-wider font-medium">Alert Tier</div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-800 pt-6">
              <div>
                <div className="text-2xl font-bold text-amber-400">82%</div>
                <div className="text-xs text-slate-400 uppercase">Spike Probability</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">4.2m</div>
                <div className="text-xs text-slate-400 uppercase">Est. LEL Breach</div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 flex-1 flex flex-col">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-400" />
              Explainable AI (Gemini)
            </h2>
            <div className="p-4 bg-purple-900/10 border border-purple-500/20 rounded-xl flex-1 flex flex-col justify-center">
              <p className="text-purple-200 leading-relaxed italic">
                "{aiReasoning}"
              </p>
            </div>
          </div>

          {/* Hardware Triggers */}
          <div className="glass-panel p-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Automated Actions</h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                 <div className="flex items-center gap-3">
                   <Smartphone className={`w-5 h-5 ${alertTier !== 'GREEN_NORMAL' ? 'text-blue-400' : 'text-slate-600'}`} />
                   <span className="text-slate-300 text-sm">SMS Safety Alert</span>
                 </div>
                 {alertTier !== 'GREEN_NORMAL' ? (
                   <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded-full font-medium">DISPATCHED</span>
                 ) : (
                   <span className="text-xs text-slate-600">STANDBY</span>
                 )}
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                 <div className="flex items-center gap-3">
                   <PowerOff className={`w-5 h-5 ${alertTier === 'RED_EVACUATION' ? 'text-red-400' : 'text-slate-600'}`} />
                   <span className="text-slate-300 text-sm">Valve Shutoff</span>
                 </div>
                 {alertTier === 'RED_EVACUATION' ? (
                   <span className="text-xs px-2 py-1 bg-red-500/20 text-red-300 rounded-full font-medium animate-pulse">TRIGGERED</span>
                 ) : (
                   <span className="text-xs text-slate-600">STANDBY</span>
                 )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Charts */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-panel p-6 h-[400px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Wind className="w-5 h-5 text-emerald-400" />
                Live Methane Concentration (ppm)
              </h2>
            </div>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCh4" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b'}} />
                  <YAxis stroke="#64748b" tick={{fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Area type="monotone" dataKey="ch4" stroke="#34d399" strokeWidth={3} fillOpacity={1} fill="url(#colorCh4)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-panel p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-slate-200">LSTM-Transformer Anomaly Risk</h2>
            </div>
            <div className="flex-1 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" tick={{fill: '#64748b'}} />
                  <YAxis stroke="#64748b" tick={{fill: '#64748b'}} domain={[0, 1]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  {/* Danger threshold line */}
                  <line x1="0%" y1="30%" x2="100%" y2="30%" stroke="#ef4444" strokeWidth="2" strokeDasharray="5 5" opacity="0.5" />
                  <Area type="monotone" dataKey="risk" stroke="#f87171" strokeWidth={3} fillOpacity={1} fill="url(#colorRisk)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
