import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import './DomainDefinition.css';

const DefineFeatures = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    // Auth guard inside useEffect — never call navigate() in render body
    useEffect(() => {
        if (!token) navigate('/login', { replace: true });
    }, [token, navigate]);

    const [domainName, setDomainName] = useState('');
    const [features, setFeatures] = useState(['']);
    const [target_goal, setTargetGoal] = useState('');
    const [requirements, setRequirements] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAddFeature = () => setFeatures([...features, '']);

    const handleFeatureChange = (index, value) => {
        const updated = [...features];
        updated[index] = value;
        setFeatures(updated);
    };

    const handleRemoveFeature = (index) => {
        setFeatures(features.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const payload = {
            domain_name: domainName,
            target_goal: parseInt(target_goal, 10),
            domain_features: features.filter(f => f.trim() !== ''),
            requirements: requirements
        };

        try {
            const response = await fetch('http://localhost:8000/api/domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
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
                        // refNum intentionally omitted — generated after payment
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

    if (!token) return null;

    return (
        <div className="features-container">
            <form className="feature-builder" onSubmit={handleSubmit}>
                <h2>Step 2: Define Data Features</h2>
                <p>Specify the attributes you want your agents to collect.</p>

                <div className="input-group">
                    <label>Domain Name</label>
                    <input type="text" placeholder="e.g., Agriculture Survey"
                        value={domainName} onChange={(e) => setDomainName(e.target.value)} required />
                </div>

                <div className="input-group">
                    <label>Target Response Goal</label>
                    <input type="number" placeholder="e.g., 500" min="1"
                        value={target_goal} onChange={(e) => setTargetGoal(e.target.value)} required />
                </div>

                <div className="features-list">
                    <label>Data Features to Collect</label>
                    {features.map((feature, index) => (
                        <div key={index} className="feature-row">
                            <input type="text" placeholder={`Feature #${index + 1} (e.g., Soil PH)`}
                                value={feature} onChange={(e) => handleFeatureChange(index, e.target.value)} required />
                            {features.length > 1 && (
                                <button type="button" className="remove-btn" onClick={() => handleRemoveFeature(index)}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button type="button" className="add-btn" onClick={handleAddFeature}>
                        <Plus size={16} /> Add Another Feature
                    </button>
                </div>

                <div className="specification-group">
                    <p>Dataset Specification (Constraints)</p>
                    <textarea
                        placeholder="e.g., 'Focus on dairy farmers only' or 'Only interview people in Nairobi'"
                        value={requirements} onChange={(e) => setRequirements(e.target.value)} />
                </div>

                <hr />

                <button type="submit" className="finalize-btn" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : <><span>Finalize & Generate Reference Number</span> <ArrowRight size={18} /></>}
                </button>
            </form>
        </div>
    );
};

export default DefineFeatures;