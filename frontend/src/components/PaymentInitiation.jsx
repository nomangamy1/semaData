import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, Loader2, Lock, ShieldCheck } from 'lucide-react';
import './PaymentInitiation.css';

const PayInitiation = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Data passed from DefineFeatures.jsx
    const { domainId, domainName, refNum, deposit } = location.state || {};

    const [isProcessing, setIsProcessing] = useState(false);

    const handlePayment = async () => {
        setIsProcessing(true);
        
        try {
            const response = await fetch('http://localhost:8000/pay/initiate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    domain_id: domainId,
                    amount: deposit 
                }),
            });

            const data = await response.json();

            if (response.ok && data.checkout_url) {
                // External redirect to Daraja/M-Pesa/Provider
                window.location.href = data.checkout_url;
            } else {
                alert(data.error || "Payment initiation failed.");
                setIsProcessing(false);
            }
        } catch (error) {
            console.error("Payment Error:", error);
            alert("Backend connection failed.");
            setIsProcessing(false);
        }
    };

    if (!domainId) {
        return (
            <div className="error-state">
                <h3>No active session found.</h3>
                <button onClick={() => navigate(-1)}>Go Back</button>
            </div>
        );
    }

    return (
        <div className="pay-page-container">
            <div className="pay-card">
                <header className="pay-header">
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                    <h2>Activation Deposit</h2>
                </header>

                <section className="domain-summary">
                    <p className="label">Project Domain</p>
                    <h3 className="domain-title">{domainName}</h3>
                    
                    <div className="ref-status-box">
                        <span className="tiny-label">ASSIGNED REFERENCE NUMBER</span>
                        <div className="ref-display">
                            {refNum} <Lock size={16} className="lock-icon" />
                        </div>
                        <p className="status-text">Status: <span>Inactive</span></p>
                    </div>
                </section>

                <section className="price-breakdown">
                    <div className="price-row">
                        <span>Managed Setup (30% Deposit)</span>
                        <span>KES {deposit?.toLocaleString()}</span>
                    </div>
                    <div className="price-row total">
                        <span>Amount to Pay</span>
                        <span>KES {deposit?.toLocaleString()}</span>
                    </div>
                </section>

                <button 
                    className="pay-now-btn" 
                    onClick={handlePayment} 
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <><Loader2 className="spinner" /> Processing...</>
                    ) : (
                        <><CreditCard /> Pay with M-Pesa</>
                    )}
                </button>

                <footer className="pay-footer">
                    <ShieldCheck size={14} />
                    <span>Secure Payment via SemaData Gateway</span>
                </footer>
            </div>
        </div>
    );
};

export default PayInitiation;