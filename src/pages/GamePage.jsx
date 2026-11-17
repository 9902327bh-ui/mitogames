import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import AnswerExplanation from '../components/AnswerExplanation';
import { getAdaptiveExplanation } from '../data/sampleGames';
import { Lightbulb, ArrowLeft } from 'lucide-react';
import { Lab3D } from '../verbatim/components/Lab3D.tsx';
import { Electro3D } from '../verbatim/components/Electro3D.tsx';

function MCQGame({ questions, onComplete, isBio, grade }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState([]);
  const q = questions[idx];
  const answered = selected !== null;

  const choose = (i) => {
    if (answered) return;
    setSelected(i);
    setResults(r => [...r, { correct: i === q.correct, selectedIndex: i, selectedText: q.options[i], correctText: q.options[q.correct], q }]);
  };
  const next = () => {
    if (idx + 1 >= questions.length) { onComplete(results); return; }
    setIdx(i => i+1); setSelected(null); setShowHint(false);
  };

  return (
    <div>
      <div style={{ marginBottom:20, fontSize:'.88rem', color:'var(--text-secondary)', fontWeight:600 }}>Question {idx+1} of {questions.length}</div>
      <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'1.3rem', marginBottom:24, lineHeight:1.4, color:'var(--text-primary)' }}>{q.question}</h2>
      <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:16 }}>
        {q.options.map((opt, i) => {
          let bg='white', border='var(--border)', color='var(--text-primary)';
          if (answered) {
            if (i===q.correct) { bg='#F0FFF4'; border='#22C55E'; color='#16A34A'; }
            else if (i===selected) { bg='#FFF5F5'; border='#EF4444'; color='#DC2626'; }
          }
          return (
            <button key={i} onClick={()=>choose(i)} style={{ background:bg, border:`2px solid ${border}`, borderRadius:14, padding:'14px 18px', textAlign:'left', cursor:answered?'default':'pointer', fontFamily:'var(--font-body)', fontWeight:600, fontSize:'.95rem', color, transition:'all .2s', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ width:30, height:30, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'.85rem', fontWeight:800, flexShrink:0, background: answered&&i===q.correct?'#22C55E':answered&&i===selected&&i!==q.correct?'#EF4444':'#F3F4F6', color: answered&&(i===q.correct||(i===selected&&i!==q.correct))?'white':'var(--text-secondary)' }}>
                {answered&&i===q.correct?'✓':answered&&i===selected?'✗':String.fromCharCode(65+i)}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {!answered && (
        <button onClick={()=>setShowHint(!showHint)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'#FF9A3C', fontFamily:'var(--font-body)', fontWeight:700, fontSize:'.88rem' }}>
          <Lightbulb size={15}/> {showHint?'Hide hint':'Show hint'}
        </button>
      )}
      {showHint && !answered && (
        <div style={{ background:'#FFF9EB', border:'2px solid #FFD93D', borderRadius:12, padding:'12px 16px', marginTop:10, fontSize:'.88rem', color:'#92400E' }}>💡 {q.hint}</div>
      )}
      {answered && (
        <AnswerExplanation
          correct={selected===q.correct}
          selectedOption={q.options[selected]}
          correctOption={q.options[q.correct]}
          explanation={getAdaptiveExplanation(q, grade)}
          wrongExplanation={selected!==q.correct && q.wrongExplanations ? q.wrongExplanations[selected] : null}
          concept={q.concept}
          grade={grade}
          onNext={next}
          isLast={idx+1>=questions.length}
        />
      )}
    </div>
  );
}

function FillGame({ questions, onComplete, isBio, grade }) {
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [results, setResults] = useState([]);
  const q = questions[idx];
  const isCorrect = input.trim().toLowerCase() === q.answer.toLowerCase();

  const submit = () => {
    if (!input.trim()) return;
    setSubmitted(true);
    setResults(r => [...r, { correct: isCorrect, selectedText: input.trim(), correctText: q.answer, q }]);
  };
  const next = () => {
    if (idx+1>=questions.length) { onComplete(results); return; }
    setIdx(i=>i+1); setInput(''); setSubmitted(false); setShowHint(false);
  };

  return (
    <div>
      <div style={{ marginBottom:20, fontSize:'.88rem', color:'var(--text-secondary)', fontWeight:600 }}>Question {idx+1} of {questions.length}</div>
      <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'1.3rem', marginBottom:24, lineHeight:1.5, color:'var(--text-primary)' }}>{q.question.replace('______','_______')}</h2>
      <input className={`input-field${submitted?(isCorrect?' ':'error'):''}`} value={input} onChange={e=>!submitted&&setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!submitted&&submit()} placeholder="Type your answer here..." style={{ marginBottom:12, fontSize:'1.1rem' }} disabled={submitted}/>
      {!submitted && (
        <>
          <button onClick={()=>setShowHint(!showHint)} style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:6, color:'#FF9A3C', fontFamily:'var(--font-body)', fontWeight:700, fontSize:'.88rem', marginBottom:12 }}>
            <Lightbulb size={15}/> {showHint?'Hide hint':'Show hint'}
          </button>
          {showHint && <div style={{ background:'#FFF9EB', border:'2px solid #FFD93D', borderRadius:12, padding:'12px 16px', marginBottom:14, fontSize:'.88rem', color:'#92400E' }}>💡 {q.hint}</div>}
          <button className={`btn ${isBio?'btn-bio':'btn-chem'}`} onClick={submit} disabled={!input.trim()}>Submit Answer</button>
        </>
      )}
      {submitted && (
        <AnswerExplanation correct={isCorrect} selectedOption={input.trim()} correctOption={q.answer} explanation={getAdaptiveExplanation(q, grade)} concept={q.concept} grade={grade} onNext={next} isLast={idx+1>=questions.length}/>
      )}
    </div>
  );
}

