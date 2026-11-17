import React, { useState } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, BookOpen, Lightbulb } from 'lucide-react';

/**
 * AnswerExplanation – reusable component used in:
 *  - GamePage   (immediate feedback after each answer)
 *  - ResultsPage (expandable mistake analysis)
 *  - QuizLevelPage (immediate feedback + results review)
 *
 * Props:
 *  correct          – boolean
 *  selectedOption   – string | null  (what the student picked)
 *  correctOption    – string         (the right answer text)
 *  explanation      – string         (why the correct answer is right)
 *  wrongExplanation – string | null  (why the selected wrong answer is wrong)
 *  concept          – string | null  (related scientific concept)
 *  grade            – number         (1–10, used for language adaptation)
 *  onNext           – function | null (if provided, shows Next button)
 *  isLast           – boolean        (changes Next button label)
 *  compact          – boolean        (collapsed view for results page)
 *  defaultOpen      – boolean        (expand by default in results view)
 */

function getGradeLabel(grade) {
  if (grade <= 3) return 'simple';
  if (grade <= 7) return 'standard';
  return 'advanced';
}

function adaptExplanation(text, grade) {
  // The actual explanation text is already written at an appropriate level
  // in sampleGames.js; this function adds a grade-appropriate prefix label.
  if (!text) return text;
  const level = getGradeLabel(grade);
  if (level === 'simple') return text;      // already short and simple
  return text;                               // standard / advanced text unchanged
}

