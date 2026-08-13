import React, { useState } from 'react';

export default function Navbar({ onOpenLogin }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="bg-[#111927] text-white sticky top-0 z-40 border-b border-slate-800/80 backdrop-blur-md">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex items-center justify-between h-20">

                    {/* Logo */}
                    <a href="#home" className="flex items-center gap-2.5 group focus:outline-none">
                        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center font-black text-xl text-white tracking-tighter shadow-md shadow-blue-500/20 group-hover:bg-blue-500 transition">
                            V
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-white group-hover:text-slate-200 transition">
                            V-SENSE
                        </span>
                    </a>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-300">
                        <a href="#home" className="text-white font-semibold border-b-2 border-blue-500 pb-1">Home</a>
                        <a href="#about" className="hover:text-white transition-colors duration-200">About</a>
                        <a href="#features" className="hover:text-white transition-colors duration-200">Features</a>
                        <a href="#how-it-works" className="hover:text-white transition-colors duration-200">How It Works</a>
                        <a href="#contact" className="hover:text-white transition-colors duration-200">Contact</a>
                    </div>

                    {/* Action Button */}
                    <div className="hidden md:flex items-center">
                        <button
                            onClick={onOpenLogin}
                            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-500/30 transition-all duration-200 active:scale-95"
                        >
                            Sign In
                        </button>
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
                    <a href="#home" onClick={() => setIsOpen(false)} className="block text-white font-semibold">Home</a>
                    <a href="#about" onClick={() => setIsOpen(false)} className="block hover:text-white transition">About</a>
                    <a href="#features" onClick={() => setIsOpen(false)} className="block hover:text-white transition">Features</a>
                    <a href="#how-it-works" onClick={() => setIsOpen(false)} className="block hover:text-white transition">How It Works</a>
                    <a href="#contact" onClick={() => setIsOpen(false)} className="block hover:text-white transition">Contact</a>
                    <div className="pt-2">
                        <button
                            onClick={() => { setIsOpen(false); onOpenLogin(); }}
                            className="block w-full text-center py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-md transition"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}