function MatchingGame({ pairs, onComplete, isBio }) {
  const [leftSel, setLeftSel] = useState(null);
  const [rightSel, setRightSel] = useState(null);
  const [matched, setMatched] = useState([]);
  const [wrong, setWrong] = useState([]);
  const [done, setDone] = useState(false);
  const color = isBio?'#22C55E':'#8B5CF6';
  const shuffledRight = React.useMemo(()=>[...pairs].sort(()=>Math.random()-.5),[]);

  useEffect(()=>{
    if (leftSel!==null && rightSel!==null) {
      if (pairs[leftSel].id===pairs[rightSel].id) {
        const nm=[...matched,leftSel];
        setMatched(nm);
        if (nm.length===pairs.length) { setDone(true); setTimeout(()=>onComplete(pairs.map(()=>({correct:true}))),800); }
      } else { setWrong([leftSel,rightSel]); setTimeout(()=>setWrong([]),800); }
      setLeftSel(null); setRightSel(null);
    }
  },[leftSel,rightSel]);

  return (
    <div>
      <p style={{ color:'var(--text-secondary)', marginBottom:20, fontSize:'.9rem' }}>Match each item on the left with its correct description on the right.</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:'.78rem', fontWeight:800, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Terms</div>
          {pairs.map((p,i)=>(
            <button key={i} style={{ padding:'12px 18px', borderRadius:12, border:`2px solid`, cursor:matched.includes(i)?'default':'pointer', fontWeight:600, fontSize:'.88rem', textAlign:'left', borderColor:matched.includes(i)?color:leftSel===i?color:wrong.includes(i)?'#EF4444':'var(--border)', background:matched.includes(i)?`${color}15`:leftSel===i?`${color}08`:wrong.includes(i)?'#FFF5F5':'white', color:matched.includes(i)?color:'var(--text-primary)', opacity:matched.includes(i)?.6:1 }} onClick={()=>!matched.includes(i)&&setLeftSel(leftSel===i?null:i)}>
              {matched.includes(i)?'✓ ':''}{p.left}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ fontSize:'.78rem', fontWeight:800, color:'var(--text-secondary)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>Descriptions</div>
          {shuffledRight.map((p,i)=>{
            const oi=pairs.findIndex(x=>x.id===p.id);
            const isM=matched.includes(oi), isW=wrong.includes(oi);
            return (
              <button key={i} style={{ padding:'12px 18px', borderRadius:12, border:`2px solid`, cursor:isM?'default':'pointer', fontWeight:600, fontSize:'.88rem', textAlign:'left', borderColor:isM?color:rightSel===oi?color:isW?'#EF4444':'var(--border)', background:isM?`${color}15`:rightSel===oi?`${color}08`:isW?'#FFF5F5':'white', color:isM?color:'var(--text-primary)', opacity:isM?.6:1 }} onClick={()=>!isM&&setRightSel(rightSel===oi?null:oi)}>
                {isM?'✓ ':''}{p.right}
              </button>
            );
          })}
        </div>
      </div>
      {done && <div className="a-bounce-in" style={{ marginTop:24, textAlign:'center', background:'#F0FFF4', borderRadius:16, padding:'20px', border:'2px solid #22C55E' }}><div style={{ fontSize:'2.5rem', marginBottom:8 }}>🎉</div><p style={{ fontWeight:800, color:'#16A34A', fontSize:'1.1rem' }}>All matched! Brilliant work!</p></div>}
    </div>
  );
}

function TrueFalseGame({ questions, onComplete, isBio, grade }) {
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState([]);
  const q = questions[idx];
  const answered = selected !== null;

  const choose = (val) => {
    if (answered) return;
    setSelected(val);
    setResults(r => [...r, { correct: val===q.answer, selectedText: val?'TRUE':'FALSE', correctText: q.answer?'TRUE':'FALSE', q }]);
  };
  const next = () => {
    if (idx+1>=questions.length) { onComplete(results); return; }
    setIdx(i=>i+1); setSelected(null);
  };

  return (
    <div>
      <div style={{ marginBottom:20, fontSize:'.88rem', color:'var(--text-secondary)', fontWeight:600 }}>Statement {idx+1} of {questions.length}</div>
      <div style={{ background:'#F9FAFB', borderRadius:16, padding:'24px', marginBottom:28, textAlign:'center' }}>
        <div style={{ fontSize:'1.3rem', fontFamily:'var(--font-heading)', lineHeight:1.5, color:'var(--text-primary)' }}>"{q.statement}"</div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {[true,false].map(val=>{
          let bg='white',border='var(--border)',col='var(--text-primary)';
          if (answered) { if (val===q.answer){bg='#F0FFF4';border='#22C55E';col='#16A34A';} else if (val===selected){bg='#FFF5F5';border='#EF4444';col='#DC2626';} }
          return (
            <button key={String(val)} onClick={()=>choose(val)} style={{ padding:'24px', borderRadius:16, border:`2.5px solid ${border}`, background:bg, cursor:answered?'default':'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:8, transition:'all .2s' }}>
              <span style={{ fontSize:'2.2rem' }}>{val?'✅':'❌'}</span>
              <span style={{ fontWeight:800, fontSize:'1.1rem', color:col }}>{val?'TRUE':'FALSE'}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <AnswerExplanation correct={selected===q.answer} selectedOption={selected?'TRUE':'FALSE'} correctOption={q.answer?'TRUE':'FALSE'} explanation={getAdaptiveExplanation(q, grade)} concept={q.concept} grade={grade} onNext={next} isLast={idx+1>=questions.length}/>
      )}
    </div>
  );
}

function BalancerGame({ equations, onComplete, isBio, grade }) {
  const [idx, setIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState([]);
  const eq = equations[idx];

  const next = () => {
    if (idx+1>=equations.length) { onComplete(results); return; }
    setIdx(i=>i+1); setSubmitted(false);
  };
  const submit = () => {
    setSubmitted(true);
    setResults(r=>[...r,{ correct:true, q:eq }]);
  };

  return (
    <div>
      <div style={{ marginBottom:20, fontSize:'.88rem', color:'var(--text-secondary)', fontWeight:600 }}>Equation {idx+1} of {equations.length}</div>
      <div style={{ background:'#F5F3FF', borderRadius:16, padding:'28px', textAlign:'center', marginBottom:24 }}>
        <div style={{ fontSize:'.8rem', color:'#6D28D9', fontWeight:700, marginBottom:8 }}>UNBALANCED EQUATION</div>
        <div style={{ fontFamily:'var(--font-heading)', fontSize:'1.5rem', color:'#4C1D95', letterSpacing:2 }}>{eq.unbalanced}</div>
      </div>
      {!submitted ? (
        <>
          <p style={{ color:'var(--text-secondary)', marginBottom:16 }}>Can you balance this equation? Click to reveal the balanced form:</p>
          <button className="btn btn-chem" style={{ width:'100%' }} onClick={submit}>⚖️ Show Balanced Equation</button>
        </>
      ) : (
        <>
          <div style={{ background:'#F0FFF4', borderRadius:16, padding:'28px', textAlign:'center', marginBottom:16, border:'2px solid #22C55E' }}>
            <div style={{ fontSize:'.8rem', color:'#16A34A', fontWeight:700, marginBottom:8 }}>✓ BALANCED EQUATION</div>
            <div style={{ fontFamily:'var(--font-heading)', fontSize:'1.5rem', color:'#14532D', letterSpacing:2 }}>{eq.balanced}</div>
          </div>
          <AnswerExplanation correct={true} correctOption={eq.balanced} explanation={getAdaptiveExplanation(eq, 9)} concept={eq.concept} grade={9} onNext={next} isLast={idx+1>=equations.length}/>
        </>
      )}
    </div>
  );
}

export default function GamePage() {
  const { currentGame, currentSubject, addGameXP, addHistory, user } = useApp();
  const navigate = useNavigate();
  const isBio = currentSubject === 'biology';
  const grade = user?.grade ? parseInt(user.grade) : 7;

  if (!currentGame) { navigate('/dashboard'); return null; }

  if (currentGame.gameType === 'verbatim3d') {
    const result = currentGame.verbatimResult;
    const experiment = result?.electroExperiment || result?.experiment;
    const isElectro = Boolean(result?.electroExperiment || result?.sceneKind === 'electro');
    if (!experiment) return <div className="page" style={{ padding:32 }}><div className="card" style={{ padding:24 }}>This experiment is missing its 3D scene. Return to Chemistry and choose another lab.</div></div>;
    const finish = ({ accuracy = 100, points = 0 }) => {
      addGameXP(points);
      addHistory({ type:'game', title:currentGame.title, subject:'chemistry', correct:Math.round(accuracy / 100 * (experiment.steps?.length || 1)), total:experiment.steps?.length || 1, xp:points });
      navigate('/results', { state:{ results:[], correct:Math.round(accuracy / 100 * (experiment.steps?.length || 1)), total:experiment.steps?.length || 1, accuracy, xp:points, game:currentGame } });
    };
    return <div className="verbatim-game-shell">
      {isElectro
        ? <Electro3D experiment={experiment} onFinish={finish} onNewVideo={() => navigate('/chemistry')} onTakeQuiz={() => navigate('/quiz', { state:{ game:currentGame } })}/>
        : <Lab3D experiment={experiment} onFinish={finish} onNewVideo={() => navigate('/chemistry')} onTakeQuiz={() => navigate('/quiz', { state:{ game:currentGame } })}/>}
    </div>;
  }

  const handleComplete = (results) => {
    const correct = results.filter(r=>r.correct).length;
    const accuracy = Math.round((correct/results.length)*100);
    const xp = Math.round(accuracy*0.5)+(accuracy===100?50:accuracy>=80?20:accuracy>=60?10:0);
    addGameXP(xp);
    addHistory({ type:'game', title:currentGame.title, subject:currentSubject, correct, total:results.length, xp });
    navigate('/results', { state:{ results, correct, total:results.length, accuracy, xp, game:currentGame } });
  };

  const pal = isBio
    ? { grad:'135deg,#22C55E,#34D399', light:'#DCFCE7', dark:'#16A34A', border:'rgba(34,197,94,.2)' }
    : { grad:'135deg,#8B5CF6,#06B6D4', light:'#EDE9FE', dark:'#6D28D9', border:'rgba(139,92,246,.2)' };

  return (
    <div style={{ minHeight:'100vh', background:isBio?'linear-gradient(160deg,#F0FFF4,#F8F7FF)':'linear-gradient(160deg,#F5F3FF,#F0F9FF)' }}>
      <Navbar/>
      <div style={{ maxWidth:760, margin:'0 auto', padding:'28px 24px' }}>
        <BackButton to={isBio?'/biology':'/chemistry'} label={`Back to ${isBio?'Biology':'Chemistry'}`}/>
        <div style={{ background:`linear-gradient(${pal.grad})`, borderRadius:20, padding:'20px 28px', marginBottom:28, color:'white', display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:'2.4rem' }}>{currentGame.icon}</div>
          <div>
            <div style={{ fontFamily:'var(--font-display)', fontSize:'1.3rem' }}>{currentGame.title}</div>
            <div style={{ opacity:.85, fontSize:'.85rem' }}>{currentGame.topic} · {currentGame.difficulty}</div>
          </div>
        </div>
        <div className="card" style={{ padding:'32px', border:`2px solid ${pal.border}` }}>
          {currentGame.gameType==='mcq' && <MCQGame questions={currentGame.questions} onComplete={handleComplete} isBio={isBio} grade={grade}/>}
          {currentGame.gameType==='fill' && <FillGame questions={currentGame.questions} onComplete={handleComplete} isBio={isBio} grade={grade}/>}
          {currentGame.gameType==='matching' && <MatchingGame pairs={currentGame.pairs} onComplete={handleComplete} isBio={isBio}/>}
          {currentGame.gameType==='truefalse' && <TrueFalseGame questions={currentGame.questions} onComplete={handleComplete} isBio={isBio} grade={grade}/>}
          {currentGame.gameType==='balancer' && <BalancerGame equations={currentGame.equations} onComplete={handleComplete} isBio={isBio} grade={grade}/>}
        </div>
      </div>
    </div>
  );
}
