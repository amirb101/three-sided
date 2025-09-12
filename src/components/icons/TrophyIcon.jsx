import React from 'react';

const TrophyIcon = ({ 
  size = 20, 
  color = 'warning',
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
        return '#606164';
      default:
        return '#FFD554';
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
        <path d="M8 4h8v3a4 4 0 0 1-4 4 4 4 0 0 1-4-4V4z"/>
        <path d="M8 5H5a2 2 0 0 0 2 3"/>
        <path d="M16 5h3a2 2 0 0 1-2 3"/>
        <path d="M12 11v4"/>
        <rect x="9" y="15" width="6" height="2" rx="1"/>
        <rect x="8" y="17" width="8" height="2" rx="1"/>
      </svg>
    </div>
  );
};

export default TrophyIcon;
