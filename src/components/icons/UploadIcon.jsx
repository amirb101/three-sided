const UploadIcon = ({ size = 24, color = 'currentColor' }) => {
  const getColor = () => {
    if (color === 'primary') return '#667eea';
    if (color === 'secondary') return '#764ba2';
    if (color === 'green') return '#10b981';
    if (color === 'white') return '#ffffff';
    return color;
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 8L17 13L15.59 14.41L13 11.83V20H11V11.83L8.41 14.41L7 13L12 8ZM5 4V6H19V4H5Z"
        fill={getColor()}
      />
    </svg>
  );
};

export default UploadIcon;
