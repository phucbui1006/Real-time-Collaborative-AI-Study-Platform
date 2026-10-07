// client/src/components/common/Navbar.tsx
// Component Thanh điều hướng chính của ứng dụng PeerMind

import React from 'react'

export const Navbar: React.FC = () => {
  return (
    <nav className="w-full h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-6">
      <div className="flex items-center space-x-3">
        <span className="text-xl font-bold text-indigo-400">PeerMind</span>
        <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">AI Platform</span>
      </div>
      <div className="flex items-center space-x-4">
        <button className="text-sm text-slate-300 hover:text-white transition">Thư viện</button>
        <button className="text-sm text-slate-300 hover:text-white transition">Vào phòng</button>
      </div>
    </nav>
  )
}

export default Navbar
