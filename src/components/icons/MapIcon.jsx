import React from 'react';

const MapIcon = ({ 
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
        <path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6z"/>
        <path d="M9 4v14M15 6v14"/>
        <path d="M16.5 10.5a2.5 2.5 0 1 0 5 0c0-1.38-1.12-2.5-2.5-2.5s-2.5 1.12-2.5 2.5z"/>
        <path d="M19 13.5v0"/>
      </svg>
    </div>
  );
};

export default MapIcon;
