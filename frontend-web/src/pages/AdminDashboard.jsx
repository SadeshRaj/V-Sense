import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/auth';
import { getPendingRegistrations, getAllRegistrations, approveGarage, rejectGarage } from '../api/adminApi';
import {
    IconShield,
    IconBuilding,
    IconClock,
    IconCheckCircle,
    IconXCircle,
    IconSearch,
    IconFileText,
    IconExternalLink,
    IconLogOut,
    IconPhone,
    IconMail,
    IconMapPin,
    IconRefresh,
    IconAlertTriangle,
    IconUser,
    IconWrench
} from '../components/Icons';

export default function AdminDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
    const [pendingList, setPendingList] = useState([]);
    const [allList, setAllList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Action modals
    const [selectedDocUrl, setSelectedDocUrl] = useState(null);
    const [rejectingItem, setRejectingItem] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser || currentUser.role !== 'Administrator') {
            navigate('/login');
            return;
        }
        setUser(currentUser);
        loadData();
    }, []);

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const loadData = async () => {
        setLoading(true);
        setError('');
        try {
            const [pending, all] = await Promise.all([
                getPendingRegistrations(),
                getAllRegistrations()
            ]);
            setPendingList(pending);
            setAllList(all);
        } catch (err) {
            setError(err.message || 'Failed to load partner registrations.');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (partner) => {
        if (!window.confirm(`Are you sure you want to approve "${partner.businessName}"? This will activate their account and send an approval notification email.`)) {
            return;
        }

        setActionLoading(true);
        try {
            await approveGarage(partner.id);
            showToast(`Approved ${partner.businessName}! Confirmation email dispatched.`);
            await loadData();
        } catch (err) {
            showToast(err.message || 'Failed to approve partner.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleOpenReject = (partner) => {
        setRejectingItem(partner);
        setRejectionReason('Business Registration document could not be verified.');
    };

    const handleConfirmReject = async () => {
        if (!rejectingItem) return;
        setActionLoading(true);
        try {
            await rejectGarage(rejectingItem.id, rejectionReason);
            showToast(`Rejected ${rejectingItem.businessName}. Rejection email sent with explanation.`);
            setRejectingItem(null);
            setRejectionReason('');
            await loadData();
        } catch (err) {
            showToast(err.message || 'Failed to reject partner.', 'error');
        } finally {
            setActionLoading(false);
        }
    };

    // Filter registrations by search
    const currentList = activeTab === 'pending' ? pendingList : allList;
    const filteredList = currentList.filter(item => {
        const q = searchQuery.toLowerCase();
        return (
            (item.businessName && item.businessName.toLowerCase().includes(q)) ||
            (item.registrationNumber && item.registrationNumber.toLowerCase().includes(q)) ||
            (item.email && item.email.toLowerCase().includes(q)) ||
            (item.fullName && item.fullName.toLowerCase().includes(q))
        );
    });

    const pendingCount = pendingList.length;
    const activeCount = allList.filter(p => p.approvalStatus === 'Active' || p.isActive).length;
    const totalCount = allList.length;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">

            {/* Top Navigation Bar */}
            <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-600/30">
                            V
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-lg tracking-tight">V-SENSE</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                                    Administration Portal
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">Partner Compliance & Approval Console</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                            <IconShield className="w-4 h-4 text-blue-400" />
                            <span className="text-xs text-slate-300 font-medium">{user?.fullName || 'Administrator'}</span>
                        </div>
                        <button
                            onClick={() => logout()}
                            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition flex items-center gap-1.5"
                        >
                            <IconLogOut className="w-3.5 h-3.5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Toast Notification */}
            {notification && (
                <div className="fixed top-20 right-6 z-50 animate-bounce">
                    <div className={`px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border ${
                        notification.type === 'error'
                            ? 'bg-red-900/90 border-red-700 text-red-100'
                            : 'bg-emerald-900/90 border-emerald-700 text-emerald-100'
                    }`}>
                        {notification.type === 'error' ? (
                            <IconXCircle className="w-4 h-4 text-red-400" />
                        ) : (
                            <IconCheckCircle className="w-4 h-4 text-emerald-400" />
                        )}
                        <span>{notification.message}</span>
                    </div>
                </div>
            )}

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Pending Approvals Card */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Pending Approvals
                                </p>
                                <h3 className="text-3xl font-extrabold text-amber-400 mt-1">
                                    {pendingCount}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                                <IconClock className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">Awaiting document verification</p>
                    </div>

                    {/* Active Partners Card */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Active Partners
                                </p>
                                <h3 className="text-3xl font-extrabold text-emerald-400 mt-1">
                                    {activeCount}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                <IconCheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">Authorized garages & centers</p>
                    </div>

                    {/* Total Applications Card */}
                    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                                    Total Registered
                                </p>
                                <h3 className="text-3xl font-extrabold text-blue-400 mt-1">
                                    {totalCount}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                                <IconBuilding className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">Lifetime partner onboardings</p>
                    </div>
                </div>

                {/* Management Table Section */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">

                    {/* Tab Navigation & Search Bar */}
                    <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-2 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60 w-fit">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                                    activeTab === 'pending'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <IconClock className="w-3.5 h-3.5" />
                                Pending Review ({pendingCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-2 ${
                                    activeTab === 'all'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <IconBuilding className="w-3.5 h-3.5" />
                                All Partners ({totalCount})
                            </button>
                        </div>

                        {/* Search & Refresh */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-grow sm:w-64">
                                <IconSearch className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search partner or BR..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition"
                                />
                            </div>

                            <button
                                onClick={loadData}
                                disabled={loading}
                                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                                title="Refresh data"
                            >
                                <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Table / List View */}
                    {loading ? (
                        <div className="py-20 text-center space-y-3">
                            <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="text-xs text-slate-400">Loading registrations...</p>
                        </div>
                    ) : error ? (
                        <div className="py-16 text-center text-red-400 text-xs space-y-2">
                            <IconAlertTriangle className="w-8 h-8 mx-auto text-red-500" />
                            <p>{error}</p>
                            <button onClick={loadData} className="text-blue-400 underline pt-1">Try again</button>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="py-20 text-center space-y-3">
                            <div className="w-12 h-12 bg-slate-800/80 rounded-xl flex items-center justify-center mx-auto text-slate-500">
                                <IconFileText className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-semibold text-slate-300">
                                {activeTab === 'pending' ? 'No pending applications' : 'No registrations found'}
                            </p>
                            <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                {activeTab === 'pending'
                                    ? 'All partner registration requests have been reviewed and processed.'
                                    : 'No partners matched your search query.'}
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-800/40 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                                    <tr>
                                        <th className="px-6 py-3.5 font-semibold">Business Info</th>
                                        <th className="px-6 py-3.5 font-semibold">Contact Person</th>
                                        <th className="px-6 py-3.5 font-semibold">Role</th>
                                        <th className="px-6 py-3.5 font-semibold">BR Document</th>
                                        <th className="px-6 py-3.5 font-semibold">Status</th>
                                        <th className="px-6 py-3.5 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                    {filteredList.map((partner) => {
                                        const isPending = partner.approvalStatus === 'Pending';
                                        const isApproved = partner.approvalStatus === 'Active' || partner.isActive;
                                        const isRejected = partner.approvalStatus === 'Rejected';

                                        return (
                                            <tr key={partner.id} className="hover:bg-slate-800/30 transition">
                                                {/* Business Info */}
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-white text-sm">
                                                        {partner.businessName || 'N/A'}
                                                    </div>
                                                    <div className="text-slate-400 text-[11px] mt-0.5">
                                                        BR: <span className="font-mono text-slate-300">{partner.registrationNumber || 'N/A'}</span>
                                                    </div>
                                                    {partner.address && (
                                                        <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-1">
                                                            <IconMapPin className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate max-w-xs">{partner.address}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Contact Person */}
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-200">
                                                        {partner.fullName}
                                                    </div>
                                                    <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                                                        <IconMail className="w-3 h-3 text-slate-500" />
                                                        <span>{partner.email}</span>
                                                    </div>
                                                    {partner.phone && (
                                                        <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                                                            <IconPhone className="w-3 h-3 text-slate-500" />
                                                            <span>{partner.phone}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Role */}
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                                                        {partner.role === 'ServiceCenter' ? (
                                                            <>
                                                                <IconBuilding className="w-3 h-3 text-blue-400" />
                                                                Service Center
                                                            </>
                                                        ) : (
                                                            <>
                                                                <IconWrench className="w-3 h-3 text-emerald-400" />
                                                                Garage
                                                            </>
                                                        )}
                                                    </span>
                                                </td>

                                                {/* BR Document */}
                                                <td className="px-6 py-4">
                                                    {partner.brDocumentUrl ? (
                                                        <button
                                                            onClick={() => setSelectedDocUrl(partner.brDocumentUrl)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30 transition"
                                                        >
                                                            <IconFileText className="w-3.5 h-3.5" />
                                                            Inspect BR
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-500 italic text-[11px]">No file</span>
                                                    )}
                                                </td>

                                                {/* Status Badge */}
                                                <td className="px-6 py-4">
                                                    {isPending && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                                            <IconClock className="w-3 h-3" />
                                                            Pending
                                                        </span>
                                                    )}
                                                    {isApproved && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                            <IconCheckCircle className="w-3 h-3" />
                                                            Approved
                                                        </span>
                                                    )}
                                                    {isRejected && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                                                            <IconXCircle className="w-3 h-3" />
                                                            Rejected
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Action Buttons */}
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {isPending && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApprove(partner)}
                                                                    disabled={actionLoading}
                                                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-600/20 flex items-center gap-1"
                                                                >
                                                                    <IconCheckCircle className="w-3.5 h-3.5" />
                                                                    Approve
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenReject(partner)}
                                                                    disabled={actionLoading}
                                                                    className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold text-xs transition flex items-center gap-1"
                                                                >
                                                                    <IconXCircle className="w-3.5 h-3.5" />
                                                                    Reject
                                                                </button>
                                                            </>
                                                        )}
                                                        {isApproved && (
                                                            <span className="text-xs text-emerald-400 font-medium">
                                                                Active Partner
                                                            </span>
                                                        )}
                                                        {isRejected && (
                                                            <span className="text-xs text-slate-500 italic">
                                                                Closed
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* BR Document Inspector Modal */}
            {selectedDocUrl && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        onClick={() => setSelectedDocUrl(null)}
                    />
                    <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                            <div className="flex items-center gap-2">
                                <IconFileText className="w-5 h-5 text-blue-400" />
                                <h3 className="text-base font-bold text-white">Business Registration Certificate</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={selectedDocUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                                >
                                    <IconExternalLink className="w-3.5 h-3.5" />
                                    Open in New Tab
                                </a>
                                <button
                                    onClick={() => setSelectedDocUrl(null)}
                                    className="text-slate-400 hover:text-white p-1 rounded-lg"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Document Viewer Frame */}
                        <div className="bg-slate-950 rounded-xl overflow-hidden h-96 flex items-center justify-center border border-slate-800">
                            {selectedDocUrl.toLowerCase().endsWith('.pdf') ? (
                                <iframe
                                    src={selectedDocUrl}
                                    title="BR Document"
                                    className="w-full h-full"
                                />
                            ) : (
                                <img
                                    src={selectedDocUrl}
                                    alt="BR Certificate"
                                    className="max-h-full max-w-full object-contain p-2"
                                />
                            )}
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => setSelectedDocUrl(null)}
                                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                            >
                                Close Inspector
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectingItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                        onClick={() => setRejectingItem(null)}
                    />
                    <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
                        <div className="flex items-center gap-3 text-red-400">
                            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                                <IconXCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Reject Partner Application</h3>
                                <p className="text-xs text-slate-400">{rejectingItem.businessName}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-300">
                            Please specify the reason for rejection. This explanation will be included in the automated rejection email sent to <strong className="text-blue-400">{rejectingItem.email}</strong>.
                        </p>

                        <div>
                            <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">
                                Rejection Reason
                            </label>
                            <textarea
                                rows={3}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="State why the application is rejected..."
                                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-red-500 transition"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setRejectingItem(null)}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmReject}
                                disabled={actionLoading || !rejectionReason.trim()}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {actionLoading ? 'Processing...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
