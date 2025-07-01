import React from 'react';

const PermissionDialog = ({ onPermission }) => {
  return (
    <div className="permission-dialog" style={{ display: 'block' }}>
      <h3>Location Access Required</h3>
      <p>This app wants to access your location to provide accurate traffic information.</p>
      <div className="permission-buttons">
        <button 
          className="permission-btn permission-deny" 
          onClick={() => onPermission(false)}
        >
          Deny
        </button>
        <button 
          className="permission-btn permission-allow" 
          onClick={() => onPermission(true)}
        >
          Allow
        </button>
      </div>
    </div>
  );
};

export default PermissionDialog; 