import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ShieldCheck, ArrowRight } from 'lucide-react';
import './DomainDefinition.css';


const DefineFeatures = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const ownerId = location.state?.owner_id; // Get the ID passed from Signup

    const [domainName, setDomainName] = useState('');
    const [features, setFeatures] = useState(['']); // Array of strings for features

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
        e.preventDefault();
        e.stopPropagation();
        const payload = {
            id: ownerId,
            domain_name: domainName,
            domain_features: features.filter(f => f.trim() !== '') // Clean empty fields
        };

        try {
            const response = await fetch('http://localhost:8000/domain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (response.ok) {
            //    alert(`Domain features defined successfully! Reference Number: ${data.reference_number}`);
                // Success! Show them their new Reference Number
                navigate('/Success', { 
                    state: { 
                        refNum: data.reference_number,
                        domainName: data.domain_name 
                    } 
                });
            } else {
                alert(data.error);
            }
        } catch (err) {
            console.error("Submission error:", err);
        }
    };

    return (
        <div className="feature-builder">
            <h2>Step 2: Define Data Features</h2>
            <p>Specify the attributes you want your agents to collect.</p>
            
            <input 
                type="text" 
                placeholder="Domain Name (e.g., Health Survey)" 
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                required
            />

            <div className="features-list">
                {features.map((feature, index) => (
                    <div key={index} className="feature-row">
                        <input 
                            type="text" 
                            placeholder={`Feature #${index + 1} (e.g., Symptoms)`}
                            value={feature}
                            onChange={(e) => handleFeatureChange(index, e.target.value)}
                        />
                        {features.length > 1 && (
                            <button onClick={() => handleRemoveFeature(index)}>×</button>
                        )}
                    </div>
                ))}
            </div>

            <button type="button" onClick={handleAddFeature}>+ Add Feature</button>
            <hr />
          <button type="button" onClick={(e) => handleSubmit(e)} className="finalize-btn">
    Finalize & Generate Reference Number
</button>
        </div>
    );
};

export default DefineFeatures;