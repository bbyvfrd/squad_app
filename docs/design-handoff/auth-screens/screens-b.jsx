/* screens-b.jsx — Direction B · "Warm Linen"
   Light, airy, Google-grade. Soft rounded fields, mixed-case titles,
   one terracotta spike, a hint of the clay direction on the mark. */

const { PhoneFrame:PFb, Field:FieldB, IconChevronLeft:ChevB, IconArrowRight:ArrowB,
        IconMail:MailB, IconUser:UserB, IconLock:LockB, IconEye:EyeB,
        IconCheck:CheckB, GoogleG:GoogleB, AppleMark:AppleB,
        IconPin:PinB, IconBolt:BoltB, IconUsers:UsersB, IconImage:ImageB,
        IconBall:BallB, IconWhistle:WhistleB, IconStadium:StadiumB, IconLaunch:LaunchB,
        IconPhone:PhoneIcoB,
        MIcon } = window;

const BONE = 'var(--bg-card)';   /* Pressed Bone */

function titleStyle(){ return {
  margin:0, fontFamily:'var(--font-sans)', fontWeight:800, fontSize:34, lineHeight:1.04,
  letterSpacing:'-0.02em', color:'var(--steel-700)'}; }

function SocialRowLight(){
  return (
    <div style={{display:'flex', gap:10}}>
      <button className="au-btn au-btn-social au-btn-social-light" style={{flex:1}}><GoogleB/> Google</button>
      <button className="au-btn au-btn-social au-btn-social-light" style={{flex:1}}><AppleB color="var(--steel-700)"/> Apple</button>
    </div>
  );
}
function DividerLight(){ return <div className="au-divider au-divider-light">or</div>; }

/* Email | Phone method chooser — icon buttons */
function MethodTabs({ active='email' }){
  return (
    <div className="method-row">
      <button className={'method-btn'+(active==='email'?' is-active':'')}><MailB/> Email</button>
      <button className={'method-btn'+(active==='phone'?' is-active':'')}><PhoneIcoB/> Phone</button>
    </div>
  );
}

/* ---------- B1 · BOOT / SPLASH ---------- */
function B_Boot(){
  return (
    <PFb tint="dark">
      <div style={{position:'absolute', inset:0, background:BONE}}>
        <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center'}}>
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center'}}>
            <div className="boot-mark"><img className="boot-clay" src="assets/logo_stacked.png" width="156" alt="SQUAD"/></div>
          </div>
          <div style={{paddingBottom:92, display:'flex', flexDirection:'column', alignItems:'center', gap:18}}>
            <div className="boot-mat"></div>
            <div className="au-eyebrow" style={{color:'var(--steel-400)'}}>Warming up the pitch</div>
          </div>
        </div>
      </div>
    </PFb>
  );
}

/* ---------- B2 · ONBOARDING (multi-slide intro carousel) ---------- */
function Pager({ active, count=3 }){
  return (
    <div className="au-pager au-pager-light">
      {Array.from({length:count}).map((_,i)=> <i key={i} className={i===active?'on':''}></i>)}
    </div>
  );
}

/* One intro slide. `last` swaps the circular Next for the Get-started CTA.
   `image` renders a real 3D clay illustration floating on the bone surface
   instead of the marked placeholder. */
function OnbSlide({ step, icon, tag, caption, eyebrow, title, sub, image, last=false }){
  return (
    <PFb tint="dark">
      <div style={{position:'absolute', inset:0, background:BONE}}>
        <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', padding:'60px 26px 36px'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22}}>
            <img src="assets/mark_jet.png" width="30" alt="SQUAD"/>
            {!last && <span className="au-eyebrow" style={{color:'var(--steel-400)'}}>Skip</span>}
          </div>

          {image ? (
            <div className="onb-hero">
              <div className="onb-hero-sweep"></div>
              <div className="clay-ground"></div>
              <img className="clay-float" src={image} alt=""/>
            </div>
          ) : (
            <div className="onb-visual" style={{height:362}}>
              <div className="onb-art"></div>
              <div className="ob-ph-flag">Placeholder · generate later</div>
              <div className="onb-chip">{icon}</div>
              <div className="onb-center">
                <span className="frame"><ImageB/></span>
                <span className="cap">{caption}</span>
              </div>
              <div className="onb-tag"><span className="dot"></span>{tag}</div>
            </div>
          )}

          <div style={{padding:'24px 2px 0'}}>
            <div className="au-eyebrow" style={{color:'var(--terra-500)', marginBottom:12}}>{eyebrow}</div>
            <h1 style={{...titleStyle(), fontSize:30, lineHeight:1.08}}>{title}</h1>
            <p style={{margin:'12px 0 0', maxWidth:320, fontFamily:'var(--font-body)', fontSize:15,
              lineHeight:1.5, color:'var(--steel-500)'}}>{sub}</p>
          </div>

          <div style={{flex:1, minHeight:18}}></div>

          {last ? (
            <div style={{display:'flex', flexDirection:'column', gap:16}}>
              <Pager active={2}/>
              <button className="au-btn au-btn-primary is-clay">Get started <ArrowB/></button>
              <div className="au-foot au-foot-light">Already have an account? <a className="au-link">Log in</a></div>
            </div>
          ) : (
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <Pager active={step-1}/>
              <button className="au-next is-clay" aria-label="Next"><ArrowB/></button>
            </div>
          )}
        </div>
      </div>
    </PFb>
  );
}

