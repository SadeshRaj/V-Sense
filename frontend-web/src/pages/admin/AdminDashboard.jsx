import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';

import { getCurrentUser } from '../../api/auth';

import {

    getPendingRegistrations,

    getAllRegistrations,

    getAssignedVehicles,

    approveGarage,

    rejectGarage,

    deleteGarage

} from '../../api/adminApi';

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



    // Partner Management States

    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'

    const [pendingList, setPendingList] = useState([]);

    const [allList, setAllList] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');

    const [partnerSearchQuery, setPartnerSearchQuery] = useState('');

    const [selectedPartner, setSelectedPartner] = useState(null);



    // Assigned Vehicles States

    const [assignedVehicles, setAssignedVehicles] = useState([]);

    const [vehiclesLoading, setVehiclesLoading] = useState(false);

    const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');

    const [selectedVehicle, setSelectedVehicle] = useState(null);



    // Action Modals & Notifications

    const [selectedDocUrl, setSelectedDocUrl] = useState(null);

    const [rejectingItem, setRejectingItem] = useState(null);

    const [rejectionReason, setRejectionReason] = useState('');

    const [actionLoading, setActionLoading] = useState(false);

    const [notification, setNotification] = useState(null);



    useEffect(() => {

        const currentUser = getCurrentUser();

        if (!currentUser || (currentUser.role !== 'Administrator' && currentUser.role !== 'Admin')) {

            navigate('/login');

            return;

        }

        setUser(currentUser);

        loadAllDashboardData();

    }, []);



    const showToast = (message, type = 'success') => {

        setNotification({ message, type });

        setTimeout(() => setNotification(null), 4000);

    };



    const loadAllDashboardData = async () => {

        setLoading(true);

        setError('');

        try {

            await Promise.all([

                loadPartnerData(),

                fetchAssignedVehicles()

            ]);

        } catch (err) {

            setError(err.message || 'Failed to load dashboard data.');

        } finally {

            setLoading(false);

        }

    };



    const loadPartnerData = async () => {

        const [pending, all] = await Promise.all([

            getPendingRegistrations(),

            getAllRegistrations()

        ]);

        setPendingList(pending || []);

        setAllList(all || []);

    };



    const fetchAssignedVehicles = async () => {

        setVehiclesLoading(true);

        try {

            const data = await getAssignedVehicles();

            setAssignedVehicles(data || []);

        } catch (err) {

            console.error('Error fetching assigned vehicles:', err);

            setAssignedVehicles([]);

        } finally {

            setVehiclesLoading(false);

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

            setSelectedPartner(null);

            await loadPartnerData();

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

            setSelectedPartner(null);

            setRejectionReason('');

            await loadPartnerData();

        } catch (err) {

            showToast(err.message || 'Failed to reject partner.', 'error');

        } finally {

            setActionLoading(false);

        }

    };



    const handleDeletePartner = async (partner) => {

        if (!window.confirm(`Are you sure you want to permanently delete "${partner.businessName || partner.fullName}"? This action cannot be undone.`)) {

            return;

        }



        setActionLoading(true);

        try {

            await deleteGarage(partner.id);

            showToast(`Deleted partner '${partner.businessName || partner.fullName}' successfully.`);

            setSelectedPartner(null);

            await loadPartnerData();

        } catch (err) {

            showToast(err.message || 'Failed to delete partner.', 'error');

        } finally {

            setActionLoading(false);

        }

    };



    // Filter Partner Registrations

    const currentPartnerList = activeTab === 'pending' ? pendingList : allList;

    const filteredPartners = currentPartnerList.filter(item => {

        const q = partnerSearchQuery.toLowerCase();

        return (

            (item.businessName && item.businessName.toLowerCase().includes(q)) ||

            (item.registrationNumber && item.registrationNumber.toLowerCase().includes(q)) ||

            (item.email && item.email.toLowerCase().includes(q)) ||

            (item.fullName && item.fullName.toLowerCase().includes(q))

        );

    });



    // Filter Assigned Vehicles

    const filteredVehicles = assignedVehicles.filter(v => {

        const q = vehicleSearchQuery.toLowerCase();

        return (

            (v.registrationNumber && v.registrationNumber.toLowerCase().includes(q)) ||

            (v.vin && v.vin.toLowerCase().includes(q)) ||

            (v.make && v.make.toLowerCase().includes(q)) ||

            (v.model && v.model.toLowerCase().includes(q)) ||

            (v.ownerName && v.ownerName.toLowerCase().includes(q)) ||

            (v.ownerEmail && v.ownerEmail.toLowerCase().includes(q))

        );

    });



    const pendingCount = pendingList.length;

    const activeCount = allList.filter(p => p.approvalStatus === 'Active' || p.isActive).length;

    const totalPartnerCount = allList.length;



    return (

        <div className="min-h-screen bg-slate-50/50 text-slate-800 font-sans flex flex-col antialiased">



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



            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">



                {/* Top Metrics Overview */}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">

                                    Pending Partner Reviews

                                </p>

                                <h3 className="text-2xl font-extrabold text-amber-500 mt-1">

                                    {pendingCount}

                                </h3>

                            </div>

                            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">

                                <IconClock className="w-5 h-5" />

                            </div>

                        </div>

                        <p className="text-[11px] text-slate-500 mt-2 font-medium">Awaiting BR document check</p>

                    </div>



                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">

                                    Active Network Partners

                                </p>

                                <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">

                                    {activeCount}

                                </h3>

                            </div>

                            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">

                                <IconCheckCircle className="w-5 h-5" />

                            </div>

                        </div>

                        <p className="text-[11px] text-slate-500 mt-2 font-medium">Authorized garages & centers</p>

                    </div>



                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">

                                    Total Onboardings

                                </p>

                                <h3 className="text-2xl font-extrabold text-blue-600 mt-1">

                                    {totalPartnerCount}

                                </h3>

                            </div>

                            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">

                                <IconBuilding className="w-5 h-5" />

                            </div>

                        </div>

                        <p className="text-[11px] text-slate-500 mt-2 font-medium">Lifetime network signups</p>

                    </div>



                    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all">

                        <div className="flex items-center justify-between">

                            <div>

                                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">

                                    Assigned Vehicles

                                </p>

                                <h3 className="text-2xl font-extrabold text-indigo-600 mt-1">

                                    {assignedVehicles.length}

                                </h3>

                            </div>

                            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center">

                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />

                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z" />

                                </svg>

                            </div>

                        </div>

                        <p className="text-[11px] text-slate-500 mt-2 font-medium">Post-payment user links</p>

                    </div>

                </div>



                {/* ─────────────────────────────────────────────────────────────

                    SECTION 1: PARTNER REGISTRATIONS MANAGEMENT

                   ───────────────────────────────────────────────────────────── */}

                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">

                    <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-50/50">

                        <div>

                            <h2 className="text-base font-bold text-slate-900">Partner Registration Requests</h2>

                            <p className="text-xs text-slate-500 mt-0.5">Manage and inspect official garage & service center onboarding applications</p>

                        </div>



                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl">

                                <button

                                    onClick={() => setActiveTab('pending')}

                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${

                                        activeTab === 'pending'

                                            ? 'bg-white text-blue-600 shadow-xs'

                                            : 'text-slate-600 hover:text-slate-900'

                                    }`}

                                >

                                    <IconClock className="w-3.5 h-3.5" />

                                    Pending Review ({pendingCount})

                                </button>

                                <button

                                    onClick={() => setActiveTab('all')}

                                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${

                                        activeTab === 'all'

                                            ? 'bg-white text-blue-600 shadow-xs'

                                            : 'text-slate-600 hover:text-slate-900'

                                    }`}

                                >

                                    <IconBuilding className="w-3.5 h-3.5" />

                                    All Partners ({totalPartnerCount})

                                </button>

                            </div>



                            <div className="flex items-center gap-2">

                                <div className="relative flex-grow sm:w-56">

                                    <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

                                    <input

                                        type="text"

                                        placeholder="Search partner or BR..."

                                        value={partnerSearchQuery}

                                        onChange={(e) => setPartnerSearchQuery(e.target.value)}

                                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"

                                    />

                                </div>



                                <button

                                    onClick={loadAllDashboardData}

                                    disabled={loading}

                                    className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-xs"

                                    title="Refresh data"

                                >

                                    <IconRefresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />

                                </button>

                            </div>

                        </div>

                    </div>



                    {/* Partners Table */}

                    {loading ? (

                        <div className="py-16 text-center space-y-3">

                            <svg className="animate-spin h-7 w-7 text-blue-600 mx-auto" viewBox="0 0 24 24">

                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />

                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />

                            </svg>

                            <p className="text-xs font-semibold text-slate-500">Loading registrations...</p>

                        </div>

                    ) : error ? (

                        <div className="py-12 text-center text-red-600 text-xs space-y-2">

                            <IconAlertTriangle className="w-7 h-7 mx-auto text-red-500" />

                            <p className="font-semibold">{error}</p>

                            <button onClick={loadAllDashboardData} className="text-blue-600 hover:underline font-semibold pt-1">Try again</button>

                        </div>

                    ) : filteredPartners.length === 0 ? (

                        <div className="py-16 text-center space-y-2">

                            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">

                                <IconFileText className="w-5 h-5" />

                            </div>

                            <p className="text-xs font-bold text-slate-700">

                                {activeTab === 'pending' ? 'No pending applications' : 'No partners found'}

                            </p>

                            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">

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

                                    <th className="px-6 py-3.5">Business Info</th>

                                    <th className="px-6 py-3.5">Contact Person</th>

                                    <th className="px-6 py-3.5">Role</th>

                                    <th className="px-6 py-3.5">BR Document</th>

                                    <th className="px-6 py-3.5">Status</th>

                                    <th className="px-6 py-3.5 text-right">Actions</th>

                                </tr>

                                </thead>

                                <tbody className="divide-y divide-slate-100 text-slate-700">

                                {filteredPartners.map((partner) => {

                                    const isPending = partner.approvalStatus === 'Pending';

                                    const isApproved = partner.approvalStatus === 'Active' || partner.isActive;

                                    const isRejected = partner.approvalStatus === 'Rejected';



                                    return (

                                        <tr

                                            key={partner.id}

                                            onClick={() => setSelectedPartner(partner)}

                                            className="hover:bg-blue-50/40 transition-colors cursor-pointer"

                                        >

                                            <td className="px-6 py-3.5">

                                                <div className="font-bold text-slate-900 text-xs sm:text-sm">

                                                    {partner.businessName || 'N/A'}

                                                </div>

                                                <div className="text-slate-500 text-[11px] mt-0.5">

                                                    BR: <span className="font-mono font-semibold text-slate-700">{partner.registrationNumber || 'N/A'}</span>

                                                </div>

                                                {partner.address && (

                                                    <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">

                                                        <IconMapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />

                                                        <span className="truncate max-w-xs">{partner.address}</span>

                                                    </div>

                                                )}

                                            </td>



                                            <td className="px-6 py-3.5">

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



                                            <td className="px-6 py-3.5">

                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">

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



                                            <td className="px-6 py-3.5" onClick={(e) => e.stopPropagation()}>

                                                {partner.brDocumentUrl ? (

                                                    <button

                                                        onClick={() => setSelectedDocUrl(partner.brDocumentUrl)}

                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold border border-blue-200 transition"

                                                    >

                                                        <IconFileText className="w-3.5 h-3.5" />

                                                        Inspect BR

                                                    </button>

                                                ) : (

                                                    <span className="text-slate-400 italic text-[11px]">No file</span>

                                                )}

                                            </td>



                                            <td className="px-6 py-3.5">

                                                {isPending && (

                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">

                                                        <IconClock className="w-3 h-3" />

                                                        Pending

                                                    </span>

                                                )}

                                                {isApproved && (

                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">

                                                        <IconCheckCircle className="w-3 h-3" />

                                                        Approved

                                                    </span>

                                                )}

                                                {isRejected && (

                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">

                                                        <IconXCircle className="w-3 h-3" />

                                                        Rejected

                                                    </span>

                                                )}

                                            </td>



                                            <td className="px-6 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>

                                                <button

                                                    onClick={() => setSelectedPartner(partner)}

                                                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition border border-slate-200"

                                                >

                                                    View Details

                                                </button>

                                            </td>

                                        </tr>

                                    );

                                })}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>



                {/* ─────────────────────────────────────────────────────────────

                    SECTION 2: ASSIGNED VEHICLES DIRECTORY

                   ───────────────────────────────────────────────────────────── */}

                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">

                    <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">

                        <div>

                            <h2 className="text-base font-bold text-slate-900">User Assigned Vehicles</h2>

                            <p className="text-xs text-slate-500 mt-0.5">Vehicles successfully registered and assigned to customer profiles post-payment</p>

                        </div>



                        <div className="flex items-center gap-3">

                            <div className="relative flex-grow sm:w-72">

                                <IconSearch className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />

                                <input

                                    type="text"

                                    placeholder="Search by Reg No, VIN, Make or Owner..."

                                    value={vehicleSearchQuery}

                                    onChange={(e) => setVehicleSearchQuery(e.target.value)}

                                    className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 transition"

                                />

                            </div>



                            <button

                                onClick={fetchAssignedVehicles}

                                disabled={vehiclesLoading}

                                className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 transition shadow-xs"

                                title="Refresh vehicles list"

                            >

                                <IconRefresh className={`w-3.5 h-3.5 ${vehiclesLoading ? 'animate-spin text-blue-600' : ''}`} />

                            </button>

                        </div>

                    </div>



                    {vehiclesLoading ? (

                        <div className="py-16 text-center space-y-3">

                            <svg className="animate-spin h-7 w-7 text-blue-600 mx-auto" viewBox="0 0 24 24">

                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />

                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />

                            </svg>

                            <p className="text-xs font-semibold text-slate-500">Fetching assigned vehicles...</p>

                        </div>

                    ) : filteredVehicles.length === 0 ? (

                        <div className="py-16 text-center space-y-2">

                            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">

                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />

                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 100-4 2 2 0 000 4zm10 0a2 2 0 100-4 2 2 0 000 4z" />

                                </svg>

                            </div>

                            <p className="text-xs font-bold text-slate-700">No assigned vehicles found</p>

                            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">

                                No vehicle records matched your search filter or no paid assignments are available yet.

                            </p>

                        </div>

                    ) : (

                        <div className="overflow-x-auto">

                            <table className="w-full text-left text-xs">

                                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold border-b border-slate-200">

                                <tr>

                                    <th className="px-6 py-3.5">Vehicle Details</th>

                                    <th className="px-6 py-3.5">Assigned Customer</th>

                                    <th className="px-6 py-3.5">Payment Verification</th>

                                    <th className="px-6 py-3.5">Assigned Date</th>

                                    <th className="px-6 py-3.5 text-right">Action</th>

                                </tr>

                                </thead>

                                <tbody className="divide-y divide-slate-100 text-slate-700">

                                {filteredVehicles.map((vehicle) => (

                                    <tr key={vehicle.id} className="hover:bg-slate-50/80 transition-colors">

                                        <td className="px-6 py-3.5">

                                            <div className="font-bold text-slate-900 text-xs sm:text-sm">

                                                {vehicle.make} {vehicle.model} ({vehicle.manufacturingYear || 'N/A'})

                                            </div>

                                            <div className="text-slate-500 text-[11px] mt-0.5">

                                                Reg No: <span className="font-mono font-bold text-blue-600">{vehicle.registrationNumber}</span>

                                            </div>

                                            <div className="text-slate-400 text-[10px] font-mono mt-0.5">

                                                VIN: {vehicle.vin || 'N/A'}

                                            </div>

                                        </td>



                                        <td className="px-6 py-3.5">

                                            <div className="font-semibold text-slate-800">

                                                {vehicle.ownerName || 'Registered User'}

                                            </div>

                                            <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">

                                                <IconMail className="w-3 h-3 text-slate-400" />

                                                <span>{vehicle.ownerEmail || 'N/A'}</span>

                                            </div>

                                            {vehicle.ownerPhone && (

                                                <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">

                                                    <IconPhone className="w-3 h-3 text-slate-400" />

                                                    <span>{vehicle.ownerPhone}</span>

                                                </div>

                                            )}

                                        </td>



                                        <td className="px-6 py-3.5">

                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">

                                                <IconCheckCircle className="w-3 h-3" />

                                                Verified Paid

                                            </span>

                                            {vehicle.transactionId && (

                                                <div className="text-slate-400 font-mono text-[10px] mt-1">

                                                    Txn: {vehicle.transactionId}

                                                </div>

                                            )}

                                        </td>



                                        <td className="px-6 py-3.5 text-slate-600 font-medium">

                                            <div className="flex items-center gap-1">

                                                <IconClock className="w-3.5 h-3.5 text-slate-400" />

                                                <span>{new Date(vehicle.assignedAt || vehicle.createdAt || Date.now()).toLocaleDateString()}</span>

                                            </div>

                                        </td>



                                        <td className="px-6 py-3.5 text-right">

                                            <button

                                                onClick={() => setSelectedVehicle(vehicle)}

                                                className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition border border-blue-200"

                                            >

                                                Inspect Record

                                            </button>

                                        </td>

                                    </tr>

                                ))}

                                </tbody>

                            </table>

                        </div>

                    )}

                </div>

            </main>



            {/* ─────────────────────────────────────────────────────────────

                MODAL 1: GARAGE / PARTNER FULL DETAILS MODAL WITH DELETE

               ───────────────────────────────────────────────────────────── */}

            {selectedPartner && (

                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

                    <div

                        className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"

                        onClick={() => setSelectedPartner(null)}

                    />

                    <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl z-10 space-y-5">



                        {/* Header */}

                        <div className="flex items-start justify-between pb-3 border-b border-slate-100">

                            <div>

                                <div className="flex items-center gap-2">

                                    <h3 className="text-lg font-bold text-slate-900">

                                        {selectedPartner.businessName || 'Garage / Partner Profile'}

                                    </h3>

                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">

                                        {selectedPartner.role === 'ServiceCenter' ? 'Service Center' : 'Garage'}

                                    </span>

                                </div>

                                <p className="text-xs text-slate-500 mt-0.5">

                                    BR Reg: <span className="font-mono font-semibold text-slate-700">{selectedPartner.registrationNumber || 'N/A'}</span>

                                </p>

                            </div>

                            <button

                                onClick={() => setSelectedPartner(null)}

                                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg text-sm font-bold"

                            >

                                ✕

                            </button>

                        </div>



                        {/* Details Grid */}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">

                            {/* Contact Info Card */}

                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">

                                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">Contact Person</p>

                                <p className="font-semibold text-slate-800">{selectedPartner.fullName || 'N/A'}</p>

                                <div className="flex items-center gap-1.5 text-slate-600">

                                    <IconMail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />

                                    <span className="truncate">{selectedPartner.email || 'N/A'}</span>

                                </div>

                                <div className="flex items-center gap-1.5 text-slate-600">

                                    <IconPhone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />

                                    <span>{selectedPartner.phone || 'N/A'}</span>

                                </div>

                            </div>



                            {/* Status & Dates Card */}

                            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">

                                <p className="font-bold text-slate-900 text-xs uppercase tracking-wider">Account Status</p>

                                <div>

                                    {selectedPartner.approvalStatus === 'Pending' && (

                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">

                                            <IconClock className="w-3 h-3" /> Pending Review

                                        </span>

                                    )}

                                    {(selectedPartner.approvalStatus === 'Active' || selectedPartner.isActive) && (

                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">

                                            <IconCheckCircle className="w-3 h-3" /> Active Partner

                                        </span>

                                    )}

                                    {selectedPartner.approvalStatus === 'Rejected' && (

                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">

                                            <IconXCircle className="w-3 h-3" /> Rejected

                                        </span>

                                    )}

                                </div>

                                <p className="text-[11px] text-slate-500 pt-1">

                                    Registered: {new Date(selectedPartner.createdAt).toLocaleDateString()}

                                </p>

                            </div>



                            {/* Location & Coordinates Card */}

                            <div className="sm:col-span-2 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">

                                <div className="flex items-center justify-between">

                                    <p className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1">

                                        <IconMapPin className="w-3.5 h-3.5 text-blue-600" />

                                        Physical Address & GPS Location

                                    </p>

                                    {(selectedPartner.latitude || selectedPartner.Latitude) && (selectedPartner.longitude || selectedPartner.Longitude) && (

                                        <a

                                            href={`https://www.google.com/maps?q=${selectedPartner.latitude || selectedPartner.Latitude},${selectedPartner.longitude || selectedPartner.Longitude}`}

                                            target="_blank"

                                            rel="noreferrer"

                                            className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"

                                        >

                                            <IconExternalLink className="w-3 h-3" />

                                            Open Google Maps

                                        </a>

                                    )}

                                </div>

                                <p className="text-slate-700 font-medium">{selectedPartner.address || 'Address not specified'}</p>

                                {(selectedPartner.latitude || selectedPartner.Latitude) && (selectedPartner.longitude || selectedPartner.Longitude) ? (

                                    <p className="text-[11px] text-slate-500 font-mono">

                                        Latitude: <span className="font-bold text-slate-800">{selectedPartner.latitude || selectedPartner.Latitude}</span> | Longitude: <span className="font-bold text-slate-800">{selectedPartner.longitude || selectedPartner.Longitude}</span>

                                    </p>

                                ) : (

                                    <p className="text-[11px] text-slate-400 italic">No GPS coordinates recorded</p>

                                )}

                            </div>



                            {/* BR Document Inspector Link */}

                            {selectedPartner.brDocumentUrl && (

                                <div className="sm:col-span-2 bg-blue-50/60 p-3 rounded-xl border border-blue-100 flex items-center justify-between">

                                    <div className="flex items-center gap-2 text-blue-900 font-medium">

                                        <IconFileText className="w-4 h-4 text-blue-600" />

                                        <span>Business Registration Document</span>

                                    </div>

                                    <button

                                        onClick={() => setSelectedDocUrl(selectedPartner.brDocumentUrl)}

                                        className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition"

                                    >

                                        Inspect Document

                                    </button>

                                </div>

                            )}

                        </div>



                        {/* Modal Action Footer */}

                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">

                            {/* Delete Button inside modal */}

                            <button

                                onClick={() => handleDeletePartner(selectedPartner)}

                                disabled={actionLoading}

                                className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs transition flex items-center gap-1.5"

                            >

                                <IconXCircle className="w-4 h-4 text-red-500" />

                                Delete Partner

                            </button>



                            <div className="flex items-center gap-2">

                                {selectedPartner.approvalStatus === 'Pending' && (

                                    <>

                                        <button

                                            onClick={() => handleApprove(selectedPartner)}

                                            disabled={actionLoading}

                                            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1"

                                        >

                                            <IconCheckCircle className="w-3.5 h-3.5" /> Approve

                                        </button>

                                        <button

                                            onClick={() => handleOpenReject(selectedPartner)}

                                            disabled={actionLoading}

                                            className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 font-bold text-xs transition flex items-center gap-1"

                                        >

                                            <IconXCircle className="w-3.5 h-3.5" /> Reject

                                        </button>

                                    </>

                                )}

                                <button

                                    onClick={() => setSelectedPartner(null)}

                                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs border border-slate-200 transition"

                                >

                                    Close

                                </button>

                            </div>

                        </div>

                    </div>

                </div>

            )}



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



            {/* Vehicle Inspector Modal */}

            {selectedVehicle && (

                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">

                    <div

                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"

                        onClick={() => setSelectedVehicle(null)}

                    />

                    <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl z-10 space-y-4">

                        <div className="flex items-center justify-between pb-3 border-b border-slate-200">

                            <h3 className="text-base font-bold text-slate-900">Vehicle Assignment Details</h3>

                            <button

                                onClick={() => setSelectedVehicle(null)}

                                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"

                            >

                                ✕

                            </button>

                        </div>



                        <div className="space-y-3 text-xs text-slate-700">

                            <div className="bg-slate-50 p-3.5 rounded-xl space-y-1 border border-slate-200">

                                <p className="font-bold text-slate-900 text-sm">

                                    {selectedVehicle.make} {selectedVehicle.model}

                                </p>

                                <p>Registration No: <strong className="font-mono text-blue-600">{selectedVehicle.registrationNumber}</strong></p>

                                <p>VIN: <strong className="font-mono text-slate-800">{selectedVehicle.vin || 'N/A'}</strong></p>

                                <p>Fuel Type: {selectedVehicle.fuelType || 'N/A'}</p>

                            </div>



                            <div className="bg-slate-50 p-3.5 rounded-xl space-y-1 border border-slate-200">

                                <p className="font-bold text-slate-900">Assigned Customer</p>

                                <p>Name: {selectedVehicle.ownerName || 'N/A'}</p>

                                <p>Email: {selectedVehicle.ownerEmail || 'N/A'}</p>

                                <p>Phone: {selectedVehicle.ownerPhone || 'N/A'}</p>

                            </div>

                        </div>



                        <div className="flex justify-end pt-2">

                            <button

                                onClick={() => setSelectedVehicle(null)}

                                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition"

                            >

                                Close Details

                            </button>

                        </div>

                    </div>

                </div>

            )}



            {/* Reject Partner Modal */}

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

                                className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-red-500 transition"

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

                                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition shadow-xs disabled:opacity-50 flex items-center gap-1.5"

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