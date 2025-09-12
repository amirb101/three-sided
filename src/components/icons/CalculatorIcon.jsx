import React from 'react';

const CalculatorIcon = ({ 
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
        <rect x="6" y="3" width="12" height="18" rx="2"/>
        <rect x="8" y="5" width="8" height="4" rx="1"/>
        <circle cx="9" cy="12" r="0.8"/>
        <circle cx="12" cy="12" r="0.8"/>
        <circle cx="15" cy="12" r="0.8"/>
        <circle cx="9" cy="15" r="0.8"/>
        <circle cx="12" cy="15" r="0.8"/>
        <circle cx="15" cy="15" r="0.8"/>
        <circle cx="9" cy="18" r="0.8"/>
        <circle cx="12" cy="18" r="0.8"/>
        <circle cx="15" cy="18" r="0.8"/>
      </svg>
    </div>
  );
};

export default CalculatorIcon;
