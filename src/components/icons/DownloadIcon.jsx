const DownloadIcon = ({ size = 24, color = 'currentColor' }) => {
  const getColor = () => {
    if (color === 'primary') return '#667eea';
    if (color === 'secondary') return '#764ba2';
    if (color === 'blue') return '#3b82f6';
    if (color === 'white') return '#ffffff';
    return color;
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 16L7 11L8.41 9.59L11 12.17V4H13V12.17L15.59 9.59L17 11L12 16ZM5 20V18H19V20H5Z"
        fill={getColor()}
      />
    </svg>
  );
};

export default DownloadIcon;
