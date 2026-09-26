import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/auth';
import { IconShield, IconBuilding, IconLogOut } from './Icons';
import logo from '/logo_L2.png';

export default function Navbar({ onOpenLogin, onOpenRegister }) {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        setUser(getCurrentUser());
    }, []);

    const handleSignOut = () => {
        logout();
        setUser(null);
        navigate('/');
    };

    const dashboardLink = user?.role === 'Administrator' ? '/admin' : '/garage';

    return (
        <nav className="bg-[#111927] text-white sticky top-0 z-40 border-b border-slate-800/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex items-center justify-between h-20">

                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2.5 group focus:outline-none">
                        {/* Replace the div containing 'V' with this img tag */}
                        <img
                            src={logo}
                            alt="V-Sense Logo"
                            // Added: bg-white, rounded-lg, and p-1 for padding
                            className="w-9 h-9 object-contain bg-white rounded-lg p-1 shadow-md shadow-blue-500/20 transition-transform group-hover:scale-105"
                        />
                        <span className="text-2xl font-bold tracking-tight text-white group-hover:text-slate-200 transition">
        V-SENSE
    </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
                        <Link to="/" className="text-white font-semibold hover:text-blue-400 transition-colors duration-200">Home</Link>
                        <a href="/#about" className="hover:text-white transition-colors duration-200">About</a>
                        <a href="/#features" className="hover:text-white transition-colors duration-200">Features</a>
                        <a href="/#how-it-works" className="hover:text-white transition-colors duration-200">How It Works</a>
                    </div>

                    {/* Action Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        {user ? (
                            <div className="flex items-center space-x-3">
                                <Link
                                    to={dashboardLink}
                                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition flex items-center gap-2"
                                >
                                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                    <span>Dashboard</span>
                                    <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-medium">
                                        {user.role}
                                    </span>
                                </Link>
                                <button
                                    onClick={handleSignOut}
                                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800/60 transition"
                                    title="Sign Out"
                                >
                                    <IconLogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={onOpenRegister ? onOpenRegister : () => navigate('/register')}
                                    className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 text-sm font-medium transition"
                                >
                                    Register Partner
                                </button>
                                <button
                                    onClick={onOpenLogin ? onOpenLogin : () => navigate('/login')}
                                    className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-200 active:scale-95"
                                >
                                    Sign In
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Toggle */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/50 focus:outline-none transition"
                            aria-label="Toggle Menu"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-[#111927] border-t border-slate-800 px-6 py-5 space-y-4 text-slate-300 shadow-xl">
                    <Link to="/" onClick={() => setIsOpen(false)} className="block text-white font-semibold">Home</Link>
                    <a href="/#about" onClick={() => setIsOpen(false)} className="block hover:text-white transition">About</a>
                    <a href="/#features" onClick={() => setIsOpen(false)} className="block hover:text-white transition">Features</a>

                    {user ? (
                        <div className="pt-2 space-y-2 border-t border-slate-800">
                            <Link
                                to={dashboardLink}
                                onClick={() => setIsOpen(false)}
                                className="block w-full text-center py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md transition"
                            >
                                Go to {user.role} Dashboard
                            </Link>
                            <button
                                onClick={() => { setIsOpen(false); handleSignOut(); }}
                                className="block w-full text-center py-2 rounded-lg text-red-400 hover:bg-slate-800 text-sm font-medium transition"
                            >
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <div className="pt-2 space-y-2 border-t border-slate-800">
                            <button
                                onClick={() => { setIsOpen(false); if (onOpenRegister) onOpenRegister(); else navigate('/register'); }}
                                className="block w-full text-center py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition"
                            >
                                Register Garage / Center
                            </button>
                            <button
                                onClick={() => { setIsOpen(false); if (onOpenLogin) onOpenLogin(); else navigate('/login'); }}
                                className="block w-full text-center py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md transition"
                            >
                                Sign In
                            </button>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}