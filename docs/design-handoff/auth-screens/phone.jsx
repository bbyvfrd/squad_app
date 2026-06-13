/* phone.jsx — shared chrome, icons, and field primitives for SQUAD auth screens
   Exports to window: PhoneFrame, Field, icons, GoogleG, AppleMark, etc. */

/* ---------- status-bar icons ---------- */
function IconCellular(){ return (
  <svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor" aria-hidden="true">
    <rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/>
    <rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/>
  </svg> ); }
function IconWifi(){ return (
  <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" aria-hidden="true">
    <path d="M8.5 2.2c2.7 0 5.2 1.05 7 2.78l-1.5 1.6A7.7 7.7 0 0 0 8.5 4.3 7.7 7.7 0 0 0 3 6.58L1.5 4.98A10.1 10.1 0 0 1 8.5 2.2Z"/>
    <path d="M8.5 6.1c1.6 0 3.05.62 4.13 1.64L8.5 12 4.37 7.74A5.95 5.95 0 0 1 8.5 6.1Z"/>
  </svg> ); }
function IconBattery(){ return (
  <svg width="26" height="13" viewBox="0 0 26 13" fill="none" aria-hidden="true">
    <rect x="0.6" y="0.6" width="22" height="11.8" rx="3.2" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.1"/>
    <rect x="2.2" y="2.2" width="16.5" height="8.6" rx="1.8" fill="currentColor"/>
    <rect x="24" y="4.3" width="1.8" height="4.4" rx="0.9" fill="currentColor" fillOpacity="0.5"/>
  </svg> ); }

/* ---------- app icons · Material Symbols (outlined, currentColor) ---------- */
function MIcon({ name, size=22, fill=0, wght=400, style }){
  return (
    <span className="sq-icon" aria-hidden="true"
      style={{ fontSize:size,
        fontVariationSettings:`'FILL' ${fill}, 'wght' ${wght}, 'GRAD' 0, 'opsz' ${Math.min(48,Math.max(20,size))}`,
        ...style }}>{name}</span>
  );
}
function IconChevronLeft(){ return <MIcon name="arrow_back" size={22} wght={500}/>; }
function IconArrowRight(){ return <MIcon name="arrow_forward" size={20} wght={600}/>; }
function IconMail(){ return <MIcon name="mail" size={21} wght={400}/>; }
function IconUser(){ return <MIcon name="person" size={21} wght={400}/>; }
function IconLock(){ return <MIcon name="lock" size={21} wght={400}/>; }
function IconEye(){ return <MIcon name="visibility" size={21} wght={400}/>; }
function IconCheck(){ return <MIcon name="check" size={16} wght={700}/>; }
function IconPin(){ return <MIcon name="location_on" size={24} wght={500}/>; }
function IconBolt(){ return <MIcon name="bolt" size={24} wght={500}/>; }
function IconUsers(){ return <MIcon name="groups" size={24} wght={500}/>; }
function IconImage(){ return <MIcon name="image" size={26} wght={400}/>; }
function IconBall(){ return <MIcon name="directions_run" size={26} wght={500}/>; }
function IconWhistle(){ return <MIcon name="checklist" size={26} wght={500}/>; }
function IconStadium(){ return <MIcon name="stadium" size={26} wght={500}/>; }
function IconLaunch(){ return <MIcon name="open_in_new" size={20} wght={500}/>; }
function IconPhone(){ return <MIcon name="smartphone" size={20} wght={500}/>; }

/* brand third-party marks (sign-in affordances) */
function GoogleG(){ return (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"/>
    <path fill="#FBBC05" d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33Z"/>
    <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"/>
  </svg> ); }
function AppleMark({color}){ return (
  <svg width="17" height="20" viewBox="0 0 17 20" fill={color||"currentColor"} aria-hidden="true">
    <path d="M14.05 10.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.73-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.74 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.86.69 1.18-.02 1.93-1.08 2.65-2.14.84-1.23 1.18-2.42 1.2-2.48-.03-.01-2.3-.88-2.32-3.5ZM11.86 4.0c.6-.74 1.02-1.75.9-2.77-.87.04-1.94.59-2.57 1.32-.56.64-1.06 1.68-.93 2.67.97.08 1.97-.49 2.6-1.22Z"/>
  </svg> ); }

/* ---------- phone frame ---------- */
function PhoneFrame({ tint='dark', time='9:41', children }){
  const tc = tint === 'light' ? 'ph-tint-light' : 'ph-tint-dark';
  return (
    <div className="ph-frame">
      <div className="ph-screen">
        <div className="ph-body">{children}</div>
        <div className="ph-island"></div>
        <div className={'ph-status '+tc}>
          <div className="ph-time">{time}</div>
          <div className="ph-icons"><IconCellular/><IconWifi/><IconBattery/></div>
        </div>
        <div className={'ph-home '+(tint==='light'?'ph-home-light':'ph-home-dark')}></div>
      </div>
    </div>
  );
}

/* ---------- field ---------- */
/* variant: 'dark' | 'light'; focus highlights the row + shows caret */
function Field({ variant='light', label, icon, value, placeholder, focus=false, trailing }){
  const wrap = variant === 'dark' ? 'au-field-dark' : 'au-field-light';
  const showValue = value && value.length;
  return (
    <div className={wrap}>
      {label && <label className="au-field-label">{label}</label>}
      <div className={'au-input-row'+(focus?' is-focus':'')}>
        {icon && <span className="au-input-icon">{icon}</span>}
        <span className="au-input-fake">
          {showValue
            ? <span>{value}{focus && <span className="au-caret"></span>}</span>
            : <span className="au-placeholder">{placeholder}{focus && <span className="au-caret"></span>}</span>}
        </span>
        {trailing && <span className="au-input-icon">{trailing}</span>}
      </div>
    </div>
  );
}

Object.assign(window, {
  PhoneFrame, Field, MIcon,
  IconCellular, IconWifi, IconBattery, IconChevronLeft, IconArrowRight,
  IconMail, IconUser, IconLock, IconEye, IconCheck, GoogleG, AppleMark,
  IconPin, IconBolt, IconUsers, IconImage, IconBall, IconWhistle, IconStadium, IconLaunch, IconPhone,
});
