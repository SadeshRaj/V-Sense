import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { IconCheckCircle, IconXCircle, IconAlertTriangle } from '../components/Icons';

export default function PublicVerification() {
    const { id } = useParams();
    const [status, setStatus] = useState('loading'); // 'loading', 'valid', 'invalid', 'error'
    const [message, setMessage] = useState('');
    const [verificationData, setVerificationData] = useState(null);

    useEffect(() => {
        const verifyCertificate = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                const response = await fetch(`${apiUrl}/workflows/verify/${id}`);
                const data = await response.json();

                if (response.ok && data.valid) {
                    setStatus('valid');
                    setVerificationData(data);
                } else {
                    setStatus('invalid');
                    setMessage(data.message || 'Invalid or pending certificate.');
                }
            } catch (error) {
                setStatus('error');
                setMessage('Network error while verifying the certificate. Please try again.');
            }
        };

        verifyCertificate();
    }, [id]);

    // Helper to format AI bullets nicely on the web
    const renderAiInsight = (text) => {
        if (!text) return null;
        return text.split('\n').filter(line => line.trim() !== '').map((line, idx) => {
            const cleanLine = line.trim().replace(/^[-*]\s*/, '');
            return (
                <li key={idx} className="flex gap-2 items-start text-sm text-blue-900 mb-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span className="leading-relaxed">{cleanLine}</span>
                </li>
            );
        });
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-start justify-center p-4 md:p-8">
            <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">

                {/* Header */}
                <div className="bg-slate-900 p-6 text-center">
                    <h1 className="text-2xl font-black text-white tracking-tight">V-Sense</h1>
                    <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mt-1">Digital Twin Verification</p>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                    {/* Loading State */}
                    {status === 'loading' && (
                        <div className="py-12 text-center">
                            <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                            <p className="mt-4 text-slate-500 font-semibold text-sm">Verifying cryptographic signature & fetching database records...</p>
                        </div>
                    )}

                    {/* Invalid / Error States */}
                    {status === 'invalid' && (
                        <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300 py-8">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <IconXCircle className="w-10 h-10 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Verification Failed</h2>
                            <p className="text-red-600 font-medium text-sm bg-red-50 py-3 px-4 rounded-xl border border-red-100 inline-block">
                                {message}
                            </p>
                            <p className="text-sm text-slate-500 mt-4 leading-relaxed max-w-md mx-auto">
                                This document may have been forged, rejected by an administrator, or is still pending review. Do not accept it as proof of condition.
                            </p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center space-y-4 animate-in fade-in zoom-in duration-300 py-8">
                            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto shadow-inner">
                                <IconAlertTriangle className="w-10 h-10 text-amber-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">Connection Error</h2>
                            <p className="text-slate-600 font-medium text-sm">{message}</p>
                        </div>
                    )}

                    {/* Valid State (The Digital Twin) */}
                    {status === 'valid' && verificationData && (
                        <div className="animate-in fade-in duration-500 space-y-8">

                            {/* Verification Banner */}
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center shadow-inner">
                                    <IconCheckCircle className="w-8 h-8 text-emerald-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-800">Authentic Certificate</h2>
                                <p className="text-emerald-700 font-semibold text-xs bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-full">
                                    Compare the data below with your PDF document.
                                </p>
                            </div>

                            {/* Vehicle Details */}
                            {verificationData.vehicle && (
                                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Vehicle Information</h3>
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                                        <div>
                                            <p className="text-xs text-slate-500 font-semibold">Make/Model</p>
                                            <p className="font-bold text-slate-900">{verificationData.vehicle.make} {verificationData.vehicle.model}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-semibold">Year</p>
                                            <p className="font-bold text-slate-900">{verificationData.vehicle.year || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-semibold">Reg. No</p>
                                            <p className="font-bold text-slate-900">{verificationData.vehicle.registrationNumber}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 font-semibold">VIN</p>
                                            <p className="font-bold text-slate-900 break-all">{verificationData.vehicle.vin}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* AI Insight */}
                            {verificationData.aiInsight && (
                                <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                                    <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        AI Condition Insight & Evidence
                                    </h3>
                                    <ul className="space-y-1">
                                        {renderAiInsight(verificationData.aiInsight)}
                                    </ul>
                                </div>
                            )}

                            {/* Service Timeline */}
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4">Maintenance & Service Timeline</h3>
                                {(!verificationData.records || verificationData.records.length === 0) ? (
                                    <p className="text-sm text-slate-500 p-4 bg-slate-50 rounded-xl text-center">No maintenance records reported.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {verificationData.records.map((record, index) => (
                                            <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-500 w-20">Date</span>
                                                        <span className="text-sm font-semibold text-slate-900">{new Date(record.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-start gap-2">
                                                        <span className="text-xs font-bold text-slate-500 w-20 mt-0.5">Service</span>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-bold text-slate-900">{record.title}</p>
                                                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{record.description || 'No details provided'}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-2">
                                                        <span className="text-xs font-bold text-slate-500 w-20">Garage</span>
                                                        <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                            {record.garageName} {record.garageVerified ? '(Verified)' : '(Unverified)'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="md:text-right flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-3 md:pt-0 mt-3 md:mt-0">
                                                    <span className="text-xs font-bold text-slate-500 uppercase">Mileage</span>
                                                    <span className="text-lg font-black text-blue-600">{record.odometerReading.toLocaleString()} <span className="text-xs font-bold text-slate-400">km</span></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Meta Data */}
                            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
                                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Workflow ID</p>
                                <p className="text-xs font-mono text-slate-600 break-all">{verificationData.workflowId}</p>
                                <p className="text-[10px] text-emerald-600 font-bold uppercase mt-3">Anti-Tamper Cryptographic Audit Trail Active</p>
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                    <Link to="/" className="text-blue-600 font-bold text-sm hover:underline">
                        Return to V-Sense Home
                    </Link>
                </div>
            </div>
        </div>
    );
}