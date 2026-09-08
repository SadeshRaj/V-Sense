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

            {/* Softened Gradient Overlay - lets the landscape show through while maintaining text contrast */}
            <div className="absolute inset-0 z-10 bg-gradient-to-r from-white/70 via-white/40 to-transparent" />

            {/* Hero Content */}
            <div className="relative z-20 max-w-7xl mx-auto px-6 lg:px-12 w-full py-20 lg:py-28">
                <div className="max-w-2xl space-y-6">
                    <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                        Drive with <span className="text-blue-600">Confidence</span>
                    </h1>

                    <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-medium">
                        V-Sense provides comprehensive vehicle history, fraud detection and accurate valuation, so you can make smarter, safer decisions when buying or selling a used vehicle.
                    </p>

                    <div className="pt-4 flex flex-wrap items-center gap-4">
                        <a
                            href="/login"
                            className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Get Started →
                        </a>
                        <a
                            href="#how-it-works"
                            className="inline-flex items-center justify-center px-7 py-3.5 rounded-lg border border-slate-300/80 bg-white/90 hover:bg-white text-slate-800 font-semibold text-sm transition-all duration-300 shadow-sm hover:border-slate-400 hover:-translate-y-0.5 active:translate-y-0"
                        >
                            Learn More
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}