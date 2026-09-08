import React from 'react';

export default function HowItWorks() {
    const steps = [
        { num: 1, title: "Collect Data", desc: "Vehicle information, service records, incidents, inspections and more." },
        { num: 2, title: "AI Analysis", desc: "Our agentic AI checks for fraud, detects risks and assesses value." },
        { num: 3, title: "Human Review", desc: "High-risk cases are reviewed by our experts for accuracy and verification." },
        { num: 4, title: "Get Assessment", desc: "Receive a detailed report with risk level, valuation and AI insights." },
        { num: 5, title: "View Certificate", desc: "Access your official digital vehicle certificate." }
    ];

    return (
        <section id="how-it-works" className="bg-gradient-to-b from-[#f0f6ff] to-slate-50 py-28">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="text-center max-w-2xl mx-auto mb-20">
                    <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">How V-Sense Works</h2>
                    <p className="mt-4 text-slate-600 text-base">From vehicle data to trusted insights in a few simple steps.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
                    {steps.map((s, i) => (
                        <div
                            key={i}
                            className="group flex flex-col items-center text-center relative p-6 rounded-2xl bg-white/60 backdrop-blur-sm border border-slate-200/60 hover:bg-white hover:shadow-lg transition-all duration-300"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center mb-6 shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                                {s.num}
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-3">{s.title}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>

                            {/* Connecting arrow indicator for wide viewports */}
                            {i < steps.length - 1 && (
                                <div className="hidden md:flex absolute top-1/2 -right-6 -translate-y-1/2 z-10 text-slate-300">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}