import React, { useEffect, useState } from 'react';
import { Activity, Database, Globe, X } from 'lucide-react';
import './AdminShared.css';

const formatMoney = (amount, currency = 'KES') => {
    try {
        return new Intl.NumberFormat(undefined, {
            style: 'currency',
            currency,
            maximumFractionDigits: 2,
        }).format(Number(amount) || 0);
    } catch {
        return `${currency} ${Number(amount) || 0}`;
    }
};

const DomainsTable = () => {
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [review, setReview] = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewError, setReviewError] = useState('');
    const [message, setMessage] = useState('');
    const [messageState, setMessageState] = useState('');
    const [sending, setSending] = useState(false);
    const [decisionState, setDecisionState] = useState('');
    const [savingDecision, setSavingDecision] = useState(false);

    useEffect(() => {
        const fetchDomains = async () => {
            try {
                const response = await fetch('/api/admin/all-domains', {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Could not load registered domains.');
                setDomains(data);
            } catch (fetchError) {
                setError(fetchError.message || 'Could not load registered domains.');
            } finally {
                setLoading(false);
            }
        };
        fetchDomains();
    }, []);

    const openReview = async (domain) => {
        setSelectedDomain(domain);
        setReview(null);
        setReviewError('');
        setMessage('');
        setMessageState('');
        setDecisionState('');
        setReviewLoading(true);
        try {
            const response = await fetch(`/api/admin/domains/${domain.id}/review`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not load domain review details.');
            setReview(data);
        } catch (fetchError) {
            setReviewError(fetchError.message || 'Could not load domain review details.');
        } finally {
            setReviewLoading(false);
        }
    };

    const saveDecision = async (decision) => {
        const label = decision === 'accepted' ? 'accept' : 'reject';
        if (!window.confirm(`Record this domain as ${decision}? This will not change payment or collection activation.`)) {
            return;
        }

        setSavingDecision(true);
        setDecisionState('');
        try {
            const response = await fetch(`/api/admin/domains/${selectedDomain.id}/decision`, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ decision }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Could not ${label} this domain.`);

            setReview((current) => ({
                ...current,
                domain: {
                    ...current.domain,
                    review_status: data.review_status,
                    reviewed_at: data.reviewed_at,
                },
            }));
            setDomains((current) => current.map((domain) =>
                domain.id === selectedDomain.id
                    ? { ...domain, review_status: data.review_status, reviewed_at: data.reviewed_at }
                    : domain
            ));
            setDecisionState(`Domain ${decision}. Payment and collection activation are unchanged.`);
        } catch (decisionError) {
            setDecisionState(decisionError.message || `Could not ${label} this domain.`);
        } finally {
            setSavingDecision(false);
        }
    };

    const sendMessage = async (event) => {
        event.preventDefault();
        if (!message.trim()) {
            setMessageState('Write a message before sending.');
            return;
        }

        setSending(true);
        setMessageState('');
        try {
            const response = await fetch(`/api/admin/domains/${selectedDomain.id}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not send the message.');
            setMessage('');
            setMessageState('Message sent to the domain owner.');
        } catch (sendError) {
            setMessageState(sendError.message || 'Could not send the message.');
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return <div className="py-12 text-center text-slate-400 font-medium">Loading registered domains...</div>;
    }

    if (error) {
        return <div className="p-6 rounded-2xl bg-rose-50 text-rose-700" role="alert">{error}</div>;
    }

    if (!domains.length) {
        return (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
                <Globe className="mx-auto text-slate-300 mb-4" size={64} />
                <h3 className="text-xl font-bold text-slate-600 mb-2">No Registered Domains Found</h3>
                <p className="text-slate-500">Domain collection projects will appear here once registered.</p>
            </div>
        );
    }

    return (
        <>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-x-auto">
                <table className="w-full text-left min-w-[760px]">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Domain and owner</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Payment</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Admin review</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Collection</th>
                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Dataset review</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {domains.map((domain) => (
                            <tr key={domain.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-5">
                                    <p className="font-bold text-slate-800">{domain.domain_name || domain.name || 'Unnamed Domain'}</p>
                                    <p className="text-xs text-slate-500">Owner ID: #{domain.owner_id || 'Unknown'}</p>
                                    <code className="text-xs text-slate-400">{domain.reference_number}</code>
                                </td>
                                <td className="px-6 py-5">
                                    <p className="text-sm font-bold text-slate-800">{formatMoney(domain.amount_paid)}</p>
                                    <p className="text-xs text-slate-500">of {formatMoney(domain.total_budget)}</p>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                                        domain.review_status === 'accepted'
                                            ? 'bg-emerald-50 text-emerald-700'
                                            : domain.review_status === 'rejected'
                                                ? 'bg-rose-50 text-rose-700'
                                                : 'bg-amber-50 text-amber-700'
                                    }`}>
                                        {domain.review_status || 'pending'}
                                    </span>
                                </td>
                                <td className="px-6 py-5">
                                    <span className={`flex items-center gap-1.5 text-xs font-bold ${
                                        domain.is_active ? 'text-emerald-600' : 'text-amber-600'
                                    }`}>
                                        <Activity size={14} />
                                        {domain.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                    <p className="mt-1 text-xs text-slate-500">Payment: {domain.payment_status || domain.status}</p>
                                </td>
                                <td className="px-6 py-5">
                                    <button
                                        type="button"
                                        onClick={() => openReview(domain)}
                                        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
                                    >
                                        <Database size={15} /> Inspect
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {selectedDomain && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="domain-review-title"
                        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl"
                    >
                        <header className="flex items-start justify-between border-b border-slate-200 bg-white p-6">
                            <div>
                                <h2 id="domain-review-title" className="text-xl font-black text-slate-900">
                                    {review?.domain?.name || selectedDomain.domain_name || selectedDomain.name}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Data quality and ML-readiness review · Owner #{selectedDomain.owner_id}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedDomain(null)}
                                aria-label="Close domain review"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </header>

                        <div className="space-y-6 overflow-y-auto p-6">
                            {reviewLoading && <p className="text-slate-500">Loading dataset and payment details...</p>}
                            {reviewError && <p className="rounded-xl bg-rose-50 p-4 text-rose-700" role="alert">{reviewError}</p>}
                            {review && (
                                <>
                                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-4">
                                            <div>
                                                <h3 className="font-black text-slate-800">Admin decision</h3>
                                                <p className="mt-1 text-sm text-slate-600">
                                                    Review: <strong className="capitalize">{review.domain.review_status || 'pending'}</strong>
                                                    {' · '}Payment: <strong>{review.domain.payment_status || 'unknown'}</strong>
                                                    {' · '}Collection: <strong>{review.domain.is_active ? 'active' : 'inactive'}</strong>
                                                </p>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Decision does not change payment or collection activation and does not send an automatic owner message.
                                                    {review.domain.reviewed_at && ` Last updated ${new Date(review.domain.reviewed_at).toLocaleString()}.`}
                                                </p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    disabled={savingDecision}
                                                    onClick={() => saveDecision('accepted')}
                                                    className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={savingDecision}
                                                    onClick={() => saveDecision('rejected')}
                                                    className="rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                        {decisionState && <p className="mt-3 text-sm text-slate-600" role="status">{decisionState}</p>}
                                    </section>

                                    <section className="grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                                            <p className="text-xs font-bold uppercase text-slate-500">Paid by owner</p>
                                            <p className="mt-1 text-xl font-black text-emerald-700">
                                                {formatMoney(review.domain.amount_paid, review.domain.currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                                            <p className="text-xs font-bold uppercase text-slate-500">Project budget</p>
                                            <p className="mt-1 text-xl font-black text-slate-800">
                                                {formatMoney(review.domain.total_budget, review.domain.currency)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                                            <p className="text-xs font-bold uppercase text-slate-500">Owner</p>
                                            <p className="mt-1 font-bold text-slate-800">{review.domain.owner_name}</p>
                                            <p className="break-all text-xs text-slate-500">{review.domain.owner_email}</p>
                                        </div>
                                    </section>

                                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                                        <h3 className="font-black text-slate-800">Payment history</h3>
                                        {review.payments.length ? (
                                            <div className="mt-3 divide-y divide-slate-100">
                                                {review.payments.map((payment, index) => (
                                                    <div key={`${payment.transaction_ref || 'payment'}-${index}`} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                                                        <span className="text-slate-600">
                                                            {payment.payment_type || 'Payment'} · {payment.status || 'Unknown'}
                                                            {payment.transaction_ref ? ` · ${payment.transaction_ref}` : ''}
                                                        </span>
                                                        <strong className="text-slate-800">{formatMoney(payment.amount, payment.currency)}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm text-slate-500">No individual payment transactions recorded.</p>
                                        )}
                                    </section>

                                    <section className="rounded-2xl bg-white p-5 shadow-sm">
                                        <h3 className="font-black text-slate-800">Collection schema</h3>
                                        {review.domain.features.length ? (
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {review.domain.features.map((feature, index) => (
                                                    <span
                                                        key={`${feature.name}-${index}`}
                                                        title={feature.definition ? JSON.stringify(feature.definition) : undefined}
                                                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                                                    >
                                                        {feature.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-sm text-slate-500">No feature schema is configured.</p>
                                        )}
                                    </section>

                                    <section className="space-y-3">
                                        <h3 className="font-black text-slate-800">Dataset contents ({review.datasets.length})</h3>
                                        {review.datasets.length ? review.datasets.map((dataset) => (
                                            <article key={dataset.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                                                <div className="flex flex-wrap justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-slate-800">{dataset.name || `Dataset ${dataset.id}`}</h4>
                                                        <p className="text-xs text-slate-500">
                                                                Ref: {dataset.reference_number} · {dataset.status} · {dataset.record_count} records · Collector #{dataset.collector_id}
                                                        </p>
                                                    </div>
                                                    {dataset.ai_confidence != null && (
                                                        <span className="text-xs font-semibold text-slate-600">
                                                            AI confidence: {Number(dataset.ai_confidence).toFixed(2)}
                                                        </span>
                                                    )}
                                                </div>
                                                {dataset.description && <p className="mt-3 text-sm text-slate-600">{dataset.description}</p>}
                                                {dataset.audio_file_path && (
                                                    <div className="mt-3">
                                                        <p className="mb-1 text-xs font-bold uppercase text-slate-500">Source audio</p>
                                                        <audio controls preload="none" className="w-full" src={`${dataset.audio_file_path}`}>
                                                            Your browser does not support audio playback.
                                                        </audio>
                                                    </div>
                                                )}
                                                {dataset.combined_text && (
                                                    <div className="mt-4">
                                                        <p className="mb-1 text-xs font-bold uppercase text-slate-500">Combined dataset text</p>
                                                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{dataset.combined_text}</pre>
                                                    </div>
                                                )}
                                                {dataset.segmented_text && (
                                                    <div className="mt-4">
                                                        <p className="mb-1 text-xs font-bold uppercase text-slate-500">Feature segments</p>
                                                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-3 text-xs text-slate-700">
                                                            {JSON.stringify(dataset.segmented_text, null, 2)}
                                                        </pre>
                                                    </div>
                                                )}
                                                <div className="mt-4 space-y-3">
                                                    <p className="text-xs font-bold uppercase text-slate-500">
                                                        Individual submissions ({dataset.submissions.length})
                                                    </p>
                                                    {dataset.submissions.map((submission) => (
                                                        <div key={submission.id} className="rounded-xl border border-slate-100 p-3">
                                                            <p className="mb-2 text-xs font-semibold text-slate-500">
                                                                {submission.contributor_name} · {submission.created_at ? new Date(submission.created_at).toLocaleString() : 'Date unavailable'}
                                                            </p>
                                                            <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{submission.text}</p>
                                                            {submission.features && (
                                                                <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                                                                    {JSON.stringify(submission.features, null, 2)}
                                                                </pre>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {!dataset.submissions.length && !dataset.combined_text && !dataset.segmented_text && (
                                                        <p className="text-sm text-slate-500">No submission content is available yet.</p>
                                                    )}
                                                </div>
                                            </article>
                                        )) : (
                                            <p className="rounded-2xl bg-white p-5 text-sm text-slate-500">No datasets have been submitted for this domain yet.</p>
                                        )}
                                    </section>
                                </>
                            )}

                            <form onSubmit={sendMessage} className="rounded-2xl border border-sky-100 bg-sky-50/60 p-5">
                                <h3 className="font-black text-slate-800">Send an in-app message to the owner</h3>
                                <p className="mt-1 text-sm text-slate-600">
                                    Share findings or request clarification. This message does not accept or reject the domain.
                                </p>
                                <textarea
                                    value={message}
                                    onChange={(event) => setMessage(event.target.value)}
                                    maxLength={2000}
                                    rows={4}
                                    placeholder="Write a data-quality or ML-readiness note..."
                                    className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-sky-400"
                                />
                                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-sm text-slate-600" role="status">{messageState}</p>
                                    <button
                                        type="submit"
                                        disabled={sending || reviewLoading || !review}
                                        className="rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {sending ? 'Sending...' : 'Send message'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </section>
                </div>
            )}
        </>
    );
};

export default DomainsTable;