function B_Onb1(){
  return <OnbSlide step={1} icon={<PinB/>} tag="Map view"
    image="assets/clay_map.png"
    eyebrow="01 · Discover"
    title={<span>Games on a <span style={{color:'var(--terra-500)'}}>map</span> near you</span>}
    sub="Browse open pickup games across Baku — see the time, format and skill level before you ever commit."/>;
}
function B_Onb2(){
  return <OnbSlide step={2} icon={<BoltB/>} tag="Game detail"
    caption="Game detail — roster, kickoff time and venue"
    eyebrow="02 · Join"
    title={<span>Claim your spot in <span style={{color:'var(--terra-500)'}}>one tap</span></span>}
    sub="Reserve a place, see who else is playing, and get a reminder so the game never falls apart."/>;
}
function B_Onb3(){
  return <OnbSlide step={3} last={true} icon={<UsersB/>} tag="Organizer"
    caption="Organizer view — locked roster and regulars"
    eyebrow="03 · Organize"
    title={<span>Run a squad that <span style={{color:'var(--terra-500)'}}>shows up</span></span>}
    sub="Create games, lock your roster, and keep your regulars coming back week after week."/>;
}

/* ---------- B · USE INTENT (optional chip multi-select) ---------- */
function Chip({ label, on=false }){
  return (
    <button className={'chip'+(on?' is-on':'')}>
      {on && <MIcon name="check" size={15} wght={700}/>}
      {label}
    </button>
  );
}
function ChipGroup({ label, children }){
  return (
    <div className="chip-group">
      <div className="chip-grouplabel">{label}</div>
      <div className="chip-wrap">{children}</div>
    </div>
  );
}

function B_Intent(){
  return (
    <PFb tint="dark">
      <div style={{position:'absolute', inset:0, background:BONE}}>
        <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', padding:'62px 24px 28px'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18}}>
            <button className="au-icon-btn au-icon-btn-light"><ChevB/></button>
            <button className="chip-skip">Skip</button>
          </div>

          <h1 style={{...titleStyle(), fontSize:29, marginBottom:5}}>
            How will you use <span style={{color:'var(--terra-500)'}}>SQUAD?</span>
          </h1>
          <p style={{margin:'0 0 20px', fontFamily:'var(--font-body)', fontSize:14, color:'var(--steel-500)'}}>
            Pick anything that fits — it just tailors your home. Optional.
          </p>

          <ChipGroup label="What you're here for">
            <Chip label="Organize games" on={true}/>
            <Chip label="Join pickup games" on={true}/>
            <Chip label="Find players for my games"/>
            <Chip label="Find a regular squad"/>
            <Chip label="Meet new people"/>
          </ChipGroup>

          <ChipGroup label="Your pace">
            <Chip label="Play weekly" on={true}/>
            <Chip label="Casual kickabouts"/>
            <Chip label="Competitive matches"/>
          </ChipGroup>

          <ChipGroup label="Sports">
            <Chip label="Soccer" on={true}/>
            <Chip label="Futsal"/>
            <Chip label="Basketball"/>
            <Chip label="Tennis"/>
            <Chip label="Padel"/>
          </ChipGroup>

          <div style={{flex:1, minHeight:10}}></div>

          <button className="role-vendor" style={{marginBottom:14}}>
            <span className="rv-ic"><StadiumB/></span>
            <span className="rv-txt">
              <span className="rv-name" style={{display:'block'}}>Own or run a venue?</span>
              <span className="rv-sub" style={{display:'block'}}>List pitches in the SQUAD Venues app</span>
            </span>
            <span className="rv-go"><LaunchB/></span>
          </button>

          <button className="au-btn au-btn-primary is-clay">Continue <ArrowB/></button>
        </div>
      </div>
    </PFb>
  );
}

