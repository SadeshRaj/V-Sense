import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const token = localStorage.getItem('token');

    const authHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
    };

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
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(() => {
            fetchConversations();
            if (selectedUser) {
                fetchMessages(selectedUser.userId);
            }
        }, 3500);
        return () => clearInterval(interval);
    }, [selectedUser]);

    const handleSelectConversation = (conv) => {
        setSelectedUser(conv);
        setStagedAttachment(null);
        fetchMessages(conv.userId);
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
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                setStagedAttachment({ url: data.url, name: file.name, isImage: file.type.startsWith('image/') });
            } else {
                alert('Failed to upload file to Cloudinary.');
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

        const textToSend = inputText.trim();
        const attachmentUrl = stagedAttachment?.url || null;

        setInputText('');
        setStagedAttachment(null);
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
                const newMsg = await res.json();
                setMessages(prev => [...prev, newMsg]);
                fetchConversations();
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

    const filteredConversations = conversations.filter(c =>
        c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-[calc(100vh-8.5rem)] flex bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Conversation List */}
            <div className="w-80 md:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50">
                <div className="p-4 border-b border-slate-200 bg-white">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search client..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-100 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
                        />
                        <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                    {isLoadingConvs ? (
                        <div className="p-8 text-center text-sm text-slate-400">Loading inquiries...</div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-400">No support requests found</div>
                    ) : (
                        filteredConversations.map((conv) => {
                            const isSelected = selectedUser?.userId === conv.userId;
                            return (
                                <button
                                    key={conv.userId}
                                    onClick={() => handleSelectConversation(conv)}
                                    className={`w-full text-left p-4 flex items-start gap-3 transition-colors ${
                                        isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/70 bg-white'
                                    }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-base">
                                            {conv.fullName?.charAt(0) || 'C'}
                                        </div>
                                        {conv.unreadCount > 0 && (
                                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center border-2 border-white">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-semibold text-slate-900 truncate">{conv.fullName}</h4>
                                            <span className="text-[11px] text-slate-400 ml-2 whitespace-nowrap">
                                                {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">{conv.email}</p>
                                        <p className={`text-xs mt-1 truncate ${conv.unreadCount > 0 ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                                            {conv.lastMessage}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Workspace */}
            {selectedUser ? (
                <div className="flex-1 flex flex-col bg-slate-50">
                    <div className="px-6 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                                {selectedUser.fullName?.charAt(0) || 'C'}
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 leading-tight">{selectedUser.fullName}</h3>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                    <span>Phone: <strong className="text-slate-700">{selectedUser.phoneNumber}</strong></span>
                                    <span>•</span>
                                    <span>NIC: <strong className="text-slate-700">{selectedUser.NIC}</strong></span>
                                    <span>•</span>
                                    <span>{selectedUser.email}</span>
                                </div>
                            </div>
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Active
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {messages.map((msg) => {
                            const isAdmin = msg.senderType === 'Admin';
                            const hasAttachment = Boolean(msg.attachmentUrl);
                            const isImg = hasAttachment && isImageFile(msg.attachmentUrl);

                            return (
                                <div key={msg.id} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                                    <div className="text-[11px] text-slate-400 mb-1 px-1">
                                        {isAdmin ? 'You (Support)' : selectedUser.fullName}
                                    </div>
                                    <div
                                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                            isAdmin
                                                ? 'bg-blue-600 text-white rounded-br-none'
                                                : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                                        }`}
                                    >
                                        {/* Attachment Display */}
                                        {hasAttachment && (
                                            <div className="mb-2">
                                                {isImg ? (
                                                    <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-lg">
                                                        <img
                                                            src={msg.attachmentUrl}
                                                            alt="Attachment"
                                                            className="max-h-60 rounded-lg object-cover hover:opacity-90 transition-opacity"
                                                        />
                                                    </a>
                                                ) : (
                                                    <a
                                                        href={msg.attachmentUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                                                            isAdmin
                                                                ? 'bg-blue-700/50 border-blue-400 text-white hover:bg-blue-700'
                                                                : 'bg-slate-50 border-slate-200 text-blue-600 hover:bg-slate-100'
                                                        }`}
                                                    >
                                                        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                        </svg>
                                                        <span className="truncate flex-1">View Attached Document</span>
                                                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                )}
                                            </div>
                                        )}

                                        {msg.message && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}

                                        <div className={`text-[10px] mt-1 text-right ${isAdmin ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Staged Attachment Preview */}
                    {stagedAttachment && (
                        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center justify-between text-xs text-blue-800">
                            <div className="flex items-center gap-2 truncate">
                                <span className="font-semibold">Attached:</span>
                                <span className="truncate">{stagedAttachment.name}</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setStagedAttachment(null)}
                                className="text-red-500 hover:text-red-700 font-bold ml-2 cursor-pointer"
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    {/* Chat Input & File Attachment Button */}
                    <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,.pdf,.doc,.docx"
                        />

                        <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => fileInputRef.current?.click()}
                            title="Attach Document or Image"
                            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {isUploading ? (
                                <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin block"></span>
                            ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                </svg>
                            )}
                        </button>

                        <input
                            type="text"
                            placeholder="Type a response to the customer..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                        />

                        <button
                            type="submit"
                            disabled={(!inputText.trim() && !stagedAttachment) || isSending}
                            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            <span>Send</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                        <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                    </div>
                    <h3 className="text-base font-semibold text-slate-700">Support Chat Inbox</h3>
                    <p className="text-sm text-slate-500 max-w-sm mt-1">Select an active customer conversation on the left to read messages and reply in real time.</p>
                </div>
            )}
        </div>
    );
}