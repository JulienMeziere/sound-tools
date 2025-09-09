import React from 'react';

// Constants moved outside component
const HEADER_STYLE = {
  margin: '0 0 20px 0',
  textAlign: 'center',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
} as const;

const ICON_STYLE = {
  width: '24px',
  height: '24px',
} as const;

const Header: React.FC = () => (
  <h2 style={HEADER_STYLE}>
    <img src='/icons/icon-32.png' alt='Sound Tools' style={ICON_STYLE} />
    Sound Tools
  </h2>
);

export default Header;
