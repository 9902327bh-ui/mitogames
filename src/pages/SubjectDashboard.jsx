import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Navbar from '../components/Navbar';
import { BioFloaters, ChemFloaters } from '../components/FloatingObjects';
import { Search, Youtube, Zap, BookOpen, ChevronRight, AlertCircle } from 'lucide-react';
import { TOPICS_BIOLOGY, TOPICS_CHEMISTRY, SAMPLE_BIOLOGY_GAMES, SAMPLE_CHEMISTRY_GAMES } from '../data/sampleGames';

const API_CACHE_KEY = 'mg_chemistry_video_cache_v1';
const BIO_CACHE_KEY = 'mg_biology_video_cache_v1';
const extractYouTubeId = (value) => {
  try {
    const trimmed = value.trim();
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || '';
    if (!['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) return '';
    if (url.pathname === '/watch') return url.searchParams.get('v') || '';
    const [, kind, id] = url.pathname.split('/');
    return ['shorts', 'live', 'embed', 'v'].includes(kind) ? id || '' : '';
  } catch { return ''; }
};

function readVideoCache(key = API_CACHE_KEY) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}

const DIFF_COLOR = { Easy:'#22C55E', Medium:'#FF9A3C', Hard:'#EF4444' };

const TOPIC_SAMPLE_IDS = {
  'biology:1':'bio-cell-1',
  'biology:2':'bio-photosynthesis-1',
  'chemistry:1':'chem-atoms-1',
  'chemistry:3':'chem-valency-1',
  'chemistry:4':'chem-acids-1',
  'chemistry:5':'chem-balancer-1',
};

const TOPIC_QUIZZES = {
  'biology:3': [
    { question:'Where does most nutrient absorption happen?', options:['Stomach','Small intestine','Large intestine','Oesophagus'], correct:1, explanation:'Villi in the small intestine provide a large surface area for absorbing digested nutrients.' },
    { question:'Which organ produces bile to help digest fats?', options:['Liver','Pancreas','Kidney','Lung'], correct:0, explanation:'The liver makes bile, which helps break large fat droplets into smaller ones.' },
    { question:'What does the stomach use to begin protein digestion?', options:['Bile','Hydrochloric acid and enzymes','Saliva only','Oxygen'], correct:1, explanation:'Stomach acid and enzymes such as pepsin begin breaking proteins into smaller pieces.' },
  ],
  'biology:4': [
    { question:'Which molecule carries inherited instructions in most living things?', options:['DNA','Starch','Water','Cellulose'], correct:0, explanation:'DNA stores genetic instructions that can be passed from parents to offspring.' },
    { question:'What is a gene?', options:['A type of blood cell','A digestive enzyme','A section of DNA with instructions','A whole chromosome pair'], correct:2, explanation:'A gene is a section of DNA that contains instructions for a functional product or trait.' },
    { question:'Where are chromosomes found in a human cell?', options:['Cell membrane','Nucleus','Ribosome','Vacuole'], correct:1, explanation:'Human chromosomes are packaged inside the cell nucleus.' },
  ],
  'biology:5': [
    { question:'What is the original source of energy for most food chains?', options:['The Sun','The Moon','Soil','Wind'], correct:0, explanation:'Producers capture sunlight and store it as chemical energy, which passes through food chains.' },
    { question:'What role do decomposers play in an ecosystem?', options:['Make sunlight','Recycle nutrients from dead matter','Stop energy transfer','Produce rocks'], correct:1, explanation:'Decomposers break down dead organisms and return nutrients to the environment.' },
    { question:'If a predator population falls, what may happen to its prey population?', options:['It must disappear','It becomes a producer','It may increase','It stops reproducing'], correct:2, explanation:'With fewer predators, more prey may survive and reproduce.' },
  ],
  'biology:6': [
    { question:'Which flower part produces pollen?', options:['Anther','Stigma','Sepal','Ovary'], correct:0, explanation:'The anther is part of the stamen and produces pollen grains.' },
    { question:'What is pollination?', options:['Growth of a root','Transfer of pollen to a stigma','Release of a seedling','Absorption of water'], correct:1, explanation:'Pollination transfers pollen from an anther to a stigma.' },
    { question:'Which structure develops into a seed after fertilisation?', options:['Petal','Anther','Sepal','Ovule'], correct:3, explanation:'After fertilisation, the ovule develops into a seed.' },
  ],
  'biology:7': [
    { question:'What is the basic signalling cell of the nervous system?', options:['Red blood cell','Neuron','Platelet','Alveolus'], correct:1, explanation:'Neurons carry electrical and chemical signals through the nervous system.' },
    { question:'Which part of the brain helps coordinate balance and movement?', options:['Stomach','Cerebellum','Spinal disc','Liver'], correct:1, explanation:'The cerebellum helps coordinate balance, posture, and voluntary movement.' },
    { question:'What is a reflex action?', options:['A learned language skill','A type of digestion','A rapid, automatic response','A slow voluntary plan'], correct:2, explanation:'Reflexes are quick, automatic responses that can help protect the body.' },
  ],
  'biology:8': [
    { question:'Which feature is commonly used to classify organisms?', options:['Shared characteristics','Their favourite food','Their age today','Their location only'], correct:0, explanation:'Scientists group organisms by shared features and evolutionary relationships.' },
    { question:'Which group contains organisms without a nucleus?', options:['Animals','Bacteria','Plants','Fungi'], correct:1, explanation:'Bacteria are prokaryotes and do not have a membrane-bound nucleus.' },
    { question:'Which kingdom includes mushrooms?', options:['Animalia','Fungi','Plantae','Archaea'], correct:1, explanation:'Mushrooms are fungi; they absorb nutrients and do not photosynthesise.' },
  ],
  'chemistry:2': [
    { question:'What does the atomic number tell you?', options:['Number of protons','Number of shells','Total neutrons only','Atom size'], correct:0, explanation:'An element’s atomic number is the number of protons in its nucleus.' },
    { question:'Elements in the same group usually have the same number of…', options:['Outer-shell electrons','Neutrons','Energy levels','Isotopes'], correct:0, explanation:'For main-group elements, members of a group share the same number of valence electrons.' },
    { question:'What is a horizontal row in the periodic table called?', options:['Period','Group','Family tree','Block only'], correct:0, explanation:'The horizontal rows of the periodic table are called periods.' },
  ],
  'chemistry:6': [
    { question:'What happens to particles when a solid melts?', options:['They gain energy and move past one another','They stop moving','They become atoms','They lose all attraction'], correct:0, explanation:'Heating gives particles energy so they can move past one another as a liquid.' },
    { question:'Which state has a fixed volume but no fixed shape?', options:['Liquid','Solid','Gas','Plasma only'], correct:0, explanation:'A liquid keeps a fixed volume but takes the shape of its container.' },
    { question:'What is condensation?', options:['Gas changing into liquid','Solid changing into gas','Liquid changing into solid','Liquid changing into gas'], correct:0, explanation:'Condensation occurs when gas particles lose energy and form a liquid.' },
  ],
  'chemistry:7': [
    { question:'What usually happens when many metals react with oxygen?', options:['They form metal oxides','They form sugars','They disappear','They become noble gases'], correct:0, explanation:'A metal reacting with oxygen commonly forms a metal oxide.' },
    { question:'Which property makes copper useful for electrical wires?', options:['It conducts electricity','It is brittle','It dissolves in water','It is a gas'], correct:0, explanation:'Copper is a good electrical conductor and can be drawn into wires.' },
    { question:'What is an alloy?', options:['A mixture containing a metal','A pure non-metal gas','A type of acid','A single atom'], correct:0, explanation:'An alloy is a mixture containing a metal, often made to improve its properties.' },
  ],
  'chemistry:8': [
    { question:'Which element forms the backbone of most organic compounds?', options:['Carbon','Neon','Sodium','Iron'], correct:0, explanation:'Carbon can form four covalent bonds, allowing it to build many complex molecules.' },
    { question:'What type of bond joins carbon atoms in a hydrocarbon?', options:['Covalent bond','Ionic bond only','Metallic bond','Magnetic bond'], correct:0, explanation:'Carbon atoms share pairs of electrons to form covalent bonds.' },
    { question:'Which elements are present in a hydrocarbon?', options:['Carbon and hydrogen','Carbon and oxygen only','Hydrogen and nitrogen','Sodium and chlorine'], correct:0, explanation:'Hydrocarbons contain only carbon and hydrogen atoms.' },
  ],
};

function TopicCard({ topic, subject, onStart }) {
  const isBio = subject === 'biology';
  return (
    <div className="card" style={{
      padding:'22px', cursor:'pointer', position:'relative', overflow:'hidden',
      border:`2px solid ${isBio ? 'rgba(34,197,94,.15)' : 'rgba(139,92,246,.15)'}`,
      background: isBio ? 'linear-gradient(135deg,#F0FFF4,white)' : 'linear-gradient(135deg,#F5F3FF,white)',
      transition:'all .3s',
    }}
    onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-5px)';}}
    onMouseLeave={e=>{e.currentTarget.style.transform='';}} >
      <div style={{ fontSize:'2.4rem', marginBottom:10 }}>{topic.icon}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.05rem', color:'var(--text-primary)', flex:1, marginRight:8 }}>{topic.title}</h3>
        <span style={{ fontSize:'.72rem', fontWeight:800, padding:'3px 10px', borderRadius:999, background:`${DIFF_COLOR[topic.difficulty]}18`, color:DIFF_COLOR[topic.difficulty], whiteSpace:'nowrap' }}>{topic.difficulty}</span>
      </div>
      <p style={{ fontSize:'.83rem', color:'var(--text-secondary)', marginBottom:12, lineHeight:1.5 }}>{topic.desc}</p>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:'.75rem', color:'var(--text-secondary)', fontWeight:600 }}>Grade {topic.grade}</span>
        <button className={`btn ${isBio?'btn-bio':'btn-chem'} btn-xs`} onClick={()=>onStart(topic)}>Start →</button>
      </div>
    </div>
  );
}

