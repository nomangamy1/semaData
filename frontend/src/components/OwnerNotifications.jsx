import React, { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';

const OwnerNotifications = () => {
    const [notifications, setNotifications] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const response = await fetch('/api/domain-notifications', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Could not load admin messages.');
                setNotifications(data);
            } catch (fetchError) {
                setError(fetchError.message || 'Could not load admin messages.');
            }
        };
        fetchNotifications();
    }, []);

    const markAsRead = async (notificationId) => {
        setError('');
        try {
            const response = await fetch(`/api/domain-notifications/${notificationId}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not update message status.');
            setNotifications((current) => current.map((notification) =>
                notification.id === notificationId ? { ...notification, is_read: true } : notification
            ));
        } catch (updateError) {
            setError(updateError.message || 'Could not update message status.');
        }
    };

    return (
        <section className="mb-8 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
                <Bell size={18} className="text-sky-700" />
                <h2 className="font-black text-slate-800">Messages from the review team</h2>
                {notifications.some((notification) => !notification.is_read) && (
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                        {notifications.filter((notification) => !notification.is_read).length} new
                    </span>
                )}
            </div>
            {error && <p className="mb-3 text-sm text-rose-700" role="alert">{error}</p>}
            {!notifications.length ? (
                <p className="text-sm text-slate-500">No review-team messages yet.</p>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <article
                            key={notification.id}
                            className={`rounded-xl border p-4 ${notification.is_read ? 'border-slate-100 bg-slate-50' : 'border-sky-200 bg-sky-50/60'}`}
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase text-slate-500">
                                        {notification.domain_name} · {notification.sender_name}
                                    </p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{notification.message}</p>
                                    <p className="mt-2 text-xs text-slate-400">
                                        {new Date(notification.created_at).toLocaleString()}
                                    </p>
                                </div>
                                {!notification.is_read && (
                                    <button
                                        type="button"
                                        onClick={() => markAsRead(notification.id)}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-800 hover:bg-sky-100"
                                    >
                                        <Check size={14} /> Mark read
                                    </button>
                                )}
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </section>
    );
};

export default OwnerNotifications;
