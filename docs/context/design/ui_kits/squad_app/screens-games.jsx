/* screens-games.jsx — SQUAD Games screen.
   Header · marketing hero · day rail · filter rail · game cards.
   The game card is a canonical .sq-card composing .sq-badge, .sq-spots,
   .sq-avatars, .sq-skill, .sq-sportchip and the .sq-btn JOIN action;
   only the time pill + layout wrappers are kit-local (.sqk-*). */

const { MIcon, SportChip, PhoneFrame, Reveal } = window;

/* ---------- header ---------- */
function GHeader(){
  return (
    <div className="sq-topbar" style={{padding:'8px 2px 16px', height:'auto'}}>
      <h1 className="sq-topbar-title is-lg">Games</h1>
      <span className="sq-topbar-spacer"></span>
      <button className="sqk-loc">
        <span className="sqk-loc-pin"><MIcon name="location_on" size={18} wght={600}/></span>
        Baku
        <span className="sqk-loc-ch"><MIcon name="expand_more" size={18} wght={600}/></span>
      </button>
    </div>
  );
}

/* ---------- bordered marketing hero ---------- */
function GHero(){
  return (
    <div className="sqk-hero">
      <image-slot class="sqk-hero-slot" id="gm-hero" fit="cover"
        placeholder="Drop a marketing banner (wide)"></image-slot>
    </div>
  );
}

/* ---------- day rail ---------- */
const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MON = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function buildDays(){
  const base = new Date(2026, 5, 2);
  const out = [];
  for (let i=0;i<14;i++){
    const d = new Date(base); d.setDate(base.getDate()+i);
    out.push({ wd: i===0 ? 'Today' : WD[d.getDay()], num:d.getDate(), sel:i===0 });
  }
  return { days:out, month:MON[base.getMonth()] };
}
function Calendar(){
  const { days, month } = buildDays();
  return (
    <div className="sqk-cal">
      <div className="sqk-month"><span>{month}</span></div>
      {days.map((d,i)=>(
        <button key={i} className={'sqk-day'+(d.sel?' is-sel':'')}>
          <span className="sqk-day-wd">{d.wd}</span>
          <span className="sqk-day-num">{d.num}</span>
        </button>
      ))}
    </div>
  );
}

/* ---------- filter rail (canonical .sq-chip) ---------- */
function Filters(){
  return (
    <div className="sqk-filters">
      <button className="sqk-ftune"><MIcon name="tune" size={20} wght={500}/></button>
      <button className="sq-chip is-active"><MIcon name="distance" size={18} wght={500}/> Within 10 km</button>
      <button className="sq-chip"><MIcon name="sports_soccer" size={18} wght={500}/> Sport <span className="sqk-fchip-ch"><MIcon name="expand_more" size={18} wght={600}/></span></button>
      <button className="sq-chip"><MIcon name="schedule" size={18} wght={500}/> Time <span className="sqk-fchip-ch"><MIcon name="expand_more" size={18} wght={600}/></span></button>
      <button className="sq-chip"><MIcon name="stadium" size={18} wght={500}/> Venue <span className="sqk-fchip-ch"><MIcon name="expand_more" size={18} wght={600}/></span></button>
      <button className="sq-chip"><MIcon name="swap_vert" size={18} wght={500}/> Sort</button>
    </div>
  );
}

/* ---------- joined-players stack (canonical .sq-avatars) ---------- */
const PLAYERS = [ ['AM',20], ['NR',210], ['EL',120], ['RS',300], ['KV',60], ['SƏ',265], ['TM',175] ];
function PlayerStack({ count }){
  const show = Math.min(3, count);
  return (
    <div className="sqk-going">
      <div className="sq-avatars">
        {Array.from({length:show}).map((_,i)=>(
          <span key={i} className="sq-av"
            style={{ background:`oklch(0.90 0.07 ${PLAYERS[i][1]})`, color:`oklch(0.40 0.13 ${PLAYERS[i][1]})` }}>
            {PLAYERS[i][0]}
          </span>
        ))}
      </div>
      <span className="sqk-going-count"><b>{count}</b> going</span>
    </div>
  );
}

