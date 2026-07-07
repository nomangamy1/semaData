import React, { useState, useEffect } from 'react';
import '../pages/AdminDashboard.css';
import '../components/AdminShared.css';
import ReviewerOnboardingModal from '../components/ReviewerOnboardingModal';

// Import all system sub-components
import DataAnalytics from '../components/DataAnalytics';
import TeamCollectors from '../components/TeamCollectors';
import JobsTable from '../components/JobsTable';
import TemplateManager from '../components/TemplateManager';
import PayoutManagement from '../components/PayoutManagement';
import JobPostModal from '../components/JobPostModal';
import DomainsTable from '../components/DomainsTable';
import SubmissionReview from '../components/SubmissionReview';
import ChallengeManager from '../components/ChallengeManager';

/**
 * useAuthToken: Production-level custom hook for auth token management
 * Handles token retrieval, validation, and refresh logic
 */
const useAuthToken = () => {
    const [token, setToken] = useState(null);
    const [isTokenValid, setIsTokenValid] = useState(false);

    useEffect(() => {
        const initializeToken = () => {
            try {
                const storedToken = localStorage.getItem('token');
                if (storedToken && isValidJWT(storedToken)) {
                    setToken(storedToken);
                    setIsTokenValid(true);
                } else {
                    localStorage.removeItem('token');
                    setIsTokenValid(false);
                }
            } catch (error) {
                console.error('Error initializing auth token:', error);
                setIsTokenValid(false);
            }
        };
        initializeToken();
    }, []);

    const isValidJWT = (jwt) => {
        if (!jwt || typeof jwt !== 'string') return false;
        try {
            const parts = jwt.split('.');
            if (parts.length !== 3) return false;
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp && typeof payload.exp === 'number') {
                return Date.now() < payload.exp * 1000;
            }
            return true;
        } catch (error) {
            console.error('JWT validation error:', error);
            return false;
        }
    };

    return { token, isTokenValid };
};

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    const [isReviewerModalOpen, setIsReviewerModalOpen] = useState(false);
    
    const { token, isTokenValid } = useAuthToken();

    const menuItems = [
        { id: 'overview', label: 'Analytics Overview', icon: '📊' },
        { id: 'collectors', label: 'Team Collectors', icon: '👥' },
        { id: 'jobs', label: 'Manage Jobs & Tasks', icon: '💼' },
        { id: 'templates', label: 'Data Templates', icon: '📝' },
        { id: 'domains', label: 'Registered Domains', icon: '🌐' },
        { id: 'review', label: 'Submission Review', icon: '🎙️' },
        { id: 'challenges', label: 'Challenges', icon: '🧩' },
        { id: 'payouts', label: 'Financials & Payouts', icon: '💳' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'overview':
                return <DataAnalytics />;
            case 'collectors':
                return <TeamCollectors />;
            case 'jobs':
                return (
                    <div className="admin-section-container">
                        <div className="section-header-actions">
                            <h2>Platform Active Jobs</h2>
                            <button 
                                className="admin-btn-primary" 
                                onClick={() => setIsJobModalOpen(true)}
                            >
                                ➕ Post New Job
                            </button>
                        </div>
                        <JobsTable />
                    </div>
                );
            case 'templates':
                return <TemplateManager />;
            case 'domains':
                return (
                    <div className="admin-section-container">
                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-slate-800">System Domain Registry</h2>
                            <p className="text-sm text-slate-500 mt-1">Global log of operational scopes, unique matching keys, and production statuses.</p>
                        </div>
                        <DomainsTable />
                    </div>
                );
            case 'review':
                return <SubmissionReview />;
            case 'challenges':
                return isTokenValid && token ? (
                    <ChallengeManager token={token} />
                ) : (
                    <div style={{
                        padding: '2rem',
                        background: '#fee2e2',
                        borderRadius: '12px',
                        color: '#991b1b',
                        fontWeight: 600
                    }}>
                        ⚠️ Authentication required. Please refresh and log in again.
                    </div>
                );
            case 'payouts':
                return <PayoutManagement />;
            default:
                return <DataAnalytics />;
        }
    };

    return (
        <div className="admin-dashboard-layout">
            <aside className="admin-sidebar">
                <div className="sidebar-brand">
                    <h2>semaData <span>Admin</span></h2>
                </div>
                <nav className="sidebar-menu">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            className={`menu-item-btn ${activeTab === item.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(item.id)}
                        >
                            <span className="menu-icon">{item.icon}</span>
                            <span className="menu-label">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>

            <main className="admin-main-viewport">
                <header className="admin-top-navbar flex justify-between items-center px-6 py-4 bg-white border-b border-slate-100">
                    <div className="welcome-text">
                        <h3>System Controller Workspace</h3>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                            onClick={() => setIsReviewerModalOpen(true)}
                        >
                            🛡️ Add Reviewer Account
                        </button>

                        <div className="admin-profile-badge flex items-center gap-2">
                            <span className="status-indicator online"></span>
                            <p className="text-sm font-semibold text-slate-700">
                                {isTokenValid ? '✅ Authenticated' : '⚠️ Not Authenticated'}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="admin-page-content p-6">
                    {renderContent()}
                </div>
            </main>

            {isJobModalOpen && (
                <JobPostModal 
                    isOpen={isJobModalOpen} 
                    onClose={() => setIsJobModalOpen(false)} 
                    onPublish={async (data) => {
                        try {
                            const response = await fetch('/api/admin/post-job', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify(data)
                            });
                            
                            if (!response.ok) {
                                throw new Error(`HTTP error! status: ${response.status}`);
                            }
                            
                            setIsJobModalOpen(false);
                            window.dispatchEvent(new Event('jobsUpdated'));
                        } catch (error) {
                            console.error('Error posting job:', error);
                            alert('Failed to post job. Please try again.');
                        }
                    }}
                />
            )}

            {isReviewerModalOpen && (
                <ReviewerOnboardingModal 
                    isOpen={isReviewerModalOpen} 
                    onClose={() => setIsReviewerModalOpen(false)}
                />
            )}
        </div>
    );
};

export default AdminDashboard;
