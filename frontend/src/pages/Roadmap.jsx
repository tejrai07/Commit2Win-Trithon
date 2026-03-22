import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Cpu, Activity, ShieldCheck, Zap, Globe, 
  Layers, ChevronRight, CheckCircle2, Circle
} from 'lucide-react';

const RoadmapStep = ({ phase, title, status, description, icon: Icon, isLast }) => (
  <div className="relative flex gap-8 pb-16 transition-all duration-300 group">
    {/* Connector Line */}
    {!isLast && (
      <div className="absolute left-[27px] top-14 bottom-0 w-[2px] bg-slate-100 group-hover:bg-cyan-100 transition-colors" />
    )}
    
    {/* Icon Node */}
    <div className="relative z-10 shrink-0">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 
        ${status === 'operational' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 
          status === 'active' ? 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-[0_0_20px_rgba(8,145,178,0.15)]' : 
          'bg-slate-50 border-slate-200 text-slate-400'} 
        group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-xl`}>
        <Icon className="w-7 h-7" />
      </div>
      {status === 'active' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-600 rounded-full border-2 border-white animate-pulse" />
      )}
    </div>

    {/* Content Card */}
    <div className="flex-1 industrial-card bg-white p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-500 group-hover:border-cyan-200 relative overflow-hidden">
      {/* Subtle numbering background */}
      <span className="absolute -right-4 -top-8 text-9xl font-black text-slate-50 select-none pointer-events-none group-hover:text-cyan-50 transition-colors">
        0{phase}
      </span>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <span className={`text-[10px] font-black uppercase tracking-[0.3em] mb-2 block 
            ${status === 'operational' ? 'text-emerald-600' : status === 'active' ? 'text-cyan-600' : 'text-slate-400'}`}>
            Phase 0{phase} // {status.toUpperCase()}
          </span>
          <h4 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">{title}</h4>
        </div>
      </div>
      
      <p className="text-slate-500 font-medium leading-relaxed max-w-xl relative z-10">
        {description}
      </p>
      
      <div className="mt-6 flex items-center gap-2 group-hover:gap-4 transition-all opacity-0 group-hover:opacity-100 relative z-10">
        <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">Dive into Specs</span>
        <ChevronRight className="w-4 h-4 text-cyan-600" />
      </div>
    </div>
  </div>
);

const Roadmap = () => {
    const navigate = useNavigate();

    const phases = [
        {
            phase: 1,
            title: "Real-Time Neural Ingestion",
            status: "operational",
            icon: Layers,
            description: "Surpassing legacy hardware latency by implementing a sub-second telemetry uplink. Replaced manual reporting systems with direct IoT-to-Edge streaming protocols."
        },
        {
            phase: 2,
            title: "Hybrid LSTM-Transformer Core",
            status: "active",
            icon: Cpu,
            description: "Deployment of our proprietary safety model. We move beyond static thresholds to predictive analysis, identifying anomalies minutes before secondary failsafes are triggered."
        },
        {
            phase: 3,
            title: "Autonomous SCADA Integration",
            status: "upcoming",
            icon: Zap,
            description: "Automated hardware response. Integrating with industrial PLC units to enable immediate valve isolation and emergency shutdown procedures without operator intervention."
        },
        {
            phase: 4,
            title: "Global Enterprise Safety Mesh",
            status: "upcoming",
            icon: Globe,
            description: "Connecting multi-site operations into a unified safety cloud. Cross-sector data analysis to establish global safety benchmarks and preventive maintenance schedules."
        }
    ];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-cyan-600/20">
            {/* Nav Header */}
            <nav className="fixed top-0 left-0 right-0 py-6 px-10 bg-white/70 backdrop-blur-xl border-b border-slate-100 z-50 flex justify-between items-center shadow-sm">
                <div onClick={() => navigate('/')} className="flex items-center gap-3 cursor-pointer group">
                    <div className="w-10 h-10 bg-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-600/20 group-hover:rotate-12 transition-transform">
                        <Activity className="text-white w-6 h-6" />
                    </div>
                   <h1 className="text-xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">MethaneDetection Ai</h1>
                </div>
                
                <button 
                  onClick={() => navigate('/')}
                  className="px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2"
                >
                    <ArrowLeft className="w-4 h-4" /> Exit to Terminal
                </button>
            </nav>

            {/* Hero Header */}
            <section className="pt-40 pb-20 px-6 bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 rounded-l-[10rem] pointer-events-none" />
                <div className="container mx-auto max-w-5xl relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-50 border border-cyan-100 mb-6">
                        <Zap className="w-3.5 h-3.5 text-cyan-600" />
                        <span className="text-[10px] font-black uppercase text-cyan-600 tracking-widest">Evolution Roadmap</span>
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black tracking-tighter italic text-slate-900 mb-8 uppercase leading-[0.9]">
                        REPLACING <br/>
                        <span className="text-cyan-600">BRITTLE SYSTEMS</span>
                    </h2>
                    <p className="text-slate-500 text-xl font-medium max-w-2xl leading-relaxed">
                        Transitioning from reactive, legacy-based monitoring to a proactive, AI-driven safety mesh. Explore our deployment timeline.
                    </p>
                </div>
            </section>

            {/* Timeline Section */}
            <section className="py-24 px-6 relative">
                <div className="container mx-auto max-w-5xl relative">
                    <div className="flex flex-col">
                        {phases.map((p, idx) => (
                            <RoadmapStep 
                                key={idx}
                                {...p}
                                isLast={idx === phases.length - 1}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="pb-32 px-6">
                <div className="container mx-auto max-w-5xl">
                    <div className="p-12 bg-slate-900 rounded-[3rem] relative overflow-hidden shadow-2xl shadow-slate-900/40 group">
                        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-600/20 blur-[120px] rounded-full pointer-events-none group-hover:bg-cyan-600/30 transition-colors" />
                        <div className="relative z-10">
                            <h3 className="text-4xl font-black text-white italic mb-6">READY TO DEPLOY?</h3>
                            <p className="text-slate-400 text-lg mb-10 max-w-xl font-medium">
                                Join the vanguard of industrial safety. Our platform is ready to integrate with your existing infrastructure via secure edge protocols.
                            </p>
                            <button 
                              onClick={() => navigate('/login')}
                              className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >
                                Secure System Access
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Roadmap;
