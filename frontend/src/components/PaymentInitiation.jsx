import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, Loader2, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import './PaymentInitiation.css';

const PayInitiate = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const { domainId, domainName, refNum, target_goal } = location.state || {};

    // ✅ Read JWT token from localStorage
    const token = localStorage.getItem('token');

    const [isProcessing, setIsProcessing] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const deposit = target_goal ? parseFloat(target_goal) * 7 * 0.3 : 0;

    const handlePayment = async (e) => {
        e.preventDefault();

        if (!/^0(7|1)\d{8}$/.test(phoneNumber)) {
            alert("Please enter a valid M-Pesa phone number (e.g., 0712345678)");
            return;
        }

        if (!token) {
            alert("Session expired. Please log in again.");
            navigate('/login');
            return;
        }

        setIsProcessing(true);

        try {
            const response = await fetch('http://localhost:8000/api/main/pay/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`  // ✅ Send JWT token
                },
                body: JSON.stringify({
                    domain_id: domainId,
                    phone: phoneNumber
                }),
            });

            const data = await response.json();

            if (response.status === 401 || response.status === 403) {
                alert("Session expired. Please log in again.");
                localStorage.clear();
                navigate('/login');
                return;
            }

            if (response.ok) {
                // Simulate STK push wait time
                setTimeout(() => {
                    setIsProcessing(false);
                    setShowSuccess(true);

                    // ✅ Use React Router navigate() — no full page reload
                    // This preserves auth state and React context
                    setTimeout(() => {
                        navigate(data.redirect_path || '/Dashboard');
                    }, 2000);
                }, 4000);
            } else {
                alert(data.error || "Payment initiation failed.");
                setIsProcessing(false);
            }
        } catch (error) {
            console.error("Payment Error:", error);
            alert("Backend connection failed. Make sure your Flask server is running.");
            setIsProcessing(false);
        }
    };

    // ✅ Guard: no domain state = user navigated here directly
    if (!domainId) {
        return (
            <div className="error-state">
                <h3>No active session found.</h3>
                <button onClick={() => navigate('/Dashboard')}>Go to Dashboard</button>
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

                {showSuccess ? (
                    <div className="success-overlay">
                        <div className="success-content">
                            <ShieldCheck size={60} color="#22c55e" />
                            <h3>Payment Received!</h3>
                            <p>Activating your domain and loading your dashboard...</p>
                        </div>
                    </div>
                ) : (
                    <>
                        <section className="domain-summary">
                            <p className="label">Project Domain</p>
                            <h3 className="domain-title">{domainName}</h3>
                            <div className="ref-display">
                                {refNum} <Lock size={16} className="lock-icon" />
                            </div>
                        </section>

                        <section className="payment-input-section">
                            <label className="tiny-label">M-PESA PHONE NUMBER</label>
                            <div className="phone-input-wrapper">
                                <Smartphone size={18} className="input-icon" />
                                <input
                                    type="text"
                                    placeholder="07xxxxxxxx"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    disabled={isProcessing}
                                />
                            </div>
                        </section>

                        <section className="price-breakdown">
                            <div className="breakdown-label">Payment Breakdown</div>
                            <div className="price-row">
                                <span>Target Goal</span>
                                <span>Entries {parseFloat(target_goal)?.toLocaleString()}</span>
                            </div>
                            <div className="price-row">
                                <span>Pricing per Entry</span>
                                <span>× Ksh7</span>
                            </div>
                            <div className="price-row">
                                <span>Subtotal</span>
                                <span>KES {(parseFloat(target_goal) * 7)?.toLocaleString()}</span>
                            </div>
                            <div className="price-row">
                                <span>Deposit Rate</span>
                                <span>30%</span>
                            </div>
                            <div className="price-row total">
                                <span>Total Deposit Required</span>
                                <span className="amount-highlight">KES {deposit?.toLocaleString()}</span>
                            </div>
                        </section>

                        <button
                            className="pay-now-btn"
                            onClick={handlePayment}
                            disabled={isProcessing || !phoneNumber}
                        >
                            {isProcessing ? (
                                <><Loader2 className="spinner" /> Check your Phone...</>
                            ) : (
                                <><CreditCard /> Send M-Pesa Prompt</>
                            )}
                        </button>
                    </>
                )}

                <footer className="pay-footer">
                    <ShieldCheck size={14} />
                    <span>Secure M-Pesa Gateway</span>
                </footer>
            </div>
        </div>
    );
};

export default PayInitiate;