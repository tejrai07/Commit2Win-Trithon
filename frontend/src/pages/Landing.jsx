import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Activity, Zap, Cpu, ArrowRight, CheckCircle, 
  ChevronDown, BarChart3, Globe, ShieldCheck, Layers, Eye,
  AlertTriangle
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  // Scroll Reveal Logic
  React.useEffect(() => {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('reveal-visible');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Activity,
      title: "Real-Time Telemetry",
      description: "Zero-latency sensor data streaming directly from environmental nodes to your command center.",
      color: "text-emerald-600",
      bg: "bg-emerald-50"
    },
    {
      icon: Cpu,
      title: "ANN-LSTM Core",
      description: "Advanced deep learning models predict methane spikes before they materialize with 99.9% accuracy.",
      color: "text-cyan-600",
      bg: "bg-cyan-50"
    },
    {
      icon: Zap,
      title: "Tactical Overrides",
      description: "Automated isolation protocols and SMS alerts trigger instantly during critical breach detection.",
      color: "text-amber-600",
      bg: "bg-amber-50"
    }
  ];
  
  const accidents = [
    {
      title: "San Bruno Pipeline Explosion",
      year: "2010",
      impact: "8 Fatalities, 58 Injured",
      description: "A high-pressure natural gas line rupture caused a massive fireball that destroyed 38 homes.",
      location: "San Bruno, California"
    },
    {
      title: "Kaohsiung Gas Explosions",
      year: "2014",
      impact: "32 Fatalities, 300+ Injured",
      description: "A series of explosions triggered by propene leaks in underground pipelines ripped through city streets.",
      location: "Kaohsiung, Taiwan"
    },
    {
      title: "Aliso Canyon Gas Leak",
      year: "2015",
      impact: "97,100 Tonnes Methane Released",
      description: "The largest methane leak in US history, caused by a failed well casing, forcing thousands to evacuate.",
      location: "Porter Ranch, Los Angeles"
    },
    {
      title: "Urumqi Mine Gas Outburst",
      year: "2023",
      impact: "3 Fatalities, Multiple Trapped",
      description: "Sudden methane accumulation in underground mining sectors led to a fatal gas outburst.",
      location: "Urumqi, China"
    },
    {
        title: "Dusseldorf Industrial Leak",
        year: "2022",
        impact: "Zone Isolation, 15 Hospitalized",
        description: "Undetected methane seepage in a storage trench led to critical oxygen displacement in worker zones.",
        location: "Dusseldorf, Germany"
    }
  ];

  const AccidentScroll = () => (
    <div className="bg-slate-900 py-16 overflow-hidden border-y border-slate-800 relative">
      <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-slate-900 to-transparent z-10" />
      <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-slate-900 to-transparent z-10" />
      
      <div className="container mx-auto px-6 mb-10 relative z-20">
         <div className="flex items-center gap-4 mb-2">
            <div className="h-[1px] w-12 bg-rose-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-500">Historical Impact Analysis</span>
         </div>
         <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase">The Cost of Undetected Leaks</h3>
      </div>

      <div className="flex group">
        <div className="flex animate-scroll gap-6 px-6">
          {[...accidents, ...accidents].map((acc, idx) => (
            <div 
              key={idx} 
              className="w-[450px] bg-slate-800/50 backdrop-blur-md border border-slate-700 p-8 rounded-3xl hover:border-rose-500/50 transition-all duration-300 group/card shrink-0"
            >
              <div className="flex justify-between items-start mb-6">
                 <span className="px-3 py-1 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-full text-[9px] font-black uppercase tracking-widest">{acc.year}</span>
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{acc.location}</span>
              </div>
              <h4 className="text-lg font-black text-white mb-2 uppercase tracking-tighter group-hover/card:text-rose-400 transition-colors">{acc.title}</h4>
              <p className="text-slate-400 text-sm font-medium leading-relaxed mb-4">{acc.description}</p>
              <div className="h-[1px] w-full bg-slate-700 mb-4" />
              <div className="flex items-center gap-2 text-rose-500">
                 <AlertTriangle className="w-4 h-4" />
                 <span className="text-[10px] font-black uppercase tracking-widest">{acc.impact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center mt-10">
         <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-500">Feed auto-scrolls // Pause on hover to analyze briefs</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-cyan-100 selection:text-cyan-900">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-600/20">
            <Shield className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-black italic tracking-tighter uppercase text-slate-900">MethaneDetection Ai</span>
        </div>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/roadmap')}
            className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-cyan-600 transition-colors"
          >
            Evolution Roadmap
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/10"
          >
            Launch System
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden pt-16">
        {/* Abstract Background Elements */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-100 rounded-full blur-[140px] opacity-40 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-50 rounded-full blur-[160px] opacity-40 animate-pulse-slow" />
        
        {/* Mesh Gradient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.03)_0%,transparent_70%)] pointer-events-none" />

        <div className="container mx-auto px-6 relative z-10 text-center reveal">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 border border-slate-200 mb-8 animate-float">
             <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">System Live // v3.1 Enterprise</span>
          </div>
          
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-slate-900 mb-6 leading-[0.9]">
            THE FUTURE OF <br/>
            <span className="bg-gradient-to-r from-cyan-600 to-emerald-600 bg-clip-text text-transparent italic">PREDICTIVE SAFETY</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-slate-500 text-lg md:text-xl font-medium mb-12 leading-relaxed">
            Harnessing high-fidelity ANN-LSTM neural networks to predict, monitor, and neutralize methane hazards in real-time. The ultimate command center for industrial environmental safety.
          </p>
          
          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => navigate('/login')}
              className="group px-10 py-5 bg-cyan-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-cyan-700 transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-cyan-600/30 flex items-center gap-3"
            >
              Launch System Core
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/roadmap')}
              className="px-10 py-5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all shadow-xl shadow-slate-100/50"
            >
              Evolution Roadmap
            </button>
            <button 
              onClick={() => document.getElementById('specs').scrollIntoView({ behavior: 'smooth' })}
              className="px-10 py-5 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-50 transition-all shadow-xl shadow-slate-100/50"
            >
              Technical Specs
            </button>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-30 cursor-pointer" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
            <ChevronDown className="text-slate-900 w-8 h-8" />
          </div>
        </div>
      </section>

      {/* Historical Accident Ticker */}
      <AccidentScroll />

      {/* Features Grid */}
      <section id="features" className="py-32 bg-slate-50 relative overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center mb-20 reveal">
            <h2 className="text-[10px] font-black text-cyan-600 uppercase tracking-[0.6em] mb-4">Core Architecture</h2>
            <h3 className="text-4xl font-black text-slate-900 tracking-tight italic">Engineered for Absolute Zero Failure</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, idx) => (
              <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 hover:scale-105 transition-all duration-500 group reveal">
                <div className={`w-14 h-14 ${f.bg} rounded-2xl flex items-center justify-center mb-8 border border-slate-100 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`${f.color} w-7 h-7`} />
                </div>
                <h4 className="text-xl font-black text-slate-900 mb-4 uppercase tracking-tighter italic">{f.title}</h4>
                <p className="text-slate-500 font-medium leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Specs Comparison */}
      <section id="specs" className="py-32 bg-white relative">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-16 items-center">
            <div className="flex-1 reveal">
               <h2 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.6em] mb-4">Trithon Benchmark</h2>
               <h3 className="text-5xl font-black text-slate-900 tracking-tighter mb-8 leading-tight">ADVANCEMENTS BEYOND <br/> LEGACY MONITORING</h3>
               <p className="text-slate-500 text-lg mb-10 leading-relaxed font-medium">
                  Traditional safety systems rely on reactive thresholds—triggering only *after* a breach occurrs. Commit2Win's Trithon Core utilizes predictive neural fusion to eliminate risk before it manifests.
               </p>
               
               <div className="space-y-6">
                  {[
                    { icon: Layers, t: "ANN-LSTM Neural Fusion", d: "Predicts methane spikes 15-20 minutes in advance with 99.9% accuracy." },
                    { icon: Eye, t: "Explainable AI (X-AI)", d: "Provides human-readable reasoning for every alert, eliminating false-alarm fatigue." },
                    { icon: ShieldCheck, t: "<1s Latency Override", d: "Sub-second response time from anomaly detection to hardware valve isolation." }
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6 items-start">
                       <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                          <item.icon className="w-6 h-6 text-cyan-600" />
                       </div>
                       <div>
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{item.t}</h4>
                          <p className="text-slate-500 text-sm mt-1">{item.d}</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
            
            <div className="flex-1 bg-slate-50 rounded-[3rem] p-12 border border-slate-200 shadow-2xl reveal">
               <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 text-center bg-white py-2 rounded-full border border-slate-100">Legacy vs Trithon Core</div>
               <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-200 italic font-black text-[10px] uppercase text-slate-400 px-4">
                     <div>Legacy System</div>
                     <div>Trithon (Ours)</div>
                  </div>
                  {[
                    ["Reactive Sampling", "Continuous Streaming"],
                    ["Threshold-Only Alerts", "Predictive Forecasting"],
                    ["Manual Logic", "Explainable AI (X-AI)"],
                    ["High False Positives", "Ultra-Low Noise Model"],
                    [">30s Response Time", "<1s Autonomous Action"]
                  ].map((row, i) => (
                    <div key={i} className="grid grid-cols-2 gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm group hover:border-cyan-200 transition-colors">
                       <div className="text-xs font-bold text-slate-400">{row[0]}</div>
                       <div className="text-xs font-black text-cyan-600 flex items-center gap-2">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          {row[1]}
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
          <div className="industrial-card p-12 md:p-20 bg-slate-900 text-white relative overflow-hidden">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="absolute top-0 right-0 p-12 opacity-50">
              <ShieldCheck className="w-64 h-64 text-cyan-500 drop-shadow-[0_0_50px_rgba(6,182,212,0.3)]" />
            </div>

            <div className="relative z-10 max-w-3xl">
              <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter leading-tight mb-8">
                TRUSTED BY GLOBAL <br className="hidden md:block" />
                INDUSTRIAL SECTORS
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                <div>
                   <span className="text-4xl font-black text-white italic">24/7</span>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Active Surveillance</p>
                </div>
                <div>
                   <span className="text-4xl font-black text-emerald-400 italic">99.9%</span>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Uptime Reliability</p>
                </div>
                <div>
                   <span className="text-4xl font-black text-cyan-400 italic">&lt;1s</span>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Alert Latency</p>
                </div>
                <div>
                   <span className="text-4xl font-black text-white italic">MIL</span>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Grade Encryption</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-slate-100 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
              >
                Access Command Center
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-slate-100 bg-slate-50 text-slate-500">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Shield className="text-slate-400 w-6 h-6" />
            <span className="text-lg font-black italic tracking-tighter uppercase text-slate-400">MethaneDetection Ai</span>
          </div>
          <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.4em]">
             <span className="hover:text-cyan-600 transition-colors cursor-pointer">Security</span>
             <span className="hover:text-cyan-600 transition-colors cursor-pointer">Privacy</span>
             <span className="hover:text-cyan-600 transition-colors cursor-pointer">API Docs</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest">© 2026 TRITHON_EXPRESS // ALL RIGHTS RESERVED</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
