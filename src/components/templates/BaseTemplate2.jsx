import React from 'react';

const BaseTemplate2 = ({ children, width = "56mm", height = "auto", className = "", isPrint = false }) => {
  const printStyle = isPrint
    ? { width: "56mm", height, padding: "3mm", boxSizing: "border-box" }
    : { width: "220px", height: "auto", minHeight: "400px", padding: "8px" };
  
  return (
    <div
      className={`bg-white rounded-lg shadow-lg mx-auto ${className}`}
      style={printStyle}
    >
      {children}
    </div>
  );
};

export default BaseTemplate2;
