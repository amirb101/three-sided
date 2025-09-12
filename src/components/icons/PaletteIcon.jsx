import React from 'react';

const PaletteIcon = ({ 
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
        <path d="M12 4a8 8 0 1 0 8 8c0-1.7-1.3-3-3-3h-1a2 2 0 0 1-2-2V7c0-1.7-1.3-3-3-3z"/>
        <circle cx="10" cy="14" r="1.5"/>
      </svg>
    </div>
  );
};

export default PaletteIcon;
