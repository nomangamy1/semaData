import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, Database, LoaderCircle } from 'lucide-react';

const PrivateJobInvite = () => {
    const { token } = useParams();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [form, setForm] = useState({
        first_name: '',
        second_name: '',
        email: '',
        relevant_experience: '',
        cover_letter: '',
    });

    useEffect(() => {
        const fetchInvitation = async () => {
            try {
                const response = await fetch(`/api/private-jobs/${token}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'This private invitation is unavailable.');
                setJob(data);
                setForm((current) => ({ ...current, email: data.invited_email || '' }));
            } catch (fetchError) {
                setError(fetchError.message || 'This private invitation is unavailable.');
            } finally {
                setLoading(false);
            }
        };
        fetchInvitation();
    }, [token]);

    const submitApplication = async (event) => {
        event.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const response = await fetch(`/api/private-jobs/${token}/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not submit your application.');
            setSubmitted(true);
        } catch (submitError) {
            setError(submitError.message || 'Could not submit your application.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-[70vh] items-center justify-center gap-3 text-slate-600">
                <LoaderCircle className="animate-spin" /> Loading private invitation...
            </div>
        );
    }

    if (error && !job) {
        return (
            <main className="mx-auto my-16 max-w-2xl rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
                <h1 className="text-xl font-black text-slate-900">Invitation unavailable</h1>
                <p className="mt-3 text-slate-600" role="alert">{error}</p>
            </main>
        );
    }

    return (
        <main className="mx-auto my-10 max-w-4xl space-y-6 px-4">
            <header className="rounded-3xl bg-slate-900 p-8 text-white">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Private invitation</p>
                <h1 className="mt-2 text-3xl font-black">{job.title}</h1>
                <p className="mt-3 text-slate-300">{job.description}</p>
                <div className="mt-5 flex flex-wrap gap-4 text-sm text-slate-200">
                    <span>{job.field}</span>
                    <span>{job.location}</span>
                    <span>{job.compensation}</span>
                    <span>{job.duration}</span>
                </div>
            </header>

            {job.domain && (
                <section className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Database className="text-emerald-700" size={20} />
                        <h2 className="text-xl font-black text-slate-900">Domain collection details</h2>
                    </div>
                    <p className="mt-4 font-bold text-slate-800">{job.domain.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                        Domain reference: <code className="rounded bg-slate-100 px-2 py-1 font-mono">{job.domain.reference_number}</code>
                    </p>
                    {job.domain.requirements && <p className="mt-4 whitespace-pre-wrap text-sm text-slate-700">{job.domain.requirements}</p>}
                    {job.domain.features?.length > 0 && (
                        <div className="mt-5">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Data fields to collect</h3>
                            <div className="mt-2 space-y-2">
                                {job.domain.features.map((feature, index) => (
                                    <div key={`${feature.name}-${index}`} className="rounded-xl bg-emerald-50 px-3 py-2">
                                        <p className="text-sm font-bold text-emerald-900">{feature.name}</p>
                                        {feature.definition && (
                                            <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-emerald-800">
                                                {JSON.stringify(feature.definition, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {job.required_skills?.length > 0 && (
                <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h2 className="font-black text-slate-900">Required skills</h2>
                    <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
                        {job.required_skills.map((skill) => <li key={skill}>{skill}</li>)}
                    </ul>
                </section>
            )}

            {submitted ? (
                <section className="rounded-3xl border border-emerald-100 bg-emerald-50 p-8 text-center">
                    <h2 className="text-xl font-black text-emerald-900">Application submitted</h2>
                    <p className="mt-2 text-emerald-800">The admin team will review your application. Your invitation link has now been used.</p>
                </section>
            ) : (
                <form onSubmit={submitApplication} className="space-y-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h2 className="text-xl font-black text-slate-900">Submit your application</h2>
                    <p className="text-sm text-slate-600">Applications are reviewed by the admin team.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-semibold text-slate-700">
                            First name
                            <input
                                required
                                value={form.first_name}
                                onChange={(event) => setForm({ ...form, first_name: event.target.value })}
                                className="mt-1 w-full rounded-xl border border-slate-200 p-3"
                            />
                        </label>
                        <label className="text-sm font-semibold text-slate-700">
                            Last name
                            <input
                                required
                                value={form.second_name}
                                onChange={(event) => setForm({ ...form, second_name: event.target.value })}
                                className="mt-1 w-full rounded-xl border border-slate-200 p-3"
                            />
                        </label>
                    </div>
                    <label className="block text-sm font-semibold text-slate-700">
                        Invited email
                        <input
                            required
                            type="email"
                            readOnly
                            value={form.email}
                            className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 p-3"
                        />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                        Relevant experience
                        <textarea
                            rows={3}
                            value={form.relevant_experience}
                            onChange={(event) => setForm({ ...form, relevant_experience: event.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 p-3"
                        />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                        Cover letter
                        <textarea
                            rows={4}
                            value={form.cover_letter}
                            onChange={(event) => setForm({ ...form, cover_letter: event.target.value })}
                            className="mt-1 w-full rounded-xl border border-slate-200 p-3"
                        />
                    </label>
                    {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit application'} <ArrowRight size={16} />
                    </button>
                </form>
            )}
        </main>
    );
};

export default PrivateJobInvite;
