import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ShieldCheck, ArrowRight, CheckCircle } from 'lucide-react';
import './DomainDefinition.css';

const DefineFeatures = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // 1. Get query parameters and location state
    const queryParams = new URLSearchParams(location.search);
    const [ownerId] = useState(location.state?.owner_id || queryParams.get('owner_id'));
    const isVerified = queryParams.get('verified');
    // Important: Get owner_id from URL if it's not in location state (common after redirects)

    // 2. State Management
    const [domainName, setDomainName] = useState('');
    const [features, setFeatures] = useState(['']); 
    const [target_goal, setTargetGoal] = useState(''); 
    const [requirements, setRequirements] = useState('');

    const handleAddFeature = () => {
        setFeatures([...features, '']);
    };

    const handleFeatureChange = (index, value) => {
        const updatedFeatures = [...features];
        updatedFeatures[index] = value;
        setFeatures(updatedFeatures);
    };

    const handleRemoveFeature = (index) => {
        setFeatures(features.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); // Prevents page reload
        console.log("Submitting with Owner ID:", ownerId);
        
        // Debugging: Check console if things don't move
        console.log("Submit triggered. Payload preparing...");

        if (!ownerId) {
            alert("Error: Owner ID is missing. Please try signing up again or check your verification link.");
            return;
        }

        const payload = {
            id: ownerId,
            domain_name: domainName,
            target_goal: target_goal,
            domain_features: features.filter(f => f.trim() !== ''), // Remove empty fields
            requirements: requirements
        };

        try {
            const response = await fetch('http://localhost:8000/api/domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                // Store owner_id and domain_id in localStorage for dashboard access
                localStorage.setItem('ownerId', ownerId);
                localStorage.setItem('domainId', data.domain_id);

                // Navigate to payment/success page
                navigate('/payInitiate', { 
                    state: { 
                        domainId: data.domain_id,
                        refNum: data.reference_number,
                        domainName: data.domain_name,
                        target_goal: data.target_goal,
                        total: data.total_budget
                    } 
                });
            } else {
                // Show backend error (e.g., Domain already exists)
                alert(data.error || "Failed to save domain");
            }
        } catch (err) {
            console.error("Submission error:", err);
            alert("Server connection failed. Please ensure the backend is running.");
        }
    };

    return (
        <div className="features-container">
            {/* Verification Success Notification */}
            {isVerified === 'true' && (
                <div className="alert-success" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <CheckCircle size={18} /> 
                    <span>Email successfully verified! Welcome to SemaData Agriculture.</span>
                </div>
            )}

            {/* THE FORM WRAPPER */}
            <form className="feature-builder" onSubmit={handleSubmit}>
                <h2>Step 2: Define Data Features</h2>
                <p>Specify the attributes you want your agents to collect.</p>
                
                <div className="input-group">
                    <label>Domain Name</label>
                    <input 
                        type="text" 
                        placeholder="e.g., Agriculture Survey" 
                        value={domainName}
                        onChange={(e) => setDomainName(e.target.value)}
                        required
                    />
                </div>

                <div className="input-group">
                    <label>Target Response Goal</label>
                    <input 
                        type="number" 
                        placeholder="e.g., 500" 
                        value={target_goal}
                        onChange={(e) => setTargetGoal(e.target.value)}
                        required
                    />
                </div>

                <div className="features-list">
                    <label>Data Features to Collect</label>
                    {features.map((feature, index) => (
                        <div key={index} className="feature-row">
                            <input 
                                type="text" 
                                placeholder={`Feature #${index + 1} (e.g., Soil PH)`}
                                value={feature}
                                onChange={(e) => handleFeatureChange(index, e.target.value)}
                                required
                            />
                            {features.length > 1 && (
                                <button 
                                    type="button" 
                                    className="remove-btn" 
                                    onClick={() => handleRemoveFeature(index)}
                                >
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
                    <p>Dataset Specification (Respects/Constraints)</p>
                    <textarea 
                        placeholder="e.g., 'Focus on dairy farmers only' or 'Collectors should only interview people in Nairobi'"
                        value={requirements}
                        onChange={(e) => setRequirements(e.target.value)}
                    />
                </div>

                <hr />
                
                {/* Submit button inside the form */}
                <button type="submit" className="finalize-btn">
                    Finalize & Generate Reference Number <ArrowRight size={18} />
                </button>
            </form>
        </div>
    );
};

export default DefineFeatures;