import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, ArrowRight, Save } from 'lucide-react';
import './DomainDefinition.css';

const createFeature = () => ({ name: '', type: 'text', required: true, choices: '' });

const DefineFeatures = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const [domainName, setDomainName] = useState('');
    const [featureGroups, setFeatureGroups] = useState([
        { name: 'General', repeatable: false, features: [createFeature()] },
    ]);
    const [target_goal, setTargetGoal] = useState('');
    const [requirements, setRequirements] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [isLoadingDraft, setIsLoadingDraft] = useState(false);
    const [draftId, setDraftId] = useState(searchParams.get('draft'));
    const [draftMessage, setDraftMessage] = useState('');
    const [draftError, setDraftError] = useState('');

    useEffect(() => {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) navigate('/login', { replace: true });
    }, [navigate]);

    useEffect(() => {
        const requestedDraftId = searchParams.get('draft');
        if (!requestedDraftId) return;

        const loadDraft = async () => {
            setIsLoadingDraft(true);
            setDraftError('');
            try {
                const response = await fetch(`/api/domain-drafts/${requestedDraftId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Could not load this draft.');

                const payload = data.payload || {};
                setDomainName(payload.domain_name || '');
                setTargetGoal(payload.target_goal || '');
                setRequirements(payload.requirements || '');
                setFeatureGroups(Array.isArray(payload.feature_groups) && payload.feature_groups.length
                    ? payload.feature_groups
                    : [{ name: 'General', repeatable: false, features: [createFeature()] }]);
                setDraftId(String(data.id));
                setDraftMessage('Draft loaded. Your changes will be saved to this draft.');
            } catch (error) {
                setDraftError(error.message || 'Could not load this draft.');
            } finally {
                setIsLoadingDraft(false);
            }
        };

        loadDraft();
    }, [searchParams]);

    const updateGroup = (groupIndex, updates) => {
        setFeatureGroups((groups) => groups.map((group, index) =>
            index === groupIndex ? { ...group, ...updates } : group
        ));
    };

    const updateFeature = (groupIndex, featureIndex, updates) => {
        setFeatureGroups((groups) => groups.map((group, index) => {
            if (index !== groupIndex) return group;
            return {
                ...group,
                features: group.features.map((feature, itemIndex) =>
                    itemIndex === featureIndex ? { ...feature, ...updates } : feature
                ),
            };
        }));
    };

    const handleAddGroup = () => {
        setFeatureGroups((groups) => [
            ...groups,
            { name: `Section ${groups.length + 1}`, repeatable: false, features: [createFeature()] },
        ]);
    };

    const handleAddFeature = (groupIndex) => {
        updateGroup(groupIndex, {
            features: [...featureGroups[groupIndex].features, createFeature()],
        });
    };

    const handleRemoveFeature = (groupIndex, featureIndex) => {
        updateGroup(groupIndex, {
            features: featureGroups[groupIndex].features.filter((_, index) => index !== featureIndex),
        });
    };

    const handleSaveDraft = async () => {
        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            navigate('/login', { replace: true });
            return;
        }

        setIsSavingDraft(true);
        setDraftError('');
        setDraftMessage('');
        try {
            const response = await fetch('/api/domain-drafts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${currentToken}`,
                },
                body: JSON.stringify({
                    draft_id: draftId,
                    payload: {
                        domain_name: domainName,
                        target_goal,
                        requirements,
                        feature_groups: featureGroups,
                    },
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Could not save your draft.');

            setDraftId(String(data.id));
            setSearchParams({ draft: String(data.id) }, { replace: true });
            setDraftMessage('Draft saved. You can resume it from your dashboard.');
        } catch (error) {
            setDraftError(error.message || 'Could not save your draft.');
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const currentToken = localStorage.getItem('token');
        if (!currentToken) {
            alert('Session invalid. Please log in again.');
            navigate('/login');
            return;
        }

        const payload = {
            domain_name: domainName,
            target_goal: parseInt(target_goal, 10),
            domain_features: featureGroups.flatMap((group) =>
                group.features
                    .filter((feature) => feature.name.trim())
                    .map((feature) => ({
                        name: feature.name.trim(),
                        group: group.name.trim() || 'General',
                        repeatable: group.repeatable,
                        type: feature.type,
                        required: feature.required,
                        choices: feature.type === 'select'
                            ? feature.choices.split(',').map((choice) => choice.trim()).filter(Boolean)
                            : [],
                    }))
            ),
            requirements: requirements
        };
        if (draftId) payload.draft_id = draftId;

        try {
            const response = await fetch('/api/domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentToken}`
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.status === 401 || response.status === 403) {
                alert('Session expired. Please log in again.');
                localStorage.clear();
                navigate('/login');
                return;
            }

            if (response.ok) {
                navigate('/payInitiate', {
                    state: {
                        domainId:   data.domain_id,
                        domainName: data.domain_name,
                        target_goal: data.target_goal,
                        deposit:    data.deposit,
                        total:      data.total_budget
                    }
                });
            } else {
                alert(data.error || 'Failed to save domain');
            }
        } catch (err) {
            console.error('Submission error:', err);
            alert('Server connection failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!localStorage.getItem('token')) return null;

    return (
        <div className="domain-def-container">
            <form className="domain-def-card" onSubmit={handleSubmit}>
                <div className="domain-def-heading">
                    <div>
                        <span className="domain-def-step">DOMAIN SETUP · STEP 2</span>
                        <h2>Define your dataset</h2>
                    </div>
                    <button type="button" className="domain-def-back-btn" onClick={() => navigate('/Dashboard')}>
                        Dashboard
                    </button>
                </div>
                <p className="subtitle">Specify the attributes you want your agents to collect.</p>
                {isLoadingDraft && <p className="draft-status">Loading saved draft…</p>}
                {draftMessage && <p className="draft-status" role="status">{draftMessage}</p>}
                {draftError && <p className="draft-error" role="alert">{draftError}</p>}

                <div className="form-group">
                    <label>Domain Name</label>
                    <input type="text" placeholder="e.g., Agriculture Survey"
                        value={domainName} onChange={(e) => setDomainName(e.target.value)} required />
                </div>

                <div className="form-group">
                    <label>Target Response Goal</label>
                    <input type="number" placeholder="e.g., 500" min="1"
                        value={target_goal} onChange={(e) => setTargetGoal(e.target.value)} required />
                </div>

                <div className="form-group features-builder-box">
                    <label>Dataset Structure</label>
                    <p className="feature-schema-help">Group related fields into sections and choose how each value is collected.</p>
                    {featureGroups.map((group, groupIndex) => (
                        <section key={groupIndex} className="feature-group">
                            <div className="feature-group-header">
                                <input
                                    type="text"
                                    aria-label={`Section ${groupIndex + 1} name`}
                                    placeholder="Section name (e.g. Household)"
                                    value={group.name}
                                    onChange={(e) => updateGroup(groupIndex, { name: e.target.value })}
                                    required
                                />
                                <label className="repeatable-toggle">
                                    <input
                                        type="checkbox"
                                        checked={group.repeatable}
                                        onChange={(e) => updateGroup(groupIndex, { repeatable: e.target.checked })}
                                    />
                                    Repeating section
                                </label>
                                {featureGroups.length > 1 && (
                                    <button
                                        type="button"
                                        className="remove-chip-btn"
                                        aria-label={`Remove ${group.name} section`}
                                        onClick={() => setFeatureGroups((groups) => groups.filter((_, index) => index !== groupIndex))}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                            {group.features.map((feature, featureIndex) => (
                                <div key={featureIndex} className="feature-definition-row">
                                    <input
                                        type="text"
                                        placeholder="Field name (e.g. Crop type)"
                                        aria-label={`Field ${featureIndex + 1} name`}
                                        value={feature.name}
                                        onChange={(e) => updateFeature(groupIndex, featureIndex, { name: e.target.value })}
                                        required
                                    />
                                    <select
                                        aria-label={`Field ${featureIndex + 1} data type`}
                                        value={feature.type}
                                        onChange={(e) => updateFeature(groupIndex, featureIndex, { type: e.target.value })}
                                    >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                        <option value="boolean">Yes / No</option>
                                        <option value="select">Select</option>
                                    </select>
                                    <label className="required-toggle">
                                        <input
                                            type="checkbox"
                                            checked={feature.required}
                                            onChange={(e) => updateFeature(groupIndex, featureIndex, { required: e.target.checked })}
                                        />
                                        Required
                                    </label>
                                    {group.features.length > 1 && (
                                        <button
                                            type="button"
                                            className="remove-chip-btn"
                                            aria-label={`Remove ${feature.name || 'field'}`}
                                            onClick={() => handleRemoveFeature(groupIndex, featureIndex)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                    {feature.type === 'select' && (
                                        <input
                                            className="feature-choices-input"
                                            type="text"
                                            placeholder="Choices, comma separated"
                                            aria-label={`Choices for ${feature.name || 'field'}`}
                                            value={feature.choices}
                                            onChange={(e) => updateFeature(groupIndex, featureIndex, { choices: e.target.value })}
                                            required
                                        />
                                    )}
                                </div>
                            ))}
                            <button type="button" className="add-feature-btn" onClick={() => handleAddFeature(groupIndex)}>
                                <Plus size={16} /> Add Field
                            </button>
                        </section>
                    ))}
                    <button type="button" className="add-group-btn" onClick={handleAddGroup}>
                        <Plus size={16} /> Add Section
                    </button>
                </div>

                <div className="form-group">
                    <p>Dataset Specification (Constraints)</p>
                    <textarea
                        placeholder="e.g., 'Focus on dairy farmers only' or 'Only interview people in Nairobi'"
                        value={requirements} onChange={(e) => setRequirements(e.target.value)} />
                </div>

                <hr />

                <div className="domain-def-actions">
                    <button type="button" className="save-draft-btn" onClick={handleSaveDraft} disabled={isSavingDraft || isLoadingDraft}>
                        <Save size={17} /> {isSavingDraft ? 'Saving draft…' : 'Save as draft'}
                    </button>
                    <button type="submit" className="submit-domain-btn" disabled={isSubmitting || isLoadingDraft}>
                        {isSubmitting ? 'Saving...' : <><span>Continue to payment</span> <ArrowRight size={18} /></>}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default DefineFeatures;
