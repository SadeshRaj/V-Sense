import React from 'react';

export default function Footer() {
    return (
        <footer className="bg-[#111927] text-slate-400 py-8 border-t border-slate-800 text-xs">
            <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col items-center justify-center space-y-4">
                <div className="flex items-center gap-4 text-slate-400 font-medium">
                    <span className="h-px w-16 bg-slate-700"></span>
                    <span>Trusted by vehicle owners, professionals and businesses</span>
                    <span className="h-px w-16 bg-slate-700"></span>
                </div>
                <p className="text-slate-500">© {new Date().getFullYear()} V-Sense. All rights reserved.</p>
            </div>
        </footer>
    );
}