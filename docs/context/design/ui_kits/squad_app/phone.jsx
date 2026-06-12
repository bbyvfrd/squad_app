/* phone.jsx — shared chrome for the SQUAD UI kit.
   MIcon (Material Symbols), the device frame, status bar, tab bar,
   staggered reveal, and the sport-identity class map. Exports to window. */

/* ---------- Material Symbols icon ---------- */
function MIcon({ name, size=22, fill=0, wght=400, style }){
  return (
    <span className="sq-icon" aria-hidden="true"
      style={{ fontSize:size,
        fontVariationSettings:`'FILL' ${fill}, 'wght' ${wght}, 'GRAD' 0, 'opsz' ${Math.min(48,Math.max(20,size))}`,
        ...style }}>{name}</span>
  );
}

/* ---------- status-bar glyphs ---------- */
function StatusIcons(){
  return (
    <div className="sqk-stat-ic">
      <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
      <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.2c2.7 0 5.2 1.05 7 2.78l-1.5 1.6A7.7 7.7 0 0 0 8.5 4.3 7.7 7.7 0 0 0 3 6.58L1.5 4.98A10.1 10.1 0 0 1 8.5 2.2Z"/><path d="M8.5 6.1c1.6 0 3.05.62 4.13 1.64L8.5 12 4.37 7.74A5.95 5.95 0 0 1 8.5 6.1Z"/></svg>
      <svg width="26" height="13" viewBox="0 0 26 13" fill="none"><rect x="0.6" y="0.6" width="22" height="11.8" rx="3.2" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.1"/><rect x="2.2" y="2.2" width="16.5" height="8.6" rx="1.8" fill="currentColor"/><rect x="24" y="4.3" width="1.8" height="4.4" rx="0.9" fill="currentColor" fillOpacity="0.5"/></svg>
    </div>
  );
}

/* ---------- sport-identity class map (canonical .sq-sport-*) ---------- */
const SPORT_CLASS = {
  sports_soccer:'sq-sport-soccer', sports_basketball:'sq-sport-basketball',
  sports_tennis:'sq-sport-tennis', sports_volleyball:'sq-sport-volleyball',
  padel:'sq-sport-padel', directions_run:'sq-sport-running',
  fitness_center:'sq-sport-gym', pool:'sq-sport-swimming',
};

/* sport icon chip using the canonical .sq-sportchip + tint class */
function SportChip({ icon, size=44 }){
  const tint = SPORT_CLASS[icon] || '';
  return (
    <span className={`sq-sportchip ${size===40?'sz-40':''} ${tint}`}>
      <MIcon name={icon} size={size===44?24:22} wght={500}/>
    </span>
  );
}

/* ---------- device frame ---------- */
function PhoneFrame({ time='9:41', activeTab='Home', children }){
  const tabs = [
    { ic:'home',          name:'Home'    },
    { ic:'sports_soccer', name:'Games'   },
    { ic:'stadium',       name:'Venues'  },
    { ic:'person',        name:'Profile' },
  ];
  return (
    <div className="sqk-frame">
      <div className="sqk-screen">
        <div className="sqk-island"></div>
        <div className="sqk-status">
          <div className="sqk-time">{time}</div>
          <StatusIcons/>
        </div>
        <div className="sqk-body"><div className="sqk-scroll">{children}</div></div>
        <div className="sq-tabbar">
          {tabs.map(t=>{
            const on = t.name===activeTab;
            return (
              <button key={t.name} className={'sq-tab'+(on?' is-active':'')}>
                <MIcon name={t.ic} size={24} fill={on?1:0} wght={on?600:500}/>
                <span className="sq-tab-label">{t.name}</span>
              </button>
            );
          })}
        </div>
        <div className="sqk-home-ind"></div>
      </div>
    </div>
  );
}

/* ---------- staggered section entrance ---------- */
function Reveal({ d=0, children }){
  return <div className="sqk-reveal" style={{'--sqk-d': d+'ms'}}>{children}</div>;
}

Object.assign(window, { MIcon, SportChip, PhoneFrame, Reveal, SPORT_CLASS });
