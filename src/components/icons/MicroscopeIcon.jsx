import React from 'react';

const MicroscopeIcon = ({ 
  size = 20, 
  color = 'default',
  className = '',
  ...props 
}) => {
  const getColor = () => {
    switch (color) {
      case 'primary':
        return '#635BFF';
      case 'secondary':
        return '#445AFF';
      case 'success':
        return '#5BC8A2';
      case 'warning':
        return '#FFD554';
      case 'error':
        return '#FF6363';
      case 'default':
      default:
        return '#606164';
    }
  };

  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      {...props}
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={getColor()} 
        strokeWidth={size === 16 ? 1 : size === 20 ? 1.5 : 2} 
        strokeLinecap="round" 
        strokeLinejoin="round"
        className="w-full h-full"
      >
        <rect x="5" y="19" width="14" height="2" rx="1"/>
        <line x1="8" y1="19" x2="8" y2="13"/>
        <line x1="8" y1="13" x2="14" y2="7"/>
        <rect x="13" y="5" width="4" height="2" rx="1"/>
        <line x1="9" y1="15" x2="13" y2="15"/>
      </svg>
    </div>
  );
};

export default MicroscopeIcon;
