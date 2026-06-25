import React, { useState } from 'react';
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

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);
    const [isReviewerModalOpen, setIsReviewerModalOpen] = useState(false);

    // Sidebar navigation configuration
    const menuItems = [
        { id: 'overview', label: 'Analytics Overview', icon: '📊' },
        { id: 'collectors', label: 'Team Collectors', icon: '👥' },
        { id: 'jobs', label: 'Manage Jobs & Tasks', icon: '💼' },
        { id: 'templates', label: 'Data Templates', icon: '📝' },
        { id: 'domains', label: 'Registered Domains', icon: '🌐' },
        { id: 'review', label: 'Submission Review', icon: '🎙️' },
        { id: 'payouts', label: 'Financials & Payouts', icon: '💳' }
    ];

    // Core content router based on the active state selection
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
            case 'payouts':
                return <PayoutManagement />;
            default:
                return <DataAnalytics />;
        }
    };

    return (
        <div className="admin-dashboard-layout">
            {/* Sidebar Navigation Control Plane */}
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

            {/* Main Application Content Window */}
            <main className="admin-main-viewport">
                <header className="admin-top-navbar flex justify-between items-center px-6 py-4 bg-white border-b border-slate-100">
                    <div className="welcome-text">
                        <h3>System Controller Workspace</h3>
                    </div>
                    
                    {/* Action Panel: Triggers the new onboarding modal */}
                    <div className="flex items-center gap-4">
                        <button 
                            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                            onClick={() => setIsReviewerModalOpen(true)}
                        >
                            🛡️ Add Reviewer Account
                        </button>

                        <div className="admin-profile-badge flex items-center gap-2">
                            <span className="status-indicator online"></span>
                            <p className="text-sm font-semibold text-slate-700">Platform Admin</p>
                        </div>
                    </div>
                </header>

                <div className="admin-page-content p-6">
                    {renderContent()}
                </div>
            </main>

            {/* Dynamic Job Posting Modal Overlay */}
            {isJobModalOpen && (
                <JobPostModal 
                    isOpen={isJobModalOpen} 
                    onClose={() => setIsJobModalOpen(false)} 
                />
            )}

            {/* Programmatic Reviewer Provisioning Portal */}
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
