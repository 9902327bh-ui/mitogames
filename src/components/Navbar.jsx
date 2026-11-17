import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Home, BookOpen, Atom, User, LogOut, Menu, X, Zap, Trophy } from 'lucide-react';

export default function Navbar() {
  const { user, logout, totalXP, level } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const links = [
    { icon: <Home size={18}/>, label: 'Home', path: '/dashboard' },
    { icon: <BookOpen size={18}/>, label: 'Biology', path: '/biology' },
    { icon: <Atom size={18}/>, label: 'Chemistry', path: '/chemistry' },
    { icon: <Trophy size={18}/>, label: 'Profile', path: '/profile' },
  ];

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)',
      borderBottom: '2px solid rgba(108,99,255,0.1)',
      boxShadow: '0 2px 20px rgba(108,99,255,0.08)',
      padding: '0 24px', display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', height: '68px',
    }}>
      {/* Logo */}
      <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
        onClick={() => navigate('/dashboard')}>
        <div style={{
          width:40, height:40, borderRadius:'50%',
          background:'linear-gradient(135deg,#6C63FF,#FF6B9D)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'1.3rem', boxShadow:'0 4px 12px rgba(108,99,255,.35)',
        }}>🔬</div>
        <div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', color:'var(--primary)', lineHeight:1 }}>MitoGames</div>
          <div style={{ fontSize:'.6rem', color:'var(--text-secondary)', fontWeight:700, letterSpacing:1 }}>POWERHOUSE OF LEARNING</div>
        </div>
      </div>

      {/* Desktop Nav */}
      <div style={{ display:'flex', alignItems:'center', gap:4, '@media(max-width:768px)':{ display:'none' } }}
        className="desktop-nav">
        {links.map(l => (
          <button key={l.path} className={`nav-link${location.pathname===l.path?' active':''}`}
            onClick={() => navigate(l.path)}>
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* XP Badge + Avatar */}
      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
        <div style={{
          display:'flex', alignItems:'center', gap:6, padding:'6px 14px',
          background:'linear-gradient(135deg,#FFD93D22,#FF9A3C22)',
          borderRadius:999, border:'2px solid #FFD93D',
        }}>
          <Zap size={15} color="#FF9A3C" fill="#FF9A3C"/>
          <span style={{ fontSize:'.85rem', fontWeight:800, color:'#FF9A3C' }}>Lv{level}</span>
          <span style={{ fontSize:'.8rem', fontWeight:700, color:'#6B7280' }}>{totalXP}XP</span>
        </div>

        <div style={{
          width:38, height:38, borderRadius:'50%',
          background:'linear-gradient(135deg,var(--primary),var(--accent-pink))',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'white', fontWeight:800, fontSize:'1rem', cursor:'pointer',
          boxShadow:'0 4px 12px rgba(108,99,255,.3)',
        }} onClick={() => navigate('/profile')}>
          {user.name?.[0]?.toUpperCase() || 'S'}
        </div>

        <button onClick={handleLogout} style={{
          background:'none', border:'none', cursor:'pointer', padding:8,
          color:'var(--text-secondary)', borderRadius:8, transition:'all .2s',
        }}
          onMouseEnter={e=>e.target.style.color='var(--secondary)'}
          onMouseLeave={e=>e.target.style.color='var(--text-secondary)'}>
          <LogOut size={18}/>
        </button>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} style={{
          background:'none', border:'none', cursor:'pointer', padding:4,
          display:'none',
        }} className="hamburger">
          {open ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div style={{
          position:'fixed', top:68, left:0, right:0,
          background:'white', borderBottom:'2px solid var(--border)',
          padding:'16px 24px', display:'flex', flexDirection:'column', gap:4,
          boxShadow:'0 8px 32px rgba(0,0,0,.12)', zIndex:49,
        }}>
          {links.map(l => (
            <button key={l.path} className={`nav-link${location.pathname===l.path?' active':''}`}
              onClick={() => { navigate(l.path); setOpen(false); }}>
              {l.icon} {l.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
