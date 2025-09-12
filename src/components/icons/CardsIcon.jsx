import React from 'react';

const CardsIcon = ({ 
  size = 24, 
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
      case 'white':
        return '#FFFFFF';
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
        <rect x="5" y="5" width="12" height="14" rx="2" ry="2"/>
        <rect x="7" y="3" width="12" height="14" rx="2" ry="2"/>
        <rect x="3" y="7" width="12" height="14" rx="2" ry="2"/>
      </svg>
    </div>
  );
};

export default CardsIcon;
