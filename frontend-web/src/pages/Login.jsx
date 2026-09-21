import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/auth';
import { IconClock, IconXCircle, IconAlertTriangle, IconBuilding } from '../components/Icons';

export default function Login({ isOpen = true, onClose, isModal = false }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [errorType, setErrorType] = useState('generic'); // 'generic' | 'pending' | 'rejected'
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    if (isModal && !isOpen) return null;

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            navigate('/');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setErrorType('generic');
        setLoading(true);

        try {
            const user = await loginUser(email, password);
            if (isModal && onClose) onClose();

            if (user.role === 'Administrator') {
                navigate('/admin');
            } else if (user.role === 'Garage' || user.role === 'ServiceCenter') {
                navigate('/garage');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            const msg = err.message || '';
            if (msg.toLowerCase().includes('pending')) {
                setErrorType('pending');
                setError(msg);
            } else if (msg.toLowerCase().includes('rejected')) {
                setErrorType('rejected');
                setError(msg);
            } else {
                setErrorType('generic');
                setError(msg || 'Invalid email or password.');
            }
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl z-10 space-y-6">

            {/* Close Button if modal */}
            {isModal && onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg transition"
                    aria-label="Close modal"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex w-12 h-12 bg-blue-600 rounded-xl items-center justify-center text-2xl font-black text-white shadow-lg shadow-blue-600/30">
                    V
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">V-Sense Authentication</h2>
                <p className="text-xs text-slate-400">Sign in to your Partner or Administrator account</p>
            </div>

            {/* Dynamic Status Error Alerts */}
            {error && (
                <div>
                    {errorType === 'pending' ? (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-medium space-y-1">
                            <div className="flex items-center gap-2 font-semibold text-amber-200">
                                <IconClock className="w-4 h-4 text-amber-400" />
                                Account Pending Verification
                            </div>
                            <p className="leading-relaxed text-slate-300">{error}</p>
                            <p className="text-[11px] text-amber-400/80 pt-1">
                                An approval notification will be sent to your email once the administrator verifies your BR document.
                            </p>
                        </div>
                    ) : errorType === 'rejected' ? (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs font-medium space-y-1">
                            <div className="flex items-center gap-2 font-semibold text-red-200">
                                <IconXCircle className="w-4 h-4 text-red-400" />
                                Registration Not Approved
                            </div>
                            <p className="leading-relaxed text-slate-300">{error}</p>
                        </div>
                    ) : (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-medium flex items-center gap-2">
                            <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
                        Email Address
                    </label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@v-sense.com or partner@garage.com"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Password
                        </label>
                    </div>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm text-white shadow-lg shadow-blue-600/25 transition disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Signing In...</span>
                        </>
                    ) : (
                        <span>Sign In</span>
                    )}
                </button>
            </form>

            <div className="pt-2 border-t border-slate-800 text-center text-xs space-y-2">
                <p className="text-slate-400">Are you a Garage or Service Center?</p>
                <Link
                    to="/register"
                    onClick={() => { if (isModal && onClose) onClose(); }}
                    className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-medium transition"
                >
                    <IconBuilding className="w-3.5 h-3.5" />
                    Register as an Authorized Partner &rarr;
                </Link>
            </div>
        </div>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
                    onClick={onClose}
                />
                {content}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
            <div className="mb-6">
                <Link to="/" className="text-slate-400 hover:text-white text-xs flex items-center gap-1 transition">
                    &larr; Back to V-Sense Home
                </Link>
            </div>
            {content}
        </div>
    );
}