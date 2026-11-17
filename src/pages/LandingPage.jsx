import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LandingFloaters } from '../components/FloatingObjects';
import { Zap, Play, Compass } from 'lucide-react';

function FloatingCard({ emoji, label, delay, style }) {
  return (
    <div className={`a-float ${delay}`} style={{
      background:'white', borderRadius:16, padding:'14px 18px',
      boxShadow:'0 8px 24px rgba(108,99,255,.12)',
      display:'flex', alignItems:'center', gap:10,
      position:'absolute', whiteSpace:'nowrap',
      border:'2px solid rgba(108,99,255,.08)',
      ...style
    }}>
      <span style={{fontSize:'1.6rem'}}>{emoji}</span>
      <span style={{fontWeight:700, color:'var(--text-primary)', fontSize:'.88rem'}}>{label}</span>
    </div>
  );
}

function ScienceCharacter({ type }) {
  if (type === 'bio') return (
    <div className="a-float" style={{ position:'relative', display:'inline-block' }}>
      <div style={{
        width:120, height:120, borderRadius:'50%',
        background:'linear-gradient(135deg,#22C55E,#34D399)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'4rem', boxShadow:'0 12px 40px rgba(34,197,94,.35)',
        border:'4px solid white',
      }}>🌿</div>
      <div style={{
        position:'absolute', top:-8, right:-8, width:36, height:36,
        background:'#FFD93D', borderRadius:'50%', display:'flex',
        alignItems:'center', justifyContent:'center', fontSize:'1.1rem',
        boxShadow:'0 4px 12px rgba(0,0,0,.15)', border:'3px solid white',
      }} className="a-pulse">✨</div>
    </div>
  );
  return (
    <div className="a-floatB" style={{ position:'relative', display:'inline-block' }}>
      <div style={{
        width:120, height:120, borderRadius:'50%',
        background:'linear-gradient(135deg,#8B5CF6,#06B6D4)',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:'4rem', boxShadow:'0 12px 40px rgba(139,92,246,.35)',
        border:'4px solid white',
      }}>⚗️</div>
      <div style={{
        position:'absolute', top:-8, left:-8, width:36, height:36,
        background:'#FF6B6B', borderRadius:'50%', display:'flex',
        alignItems:'center', justifyContent:'center', fontSize:'1.1rem',
        boxShadow:'0 4px 12px rgba(0,0,0,.15)', border:'3px solid white',
      }} className="a-pulse">⚡</div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="page" style={{
      background:'linear-gradient(160deg,#F0EFFF 0%,#FFF5F9 40%,#F0FFF4 100%)',
      minHeight:'100vh', overflow:'hidden',
    }}>
      <LandingFloaters />

      {/* Blob backgrounds */}
      <div style={{
        position:'absolute', top:'-10%', right:'-5%', width:500, height:500,
        background:'linear-gradient(135deg,rgba(108,99,255,.12),rgba(255,107,157,.08))',
        borderRadius:'60% 40% 30% 70%/60% 30% 70% 40%',
        animation:'morphBlob 10s ease-in-out infinite',
        pointerEvents:'none',
      }}/>
      <div style={{
        position:'absolute', bottom:'-8%', left:'-5%', width:400, height:400,
        background:'linear-gradient(135deg,rgba(34,197,94,.1),rgba(78,205,196,.08))',
        borderRadius:'40% 60% 70% 30%/40% 50% 60% 50%',
        animation:'morphBlob 12s ease-in-out infinite reverse',
        pointerEvents:'none',
      }}/>

      {/* Top Nav */}
      <nav style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'20px 48px', position:'relative', zIndex:10,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{
            width:48, height:48, borderRadius:'50%',
            background:'linear-gradient(135deg,#6C63FF,#FF6B9D)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'1.6rem', boxShadow:'0 6px 20px rgba(108,99,255,.35)',
          }} className="a-pulse">🔬</div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', color:'var(--primary)', lineHeight:1 }}>MitoGames</div>
            <div style={{ fontSize:'.6rem', fontWeight:900, letterSpacing:2, color:'var(--accent-pink)', textTransform:'uppercase' }}>The Powerhouse of Learning</div>
          </div>
        </div>
        <div style={{ display:'flex', gap:12 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        maxWidth:1200, margin:'0 auto', padding:'60px 48px 40px',
        display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'center',
        position:'relative', zIndex:5,
      }}>
        {/* Left */}
        <div>
          <div className="a-fade-in" style={{
            display:'inline-flex', alignItems:'center', gap:8, padding:'8px 20px',
            background:'linear-gradient(135deg,#FFD93D22,#FF9A3C22)',
            borderRadius:999, border:'2px solid #FFD93D',
            marginBottom:24,
          }}>
            <Zap size={16} color="#FF9A3C" fill="#FF9A3C"/>
            <span style={{ fontWeight:800, fontSize:'.85rem', color:'#FF9A3C' }}>NEW — AI-Powered Science Games!</span>
          </div>

          <h1 className="a-fade-in d-2" style={{
            fontFamily:'var(--font-display)', fontSize:'clamp(2.4rem,5vw,3.8rem)',
            lineHeight:1.15, marginBottom:16, color:'var(--text-primary)',
          }}>
            Don't Just <span className="gradient-text">Learn</span> Science.{' '}
            <span style={{ color:'var(--accent-pink)' }}>Play</span> It!
          </h1>

          <p className="a-fade-in d-3" style={{
            fontSize:'1.15rem', color:'var(--text-secondary)', lineHeight:1.7,
            marginBottom:36, maxWidth:480,
          }}>
            Turn your favourite science lessons into exciting games. Explore, experiment,
            play, and discover the wonders of Biology & Chemistry!
          </p>

          <div className="a-fade-in d-4" style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/register')}
              style={{ gap:10 }}>
              <Play size={20} fill="white"/> Get Started — It's Free!
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}
              style={{ gap:10 }}>
              <Compass size={20}/> Explore MitoGames
            </button>
          </div>

          {/* Stats row */}
          <div className="a-fade-in d-5" style={{ display:'flex', gap:32, marginTop:40 }}>
            {[['1–10','Grades Covered'],['8+','Game Types'],['100%','Free & Fun']].map(([val,lbl]) => (
              <div key={lbl}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', color:'var(--primary)' }}>{val}</div>
                <div style={{ fontSize:'.8rem', color:'var(--text-secondary)', fontWeight:600 }}>{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — illustration */}
        <div style={{ position:'relative', display:'flex', justifyContent:'center', alignItems:'center', minHeight:420 }}>
          {/* Central orb */}
          <div style={{
            width:220, height:220, borderRadius:'50%',
            background:'linear-gradient(135deg,rgba(108,99,255,.12),rgba(255,107,157,.12))',
            border:'3px dashed rgba(108,99,255,.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            position:'relative',
          }} className="a-spin-slow">
            <div style={{
              width:160, height:160, borderRadius:'50%',
              background:'linear-gradient(135deg,#6C63FF,#FF6B9D)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'4.5rem', boxShadow:'0 20px 60px rgba(108,99,255,.4)',
              animation:'float 4s ease-in-out infinite',
            }}>🧬</div>
          </div>

          {/* Bio character */}
          <div style={{ position:'absolute', top:'5%', left:'0%' }}>
            <ScienceCharacter type="bio"/>
          </div>
          {/* Chem character */}
          <div style={{ position:'absolute', bottom:'5%', right:'0%' }}>
            <ScienceCharacter type="chem"/>
          </div>

          {/* Floating mini-cards */}
          <FloatingCard emoji="🏆" label="100 XP Earned!" delay="d-3"
            style={{ top:'2%', right:'-5%' }}/>
          <FloatingCard emoji="⭐" label="Perfect Score!" delay="d-6"
            style={{ bottom:'10%', left:'-8%' }}/>
          <FloatingCard emoji="🔬" label="Grade 1–10" delay="d-5"
            style={{ bottom:'-2%', right:'5%' }}/>
        </div>
      </section>

      {/* Subject Preview Cards */}
      <section style={{ maxWidth:1200, margin:'0 auto', padding:'20px 48px 60px' }}>
        <h2 className="a-fade-in" style={{
          fontFamily:'var(--font-heading)', fontSize:'2rem', textAlign:'center',
          marginBottom:36, color:'var(--text-primary)',
        }}>
          Two Worlds of Science Await You 🚀
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {/* Bio card */}
          <div className="a-slide-left card" style={{
            padding:32, cursor:'pointer', overflow:'hidden', position:'relative',
            background:'linear-gradient(135deg,#F0FFF4,#DCFCE7)',
            border:'2px solid rgba(34,197,94,.2)',
          }} onClick={() => navigate('/register')}>
            <div style={{ position:'absolute', top:-20, right:-20, fontSize:'6rem', opacity:.12 }}>🌿</div>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>🌿</div>
            <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.5rem', color:'var(--bio-dark)', marginBottom:8 }}>Biology</h3>
            <p style={{ color:'var(--text-secondary)', marginBottom:20, lineHeight:1.6 }}>
              Explore cells, DNA, ecosystems, and the living world around you!
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {['🔬 Cell Biology','🧬 Genetics','🌍 Ecosystems','🫀 Human Body'].map(t => (
                <span key={t} className="chip" style={{ background:'rgba(34,197,94,.12)', color:'var(--bio-dark)' }}>{t}</span>
              ))}
            </div>
            <button className="btn btn-bio btn-sm" style={{ marginTop:20 }}>Explore Biology →</button>
          </div>

          {/* Chem card */}
          <div className="a-slide-right card" style={{
            padding:32, cursor:'pointer', overflow:'hidden', position:'relative',
            background:'linear-gradient(135deg,#F5F3FF,#EDE9FE)',
            border:'2px solid rgba(139,92,246,.2)',
          }} onClick={() => navigate('/register')}>
            <div style={{ position:'absolute', top:-20, right:-20, fontSize:'6rem', opacity:.12 }}>⚗️</div>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>⚗️</div>
            <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.5rem', color:'var(--chem-dark)', marginBottom:8 }}>Chemistry</h3>
            <p style={{ color:'var(--text-secondary)', marginBottom:20, lineHeight:1.6 }}>
              Mix curiosity with science — atoms, bonds, reactions, and beyond!
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
              {['⚛️ Atomic Theory','🧪 Reactions','📋 Periodic Table','⚗️ Acids & Bases'].map(t => (
                <span key={t} className="chip" style={{ background:'rgba(139,92,246,.12)', color:'var(--chem-dark)' }}>{t}</span>
              ))}
            </div>
            <button className="btn btn-chem btn-sm" style={{ marginTop:20 }}>Explore Chemistry →</button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={{
        background:'white', padding:'60px 48px',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ maxWidth:1200, margin:'0 auto' }}>
          <h2 style={{
            fontFamily:'var(--font-display)', fontSize:'2.2rem', textAlign:'center',
            marginBottom:12, color:'var(--text-primary)',
          }}>Why Students Love MitoGames</h2>
          <p style={{ textAlign:'center', color:'var(--text-secondary)', marginBottom:48, fontSize:'1.05rem' }}>
            Science is not something you study. It's something you <strong>explore and play!</strong>
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:24 }}>
            {[
              { icon:'🎮', title:'Learn by Playing', desc:'8 exciting game types including MCQs, matching, drag-and-drop and equation balancers!', color:'#6C63FF22', border:'#6C63FF' },
              { icon:'🤖', title:'AI-Powered Content', desc:'Generate games from any Biology or Chemistry YouTube video instantly!', color:'#FF6B9D22', border:'#FF6B9D' },
              { icon:'📊', title:'Track Progress', desc:'XP points, badges, achievement levels and personalised learning insights.', color:'#FFD93D22', border:'#FFD93D' },
              { icon:'🎓', title:'Grade 1–10', desc:'Content adapts to your class — CBSE, ICSE and State Board supported.', color:'#22C55E22', border:'#22C55E' },
            ].map(f => (
              <div key={f.title} className="card" style={{
                padding:28, textAlign:'center',
                border:`2px solid ${f.border}30`,
                background:`linear-gradient(135deg,${f.color},white)`,
              }}>
                <div style={{ fontSize:'2.8rem', marginBottom:14 }}>{f.icon}</div>
                <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.15rem', marginBottom:10, color:'var(--text-primary)' }}>{f.title}</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:'.9rem', lineHeight:1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{
        background:'linear-gradient(135deg,#6C63FF,#FF6B9D)',
        padding:'72px 48px', textAlign:'center', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:'-30%', right:'-5%', width:300, height:300, background:'rgba(255,255,255,.08)', borderRadius:'50%' }}/>
        <div style={{ position:'absolute', bottom:'-20%', left:'5%', width:200, height:200, background:'rgba(255,255,255,.06)', borderRadius:'50%' }}/>
        <div style={{ position:'relative', zIndex:2 }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2.5rem', color:'white', marginBottom:16 }}>
            Ready to become a Science Explorer? 🚀
          </h2>
          <p style={{ color:'rgba(255,255,255,.85)', fontSize:'1.1rem', marginBottom:36 }}>
            Join thousands of students already learning through games!
          </p>
          <button className="btn btn-lg" onClick={() => navigate('/register')}
            style={{ background:'white', color:'var(--primary)', fontWeight:900, boxShadow:'0 8px 32px rgba(0,0,0,.2)' }}>
            Start Learning for Free! ✨
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign:'center', padding:'24px 48px',
        color:'var(--text-secondary)', fontSize:'.85rem', background:'white',
      }}>
        <span style={{ fontFamily:'var(--font-display)', color:'var(--primary)', fontSize:'1rem' }}>MitoGames</span>
        {' – The Powerhouse of Learning | '} Made with ❤️ for science students everywhere
      </footer>
    </div>
  );
}
