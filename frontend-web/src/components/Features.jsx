import React from 'react';

export default function Features() {
    const items = [
        {
            title: "Complete Vehicle History",
            desc: "Get full ownership, service and incident records in one place.",
            icon: (
                <svg className="w-8 h-8 text-blue-600 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        },
        {
            title: "Fraud Detection",
            desc: "AI-powered analysis to detect odometer rollbacks, missing records and suspicious patterns.",
            icon: (
                <svg className="w-8 h-8 text-blue-600 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            )
        },
        {
            title: "Accurate Valuation",
            desc: "Market-based pricing with AI analysis of condition, history and demand.",
            icon: (
                <svg className="w-8 h-8 text-blue-600 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 7h.01M7 11h.01M7 15h.01M13 7h.01M13 11h.01M13 15h.01M19 7h.01M19 11h.01M19 15h.01" />
                </svg>
            )
        },
        {
            title: "Digital Certificate",
            desc: "Verified, tamper-proof certificates for complete peace of mind.",
            icon: (
                <svg className="w-8 h-8 text-blue-600 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457-.315-2.84-.877-4.088" />
                </svg>
            )
        },
        {
            title: "Mobile & Web Access",
            desc: "Use our mobile app in the field or our web platform in the office. Same data. Same system.",
            icon: (
                <svg className="w-8 h-8 text-blue-600 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
            )
        },
        {
            title: "Built for Everyone",
            desc: "Buyers, inspectors, appraisers and administrators all on one platform.",
            icon: (
                <svg className="w-8 h-8 text-blue-600 transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            )
        }
    ];

    return (
        <section id="features" className="bg-white py-24 border-b border-slate-100">
            <div className="max-w-7xl mx-auto px-6 lg:px-12">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10 text-center">
                    {items.map((item, idx) => (
                        <div
                            key={idx}
                            className="group flex flex-col items-center p-8 rounded-2xl border border-slate-100 bg-white hover:border-blue-100 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 ease-out"
                        >
                            <div className="w-20 h-20 rounded-2xl bg-blue-50/80 border border-blue-100 flex items-center justify-center mb-6 transition-colors duration-300 group-hover:bg-blue-600 group-hover:border-blue-600">
                <span className="group-hover:[&_svg]:text-white transition-colors duration-300">
                  {item.icon}
                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 leading-snug mb-3 group-hover:text-blue-600 transition-colors">
                                {item.title}
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed max-w-sm">
                                {item.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}