export default function SubjectDashboard({ subject = 'biology' }) {
  const { user, setCurrentGame, setCurrentSubject } = useApp();
  const navigate = useNavigate();
  const isBio = subject === 'biology';
  const [ytUrl, setYtUrl] = useState('');
  const [ytError, setYtError] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [readyMade, setReadyMade] = useState([]);
  const [readyMadeLoading, setReadyMadeLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('');

  useEffect(() => {
    let active = true;
    setReadyMadeLoading(true);
    setReadyMade([]);
    fetch(`${isBio ? '/api/biology/experiments/ready-made' : '/api/experiments/ready-made'}?classLevel=${encodeURIComponent(user?.grade || 8)}`)
      .then(async response => {
        if (!response.ok) throw new Error('Ready-made experiments are unavailable.');
        const data = await response.json();
        if (active) setReadyMade(Array.isArray(data.experiments) ? data.experiments : []);
      })
      .catch(() => { if (active) setReadyMade([]); })
      .finally(() => { if (active) setReadyMadeLoading(false); });
    return () => { active = false; };
  }, [isBio, user?.grade]);

  if (!user) { navigate('/login'); return null; }

  const topics = isBio ? TOPICS_BIOLOGY : TOPICS_CHEMISTRY;
  const sampleGames = isBio ? SAMPLE_BIOLOGY_GAMES : SAMPLE_CHEMISTRY_GAMES;

  const filtered = topics.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.desc.toLowerCase().includes(search.toLowerCase())
  );

  const handleGenerate = async () => {
    if (!ytUrl.trim()) { setYtError('Please paste a YouTube URL first!'); return; }
    const videoId = extractYouTubeId(ytUrl);
    if (!videoId || !/^[\w-]{11}$/.test(videoId)) { setYtError('Enter a valid YouTube watch, youtu.be, Shorts, Live, or embed link.'); return; }
    setYtError('');
    setYtLoading(true);
    setCurrentSubject(subject);
    const cacheKey = isBio ? BIO_CACHE_KEY : API_CACHE_KEY;
    const cached = readVideoCache(cacheKey)[videoId];
    if (cached?.result) {
      setYtLoading(false);
      setCurrentGame(isBio
        ? { title:cached.result.videoMeta?.title || 'Biology Video Lab', description:cached.result.summary?.overview || '', topic:'YouTube Biology Lab', icon:'🧬', difficulty:'Interactive 3D Lab', gameType:'verbatimBio3d', verbatimBioExperiment:cached.result.experiment, verbatimBioResult:cached.result, fromYoutube:true }
        : { title: cached.result.video?.title || 'Chemistry Video Lab', description: cached.result.summary, topic: 'YouTube Chemistry Lab', icon: '⚗️', difficulty: 'Interactive 3D Lab', gameType: 'verbatim3d', verbatimResult: cached.result, fromYoutube: true, ytUrl });
      navigate('/game-intro');
      return;
    }
    try {
      const response = await fetch(isBio ? '/api/biology/summarize/stream' : '/api/summarize/stream', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isBio
          ? { url:ytUrl.trim(), summaryLength:'standard', classLevel:Number(user?.grade) || 8 }
          : { url: ytUrl.trim(), length: 'standard', studentAge: 13, studentClass: `Class ${user?.grade || 8}` }),
      });
      const type = response.headers.get('content-type') || '';
      if (!response.ok || !type.includes('text/event-stream')) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Could not process the YouTube video.');
      }
      setLoadingMessage(`Checking the video and transcribing its ${isBio ? 'biology' : 'chemistry'} lesson…`);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult = null;
      let rejection = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split('\n\n');
        buffer = blocks.pop() || '';
        for (const block of blocks) {
          const event = block.match(/^event:\s*(.+)$/m)?.[1];
          const raw = block.split('\n').find(line => line.startsWith('data:'))?.slice(5).trim();
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (event === 'metadata' || event === 'meta') setLoadingMessage(`Transcribing “${data.video?.title || data.videoMeta?.title || 'your video'}”… this can take a minute.`);
          if (event === 'stage') setLoadingMessage(data.stage || 'Gemini is building your interactive lab…');
          if (event === 'not_chemistry') rejection = data.error || 'This video is not chemistry-related. Try a chemistry reaction or electrolysis video.';
          if (event === 'error') throw new Error(data.error || 'The lab could not be generated.');
          if (event === 'done') finalResult = data.result;
          if (event === 'complete') finalResult = data;
        }
      }
      if (rejection) throw new Error(rejection);
      if (!finalResult) throw new Error('The experiment stream ended before the lab was ready.');
      if (isBio && !finalResult.experiment?.isBiology) {
        throw new Error(finalResult.experiment?.rejectionReason || 'This video does not appear to be about Biology. Please try a Biology lesson.');
      }
      const cache = readVideoCache(cacheKey);
      cache[videoId] = { result: finalResult, savedAt: Date.now() };
      try { localStorage.setItem(cacheKey, JSON.stringify(cache)); } catch { /* Continue with the result if browser storage is full. */ }
      setCurrentGame(isBio
        ? { title:finalResult.videoMeta?.title || 'Biology Video Lab', description:finalResult.summary?.overview || '', topic:'YouTube Biology Lab', icon:'🧬', difficulty:'Interactive 3D Lab', gameType:'verbatimBio3d', verbatimBioExperiment:finalResult.experiment, verbatimBioResult:finalResult, fromYoutube:true }
        : { title: finalResult.video?.title || 'Chemistry Video Lab', description: finalResult.summary, topic: 'YouTube Chemistry Lab', icon: '⚗️', difficulty: 'Interactive 3D Lab', gameType: 'verbatim3d', verbatimResult: finalResult, fromYoutube: true, ytUrl });
      navigate('/game-intro');
    } catch (error) {
      setYtError(error instanceof Error ? error.message : 'The experiment could not be generated.');
    } finally {
      setYtLoading(false);
      setLoadingMessage('');
    }
  };

  const handleTopicStart = (topic) => {
    const sampleId = TOPIC_SAMPLE_IDS[`${subject}:${topic.id}`];
    const sample = sampleGames.find(game => game.id === sampleId);
    const topicQuestions = TOPIC_QUIZZES[`${subject}:${topic.id}`];
    const selectedGame = sample || {
      id:`${subject}-topic-${topic.id}`,
      title:topic.title,
      subject,
      topic:topic.title,
      grade:[Number.parseInt(topic.grade, 10) || 8, Number.parseInt(topic.grade.split('-')[1], 10) || 8],
      board:['CBSE','ICSE','State Board'],
      description:topic.desc,
      estimatedTime:'5 mins',
      difficulty:topic.difficulty,
      icon:topic.icon,
      gameType:'mcq',
      questions:topicQuestions || [],
    };
    setCurrentGame({ ...selectedGame, title:topic.title, fromTopic:true });
    setCurrentSubject(subject);
    navigate('/game-intro');
  };

  const palette = isBio
    ? { primary:'#22C55E', dark:'#16A34A', light:'#DCFCE7', grad:'135deg,#22C55E,#34D399', bg:'linear-gradient(160deg,#F0FFF4,#F8F7FF)', border:'rgba(34,197,94,.2)' }
    : { primary:'#8B5CF6', dark:'#6D28D9', light:'#EDE9FE', grad:'135deg,#8B5CF6,#06B6D4', bg:'linear-gradient(160deg,#F5F3FF,#F0F9FF)', border:'rgba(139,92,246,.2)' };

  return (
    <div style={{ minHeight:'100vh', background:palette.bg, position:'relative' }}>
      {isBio ? <BioFloaters/> : <ChemFloaters/>}
      <Navbar/>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px', position:'relative', zIndex:2 }}>

        {/* Hero */}
        <div className="a-fade-in" style={{
          borderRadius:24, padding:'40px 44px', marginBottom:36, position:'relative', overflow:'hidden',
          background:`linear-gradient(${palette.grad})`, color:'white',
        }}>
          <div style={{ position:'absolute', top:-20, right:-20, fontSize:'10rem', opacity:.1 }}>{isBio?'🌿':'⚗️'}</div>
          <div style={{ position:'absolute', bottom:-10, right:'25%', fontSize:'6rem', opacity:.08 }}>{isBio?'🧬':'⚛️'}</div>
          <div style={{ position:'relative', zIndex:2 }}>
            <div className="chip" style={{ background:'rgba(255,255,255,.2)', color:'white', marginBottom:14 }}>
              {isBio ? '🌿 Life Sciences' : '⚗️ Physical Sciences'}
            </div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(1.8rem,4vw,2.8rem)', marginBottom:12, lineHeight:1.1 }}>
              {isBio ? 'Explore Life. Discover the Wonders of Biology!' : 'Mix Curiosity with Science. Let\'s Make Chemistry Fun!'}
            </h1>
            <p style={{ opacity:.9, fontSize:'1.05rem', maxWidth:600 }}>
              {isBio
                ? 'From tiny cells to giant ecosystems — discover how life works at every level!'
                : 'Dive into atoms, molecules and reactions — unravel the science behind everything!'}
            </p>
          </div>
        </div>

        {/* Two Option Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginBottom:40 }}>

          {/* YouTube Option */}
          <div className="card a-slide-left" style={{ padding:'28px', border:`2px solid ${palette.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#FF0000,#FF6B6B)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Youtube size={20} color="white"/>
              </div>
              <div>
                <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.1rem', color:'var(--text-primary)' }}>Create Game from YouTube</h3>
                <p style={{ fontSize:'.78rem', color:'var(--text-secondary)' }}>Paste any {isBio?'Biology':'Chemistry'} lesson video</p>
              </div>
            </div>

            <div style={{ background:isBio?'#F0FFF4':'#F5F3FF', border:`1px solid ${isBio?'#BBF7D0':'#DDD6FE'}`, borderRadius:12, padding:'12px 14px', marginBottom:16, fontSize:'.8rem', color:isBio?'#166534':'#5B21B6' }}>
              Paste a {isBio?'biology':'chemistry'} video. We’ll transcribe it, check its topic, and build a playable lab.
            </div>

            <div style={{ position:'relative', marginBottom:12 }}>
              <input
                className={`input-field${ytError?' error':''}`}
                value={ytUrl}
                onChange={e=>{setYtUrl(e.target.value);setYtError('');}}
                placeholder="https://youtube.com/watch?v=..."
                style={{ paddingLeft:42 }}
              />
              <Youtube size={18} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
            </div>

            {ytError && (
              <div role="alert" style={{ display:'flex', alignItems:'center', gap:6, color:'var(--secondary)', fontSize:'.83rem', fontWeight:600, marginBottom:12 }}>
                <AlertCircle size={15}/> {ytError}
              </div>
            )}

            <button
              className={`btn ${isBio?'btn-bio':'btn-chem'}`}
              style={{ width:'100%' }}
              onClick={handleGenerate}
              disabled={ytLoading}
            >
              {ytLoading ? (
                <span style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,.4)', borderTopColor:'white', borderRadius:'50%', display:'inline-block', animation:'spinSlow .7s linear infinite' }}/>
                  {loadingMessage || 'Connecting to the lab engine…'}
                </span>
              ) : (
                <><Zap size={16}/> Generate Game!</>
              )}
            </button>
          </div>

          {/* Search Topics */}
          <div className="card a-slide-right" style={{ padding:'28px', border:`2px solid ${palette.border}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(${palette.grad})`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <BookOpen size={20} color="white"/>
              </div>
              <div>
                <h3 style={{ fontFamily:'var(--font-heading)', fontSize:'1.1rem', color:'var(--text-primary)' }}>Explore Topics</h3>
                <p style={{ fontSize:'.78rem', color:'var(--text-secondary)' }}>Browse ready-to-play lessons</p>
              </div>
            </div>
            <div style={{ position:'relative' }}>
              <input
                className="input-field"
                value={search}
                onChange={e=>setSearch(e.target.value)}
                placeholder={`Search ${isBio?'biology':'chemistry'} topics...`}
                style={{ paddingLeft:42 }}
              />
              <Search size={18} style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#9CA3AF' }}/>
            </div>
            <div style={{ marginTop:12, fontSize:'.83rem', color:'var(--text-secondary)' }}>
              {filtered.length} topic{filtered.length!==1?'s':''} available for Grade {user.grade} · {user.board}
            </div>
          </div>
        </div>

        <section style={{ marginBottom:36 }}>
          <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'1.3rem', marginBottom:16, color:'var(--text-primary)' }}>{isBio ? '🌿 Ready-made Biology labs' : '🧪 Ready-made experiments'}</h2>
          {readyMade.length ? <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:18 }}>
            {readyMade.map(item => {
              const result = item.result || item;
              const electro = !isBio && Boolean(result.electroExperiment || result.sceneKind === 'electro' || item.sceneKind === 'electro');
              const experiment = isBio ? item.experiment : result.electroExperiment || result.experiment;
              return <button key={item.id} className="card" onClick={() => {
                if (!experiment) return;
                setCurrentSubject(isBio ? 'biology' : 'chemistry');
                setCurrentGame(isBio
                  ? { title:experiment.experimentTitle, description:experiment.conceptSummary, topic:experiment.topic, icon:'🧬', difficulty:experiment.difficulty, gameType:'verbatimBio3d', verbatimBioExperiment:experiment, readyMade:true }
                  : { title: item.title || experiment.experimentTitle, description: result.summary || experiment.conceptSummary, topic: item.subtitle || 'Chemistry Lab', icon: electro ? '🔋' : '⚗️', difficulty: experiment.difficulty || 'Interactive 3D Lab', gameType: 'verbatim3d', verbatimResult: result, readyMade: true });
                navigate('/game-intro');
              }} style={{ padding:20, textAlign:'left', cursor:'pointer', border:`2px solid ${item.accentColor || palette.primary}33`, borderTop:`5px solid ${item.accentColor || palette.primary}`, transition:'transform .2s, box-shadow .2s' }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 14px 30px rgba(15,23,42,.1)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='';}}>
                <span className="chip" style={{ background:palette.light, color:palette.dark, marginBottom:10 }}>{item.classBadge || `Class ${item.minClass}–${item.maxClass}`}</span>
                <h3 style={{ fontFamily:'var(--font-heading)', marginBottom:6 }}>{item.title || experiment?.experimentTitle}</h3>
                <p style={{ color:'var(--text-secondary)', fontSize:'.84rem', lineHeight:1.5, marginBottom:14 }}>{item.subtitle || result.summary}</p>
                <span style={{ fontSize:'.82rem', fontWeight:800, color:isBio?'#16A34A':'#6D28D9' }}>{isBio ? `Launch ${experiment.sceneKind} lab →` : electro ? 'Launch Electro3D →' : 'Launch Lab3D →'}</span>
              </button>;
            })}
          </div> : <p style={{ color:'var(--text-secondary)' }}>{readyMadeLoading ? 'Loading ready-made labs…' : 'No ready-made labs were returned. Check the API connection and your selected grade.'}</p>}
        </section>

        {/* Topics Grid */}
        <h2 style={{ fontFamily:'var(--font-heading)', fontSize:'1.3rem', marginBottom:18, color:'var(--text-primary)' }}>
          {isBio ? '🌿' : '⚗️'} Available Topics
        </h2>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:18 }}>
          {filtered.map(t => (
            <TopicCard key={t.id} topic={t} subject={subject} onStart={handleTopicStart}/>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 0', color:'var(--text-secondary)' }}>
            <div style={{ fontSize:'3rem', marginBottom:12 }}>🔍</div>
            <p style={{ fontWeight:600 }}>No topics found for "{search}"</p>
            <button className="btn btn-secondary btn-sm" style={{ marginTop:12 }} onClick={()=>setSearch('')}>Clear Search</button>
          </div>
        )}
      </div>
    </div>
  );
}
