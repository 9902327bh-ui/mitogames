import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import { Confetti } from '../components/FloatingObjects';
import { CheckCircle, XCircle, ArrowLeft, RotateCcw, Home } from 'lucide-react';
import { QuizScreen as VerbatimQuizScreen } from '../verbatim/components/QuizScreen.tsx';
import { QuizScreen as VerbatimBioQuizScreen } from '../verbatimBio/components/QuizScreen.tsx';

function buildQuizQuestions(game) {
  if (!game) return [];
  const questions = [];
  const src = game.questions || game.pairs || game.equations || [];

  src.forEach((item, i) => {
    if (game.gameType === 'mcq' || game.gameType === 'truefalse') {
      questions.push({ type:'mcq', ...item, id:`q-${i}` });
    } else if (game.gameType === 'fill') {
      questions.push({ type:'fill', ...item, id:`q-${i}` });
      questions.push({
        type:'truefalse',
        id:`tf-${i}`,
        statement: item.question.replace('______', item.answer),
        answer: true,
        explanation: item.explanation,
      });
    } else if (game.gameType === 'matching') {
      questions.push({
        type:'mcq', id:`match-${i}`,
        question: `What best describes "${item.left}"?`,
        options: src.map(x=>x.right).sort(()=>Math.random()-.5).slice(0,4),
        correct: 0,
        correctText: item.right,
        explanation: `"${item.left}" refers to: ${item.right}`,
      });
    } else if (game.gameType === 'balancer') {
      questions.push({
        type:'fill', id:`bal-${i}`,
        question: `The balanced form of "${item.unbalanced}" is?`,
        answer: item.balanced,
        hint: 'Count atoms on both sides.',
        explanation: item.explanation,
      });
    }
  });

  return questions.slice(0, 8);
}

function FlashCard({ item, onAnswer }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div style={{ textAlign:'center' }}>
      <p style={{ color:'var(--text-secondary)', fontSize:'.9rem', marginBottom:16 }}>Click the card to reveal the answer!</p>
      <div onClick={() => setFlipped(!flipped)} style={{
        minHeight:180, borderRadius:20, padding:'32px 28px', cursor:'pointer',
        background: flipped ? 'linear-gradient(135deg,#22C55E,#34D399)' : 'linear-gradient(135deg,#F3F4F6,#E5E7EB)',
        color: flipped ? 'white' : 'var(--text-primary)', transition:'all .4s',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontFamily:'var(--font-heading)', fontSize:'1.2rem', lineHeight:1.5, textAlign:'center',
        boxShadow:'0 8px 32px rgba(0,0,0,.1)', border:'2px solid rgba(0,0,0,.05)',
      }}>
        {flipped
          ? (item.answer || item.right || item.balanced || 'Answer revealed!')
          : (item.question || item.left || item.unbalanced || 'Click to see the question')
        }
      </div>
      {flipped && (
        <div style={{ marginTop:20, display:'flex', gap:12, justifyContent:'center' }}>
          <button className="btn btn-bio btn-sm" onClick={() => onAnswer(true)}>✓ Got it!</button>
          <button className="btn btn-danger btn-sm" onClick={() => onAnswer(false)}>✗ Review again</button>
        </div>
      )}
    </div>
  );
}

