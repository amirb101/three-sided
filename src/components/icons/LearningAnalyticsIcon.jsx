import React from 'react';

const LearningAnalyticsIcon = ({ 
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
        <line x1="4" y1="20" x2="20" y2="20"/>
        <line x1="4" y1="20" x2="4" y2="4"/>
        <path d="M4 16l4-4 4 3 5-5 3 2"/>
        <circle cx="4" cy="16" r="0.8"/>
        <circle cx="8" cy="12" r="0.8"/>
        <circle cx="12" cy="15" r="0.8"/>
        <circle cx="17" cy="10" r="0.8"/>
        <circle cx="20" cy="12" r="0.8"/>
      </svg>
    </div>
  );
};

export default LearningAnalyticsIcon;
