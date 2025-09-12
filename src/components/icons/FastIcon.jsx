import React from 'react';

const FastIcon = ({ 
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
        <path d="M13 2L5 13h6l-2 9 10-13h-6l2-7z"/>
      </svg>
    </div>
  );
};

export default FastIcon;
