import React from 'react';

const BIO_OBJECTS = ['🌿','🍃','🔬','🧬','🦋','🌸','🌱','🍀','🐛','🧪','💚','🌳'];
const CHEM_OBJECTS = ['⚗️','⚛️','🧪','💜','🔵','✨','💫','🌀','🔮','🫧','⚡','🌊'];
const LANDING_OBJECTS = ['🔬','⚗️','🧬','⚛️','🌿','💡','⭐','🚀','🎯','🏆','✨','🌈','🧪','🔭','🪐'];

function FloatingObject({ emoji, style, animClass, delay }) {
  return (
    <div className={`float-obj ${animClass} ${delay}`} style={style}>
      {emoji}
    </div>
  );
}

export function LandingFloaters() {
  const items = [
    { emoji:'🔬', top:'8%', left:'4%', fontSize:'2.4rem', animClass:'a-float', delay:'d-1' },
    { emoji:'⚗️', top:'15%', right:'6%', fontSize:'2.2rem', animClass:'a-floatB', delay:'d-3' },
    { emoji:'🧬', top:'60%', left:'2%', fontSize:'2rem', animClass:'a-floatC', delay:'d-5' },
    { emoji:'⚛️', top:'75%', right:'4%', fontSize:'2.4rem', animClass:'a-float', delay:'d-2' },
    { emoji:'🌿', top:'30%', left:'1%', fontSize:'2rem', animClass:'a-floatB', delay:'d-7' },
    { emoji:'💡', top:'45%', right:'3%', fontSize:'1.8rem', animClass:'a-float', delay:'d-4' },
    { emoji:'🏆', top:'85%', left:'5%', fontSize:'1.8rem', animClass:'a-floatC', delay:'d-6' },
    { emoji:'🪐', top:'10%', left:'50%', fontSize:'1.6rem', animClass:'a-floatB', delay:'d-9' },
    { emoji:'✨', top:'92%', right:'8%', fontSize:'1.6rem', animClass:'a-float', delay:'d-8' },
    { emoji:'🧪', top:'50%', left:'92%', fontSize:'1.8rem', animClass:'a-floatB', delay:'d-10' },
  ];
  return (
    <>
      {items.map((item, i) => (
        <div key={i} className={`float-obj ${item.animClass} ${item.delay}`}
          style={{ top:item.top, left:item.left, right:item.right, fontSize:item.fontSize||'2rem', position:'absolute', pointerEvents:'none', userSelect:'none', opacity:.45 }}>
          {item.emoji}
        </div>
      ))}
    </>
  );
}

export function BioFloaters() {
  const items = [
    { emoji:'🌿', top:'5%', left:'2%', fontSize:'2.2rem', anim:'a-float', d:'d-1' },
    { emoji:'🍃', top:'20%', right:'3%', fontSize:'2rem', anim:'a-floatB', d:'d-3' },
    { emoji:'🧬', top:'55%', left:'1%', fontSize:'2rem', anim:'a-floatC', d:'d-5' },
    { emoji:'🦋', top:'70%', right:'5%', fontSize:'2.2rem', anim:'a-float', d:'d-2' },
    { emoji:'🌸', top:'40%', left:'2%', fontSize:'1.8rem', anim:'a-floatB', d:'d-7' },
    { emoji:'🔬', top:'85%', right:'2%', fontSize:'2rem', anim:'a-floatC', d:'d-6' },
    { emoji:'🌱', top:'10%', right:'2%', fontSize:'1.6rem', anim:'a-float', d:'d-9' },
  ];
  return (
    <>
      {items.map((item,i) => (
        <div key={i} className={`float-obj ${item.anim} ${item.d}`}
          style={{ top:item.top,left:item.left,right:item.right,fontSize:item.fontSize, position:'absolute',pointerEvents:'none',userSelect:'none',opacity:.4 }}>
          {item.emoji}
        </div>
      ))}
    </>
  );
}

export function ChemFloaters() {
  const items = [
    { emoji:'⚗️', top:'5%', left:'2%', fontSize:'2.2rem', anim:'a-float', d:'d-1' },
    { emoji:'⚛️', top:'25%', right:'3%', fontSize:'2rem', anim:'a-floatB', d:'d-3' },
    { emoji:'🧪', top:'55%', left:'1%', fontSize:'2rem', anim:'a-floatC', d:'d-5' },
    { emoji:'🫧', top:'70%', right:'5%', fontSize:'2rem', anim:'a-float', d:'d-2' },
    { emoji:'💜', top:'40%', left:'2%', fontSize:'1.8rem', anim:'a-floatB', d:'d-7' },
    { emoji:'✨', top:'85%', right:'2%', fontSize:'1.8rem', anim:'a-floatC', d:'d-6' },
    { emoji:'🔮', top:'12%', right:'2%', fontSize:'1.6rem', anim:'a-float', d:'d-9' },
  ];
  return (
    <>
      {items.map((item,i) => (
        <div key={i} className={`float-obj ${item.anim} ${item.d}`}
          style={{ top:item.top,left:item.left,right:item.right,fontSize:item.fontSize, position:'absolute',pointerEvents:'none',userSelect:'none',opacity:.4 }}>
          {item.emoji}
        </div>
      ))}
    </>
  );
}

export function Confetti({ count = 30 }) {
  const colors = ['#6C63FF','#FF6B9D','#FFD93D','#4ECDC4','#FF6B6B','#22C55E','#FF9A3C'];
  const shapes = ['●','■','▲','★','♦'];
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:200, overflow:'hidden' }}>
      {Array.from({length:count}).map((_,i) => (
        <div key={i} style={{
          position:'absolute',
          left: `${Math.random()*100}%`,
          top: '-20px',
          color: colors[i % colors.length],
          fontSize: `${0.8 + Math.random()*1.2}rem`,
          animation: `confettiFall ${2 + Math.random()*3}s ease-in ${Math.random()*2}s forwards`,
          fontWeight:'bold',
        }}>
          {shapes[i % shapes.length]}
        </div>
      ))}
    </div>
  );
}
