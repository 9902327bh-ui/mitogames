import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import { BADGES } from '../data/sampleGames';
import { LogOut, Award, Zap, BookOpen, Trophy, Target } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout, totalXP, level, levelProgress, points, history } = useApp();
  const navigate = useNavigate();
  if (!user) { navigate('/login'); return null; }

  const handleLogout = () => { logout(); navigate('/'); };

  const earnedBadges = BADGES.filter((b,i) => {
    if (b.id==='first_game' && points.gamesPlayed>=1) return true;
    if (b.id==='quiz_taker' && points.quizzesTaken>=1) return true;
    if (b.id==='bio_master' && points.gamesPlayed>=3) return true;
    if (b.id==='perfect_score' && totalXP>=50) return true;
    return false;
  });

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(160deg,#F8F7FF,#FFF5F9)' }}>
      <Navbar/>
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px' }}>

        {/* Profile Hero */}
        <div className="card a-fade-in" style={{
          padding:'36px', marginBottom:24, textAlign:'center', position:'relative', overflow:'hidden',
          background:'linear-gradient(135deg,#6C63FF,#FF6B9D)', color:'white',
        }}>
          <div style={{ position:'absolute', top:-20, right:-20, fontSize:'9rem', opacity:.07 }}>👤</div>
          <div style={{
            width:88, height:88, borderRadius:'50%', margin:'0 auto 16px',
            background:'rgba(255,255,255,.25)', display:'flex', alignItems:'center',
            justifyContent:'center', fontSize:'2.8rem', border:'4px solid rgba(255,255,255,.5)',
          }}>
            {user.name?.[0]?.toUpperCase() || 'S'}
          </div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', marginBottom:4 }}>{user.name}</h1>
          <p style={{ opacity:.85, marginBottom:16 }}>{user.email}</p>
          <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
            {[`🎓 Grade ${user.grade}`, `📚 ${user.board}`, `⚡ Level ${level}`].map(t=>(
              <span key={t} style={{ background:'rgba(255,255,255,.2)', borderRadius:999, padding:'5px 16px', fontSize:'.83rem', fontWeight:700 }}>{t}</span>
            ))}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:24 }}>
          {/* Stats */}
          <div className="card a-slide-left" style={{ padding:'24px' }}>
            <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.15rem', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <Zap size={18} color="var(--primary)"/> Your Stats
            </h3>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { icon:'⚡', label:'Total XP', value:totalXP, color:'#6C63FF' },
                { icon:'🎮', label:'Game XP', value:points.gameXP, color:'#22C55E' },
                { icon:'🧠', label:'Quiz XP', value:points.quizXP, color:'#8B5CF6' },
                { icon:'🎮', label:'Games Played', value:points.gamesPlayed, color:'#22C55E' },
                { icon:'📝', label:'Quizzes Done', value:points.quizzesTaken, color:'#8B5CF6' },
                { icon:'🏆', label:'Current Level', value:`Level ${level}`, color:'#FF9A3C' },
              ].map(s => (
                <div key={s.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#F9FAFB', borderRadius:12 }}>
                  <span style={{ fontSize:'1.3rem' }}>{s.icon}</span>
                  <span style={{ flex:1, fontWeight:600, color:'var(--text-secondary)', fontSize:'.88rem' }}>{s.label}</span>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', color:s.color }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Level Progress */}
          <div className="card a-slide-right" style={{ padding:'24px' }}>
            <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.15rem', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
              <Trophy size={18} color="#FF9A3C"/> Level Progress
            </h3>
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{
                width:100, height:100, borderRadius:'50%', margin:'0 auto 16px',
                background:'linear-gradient(135deg,#FFD93D,#FF9A3C)',
                display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column',
                boxShadow:'0 8px 24px rgba(255,154,60,.35)',
              }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', color:'white', lineHeight:1 }}>{level}</div>
                <div style={{ fontSize:'.6rem', color:'rgba(255,255,255,.8)', fontWeight:800, letterSpacing:1 }}>LEVEL</div>
              </div>
              <div className="progress-bar" style={{ marginBottom:8 }}>
                <div className="progress-fill" style={{ width:`${levelProgress}%` }}/>
              </div>
              <p style={{ fontSize:'.83rem', color:'var(--text-secondary)', fontWeight:600 }}>
                {levelProgress}/100 XP to Level {level+1}
              </p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="card a-fade-in d-3" style={{ padding:'24px', marginBottom:24 }}>
          <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.15rem', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            <Award size={18} color="var(--accent-yellow)"/> Achievements & Badges
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap:14 }}>
            {BADGES.map(badge => {
              const earned = earnedBadges.find(b=>b.id===badge.id);
              return (
                <div key={badge.id} style={{
                  padding:'16px', borderRadius:14, textAlign:'center',
                  background: earned ? 'linear-gradient(135deg,#FFF9EB,#FEF3C7)' : '#F9FAFB',
                  border: `2px solid ${earned?'#FFD93D':'#E5E7EB'}`,
                  opacity: earned ? 1 : 0.5, transition:'all .3s',
                }}>
                  <div style={{ fontSize:'2rem', marginBottom:6, filter: earned?'none':'grayscale(1)' }}>{badge.icon}</div>
                  <div style={{ fontWeight:800, fontSize:'.85rem', color: earned?'var(--text-primary)':'var(--text-secondary)', marginBottom:4 }}>{badge.label}</div>
                  <div style={{ fontSize:'.72rem', color:'var(--text-secondary)', lineHeight:1.4 }}>{badge.desc}</div>
                  {earned && <div style={{ marginTop:6, fontSize:'.72rem', fontWeight:800, color:'#FF9A3C' }}>+{badge.xp} XP</div>}
                  {!earned && <div style={{ marginTop:6, fontSize:'.72rem', color:'#9CA3AF' }}>🔒 Locked</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* History */}
        <div className="card a-fade-in d-4" style={{ padding:'24px', marginBottom:24 }}>
          <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.15rem', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
            <BookOpen size={18} color="var(--primary)"/> Learning History
          </h3>
          {history.length === 0 ? (
            <div style={{ textAlign:'center', padding:'28px 0', color:'var(--text-secondary)' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:8 }}>🚀</div>
              <p style={{ fontWeight:600 }}>No activity yet. Start playing to build your history!</p>
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {history.slice(0,10).map((h,i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:14, padding:'12px 16px', borderRadius:12,
                  background: h.subject==='biology'?'#F0FFF4':'#F5F3FF',
                  border: `1.5px solid ${h.subject==='biology'?'rgba(34,197,94,.2)':'rgba(139,92,246,.2)'}`,
                }}>
                  <span style={{ fontSize:'1.3rem' }}>{h.type==='game'?'🎮':'📝'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:'.88rem', color:'var(--text-primary)' }}>{h.title}</div>
                    <div style={{ fontSize:'.76rem', color:'var(--text-secondary)' }}>
                      {h.correct}/{h.total} correct · {new Date(h.date).toLocaleDateString()}
                    </div>
                  </div>
                  <span style={{ fontWeight:800, color:'#FF9A3C', fontSize:'.88rem' }}>+{h.xp}XP</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Logout */}
        <div style={{ textAlign:'center' }}>
          <button className="btn btn-danger" onClick={handleLogout} style={{ gap:10 }}>
            <LogOut size={16}/> Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
