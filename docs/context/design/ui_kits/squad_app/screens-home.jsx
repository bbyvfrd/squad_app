/* screens-home.jsx — SQUAD Home screen (active feed).
   Header · search · browse-by-sport rail · upcoming (hosting) · explore
   tiles · games near you · venues near you. Cards/badges/buttons/chips
   are canonical .sq-*; only layout wrappers are kit-local (.sqk-*). */

const { MIcon, SportChip, PhoneFrame, Reveal, SPORT_CLASS } = window;

function HHeader(){
  return (
    <div className="sqk-head">
      <div>
        <h1 className="sqk-hello">Hi, Farid <span className="sqk-wave"><MIcon name="waving_hand" size={22} fill={1} wght={500}/></span></h1>
        <p className="sqk-sub">Pickup games and venues around you.</p>
      </div>
      <button className="sqk-loc">
        <span className="sqk-loc-pin"><MIcon name="location_on" size={18} wght={600}/></span>
        Baku
        <span className="sqk-loc-ch"><MIcon name="expand_more" size={18} wght={600}/></span>
      </button>
    </div>
  );
}

function SearchBar(){
  return (
    <div className="sqk-search">
      <span className="sqk-search-ic"><MIcon name="search" size={22} wght={500}/></span>
      <span className="sqk-search-ph">Search games, venues...</span>
    </div>
  );
}

function SectionHead({ title, link, tag }){
  return (
    <div className="sqk-sec">
      <h2 className="sqk-sec-title">{title}</h2>
      {link && <button className="sqk-sec-link">{link} <MIcon name="arrow_forward" size={16} wght={700}/></button>}
      {tag && <span className="sqk-sec-tag">{tag}</span>}
    </div>
  );
}

const SPORTS = [
  ['Football','sports_soccer'], ['Basketball','sports_basketball'],
  ['Tennis','sports_tennis'],   ['Volleyball','sports_volleyball'],
  ['Padel','padel'], ['Running','directions_run'],
  ['Gym','fitness_center'],      ['Swimming','pool'],
];
function BrowseSport(){
  return (
    <React.Fragment>
      <SectionHead title="Browse by sport"/>
      <div className="sqk-srail">
        {SPORTS.map(([name,ic])=>(
          <button key={name} className="sqk-sport">
            <span className={'sqk-sport-ic sq-sportchip '+(SPORT_CLASS[ic]||'')} style={{boxShadow:'none'}}>
              <MIcon name={ic} size={22} wght={500}/>
            </span>
            <span className="sqk-sport-name">{name}</span>
          </button>
        ))}
      </div>
    </React.Fragment>
  );
}

/* upcoming hosted game */
function Upcoming(){
  return (
    <React.Fragment>
      <SectionHead title="Your upcoming games"/>
      <button className="sq-card is-interactive sqk-upcoming">
        <SportChip icon="sports_soccer" size={44}/>
        <div className="sqk-up-body">
          <div className="sqk-up-title">Tuesday Pickup</div>
          <div className="sqk-up-meta">Tue · 19:30 · Sahil Park</div>
          <div className="sqk-up-status">
            <span className="sq-badge is-host"><MIcon name="verified" size={14} fill={1}/> Hosting</span>
            <span className="sq-badge is-waiting"><span className="sq-dot is-warning"></span> 2 requests</span>
          </div>
        </div>
        <span className="sqk-up-go"><MIcon name="chevron_right" size={24} wght={500}/></span>
      </button>
    </React.Fragment>
  );
}

