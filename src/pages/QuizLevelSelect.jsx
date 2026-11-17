import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import { Lock, CheckCircle, Star, ChevronRight } from 'lucide-react';
import { QUIZ_LEVELS, PASS_THRESHOLD } from '../data/sampleGames';

export default function QuizLevelSelect() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentSubject, getQuizProgress, isScienceChampion } = useApp();
  const game = location.state?.game;
  if (!game) { navigate('/dashboard'); return null; }

  const isBio = currentSubject === 'biology';
  const prog = getQuizProgress(game.id);
  const champion = isScienceChampion(game.id);
  const levels = QUIZ_LEVELS[game.id];
  const hasLevels = !!levels;

  const pal = isBio
    ? { grad:'135deg,#22C55E,#34D399', btn:'btn-bio', bg:'linear-gradient(160deg,#F0FFF4,#F8F7FF)' }
    : { grad:'135deg,#8B5CF6,#06B6D4', btn:'btn-chem', bg:'linear-gradient(160deg,#F5F3FF,#F0F9FF)' };

  const goLevel = (lvl) => {
    if (!prog.unlockedLevels.includes(lvl)) return;
    navigate('/quiz-level', { state:{ game, level:lvl } });
  };

  if (!hasLevels) {
    // Fallback to old quiz for games without level data
    navigate('/quiz', { state:{ game } });
    return null;
  }

  return (
    <div style={{ minHeight:'100vh', background:pal.bg }}>
      <Navbar/>
      <div style={{ maxWidth:700, margin:'0 auto', padding:'32px 24px' }}>
        <BackButton label="Back to Results"/>

        {/* Header */}
        <div style={{ background:`linear-gradient(${pal.grad})`, borderRadius:20, padding:'28px 32px', marginBottom:28, color:'white', textAlign:'center', position:'relative', overflow:'hidden' }}>
          <div style={{ position:'absolute', top:-10, right:-10, fontSize:'8rem', opacity:.08 }}>📝</div>
          <div style={{ fontSize:'2.5rem', marginBottom:10 }}>{game.icon}</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', marginBottom:6 }}>Quiz Challenge</h1>
          <p style={{ opacity:.9 }}>{game.title} · 3 Progressive Levels</p>
        </div>

        {/* Science Champion banner */}
        {champion && (
          <div className="a-bounce-in" style={{ background:'linear-gradient(135deg,#FFD93D,#FF9A3C)', borderRadius:20, padding:'24px', marginBottom:24, textAlign:'center', color:'white', boxShadow:'0 8px 32px rgba(255,154,60,.35)' }}>
            <div style={{ fontSize:'3rem', marginBottom:8 }}>🏅</div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', marginBottom:6 }}>SCIENCE CHAMPION!</h2>
            <p style={{ opacity:.9, fontSize:'1rem' }}>You have mastered all 3 levels! Outstanding achievement!</p>
          </div>
        )}

        <p style={{ color:'var(--text-secondary)', fontSize:'.9rem', marginBottom:24, textAlign:'center' }}>
          Pass each level ({PASS_THRESHOLD}% or above) to unlock the next. Each level has 10 questions.
        </p>

        {/* Level cards */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {[1,2,3].map(lvl => {
            const unlocked = prog.unlockedLevels.includes(lvl);
            const completed = prog.completedLevels?.[lvl];
            const levelData = levels[lvl];
            const stars = completed ? (completed.accuracy>=90?3:completed.accuracy>=70?2:1) : 0;

            return (
              <div key={lvl} onClick={()=>goLevel(lvl)} style={{
                borderRadius:20, padding:'24px 28px', cursor:unlocked?'pointer':'not-allowed',
                background: unlocked ? 'white' : '#F9FAFB',
                border:`2px solid ${unlocked ? (completed?.passed ? levelData.color+'40' : 'var(--border)') : 'var(--border)'}`,
                opacity: unlocked ? 1 : 0.6,
                display:'flex', alignItems:'center', gap:20,
                transition:'all .25s', boxShadow: unlocked ? '0 4px 16px rgba(0,0,0,.06)' : 'none',
              }}
              onMouseEnter={e=>{ if(unlocked) e.currentTarget.style.transform='translateY(-3px)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.transform=''; }}>
                {/* Level icon */}
                <div style={{ width:60, height:60, borderRadius:'50%', background: unlocked ? `linear-gradient(135deg,${levelData.color},${levelData.color}99)` : '#E5E7EB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.6rem', flexShrink:0, boxShadow: unlocked ? `0 4px 12px ${levelData.color}40` : 'none' }}>
                  {!unlocked ? <Lock size={22} color="#9CA3AF"/> : levelData.icon}
                </div>

                {/* Info */}
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                    <span style={{ fontFamily:'var(--font-heading)', fontSize:'1.1rem', fontWeight:800, color:'var(--text-primary)' }}>Level {lvl} — {levelData.label}</span>
                    {completed?.passed && <CheckCircle size={16} color="#22C55E"/>}
                    {!unlocked && <span style={{ fontSize:'.72rem', background:'#F3F4F6', color:'#6B7280', padding:'2px 10px', borderRadius:999, fontWeight:700 }}>🔒 Locked</span>}
                  </div>
                  <div style={{ fontSize:'.83rem', color:'var(--text-secondary)', marginBottom:6 }}>10 questions · {levelData.label} difficulty</div>
                  {completed && (
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ display:'flex', gap:2 }}>
                        {[1,2,3].map(s=>(
                          <span key={s} style={{ fontSize:'1rem', filter:s<=stars?'none':'grayscale(1) opacity(.3)' }}>⭐</span>
                        ))}
                      </div>
                      <span style={{ fontSize:'.8rem', fontWeight:700, color: completed.passed?'#16A34A':'#DC2626' }}>
                        {completed.accuracy}% · {completed.passed?'✓ Passed':'✗ Failed'}
                      </span>
                    </div>
                  )}
                  {unlocked && !completed && (
                    <span style={{ fontSize:'.8rem', color: levelData.color, fontWeight:700 }}>Ready to play!</span>
                  )}
                  {lvl > 1 && !unlocked && (
                    <span style={{ fontSize:'.78rem', color:'#9CA3AF' }}>Pass Level {lvl-1} to unlock</span>
                  )}
                </div>

                {unlocked && <ChevronRight size={20} color="#9CA3AF"/>}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop:24, textAlign:'center' }}>
          <button className="btn btn-secondary btn-sm" onClick={()=>navigate(isBio?'/biology':'/chemistry')}>
            Skip Quiz — Back to {isBio?'Biology':'Chemistry'}
          </button>
        </div>
      </div>
    </div>
  );
}
