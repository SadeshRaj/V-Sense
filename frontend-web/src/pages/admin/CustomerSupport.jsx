import { useState, useEffect, useRef } from 'react';
import * as signalR from '@microsoft/signalr';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const HUB_URL = API_BASE.replace('/api', '/hubs/support');

export default function CustomerSupport() {
    const [conversations, setConversations] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingConvs, setIsLoadingConvs] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [stagedAttachment, setStagedAttachment] = useState(null);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [showCanned, setShowCanned] = useState(false);

    const cannedResponses = [
        "Hello! How can we help you today?",
        "Could you please provide your vehicle registration number?",
        "Your document has been successfully verified.",
        "Please hold on while I check this for you.",
        "Your ticket has been marked as resolved. Have a great day!"
    ];

    const [fullscreenImg, setFullscreenImg] = useState(null);
    const [showScrollDown, setShowScrollDown] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);

    const chatEndRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const fileInputRef = useRef(null);
    const connectionRef = useRef(null);
    const token = localStorage.getItem('token');

    const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
    };

    const formatLocalTime = (dateString) => {
        if (!dateString) return '';
        const safeString = dateString.endsWith('Z') ? dateString : `${dateString}Z`;
        return new Date(safeString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const scrollToBottom = (behavior = 'smooth') => {
        chatEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        scrollToBottom('auto');
    }, [messages, selectedUser]);

    const fetchConversations = async () => {
        try {
            const res = await fetch(`${API_BASE}/support/admin/conversations`, { headers: authHeaders });
            if (res.ok) {
                const data = await res.json();
                setConversations(data);
            }
        } catch (err) {
            console.error('Failed to load conversations:', err);
        } finally {
            setIsLoadingConvs(false);
        }
    };

    const fetchMessages = async (userId) => {
        try {
            const res = await fetch(`${API_BASE}/support/admin/conversation/${userId}`, { headers: authHeaders });
            if (res.ok) {
                const data = await res.json();
                setMessages(data);
                setConversations(prev => prev.map(c => c.userId === userId ? { ...c, unreadCount: 0 } : c));
            }
        } catch (err) {
            console.error('Failed to load messages:', err);
        }
    };

    useEffect(() => {
        fetchConversations();

        const connectSignalR = async () => {
            const newConnection = new signalR.HubConnectionBuilder()
                .withUrl(HUB_URL, { accessTokenFactory: () => token })
                .withAutomaticReconnect()
                .build();

            newConnection.on("ConversationUpdated", () => {
                fetchConversations();
            });

            newConnection.on("ReceiveMessage", (msg) => {
                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            });

            newConnection.on("TicketStatusChanged", (newStatus) => {
                setSelectedUser(prev => prev ? { ...prev, status: newStatus } : prev);
                fetchConversations();
            });

            try {
                await newConnection.start();
                connectionRef.current = newConnection;
            } catch (err) {
                console.error("SignalR Connection Error: ", err);
            }
        };

        connectSignalR();

        return () => {
            if (connectionRef.current) {
                connectionRef.current.stop();
            }
        };
    }, []);

    const handleSelectConversation = async (conv) => {
        setSelectedUser(conv);
        setStagedAttachment(null);
        setReplyingTo(null);
        setShowCanned(false);
        fetchMessages(conv.userId);

        if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
            try {
                await connectionRef.current.invoke("JoinChat", conv.userId);
            } catch (err) {
                console.error("Failed to join chat group:", err);
            }
        }
    };

    const handleToggleStatus = async () => {
        if (!selectedUser || statusUpdating) return;
        setStatusUpdating(true);
        const newStatus = selectedUser.status === 'Resolved' ? 'Open' : 'Resolved';

        try {
            const res = await fetch(`${API_BASE}/support/admin/ticket-status/${selectedUser.userId}`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify(newStatus)
            });
            if (res.ok) {
                setSelectedUser(prev => ({ ...prev, status: newStatus }));
                fetchConversations();
            }
        } catch (error) {
            console.error("Failed to update status", error);
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        const distanceToBottom = scrollHeight - scrollTop - clientHeight;
        setShowScrollDown(distanceToBottom > 150);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE}/support/upload-attachment`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setStagedAttachment({ url: data.url, name: file.name, isImage: file.type.startsWith('image/') });
            } else {
                alert('Failed to upload file.');
            }
        } catch (err) {
            console.error('Attachment upload failed:', err);
            alert('Upload error occurred.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!inputText.trim() && !stagedAttachment) || !selectedUser || isSending) return;

        let textToSend = inputText.trim();

        if (replyingTo) {
            let quoteText = replyingTo.message;
            if (!quoteText || quoteText.trim() === '') quoteText = 'Attached Document';
            textToSend = `[REPLY_TO]${quoteText}[/REPLY_TO]\n${textToSend}`;
        }

        const attachmentUrl = stagedAttachment?.url || null;

        setInputText('');
        setStagedAttachment(null);
        setReplyingTo(null);
        setShowCanned(false);
        setIsSending(true);

        try {
            const res = await fetch(`${API_BASE}/support/admin/reply`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({
                    userId: selectedUser.userId,
                    message: textToSend,
                    attachmentUrl: attachmentUrl
                })
            });

            if (res.ok) {
                const savedMsg = await res.json();
                setMessages(prev => {
                    if (prev.some(m => m.id === savedMsg.id)) return prev;
                    return [...prev, savedMsg];
                });

                // AUTO REOPEN TICKET ON REPLY
                if (selectedUser.status === 'Resolved') {
                    setSelectedUser(prev => ({ ...prev, status: 'Open' }));
                    fetchConversations();
                }

                scrollToBottom();
            }
        } catch (err) {
            console.error('Failed to send reply:', err);
        } finally {
            setIsSending(false);
        }
    };

    const isImageFile = (url) => {
        return /\.(jpg|jpeg|png|webp|gif)$/i.test(url) || url.includes('/image/upload/');
    };

    const parseMessageContent = (rawText) => {
        if (!rawText) return { quote: null, mainText: '' };
        const match = rawText.match(/^\[REPLY_TO\]([\s\S]*?)\[\/REPLY_TO\]\n?([\s\S]*)$/);
        if (match) {
            return { quote: match[1], mainText: match[2] };
        }
        return { quote: null, mainText: rawText };
    };

    const filteredConversations = conversations.filter(c =>
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.nic && c.nic.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="h-[calc(100vh-8.5rem)] flex bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden relative">
            {fullscreenImg && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 p-4 cursor-zoom-out backdrop-blur-md transition-all"
                    onClick={() => setFullscreenImg(null)}
                >
                    <img src={fullscreenImg} alt="Fullscreen view" className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain" />
                    <button
                        className="absolute top-6 right-6 text-white bg-white/20 hover:bg-white/30 rounded-full p-2.5 transition-colors"
                        onClick={() => setFullscreenImg(null)}
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            )}

            {/* Sidebar */}
            <div className="w-80 md:w-96 border-r border-slate-200 flex flex-col bg-slate-50/80">
                <div className="p-5 border-b border-slate-200 bg-white">
                    <h2 className="text-xl font-extrabold text-slate-800 mb-4 tracking-tight">Messages</h2>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search client or NIC..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoadingConvs ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-3">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm text-slate-400 font-medium">Loading inquiries...</span>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-400 font-medium">No support requests found</div>
                    ) : (
                        filteredConversations.map((conv) => {
                            const isSelected = selectedUser?.userId === conv.userId;
                            const isResolved = conv.status === 'Resolved';

                            let previewText = conv.lastMessage || '';
                            if (previewText.startsWith('[REPLY_TO]')) {
                                previewText = previewText.replace(/^\[REPLY_TO\][\s\S]*?\[\/REPLY_TO\]\n?/, 'Reply: ');
                            }

                            return (
                                <button
                                    key={conv.userId}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`w-full text-left p-4 flex items-start gap-4 transition-all duration-200 border-b border-slate-100 ${
                                        isSelected ? 'bg-blue-50 hover:bg-blue-50' : 'bg-white hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        {/* Show Profile Picture if exists, otherwise Initial */}
                                        {conv.profilePictureUrl ? (
                                            <img src={conv.profilePictureUrl} alt={conv.fullName} className={`w-12 h-12 rounded-full object-cover shadow-sm ${isResolved ? 'grayscale opacity-70' : ''}`} />
                                        ) : (
                                            <div className={`w-12 h-12 rounded-full font-bold flex items-center justify-center text-lg shadow-sm ${isResolved ? 'bg-slate-200 text-slate-600' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'}`}>
                                                {conv.fullName?.charAt(0) || 'C'}
                                            </div>
                                        )}

                                        {conv.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white shadow-sm">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                        {isSelected && <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-blue-600 rounded-r-full"></div>}
                                    </div>
                                    <div className="flex-1 min-w-0 py-0.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-sm font-bold text-slate-900 truncate">{conv.fullName}</h4>
                                                {isResolved && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wide border border-slate-200">RESOLVED</span>}
                                            </div>
                                            <span className="text-[11px] font-medium text-slate-400 whitespace-nowrap">
                                                {formatLocalTime(conv.lastMessageAt)}
                                            </span>
                                        </div>
                                        <p className={`text-sm mt-1 truncate ${conv.unreadCount > 0 ? 'font-semibold text-slate-800' : 'text-slate-500'}`}>
                                            {previewText}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            {selectedUser ? (
                <div className="flex-1 flex flex-col bg-[#f0f2f5] relative">
                    {/* Header */}
                    <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
                        <div className="flex items-center gap-4">
                            {/* Profile Picture in Header */}
                            {selectedUser.profilePictureUrl ? (
                                <img src={selectedUser.profilePictureUrl} alt={selectedUser.fullName} className={`w-11 h-11 rounded-full object-cover shadow-sm ${selectedUser.status === 'Resolved' ? 'grayscale opacity-70' : ''}`} />
                            ) : (
                                <div className={`w-11 h-11 rounded-full font-bold flex items-center justify-center shadow-sm ${selectedUser.status === 'Resolved' ? 'bg-slate-300 text-slate-700' : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'}`}>
                                    {selectedUser.fullName?.charAt(0) || 'C'}
                                </div>
                            )}

                            <div>
                                <h3 className="text-base font-extrabold text-slate-900 leading-tight">{selectedUser.fullName}</h3>
                                <div className="flex items-center gap-3 text-xs font-medium text-slate-500 mt-1">
                                    <span>Phone: <span className="text-slate-700">{selectedUser.phoneNumber}</span></span>
                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                    <span>NIC: <span className="text-slate-700">{selectedUser.nic || 'N/A'}</span></span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleToggleStatus}
                            disabled={statusUpdating}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                                selectedUser.status === 'Resolved'
                                    ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                        >
                            {statusUpdating ? (
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={selectedUser.status === 'Resolved' ? 'M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6' : 'M5 13l4 4L19 7'} />
                                </svg>
                            )}
                            {selectedUser.status === 'Resolved' ? 'Reopen Ticket' : 'Mark Resolved'}
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        className="flex-1 overflow-y-auto p-6 space-y-6 relative"
                        onScroll={handleScroll}
                        ref={scrollContainerRef}
                    >
                        {messages.map((msg) => {
                            const isAdmin = msg.senderType === 'Admin';
                            const hasAttachment = Boolean(msg.attachmentUrl);
                            const isImg = hasAttachment && isImageFile(msg.attachmentUrl);
                            const { quote, mainText } = parseMessageContent(msg.message);

                            const viewUrl = hasAttachment
                                ? msg.attachmentUrl.replace('/raw/upload/fl_attachment/', '/raw/upload/').replace('/fl_attachment/', '/')
                                : null;

                            return (
                                <div key={msg.id} className={`flex flex-col group ${isAdmin ? 'items-end' : 'items-start'}`}>
                                    <div className="text-xs font-semibold text-slate-400 mb-1.5 px-2 flex items-center gap-2">
                                        {!isAdmin && <span className="text-slate-500">{selectedUser.fullName}</span>}
                                        {isAdmin && <span>You</span>}
                                    </div>

                                    <div className={`relative flex items-center gap-3 max-w-[75%] ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
                                        <button
                                            onClick={() => setReplyingTo(msg)}
                                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-blue-600 transition-all p-2 bg-white rounded-full shadow-sm hover:shadow"
                                            title="Reply"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                        </button>

                                        <div
                                            className={`px-5 py-3 rounded-2xl text-[15px] leading-relaxed shadow-sm relative ${
                                                isAdmin
                                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-sm'
                                            }`}
                                        >
                                            {quote && (
                                                <div className={`mb-3 p-3 rounded-xl text-sm border-l-4 ${isAdmin ? 'bg-black/15 border-white text-blue-50' : 'bg-slate-100 border-slate-400 text-slate-700'}`}>
                                                    <div className="font-bold mb-1 opacity-90 text-[11px] uppercase tracking-wide">Replying to</div>
                                                    <div className="line-clamp-2 italic opacity-90">{quote}</div>
                                                </div>
                                            )}

                                            {hasAttachment && (
                                                <div className="mb-2">
                                                    {isImg ? (
                                                        <div
                                                            onClick={() => setFullscreenImg(msg.attachmentUrl)}
                                                            className="block overflow-hidden rounded-xl cursor-pointer bg-black/5"
                                                        >
                                                            <img src={msg.attachmentUrl} alt="Attachment" className="max-h-64 rounded-xl object-cover hover:opacity-90 transition-opacity" />
                                                        </div>
                                                    ) : (
                                                        <a
                                                            href={viewUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={`flex items-center gap-3 p-3 rounded-xl border text-sm font-bold transition-colors ${isAdmin ? 'bg-blue-700/50 border-blue-400 text-white hover:bg-blue-800' : 'bg-slate-50 border-slate-200 text-blue-600 hover:bg-slate-100'}`}
                                                        >
                                                            <div className={`p-2 rounded-lg ${isAdmin ? 'bg-white/20' : 'bg-blue-100'}`}>
                                                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                </svg>
                                                            </div>
                                                            <span className="truncate flex-1">View Document</span>
                                                        </a>
                                                    )}
                                                </div>
                                            )}

                                            {mainText && <p className="whitespace-pre-wrap break-words">{mainText}</p>}

                                            <div className={`text-[11px] mt-2 font-medium flex items-center justify-end gap-1.5 ${isAdmin ? 'text-blue-200' : 'text-slate-400'}`}>
                                                <span>{formatLocalTime(msg.createdAt)}</span>
                                                {isAdmin && (
                                                    <svg className={`w-3.5 h-3.5 ${msg.isReadByClient ? 'text-blue-200' : 'opacity-70'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} className="h-4" />
                    </div>

                    {showScrollDown && (
                        <button
                            onClick={() => scrollToBottom()}
                            className="absolute bottom-28 right-8 bg-white border border-slate-200 shadow-xl text-slate-600 rounded-full p-3 hover:bg-slate-50 hover:text-blue-600 transition-all z-20"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                            </svg>
                        </button>
                    )}

                    {/* Input Area */}
                    <div className="bg-white border-t border-slate-200 flex flex-col relative shadow-sm">
                        {showCanned && (
                            <div className="absolute bottom-full left-4 right-4 mb-3 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 flex gap-2 overflow-x-auto z-20 custom-scrollbar">
                                {cannedResponses.map((res, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setInputText(res);
                                            setShowCanned(false);
                                        }}
                                        className="whitespace-nowrap px-4 py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-sm font-semibold rounded-xl border border-slate-200 hover:border-blue-200 transition-colors"
                                    >
                                        {res}
                                    </button>
                                ))}
                            </div>
                        )}

                        {replyingTo && (
                            <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-sm">
                                <div className="flex-1 truncate border-l-4 border-blue-500 pl-4 py-1">
                                    <span className="font-bold text-blue-600 block mb-1 uppercase tracking-wide text-xs">Replying to message</span>
                                    <span className="truncate text-slate-600 italic block font-medium">
                                        {parseMessageContent(replyingTo.message).mainText || 'Attached Document'}
                                    </span>
                                </div>
                                <button type="button" onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-red-500 ml-4 p-2 bg-white rounded-full shadow-sm hover:shadow transition-all">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        )}

                        {stagedAttachment && (
                            <div className="px-6 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3 truncate text-blue-800">
                                    <div className="p-2 bg-blue-100 rounded-lg">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    </div>
                                    <span className="font-semibold truncate">{stagedAttachment.name}</span>
                                </div>
                                <button type="button" onClick={() => setStagedAttachment(null)} className="text-red-500 hover:text-red-700 font-bold px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors text-xs uppercase tracking-wide">Remove</button>
                            </div>
                        )}

                        <form onSubmit={handleSendMessage} className="px-6 py-4 flex items-end gap-3">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf,.doc,.docx" />

                            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                                <button
                                    type="button"
                                    disabled={isUploading}
                                    onClick={() => fileInputRef.current?.click()}
                                    title="Attach Document or Image"
                                    className="p-3 rounded-xl hover:bg-white hover:shadow-sm text-slate-500 hover:text-blue-600 transition-all disabled:opacity-50 cursor-pointer shrink-0"
                                >
                                    {isUploading ? (
                                        <span className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin block"></span>
                                    ) : (
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCanned(!showCanned)}
                                    title="Canned Responses"
                                    className={`p-3 rounded-xl transition-all shrink-0 ${showCanned ? 'bg-white shadow-sm text-blue-600' : 'hover:bg-white hover:shadow-sm text-slate-500 hover:text-blue-600'}`}
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                                </button>
                            </div>

                            <div className="flex-1 bg-slate-100 rounded-3xl border border-slate-200 flex items-center pr-2 focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
                                <textarea
                                    rows="1"
                                    placeholder={selectedUser.status === 'Resolved' ? 'Ticket is resolved. Type to reopen...' : 'Type a response...'}
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage(e);
                                        }
                                    }}
                                    className="flex-1 px-5 py-3.5 bg-transparent text-[15px] resize-none focus:outline-none max-h-32 custom-scrollbar"
                                />
                                <button
                                    type="submit"
                                    disabled={(!inputText.trim() && !stagedAttachment) || isSending}
                                    className="p-3 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 hover:shadow-lg disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center shrink-0 cursor-pointer"
                                >
                                    <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-[#f0f2f5]">
                    <div className="w-24 h-24 rounded-full bg-white shadow-sm flex items-center justify-center mb-6">
                        <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </div>
                    <h3 className="text-xl font-extrabold text-slate-700">Support Chat Inbox</h3>
                    <p className="text-base text-slate-500 max-w-md mt-2 font-medium">Select an active customer conversation on the left to read messages and reply in real time.</p>
                </div>
            )}
        </div>
    );
}