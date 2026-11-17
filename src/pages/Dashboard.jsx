import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import { Zap, Trophy, BookOpen, Atom } from 'lucide-react';

function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ background:'white', borderRadius:16, padding:'18px 20px', boxShadow:'0 4px 16px rgba(0,0,0,.06)', textAlign:'center', border:`2px solid ${color}20` }}>
      <div style={{ fontSize:'1.8rem', marginBottom:6 }}>{icon}</div>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:'.78rem', color:'var(--text-secondary)', fontWeight:600, marginTop:4 }}>{label}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user, totalXP, level, levelProgress, points } = useApp();
  const navigate = useNavigate();
  if (!user) { navigate('/login'); return null; }
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#F8F7FF 0%,#F0FFF4 50%,#FFF5F9 100%)' }}>
      <Navbar />
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px' }}>

        {/* Greeting Banner */}
        <div className="a-fade-in" style={{ marginBottom:32 }}>
          <div style={{ background:'linear-gradient(135deg,#6C63FF,#FF6B9D)', borderRadius:24, padding:'28px 36px', color:'white', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-20, right:-20, fontSize:'8rem', opacity:.07, pointerEvents:'none' }}>🚀</div>
            <div style={{ position:'relative', zIndex:2 }}>
              <div style={{ fontSize:'.85rem', fontWeight:700, opacity:.8, marginBottom:4 }}>{greeting}, science explorer!</div>
              <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.4rem,3vw,2rem)', marginBottom:10, lineHeight:1.2 }}>
                Hey, {user.name}! 👋 Ready to explore science today?
              </h1>
              <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                {[`🎓 Grade ${user.grade}`, `📚 ${user.board}`, `⚡ Level ${level} Explorer`].map(t => (
                  <span key={t} style={{ background:'rgba(255,255,255,.2)', borderRadius:999, padding:'4px 14px', fontSize:'.82rem', fontWeight:700 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="a-fade-in d-2" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:32 }}>
          <StatCard icon="⚡" value={totalXP} label="Total XP" color="#6C63FF"/>
          <StatCard icon="🎮" value={points.gamesPlayed} label="Games Played" color="#22C55E"/>
          <StatCard icon="📝" value={points.quizzesTaken} label="Quizzes Done" color="#8B5CF6"/>
          <StatCard icon="🏆" value={`Lv ${level}`} label="Your Level" color="#FF9A3C"/>
        </div>

        {/* Level bar */}
        <div className="a-fade-in d-3" style={{ background:'white', borderRadius:18, padding:'20px 24px', marginBottom:36, boxShadow:'0 4px 16px rgba(0,0,0,.06)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontWeight:800, fontSize:'.95rem' }}>⭐ Level {level} Progress</span>
            <span style={{ fontSize:'.85rem', color:'var(--text-secondary)', fontWeight:600 }}>{levelProgress}/100 XP to Level {level+1}</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width:`${levelProgress}%` }}/></div>
        </div>

        {/* Subject Cards */}
        <h2 className="a-fade-in d-3" style={{ fontFamily:'var(--font-heading)', fontSize:'1.5rem', marginBottom:20 }}>
          Choose Your Science Adventure 🧭
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:40 }}>

          {/* BIOLOGY */}
          <div className="a-slide-left" onClick={() => navigate('/biology')} style={{
            background:'linear-gradient(135deg,#F0FFF4,#DCFCE7,#BBF7D0)', borderRadius:24, padding:'36px 32px',
            cursor:'pointer', position:'relative', overflow:'hidden', border:'2.5px solid rgba(34,197,94,.3)',
            transition:'all .3s ease', boxShadow:'0 8px 32px rgba(34,197,94,.15)',
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-8px)';e.currentTarget.style.boxShadow='0 20px 50px rgba(34,197,94,.3)'}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 8px 32px rgba(34,197,94,.15)'}}>
            <div style={{ position:'absolute', top:-10, right:-10, fontSize:'9rem', opacity:.08, pointerEvents:'none' }}>🌿</div>
            <div style={{ position:'absolute', bottom:-10, left:'30%', fontSize:'4rem', opacity:.08, pointerEvents:'none' }}>🧬</div>
            {/* Character */}
            <div style={{ position:'absolute', top:20, right:24 }}>
              <div className="a-float" style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#22C55E,#34D399)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.2rem', boxShadow:'0 8px 24px rgba(34,197,94,.35)', border:'3px solid white' }}>🌿</div>
            </div>
            <div style={{ position:'relative', zIndex:2 }}>
              <div className="chip" style={{ background:'rgba(34,197,94,.15)', color:'#16A34A', marginBottom:14 }}>🌱 Life Sciences</div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', color:'#14532D', marginBottom:10, lineHeight:1.1 }}>Biology</h2>
              <p style={{ color:'#166534', fontSize:'1rem', lineHeight:1.6, marginBottom:16, fontWeight:600 }}>
                "Discover the Living World!"
              </p>
              <p style={{ color:'var(--text-secondary)', fontSize:'.88rem', marginBottom:24, lineHeight:1.6 }}>
                Explore cells, DNA, ecosystems, human body systems and the wonders of life!
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
                {['🔬 Cells','🧬 Genetics','🫀 Human Body','🌍 Ecosystems'].map(t=>(
                  <span key={t} className="chip" style={{ background:'rgba(34,197,94,.12)', color:'#16A34A' }}>{t}</span>
                ))}
              </div>
              <button className="btn btn-bio" style={{ gap:8 }}>
                Explore Biology <span style={{ fontSize:'1.1rem' }}>→</span>
              </button>
            </div>
          </div>

          {/* CHEMISTRY */}
          <div className="a-slide-right" onClick={() => navigate('/chemistry')} style={{
            background:'linear-gradient(135deg,#F5F3FF,#EDE9FE,#DDD6FE)', borderRadius:24, padding:'36px 32px',
            cursor:'pointer', position:'relative', overflow:'hidden', border:'2.5px solid rgba(139,92,246,.3)',
            transition:'all .3s ease', boxShadow:'0 8px 32px rgba(139,92,246,.15)',
          }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-8px)';e.currentTarget.style.boxShadow='0 20px 50px rgba(139,92,246,.3)'}}
          onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 8px 32px rgba(139,92,246,.15)'}}>
            <div style={{ position:'absolute', top:-10, right:-10, fontSize:'9rem', opacity:.08, pointerEvents:'none' }}>⚗️</div>
            <div style={{ position:'absolute', bottom:-10, left:'30%', fontSize:'4rem', opacity:.08, pointerEvents:'none' }}>⚛️</div>
            {/* Character */}
            <div style={{ position:'absolute', top:20, right:24 }}>
              <div className="a-floatB" style={{ width:72, height:72, borderRadius:'50%', background:'linear-gradient(135deg,#8B5CF6,#06B6D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2.2rem', boxShadow:'0 8px 24px rgba(139,92,246,.35)', border:'3px solid white' }}>⚗️</div>
            </div>
            <div style={{ position:'relative', zIndex:2 }}>
              <div className="chip" style={{ background:'rgba(139,92,246,.15)', color:'#6D28D9', marginBottom:14 }}>🧪 Physical Sciences</div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', color:'#4C1D95', marginBottom:10, lineHeight:1.1 }}>Chemistry</h2>
              <p style={{ color:'#5B21B6', fontSize:'1rem', lineHeight:1.6, marginBottom:16, fontWeight:600 }}>
                "Experiment. Discover. Create!"
              </p>
              <p style={{ color:'var(--text-secondary)', fontSize:'.88rem', marginBottom:24, lineHeight:1.6 }}>
                Dive into atoms, molecules, reactions, and the science behind everything!
              </p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:24 }}>
                {['⚛️ Atoms','🔗 Bonding','⚗️ Reactions','📋 Periodic Table'].map(t=>(
                  <span key={t} className="chip" style={{ background:'rgba(139,92,246,.12)', color:'#6D28D9' }}>{t}</span>
                ))}
              </div>
              <button className="btn btn-chem" style={{ gap:8 }}>
                Explore Chemistry <span style={{ fontSize:'1.1rem' }}>→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="a-fade-in d-5" style={{ background:'white', borderRadius:20, padding:'24px 28px', boxShadow:'0 4px 16px rgba(0,0,0,.06)' }}>
          <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.2rem', marginBottom:16 }}>🕐 Recent Activity</h3>
          {points.gamesPlayed === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-secondary)' }}>
              <div style={{ fontSize:'3rem', marginBottom:12 }}>🚀</div>
              <p style={{ fontWeight:600 }}>No games played yet!</p>
              <p style={{ fontSize:'.88rem', marginTop:4 }}>Pick a subject above to start your science adventure.</p>
            </div>
          ) : (
            <div style={{ fontSize:'.9rem', color:'var(--text-secondary)' }}>Keep exploring to build your history!</div>
          )}
        </div>
      </div>
    </div>
  );
}
