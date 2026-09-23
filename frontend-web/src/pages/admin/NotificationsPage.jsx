import React, { useState, useEffect } from 'react';
import { sendBroadcastNotification, getMyNotifications, getSentNotifications, markAsRead, uploadNotificationImage, deleteNotification } from '../../api/notifications';

export default function NotificationsPage() {
    const user = JSON.parse(localStorage.getItem('user'));
    const isAdmin = user?.role === 'Admin' || user?.role === 'Administrator';

    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('Promotional');
    const [imageFiles, setImageFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [sentNotifications, setSentNotifications] = useState([]);

    useEffect(() => {
        if (!isAdmin) {
            fetchNotifications();
        } else {
            fetchSentNotifications();
        }
    }, [isAdmin]);

    const fetchNotifications = async () => {
        try {
            const data = await getMyNotifications();
            setNotifications(data);
        } catch (error) {
            console.error("Failed to load notifications", error);
        }
    };

    const fetchSentNotifications = async () => {
        try {
            const data = await getSentNotifications();
            setSentNotifications(data);
        } catch (error) {
            console.error("Failed to load sent notifications", error);
        }
    };

    const handleRead = async (id, isRead) => {
        if (isRead) return;
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        await markAsRead(id);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this notification for all users?')) {
            try {
                await deleteNotification(id);
                setSentNotifications(prev => prev.filter(n => n.id !== id));
                setStatus({ type: 'success', text: 'Notification successfully deleted.' });
            } catch (error) {
                setStatus({ type: 'error', text: 'Failed to delete notification.' });
            }
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 3) {
            alert('You can only upload a maximum of 3 images.');
            setImageFiles(files.slice(0, 3));
        } else {
            setImageFiles(files);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            // Upload all selected images to backend first
            const uploadedUrls = [];
            for (const file of imageFiles) {
                setStatus({ type: 'info', text: `Uploading image ${uploadedUrls.length + 1} of ${imageFiles.length}...` });
                const url = await uploadNotificationImage(file);
                uploadedUrls.push(url);
            }

            const imageUrl = uploadedUrls.join(',');

            setStatus({ type: 'info', text: 'Sending notification...' });
            await sendBroadcastNotification({ title, message, category, imageUrl });
            
            setStatus({ type: 'success', text: 'Broadcast notification sent to all users!' });
            setTitle('');
            setMessage('');
            setImageFiles([]);
            // Reset file input
            document.getElementById('file-upload').value = '';
            
            // Refresh list
            fetchSentNotifications();
        } catch (error) {
            setStatus({ type: 'error', text: error.message || 'Failed to send notification.' });
        } finally {
            setLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold text-slate-800 mb-6">My Notifications</h2>
                {notifications.length === 0 ? (
                    <p className="text-slate-500">No notifications yet.</p>
                ) : (
                    <div className="space-y-4">
                        {notifications.map(n => (
                            <div 
                                key={n.id} 
                                onClick={() => handleRead(n.id, n.isRead)}
                                className={`p-5 rounded-xl border cursor-pointer transition-colors ${n.isRead ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 shadow-sm'}`}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="relative">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${n.category === 'Promotional' ? 'bg-[#ff3366]' : 'bg-blue-500'}`}>
                                            {n.category === 'Promotional' ? (
                                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                </svg>
                                            )}
                                        </div>
                                        {!n.isRead && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-600 border-2 border-white rounded-full"></span>}
                                    </div>
                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-bold text-slate-800 leading-tight">{n.title}</h3>
                                        <span className="text-sm text-slate-500 mt-0.5">
                                            {new Date(n.createdAt).toLocaleDateString() === new Date().toLocaleDateString() 
                                                ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                : new Date(n.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {n.imageUrl && (
                                    <div className="flex flex-col gap-3 mb-3">
                                        {n.imageUrl.split(',').filter(Boolean).map((url, i) => (
                                            <img key={i} src={url} alt={`Notification ${i+1}`} className="w-full h-48 object-cover rounded-lg" />
                                        ))}
                                    </div>
                                )}
                                <p className="text-slate-600 whitespace-pre-wrap">{n.message}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Send Broadcast Notification</h2>
            
            {status && (
                <div className={`p-4 mb-6 rounded-lg ${
                    status.type === 'success' ? 'bg-green-50 text-green-800' : 
                    status.type === 'error' ? 'bg-red-50 text-red-800' : 
                    'bg-blue-50 text-blue-800'
                }`}>
                    {status.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                    <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Summer Discount!"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="Promotional">Promotional</option>
                        <option value="Reminder">Reminder</option>
                        <option value="Urgent">Urgent</option>
                        <option value="System">System</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                    <textarea
                        required
                        rows="4"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Write your message here..."
                    ></textarea>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Upload Images (Max 3)</label>
                    <input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFileChange}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {imageFiles.length > 0 && (
                        <p className="text-xs text-slate-500 mt-2">
                            {imageFiles.length} file(s) selected
                        </p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {loading ? 'Processing...' : 'Send to All Users'}
                </button>
            </form>

            <div className="mt-12 pt-8 border-t border-slate-200">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Previously Sent Broadcasts</h3>
                {sentNotifications.length === 0 ? (
                    <p className="text-slate-500">No broadcasts sent yet.</p>
                ) : (
                    <div className="space-y-4">
                        {sentNotifications.map(n => (
                            <div key={n.id} className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-start gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${n.category === 'Promotional' ? 'bg-[#ff3366]' : 'bg-blue-500'}`}>
                                            {n.category === 'Promotional' ? (
                                                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <h4 className="text-lg font-bold text-slate-800 leading-tight">{n.title}</h4>
                                            <span className="text-sm text-slate-500 mt-0.5">
                                                {new Date(n.createdAt).toLocaleDateString() === new Date().toLocaleDateString() 
                                                    ? new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                    : new Date(n.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(n.id)}
                                        className="text-red-500 hover:text-red-700 p-1"
                                        title="Delete for all users"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                
                                {n.imageUrl && (
                                    <div className="flex gap-2 mb-3 overflow-x-auto">
                                        {n.imageUrl.split(',').filter(Boolean).map((url, i) => (
                                            <img key={i} src={url} alt="thumbnail" className="h-24 object-cover rounded shadow-sm border border-slate-200" />
                                        ))}
                                    </div>
                                )}
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{n.message}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
