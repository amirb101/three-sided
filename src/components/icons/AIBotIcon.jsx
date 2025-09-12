import React from 'react';

const AIBotIcon = ({ 
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
        <circle cx="12" cy="3" r="1"/>
        <path d="M12 4v2"/>
        <rect x="5" y="6" width="14" height="12" rx="3" ry="3"/>
        <circle cx="9" cy="12" r="1.25"/>
        <circle cx="15" cy="12" r="1.25"/>
        <path d="M9 15h6"/>
      </svg>
    </div>
  );
};

export default AIBotIcon;
