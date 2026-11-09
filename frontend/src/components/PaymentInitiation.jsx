import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, ArrowLeft, Loader2, Lock, ShieldCheck, Smartphone } from 'lucide-react';
import './PaymentInitiation.css';

const PayInitiate = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const {
        domainId,
        domainName,
        refNum,
        target_goal,
        deposit_amount: depositAmountFromState,
        deposit: depositFromState,
        amount_paid: amountPaidFromState = 0,
        total_budget: totalBudgetFromState,
        total: totalFromState,
    } = location.state || {};
    const deposit = Number(depositAmountFromState ?? depositFromState ?? 0);
    const amountPaid = Number(amountPaidFromState || 0);
    const totalBudget = Number(totalBudgetFromState ?? totalFromState ?? 0);
    const remainingBudget = Math.max(totalBudget - amountPaid, 0);
    const remainingToActivate = Math.max(deposit - amountPaid, 0);

    // ✅ Read JWT token from localStorage
    const token = localStorage.getItem('token');

    const [isProcessing, setIsProcessing] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handlePayment = async (e) => {
        e.preventDefault();

        const amount = Number(paymentAmount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > remainingBudget) {
            alert(`Enter an amount greater than zero and no more than KES ${remainingBudget.toLocaleString()}.`);
            return;
        }

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
            const response = await fetch('/api/main/pay/initiate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`  // ✅ Send JWT token
                },
                body: JSON.stringify({
                    domain_id: domainId,
                    phone: phoneNumber,
                    amount,
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
                setSuccessMessage(data.message || 'Payment simulation complete. No money was charged.');
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
                    <h2>Project Payment</h2>
                </header>

                {showSuccess ? (
                    <div className="success-overlay">
                        <div className="success-content">
                            <ShieldCheck size={60} color="#22c55e" />
                            <h3>{import.meta.env.DEV ? 'Simulation complete' : 'Payment confirmed'}</h3>
                            <p>{successMessage}</p>
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

                        {import.meta.env.DEV ? (
                            <>
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
                                        <span>Target goal</span>
                                        <span>{Number(target_goal || 0).toLocaleString()} entries</span>
                                    </div>
                                    <div className="price-row">
                                        <span>Total project budget</span>
                                        <span>KES {totalBudget.toLocaleString()}</span>
                                    </div>
                                    <div className="price-row">
                                        <span>Activation deposit</span>
                                        <span>KES {deposit.toLocaleString()}</span>
                                    </div>
                                    <div className="price-row total">
                                        <span>Remaining project budget</span>
                                        <span className="amount-highlight">KES {remainingBudget.toLocaleString()}</span>
                                    </div>
                                    {remainingToActivate > 0 && (
                                        <div className="price-row">
                                            <span>Still needed to activate</span>
                                            <span>KES {remainingToActivate.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {amountPaid > 0 && (
                                        <div className="price-row">
                                            <span>Already paid</span>
                                            <span>KES {amountPaid.toLocaleString()}</span>
                                        </div>
                                    )}
                                </section>

                                <section className="payment-input-section">
                                    <label className="tiny-label" htmlFor="payment-amount">PAYMENT AMOUNT (KES)</label>
                                    <div className="phone-input-wrapper">
                                        <span className="input-icon">KES</span>
                                        <input
                                            id="payment-amount"
                                            type="number"
                                            min="1"
                                            max={remainingBudget}
                                            step="1"
                                            placeholder="Enter an amount"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            disabled={isProcessing}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 mt-2">
                                        Pay in installments as collection progresses. Payments count toward the activation deposit and total project budget.
                                    </p>
                                </section>

                                <p className="mx-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                    Development only: this flow simulates a payment. It does not charge M-Pesa.
                                </p>

                                <button
                                    className="pay-now-btn"
                                    onClick={handlePayment}
                                    disabled={
                                        isProcessing ||
                                        !phoneNumber ||
                                        !paymentAmount ||
                                        Number(paymentAmount) <= 0 ||
                                        Number(paymentAmount) > remainingBudget ||
                                        remainingBudget <= 0
                                    }
                                >
                                    {isProcessing ? (
                                        <><Loader2 className="spinner" /> Simulating payment...</>
                                    ) : (
                                        <><CreditCard /> Simulate payment</>
                                    )}
                                </button>
                            </>
                        ) : (
                            <p className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="status">
                                Online activation payments are not configured yet. No payment has been taken.
                                Please contact <a className="font-bold underline" href="mailto:support@semadata.co">support@semadata.co</a> for help.
                            </p>
                        )}
                    </>
                )}

                <footer className="pay-footer">
                    <ShieldCheck size={14} />
                    <span>{import.meta.env.DEV ? 'Development payment simulation — no charge' : 'Online payments unavailable'}</span>
                </footer>
            </div>
        </div>
    );
};

export default PayInitiate;