export default function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentSubject, addQuizXP, addHistory, user } = useApp();
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [verbatimQuiz, setVerbatimQuiz] = useState([]);
  const [verbatimQuizLoading, setVerbatimQuizLoading] = useState(false);
  const [verbatimQuizError, setVerbatimQuizError] = useState('');

  const game = location.state?.game;
  const verbatimExperiment = game?.verbatimResult?.electroExperiment || game?.verbatimResult?.experiment;
  useEffect(() => {
    if (game?.gameType !== 'verbatim3d' || !verbatimExperiment) return;
    if (verbatimExperiment.quiz?.length) {
      setVerbatimQuiz(verbatimExperiment.quiz);
      return;
    }
    let active = true;
    setVerbatimQuizLoading(true);
    fetch('/api/quiz', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body:JSON.stringify({
        experimentTitle:verbatimExperiment.experimentTitle,
        conceptSummary:verbatimExperiment.conceptSummary,
        scienceNotes:verbatimExperiment.steps?.map(step=>step.scienceNote) || [],
        sceneKind:game.verbatimResult.sceneKind === 'electro' || game.verbatimResult.electroExperiment ? 'electro' : 'reaction',
      }),
    }).then(async response => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The bonus quiz could not be prepared.');
      if (active) setVerbatimQuiz(Array.isArray(data.quiz) ? data.quiz : []);
    }).catch(error => {
      if (active) setVerbatimQuizError(error instanceof Error ? error.message : 'The bonus quiz could not be prepared.');
    }).finally(() => { if (active) setVerbatimQuizLoading(false); });
    return () => { active = false; };
  }, [game?.gameType, game?.verbatimResult?.id]);
  if (!game) { navigate('/dashboard'); return null; }

  if (game.gameType === 'verbatim3d') {
    const result = game.verbatimResult;
    const experiment = result?.electroExperiment || result?.experiment;
    const quiz = verbatimQuiz;
    if (!experiment) return <div className="page" style={{ padding:32 }}><div className="card" style={{ padding:24 }}>The experiment quiz is unavailable. Return to Chemistry to choose another lab.</div></div>;
    return <div className="page verbatim-quiz" style={{ background:'linear-gradient(160deg,#F5F3FF,#F0F9FF)' }}>
      <Navbar />
      <div style={{ maxWidth:860, margin:'0 auto', padding:'24px 20px' }}>
        <div className="card" style={{ padding:24, border:'2px solid rgba(139,92,246,.2)' }}>
          {verbatimQuizLoading ? <div style={{ textAlign:'center', padding:32, color:'var(--text-secondary)' }}>Preparing your experiment bonus quiz…</div> : verbatimQuizError ? <div role="alert" style={{ textAlign:'center', padding:32, color:'var(--secondary)' }}>{verbatimQuizError}</div> : <VerbatimQuizScreen
            experiment={experiment}
            questions={quiz}
            onCompleteQuiz={(bonus, correctCount) => {
              addQuizXP(bonus);
              addHistory({ type:'quiz', title:`${experiment.experimentTitle} Bonus Quiz`, subject:'chemistry', correct:correctCount, total:quiz.length, xp:bonus });
            }}
            onBackToLab={() => navigate('/game')}
            onNewExperiment={() => navigate('/chemistry')}
          />}
        </div>
      </div>
    </div>;
  }

  if (game.gameType === 'verbatimBio3d') {
    const experiment = game.verbatimBioExperiment;
    if (!experiment) return <div className="page" style={{ padding:32 }}><div className="card" style={{ padding:24 }}>The Biology quiz is unavailable. Return to Biology and choose another lab.</div></div>;
    return <div className="page verbatim-quiz" style={{ background:'linear-gradient(160deg,#F0FFF4,#F8F7FF)' }}>
      <Navbar />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 20px' }}>
        <div className="card" style={{ padding:24, border:'2px solid rgba(34,197,94,.2)' }}>
          <VerbatimBioQuizScreen
            experiment={experiment}
            classLevel={Number(user?.grade) || 8}
            onAwardQuizPoints={(bonus) => {
              addQuizXP(bonus);
              addHistory({ type:'quiz', title:`${experiment.experimentTitle} Bonus Quiz`, subject:'biology', correct:0, total:experiment.quiz?.length || 0, xp:bonus });
            }}
            onBackToLab={() => navigate('/game')}
            onNewExperiment={() => navigate('/biology')}
          />
        </div>
      </div>
    </div>;
  }

  const questions = useMemo(() => buildQuizQuestions(game), [game]);
  const isBio = currentSubject === 'biology';
  const q = questions[idx];
  const total = questions.length;

  if (!q) { navigate('/dashboard'); return null; }

  const recordAnswer = (isCorrect) => {
    setResults(r => [...r, { correct: isCorrect, q }]);
    setAnswered(true);
  };

  const next = () => {
    if (idx + 1 >= total) {
      const correct = results.filter(r=>r.correct).length + (answered&&results[results.length-1]?.correct===undefined?0:0);
      const finalCorrect = results.filter(r=>r.correct).length;
      const acc = Math.round((finalCorrect/results.length)*100);
      const xp = Math.round(acc * 0.3) + 10;
      addQuizXP(xp);
      addHistory({ type:'quiz', title:`${game.title} Quiz`, subject:currentSubject, correct:finalCorrect, total:results.length, xp });
      if (acc >= 70) setShowConfetti(true);
      setDone(true);
      return;
    }
    setIdx(i=>i+1); setInput(''); setSelected(null); setAnswered(false);
  };

  if (done) {
    const correct = results.filter(r=>r.correct).length;
    const acc = Math.round((correct/results.length)*100);
    const xp = Math.round(acc*0.3)+10;
    return (
      <div style={{ minHeight:'100vh', background: isBio?'linear-gradient(160deg,#F0FFF4,#F8F7FF)':'linear-gradient(160deg,#F5F3FF,#F0F9FF)' }}>
        {showConfetti && <Confetti count={30}/>}
        <Navbar/>
        <div style={{ maxWidth:680, margin:'0 auto', padding:'48px 24px', textAlign:'center' }}>
          <div className="card a-scale-in" style={{ padding:'44px 36px', marginBottom:20, border: isBio ? '2px solid rgba(34,197,94,.2)' : '2px solid rgba(139,92,246,.2)', borderRadius:28, boxShadow:'0 16px 40px rgba(0,0,0,.08)' }}>
            <div style={{ fontSize:'4.2rem', marginBottom:14 }}>{acc>=80?'🏆':acc>=60?'🌟':'💪'}</div>
            <span className="chip" style={{ background: isBio?'#DCFCE7':'#EDE9FE', color: isBio?'#16A34A':'#6D28D9', marginBottom:12 }}>
              {isBio ? '🌱 Biology Quiz' : '⚗️ Chemistry Quiz'}
            </span>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2.2rem', marginBottom:8, color:'var(--text-primary)' }}>Quiz Complete!</h1>
            <p style={{ color:'var(--text-secondary)', fontSize:'1.05rem', marginBottom:30 }}>
              You scored <strong style={{ color:'var(--text-primary)' }}>{correct} / {results.length}</strong> ({acc}% accuracy)
            </p>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px, 1fr))', gap:16, marginBottom:32 }}>
              {[
                { icon:'✅', val:correct, lbl:'Correct', bg:'#F0FDF4', border:'#BBF7D0', col:'#16A34A' },
                { icon:'❌', val:results.length-correct, lbl:'Incorrect', bg:'#FEF2F2', border:'#FECACA', col:'#DC2626' },
                { icon:'⚡', val:`+${xp} XP`, lbl:'XP Earned', bg:'#FEFCE8', border:'#FEF08A', col:'#CA8A04' },
              ].map(s=>(
                <div key={s.lbl} style={{ textAlign:'center', background:s.bg, border:`1.5px solid ${s.border}`, borderRadius:18, padding:'18px 16px', boxShadow:'0 2px 8px rgba(0,0,0,.03)' }}>
                  <div style={{ fontSize:'1.7rem', marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', color:s.col, fontWeight:800 }}>{s.val}</div>
                  <div style={{ fontSize:'.78rem', color:'var(--text-secondary)', fontWeight:700, textTransform:'uppercase', letterSpacing:.5, marginTop:2 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
            {correct < results.length && (
              <div style={{ background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:18, padding:'18px 20px', marginBottom:28, textAlign:'left' }}>
                <div style={{ fontWeight:800, marginBottom:10, color:'#92400E', display:'flex', alignItems:'center', gap:6, fontSize:'.95rem' }}>
                  <span>📚</span> Review these topics:
                </div>
                {results.filter(r=>!r.correct).map((r,i)=>(
                  <div key={i} style={{ fontSize:'.88rem', color:'#78350F', marginBottom:6, display:'flex', alignItems:'baseline', gap:8, lineHeight:1.5 }}>
                    <span style={{ color:'#D97706', fontWeight:800 }}>•</span>
                    <span>{r.q?.question||r.q?.statement||`Question ${i+1}`}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-secondary" onClick={() => { setDone(false); setIdx(0); setResults([]); setAnswered(false); setInput(''); setSelected(null); }}>
                <RotateCcw size={16}/> Retry Quiz
              </button>
              <button className={`btn ${isBio?'btn-bio':'btn-chem'}`} onClick={() => navigate(isBio?'/biology':'/chemistry')}>
                <Home size={16}/> Back to {isBio?'Biology':'Chemistry'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const pal = isBio
    ? { grad:'135deg,#22C55E,#34D399', btn:'btn-bio', dark:'#16A34A' }
    : { grad:'135deg,#8B5CF6,#06B6D4', btn:'btn-chem', dark:'#6D28D9' };

  const renderQuestion = () => {
    if (q.type === 'truefalse') {
      return (
        <div>
          <div style={{ background:'#F8FAFC', borderRadius:20, padding:'28px 24px', marginBottom:24, textAlign:'center', fontFamily:'var(--font-heading)', fontSize:'1.25rem', lineHeight:1.6, border:'1.5px solid #E2E8F0', color:'var(--text-primary)' }}>
            "{q.statement}"
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[true,false].map(val => {
              let bg='white', border='#E2E8F0', textCol='var(--text-primary)';
              if (answered) {
                if (val===q.answer) { bg='#F0FDF4'; border='#22C55E'; textCol='#15803D'; }
                else if (val===selected) { bg='#FEF2F2'; border='#EF4444'; textCol='#B91C1C'; }
              }
              return (
                <button key={String(val)} onClick={()=>{if(!answered){setSelected(val);recordAnswer(val===q.answer);}}} style={{
                  padding:'22px 16px', borderRadius:18, border:`2.5px solid ${border}`, background:bg,
                  cursor:answered?'default':'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all .2s ease',
                  boxShadow:'0 2px 10px rgba(0,0,0,.04)', color:textCol
                }}>
                  <span style={{fontSize:'2.2rem'}}>{val?'✅':'❌'}</span>
                  <span style={{fontWeight:800,fontSize:'1.05rem',letterSpacing:.5}}>{val?'TRUE':'FALSE'}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    if (q.type === 'fill') {
      const isCorrect = input.trim().toLowerCase() === (q.answer||'').toLowerCase();
      return (
        <div>
          <p style={{ fontFamily:'var(--font-heading)', fontSize:'1.25rem', marginBottom:22, lineHeight:1.55, color:'var(--text-primary)', fontWeight:700 }}>{q.question}</p>
          <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap' }}>
            <input className="input-field" value={input} onChange={e=>!answered&&setInput(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&!answered&&input.trim()&&recordAnswer(input.trim().toLowerCase()===(q.answer||'').toLowerCase())}
              placeholder="Type your answer..." disabled={answered} style={{flex:1, minWidth:220, fontSize:'1.05rem', padding:'14px 20px', borderRadius:16}}/>
            {!answered && (
              <button className={`btn ${pal.btn}`} onClick={()=>recordAnswer(input.trim().toLowerCase()===(q.answer||'').toLowerCase())} disabled={!input.trim()} style={{borderRadius:16, padding:'14px 28px'}}>
                Submit
              </button>
            )}
          </div>
          {answered && (
            <div style={{ padding:'16px 20px', borderRadius:16, background:isCorrect?'#F0FDF4':'#FEF2F2', border:`2px solid ${isCorrect?'#86EFAC':'#FECACA'}`, fontSize:'.95rem', fontWeight:700, color:isCorrect?'#166534':'#991B1B', display:'flex', alignItems:'center', gap:8 }}>
              <span>{isCorrect?'✓ Correct! Great job!':'✗ Correct answer: ' + q.answer}</span>
            </div>
          )}
        </div>
      );
    }
    // MCQ default
    const opts = q.correctText
      ? [...(q.options||[]).filter(o=>o!==q.correctText).slice(0,3), q.correctText].sort(()=>Math.random()-.5)
      : q.options || [];
    return (
      <div>
        <p style={{ fontFamily:'var(--font-heading)', fontSize:'1.25rem', marginBottom:22, lineHeight:1.55, color:'var(--text-primary)', fontWeight:700 }}>{q.question}</p>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {opts.map((opt,i) => {
            const isCorrect = opt === (q.correctText || opts[q.correct]);
            let bg='white', border='#E2E8F0', col='var(--text-primary)', badgeBg='#F1F5F9', badgeCol='var(--text-secondary)';
            if (answered) {
              if (isCorrect) {
                bg='#F0FDF4'; border='#22C55E'; col='#15803D';
                badgeBg='#22C55E'; badgeCol='white';
              } else if (opt===selected&&!isCorrect) {
                bg='#FEF2F2'; border='#EF4444'; col='#B91C1C';
                badgeBg='#EF4444'; badgeCol='white';
              } else {
                bg='#F8FAFC'; border='#E2E8F0'; col='#94A3B8';
                badgeBg='#F1F5F9'; badgeCol='#94A3B8';
              }
            }
            return (
              <button key={i} onClick={()=>{if(!answered){setSelected(opt);recordAnswer(opt===(q.correctText||opts[q.correct]));} }} style={{
                background:bg, border:`2px solid ${border}`, borderRadius:16, padding:'16px 20px',
                textAlign:'left', cursor:answered?'default':'pointer', fontFamily:'var(--font-body)',
                fontWeight:600, fontSize:'.96rem', color:col, transition:'all .2s ease', display:'flex', alignItems:'center', justifyContent:'space-between', gap:14,
                boxShadow:'0 2px 8px rgba(0,0,0,.03)'
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, minWidth:0 }}>
                  <span style={{
                    width:32, height:32, borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center',
                    fontSize:'.85rem', fontWeight:800, flexShrink:0, background: badgeBg, color: badgeCol,
                    transition:'all .2s ease'
                  }}>
                    {answered&&isCorrect?'✓':answered&&opt===selected?'✗':String.fromCharCode(65+i)}
                  </span>
                  <span style={{ lineHeight:1.4 }}>{opt}</span>
                </div>
                {answered && isCorrect && (
                  <span style={{ fontSize:'.8rem', fontWeight:800, color:'#15803D', background:'#DCFCE7', padding:'4px 10px', borderRadius:999, flexShrink:0 }}>
                    Correct
                  </span>
                )}
                {answered && opt===selected && !isCorrect && (
                  <span style={{ fontSize:'.8rem', fontWeight:800, color:'#B91C1C', background:'#FEE2E2', padding:'4px 10px', borderRadius:999, flexShrink:0 }}>
                    Incorrect
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight:'100vh', background: isBio?'linear-gradient(160deg,#F0FFF4,#F8F7FF)':'linear-gradient(160deg,#F5F3FF,#F0F9FF)' }}>
      <Navbar/>
      <div style={{ maxWidth:740, margin:'0 auto', padding:'36px 24px' }}>

        {/* Header banner */}
        <div style={{
          background:`linear-gradient(${pal.grad})`, borderRadius:24, padding:'22px 28px', marginBottom:20, color:'white',
          display:'flex', alignItems:'center', justifyContent:'space-between', boxShadow:'0 10px 25px rgba(0,0,0,.1)'
        }}>
          <div>
            <span style={{ textTransform:'uppercase', fontSize:'.72rem', letterSpacing:1.5, opacity:.9, fontWeight:800 }}>
              {isBio ? '🌱 Biology Lab Quiz' : '⚗️ Chemistry Lab Quiz'}
            </span>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.45rem', marginTop:2 }}>{game.title}</div>
          </div>
          <div style={{ textAlign:'right', background:'rgba(255,255,255,.2)', padding:'8px 16px', borderRadius:16, backdropFilter:'blur(4px)' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', lineHeight:1 }}>{idx+1} <span style={{ fontSize:'1rem', opacity:.8 }}>/ {total}</span></div>
            <div style={{ opacity:.85, fontSize:'.72rem', fontWeight:700, textTransform:'uppercase', marginTop:2 }}>Question</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ background:'white', borderRadius:16, padding:'14px 20px', marginBottom:20, border:'1.5px solid rgba(0,0,0,.05)', boxShadow:'0 2px 10px rgba(0,0,0,.03)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'.82rem', fontWeight:700, color:'var(--text-secondary)', marginBottom:8 }}>
            <span>Progress: {Math.round(((idx)/total)*100)}%</span>
            <span>🎯 {results.filter(r=>r.correct).length} of {idx} correct</span>
          </div>
          <div className="progress-bar" style={{ height:10, borderRadius:999, background:'#F1F5F9' }}>
            <div className={`progress-fill ${isBio?'progress-fill-bio':'progress-fill-chem'}`} style={{ width:`${((idx)/total)*100}%` }}/>
          </div>
        </div>

        {/* Question Card */}
        <div className="card" style={{
          padding:'36px 32px', marginBottom:24, borderRadius:26,
          border:`2px solid ${isBio?'rgba(34,197,94,.2)':'rgba(139,92,246,.2)'}`,
          boxShadow:'0 12px 36px rgba(0,0,0,.06)'
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
            <span className="chip" style={{ background: isBio?'#DCFCE7':'#EDE9FE', color: isBio?'#16A34A':'#6D28D9', padding:'6px 14px', fontSize:'.82rem' }}>
              {q.type==='fill'?'✍️ Fill in the Blank':q.type==='truefalse'?'⚖️ True or False':'🎯 Multiple Choice'}
            </span>
            <span style={{ fontSize:'.85rem', color:'var(--text-secondary)', fontWeight:700, background:'#F8FAFC', padding:'6px 12px', borderRadius:12 }}>
              Question {idx+1} of {total}
            </span>
          </div>

          {renderQuestion()}

          {answered && (
            <div style={{ marginTop:24, paddingTop:20, borderTop:'1.5px dashed #E2E8F0' }}>
              {q.explanation && (
                <div style={{
                  background:'linear-gradient(135deg, #FFFBEB, #FEF3C7)', border:'1.5px solid #FCD34D',
                  borderRadius:18, padding:'16px 20px', marginBottom:18, fontSize:'.92rem', color:'#78350F', lineHeight:1.6,
                  boxShadow:'0 2px 8px rgba(251,191,36,.1)'
                }}>
                  <strong style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, color:'#92400E' }}>
                    <span>💡</span> Scientific Explanation:
                  </strong>
                  {q.explanation}
                </div>
              )}
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button className={`btn ${pal.btn} btn-lg`} onClick={next} style={{ borderRadius:16 }}>
                  {idx+1>=total ? 'See Quiz Results 🏆' : 'Next Question →'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
