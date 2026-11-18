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
        <div style={{ maxWidth:640, margin:'0 auto', padding:'40px 24px', textAlign:'center' }}>
          <div className="card a-scale-in" style={{ padding:'40px', marginBottom:20 }}>
            <div style={{ fontSize:'4rem', marginBottom:12 }}>{acc>=80?'🏆':acc>=60?'🌟':'💪'}</div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'2rem', marginBottom:8 }}>Quiz Complete!</h1>
            <p style={{ color:'var(--text-secondary)', marginBottom:28 }}>
              You scored <strong>{correct}/{results.length}</strong> ({acc}% accuracy)
            </p>
            <div style={{ display:'flex', justifyContent:'center', gap:20, flexWrap:'wrap', marginBottom:28 }}>
              {[
                { icon:'✅', val:correct, lbl:'Correct' },
                { icon:'❌', val:results.length-correct, lbl:'Incorrect' },
                { icon:'⚡', val:`+${xp}`, lbl:'XP Earned' },
              ].map(s=>(
                <div key={s.lbl} style={{ textAlign:'center', background:'#F9FAFB', borderRadius:12, padding:'14px 20px' }}>
                  <div style={{ fontSize:'1.5rem', marginBottom:4 }}>{s.icon}</div>
                  <div style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', color:'var(--primary)' }}>{s.val}</div>
                  <div style={{ fontSize:'.75rem', color:'var(--text-secondary)', fontWeight:700 }}>{s.lbl}</div>
                </div>
              ))}
            </div>
            {correct < results.length && (
              <div style={{ background:'#FFF9EB', borderRadius:14, padding:'16px 18px', marginBottom:24, textAlign:'left' }}>
                <div style={{ fontWeight:800, marginBottom:8, color:'#92400E' }}>📚 Review these topics:</div>
                {results.filter(r=>!r.correct).map((r,i)=>(
                  <div key={i} style={{ fontSize:'.85rem', color:'var(--text-secondary)', marginBottom:4 }}>
                    • {r.q?.question||r.q?.statement||`Question ${i+1}`}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
              <button className="btn btn-secondary" onClick={() => { setDone(false); setIdx(0); setResults([]); setAnswered(false); setInput(''); setSelected(null); }}>
                <RotateCcw size={15}/> Retry Quiz
              </button>
              <button className={`btn ${isBio?'btn-bio':'btn-chem'}`} onClick={() => navigate(isBio?'/biology':'/chemistry')}>
                <Home size={15}/> Back to {isBio?'Biology':'Chemistry'}
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
          <div style={{ background:'#F9FAFB', borderRadius:16, padding:'24px', marginBottom:24, textAlign:'center', fontFamily:'var(--font-heading)', fontSize:'1.2rem', lineHeight:1.5 }}>
            "{q.statement}"
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            {[true,false].map(val => {
              let bg='white', border='var(--border)';
              if (answered) {
                if (val===q.answer) { bg='#F0FFF4'; border='#22C55E'; }
                else if (val===selected) { bg='#FFF5F5'; border='#EF4444'; }
              }
              return (
                <button key={String(val)} onClick={()=>{if(!answered){setSelected(val);recordAnswer(val===q.answer);}}} style={{
                  padding:'20px', borderRadius:14, border:`2.5px solid ${border}`, background:bg,
                  cursor:answered?'default':'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, transition:'all .2s',
                }}>
                  <span style={{fontSize:'2rem'}}>{val?'✅':'❌'}</span>
                  <span style={{fontWeight:800,fontSize:'1rem'}}>{val?'TRUE':'FALSE'}</span>
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
          <p style={{ fontFamily:'var(--font-heading)', fontSize:'1.15rem', marginBottom:20, lineHeight:1.5 }}>{q.question}</p>
          <input className="input-field" value={input} onChange={e=>!answered&&setInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!answered&&input.trim()&&recordAnswer(input.trim().toLowerCase()===(q.answer||'').toLowerCase())}
            placeholder="Your answer..." disabled={answered} style={{marginBottom:14,fontSize:'1.1rem'}}/>
          {!answered && (
            <button className={`btn ${pal.btn}`} onClick={()=>recordAnswer(input.trim().toLowerCase()===(q.answer||'').toLowerCase())} disabled={!input.trim()}>
              Submit
            </button>
          )}
          {answered && (
            <div style={{ padding:'12px 16px', borderRadius:12, background:isCorrect?'#F0FFF4':'#FFF5F5', border:`1.5px solid ${isCorrect?'#22C55E':'#EF4444'}`, fontSize:'.9rem', fontWeight:700, color:isCorrect?'#16A34A':'#DC2626' }}>
              {isCorrect?'✓ Correct!':'✗ Answer: '+q.answer}
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
        <p style={{ fontFamily:'var(--font-heading)', fontSize:'1.15rem', marginBottom:20, lineHeight:1.5 }}>{q.question}</p>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {opts.map((opt,i) => {
            const isCorrect = opt === (q.correctText || opts[q.correct]);
            let bg='white', border='var(--border)', col='var(--text-primary)';
            if (answered) {
              if (isCorrect) { bg='#F0FFF4'; border='#22C55E'; col='#16A34A'; }
              else if (opt===selected&&!isCorrect) { bg='#FFF5F5'; border='#EF4444'; col='#DC2626'; }
            }
            return (
              <button key={i} onClick={()=>{if(!answered){setSelected(opt);recordAnswer(opt===(q.correctText||opts[q.correct]));} }} style={{
                background:bg, border:`2px solid ${border}`, borderRadius:12, padding:'13px 18px',
                textAlign:'left', cursor:answered?'default':'pointer', fontFamily:'var(--font-body)',
                fontWeight:600, fontSize:'.92rem', color:col, transition:'all .2s', display:'flex', alignItems:'center', gap:10,
              }}>
                <span style={{ width:28, height:28, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'.8rem', fontWeight:800, flexShrink:0, background: answered&&isCorrect?'#22C55E':answered&&opt===selected?'#EF4444':'#F3F4F6', color: answered&&(isCorrect||opt===selected)?'white':'var(--text-secondary)' }}>
                  {answered&&isCorrect?'✓':answered&&opt===selected?'✗':String.fromCharCode(65+i)}
                </span>
                {opt}
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
      <div style={{ maxWidth:700, margin:'0 auto', padding:'28px 24px' }}>

        {/* Header */}
        <div style={{ background:`linear-gradient(${pal.grad})`, borderRadius:20, padding:'18px 24px', marginBottom:24, color:'white', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem' }}>📝 Quiz Time!</div>
            <div style={{ opacity:.85, fontSize:'.83rem' }}>{game.title}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem' }}>{idx+1}/{total}</div>
            <div style={{ opacity:.8, fontSize:'.75rem' }}>Question</div>
          </div>
        </div>

        {/* Progress */}
        <div className="progress-bar" style={{ marginBottom:24 }}>
          <div className={`progress-fill ${isBio?'progress-fill-bio':'progress-fill-chem'}`} style={{ width:`${((idx)/total)*100}%` }}/>
        </div>

        {/* Question Card */}
        <div className="card" style={{ padding:'32px', marginBottom:20, border:`2px solid ${isBio?'rgba(34,197,94,.15)':'rgba(139,92,246,.15)'}` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <span className="chip" style={{ background: isBio?'#DCFCE7':'#EDE9FE', color: isBio?'#16A34A':'#6D28D9' }}>
              {q.type==='fill'?'Fill in the Blank':q.type==='truefalse'?'True or False':'Multiple Choice'}
            </span>
            <span style={{ fontSize:'.8rem', color:'var(--text-secondary)', fontWeight:600 }}>
              ✅ {results.filter(r=>r.correct).length} correct so far
            </span>
          </div>
          {renderQuestion()}

          {answered && (
            <div style={{ marginTop:18 }}>
              {q.explanation && (
                <div style={{ background:'#FFF9EB', border:'2px solid #FFD93D', borderRadius:12, padding:'12px 16px', marginBottom:14, fontSize:'.88rem', color:'#92400E', lineHeight:1.6 }}>
                  💡 {q.explanation}
                </div>
              )}
              <button className={`btn ${pal.btn}`} onClick={next}>
                {idx+1>=total ? 'See Quiz Results 🏆' : 'Next Question →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
