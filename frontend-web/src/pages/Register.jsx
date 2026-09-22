import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerGarage } from '../api/auth';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import {
    IconBuilding,
    IconWrench,
    IconUpload,
    IconFileText,
    IconCheckCircle,
    IconAlertTriangle,
    IconClock,
    IconShield
} from '../components/Icons';

export default function Register({ isOpen = true, onClose, isModal = false }) {
    const navigate = useNavigate();
    const mapRef = useRef(null);
    const leafletMapInstance = useRef(null);
    const markerRef = useRef(null);

    const [formData, setFormData] = useState({
        businessName: '',
        registrationNumber: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
        role: 'Garage',
        latitude: '',
        longitude: ''
    });

    const [brFile, setBrFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [mapLoaded, setMapLoaded] = useState(false);

    // Default map center (Sri Lanka center: Colombo ~ 6.9271, 79.8612)
    const defaultLat = 6.9271;
    const defaultLng = 79.8612;

    // Dynamically load Leaflet CSS and JS if not already loaded
    useEffect(() => {
        if (isModal && !isOpen) return;

        const loadLeaflet = async () => {
            if (!document.getElementById('leaflet-css')) {
                const link = document.createElement('link');
                link.id = 'leaflet-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                document.head.appendChild(link);
            }

            if (!window.L) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = () => setMapLoaded(true);
                document.body.appendChild(script);
            } else {
                setMapLoaded(true);
            }
        };

        loadLeaflet();
    }, [isOpen, isModal]);

    // Initialize Leaflet Map
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || leafletMapInstance.current || submitted) return;

        const L = window.L;
        if (!L) return;

        const initialLat = formData.latitude ? parseFloat(formData.latitude) : defaultLat;
        const initialLng = formData.longitude ? parseFloat(formData.longitude) : defaultLng;

        const map = L.map(mapRef.current).setView([initialLat, initialLng], 12);
        leafletMapInstance.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        // If coordinates already exist, place initial marker
        if (formData.latitude && formData.longitude) {
            markerRef.current = L.marker([initialLat, initialLng]).addTo(map);
        }

        // Map click event to drop/move pin
        map.on('click', (e) => {
            const { lat, lng } = e.latlng;
            updateLocation(lat, lng);
        });

        return () => {
            if (leafletMapInstance.current) {
                leafletMapInstance.current.remove();
                leafletMapInstance.current = null;
            }
        };
    }, [mapLoaded, submitted]);

    const updateLocation = (lat, lng) => {
        const L = window.L;
        const formattedLat = lat.toFixed(6);
        const formattedLng = lng.toFixed(6);

        setFormData(prev => ({
            ...prev,
            latitude: formattedLat,
            longitude: formattedLng
        }));

        if (leafletMapInstance.current && L) {
            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                markerRef.current = L.marker([lat, lng]).addTo(leafletMapInstance.current);
            }
            leafletMapInstance.current.panTo([lat, lng]);
        }
    };

    // Geolocation API to detect device position
    const handleDetectLocation = () => {
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                updateLocation(latitude, longitude);
                if (leafletMapInstance.current) {
                    leafletMapInstance.current.setZoom(15);
                }
            },
            () => {
                setError('Unable to retrieve your location. Please select it manually on the map.');
            }
        );
    };

    if (isModal && !isOpen) return null;

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                setError('BR Document must be smaller than 10MB.');
                return;
            }
            setBrFile(file);
            setFileName(file.name);
            setError('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        if (!brFile) {
            setError('Please upload your official Business Registration (BR) document.');
            return;
        }

        setLoading(true);

        try {
            const data = new FormData();
            data.append('businessName', formData.businessName);
            data.append('registrationNumber', formData.registrationNumber);
            data.append('fullName', formData.fullName);
            data.append('email', formData.email);
            data.append('password', formData.password);
            data.append('confirmPassword', formData.confirmPassword);
            data.append('phone', formData.phone);
            data.append('address', formData.address);
            data.append('role', formData.role);
            if (formData.latitude) data.append('latitude', formData.latitude);
            if (formData.longitude) data.append('longitude', formData.longitude);
            data.append('brDocument', brFile);

            await registerGarage(data);
            setSubmitted(true);
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const content = (
        <div className="relative w-full max-w-2xl bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-2xl z-10 space-y-6 max-h-[90vh] overflow-y-auto">

            {/* Close Button if Modal */}
            {isModal && onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition"
                    aria-label="Close modal"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}

            {submitted ? (
                <div className="text-center space-y-6 py-4">
                    <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
                        <IconCheckCircle className="w-8 h-8" />
                    </div>

                    <div className="space-y-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                            <IconClock className="w-3.5 h-3.5" />
                            Pending Admin Approval
                        </span>
                        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            Application Submitted!
                        </h2>
                        <p className="text-slate-600 max-w-md mx-auto text-xs sm:text-sm leading-relaxed">
                            Thank you for registering <strong className="text-slate-900">{formData.businessName}</strong> on the V-Sense Verified Vehicle Network.
                        </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-left text-xs space-y-2 text-slate-600">
                        <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                            <IconShield className="w-4 h-4 text-blue-600" />
                            What happens next?
                        </div>
                        <p>1. Our compliance team will inspect your uploaded Business Registration (BR) document.</p>
                        <p>2. Once verified, your account status will be set to <strong className="text-emerald-600 font-semibold">Active</strong>.</p>
                        <p>3. An official confirmation email will be sent to <strong className="text-blue-600 font-semibold">{formData.email}</strong>.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Link
                            to="/login"
                            onClick={() => { if (isModal && onClose) onClose(); }}
                            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition active:scale-95 text-center"
                        >
                            Go to Sign In
                        </Link>
                    </div>
                </div>
            ) : (
                <>
                    {/* Header */}
                    <div className="text-center space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold">
                            <IconBuilding className="w-3.5 h-3.5" />
                            Partner Onboarding Portal
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                            Partner with V-Sense
                        </h1>
                        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                            Register your Garage or Service Center to log verified vehicle service history and authenticate maintenance records.
                        </p>
                    </div>

                    {/* Error Alert */}
                    {error && (
                        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
                            <IconAlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Partner Role Selection */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                                Registration Type *
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <label className={`cursor-pointer rounded-xl p-3 border flex items-center gap-3 transition ${
                                    formData.role === 'Garage'
                                        ? 'bg-blue-50/50 border-blue-600 text-slate-900 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="Garage"
                                        checked={formData.role === 'Garage'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <div className={`p-2 rounded-lg ${formData.role === 'Garage' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <IconWrench className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-xs text-slate-900">Automotive Garage</div>
                                        <div className="text-[11px] text-slate-500">Repairs & Diagnostics</div>
                                    </div>
                                </label>

                                <label className={`cursor-pointer rounded-xl p-3 border flex items-center gap-3 transition ${
                                    formData.role === 'ServiceCenter'
                                        ? 'bg-blue-50/50 border-blue-600 text-slate-900 shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                                }`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="ServiceCenter"
                                        checked={formData.role === 'ServiceCenter'}
                                        onChange={handleChange}
                                        className="sr-only"
                                    />
                                    <div className={`p-2 rounded-lg ${formData.role === 'ServiceCenter' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        <IconBuilding className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-xs text-slate-900">Official Service Center</div>
                                        <div className="text-[11px] text-slate-500">Authorized Dealer Hub</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Business Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Business Name *
                                </label>
                                <input
                                    type="text"
                                    name="businessName"
                                    required
                                    value={formData.businessName}
                                    onChange={handleChange}
                                    placeholder="e.g. Apex Auto Care"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600 transition placeholder:text-slate-400 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    BR Number *
                                </label>
                                <input
                                    type="text"
                                    name="registrationNumber"
                                    required
                                    value={formData.registrationNumber}
                                    onChange={handleChange}
                                    placeholder="e.g. PV-0024891"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600 transition placeholder:text-slate-400 font-medium"
                                />
                            </div>
                        </div>

                        {/* Contact Person */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    required
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    placeholder="e.g. Ruwan Silva"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600 transition placeholder:text-slate-400 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    required
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="e.g. +94 77 123 4567"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600 transition placeholder:text-slate-400 font-medium"
                                />
                            </div>
                        </div>

                        {/* Email & Address */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Official Email *
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="contact@apexautocare.lk"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600 transition placeholder:text-slate-400 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Workshop Address *
                                </label>
                                <input
                                    type="text"
                                    name="address"
                                    required
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="e.g. Kiribathgoda"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600 transition placeholder:text-slate-400 font-medium"
                                />
                            </div>
                        </div>

                        {/* Workshop Location Map Picker */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                                    Pin Workshop Location on Map
                                </label>
                                <button
                                    type="button"
                                    onClick={handleDetectLocation}
                                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                                >
                                    🎯 Detect My Location
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-inner bg-slate-100 relative">
                                <div ref={mapRef} className="h-48 w-full z-0" />
                                {!mapLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
                                        Loading map...
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <input
                                    type="text"
                                    name="latitude"
                                    readOnly
                                    value={formData.latitude ? `Lat: ${formData.latitude}` : ''}
                                    placeholder="Latitude (Click map)"
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono text-center"
                                />
                                <input
                                    type="text"
                                    name="longitude"
                                    readOnly
                                    value={formData.longitude ? `Lng: ${formData.longitude}` : ''}
                                    placeholder="Longitude (Click map)"
                                    className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono text-center"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Password *
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600 transition placeholder:text-slate-400 font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                    Confirm Password *
                                </label>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    required
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:outline-none focus:bg-white focus:border-blue-600 transition placeholder:text-slate-400 font-medium"
                                />
                            </div>
                        </div>

                        {/* BR Document Upload */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                                BR Document * (PDF, PNG, JPG — max 10MB)
                            </label>
                            <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-4 text-center transition bg-slate-50/50 hover:bg-blue-50/30">
                                <input
                                    type="file"
                                    id="br-upload"
                                    accept=".pdf,image/png,image/jpeg,image/jpg"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                                <label htmlFor="br-upload" className="cursor-pointer block space-y-1">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                                        <IconUpload className="w-5 h-5" />
                                    </div>
                                    {fileName ? (
                                        <div className="flex items-center justify-center gap-1.5 text-emerald-600 text-xs font-semibold">
                                            <IconFileText className="w-4 h-4" />
                                            <span>{fileName}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="text-xs font-semibold text-slate-800">
                                                Click to upload BR Certificate
                                            </div>
                                            <p className="text-[11px] text-slate-400">
                                                Official certificate issued by Registrar of Companies
                                            </p>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 font-semibold text-white text-xs sm:text-sm shadow-md shadow-blue-600/20 transition disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>Submitting Application...</span>
                                </>
                            ) : (
                                <>
                                    <IconBuilding className="w-4 h-4" />
                                    <span>Submit Partner Application</span>
                                </>
                            )}
                        </button>

                        <div className="text-center text-xs text-slate-500 pt-1 font-medium">
                            Already registered?{' '}
                            <Link
                                to="/login"
                                onClick={() => { if (isModal && onClose) onClose(); }}
                                className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                            >
                                Sign In here
                            </Link>
                        </div>
                    </form>
                </>
            )}
        </div>
    );

    if (isModal) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                />
                {content}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
            <Navbar />
            <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                {content}
            </div>
            <Footer />
        </div>
    );
}