import React from 'react';

export default function Hero() {
    return (
        <section className="relative min-h-[550px] lg:min-h-[620px] flex items-center overflow-hidden bg-slate-900 text-slate-900">
            {/* Single Hero Background Banner Image */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{
                    backgroundImage: `url('/hero_image.png')`
                }}
            />

            {/* Softened Gradient Overlay - lets the background show through while maintaining contrast */}
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-white/90 via-white/60 to-transparent" />

            {/* Hero Content */}
            <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 w-full py-20 lg:py-28">
                <div className="max-w-2xl space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
                        Enterprise Portal
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                        AI-Powered Vehicle <span className="text-blue-600">Appraisal & Risk Control</span>
                    </h1>

                    <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-medium">
                        The central management hub for appraising vehicle histories, conducting inspections, detecting valuation risks, and issuing certified reports.
                    </p>

                    <div className="pt-4 flex flex-wrap items-center gap-4">
                        <a
                            href="/login"
                            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Staff Portal Sign In →
                        </a>
                        <a
                            href="#features"
                            className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg border border-slate-300/80 bg-white/90 hover:bg-white text-slate-800 font-semibold text-sm transition-all duration-300 shadow-sm hover:border-slate-400 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Explore Capabilities
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}