import React, { useState, useEffect, useMemo } from 'react';
import {
    getOrganizationCheckupRequests,
    acceptCheckupRequest,
    suggestAlternative,
} from '../api/checkupRequestApi';
import {
    IconCar,
    IconClock,
    IconCheckCircle,
    IconAlertTriangle,
    IconFileText,
    IconRefresh,
} from './Icons';

const STATUS_FILTERS = [
    { key: 'All', label: 'All' },
    { key: 'Pending', label: 'Pending' },
    { key: 'Confirmed', label: 'Confirmed' },
    { key: 'AlternativeSuggested', label: 'Alternative Suggested' },
];

function StatusBadge({ status }) {
    const map = {
        Pending: {
            className: 'bg-amber-50 text-amber-700 border-amber-200',
            label: 'Pending',
            Icon: IconClock,
        },
        Confirmed: {
            className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            label: 'Confirmed',
            Icon: IconCheckCircle,
        },
        AlternativeSuggested: {
            className: 'bg-purple-50 text-purple-700 border-purple-200',
            label: 'Alternative Suggested',
            Icon: IconAlertTriangle,
        },
    };
    const cfg = map[status] || map.Pending;
    const { Icon } = cfg;
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 w-fit ${cfg.className}`}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
}

function formatDate(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    } catch {
        return value;
    }
}

function formatTime(value) {
    if (!value) return '—';
    try {
        return new Date(value).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return value;
    }
}

export default function CheckupRequestsPanel({ showToast, onCountsChange }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statusFilter, setStatusFilter] = useState('Pending');

    // Which request currently has its "suggest alternative" form open
    const [altFormOpenFor, setAltFormOpenFor] = useState(null);
    const [altMessage, setAltMessage] = useState('');

    // Per-request in-flight action ('accept' | 'alternative' | null)
    const [actionInFlight, setActionInFlight] = useState({});

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await getOrganizationCheckupRequests();
            setRequests(data || []);
        } catch (err) {
            setError(err.message || 'Failed to load checkup requests.');
        } finally {
            setLoading(false);
        }
    };

    const filteredRequests = useMemo(() => {
        if (statusFilter === 'All') return requests;
        return requests.filter((r) => r.status === statusFilter);
    }, [requests, statusFilter]);

    const counts = useMemo(() => {
        return requests.reduce(
            (acc, r) => {
                acc[r.status] = (acc[r.status] || 0) + 1;
                return acc;
            },
            { Pending: 0, Confirmed: 0, AlternativeSuggested: 0 }
        );
    }, [requests]);

    useEffect(() => {
        onCountsChange?.(counts.Pending);
    }, [counts.Pending]);

    const handleAccept = async (request) => {
        setActionInFlight((prev) => ({ ...prev, [request.id]: 'accept' }));
        try {
            await acceptCheckupRequest(request.id);
            setRequests((prev) =>
                prev.map((r) => (r.id === request.id ? { ...r, status: 'Confirmed' } : r))
            );
            showToast?.(`Checkup confirmed for ${request.vehicleRegistrationNumber || 'vehicle'}.`);
        } catch (err) {
            showToast?.(err.message || 'Failed to accept request.', 'error');
        } finally {
            setActionInFlight((prev) => ({ ...prev, [request.id]: null }));
        }
    };

    const openAltForm = (request) => {
        setAltFormOpenFor(request.id);
        setAltMessage('');
    };

    const cancelAltForm = () => {
        setAltFormOpenFor(null);
        setAltMessage('');
    };

    const submitAlternative = async (request) => {
        if (!altMessage.trim()) {
            showToast?.('Please enter the alternative availability details.', 'error');
            return;
        }
        setActionInFlight((prev) => ({ ...prev, [request.id]: 'alternative' }));
        try {
            await suggestAlternative(request.id, altMessage.trim());
            setRequests((prev) =>
                prev.map((r) =>
                    r.id === request.id
                        ? { ...r, status: 'AlternativeSuggested', garageResponse: altMessage.trim() }
                        : r
                )
            );
            showToast?.('Alternative availability sent to the owner.');
            cancelAltForm();
        } catch (err) {
            showToast?.(err.message || 'Failed to send alternative.', 'error');
        } finally {
            setActionInFlight((prev) => ({ ...prev, [request.id]: null }));
        }
    };

    return (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <IconClock className="w-5 h-5 text-blue-600" />
                        Checkup Requests
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                        Owners requesting a checkup at your garage appear here.
                    </p>
                </div>
                <button
                    onClick={loadRequests}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                >
                    <IconRefresh className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Status filter tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-fit">
                {STATUS_FILTERS.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setStatusFilter(f.key)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                            statusFilter === f.key
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {f.label}
                        {f.key !== 'All' && counts[f.key] > 0 && (
                            <span className="text-[10px] bg-slate-200 text-slate-700 rounded-full px-1.5 py-0.5">
                                {counts[f.key]}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {loading ? (
                <div className="py-20 text-center space-y-2">
                    <svg className="animate-spin h-7 w-7 text-blue-500 mx-auto" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <p className="text-xs text-slate-500">Loading checkup requests...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
                    <IconFileText className="w-10 h-10 text-slate-400 mx-auto" />
                    <p className="text-sm font-bold text-slate-700">No requests here</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        {statusFilter === 'All'
                            ? "You'll see owner checkup requests here as they come in."
                            : `No requests with status "${STATUS_FILTERS.find((f) => f.key === statusFilter)?.label}".`}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredRequests.map((request) => {
                        const inFlight = actionInFlight[request.id];
                        const isAltFormOpen = altFormOpenFor === request.id;

                        return (
                            <div
                                key={request.id}
                                className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 hover:border-slate-300 transition"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                            <IconCar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm font-mono">
                                                {request.vehicleRegistrationNumber || 'Vehicle'}
                                            </div>
                                            <div className="text-[11px] text-slate-500 mt-0.5">
                                                Requested for{' '}
                                                <span className="font-semibold text-slate-700">
                                                    {formatDate(request.requestedDate)}
                                                </span>{' '}
                                                at{' '}
                                                <span className="font-semibold text-slate-700">
                                                    {formatTime(request.requestedTime)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <StatusBadge status={request.status} />
                                </div>

                                {request.ownerMessage && (
                                    <div className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg p-3">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                            Owner's message
                                        </span>
                                        {request.ownerMessage}
                                    </div>
                                )}

                                {request.status === 'AlternativeSuggested' && request.garageResponse && (
                                    <div className="text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded-lg p-3">
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-purple-600 mb-1">
                                            Your suggested alternative
                                        </span>
                                        {request.garageResponse}
                                    </div>
                                )}

                                {/* Actions — only for Pending requests */}
                                {request.status === 'Pending' && !isAltFormOpen && (
                                    <div className="flex flex-wrap items-center gap-2 pt-1">
                                        <button
                                            onClick={() => handleAccept(request)}
                                            disabled={!!inFlight}
                                            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            <IconCheckCircle className="w-3.5 h-3.5" />
                                            {inFlight === 'accept' ? 'Confirming...' : 'Accept'}
                                        </button>
                                        <button
                                            onClick={() => openAltForm(request)}
                                            disabled={!!inFlight}
                                            className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 transition disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            <IconAlertTriangle className="w-3.5 h-3.5" />
                                            Suggest Alternative
                                        </button>
                                    </div>
                                )}

                                {/* Inline suggest-alternative form */}
                                {isAltFormOpen && (
                                    <div className="space-y-2.5 pt-1 border-t border-slate-200">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                                            Suggested availability
                                        </label>
                                        <textarea
                                            rows={3}
                                            autoFocus
                                            value={altMessage}
                                            onChange={(e) => setAltMessage(e.target.value)}
                                            placeholder="e.g. We are unavailable on the requested date. We can perform the checkup on Oct 1 or Oct 2 between 9:00 AM and 4:00 PM."
                                            className="w-full p-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-500 transition placeholder:text-slate-400 leading-relaxed"
                                        />
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => submitAlternative(request)}
                                                disabled={inFlight === 'alternative'}
                                                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
                                            >
                                                {inFlight === 'alternative' ? 'Sending...' : 'Send to Owner'}
                                            </button>
                                            <button
                                                onClick={cancelAltForm}
                                                disabled={inFlight === 'alternative'}
                                                className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200 transition"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}