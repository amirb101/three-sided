import React from 'react';

const BrainIcon = ({ 
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
        <path d="M10 4a3 3 0 0 0-6 2v3a3 3 0 0 0 0 6v3a3 3 0 0 0 6 2"/>
        <path d="M14 4a3 3 0 0 1 6 2v3a3 3 0 0 1 0 6v3a3 3 0 0 1-6 2"/>
        <path d="M12 2v20"/>
      </svg>
    </div>
  );
};

export default BrainIcon;