/* ---------- game card ---------- */
const SKILL = { 1:'Beginner', 2:'Amateur', 3:'Intermediate', 4:'Advanced', 5:'Professional' };
function badgeFor(state){
  if (state==='open')    return ['is-open','Open'];
  if (state==='filling') return ['is-filling','Filling fast'];
  return ['is-full','Full'];
}
function MetaItem({ icon, children }){
  return <span className="sqk-meta-item"><MIcon name={icon} size={15} wght={500}/>{children}</span>;
}
function GameCard({ icon, title, fmt, skill, time, end, venue, dist, filled, total, price, state }){
  const [bcls, blabel] = badgeFor(state);
  const pct = Math.round((filled/total)*100);
  const full = state==='full';
  const left = total-filled;
  const stateCls = full ? 'is-full' : (state==='open' ? 'is-open' : 'is-filling');
  return (
    <button className="sq-card is-interactive sqk-gcard">
      <div className="sqk-card-bar">
        <span className="sqk-time"><MIcon name="schedule" size={15} wght={600}/>{time} – {end}</span>
        <span className={'sq-badge '+bcls}>{blabel}</span>
      </div>

      <div className="sqk-card-top">
        <SportChip icon={icon} size={44}/>
        <div className="sqk-card-head">
          <div className="sqk-card-title">{title}</div>
          <div className="sqk-card-fmt">{fmt}</div>
        </div>
      </div>

      <div className="sqk-card-meta">
        <MetaItem icon="location_on">{venue}</MetaItem>
        <MetaItem icon="distance">{dist}</MetaItem>
        <MetaItem icon="payments">{price===0 ? 'Free' : price+' ₼'}</MetaItem>
      </div>

      <div className="sq-spots">
        <div className="sq-spots-row">
          <span className="sq-spots-label">{filled}/{total} players</span>
          <span className={'sq-spots-state '+stateCls}>
            {full ? 'Roster full' : left+' spot'+(left===1?'':'s')+' left'}
          </span>
        </div>
        <div className="sq-spots-track">
          <div className={'sq-spots-fill '+stateCls} style={{width:pct+'%'}}></div>
        </div>
      </div>

      <div className="sqk-card-foot">
        <PlayerStack count={filled}/>
        {full
          ? <span className="sq-btn sq-btn-outline sq-btn-sm">Waitlist</span>
          : <span className="sq-btn sq-btn-primary sq-btn-sm">Join</span>}
      </div>

      <div className="sqk-card-skill">
        <span className="sqk-skill-cap">Skill</span>
        <span className={'sq-skill lv-'+skill}><span className="dot"></span>{SKILL[skill]}</span>
      </div>
    </button>
  );
}

const GAMES = [
  { icon:'sports_soccer', title:'Tuesday Pickup', fmt:'Soccer · 7v7', skill:3,
    time:'19:30', end:'21:00', venue:'Sahil Park', dist:'1.2 km', filled:8, total:14, price:10, state:'open' },
  { icon:'sports_basketball', title:'Hoops After Work', fmt:'Basketball · 5v5', skill:2,
    time:'18:00', end:'19:30', venue:'Sahil Arena', dist:'2.4 km', filled:6, total:10, price:0, state:'open' },
  { icon:'sports_tennis', title:'Morning Rally', fmt:'Tennis · Singles', skill:4,
    time:'09:00', end:'10:00', venue:'Gənclik Court', dist:'3.1 km', filled:3, total:4, price:15, state:'filling' },
  { icon:'sports_soccer', title:'Night League', fmt:'Football · 5v5', skill:5,
    time:'21:00', end:'22:30', venue:'Baku Arena', dist:'4.0 km', filled:10, total:10, price:8, state:'full' },
  { icon:'padel', title:'Padel Doubles', fmt:'Padel · 2v2', skill:1,
    time:'17:30', end:'19:00', venue:'Port Baku', dist:'2.8 km', filled:2, total:4, price:18, state:'filling' },
];

function GamesScreen(){
  return (
    <PhoneFrame activeTab="Games">
      <Reveal d={0}><GHeader/></Reveal>
      <Reveal d={70}><GHero/></Reveal>
      <Reveal d={140}><Calendar/></Reveal>
      <Reveal d={200}><Filters/></Reveal>
      <Reveal d={260}>
        <div className="sqk-listhead">
          <span className="sqk-listhead-title">Tue, Jun 2</span>
          <span className="sqk-listhead-count">12 games near you</span>
        </div>
        <div className="sqk-list">{GAMES.map((g,i)=> <GameCard key={i} {...g}/>)}</div>
      </Reveal>
    </PhoneFrame>
  );
}

Object.assign(window, { GamesScreen });
