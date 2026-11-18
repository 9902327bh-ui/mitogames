import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import AnswerExplanation from '../components/AnswerExplanation';
import { Confetti } from '../components/FloatingObjects';
import { RotateCcw, BookOpen, Home } from 'lucide-react';
import { QUOTES } from '../data/sampleGames';

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentSubject, user } = useApp();
  const [showConfetti, setShowConfetti] = useState(false);
  const state = location.state;
  if (!state) { navigate('/dashboard'); return null; }
  const { results=[], correct=0, total=1, accuracy=0, xp=0, game } = state;
  const isBio = currentSubject==='biology';
  const grade = user?.grade ? parseInt(user.grade) : 7;
  const quote = QUOTES[Math.floor(Math.random()*QUOTES.length)];

  useEffect(()=>{ if (accuracy>=70){ setShowConfetti(true); setTimeout(()=>setShowConfetti(false),4000); } },[]);

  const getEmoji = ()=>{ if (accuracy===100) return '🏆'; if (accuracy>=80) return '🌟'; if (accuracy>=60) return '👍'; return '💪'; };
  const getMessage = ()=>{ if (accuracy===100) return 'Perfect Score! You are a science genius!'; if (accuracy>=80) return 'Amazing work! You really know your stuff!'; if (accuracy>=60) return 'Good effort! Keep exploring!'; return 'Keep going! Every mistake is a step towards discovery!'; };

  const pal = isBio ? { grad:'135deg,#22C55E,#34D399', btn:'btn-bio' } : { grad:'135deg,#8B5CF6,#06B6D4', btn:'btn-chem' };

  return (
    <div style={{ minHeight:'100vh', background:isBio?'linear-gradient(160deg,#F0FFF4,#F8F7FF)':'linear-gradient(160deg,#F5F3FF,#F0F9FF)' }}>
      {showConfetti && <Confetti count={40}/>}
      <Navbar/>
      <div style={{ maxWidth:720, margin:'0 auto', padding:'32px 24px' }}>
        <BackButton to={isBio?'/biology':'/chemistry'} label={`Back to ${isBio?'Biology':'Chemistry'}`}/>

        {/* Score Hero */}
        <div className="card a-scale-in" style={{ padding:'40px', textAlign:'center', marginBottom:24, overflow:'hidden', position:'relative', background:`linear-gradient(${pal.grad})`, color:'white' }}>
          <div style={{ position:'absolute', top:-20, right:-20, fontSize:'9rem', opacity:.08 }}>🏆</div>
          <div style={{ fontSize:'4rem', marginBottom:12 }}>{getEmoji()}</div>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', marginBottom:8 }}>Game Complete!</h1>
          <p style={{ opacity:.9, fontSize:'1.05rem', marginBottom:24 }}>{getMessage()}</p>
          <div style={{ width:120, height:120, borderRadius:'50%', margin:'0 auto 20px', background:'rgba(255,255,255,.2)', border:'4px solid rgba(255,255,255,.5)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'2rem', lineHeight:1 }}>{accuracy}%</div>
            <div style={{ fontSize:'.72rem', opacity:.8, fontWeight:700 }}>ACCURACY</div>
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:24, flexWrap:'wrap' }}>
            {[{ icon:'✅', label:'Correct', value:correct },{ icon:'❌', label:'Incorrect', value:total-correct },{ icon:'⚡', label:'XP Earned', value:`+${xp}` }].map(s=>(
              <div key={s.label} style={{ background:'rgba(255,255,255,.2)', borderRadius:14, padding:'12px 20px', textAlign:'center' }}>
                <div style={{ fontSize:'1.4rem', marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', lineHeight:1 }}>{s.value}</div>
                <div style={{ fontSize:'.72rem', opacity:.8, fontWeight:700 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stars */}
        <div className="card a-fade-in d-2" style={{ padding:'24px', marginBottom:24, textAlign:'center' }}>
          {[1,2,3].map(i=>(
            <span key={i} style={{ fontSize:'2.4rem', margin:'0 4px', filter:i<=Math.ceil(accuracy/34)?'none':'grayscale(1) opacity(0.3)', animation:i<=Math.ceil(accuracy/34)?`starPop .4s cubic-bezier(.36,.07,.19,.97) ${i*.15}s both`:'none' }}>⭐</span>
          ))}
          <p style={{ color:'var(--text-secondary)', fontWeight:700, fontSize:'.9rem', marginTop:8 }}>
            {accuracy===100?'3/3 Stars – Perfect!':accuracy>=67?'2/3 Stars – Great!':'1/3 Stars – Keep Going!'}
          </p>
        </div>

        {/* Detailed Mistake Analysis */}
        {results.length > 0 && (
          <div className="card a-fade-in d-3" style={{ padding:'24px', marginBottom:24 }}>
            <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.15rem', marginBottom:6 }}>📋 Answer Analysis</h3>
            <p style={{ fontSize:'.83rem', color:'var(--text-secondary)', marginBottom:16 }}>
              {results.filter(r=>!r.correct).length===0 ? 'All correct! Brilliant work! 🎉' : `Click on incorrect answers to see detailed explanations.`}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {results.map((r,i)=>(
                <div key={i}>
                  <div style={{ fontSize:'.8rem', fontWeight:700, color:'var(--text-secondary)', marginBottom:4 }}>
                    Q{i+1}: {r.q?.question||r.q?.statement||r.q?.unbalanced||`Item ${i+1}`}
                  </div>
                  <AnswerExplanation
                    compact={true}
                    defaultOpen={false}
                    correct={r.correct}
                    selectedOption={r.selectedText || (r.q?.options?.[r.selectedIndex])}
                    correctOption={r.correctText || (r.q?.options?.[r.q?.correct]) || r.q?.answer || (r.q?.answer===true?'TRUE':'FALSE')}
                    explanation={r.q ? (r.q.explanationSimple && grade<=3 ? r.q.explanationSimple : r.q.explanationAdvanced && grade>=8 ? r.q.explanationAdvanced : r.q.explanation) : ''}
                    wrongExplanation={!r.correct && r.q?.wrongExplanations ? r.q.wrongExplanations[r.selectedIndex] : null}
                    concept={r.q?.concept}
                    grade={grade}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quote */}
        <div className="a-fade-in d-4" style={{ textAlign:'center', padding:'20px', marginBottom:28, background:'white', borderRadius:16, boxShadow:'0 4px 16px rgba(0,0,0,.06)', fontFamily:'var(--font-heading)', fontSize:'1.05rem', color:'var(--text-secondary)', fontStyle:'italic', lineHeight:1.6 }}>
          {quote}
        </div>

        {/* Action Buttons */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14 }}>
          <button className="btn btn-secondary" onClick={()=>navigate('/game')}><RotateCcw size={16}/> Play Again</button>
          <button className={`btn ${pal.btn}`} onClick={()=>navigate(['verbatim3d','verbatimBio3d'].includes(game?.gameType) ? '/quiz' : '/quiz-levels', { state:{ game } })}><BookOpen size={16}/> Take a Quiz</button>
          <button className="btn" style={{ background:'white', color:'var(--text-secondary)', border:'2px solid var(--border)' }} onClick={()=>navigate(isBio?'/biology':'/chemistry')}><Home size={16}/> Done</button>
        </div>
      </div>
    </div>
  );
}
