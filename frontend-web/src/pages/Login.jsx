import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/auth';
import {
    IconClock,
    IconXCircle,
    IconAlertTriangle,
    IconBuilding
} from '../components/Icons';

export default function Login({ isOpen = true, onClose, isModal = false }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [errorType, setErrorType] = useState('generic'); // 'generic' | 'pending' | 'rejected'
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    if (isModal && !isOpen) return null;

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
            } else if (
                user.role === 'Garage' ||
                user.role === 'ServiceCenter'
            ) {
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
        <div className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-xl z-10 space-y-6">

            {/* Close Button if modal */}
            {isModal && onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
                    aria-label="Close modal"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            )}

            {/* Header */}
            <div className="text-center space-y-2">
                <div className="inline-flex w-12 h-12 bg-blue-600 rounded-xl items-center justify-center text-2xl font-black text-white shadow-md shadow-blue-600/30">
                    V
                </div>

                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                    V-Sense Authentication
                </h2>

                <p className="text-xs text-slate-500 font-medium">
                    Sign in to your Partner or Administrator account
                </p>
            </div>

            {/* Dynamic Status Error Alerts */}
            {error && (
                <div>
                    {errorType === 'pending' ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-medium space-y-1">
                            <div className="flex items-center gap-2 font-bold text-amber-900">
                                <IconClock className="w-4 h-4 text-amber-600" />
                                Account Pending Verification
                            </div>

                            <p className="leading-relaxed text-slate-700">
                                {error}
                            </p>

                            <p className="text-[11px] text-amber-700/90 pt-1">
                                An approval notification will be sent to your email once the administrator verifies your BR document.
                            </p>
                        </div>
                    ) : errorType === 'rejected' ? (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-medium space-y-1">
                            <div className="flex items-center gap-2 font-bold text-red-900">
                                <IconXCircle className="w-4 h-4 text-red-600" />
                                Registration Not Approved
                            </div>

                            <p className="leading-relaxed text-slate-700">
                                {error}
                            </p>
                        </div>
                    ) : (
                        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-medium flex items-center gap-2">
                            <IconAlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                            <span>{error}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Email */}
                <div>
                    <label
                        htmlFor="email"
                        className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider"
                    >
                        Email Address
                    </label>

                    <input
                        id="email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@v-sense.com"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-blue-600 transition placeholder:text-slate-400 font-medium"
                    />
                </div>

                {/* Password */}
                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label
                            htmlFor="password"
                            className="block text-xs font-bold text-slate-500 uppercase tracking-wider"
                        >
                            Password
                        </label>
                    </div>

                    <input
                        id="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:bg-white focus:border-blue-600 transition placeholder:text-slate-400 font-medium"
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-sm text-white shadow-md shadow-blue-600/20 transition disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <svg
                                className="animate-spin h-4 w-4 text-white"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                    fill="none"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                />
                            </svg>

                            <span>Signing In...</span>
                        </>
                    ) : (
                        <span>Sign In</span>
                    )}
                </button>
            </form>

            {/* Register Link */}
            <div className="pt-4 border-t border-slate-200 text-center text-xs space-y-1.5 font-medium">
                <p className="text-slate-500">
                    Are you a Garage or Service Center?
                </p>

                <Link
                    to="/register"
                    onClick={() => {
                        if (isModal && onClose) onClose();
                    }}
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold transition hover:underline"
                >
                    <IconBuilding className="w-3.5 h-3.5" />
                    Register as an Authorized Partner &rarr;
                </Link>
            </div>
        </div>
    );

    {/* Modal */}
    if (isModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
                {content}
            </div>
        );
    }

    {/* Normal Login Page */}
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans">
            <div className="mb-6">
                <Link
                    to="/"
                    className="text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1 transition"
                >
                    &larr; Back to V-Sense Home
                </Link>
            </div>

            {content}
        </div>
    );
}