export default function AnswerExplanation({
  correct,
  selectedOption = null,
  correctOption = '',
  explanation = '',
  wrongExplanation = null,
  concept = null,
  grade = 7,
  onNext = null,
  isLast = false,
  compact = false,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen || !compact);

  if (compact) {
    // Collapsed card for ResultsPage mistake analysis
    return (
      <div style={{
        borderRadius: 14,
        border: `2px solid ${correct ? '#BBF7D0' : '#FECACA'}`,
        background: correct ? '#F0FFF4' : '#FFF5F5',
        overflow: 'hidden',
        marginBottom: 10,
      }}>
        {/* Header – always visible */}
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
            textAlign: 'left',
          }}
        >
          <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{correct ? '✅' : '❌'}</span>
          <span style={{
            flex: 1, fontWeight: 700, fontSize: '.88rem',
            color: correct ? '#16A34A' : '#DC2626',
          }}>
            {correct ? 'Correct!' : `You chose: "${selectedOption || 'N/A'}"`}
          </span>
          {!correct && (
            <span style={{ fontSize: '.78rem', color: '#6B7280', fontWeight: 600, marginRight: 8 }}>
              {open ? 'Hide' : 'See explanation'}
            </span>
          )}
          {!correct && (open ? <ChevronUp size={16} color="#6B7280"/> : <ChevronDown size={16} color="#6B7280"/>)}
        </button>

        {/* Expandable body */}
        {open && !correct && (
          <div style={{ padding: '0 16px 16px', borderTop: '1px solid #FECACA' }}>
            {selectedOption && (
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FECACA', marginBottom: 10 }}>
                <span style={{ fontSize: '.78rem', fontWeight: 800, color: '#DC2626', display: 'block', marginBottom: 4 }}>❌ Your answer:</span>
                <span style={{ fontSize: '.88rem', color: '#7F1D1D' }}>{selectedOption}</span>
                {wrongExplanation && (
                  <p style={{ fontSize: '.82rem', color: '#991B1B', marginTop: 6, lineHeight: 1.5 }}>
                    {wrongExplanation}
                  </p>
                )}
              </div>
            )}
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#DCFCE7', border: '1px solid #BBF7D0', marginBottom: 10 }}>
              <span style={{ fontSize: '.78rem', fontWeight: 800, color: '#16A34A', display: 'block', marginBottom: 4 }}>✅ Correct answer:</span>
              <span style={{ fontSize: '.88rem', color: '#14532D' }}>{correctOption}</span>
            </div>
            {explanation && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: '#EDE9FE', border: '1px solid #C4B5FD' }}>
                <span style={{ fontSize: '.78rem', fontWeight: 800, color: '#6D28D9', display: 'block', marginBottom: 4 }}>
                  <Lightbulb size={12} style={{ display: 'inline', marginRight: 4 }}/>
                  Why this is correct:
                </span>
                <p style={{ fontSize: '.85rem', color: '#4C1D95', lineHeight: 1.6, margin: 0 }}>
                  {adaptExplanation(explanation, grade)}
                </p>
              </div>
            )}
            {concept && (
              <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 10, background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
                <span style={{ fontSize: '.78rem', fontWeight: 800, color: '#0369A1', display: 'block', marginBottom: 2 }}>
                  <BookOpen size={12} style={{ display: 'inline', marginRight: 4 }}/>
                  Concept: {concept}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Inline feedback (GamePage / QuizLevelPage) ──
  return (
    <div className="a-scale-in" style={{
      borderRadius: 16, padding: '18px 20px', marginTop: 20,
      background: correct ? '#F0FFF4' : '#FFF5F5',
      border: `2px solid ${correct ? '#22C55E' : '#EF4444'}`,
    }}>
      {/* Status row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        {correct
          ? <CheckCircle size={22} color="#22C55E"/>
          : <XCircle size={22} color="#EF4444"/>
        }
        <span style={{ fontWeight: 800, fontSize: '1rem', color: correct ? '#16A34A' : '#DC2626' }}>
          {correct ? '🎉 Correct! Well done!' : '💡 Not quite — here\'s the breakdown:'}
        </span>
      </div>

      {/* Wrong / correct boxes (only shown when incorrect) */}
      {!correct && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {selectedOption && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FECACA' }}>
              <span style={{ fontSize: '.75rem', fontWeight: 800, color: '#DC2626', display: 'block', marginBottom: 3 }}>❌ You chose:</span>
              <span style={{ fontSize: '.88rem', color: '#7F1D1D', fontWeight: 600 }}>{selectedOption}</span>
              {wrongExplanation && (
                <p style={{ fontSize: '.82rem', color: '#991B1B', marginTop: 5, lineHeight: 1.5, margin: '5px 0 0' }}>
                  {wrongExplanation}
                </p>
              )}
            </div>
          )}
          <div style={{ padding: '10px 14px', borderRadius: 10, background: '#DCFCE7', border: '1px solid #BBF7D0' }}>
            <span style={{ fontSize: '.75rem', fontWeight: 800, color: '#16A34A', display: 'block', marginBottom: 3 }}>✅ Correct answer:</span>
            <span style={{ fontSize: '.88rem', color: '#14532D', fontWeight: 600 }}>{correctOption}</span>
          </div>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: correct ? 'rgba(34,197,94,.08)' : '#EDE9FE',
          border: `1px solid ${correct ? '#BBF7D0' : '#C4B5FD'}`,
          marginBottom: 12,
        }}>
          <span style={{ fontSize: '.75rem', fontWeight: 800, color: correct ? '#16A34A' : '#6D28D9', display: 'block', marginBottom: 3 }}>
            <Lightbulb size={12} style={{ display: 'inline', marginRight: 4 }}/>
            {correct ? 'Why you\'re right:' : 'Why the correct answer is right:'}
          </span>
          <p style={{ fontSize: '.87rem', color: correct ? '#14532D' : '#4C1D95', lineHeight: 1.6, margin: 0 }}>
            {adaptExplanation(explanation, grade)}
          </p>
        </div>
      )}

      {/* Concept tag */}
      {concept && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px',
          borderRadius: 999, background: '#F0F9FF', border: '1px solid #BAE6FD',
          fontSize: '.78rem', fontWeight: 700, color: '#0369A1', marginBottom: 12,
        }}>
          <BookOpen size={12}/> Concept: {concept}
        </div>
      )}

      {/* Next button */}
      {onNext && (
        <button
          className={`btn ${correct ? 'btn-bio' : 'btn-primary'} btn-sm`}
          style={{ marginTop: 4 }}
          onClick={onNext}
        >
          {isLast ? 'See Results 🏆' : 'Next Question →'}
        </button>
      )}
    </div>
  );
}