/* explore tiles (claymorphism slots) */
function ExploreCard({ id, name, sub, tag, tint }){
  return (
    <div className="sq-card sqk-xcard">
      <div className="sqk-xc-stage" style={tint?{background:tint}:undefined}>
        <div className="sqk-xc-ground"></div>
        <image-slot class="sqk-xc-clay" id={'xc-'+id} fit="contain" shape="rect"
          placeholder="Drop clay render" style={{background:'transparent'}}></image-slot>
      </div>
      <div className="sqk-xc-meta">
        <div className="sqk-xc-label">{name}{tag && <span className="sqk-xc-new">{tag}</span>}</div>
        <div className="sqk-xc-sub">{sub}</div>
      </div>
    </div>
  );
}
function SoonCard(){
  return (
    <div className="sq-card sqk-xcard is-soon">
      <div className="sqk-xc-soonstage"><MIcon name="lock" size={26} wght={500}/></div>
      <div className="sqk-xc-meta">
        <div className="sqk-xc-label is-soon">Trainers <span className="sqk-xc-soon">Soon</span></div>
        <div className="sqk-xc-sub">Book a coach</div>
      </div>
    </div>
  );
}
function ExploreCards(){
  return (
    <React.Fragment>
      <SectionHead title="Explore SQUAD"/>
      <div className="sqk-xgrid">
        <ExploreCard id="games"  name="Games"      sub="Find & join pickup"   tint="oklch(0.95 0.04 150)"/>
        <ExploreCard id="venues" name="Venues"     sub="Pitches & courts"     tint="oklch(0.95 0.035 230)"/>
        <ExploreCard id="squad"  name="Your squad" sub="Find or build a crew" tag="New" tint="var(--terra-50)"/>
        <SoonCard/>
      </div>
    </React.Fragment>
  );
}

/* compact games near you (2-up) */
function GameCardSm({ sport, icon, meta, filled, total, state }){
  const pct = Math.round((filled/total)*100);
  const isOpen = state==='open';
  return (
    <button className="sq-card is-interactive sqk-gcard-sm">
      <div className="sqk-gc-top">
        <SportChip icon={icon} size={40}/>
        <span className={'sq-badge '+(isOpen?'is-open':'is-filling')}>{isOpen?'Open':'Filling'}</span>
      </div>
      <div>
        <div className="sqk-gc-name">{sport}</div>
        <div className="sqk-gc-meta">{meta}</div>
      </div>
      <div className="sq-spots">
        <div className="sq-spots-row">
          <span className="sq-spots-label">{filled}/{total} spots</span>
          <span className={'sq-spots-state '+(isOpen?'is-open':'is-filling')}>{isOpen?(total-filled)+' left':'1 left'}</span>
        </div>
        <div className="sq-spots-track">
          <div className={'sq-spots-fill '+(isOpen?'is-open':'is-filling')} style={{width:pct+'%'}}></div>
        </div>
      </div>
    </button>
  );
}
function GamesNear(){
  return (
    <React.Fragment>
      <SectionHead title="Games near you" link="See all"/>
      <div className="sqk-games">
        <GameCardSm sport="Basketball" icon="sports_basketball" meta="Sat · 18:00 · Sahil Park" filled={6} total={10} state="open"/>
        <GameCardSm sport="Tennis" icon="sports_tennis" meta="Sun · 09:00 · Gənclik" filled={3} total={4} state="filling"/>
      </div>
    </React.Fragment>
  );
}

/* venues near you */
const VENUES = [ { name:'Sahil Arena', meta:'Football · Sahil' }, { name:'Gənclik Court', meta:'Tennis / Padel' } ];
function VenuesNear(){
  return (
    <React.Fragment>
      <SectionHead title="Venues near you" tag="read-only"/>
      <div className="sqk-venues">
        {VENUES.map(v=>(
          <button key={v.name} className="sq-card is-interactive sqk-vcard">
            <div className="sqk-vc-img">
              <MIcon name="image" size={26} wght={400}/>
              <span className="sqk-vc-flag">Photo</span>
            </div>
            <div className="sqk-vc-body">
              <div className="sqk-vc-name">{v.name}</div>
              <div className="sqk-vc-meta">{v.meta}</div>
            </div>
          </button>
        ))}
      </div>
    </React.Fragment>
  );
}

function HomeScreen(){
  return (
    <PhoneFrame activeTab="Home">
      <Reveal d={0}><HHeader/></Reveal>
      <Reveal d={70}><SearchBar/></Reveal>
      <Reveal d={140}><BrowseSport/></Reveal>
      <Reveal d={210}><Upcoming/></Reveal>
      <Reveal d={280}><ExploreCards/></Reveal>
      <Reveal d={350}><GamesNear/></Reveal>
      <Reveal d={420}><VenuesNear/></Reveal>
    </PhoneFrame>
  );
}

Object.assign(window, { HomeScreen });
