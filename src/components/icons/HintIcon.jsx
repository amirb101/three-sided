import React from 'react';

const HintIcon = ({ 
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
      case 'warning-dark':
        return '#FFB800';
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
        <path d="M9 18h6M10 21h4"/>
        <path d="M12 2a7 7 0 0 0-4 12c.67.67 1 1.33 1 2h6c0-.67.33-1.33 1-2a7 7 0 0 0-4-12z"/>
      </svg>
    </div>
  );
};

export default HintIcon;
