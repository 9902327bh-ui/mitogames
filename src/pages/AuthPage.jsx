import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Eye, EyeOff, User, Mail, Lock, GraduationCap, BookOpen, ArrowRight, ArrowLeft } from 'lucide-react';

const GRADES = Array.from({length:10},(_,i)=>i+1);
const BOARDS = ['CBSE','ICSE','State Board'];

function InputGroup({ label, icon, error, children }) {
  return (
    <div style={{ marginBottom:18 }}>
      <label style={{ display:'block', fontWeight:700, fontSize:'.88rem', color:'var(--text-primary)', marginBottom:7 }}>
        {icon && <span style={{marginRight:6}}>{icon}</span>}{label}
      </label>
      {children}
      {error && <p style={{ color:'var(--secondary)', fontSize:'.8rem', marginTop:5, fontWeight:600 }}>⚠ {error}</p>}
    </div>
  );
}

export default function AuthPage({ mode = 'login' }) {
  const { login } = useApp();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(mode === 'login');
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name:'', email:'', password:'', confirmPassword:'',
    age:'', grade:'', board:'',
  });

  const set = (k,v) => { setForm(f => ({...f,[k]:v})); setErrors(e=>({...e,[k]:''})); };

  const validate = () => {
    const e = {};
    if (!isLogin) {
      if (!form.name.trim()) e.name = 'Name is required';
      if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
      if (!form.age || form.age < 5 || form.age > 20) e.age = 'Enter a valid age (5–20)';
      if (!form.grade) e.grade = 'Please select your grade';
      if (!form.board) e.board = 'Please select your education board';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
      if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    }
    if (!form.email.match(/^[^@]+@[^@]+\.[^@]+$/)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (isLogin) {
        const saved = JSON.parse(localStorage.getItem('mg_user') || 'null');
        if (saved && saved.email === form.email) {
          login(saved);
          navigate('/dashboard');
        } else {
          setErrors({ email: 'No account found. Please register first.' });
        }
      } else {
        const userData = {
          name: form.name.trim(),
          email: form.email,
          age: form.age,
          grade: form.grade,
          board: form.board,
          createdAt: new Date().toISOString(),
        };
        login(userData);
        navigate('/dashboard');
      }
    }, 1200);
  };

  const BlobBg = () => (
    <>
      <div style={{ position:'absolute', top:'-15%', right:'-8%', width:400, height:400,
        background:isLogin?'linear-gradient(135deg,rgba(108,99,255,.14),rgba(255,107,157,.1))':'linear-gradient(135deg,rgba(34,197,94,.12),rgba(78,205,196,.1))',
        borderRadius:'60% 40% 30% 70%/60% 30% 70% 40%', animation:'morphBlob 10s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:320, height:320,
        background:isLogin?'linear-gradient(135deg,rgba(255,217,61,.1),rgba(255,154,60,.08))':'linear-gradient(135deg,rgba(139,92,246,.1),rgba(6,182,212,.08))',
        borderRadius:'40% 60% 70% 30%/40% 50% 60% 50%', animation:'morphBlob 14s ease-in-out infinite reverse', pointerEvents:'none' }}/>
    </>
  );

  return (
    <div className="page" style={{
      minHeight:'100vh',
      background: isLogin
        ? 'linear-gradient(160deg,#F0EFFF 0%,#FFF5F9 100%)'
        : 'linear-gradient(160deg,#F0FFF4 0%,#F0EFFF 100%)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px',
    }}>
      <BlobBg/>

      {/* Floating deco */}
      {['🔬','⚗️','🧬','⚛️','🌿','💡','⭐','🧪'].map((e,i) => (
        <div key={i} className={`float-obj ${['a-float','a-floatB','a-floatC'][i%3]} d-${i+1}`}
          style={{
            top:`${[8,15,65,78,35,88,50,22][i]}%`,
            left:i%2===0?`${[2,1,3,5,2,4,88,90][i]}%`:undefined,
            right:i%2!==0?'3%':undefined,
            fontSize:'1.6rem',
          }}>
          {e}
        </div>
      ))}

      <div style={{ position:'relative', zIndex:5, width:'100%', maxWidth:480 }}>
        {/* Logo */}
        <div className="a-fade-in-down" style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:60, height:60, borderRadius:'50%', margin:'0 auto 10px',
            background:'linear-gradient(135deg,#6C63FF,#FF6B9D)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.8rem',
            boxShadow:'0 8px 24px rgba(108,99,255,.35)',
          }}>🔬</div>
          <div style={{ fontFamily:'var(--font-display)', fontSize:'1.6rem', color:'var(--primary)' }}>MitoGames</div>
          <div style={{ fontSize:'.7rem', fontWeight:800, letterSpacing:2, color:'var(--accent-pink)', textTransform:'uppercase' }}>The Powerhouse of Learning</div>
        </div>

        {/* Card */}
        <div className="card a-scale-in" style={{ padding:'36px 40px', borderRadius:24 }}>
          {/* Toggle */}
          <div style={{
            display:'flex', background:'#F3F4F6', borderRadius:14, padding:4, marginBottom:28,
          }}>
            {['Sign In','Create Account'].map((t,i) => (
              <button key={t} onClick={() => setIsLogin(i===0)} style={{
                flex:1, padding:'10px 0', border:'none', cursor:'pointer', borderRadius:10,
                fontFamily:'var(--font-body)', fontWeight:700, fontSize:'.9rem', transition:'all .25s',
                background: (isLogin&&i===0)||(!isLogin&&i===1) ? 'white':'transparent',
                color: (isLogin&&i===0)||(!isLogin&&i===1) ? 'var(--primary)':'var(--text-secondary)',
                boxShadow: (isLogin&&i===0)||(!isLogin&&i===1) ? '0 2px 8px rgba(0,0,0,.08)':'none',
              }}>{t}</button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <InputGroup label="Your Name" icon={<User size={14}/>} error={errors.name}>
                  <input className={`input-field${errors.name?' error':''}`} type="text"
                    placeholder="e.g. Aarav Sharma" value={form.name}
                    onChange={e=>set('name',e.target.value)}/>
                </InputGroup>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <InputGroup label="Your Age" error={errors.age}>
                    <input className={`input-field${errors.age?' error':''}`} type="number"
                      placeholder="e.g. 12" min={5} max={20} value={form.age}
                      onChange={e=>set('age',e.target.value)}/>
                  </InputGroup>
                  <InputGroup label="Grade / Class" icon={<GraduationCap size={14}/>} error={errors.grade}>
                    <select className={`input-field${errors.grade?' error':''}`} value={form.grade}
                      onChange={e=>set('grade',e.target.value)}>
                      <option value="">Select Grade</option>
                      {GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}
                    </select>
                  </InputGroup>
                </div>

                <InputGroup label="Education Board" icon={<BookOpen size={14}/>} error={errors.board}>
                  <div style={{ display:'flex', gap:10 }}>
                    {BOARDS.map(b => (
                      <button key={b} type="button" onClick={() => set('board',b)} style={{
                        flex:1, padding:'10px 0', border:`2px solid ${form.board===b?'var(--primary)':'var(--border)'}`,
                        borderRadius:10, cursor:'pointer', fontFamily:'var(--font-body)', fontWeight:700,
                        fontSize:'.82rem', transition:'all .2s',
                        background: form.board===b ? 'rgba(108,99,255,.08)':'white',
                        color: form.board===b ? 'var(--primary)':'var(--text-secondary)',
                      }}>{b}</button>
                    ))}
                  </div>
                  {errors.board && <p style={{ color:'var(--secondary)', fontSize:'.8rem', marginTop:5, fontWeight:600 }}>⚠ {errors.board}</p>}
                </InputGroup>
              </>
            )}

            <InputGroup label="Gmail Address" icon={<Mail size={14}/>} error={errors.email}>
              <input className={`input-field${errors.email?' error':''}`} type="email"
                placeholder="you@gmail.com" value={form.email}
                onChange={e=>set('email',e.target.value)}/>
            </InputGroup>

            <InputGroup label="Password" icon={<Lock size={14}/>} error={errors.password}>
              <div style={{ position:'relative' }}>
                <input className={`input-field${errors.password?' error':''}`}
                  type={showPw?'text':'password'} placeholder="••••••••" value={form.password}
                  onChange={e=>set('password',e.target.value)}
                  style={{ paddingRight:48 }}/>
                <button type="button" onClick={()=>setShowPw(!showPw)} style={{
                  position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                  background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)',
                }}>
                  {showPw ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </InputGroup>

            {!isLogin && (
              <InputGroup label="Confirm Password" error={errors.confirmPassword}>
                <div style={{ position:'relative' }}>
                  <input className={`input-field${errors.confirmPassword?' error':''}`}
                    type={showPw2?'text':'password'} placeholder="••••••••" value={form.confirmPassword}
                    onChange={e=>set('confirmPassword',e.target.value)}
                    style={{ paddingRight:48 }}/>
                  <button type="button" onClick={()=>setShowPw2(!showPw2)} style={{
                    position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)',
                  }}>
                    {showPw2 ? <EyeOff size={18}/> : <Eye size={18}/>}
                  </button>
                </div>
              </InputGroup>
            )}

            <button className="btn btn-primary btn-lg" type="submit" style={{ width:'100%', marginTop:8 }} disabled={loading}>
              {loading ? (
                <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width:18, height:18, border:'3px solid rgba(255,255,255,.4)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spinSlow 0.7s linear infinite' }}/>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </span>
              ) : (
                <span style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {isLogin ? 'Sign In' : 'Create My Account'} <ArrowRight size={18}/>
                </span>
              )}
            </button>
          </form>

          <div style={{ marginTop:20, textAlign:'center', fontSize:'.88rem', color:'var(--text-secondary)' }}>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button onClick={() => setIsLogin(!isLogin)} style={{
              background:'none', border:'none', cursor:'pointer', color:'var(--primary)', fontWeight:800,
            }}>
              {isLogin ? 'Create one!' : 'Sign in'}
            </button>
          </div>

          {!isLogin && (
            <p style={{ marginTop:14, textAlign:'center', fontSize:'.75rem', color:'var(--text-secondary)' }}>
              🔒 This is a frontend prototype. No real account security is implemented.
            </p>
          )}
        </div>

        <div style={{ textAlign:'center', marginTop:20 }}>
          <button onClick={() => navigate('/')} style={{
            background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)',
            display:'inline-flex', alignItems:'center', gap:6, fontFamily:'var(--font-body)', fontWeight:600, fontSize:'.88rem',
          }}>
            <ArrowLeft size={16}/> Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
