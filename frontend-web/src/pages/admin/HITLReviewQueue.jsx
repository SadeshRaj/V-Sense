import React, { useState, useEffect } from 'react';
import { getPendingWorkflows, getWorkflowDetails, approveWorkflow, rejectWorkflow } from '../../api/workflowApi';
import {
    IconClock,
    IconCheckCircle,
    IconXCircle,
    IconFileText,
    IconAlertTriangle,
    IconSearch
} from '../../components/Icons';

export default function HITLReviewQueue() {
    const [pendingWorkflows, setPendingWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [notification, setNotification] = useState(null);

    // Modal & Review State
    const [activeWorkflow, setActiveWorkflow] = useState(null);
    const [workflowDetails, setWorkflowDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [comment, setComment] = useState('');

    useEffect(() => {
        loadPendingWorkflows();
    }, []);

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const loadPendingWorkflows = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getPendingWorkflows();
            setPendingWorkflows(data);
        } catch (err) {
            setError(err.message || 'Failed to load pending reviews from Agent 4.');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReview = async (workflow) => {
        setActiveWorkflow(workflow);
        setWorkflowDetails(null);
        setComment('');
        setDetailsLoading(true);

        try {
            const data = await getWorkflowDetails(workflow.id);
            setWorkflowDetails({
                ...data,
                fraudFlags: JSON.parse(data.fraudFlags || '[]'),
                historySummary: JSON.parse(data.historySummary || '{}')
            });
        } catch (err) {
            showToast(err.message || 'Failed to load evidence details.', 'error');
            setActiveWorkflow(null);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleConfirmAction = async (actionType) => {
        if (!activeWorkflow) return;
        setActionLoading(true);
        try {
            if (actionType === 'approve') {
                await approveWorkflow(activeWorkflow.id, comment);
                showToast(`Report Approved! Certificate QR generated successfully.`);
            } else {
                await rejectWorkflow(activeWorkflow.id, comment);
                showToast(`Report Rejected safely. Workflow terminated.`, 'error');
            }
            setActiveWorkflow(null);
            await loadPendingWorkflows();
        } catch (err) {
            showToast(err.message || `Failed to ${actionType} workflow.`, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const filteredWorkflows = pendingWorkflows.filter(w =>
        (w.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.vehicleReg || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.requesterName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w.requesterEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {notification && (
                <div className="fixed top-20 right-6 z-50 animate-bounce">
                    <div className={`px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border ${
                        notification.type === 'error'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                        {notification.type === 'error' ? (
                            <IconXCircle className="w-4 h-4 text-red-500" />
                        ) : (
                            <IconCheckCircle className="w-4 h-4 text-emerald-600" />
                        )}
                        <span>{notification.message}</span>
                    </div>
                </div>
            )}

            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                        <IconAlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-800">HITL Review Queue</h2>
                        <p className="text-sm text-slate-500">Review AI evidence and fraud flags before approving certificates.</p>
                    </div>
                </div>

                <div className="relative mb-6 sm:w-80">
                    <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Search ID, Vehicle, or User..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2"
                    />
                </div>

                {loading ? (
                    <div className="py-20 text-center space-y-3">
                        <p className="text-xs font-semibold text-slate-500">Loading AI Workflows...</p>
                    </div>
                ) : error ? (
                    <div className="py-16 text-center text-red-600 text-xs space-y-2">
                        <IconAlertTriangle className="w-8 h-8 mx-auto text-red-500" />
                        <p className="font-semibold">{error}</p>
                    </div>
                ) : filteredWorkflows.length === 0 ? (
                    <div className="py-20 text-center space-y-3">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto text-emerald-500">
                            <IconCheckCircle className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">Inbox Zero!</p>
                        <p className="text-xs text-slate-500">No reports are currently waiting for human approval.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Workflow Info</th>
                                <th className="px-6 py-4">Requested By</th>
                                <th className="px-6 py-4">Vehicle</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredWorkflows.map((workflow) => (
                                <tr key={workflow.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono font-bold text-slate-900">
                                            {String(workflow.id).substring(0, 8)}...
                                        </div>
                                        <div className="text-slate-500 text-[10px] mt-0.5 flex items-center gap-1">
                                            <IconClock className="w-3 h-3 text-slate-400" />
                                            {new Date(workflow.createdAt).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {workflow.requesterAvatar ? (
                                                <img src={workflow.requesterAvatar} alt={workflow.requesterName} className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                                                    {(workflow.requesterName || 'UN').substring(0, 2)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-slate-800 text-[12px]">{workflow.requesterName || 'Unknown'}</div>
                                                <div className="text-slate-500 text-[10px]">{workflow.requesterEmail || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-[12px] text-slate-800">{workflow.vehicleReg || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                            <IconClock className="w-3 h-3" />
                                            Agent 4 Blocked
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleOpenReview(workflow)}
                                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1 ml-auto"
                                        >
                                            Review Evidence
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Comprehensive Review Modal */}
            {activeWorkflow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveWorkflow(null)} />
                    <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh]">

                        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-600">
                                <IconFileText className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Audit Evidence Review</h3>
                                <p className="text-xs font-mono text-slate-500">{activeWorkflow.id}</p>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
                            {detailsLoading ? (
                                <div className="py-12 text-center text-slate-500 text-sm font-semibold">
                                    Fetching AI audit logs and history...
                                </div>
                            ) : workflowDetails ? (
                                <>
                                    {workflowDetails.aiInsight && (
                                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                                            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Agent 4 Condition Insight</h4>
                                            <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                                                {workflowDetails.aiInsight}
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Agent 3 Detected Anomalies</h4>
                                        {workflowDetails.fraudFlags.length === 0 ? (
                                            <div className="p-3 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-semibold flex items-center gap-2">
                                                <IconCheckCircle className="w-4 h-4" /> No anomalies detected in the history.
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {workflowDetails.fraudFlags.map((flag, idx) => (
                                                    <div key={idx} className="p-3 bg-red-50 text-red-800 border border-red-200 rounded-xl text-xs flex gap-2">
                                                        <IconAlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                                        <div>
                                                            <span className="font-bold capitalize">{flag.type.replace('_', ' ')}:</span> {flag.detail}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Raw History Summary (Agent 2)</h4>
                                        <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                                            <pre className="text-[10px] text-emerald-400 font-mono">
                                                {JSON.stringify(workflowDetails.historySummary, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-red-500 text-sm">Failed to load details.</div>
                            )}
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-white rounded-b-2xl">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                Admin Audit Comment (Required)
                            </label>
                            <textarea
                                rows={2}
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                placeholder="State your reason for approval or rejection based on the evidence..."
                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition mb-4"
                            />

                            <div className="flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setActiveWorkflow(null)}
                                    disabled={actionLoading}
                                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleConfirmAction('reject')}
                                    disabled={actionLoading || !comment.trim() || detailsLoading}
                                    className="px-4 py-2 rounded-xl bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold text-xs transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <IconXCircle className="w-4 h-4" /> Reject Report
                                </button>
                                <button
                                    onClick={() => handleConfirmAction('approve')}
                                    disabled={actionLoading || detailsLoading}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <IconCheckCircle className="w-4 h-4" /> Approve Certificate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}