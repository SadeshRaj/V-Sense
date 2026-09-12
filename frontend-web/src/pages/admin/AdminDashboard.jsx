export default function AdminDashboard() {
    const pendingReviews = [
        { id: 'REV-0921', regNo: 'CBA-4592', reason: 'Odometer Rollback Detected', date: '2026-09-11', riskLevel: 'High' },
        { id: 'REV-0922', regNo: 'WP-KAA-1234', reason: 'Unverified Garage Receipt', date: '2026-09-11', riskLevel: 'Medium' },
        { id: 'REV-0923', regNo: 'CAA-9911', reason: 'Maintenance Gap > 2 Years', date: '2026-09-10', riskLevel: 'Medium' },
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Pending Approvals</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">12</h3>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-4"><span className="text-red-500 font-medium">3 High Risk</span> requiring immediate action</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Active AI Workflows</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">48</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-4"><span className="text-green-500 font-medium">↑ 12%</span> from yesterday</p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Certificates Generated</p>
                            <h3 className="text-3xl font-bold text-slate-900 mt-1">1,204</h3>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-sm text-slate-500 mt-4">Lifetime premium verifications</p>
                </div>
            </div>

            {/* Human-in-the-Loop Queue */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Human-in-the-Loop Action Center</h3>
                        <p className="text-sm text-slate-500 mt-1">Workflows paused by the Validation & Safety Agent requiring review.</p>
                    </div>
                    <button className="text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 px-4 py-2 rounded-lg transition-colors cursor-pointer">
                        View All Flags
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                            <th className="px-6 py-4">Review ID</th>
                            <th className="px-6 py-4">Vehicle Reg</th>
                            <th className="px-6 py-4">Flag Reason</th>
                            <th className="px-6 py-4">Risk Level</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                        {pendingReviews.map((review) => (
                            <tr key={review.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 text-sm font-medium text-slate-900">{review.id}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{review.regNo}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{review.reason}</td>
                                <td className="px-6 py-4 text-sm">
                    <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                            review.riskLevel === 'High'
                                ? 'bg-red-50 text-red-700 border border-red-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}
                    >
                      {review.riskLevel}
                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-500">{review.date}</td>
                                <td className="px-6 py-4 text-sm text-right">
                                    <button className="text-blue-600 font-medium hover:text-blue-800 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        Review Evidence →
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}