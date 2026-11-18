import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import { Play, Clock, Target, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react';

const LOADING_MESSAGES = [
  'Exploring your science lesson... 🔭',
  'Discovering interesting concepts... 🧠',
  'Building your learning adventure... 🏗️',
  'Mixing up some brain fuel... ⚗️',
  'Your game is almost ready! 🚀',
];

function LoadingScreen({ subject }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const isBio = subject === 'biology';

  useEffect(() => {
    const msgTimer = setInterval(() => setMsgIdx(i => Math.min(i+1, LOADING_MESSAGES.length-1)), 650);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + Math.random()*18, 95)), 400);
    return () => { clearInterval(msgTimer); clearInterval(progTimer); };
  }, []);

  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
      background: isBio ? 'linear-gradient(160deg,#F0FFF4,#F8F7FF)' : 'linear-gradient(160deg,#F5F3FF,#F0F9FF)',
      padding:'40px 24px', textAlign:'center',
    }}>
      {/* Animated orb */}
      <div style={{ position:'relative', marginBottom:40 }}>
        <div style={{
          width:140, height:140, borderRadius:'50%',
          background:`linear-gradient(135deg,${isBio?'#22C55E,#34D399':'#8B5CF6,#06B6D4'})`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'4rem', boxShadow:`0 20px 60px ${isBio?'rgba(34,197,94,.4)':'rgba(139,92,246,.4)'}`,
          animation:'float 3s ease-in-out infinite',
        }}>
          {isBio ? '🌿' : '⚗️'}
        </div>
        {/* Orbiting dots */}
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            position:'absolute', width:14, height:14, borderRadius:'50%',
            background: isBio ? '#22C55E' : '#8B5CF6',
            top:'50%', left:'50%', marginTop:-7, marginLeft:-7,
            transformOrigin:'0 0',
            animation:`spinSlow ${2+i*.5}s linear infinite`,
            transform:`rotate(${i*90}deg) translateX(80px)`,
            opacity:.7,
          }}/>
        ))}
      </div>

      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', marginBottom:16, color:'var(--text-primary)' }}>
        {LOADING_MESSAGES[msgIdx]}
      </h2>

      <div style={{ width:'100%', maxWidth:400, marginBottom:24 }}>
        <div className="progress-bar" style={{ height:12 }}>
          <div className={`progress-fill ${isBio?'progress-fill-bio':'progress-fill-chem'}`} style={{ width:`${progress}%` }}/>
        </div>
        <div style={{ marginTop:8, fontSize:'.85rem', color:'var(--text-secondary)', fontWeight:600 }}>{Math.round(progress)}%</div>
      </div>

      <div style={{ display:'flex', gap:12, flexWrap:'wrap', justifyContent:'center' }}>
        {['Analysing video...','Extracting concepts...','Generating questions...'].map((step,i) => (
          <div key={i} className="chip" style={{
            background: msgIdx > i ? (isBio?'rgba(34,197,94,.12)':'rgba(139,92,246,.12)') : '#F3F4F6',
            color: msgIdx > i ? (isBio?'#16A34A':'#6D28D9') : 'var(--text-secondary)',
            transition:'all .4s',
          }}>
            {msgIdx > i ? '✓' : '○'} {step}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GameIntro() {
  const { currentGame, currentSubject } = useApp();
  const navigate = useNavigate();
  const [showLoading, setShowLoading] = useState(!!(currentGame?.fromYoutube && !currentGame?.verbatimResult && !currentGame?.verbatimBioExperiment));

  useEffect(() => {
    if (!currentGame) { navigate('/dashboard'); return; }
    if (currentGame?.fromYoutube && !currentGame?.verbatimResult && !currentGame?.verbatimBioExperiment) {
      const t = setTimeout(() => setShowLoading(false), 3200);
      return () => clearTimeout(t);
    }
  }, [currentGame]);

  if (!currentGame) return null;
  if (showLoading) return <LoadingScreen subject={currentSubject}/>;

  const isBio = currentSubject === 'biology';
  const pal = isBio
    ? { grad:'135deg,#22C55E,#34D399', light:'#DCFCE7', dark:'#16A34A', border:'rgba(34,197,94,.2)' }
    : { grad:'135deg,#8B5CF6,#06B6D4', light:'#EDE9FE', dark:'#6D28D9', border:'rgba(139,92,246,.2)' };

  const gameTypeLabel = {
    mcq:'Multiple Choice Quiz', fill:'Fill in the Blanks',
    matching:'Matching Pairs', truefalse:'True or False',
    balancer:'Equation Balancer', drag:'Drag & Drop',
  }[currentGame.gameType] || 'Interactive Game';

  return (
    <div style={{ minHeight:'100vh', background: isBio?'linear-gradient(160deg,#F0FFF4,#F8F7FF)':'linear-gradient(160deg,#F5F3FF,#F0F9FF)' }}>
      <Navbar/>
      <div style={{ maxWidth:720, margin:'0 auto', padding:'40px 24px' }}>

        <button onClick={() => navigate(isBio?'/biology':'/chemistry')} style={{
          background:'none', border:'none', cursor:'pointer', display:'inline-flex', alignItems:'center',
          gap:6, color:'var(--text-secondary)', fontFamily:'var(--font-body)', fontWeight:600, marginBottom:28,
        }}>
          <ArrowLeft size={16}/> Back to {isBio?'Biology':'Chemistry'}
        </button>

        <div className="card a-scale-in" style={{ padding:'40px', border:`2px solid ${pal.border}`, textAlign:'center', overflow:'hidden', position:'relative' }}>
          <div style={{ position:'absolute', top:-20, right:-20, fontSize:'9rem', opacity:.06 }}>{currentGame.icon}</div>

          {/* Icon */}
          <div style={{
            width:96, height:96, borderRadius:'50%', margin:'0 auto 20px',
            background:`linear-gradient(${pal.grad})`,
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'3rem', boxShadow:`0 12px 32px rgba(0,0,0,.15)`,
          }} className="a-float">
            {currentGame.icon}
          </div>

          <div className="chip" style={{ background:pal.light, color:pal.dark, marginBottom:12, display:'inline-flex' }}>
            {isBio?'🌿 Biology':'⚗️ Chemistry'} · {gameTypeLabel}
          </div>

          <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.5rem,3vw,2.2rem)', marginBottom:10, lineHeight:1.2 }}>
            {currentGame.title}
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'1rem', marginBottom:28, lineHeight:1.6 }}>
            {currentGame.description}
          </p>

          {/* Info row */}
          <div style={{ display:'flex', justifyContent:'center', gap:24, flexWrap:'wrap', marginBottom:32 }}>
            {[
              { icon:<Clock size={16}/>, label:'Time', value:currentGame.estimatedTime },
              { icon:<Target size={16}/>, label:'Difficulty', value:currentGame.difficulty },
              { icon:<BookOpen size={16}/>, label:'Topic', value:currentGame.topic },
            ].map(item => (
              <div key={item.label} style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                background:'#F9FAFB', borderRadius:14, padding:'14px 20px', minWidth:110,
              }}>
                <div style={{ color: isBio?'#22C55E':'#8B5CF6' }}>{item.icon}</div>
                <span style={{ fontSize:'.72rem', color:'var(--text-secondary)', fontWeight:700, textTransform:'uppercase', letterSpacing:1 }}>{item.label}</span>
                <span style={{ fontWeight:800, color:'var(--text-primary)', fontSize:'.9rem' }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* What you'll learn */}
          <div style={{ background:'#F9FAFB', borderRadius:16, padding:'18px 20px', marginBottom:28, textAlign:'left' }}>
            <h4 style={{ fontWeight:800, marginBottom:10, color:'var(--text-primary)' }}>📚 What you'll learn:</h4>
            <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
              {(currentGame.questions || currentGame.pairs || currentGame.equations || []).slice(0,4).map((q,i) => (
                <li key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:'.88rem', color:'var(--text-secondary)' }}>
                  <span style={{ color: isBio?'#22C55E':'#8B5CF6', marginTop:2, flexShrink:0 }}>✓</span>
                  <span>{q.question || q.left || q.unbalanced || `Concept ${i+1}`}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <button className={`btn ${isBio?'btn-bio':'btn-chem'} btn-lg`} onClick={() => navigate('/game')} style={{ gap:10 }}>
              <Play size={20} fill="white"/> Start Game!
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/game')}>
              Skip Intro →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