/* ---------- B3 · SIGN UP ---------- */
function B_SignUp(){
  return (
    <PFb tint="dark">
      <div style={{position:'absolute', inset:0, background:BONE}}>
        <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', padding:'64px 26px 30px'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:26}}>
            <button className="au-icon-btn au-icon-btn-light"><ChevB/></button>
            <div className="au-pager au-pager-light"><i className="on"></i><i></i></div>
          </div>
          <h1 style={{...titleStyle(), marginBottom:6}}>Create your account</h1>
          <p style={{margin:'0 0 20px', fontFamily:'var(--font-body)', fontSize:15, color:'var(--steel-500)'}}>
            Join games in Baku in under a minute.
          </p>
          <MethodTabs active="email"/>
          <div style={{display:'flex', flexDirection:'column', gap:13}}>
            <FieldB variant="light" label="Full name" icon={<UserB/>} value="Tural Mammadov"/>
            <FieldB variant="light" label="Email" icon={<MailB/>} value="tural@" placeholder="you@email.com" focus={true}/>
            <FieldB variant="light" label="Password" icon={<LockB/>} value="••••••••" trailing={<EyeB/>}/>
          </div>
          <div style={{flex:1, minHeight:16}}></div>
          <button className="au-btn au-btn-primary is-clay" style={{marginBottom:16}}>Create account <ArrowB/></button>
          <div style={{marginBottom:16}}><DividerLight/></div>
          <div style={{marginBottom:18}}><SocialRowLight/></div>
          <div className="au-foot au-foot-light">Already have an account? <a className="au-link">Log in</a></div>
        </div>
      </div>
    </PFb>
  );
}

/* ---------- B3b · SIGN UP · PHONE ---------- */
function B_SignUpPhone(){
  return (
    <PFb tint="dark">
      <div style={{position:'absolute', inset:0, background:BONE}}>
        <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', padding:'64px 26px 30px'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:26}}>
            <button className="au-icon-btn au-icon-btn-light"><ChevB/></button>
            <div className="au-pager au-pager-light"><i className="on"></i><i></i></div>
          </div>
          <h1 style={{...titleStyle(), marginBottom:6}}>Create your account</h1>
          <p style={{margin:'0 0 20px', fontFamily:'var(--font-body)', fontSize:15, color:'var(--steel-500)'}}>
            Join games in Baku in under a minute.
          </p>
          <MethodTabs active="phone"/>
          <div style={{display:'flex', flexDirection:'column', gap:13}}>
            <FieldB variant="light" label="Full name" icon={<UserB/>} value="Tural Mammadov"/>
            <PhoneField value="50 123 45 67" focus={true}/>
          </div>
          <p style={{margin:'12px 2px 0', fontFamily:'var(--font-body)', fontSize:13, color:'var(--steel-400)'}}>
            We'll text a 6-digit code to confirm your number.
          </p>
          <div style={{flex:1, minHeight:16}}></div>
          <button className="au-btn au-btn-primary is-clay" style={{marginBottom:16}}>Send code <ArrowB/></button>
          <div style={{marginBottom:16}}><DividerLight/></div>
          <div style={{marginBottom:18}}><SocialRowLight/></div>
          <div className="au-foot au-foot-light">Already have an account? <a className="au-link">Log in</a></div>
        </div>
      </div>
    </PFb>
  );
}

/* ---------- B5 · PHONE SIGN-IN ---------- */
function PhoneField({ value, placeholder='50 123 45 67', focus=false }){
  const showValue = value && value.length;
  return (
    <div className="au-field-light">
      <label className="au-field-label">Phone number</label>
      <div className={'au-input-row'+(focus?' is-focus':'')}>
        <button className="au-phone-cc">+994 <MIcon name="expand_more" size={18} wght={500}/></button>
        <span className="au-input-fake">
          {showValue
            ? <span>{value}{focus && <span className="au-caret"></span>}</span>
            : <span className="au-placeholder">{placeholder}{focus && <span className="au-caret"></span>}</span>}
        </span>
      </div>
    </div>
  );
}

