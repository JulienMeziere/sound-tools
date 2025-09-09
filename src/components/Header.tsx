import React from 'react'

// Constants moved outside component
const HEADER_STYLE = { margin: '0 0 20px 0', textAlign: 'center' } as const

const Header: React.FC = () => <h2 style={HEADER_STYLE}>🎵 Sound Tools</h2>

export default Header
