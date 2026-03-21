import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Shield, AlertTriangle, Fingerprint } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        // Simulate industrial authorization bridge
        setTimeout(() => {
            setLoading(false);
            navigate('/dashboard');
        }, 1500);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-mesh p-4 overflow-hidden">
            {/* Dynamic Background Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/5 rounded-full blur-[150px] animate-pulse-slow" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_70%)] pointer-events-none" />

            <div className="industrial-card w-full max-w-md p-10 animate-float relative z-10 border-white/20 shadow-2xl">
                {/* Decorative Shimmer Line */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shimmer" />

                <div className="flex flex-col items-center mb-10">
                    <div className="relative group">
                        <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl group-hover:bg-blue-500/30 transition-all duration-500" />
                        <div className="w-20 h-20 bg-white/5 backdrop-blur-3xl rounded-3xl flex items-center justify-center mb-4 border border-white/20 shadow-2xl relative z-10 overflow-hidden shimmer">
                            <Shield className="text-blue-400 w-10 h-10 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black tracking-tighter text-white mb-1 bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
                        MethaneDetection Ai
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em]">Secure Node 0x7F2A</p>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                            <span>Operator Identity</span>
                            <span className="text-blue-500/50 italic">Required</span>
                        </label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="email"
                                required
                                className="glass-input w-full pl-12 active:scale-[0.99] transition-transform"
                                placeholder="name@industrial-complex.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                            <span>Access Vector</span>
                            <Fingerprint className="w-3 h-3 text-emerald-500/50" />
                        </label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                            <input
                                type="password"
                                required
                                className="glass-input w-full pl-12 active:scale-[0.99] transition-transform"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-4 mt-6 flex items-center justify-center gap-3 group relative overflow-hidden overflow-hidden shimmer"
                    >
                        {loading ? (
                            <div className="flex items-center gap-3">
                                <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                <span className="text-xs tracking-widest font-black uppercase">Syncing Uplink...</span>
                            </div>
                        ) : (
                            <>
                                <span className="relative z-10 text-xs tracking-[0.2em] font-black">INITIALIZE SYSTEM UPLINK</span>
                                <Shield className="w-4 h-4 relative z-10 group-hover:rotate-12 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-10 pt-8 border-t border-white/10 flex items-start gap-4">
                    <div className="p-2 bg-hazard-amber/10 rounded-lg border border-hazard-amber/20">
                        <AlertTriangle className="w-5 h-5 text-hazard-amber" />
                    </div>
                    <div>
                        <p className="text-[9px] text-slate-500 leading-relaxed font-mono uppercase tracking-tighter">
                            Restricted Interface // Level 4 Clearance Required
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                            Unauthorized access attempts will be isolated and logged via hardware-level tracing protocols. 
                        </p>
                    </div>
                </div>
            </div>

            {/* Floating UI Accents */}
            <div className="absolute top-10 left-10 text-white/5 font-mono text-xs hidden lg:block tracking-[0.5em] font-black uppercase">
                Methane<br/>Detection<br/>Ai
            </div>
            <div className="absolute bottom-10 right-10 text-white/5 font-mono text-xs hidden lg:block tracking-[0.5em] font-black uppercase">
                Encryption<br/>V2.4.92<br/>AES-GCM
            </div>
        </div>
    );
};

export default Login;
