import React from 'react';

const EmptyState = ({ message, actionLabel, onAction }) => (
  <div style={{
    padding: '40px',
    textAlign: 'center',
    border: '2px dashed #e2e8f0',
    borderRadius: '16px',
    background: '#f8fafc',
    color: '#64748b',
    margin: '20px 0'
  }}>
    <p style={{ marginBottom: '16px', fontWeight: 500 }}>{message}</p>
    {actionLabel && (
      <button 
        onClick={onAction}
        style={{
          background: '#489c8c', color: 'white', border: 'none',
          padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
        }}
      >
        {actionLabel}
      </button>
    )}
  </div>
);

export default EmptyState;
