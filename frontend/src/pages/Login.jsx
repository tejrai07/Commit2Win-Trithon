import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Shield, AlertTriangle } from 'lucide-react';

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
        <div className="min-h-screen flex items-center justify-center bg-mesh p-4">
            {/* Animated Background Element */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl animate-pulse-slow" />

            <div className="industrial-card w-full max-w-md p-8 relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/30">
                        <Shield className="text-blue-400 w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">MethaneSentinel AI</h1>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">Predictive Safety Portal</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                            Authorized Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="email"
                                required
                                className="glass-input w-full pl-10"
                                placeholder="engineer@industrial-safety.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                            Security Key
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="password"
                                required
                                className="glass-input w-full pl-10"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full py-3 mt-4 flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <span>INITIALIZE SYSTEM ACCESS</span>
                                <Shield className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-hazard-amber shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                        WARNING: Access to this terminal is restricted to authorized personnel only. 
                        All prediction activity and data streams are logged for auditing purposes.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
