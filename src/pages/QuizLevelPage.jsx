import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import BackButton from '../components/BackButton';
import AnswerExplanation from '../components/AnswerExplanation';
import { Confetti } from '../components/FloatingObjects';
import { QUIZ_LEVELS, PASS_THRESHOLD, getAdaptiveExplanation } from '../data/sampleGames';
import { RotateCcw, Home, ChevronRight, Lock } from 'lucide-react';

export default function QuizLevelPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentSubject, saveQuizLevel, addQuizXP, addHistory, user, isScienceChampion } = useApp();

  const game = location.state?.game;
  const level = location.state?.level;

  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [inputVal, setInputVal] = useState('');
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  if (!game || !level) { navigate('/dashboard'); return null; }

  const isBio = currentSubject === 'biology';
  const grade = user?.grade ? parseInt(user.grade) : 7;
  const levelData = QUIZ_LEVELS[game.id]?.[level];

  if (!levelData) { navigate('/dashboard'); return null; }

  const questions = levelData.questions;
  const q = questions[idx];
  const total = questions.length;

  const pal = isBio
    ? { grad: '135deg,#22C55E,#34D399', btn: 'btn-bio', bg: 'linear-gradient(160deg,#F0FFF4,#F8F7FF)' }
    : { grad: '135deg,#8B5CF6,#06B6D4', btn: 'btn-chem', bg: 'linear-gradient(160deg,#F5F3FF,#F0F9FF)' };

  const recordAnswer = (isCorrect, selectedText, correctText, selIdx) => {
    setResults(r => [...r, { correct: isCorrect, selectedText, correctText, selectedIndex: selIdx, q }]);
    setAnswered(true);
  };

  const next = () => {
    if (idx + 1 >= total) {
      finishQuiz();
      return;
    }
    setIdx(i => i + 1);
    setSelected(null);
    setInputVal('');
    setAnswered(false);
  };

  const finishQuiz = () => {
    const finalResults = [...results];
    const correct = finalResults.filter(r => r.correct).length;
    const accuracy = Math.round((correct / total) * 100);
    const passed = accuracy >= PASS_THRESHOLD;
    const xp = passed ? (level === 1 ? 20 : level === 2 ? 35 : 50) + Math.round(accuracy * 0.2) : 5;

    saveQuizLevel(game.id, level, { correct, total, accuracy, passed, xp });
    addQuizXP(xp);
    addHistory({ type: 'quiz', title: `${game.title} – Level ${level}`, subject: currentSubject, correct, total, xp });
    if (accuracy >= 70) setShowConfetti(true);
    setDone(true);
  };

  if (done) {
    const correct = results.filter(r => r.correct).length;
    const accuracy = Math.round((correct / total) * 100);
    const passed = accuracy >= PASS_THRESHOLD;
    const xp = passed ? (level === 1 ? 20 : level === 2 ? 35 : 50) + Math.round(accuracy * 0.2) : 5;
    const stars = accuracy >= 90 ? 3 : accuracy >= 70 ? 2 : 1;
    const isChampion = isScienceChampion(game.id);

    return (
      <div style={{ minHeight: '100vh', background: pal.bg }}>
        {showConfetti && <Confetti count={35} />}
        <Navbar />
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>

          {/* Science Champion screen */}
          {isChampion && (
            <div className="a-bounce-in" style={{ background: 'linear-gradient(135deg,#FFD93D,#FF9A3C)', borderRadius: 24, padding: '36px', marginBottom: 24, textAlign: 'center', color: 'white', boxShadow: '0 12px 40px rgba(255,154,60,.4)' }}>
              <div style={{ fontSize: '4rem', marginBottom: 8 }}>🏅</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', marginBottom: 8 }}>SCIENCE CHAMPION!</h1>
              <p style={{ opacity: .9, fontSize: '1.05rem', marginBottom: 16 }}>
                You have completed all 3 quiz levels! You are a true science master!
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4 }}>
                {[1,2,3].map(i => <span key={i} style={{ fontSize: '2rem' }}>⭐</span>)}
              </div>
            </div>
          )}

          {/* Level result card */}
          <div className="card a-scale-in" style={{ padding: '36px', marginBottom: 20, textAlign: 'center', background: passed ? 'linear-gradient(135deg,#F0FFF4,white)' : 'linear-gradient(135deg,#FFF5F5,white)', border: `2px solid ${passed ? '#BBF7D0' : '#FECACA'}` }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 10 }}>{passed ? (accuracy === 100 ? '🏆' : '🌟') : '💪'}</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 6, color: passed ? '#16A34A' : '#DC2626' }}>
              Level {level} — {passed ? 'Passed! 🎉' : 'Keep Trying!'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
              {passed ? `Great work! You scored ${accuracy}% on Level ${level}.` : `You need ${PASS_THRESHOLD}% to pass. You scored ${accuracy}%. Give it another try!`}
            </p>

            {/* Stars */}
            <div style={{ marginBottom: 20 }}>
              {[1,2,3].map(s => (
                <span key={s} style={{ fontSize: '2rem', margin: '0 3px', filter: s <= stars ? 'none' : 'grayscale(1) opacity(.3)', animation: s <= stars ? `starPop .4s cubic-bezier(.36,.07,.19,.97) ${s * .15}s both` : 'none' }}>⭐</span>
              ))}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
              {[{ icon: '✅', val: correct, lbl: 'Correct' }, { icon: '❌', val: total - correct, lbl: 'Incorrect' }, { icon: '📊', val: `${accuracy}%`, lbl: 'Accuracy' }, { icon: '⚡', val: `+${xp}`, lbl: 'XP Earned' }].map(s => (
                <div key={s.lbl} style={{ background: '#F9FAFB', borderRadius: 12, padding: '12px 18px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: 'var(--primary)' }}>{s.val}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-secondary)', fontWeight: 700 }}>{s.lbl}</div>
                </div>
              ))}
            </div>

            {/* Mistakes summary */}
            {results.filter(r => !r.correct).length > 0 && (
              <div style={{ background: '#FFF9EB', borderRadius: 14, padding: '16px 18px', marginBottom: 20, textAlign: 'left' }}>
                <div style={{ fontWeight: 800, marginBottom: 10, color: '#92400E' }}>📚 Review these concepts:</div>
                {results.filter(r => !r.correct).map((r, i) => (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: '.8rem', color: '#92400E', fontWeight: 700, marginBottom: 4 }}>
                      • {r.q?.question || r.q?.statement || `Question ${i + 1}`}
                    </div>
                    <div style={{ fontSize: '.78rem', color: '#78350F', lineHeight: 1.5, paddingLeft: 10 }}>
                      ✗ You chose: <strong>{r.selectedText || 'N/A'}</strong> &nbsp;|&nbsp; ✓ Correct: <strong>{r.correctText || 'N/A'}</strong>
                    </div>
                    {r.q?.explanation && (
                      <div style={{ fontSize: '.78rem', color: '#78350F', paddingLeft: 10, marginTop: 2, lineHeight: 1.5 }}>
                        💡 {getAdaptiveExplanation(r.q, grade)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {!passed && (
                <button className={`btn ${pal.btn}`} onClick={() => { setDone(false); setIdx(0); setResults([]); setAnswered(false); setSelected(null); setInputVal(''); }}>
                  <RotateCcw size={15} /> Retry Level {level}
                </button>
              )}
              {passed && level < 3 && (
                <button className={`btn ${pal.btn}`} onClick={() => navigate('/quiz-level', { state: { game, level: level + 1 } })}>
                  Level {level + 1} → <ChevronRight size={15} />
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => navigate('/quiz-levels', { state: { game } })}>
                All Levels
              </button>
              <button className="btn" style={{ background: 'white', color: 'var(--text-secondary)', border: '2px solid var(--border)' }}
                onClick={() => navigate(isBio ? '/biology' : '/chemistry')}>
                <Home size={15} /> Done
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Render question ──
  const renderQ = () => {
    if (q.type === 'truefalse') {
      return (
        <div>
          <div style={{ background: '#F9FAFB', borderRadius: 16, padding: '24px', marginBottom: 24, textAlign: 'center', fontFamily: 'var(--font-heading)', fontSize: '1.2rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
            "{q.statement}"
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[true, false].map(val => {
              let bg = 'white', border = 'var(--border)';
              if (answered) {
                if (val === q.answer) { bg = '#F0FFF4'; border = '#22C55E'; }
                else if (val === selected) { bg = '#FFF5F5'; border = '#EF4444'; }
              }
              return (
                <button key={String(val)} onClick={() => { if (!answered) { setSelected(val); recordAnswer(val === q.answer, val ? 'TRUE' : 'FALSE', q.answer ? 'TRUE' : 'FALSE', null); } }}
                  style={{ padding: '22px', borderRadius: 14, border: `2.5px solid ${border}`, background: bg, cursor: answered ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all .2s' }}>
                  <span style={{ fontSize: '2rem' }}>{val ? '✅' : '❌'}</span>
                  <span style={{ fontWeight: 800, fontSize: '1rem' }}>{val ? 'TRUE' : 'FALSE'}</span>
                </button>
              );
            })}
          </div>
          {answered && (
            <AnswerExplanation correct={selected === q.answer} selectedOption={selected ? 'TRUE' : 'FALSE'} correctOption={q.answer ? 'TRUE' : 'FALSE'}
              explanation={getAdaptiveExplanation(q, grade)} concept={q.concept} grade={grade} onNext={next} isLast={idx + 1 >= total} />
          )}
        </div>
      );
    }

    if (q.type === 'fill') {
      const isCorrect = inputVal.trim().toLowerCase() === (q.answer || '').toLowerCase();
      return (
        <div>
          <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: 20, lineHeight: 1.5 }}>{q.question}</p>
          <input className="input-field" value={inputVal} onChange={e => !answered && setInputVal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !answered && inputVal.trim() && (() => { recordAnswer(isCorrect, inputVal.trim(), q.answer, null); })()}
            placeholder="Your answer..." disabled={answered} style={{ marginBottom: 14, fontSize: '1.05rem' }} />
          {!answered && (
            <button className={`btn ${pal.btn}`} onClick={() => recordAnswer(isCorrect, inputVal.trim(), q.answer, null)} disabled={!inputVal.trim()}>Submit</button>
          )}
          {answered && (
            <AnswerExplanation correct={isCorrect} selectedOption={inputVal.trim()} correctOption={q.answer}
              explanation={getAdaptiveExplanation(q, grade)} concept={q.concept} grade={grade} onNext={next} isLast={idx + 1 >= total} />
          )}
        </div>
      );
    }

    // MCQ
    return (
      <div>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: 20, lineHeight: 1.5 }}>{q.question}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {q.options.map((opt, i) => {
            let bg = 'white', border = 'var(--border)', col = 'var(--text-primary)';
            if (answered) {
              if (i === q.correct) { bg = '#F0FFF4'; border = '#22C55E'; col = '#16A34A'; }
              else if (i === selected) { bg = '#FFF5F5'; border = '#EF4444'; col = '#DC2626'; }
            }
            return (
              <button key={i} onClick={() => { if (!answered) { setSelected(i); recordAnswer(i === q.correct, opt, q.options[q.correct], i); } }}
                style={{ background: bg, border: `2px solid ${border}`, borderRadius: 12, padding: '13px 18px', textAlign: 'left', cursor: answered ? 'default' : 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: '.92rem', color: col, transition: 'all .2s', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '.8rem', fontWeight: 800, flexShrink: 0, background: answered && i === q.correct ? '#22C55E' : answered && i === selected ? '#EF4444' : '#F3F4F6', color: answered && (i === q.correct || i === selected) ? 'white' : 'var(--text-secondary)' }}>
                  {answered && i === q.correct ? '✓' : answered && i === selected ? '✗' : String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
        {answered && (
          <AnswerExplanation correct={selected === q.correct} selectedOption={q.options[selected]} correctOption={q.options[q.correct]}
            explanation={getAdaptiveExplanation(q, grade)}
            wrongExplanation={selected !== q.correct && q.wrongExplanations ? q.wrongExplanations[selected] : null}
            concept={q.concept} grade={grade} onNext={next} isLast={idx + 1 >= total} />
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: pal.bg }}>
      <Navbar />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px' }}>
        <BackButton label="Back to Levels" to={undefined} />

        {/* Header */}
        <div style={{ background: `linear-gradient(${pal.grad})`, borderRadius: 20, padding: '18px 24px', marginBottom: 24, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
              {levelData.icon} Level {level} — {levelData.label}
            </div>
            <div style={{ opacity: .85, fontSize: '.8rem' }}>{game.title}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{idx + 1}/{total}</div>
            <div style={{ opacity: .8, fontSize: '.72rem' }}>Question</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-bar" style={{ marginBottom: 24 }}>
          <div className={`progress-fill ${isBio ? 'progress-fill-bio' : 'progress-fill-chem'}`} style={{ width: `${(idx / total) * 100}%` }} />
        </div>

        {/* Question card */}
        <div className="card" style={{ padding: '32px', marginBottom: 20, border: `2px solid ${isBio ? 'rgba(34,197,94,.15)' : 'rgba(139,92,246,.15)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <span className="chip" style={{ background: isBio ? '#DCFCE7' : '#EDE9FE', color: isBio ? '#16A34A' : '#6D28D9' }}>
              {q.type === 'fill' ? 'Fill in the Blank' : q.type === 'truefalse' ? 'True or False' : 'Multiple Choice'}
            </span>
            <span style={{ fontSize: '.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              ✅ {results.filter(r => r.correct).length} correct
            </span>
          </div>
          {renderQ()}
        </div>
      </div>
    </div>
  );
}
