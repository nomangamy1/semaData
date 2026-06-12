import React, { useState } from 'react';
import '../pages/AdminDashboard.css';
import '../components/AdminShared.css';

// Import all your existing sub-components
import DataAnalytics from '../components/DataAnalytics';
import TeamCollectors from '../components/TeamCollectors';
import JobsTable from '../components/JobsTable';
import TemplateManager from '../components/TemplateManager';
import PayoutManagement from '../components/PayoutManagement';
import JobPostModal from '../components/JobPostModal';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const [isJobModalOpen, setIsJobModalOpen] = useState(false);

    // Sidebar navigation configuration
    const menuItems = [
        { id: 'overview', label: 'Analytics Overview', icon: '📊' },
        { id: 'collectors', label: 'Team Collectors', icon: '👥' },
        { id: 'jobs', label: 'Manage Jobs & Tasks', icon: '💼' },
        { id: 'templates', label: 'Data Templates', icon: '📝' },
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
                <header className="admin-top-navbar">
                    <div className="welcome-text">
                        <h3>System Controller Workspace</h3>
                    </div>
                    <div className="admin-profile-badge">
                        <span className="status-indicator online"></span>
                        <p>Platform Admin</p>
                    </div>
                </header>

                <div className="admin-page-content">
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
        </div>
    );
};

export default AdminDashboard;
