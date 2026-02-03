export default function Navbar() {
    return (
        <nav style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45px',
            backgroundColor: 'white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 20px',
            maxWidth: '100vw'
        }}>
            {/* Logo/Title */}
            <div style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1a73e8',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                <span>🚌</span>
                <span>Go 
                    <span role="img" aria-label="Bus Stop">🚏</span>ransit
                </span>
            </div>

            {/* Center - Search */}
            <div style={{
                flex: 1,
                maxWidth: '500px',
                margin: '0 40px',
                position: 'relative'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: '#f1f3f4',
                    borderRadius: '24px',
                    padding: '8px 16px',
                    gap: '8px'
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search for places..."
                        style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            outline: 'none',
                            fontSize: '14px',
                            width: '100%',
                            color: '#202124'
                        }}
                    />
                </div>
            </div>

            {/* Right side - Actions */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
            }}>
                {/* Trip Planner Button */}
                <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    backgroundColor: '#1a73e8',
                    color: 'white',
                    border: 'none',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1557b0'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1a73e8'}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"></path>
                    </svg>
                    Trip Planner
                </button>
                <div>
                    Admin
                </div>
                {/* Profile Icon */}
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: '#1a73e8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: '500'
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                </div>
            </div>
        </nav>
    )
};