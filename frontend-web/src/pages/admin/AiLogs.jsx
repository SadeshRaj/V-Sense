import React, { useState, useEffect } from 'react';
import { getAllWorkflows, getWorkflowDetails } from '../../api/workflowApi';
import {
    IconClock,
    IconCheckCircle,
    IconXCircle,
    IconFileText,
    IconSearch,
    IconAlertTriangle
} from '../../components/Icons';

export default function AiLogs() {
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const [activeWorkflow, setActiveWorkflow] = useState(null);
    const [workflowDetails, setWorkflowDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    useEffect(() => {
        loadWorkflows();
    }, []);

    const loadWorkflows = async () => {
        try {
            const data = await getAllWorkflows();
            setWorkflows(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenReview = async (workflow) => {
        setActiveWorkflow(workflow);
        setWorkflowDetails(null);
        setDetailsLoading(true);

        try {
            const data = await getWorkflowDetails(workflow.id);
            setWorkflowDetails({
                ...data,
                fraudFlags: JSON.parse(data.fraudFlags || '[]'),
                historySummary: JSON.parse(data.historySummary || '{}')
            });
        } catch (err) {
            console.error(err);
            setActiveWorkflow(null);
        } finally {
            setDetailsLoading(false);
        }
    };

    const filteredWorkflows = workflows.filter(w =>
        (w?.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w?.vehicleReg || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w?.requesterName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (w?.requesterEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                        <IconFileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-extrabold text-slate-800">AI Execution Logs</h2>
                        <p className="text-sm text-slate-500">Complete audit trail of all generated, approved, and rejected certificates.</p>
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
                    <div className="py-20 text-center text-xs font-semibold text-slate-500">Loading AI Logs...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">Workflow Info</th>
                                <th className="px-6 py-4">Requested By</th>
                                <th className="px-6 py-4">Vehicle</th>
                                <th className="px-6 py-4">Status & Details</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                            {filteredWorkflows.map((workflow) => (
                                <tr key={workflow.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-mono font-bold text-slate-900">
                                            {workflow?.id?.toString()?.substring(0, 8) || 'Unknown'}...
                                        </div>
                                        <div className="text-slate-500 text-[10px] mt-0.5 flex items-center gap-1">
                                            <IconClock className="w-3 h-3 text-slate-400" />
                                            {workflow?.createdAt ? new Date(workflow.createdAt).toLocaleString() : 'Unknown date'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {workflow?.requesterAvatar ? (
                                                <img src={workflow.requesterAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                                                    {(workflow?.requesterName || 'UN').substring(0, 2)}
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-bold text-slate-800 text-[12px]">{workflow?.requesterName || 'Unknown'}</div>
                                                <div className="text-slate-500 text-[10px]">{workflow?.requesterEmail || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-[12px] text-slate-800">{workflow?.vehicleReg || 'N/A'}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1.5 items-start">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                                workflow.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                                                    workflow.status === 'rejected' || workflow.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                                            }`}>
                                                {workflow.status === 'completed' ? <IconCheckCircle className="w-3 h-3" /> :
                                                    workflow.status === 'rejected' || workflow.status === 'failed' ? <IconXCircle className="w-3 h-3" /> : <IconClock className="w-3 h-3" />}
                                                {workflow.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                            {workflow.rejectionReason && (
                                                <div className="text-[10px] text-red-600 font-medium max-w-[200px] truncate" title={workflow.rejectionReason}>
                                                    Reason: {workflow.rejectionReason}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleOpenReview(workflow)} className="text-blue-600 font-bold hover:underline">
                                            View Logs
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Read-Only Review Modal */}
            {activeWorkflow && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveWorkflow(null)} />
                    <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl z-10 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Historical AI Audit Log</h3>
                                <p className="text-xs font-mono text-slate-500">{activeWorkflow.id}</p>
                            </div>
                            <button onClick={() => setActiveWorkflow(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><IconXCircle className="w-5 h-5" /></button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
                            {/* Rejection Message Focus */}
                            {activeWorkflow.rejectionReason && (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-200 shadow-sm flex gap-3 items-start">
                                    <IconAlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-bold text-red-900 uppercase tracking-wider mb-1">Admin Rejection Reason</h4>
                                        <p className="text-sm text-red-700">{activeWorkflow.rejectionReason}</p>
                                    </div>
                                </div>
                            )}

                            {detailsLoading ? (
                                <div className="py-12 text-center text-slate-500 text-sm font-semibold">Fetching AI logs...</div>
                            ) : workflowDetails && (
                                <>
                                    {workflowDetails.aiInsight && (
                                        <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                                            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2">Agent 4 Output</h4>
                                            <div className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{workflowDetails.aiInsight}</div>
                                        </div>
                                    )}
                                    <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto">
                                        <h4 className="text-xs font-bold text-emerald-500 mb-2">Agent 3 Fraud Flags:</h4>
                                        <pre className="text-[10px] text-emerald-400 font-mono">{JSON.stringify(workflowDetails.fraudFlags, null, 2)}</pre>
                                        <h4 className="text-xs font-bold text-emerald-500 mt-4 mb-2">Agent 2 Raw History:</h4>
                                        <pre className="text-[10px] text-emerald-400 font-mono">{JSON.stringify(workflowDetails.historySummary, null, 2)}</pre>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}