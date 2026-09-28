import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../api/auth';
import { searchVehicle } from '../api/vehicleApi';
import { createServiceRecord, getVehicleServiceRecords, getMyServiceRecords } from '../api/garageApi';
import CheckupRequestsPanel from '../components/CheckupRequestsPanel';
import {
    IconCar,
    IconWrench,
    IconSearch,
    IconPlus,
    IconImage,
    IconCheckCircle,
    IconClock,
    IconAlertTriangle,
    IconLogOut,
    IconFileText,
    IconBuilding,
    IconUpload,
    IconEye,
    IconRefresh
} from '../components/Icons';

export default function GarageDashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // Navigation sub-tab
    const [viewTab, setViewTab] = useState('search'); // 'search' | 'checkup-requests' | 'my-records'

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('plate'); // 'plate' | 'chassis'
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState('');

    // Active vehicle state
    const [activeVehicle, setActiveVehicle] = useState(null);
    const [vehicleHistory, setVehicleHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Service Record Form state
    const [title, setTitle] = useState('');
    const [odometer, setOdometer] = useState('');
    const [description, setDescription] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('CustomerPayment'); // 'CustomerPayment' | 'InsuranceClaim'
    const [selectedPhotos, setSelectedPhotos] = useState([]);
    const [photoPreviews, setPhotoPreviews] = useState([]);
    const [submittingRecord, setSubmittingRecord] = useState(false);
    const [formError, setFormError] = useState('');

    // Workshop's own logged records
    const [myRecords, setMyRecords] = useState([]);
    const [loadingMyRecords, setLoadingMyRecords] = useState(false);

    // Lightbox / Image modal
    const [previewImage, setPreviewImage] = useState(null);
    const [notification, setNotification] = useState(null);

    // Pending checkup-request count, shown as a badge on the tab
    const [pendingCheckupCount, setPendingCheckupCount] = useState(0);

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            navigate('/login');
            return;
        }
        if (currentUser.role !== 'Garage' && currentUser.role !== 'ServiceCenter') {
            if (currentUser.role === 'Administrator') {
                navigate('/admin');
            } else {
                navigate('/login');
            }
            return;
        }
        setUser(currentUser);
    }, []);

    const showToast = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // Load workshop records when switching tab
    useEffect(() => {
        if (viewTab === 'my-records') {
            loadMyRecords();
        }
    }, [viewTab]);

    const loadMyRecords = async () => {
        setLoadingMyRecords(true);
        try {
            const records = await getMyServiceRecords();
            setMyRecords(records);
        } catch (err) {
            showToast(err.message || 'Failed to load your records', 'error');
        } finally {
            setLoadingMyRecords(false);
        }
    };

    const handleSearch = async (termToSearch = searchTerm, typeToSearch = searchType) => {
        const query = termToSearch.trim();
        if (!query) {
            setSearchError('Please enter a vehicle registration plate or chassis number.');
            return;
        }

        setSearching(true);
        setSearchError('');
        setActiveVehicle(null);
        setVehicleHistory([]);

        try {
            const payload = typeToSearch === 'plate'
                ? { vehicleNumber: query }
                : { chassisNumber: query };

            const vehicle = await searchVehicle(payload);
            setActiveVehicle(vehicle);

            // Fetch this vehicle's service history
            await loadVehicleHistory(vehicle.id);
        } catch (err) {
            setSearchError(err.message || 'Vehicle not found. Please verify the number entered.');
        } finally {
            setSearching(false);
        }
    };

    const loadVehicleHistory = async (vehicleId) => {
        setLoadingHistory(true);
        try {
            const history = await getVehicleServiceRecords(vehicleId);
            setVehicleHistory(history);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Handle photo uploads with previews
    const handlePhotoSelection = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + selectedPhotos.length > 5) {
            setFormError('You can upload a maximum of 5 photos per service record.');
            return;
        }

        setFormError('');
        const newSelected = [...selectedPhotos, ...files];
        setSelectedPhotos(newSelected);

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setPhotoPreviews(prev => [...prev, ...newPreviews]);
    };

    const removePhoto = (index) => {
        const updatedFiles = selectedPhotos.filter((_, i) => i !== index);
        const updatedPreviews = photoPreviews.filter((_, i) => i !== index);
        setSelectedPhotos(updatedFiles);
        setPhotoPreviews(updatedPreviews);
    };

    // Submit service record
    const handleSubmitRecord = async (e) => {
        e.preventDefault();
        setFormError('');

        if (!activeVehicle) {
            setFormError('No vehicle selected.');
            return;
        }

        if (!title.trim() || !description.trim() || !odometer.trim()) {
            setFormError('Please fill in the service title, odometer reading, and work description.');
            return;
        }

        if (paymentMethod !== 'InsuranceClaim' && paymentMethod !== 'CustomerPayment') {
            setFormError('Invalid payment method selected.');
            return;
        }

        setSubmittingRecord(true);

        try {
            const formData = new FormData();
            formData.append('vehicleId', activeVehicle.id);
            formData.append('title', title.trim());
            formData.append('odometerReading', odometer.trim());
            formData.append('description', description.trim());
            formData.append('paymentMethod', paymentMethod);

            selectedPhotos.forEach(photo => {
                formData.append('photos', photo);
            });

            await createServiceRecord(formData);
            showToast('Service record successfully added and vehicle history updated!');

            // Reset form
            setTitle('');
            setOdometer('');
            setDescription('');
            setPaymentMethod('CustomerPayment');
            setSelectedPhotos([]);
            setPhotoPreviews([]);

            // Refresh vehicle history
            await loadVehicleHistory(activeVehicle.id);
        } catch (err) {
            setFormError(err.message || 'Failed to submit service record.');
        } finally {
            setSubmittingRecord(false);
        }
    };

    // Quick demo helpers
    const samplePlates = ['WP CAQ-5834', 'NP CAA-3467', 'WP CBM-6903'];

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col antialiased">

            {/* Top Navigation Bar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl text-white shadow-lg shadow-blue-600/30">
                            V
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-lg tracking-tight">V-SENSE</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                    Authorized Partner Portal
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                {user?.role === 'ServiceCenter' ? 'Service Center Console' : 'Garage Maintenance Console'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                            <IconBuilding className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs text-slate-700 font-medium">{user?.fullName || 'Partner'}</span>
                        </div>
                        <button
                            onClick={() => logout()}
                            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold border border-slate-200 transition flex items-center gap-1.5"
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
                    <div className={`px-4 py-3 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border ${
                        notification.type === 'error'
                            ? 'bg-red-50 border-red-200 text-red-700'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    }`}>
                        {notification.type === 'error' ? (
                            <IconAlertTriangle className="w-4 h-4 text-red-500" />
                        ) : (
                            <IconCheckCircle className="w-4 h-4 text-emerald-600" />
                        )}
                        <span>{notification.message}</span>
                    </div>
                </div>
            )}

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">

                {/* Sub-Tab Navigation Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/70 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setViewTab('search')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                                viewTab === 'search'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <IconSearch className="w-3.5 h-3.5" />
                            Vehicle Search & Log Service
                        </button>
                        <button
                            onClick={() => setViewTab('checkup-requests')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                                viewTab === 'checkup-requests'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <IconClock className="w-3.5 h-3.5" />
                            Checkup Requests
                            {pendingCheckupCount > 0 && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 rounded-full px-1.5 py-0.5 font-bold">
                                    {pendingCheckupCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setViewTab('my-records')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                                viewTab === 'my-records'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <IconFileText className="w-3.5 h-3.5" />
                            Workshop Service History
                        </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                        <span>Partner Status:</span>
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            Verified & Active
                        </span>
                    </div>
                </div>

                {/* ─── TAB 1: VEHICLE SEARCH & LOG SERVICE ─────────────────── */}
                {viewTab === 'search' && (
                    <div className="space-y-8">

                        {/* Search Box Card */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
                            <div className="max-w-2xl space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                        <IconCar className="w-5 h-5 text-blue-600" />
                                        Vehicle Lookup
                                    </h2>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Search the verified registry by vehicle registration plate or chassis/VIN number to inspect history and record maintenance.
                                    </p>
                                </div>

                                {/* Search Type Toggle */}
                                <div className="flex items-center gap-4 text-xs">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="searchType"
                                            checked={searchType === 'plate'}
                                            onChange={() => setSearchType('plate')}
                                            className="text-blue-600 focus:ring-blue-500 bg-white border-slate-300"
                                        />
                                        <span className="text-slate-700 font-medium">Registration Plate Number</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="searchType"
                                            checked={searchType === 'chassis'}
                                            onChange={() => setSearchType('chassis')}
                                            className="text-blue-600 focus:ring-blue-500 bg-white border-slate-300"
                                        />
                                        <span className="text-slate-700 font-medium">Chassis / VIN Number</span>
                                    </label>
                                </div>

                                {/* Search Input & Action */}
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                                    className="flex flex-col sm:flex-row gap-3"
                                >
                                    <div className="relative flex-grow">
                                        <IconSearch className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder={searchType === 'plate' ? 'e.g. WP CAQ-5834 or NP CAA-3467' : 'e.g. JT2AW19E3X0284592'}
                                            className="w-full pl-11 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-400 font-mono"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={searching}
                                        className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
                                    >
                                        {searching ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                <span>Searching...</span>
                                            </>
                                        ) : (
                                            <>
                                                <IconSearch className="w-4 h-4" />
                                                <span>Search Vehicle</span>
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* Sample Search Pills */}
                                <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-500">
                                    <span>Sample vehicles in DB:</span>
                                    {samplePlates.map(plate => (
                                        <button
                                            key={plate}
                                            type="button"
                                            onClick={() => {
                                                setSearchTerm(plate);
                                                setSearchType('plate');
                                                handleSearch(plate, 'plate');
                                            }}
                                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-mono transition"
                                        >
                                            {plate}
                                        </button>
                                    ))}
                                </div>

                                {/* Error Alert */}
                                {searchError && (
                                    <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                                        <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
                                        <span>{searchError}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Vehicle Information Banner (if vehicle found) */}
                        {activeVehicle && (
                            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6 animate-fade-in">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                                            <IconCar className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                                                    {activeVehicle.make} {activeVehicle.model}
                                                </h3>
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                                    {activeVehicle.year}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Registry ID: <span className="font-mono text-slate-700">{activeVehicle.id}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Plate badge */}
                                    <div className="bg-amber-400 text-slate-950 font-black text-lg px-5 py-2 rounded-xl shadow-sm font-mono tracking-wider text-center border-2 border-amber-300 w-fit">
                                        {activeVehicle.vehicleNumber}
                                    </div>
                                </div>

                                {/* Specs Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                        <span className="text-slate-500 block uppercase text-[10px] font-semibold tracking-wider">Chassis / VIN</span>
                                        <span className="text-slate-800 font-mono font-bold mt-1 block truncate">
                                            {activeVehicle.chassisNumber || 'N/A'}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                        <span className="text-slate-500 block uppercase text-[10px] font-semibold tracking-wider">Fuel Type</span>
                                        <span className="text-slate-800 font-bold mt-1 block">
                                            {activeVehicle.fuelType || 'Petrol'}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                        <span className="text-slate-500 block uppercase text-[10px] font-semibold tracking-wider">Vehicle Class</span>
                                        <span className="text-slate-800 font-bold mt-1 block">
                                            {activeVehicle.color || 'Sedan / Hatchback'}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                                        <span className="text-slate-500 block uppercase text-[10px] font-semibold tracking-wider">Service History</span>
                                        <span className="text-emerald-600 font-bold mt-1 block">
                                            {vehicleHistory.length} Logged Record{vehicleHistory.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Two Columns: Add Service Form + History Timeline */}
                        {activeVehicle && (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                                {/* Form Column (Left) */}
                                <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                            <IconWrench className="w-5 h-5 text-emerald-600" />
                                            Add Maintenance Record
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1">
                                            Log maintenance performed by <strong className="text-slate-800">{user?.fullName}</strong>.
                                        </p>
                                    </div>

                                    {formError && (
                                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                                            <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
                                            <span>{formError}</span>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmitRecord} className="space-y-5">
                                        {/* Service Title */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                                Service Title *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={title}
                                                onChange={(e) => setTitle(e.target.value)}
                                                placeholder="e.g. 40,000km Major Periodic Service & Brake Overhaul"
                                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-400"
                                            />
                                        </div>

                                        {/* Odometer Reading */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                                Odometer Reading (km) *
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    required
                                                    value={odometer}
                                                    onChange={(e) => setOdometer(e.target.value)}
                                                    placeholder="e.g. 45000"
                                                    className="w-full pl-4 pr-12 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-400"
                                                />
                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-semibold">
                                                    km
                                                </span>
                                            </div>
                                        </div>

                                        {/* Payment Method Selector */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                                Payment Method *
                                            </label>
                                            <select
                                                value={paymentMethod}
                                                onChange={(e) => setPaymentMethod(e.target.value)}
                                                className="w-full px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-sm focus:outline-none focus:border-blue-500 transition"
                                            >
                                                <option value="CustomerPayment">Customer Payment (Direct / Cash / Card)</option>
                                                <option value="InsuranceClaim">Insurance Claim (Third-Party / Comprehensive)</option>
                                            </select>
                                            <p className="text-[11px] text-slate-500 mt-1">
                                                Strictly classified as per V-Sense standard underwriting guidelines.
                                            </p>
                                        </div>

                                        {/* Description */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                                Work Description & Parts Replaced *
                                            </label>
                                            <textarea
                                                rows={4}
                                                required
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Details of services, diagnostics, synthetic oil viscosity, filter part numbers, brake pad thickness measurements..."
                                                className="w-full p-3.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition placeholder:text-slate-400 leading-relaxed"
                                            />
                                        </div>

                                        {/* Photo Upload (Multiple) */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                                                Service Evidence Photos (Optional, max 5)
                                            </label>

                                            <div className="border border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-4 text-center transition bg-slate-50">
                                                <input
                                                    type="file"
                                                    id="service-photos"
                                                    multiple
                                                    accept="image/png,image/jpeg,image/jpg"
                                                    onChange={handlePhotoSelection}
                                                    className="hidden"
                                                    disabled={selectedPhotos.length >= 5}
                                                />
                                                <label htmlFor="service-photos" className="cursor-pointer block space-y-1">
                                                    <IconImage className="w-6 h-6 text-blue-500 mx-auto" />
                                                    <div className="text-xs font-semibold text-slate-700">
                                                        Click to add photos of repairs, parts or odometer
                                                    </div>
                                                    <p className="text-[10px] text-slate-500">
                                                        {selectedPhotos.length} / 5 photos selected
                                                    </p>
                                                </label>
                                            </div>

                                            {/* Previews */}
                                            {photoPreviews.length > 0 && (
                                                <div className="grid grid-cols-5 gap-2 mt-3">
                                                    {photoPreviews.map((preview, idx) => (
                                                        <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-200 h-16 bg-slate-100">
                                                            <img
                                                                src={preview}
                                                                alt={`preview-${idx}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => removePhoto(idx)}
                                                                className="absolute top-1 right-1 bg-red-600 hover:bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold opacity-80 group-hover:opacity-100 transition"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Submit Button */}
                                        <button
                                            type="submit"
                                            disabled={submittingRecord}
                                            className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
                                        >
                                            {submittingRecord ? (
                                                <>
                                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    <span>Uploading & Logging Record...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <IconPlus className="w-4 h-4" />
                                                    <span>Commit Service Record to Blockchain/DB</span>
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </div>

                                {/* Vehicle History Column (Right) */}
                                <div className="lg:col-span-6 bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                                <IconClock className="w-5 h-5 text-blue-600" />
                                                Vehicle Service History
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Immutable chronological record for this chassis
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => loadVehicleHistory(activeVehicle.id)}
                                            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                            title="Refresh history"
                                        >
                                            <IconRefresh className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>

                                    {loadingHistory ? (
                                        <div className="py-16 text-center space-y-2">
                                            <svg className="animate-spin h-6 w-6 text-blue-500 mx-auto" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <p className="text-xs text-slate-500">Loading service logs...</p>
                                        </div>
                                    ) : vehicleHistory.length === 0 ? (
                                        <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl space-y-2 p-6">
                                            <IconFileText className="w-8 h-8 text-slate-400 mx-auto" />
                                            <p className="text-xs font-bold text-slate-700">No previous records logged</p>
                                            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                                                Use the form on the left to record the inaugural maintenance event for this vehicle.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                                            {vehicleHistory.map((record) => (
                                                <div
                                                    key={record.id}
                                                    className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3 hover:border-slate-300 transition"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 text-sm">
                                                                {record.title}
                                                            </h4>
                                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                                                <span className="flex items-center gap-1">
                                                                    <IconBuilding className="w-3 h-3 text-emerald-600" />
                                                                    {record.garageName}
                                                                </span>
                                                                <span>•</span>
                                                                <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                                                                <span>•</span>
                                                                <span className="font-mono font-semibold text-emerald-600">{record.odometerReading} km</span>
                                                            </div>
                                                        </div>

                                                        {/* Payment Method Badge */}
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                                            record.paymentMethod === 'InsuranceClaim'
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        }`}>
                                                            {record.paymentMethod === 'InsuranceClaim' ? 'Insurance Claim' : 'Customer Payment'}
                                                        </span>
                                                    </div>

                                                    <p className="text-xs text-slate-600 leading-relaxed">
                                                        {record.description}
                                                    </p>

                                                    {/* Attached Photos */}
                                                    {record.photos && record.photos.length > 0 && (
                                                        <div className="pt-2 border-t border-slate-200">
                                                            <div className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                                                                <IconImage className="w-3 h-3" />
                                                                Verified Evidence Photos ({record.photos.length})
                                                            </div>
                                                            <div className="flex flex-wrap gap-2">
                                                                {record.photos.map((photoUrl, pIdx) => (
                                                                    <div
                                                                        key={pIdx}
                                                                        onClick={() => setPreviewImage(photoUrl)}
                                                                        className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:border-blue-400 transition relative group"
                                                                    >
                                                                        <img
                                                                            src={photoUrl}
                                                                            alt="Service evidence"
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                                                            <IconEye className="w-4 h-4 text-white" />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── TAB 2: CHECKUP REQUESTS ──────────────────────────────── */}
                {viewTab === 'checkup-requests' && (
                    <CheckupRequestsPanel showToast={showToast} onCountsChange={setPendingCheckupCount} />
                )}

                {/* ─── TAB 3: WORKSHOP'S OWN LOGGED RECORDS ────────────────── */}
                {viewTab === 'my-records' && (
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <IconFileText className="w-5 h-5 text-blue-600" />
                                    Your Workshop's Service Logs
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">
                                    All maintenance events logged under your authenticated account
                                </p>
                            </div>
                            <button
                                onClick={loadMyRecords}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                            >
                                <IconRefresh className={`w-4 h-4 ${loadingMyRecords ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        {loadingMyRecords ? (
                            <div className="py-20 text-center space-y-2">
                                <svg className="animate-spin h-7 w-7 text-blue-500 mx-auto" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <p className="text-xs text-slate-500">Loading your service history...</p>
                            </div>
                        ) : myRecords.length === 0 ? (
                            <div className="py-20 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                                <IconWrench className="w-10 h-10 text-slate-400 mx-auto" />
                                <p className="text-sm font-bold text-slate-700">No records logged yet</p>
                                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                    Search for a vehicle in the search tab to begin recording services.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {myRecords.map((rec) => (
                                    <div
                                        key={rec.id}
                                        className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3 hover:border-slate-300 transition"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">
                                                    {rec.title}
                                                </div>
                                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                    Vehicle: {rec.vehicleNumber || 'Registered Vehicle'}
                                                </div>
                                            </div>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                                rec.paymentMethod === 'InsuranceClaim'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            }`}>
                                                {rec.paymentMethod === 'InsuranceClaim' ? 'Insurance' : 'Customer'}
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-600 line-clamp-2">
                                            {rec.description}
                                        </p>

                                        <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                            <span>Logged {new Date(rec.createdAt).toLocaleDateString()}</span>
                                            {rec.photos && rec.photos.length > 0 && (
                                                <span className="text-blue-600 flex items-center gap-1">
                                                    <IconImage className="w-3 h-3" />
                                                    {rec.photos.length} Photo{rec.photos.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Photo Lightbox Modal */}
            {previewImage && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        onClick={() => setPreviewImage(null)}
                    />
                    <div className="relative max-w-4xl max-h-[90vh] z-10 space-y-3">
                        <div className="flex justify-end">
                            <button
                                onClick={() => setPreviewImage(null)}
                                className="text-slate-800 hover:text-slate-900 p-2 text-sm font-bold bg-white rounded-full transition"
                            >
                                ✕
                            </button>
                        </div>
                        <img
                            src={previewImage}
                            alt="Full evidence"
                            className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-200 bg-white"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}