import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function BackButton({ to, label = 'Back' }) {
  const navigate = useNavigate();
  const handleClick = () => { if (to) navigate(to); else navigate(-1); };
  return (
    <button onClick={handleClick} style={{
      background:'none', border:'2px solid var(--border)', cursor:'pointer',
      display:'inline-flex', alignItems:'center', gap:6,
      color:'var(--text-secondary)', fontFamily:'var(--font-body)', fontWeight:700,
      fontSize:'.88rem', padding:'8px 16px', borderRadius:999,
      marginBottom:20, transition:'all .2s',
    }}
    onMouseEnter={e=>{e.currentTarget.style.background='white';e.currentTarget.style.color='var(--primary)';e.currentTarget.style.borderColor='var(--primary)';}}
    onMouseLeave={e=>{e.currentTarget.style.background='none';e.currentTarget.style.color='var(--text-secondary)';e.currentTarget.style.borderColor='var(--border)';}}>
      <ArrowLeft size={15}/> {label}
    </button>
  );
}
