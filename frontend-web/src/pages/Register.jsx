import React, { useState } from 'react';
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

export default function Register() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        businessName: '',
        registrationNumber: '',
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
        role: 'Garage'
    });
    const [brFile, setBrFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file size (10MB max)
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
            data.append('brDocument', brFile);

            await registerGarage(data);
            setSubmitted(true);
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
            <Navbar />

            <div className="flex-grow py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
                {submitted ? (
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center shadow-2xl backdrop-blur-md space-y-6 animate-fade-in">
                        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400">
                            <IconCheckCircle className="w-10 h-10" />
                        </div>

                        <div className="space-y-2">
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                                <IconClock className="w-3.5 h-3.5" />
                                Pending Admin Approval
                            </span>
                            <h2 className="text-3xl font-bold text-white tracking-tight">
                                Registration Successfully Submitted!
                            </h2>
                            <p className="text-slate-400 max-w-lg mx-auto text-sm leading-relaxed">
                                Thank you for registering <strong className="text-white">{formData.businessName}</strong> on the V-Sense Verified Vehicle Network.
                            </p>
                        </div>

                        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-5 max-w-md mx-auto text-left text-xs space-y-2.5 text-slate-300">
                            <div className="flex items-center gap-2 text-slate-200 font-semibold text-sm">
                                <IconShield className="w-4 h-4 text-blue-400" />
                                What happens next?
                            </div>
                            <p>1. Our compliance team will inspect your uploaded Business Registration (BR) document.</p>
                            <p>2. Once verified, your account status will be set to <strong className="text-emerald-400">Active</strong>.</p>
                            <p>3. An official confirmation email will be delivered to <strong className="text-blue-400">{formData.email}</strong>.</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link
                                to="/login"
                                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition active:scale-95"
                            >
                                Go to Sign In
                            </Link>
                            <Link
                                to="/"
                                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-sm border border-slate-700 transition"
                            >
                                Return to Home
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-10 shadow-2xl backdrop-blur-md">
                        {/* Title Header */}
                        <div className="text-center space-y-3 mb-8">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                                <IconBuilding className="w-4 h-4" />
                                Partner Onboarding Portal
                            </div>
                            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                                Partner with V-Sense
                            </h1>
                            <p className="text-sm text-slate-400 max-w-xl mx-auto">
                                Register your Garage or Service Center to log verified vehicle service history, authenticate maintenance records, and establish trust with vehicle owners.
                            </p>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-start gap-3">
                                <IconAlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <div>{error}</div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">

                            {/* Section 1: Partner Role */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                                    Registration Type *
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <label className={`cursor-pointer rounded-xl p-4 border flex items-center gap-3 transition ${
                                        formData.role === 'Garage'
                                            ? 'bg-blue-600/10 border-blue-500 text-white shadow-md shadow-blue-500/10'
                                            : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="Garage"
                                            checked={formData.role === 'Garage'}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className={`p-2 rounded-lg ${formData.role === 'Garage' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                            <IconWrench className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm">Automotive Garage</div>
                                            <div className="text-xs text-slate-500">Repairs, Bodywork & Diagnostics</div>
                                        </div>
                                    </label>

                                    <label className={`cursor-pointer rounded-xl p-4 border flex items-center gap-3 transition ${
                                        formData.role === 'ServiceCenter'
                                            ? 'bg-blue-600/10 border-blue-500 text-white shadow-md shadow-blue-500/10'
                                            : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                                    }`}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="ServiceCenter"
                                            checked={formData.role === 'ServiceCenter'}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className={`p-2 rounded-lg ${formData.role === 'ServiceCenter' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                            <IconBuilding className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm">Official Service Center</div>
                                            <div className="text-xs text-slate-500">Authorized Dealer / Lubrication Hub</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Section 2: Business Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Business / Company Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="businessName"
                                        required
                                        value={formData.businessName}
                                        onChange={handleChange}
                                        placeholder="e.g. Apex Auto Care (Pvt) Ltd"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Business Registration (BR) Number *
                                    </label>
                                    <input
                                        type="text"
                                        name="registrationNumber"
                                        required
                                        value={formData.registrationNumber}
                                        onChange={handleChange}
                                        placeholder="e.g. PV-0024891"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            {/* Section 3: Contact Person */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Primary Contact Full Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="fullName"
                                        required
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        placeholder="e.g. Ruwan Silva"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Phone / Mobile Number *
                                    </label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        required
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="e.g. +94 77 123 4567"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            {/* Section 4: Email & Address */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Official Business Email *
                                    </label>
                                    <input
                                        type="email"
                                        name="email"
                                        required
                                        value={formData.email}
                                        onChange={handleChange}
                                        placeholder="contact@apexautocare.lk"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Physical Workshop Address *
                                    </label>
                                    <input
                                        type="text"
                                        name="address"
                                        required
                                        value={formData.address}
                                        onChange={handleChange}
                                        placeholder="e.g. 120 Kandy Road, Kiribathgoda"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            {/* Section 5: Password */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Portal Password *
                                    </label>
                                    <input
                                        type="password"
                                        name="password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                        Confirm Password *
                                    </label>
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder:text-slate-500"
                                    />
                                </div>
                            </div>

                            {/* Section 6: BR Document Upload */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Business Registration (BR) Document * (PDF, PNG, JPG — max 10MB)
                                </label>
                                <div className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-6 text-center transition bg-slate-800/30">
                                    <input
                                        type="file"
                                        id="br-upload"
                                        accept=".pdf,image/png,image/jpeg,image/jpg"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <label htmlFor="br-upload" className="cursor-pointer block space-y-2">
                                        <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                                            <IconUpload className="w-6 h-6" />
                                        </div>
                                        {fileName ? (
                                            <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm font-medium">
                                                <IconFileText className="w-4 h-4" />
                                                <span>{fileName}</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-sm font-medium text-slate-300">
                                                    Click to upload or drag & drop BR Certificate
                                                </div>
                                                <p className="text-xs text-slate-500">
                                                    Official certificate issued by the Registrar of Companies
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
                                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-white text-sm shadow-xl shadow-blue-600/25 transition disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Submitting Application & Uploading Document...</span>
                                    </>
                                ) : (
                                    <>
                                        <IconBuilding className="w-4 h-4" />
                                        <span>Submit Partner Application</span>
                                    </>
                                )}
                            </button>

                            <div className="text-center text-xs text-slate-400 pt-2">
                                Already have an approved account?{' '}
                                <Link to="/login" className="text-blue-400 hover:underline font-medium">
                                    Sign In here
                                </Link>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            <Footer />
        </div>
    );
}