function B_Phone(){
  return (
    <PFb tint="dark">
      <div style={{position:'absolute', inset:0, background:BONE}}>
        <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', padding:'64px 26px 30px'}}>
          <button className="au-icon-btn au-icon-btn-light" style={{marginBottom:26}}><ChevB/></button>
          <h1 style={{...titleStyle(), marginBottom:6}}>Welcome back</h1>
          <p style={{margin:'0 0 22px', fontFamily:'var(--font-body)', fontSize:15, color:'var(--steel-500)'}}>
            Sign in with email or phone.
          </p>
          <MethodTabs active="phone"/>
          <PhoneField value="50 123 45 67" focus={true}/>
          <p style={{margin:'12px 2px 0', fontFamily:'var(--font-body)', fontSize:13, color:'var(--steel-400)'}}>
            We'll text you a 6-digit code. No password to remember.
          </p>
          <div style={{flex:1, minHeight:24}}></div>
          <button className="au-btn au-btn-primary is-clay" style={{marginBottom:16}}>Send code <ArrowB/></button>
          <div style={{marginBottom:16}}><DividerLight/></div>
          <div style={{marginBottom:18}}><SocialRowLight/></div>
          <div className="au-foot au-foot-light">New here? <a className="au-link">Create account</a></div>
        </div>
      </div>
    </PFb>
  );
}

/* ---------- B6 · VERIFY CODE (OTP) ---------- */
function OtpBoxes({ digits, focusIndex }){
  return (
    <div className="otp-row">
      {digits.map((d,i)=>(
        <div key={i} className={'otp-box'+(i===focusIndex?' is-focus':'')}>
          {d ? d : (i===focusIndex ? <span className="au-caret"></span> : '')}
        </div>
      ))}
    </div>
  );
}

function B_OTP(){
  return (
    <PFb tint="dark">
      <div style={{position:'absolute', inset:0, background:BONE}}>
        <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', padding:'64px 26px 30px'}}>
          <button className="au-icon-btn au-icon-btn-light" style={{marginBottom:26}}><ChevB/></button>
          <h1 style={{...titleStyle(), marginBottom:6}}>Enter the code</h1>
          <p style={{margin:'0 0 28px', fontFamily:'var(--font-body)', fontSize:15, color:'var(--steel-500)'}}>
            Sent to +994 50 123 45 67 · <a className="au-link">Edit</a>
          </p>
          <OtpBoxes digits={['5','2','9','','','']} focusIndex={3}/>
          <div className="au-resend" style={{marginTop:18}}>Resend code in 0:28</div>
          <div style={{flex:1, minHeight:24}}></div>
          <button className="au-btn au-btn-primary is-clay" style={{marginBottom:16}}>Verify <ArrowB/></button>
          <div className="au-foot au-foot-light">Didn't get a code? <a className="au-link">Resend</a></div>
        </div>
      </div>
    </PFb>
  );
}
function B_LogIn(){
  return (
    <PFb tint="dark">
      <div style={{position:'absolute', inset:0, background:BONE}}>
        <div style={{position:'absolute', inset:0, display:'flex', flexDirection:'column', padding:'64px 26px 30px'}}>
          <button className="au-icon-btn au-icon-btn-light" style={{marginBottom:26}}><ChevB/></button>
          <h1 style={{...titleStyle(), marginBottom:6}}>Welcome back</h1>
          <p style={{margin:'0 0 22px', fontFamily:'var(--font-body)', fontSize:15, color:'var(--steel-500)'}}>
            Sign in with email or phone.
          </p>
          <MethodTabs active="email"/>
          <div style={{display:'flex', flexDirection:'column', gap:15}}>
            <FieldB variant="light" label="Email" icon={<MailB/>} value="tural@email.com"/>
            <FieldB variant="light" label="Password" icon={<LockB/>} value="••••••••••" trailing={<EyeB/>} focus={true}/>
          </div>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:18}}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <span className="au-toggle on"><b></b></span>
              <span style={{fontFamily:'var(--font-body)', fontSize:13, color:'var(--steel-500)'}}>Stay signed in</span>
            </div>
            <a className="au-link" style={{fontSize:13}}>Forgot?</a>
          </div>
          <div style={{flex:1, minHeight:24}}></div>
          <button className="au-btn au-btn-primary is-clay" style={{marginBottom:16}}>Log in <ArrowB/></button>
          <div style={{marginBottom:16}}><DividerLight/></div>
          <div style={{marginBottom:18}}><SocialRowLight/></div>
          <div className="au-foot au-foot-light">New here? <a className="au-link">Create account</a></div>
        </div>
      </div>
    </PFb>
  );
}

Object.assign(window, { B_Boot, B_Onb1, B_Onb2, B_Onb3, B_Intent, B_SignUp, B_SignUpPhone, B_LogIn, B_Phone, B_OTP });
