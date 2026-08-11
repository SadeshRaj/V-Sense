import React, { useState } from 'react';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="bg-[#111927] text-white sticky top-0 z-50 border-b border-slate-800">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="flex items-center justify-between h-20">

                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center font-black text-xl text-white tracking-tighter">
                            V
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-white">
              V-SENSE
            </span>
                    </div>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center space-x-10 text-sm font-medium text-slate-300">
                        <a href="#home" className="text-white font-semibold border-b-2 border-blue-500 pb-1">Home</a>
                        <a href="#about" className="hover:text-white transition">About</a>
                        <a href="#features" className="hover:text-white transition">Features</a>
                        <a href="#how-it-works" className="hover:text-white transition">How It Works</a>
                        <a href="#contact" className="hover:text-white transition">Contact</a>
                    </div>

                    {/* Action Buttons */}
                    <div className="hidden md:flex items-center space-x-4">
                        <a href="/login" className="px-5 py-2 rounded-md border border-slate-600 text-slate-200 text-sm font-medium hover:border-slate-400 transition">
                            Sign In
                        </a>
                        <a href="/login" className="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium shadow-md transition">
                            Get Started
                        </a>
                    </div>

                    {/* Mobile Toggle */}
                    <div className="md:hidden">
                        <button onClick={() => setIsOpen(!isOpen)} className="text-slate-300 focus:outline-none">
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="md:hidden bg-[#111927] border-t border-slate-800 px-6 py-4 space-y-3 text-slate-300">
                    <a href="#home" className="block text-white font-semibold">Home</a>
                    <a href="#about" className="block hover:text-white">About</a>
                    <a href="#features" className="block hover:text-white">Features</a>
                    <a href="#how-it-works" className="block hover:text-white">How It Works</a>
                    <a href="#contact" className="block hover:text-white">Contact</a>
                    <div className="pt-2 flex flex-col gap-2">
                        <a href="/login" className="text-center py-2 rounded border border-slate-600 text-white text-sm">Sign In</a>
                        <a href="/login" className="text-center py-2 rounded bg-blue-600 text-white text-sm font-medium">Get Started</a>
                    </div>
                </div>
            )}
        </nav>
    );
}