import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../api/auth';
import { getPendingRegistrations, getAllRegistrations, approveGarage, rejectGarage } from '../../api/adminApi';
import {
    IconBuilding,
    IconClock,
    IconCheckCircle,
    IconXCircle,
    IconSearch,
    IconFileText,
    IconExternalLink,
    IconPhone,
    IconMail,
    IconMapPin,
    IconRefresh,
    IconAlertTriangle,
    IconWrench
} from '../../components/Icons';

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
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">

            {/* Toast Notification */}
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

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {/* Pending Approvals Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Pending Approvals
                                </p>
                                <h3 className="text-3xl font-extrabold text-amber-500 mt-1">
                                    {pendingCount}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                                <IconClock className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 font-medium">Awaiting document verification</p>
                    </div>

                    {/* Active Partners Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Active Partners
                                </p>
                                <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">
                                    {activeCount}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                                <IconCheckCircle className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 font-medium">Authorized garages & centers</p>
                    </div>

                    {/* Total Applications Card */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    Total Registered
                                </p>
                                <h3 className="text-3xl font-extrabold text-blue-600 mt-1">
                                    {totalCount}
                                </h3>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                                <IconBuilding className="w-6 h-6" />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-3 font-medium">Lifetime partner onboardings</p>
                    </div>
                </div>

                {/* Management Table Section */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">

                    {/* Tab Navigation & Search Bar */}
                    <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">
                        {/* Tab Switcher */}
                        <div className="flex items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setActiveTab('pending')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                    activeTab === 'pending'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <IconClock className="w-3.5 h-3.5" />
                                Pending Review ({pendingCount})
                            </button>
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
                                    activeTab === 'all'
                                        ? 'bg-white text-blue-600 shadow-sm'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <IconBuilding className="w-3.5 h-3.5" />
                                All Partners ({totalCount})
                            </button>
                        </div>

                        {/* Search & Refresh */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex-grow sm:w-64">
                                <IconSearch className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Search partner or BR..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                                />
                            </div>

                            <button
                                onClick={loadData}
                                disabled={loading}
                                className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-sm"
                                title="Refresh data"
                            >
                                <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Table / List View */}
                    {loading ? (
                        <div className="py-20 text-center space-y-3">
                            <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <p className="text-xs font-semibold text-slate-500">Loading registrations...</p>
                        </div>
                    ) : error ? (
                        <div className="py-16 text-center text-red-600 text-xs space-y-2">
                            <IconAlertTriangle className="w-8 h-8 mx-auto text-red-500" />
                            <p className="font-semibold">{error}</p>
                            <button onClick={loadData} className="text-blue-600 hover:underline font-semibold pt-1">Try again</button>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="py-20 text-center space-y-3">
                            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                                <IconFileText className="w-6 h-6" />
                            </div>
                            <p className="text-sm font-bold text-slate-700">
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
                                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Business Info</th>
                                    <th className="px-6 py-4">Contact Person</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">BR Document</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                {filteredList.map((partner) => {
                                    const isPending = partner.approvalStatus === 'Pending';
                                    const isApproved = partner.approvalStatus === 'Active' || partner.isActive;
                                    const isRejected = partner.approvalStatus === 'Rejected';

                                    return (
                                        <tr key={partner.id} className="hover:bg-slate-50/80 transition-colors">
                                            {/* Business Info */}
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-slate-900 text-sm">
                                                    {partner.businessName || 'N/A'}
                                                </div>
                                                <div className="text-slate-500 text-[11px] mt-0.5">
                                                    BR: <span className="font-mono font-semibold text-slate-700">{partner.registrationNumber || 'N/A'}</span>
                                                </div>
                                                {partner.address && (
                                                    <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-1">
                                                        <IconMapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                                                        <span className="truncate max-w-xs">{partner.address}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Contact Person */}
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-slate-800">
                                                    {partner.fullName}
                                                </div>
                                                <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                                    <IconMail className="w-3 h-3 text-slate-400" />
                                                    <span>{partner.email}</span>
                                                </div>
                                                {partner.phone && (
                                                    <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                                                        <IconPhone className="w-3 h-3 text-slate-400" />
                                                        <span>{partner.phone}</span>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Role */}
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                                    {partner.role === 'ServiceCenter' ? (
                                                        <>
                                                            <IconBuilding className="w-3 h-3 text-blue-600" />
                                                            Service Center
                                                        </>
                                                    ) : (
                                                        <>
                                                            <IconWrench className="w-3 h-3 text-emerald-600" />
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
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition shadow-xs"
                                                    >
                                                        <IconFileText className="w-3.5 h-3.5" />
                                                        Inspect BR
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[11px]">No file</span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="px-6 py-4">
                                                {isPending && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                        <IconClock className="w-3 h-3" />
                                                        Pending
                                                    </span>
                                                )}
                                                {isApproved && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <IconCheckCircle className="w-3 h-3" />
                                                        Approved
                                                    </span>
                                                )}
                                                {isRejected && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
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
                                                                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition shadow-sm flex items-center gap-1"
                                                            >
                                                                <IconCheckCircle className="w-3.5 h-3.5" />
                                                                Approve
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenReject(partner)}
                                                                disabled={actionLoading}
                                                                className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold text-xs transition flex items-center gap-1 shadow-xs"
                                                            >
                                                                <IconXCircle className="w-3.5 h-3.5" />
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {isApproved && (
                                                        <span className="text-xs text-emerald-700 font-semibold">
                                                            Active Partner
                                                        </span>
                                                    )}
                                                    {isRejected && (
                                                        <span className="text-xs text-slate-400 italic font-medium">
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
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setSelectedDocUrl(null)}
                    />
                    <div className="relative w-full max-w-3xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                            <div className="flex items-center gap-2">
                                <IconFileText className="w-5 h-5 text-blue-600" />
                                <h3 className="text-base font-bold text-slate-900">Business Registration Certificate</h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <a
                                    href={selectedDocUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
                                >
                                    <IconExternalLink className="w-3.5 h-3.5" />
                                    Open in New Tab
                                </a>
                                <button
                                    onClick={() => setSelectedDocUrl(null)}
                                    className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Document Viewer Frame */}
                        <div className="bg-slate-50 rounded-xl overflow-hidden h-96 flex items-center justify-center border border-slate-200">
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
                                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
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
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setRejectingItem(null)}
                    />
                    <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
                        <div className="flex items-center gap-3 text-red-600">
                            <div className="p-2.5 rounded-xl bg-red-50 border border-red-100">
                                <IconXCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">Reject Partner Application</h3>
                                <p className="text-xs font-medium text-slate-500">{rejectingItem.businessName}</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">
                            Please specify the reason for rejection. This explanation will be included in the automated rejection email sent to <strong className="text-slate-800">{rejectingItem.email}</strong>.
                        </p>

                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">
                                Rejection Reason
                            </label>
                            <textarea
                                rows={3}
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="State why the application is rejected..."
                                className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                onClick={() => setRejectingItem(null)}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmReject}
                                disabled={actionLoading || !rejectionReason.trim()}
                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition shadow-sm disabled:opacity-50 flex items-center gap-1.5"
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