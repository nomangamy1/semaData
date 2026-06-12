import React, { useState, useEffect } from 'react';
import ApplicationsTable from './ApplicationsTable';
import ApplicantModal from './ApplicantModal';
import { Users } from 'lucide-react';
import './TeamCollectors.css';

const TeamCollectors = () => {
    const [rawApplications, setRawApplications] = useState([]);
    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // 1. Fetching pending applicant payloads from your Flask API server
    const fetchApplications = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('/api/admin/applications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setRawApplications(data);
            }
        } catch (error) {
            console.error("Error retrieving collector applications:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    // 2. Normalize schema discrepancies for ApplicationsTable
    const tableData = rawApplications.map(app => ({
        ...app,
        id: app.id,
        applicant_name: app.applicant_name || `${app.first_name || ''} ${app.second_name || ''}`.strip() || 'Anonymous',
        applicant_email: app.applicant_email || app.email || 'N/A',
        job_title: app.job_title || 'Field Data Collector',
        domain_name: app.domain_name || 'General Operations'
    }));

    // 3. Action Control Planes
    const handleViewDetails = (mappedApp) => {
        // Find original raw payload record matching clicked element row key
        const originalRecord = rawApplications.find(a => a.id === mappedApp.id);
        
        // Safety Fallbacks to stop the Avatar string indexing crash
        const safeRecord = {
            ...originalRecord,
            first_name: originalRecord?.first_name || originalRecord?.applicant_name?.split(' ')[0] || 'U',
            second_name: originalRecord?.second_name || originalRecord?.applicant_name?.split(' ')[1] || 'N',
            email: originalRecord?.email || originalRecord?.applicant_email || 'N/A'
        };
        
        setSelectedApplicant(safeRecord);
        setIsModalOpen(true);
    };

    const handleApprove = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/applications/${id}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchApplications(); // Hot reload list
            }
        } catch (err) {
            console.error("Approve endpoint failure:", err);
        }
    };

    const handleReject = async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/admin/applications/${id}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setIsModalOpen(false);
                fetchApplications(); // Hot reload list
            }
        } catch (err) {
            console.error("Reject endpoint failure:", err);
        }
    };

    return (
        <div className="admin-section-container">
            <div className="section-card">
                <div className="mb-6">
                    <h2 className="text-2xl font-black text-slate-800">Pending Collector Registrations</h2>
                    <p className="text-sm text-slate-500 mt-1">Review incoming field network applicants and provision operational tracking routes.</p>
                </div>

                {loading ? (
                    <div className="py-12 text-center text-slate-400 font-medium">Querying platform database context...</div>
                ) : (
                    <ApplicationsTable 
                        data={tableData}
                        onView={handleViewDetails}
                        onApprove={handleApprove}
                        onReject={handleReject}
                    />
                )}
            </div>

            {/* Dynamic Modal View Overlay */}
            {isModalOpen && selectedApplicant && (
                <ApplicantModal 
                    applicant={selectedApplicant}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedApplicant(null);
                    }}
                    onApprove={handleApprove}
                    onReject={handleReject}
                />
            )}
        </div>
    );
};

export default TeamCollectors;
