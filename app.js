/* SAS Basketball v0.4.5.1 | Hotfix: initialize upload file index for game and assignment media. */
(() => {
  'use strict';
  const ROOT = document.getElementById('app');
  const config = window.SAS_CONFIG || {};
  const LIVE = Boolean(config.supabaseUrl && config.supabasePublishableKey);
  const DEMO_KEY = 'sas-basketball-demo-v1';
  const LOGO = 'public/assets/sas-eagle-red.png';
  const SCHOOL = 'public/assets/sas-horizontal-mark.png';
  const COMPETENCIES = ['Animal Press (2-2-1)','Man-to-Man Containment','Defensive Rebounding','Transition Offense','Transition Defense','Communication','Ball Pressure','Trapping & Rotations','Passing Accuracy','Decision-Making','Offensive Spacing','Attacking Closeouts','Finishing Through Contact','Shot Selection','DHO Defense','Ball Security','Pick-and-Roll Reads','Backdoor Prevention','Film Study'].sort((a,b)=>a.localeCompare(b,'en',{sensitivity:'base'}));
  // Shanghai school-time slots. Stored as local TIME columns, not UTC timestamps.
  const PRACTICE_TIME_SLOTS = [
    {value:'15:00-17:00', label:'3:00–5:00 PM'},
    {value:'16:30-18:00', label:'4:30–6:00 PM'}
  ];
  const PRACTICE_GYMS = [
    {value:'HS Gym', label:'High School Gym'},
    {value:'ES Gym', label:'Elementary School Gym'},
    {value:'MS Gym', label:'Middle School Gym'}
  ];
  function practiceSlot(p){
    const start=String(p?.start_time||'').slice(0,5);
    const end=String(p?.end_time||'').slice(0,5);
    return start&&end?`${start}-${end}`:'';
  }
  function clockText(value){
    const m=/^(\d{2}):(\d{2})$/.exec(value);
    if(!m)return value;
    const hr=Number(m[1]),ampm=hr>=12?'PM':'AM';
    return `${hr%12||12}:${m[2]} ${ampm}`;
  }
  function practiceTimeLabel(p){
    const slot=practiceSlot(p);
    if(!slot)return 'Time not set';
    return PRACTICE_TIME_SLOTS.find(x=>x.value===slot)?.label || `${clockText(slot.slice(0,5))}–${clockText(slot.slice(6))}`;
  }
  function practiceGymLabel(p){
    const stored=String(p?.location||'').trim();
    return PRACTICE_GYMS.find(x=>x.value===stored)?.label || stored || 'Gym not set';
  }
  const NAV = { coach:[['dashboard','Home','⌂'],['practices','Practices','▣'],['games','Game Center','▥'],['drills','Drills','⬡'],['challenges','Challenges','◉'],['development','Development','◎'],['resources','Resources','▤'],['settings','More','•••']], observer:[['dashboard','Home','⌂'],['practices','Practices','▣'],['drills','Drills','⬡'],['challenges','Challenges','◉'],['games','Games','▥'],['resources','Resources','▤']], player:[['dashboard','Home','⌂'],['schedule','Schedule','▣'],['games','Games','▥'],['resources','Resources','▤'],['assignments','Assignments','☑'],['goals','My Goals','◎'],['reflections','Reflect','✎'],['challenges','Challenges','◉'],['account','Account','⚙']] };
  const today = () => {const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
  const dayOffset = n => {const d=new Date();d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
  const fullDate = x => {if(!x)return 'Date not set';return new Date(x+'T12:00:00').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'})};
  const shortDate = x => {if(!x)return '—';return new Date(x+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric'})};
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attr = esc;
  const id = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'd-'+Math.random().toString(36).slice(2)+Date.now();
  const initials = n => (n || 'SAS').trim().split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase();
  const fmt = n => Math.round(Number(n)||0);
  // No personal email is collected for players. Six-digit PINs map to internal aliases.
  const playerCredentials = pin => ({email:`sas-basketball-${pin}@example.com`,password:`${pin}SAS!2026`});
  let supabase = null;
  let toastTimer = null;
  const state = {resourceSection:'essentials',resourceCategory:'All',role:null,profile:null,page:'dashboard',mode:LIVE?'live':'demo',authScreen:'entry',desiredRole:'player',loading:LIVE,loadError:'',busy:false,modal:null,draftActivities:[],editing:null,filter:'All',search:'',data:null,teamView:'varsity',staffInviteResult:null,challengePracticeSelection:null,viewingPracticeId:null,draftDrillFiles:{}};
  const demoSeed = () => {
    const players = [
      {id:'player-one',display_name:'Sample Player A',roster_name:'Sample Player A',team_id:'varsity',role:'player'},
      {id:'player-two',display_name:'Sample Player B',roster_name:'Sample Player B',team_id:'jv',role:'player'}
    ];
    return {
      profiles:players,
      practices:[
        {id:'practice-one',practice_date:dayOffset(1),title:'Defensive Identity + Transition',location:'HS Gym',start_time:'15:00',end_time:'17:00',primary_priorities:['Animal Press (2-2-1)','Defensive Rebounding','Transition Offense'],peripheral_priorities:['Communication','Passing Accuracy'],activities:[{drill_id:'drill-one',name:'2v2 Advantage Recovery',completed:false},{drill_id:'drill-two',name:'4v4 Stop + Secure',completed:false}],live_application:'5v5: stops only count after a secured rebound. Live turnovers flow into transition.',layups_result:null,status:'planned',published:true},
        {id:'practice-two',practice_date:dayOffset(-2),title:'Decision-Making Under Pressure',location:'HS Gym',start_time:'16:30',end_time:'18:00',primary_priorities:['Ball Security','Offensive Spacing','Transition Defense'],peripheral_priorities:['Communication','Shot Selection'],activities:[{drill_id:'drill-three',name:'3v2 + 1 Continuous',completed:true},{drill_id:'drill-one',name:'2v2 Advantage Recovery',completed:true}],live_application:'5v5 transition with early decisions and defensive recovery.',layups_result:78,status:'completed',published:true},
        {id:'practice-three',practice_date:dayOffset(-5),title:'Pressure and Rebounding',location:'HS Gym',start_time:'15:00',end_time:'17:00',primary_priorities:['Animal Press (2-2-1)','Defensive Rebounding','Communication'],peripheral_priorities:['Ball Pressure','Transition Offense'],activities:[],live_application:'Full-court pressure into live 5v5.',layups_result:65,status:'completed',published:true}
      ],
      practice_notes:[{practice_id:'practice-two',notes:'Sample private coach observation. Players cannot access this section.',next_focus:'Improve transition communication.'}],
      drills:[
        {id:'drill-one',name:'2v2 Advantage Recovery',competency:'Man-to-Man Containment',situation:'Help and recovery after an offensive advantage',description:'Two defenders must communicate, contain penetration, and recover without conceding a direct finish.',coaching_cues:'Contain the ball. See both players. Communicate the rotation.',status:'Tested',published:true,created_by:'coach-demo'},
        {id:'drill-two',name:'4v4 Stop + Secure',competency:'Defensive Rebounding',situation:'Finishing a defensive possession',description:'Defenders earn a point only when a defensive stop ends with a controlled rebound.',coaching_cues:'Track flight. Locate opponent. Secure the ball with two hands.',status:'Proven',published:true,created_by:'coach-demo'},
        {id:'drill-three',name:'3v2 + 1 Continuous',competency:'Transition Offense',situation:'Numbers advantage before defense recovers',description:'Attack the temporary advantage and make early pass, drive, or shot decisions.',coaching_cues:'Wide lanes. Rim pressure. Make the next read quickly.',status:'Proven',published:true,created_by:'coach-demo'}
      ],
      assignments:[
        {id:'assignment-one',title:'Recognizing a Defensive Advantage',description:'Review our spacing principles. Write one read you can make when the defense overhelps.',due_date:dayOffset(3),published:true},
        {id:'assignment-two',title:'Rebounding Reflection',description:'Describe one way to track the ball and maintain contact with your matchup.',due_date:dayOffset(5),published:true}
      ],
      assignment_responses:[],
      goals:[{id:'goal-one',player_id:'player-one',title:'Finish stronger through contact',target:'Use a two-foot finish when appropriate in traffic.',status:'In progress',created_at:new Date().toISOString()}],
      reflections:[{id:'reflection-one',player_id:'player-one',prompt:'What did you recognize faster this week?',response:'I recognized when to get wide in transition.',created_at:new Date().toISOString()}],
      challenges:[{id:'challenge-demo',name:'100 Layups Challenge',description:'Team finishing benchmark in 10 minutes',team_scope:'varsity',participant_type:'team',recurrence:'every_practice',assignment_mode:'all',metric_unit:'makes',target_value:100,time_limit_minutes:10,active:true,published:true}],
      practice_challenges:[],challenge_assignees:[],challenge_results:[],coaching_notes:[],resources:[],resource_reviews:[],training_plans:[],training_sessions:[],training_evidence:[],feedback_requests:[],feedback_messages:[],games:[],game_player_stats:[],drill_attachments:[],game_media:[],assignment_media:[],tournaments:[]
    };
  };
  function loadDemo(){try{const d=JSON.parse(localStorage.getItem(DEMO_KEY)||'null');return d && d.practices && d.drills ? d : demoSeed()}catch{return demoSeed()}}
  function persistDemo(){if(!LIVE){try{localStorage.setItem(DEMO_KEY,JSON.stringify(state.data))}catch{/* Some sandbox/private browser contexts prohibit storage; this session remains usable. */}}}
  async function coachAdminRequest(body){
    const {data:{session}}=await supabase.auth.getSession();if(!session)throw Error('Your coaching session has expired.');
    const endpoint=config.supabaseUrl.replace(/\/$/,'')+'/functions/v1/basketball-player-admin';
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token,'apikey':config.supabasePublishableKey},body:JSON.stringify(body)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Could not manage player access.');return result;
  }
  function userId(){return state.profile?.id || 'player-one'}
  function isCoach(){return state.role==='coach'}
  // UI convenience only. The Edge Function independently validates the head coach's verified Auth email.
  function isHeadCoach(){return isCoach() && state.profile?.display_name==='Coach Stanley'}
  function isStaff(){return state.role==='coach'||state.role==='observer'}
  function teamName(t){return t==='jv'?'JV':t==='varsity'?'Varsity':'Both Teams'}
  function isTeamChallenge(c){return (c.participant_type||'team')==='team'}
  function matchesChallenge(c,p){return !!c&&!!p&&(c.team_scope==='both'||c.team_scope===(p.team_scope||'varsity'))}
  function recurringForPractice(p){return records('challenges').filter(c=>c.active&&isTeamChallenge(c)&&c.recurrence==='every_practice'&&matchesChallenge(c,p))}
  function challengePracticeRow(c,p){return records('practice_challenges').find(r=>r.challenge_id===c.id&&r.practice_id===p.id)}
  function practiceForResult(r){return records('practices').find(p=>p.id===r.practice_id)}
  function practiceChallengeResults(c){return records('practice_challenges').filter(r=>r.challenge_id===c.id&&!!practiceForResult(r)).sort((a,b)=>String(practiceForResult(b)?.practice_date).localeCompare(String(practiceForResult(a)?.practice_date)))}
  function challengeAllowsPlayer(c){return isTeamChallenge(c)||c.assignment_mode!=='selected'||records('challenge_assignees').some(a=>a.challenge_id===c.id&&a.player_id===userId())}
  function practicesForChallenge(c){return records('practices').filter(p=>matchesChallenge(c,p)&&(isStaff()||p.published)).sort((a,b)=>b.practice_date.localeCompare(a.practice_date))}
  function numberFormat(v){return v===null||v===undefined?'—':Number(v).toLocaleString(undefined,{maximumFractionDigits:2})}
  function benchmarkStatus(r){return r?.status||'pending'}
  function benchmarkSummary(c){const done=practiceChallengeResults(c).filter(r=>r.status==='completed');if(!done.length)return 'No practice results recorded';const r=done[0],p=practiceForResult(r);return `Latest: ${numberFormat(r.result_value)} / ${numberFormat(r.target_snapshot)} ${esc(r.metric_unit_snapshot)} · ${esc(shortDate(p?.practice_date))}`}
  function benchmarkBar(r){const target=Number(r.target_snapshot)||0;const width=target>0?Math.min(100,Number(r.result_value)/target*100):0;return `<div class="progress" style="margin:9px 0"><div style="width:${width}%"></div></div>`}
  function challengeStatusLine(c,p){const r=challengePracticeRow(c,p);return `<div class="note-row"><div class="row between"><strong>${esc(c.name)}</strong>${pill(benchmarkStatus(r))}</div><p class="subtle">${r?.status==='completed'?`${numberFormat(r.result_value)} / ${numberFormat(r.target_snapshot)} ${esc(r.metric_unit_snapshot)}`:r?.status==='skipped'?'Not attempted this practice':`Target: ${numberFormat(r?.target_snapshot??c.target_value)} ${esc(c.metric_unit)}`}</p>${r?.status==='completed'?benchmarkBar(r):''}${r?.notes&&r.status!=='pending'?`<p class="subtle"><b>Coach observations:</b> ${esc(r.notes)}</p>`:''}${r?.next_focus&&r.status!=='pending'?`<p class="subtle"><b>Next practice emphasis:</b> ${esc(r.next_focus)}</p>`:''}${isCoach()?`<button class="btn ghost slim" type="button" data-action="recordTeamPractice" data-challenge="${attr(c.id)}" data-practice="${attr(p.id)}">${r?.status==='completed'?'Edit result':'Record result'} →</button>`:''}</div>`}
  function practiceBenchmarkSection(p){const challenges=recurringForPractice(p);return challenges.length?`<div class="card"><div class="section-heading">Recurring team challenges</div><p class="subtle">Benchmarks attach automatically to this practice. Completed results and coaching observations are shared with players when the practice and challenge are published.</p>${challenges.map(c=>challengeStatusLine(c,p)).join('')}</div>`:''}
  function challengeTrend(c){const done=practiceChallengeResults(c).filter(r=>r.status==='completed').reverse().slice(-12);if(done.length<2)return '';const nums=done.map(r=>Number(r.result_value));const max=Math.max(...nums,...done.map(r=>Number(r.target_snapshot)||0),1);const pts=nums.map((v,i)=>`${24+(i*432)/(nums.length-1)},${111-(v/max)*89}`).join(' ');return `<div class="v041-trend"><div class="section-label">PERFORMANCE TREND (${done.length} PRACTICES)</div><svg viewBox="0 0 480 135" role="img" aria-label="Team score trend across practices" preserveAspectRatio="xMidYMid meet"><line x1="24" y1="111" x2="456" y2="111" stroke="#d8dbe0"/><line x1="24" y1="22" x2="456" y2="22" stroke="#e6e7eb" stroke-dasharray="4 5"/><polyline points="${pts}" stroke="#ce2028" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>${nums.map((v,i)=>`<circle cx="${24+(i*432)/(nums.length-1)}" cy="${111-(v/max)*89}" r="4" fill="#ce2028"><title>${esc(shortDate(practiceForResult(done[i])?.practice_date))}: ${numberFormat(v)}</title></circle>`).join('')}</svg><div class="row between"><small>${esc(shortDate(practiceForResult(done[0])?.practice_date))}</small><small>${esc(shortDate(practiceForResult(done.at(-1))?.practice_date))}</small></div></div>`}
  function playerChallengePanel(){const cs=teamFilter(records('challenges')).filter(c=>c.published&&c.active&&isTeamChallenge(c));return cs.length?`<div class="card"><div class="row between"><div class="section-heading">Our team benchmarks</div><button class="btn ghost slim" data-action="go" data-page="challenges">View history →</button></div>${cs.map(c=>`<div class="note-row"><b>${esc(c.name)}</b><p class="subtle">${benchmarkSummary(c)}</p></div>`).join('')}</div>`:''}

  function scopeVisible(x){if(!x)return true;const current=isStaff()?state.teamView:(state.profile?.team_id||'varsity');return current==='both'||x.team_scope==='both'||x.team_scope===current}
  function teamFilter(rows){return rows.filter(scopeVisible)}
  function playerFilter(rows){return rows.filter(p=>p.role==='player'&&(state.teamView==='both'||p.team_id===state.teamView))}
  function teamChooser(selected='varsity',allowBoth=false){return `<select name="team_scope">${(allowBoth?['varsity','jv','both']:['varsity','jv']).map(x=>`<option value="${x}" ${x===selected?'selected':''}>${esc(teamName(x))}</option>`).join('')}</select>`}
  function teamSwitcher(){return `<div class="v04-switcher"><span class="eyebrow">TEAM WORKSPACE</span><div class="v04-buttons">${['varsity','jv','both'].map(t=>`<button class="btn ${state.teamView===t?'redbtn':'lightbtn'} slim" data-action="teamSwitch" data-team="${t}">${esc(teamName(t))}</button>`).join('')}</div></div>`}
  function canEdit(){return isCoach()}
  function records(t){return state.data?.[t] || []}
  function mine(t){return records(t).filter(x=>x.player_id===userId())}
  function visiblePractices(){return records('practices').filter(x=>!x.archived&&scopeVisible(x)&&(isStaff() || x.published)).sort((a,b)=>b.practice_date.localeCompare(a.practice_date))}
  function visibleDrills(){return records('drills').filter(x=>x.in_library!==false&&scopeVisible(x)&&(isStaff() || x.published))}
  function visibleAssignments(){return records('assignments').filter(x=>scopeVisible(x)&&(isStaff() || x.published))}
  function playerName(x){return records('profiles').find(p=>p.id===x)?.display_name || (x===userId()?state.profile?.display_name:'Player') || 'Player'}
  function syncDemoPracticeChallenges(){if(LIVE||!state.data)return;for(const c of records('challenges'))if(c.active&&isTeamChallenge(c)&&c.recurrence==='every_practice')for(const p of records('practices'))if(matchesChallenge(c,p)&&!challengePracticeRow(c,p))state.data.practice_challenges.push({id:id(),challenge_id:c.id,practice_id:p.id,status:'pending',result_value:null,target_snapshot:c.target_value,metric_unit_snapshot:c.metric_unit,time_limit_snapshot:c.time_limit_minutes,notes:'',next_focus:''})}
  async function persistTeamResult(c,p,f){
    const status=['pending','completed','skipped'].includes(f.status)?f.status:'pending';
    const value=status==='completed'?Number(f.result_value):null;
    if(status==='completed'&&(String(f.result_value||'').trim()===''||!Number.isFinite(value)||value<0))throw Error('Enter a nonnegative score for a completed challenge.');
    const old=challengePracticeRow(c,p);
    const row={status,result_value:value,notes:String(f.notes||''),next_focus:String(f.next_focus||''),recorded_by:userId(),updated_at:new Date().toISOString()};
    if(old){await saveRow('practice_challenges',{...row,id:old.id},'update')}
    else{await saveRow('practice_challenges',{...row,challenge_id:c.id,practice_id:p.id,target_snapshot:c.target_value,metric_unit_snapshot:c.metric_unit,time_limit_snapshot:c.time_limit_minutes})}
    if(!LIVE){const re=records('practice_challenges').find(x=>x.challenge_id===c.id&&x.practice_id===p.id);if(re)Object.assign(re,row)}
  }

  // Drill diagrams and teaching files belong to their drill, not the general resources list.
  // Files are stored in a private Storage bucket with RLS matching drill publication/team.
  const DRILL_BUCKET = 'sas-basketball-drills';
  const DRILL_MAX_FILE_SIZE = 20 * 1024 * 1024;
  const DRILL_FILE_TYPES = {
    pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',
    doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt:'text/plain'
  };
  function attachmentsForDrill(drillId){
    return records('drill_attachments').filter(a=>a.drill_id===drillId)
      .sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')));
  }
  function drillFileInput(name='drill_files'){
    return `<div class="field"><label>Setup diagrams, images or teaching documents (optional)</label>`+
      `<input type="file" name="${attr(name)}" multiple accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.ppt,.pptx,.txt"/>`+
      `<p class="subtle">Select up to 6 files at a time, 20 MB each. Photos and court diagrams appear inside drill details; documents open separately. Files follow the drill's team and player visibility.</p></div>`;
  }
  function validateDrillFiles(files){
    if(files.length>6)throw Error('Select no more than six drill files at a time.');
    for(const f of files){
      const ext=f.name.split('.').pop().toLowerCase();
      if(!DRILL_FILE_TYPES[ext])throw Error('Unsupported drill file: '+f.name);
      if(f.size<1||f.size>DRILL_MAX_FILE_SIZE)throw Error('Drill files must be 1 byte to 20 MB: '+f.name);
    }
  }
  async function uploadDrillFiles(drillId,files){
    if(!files.length)return 0;
    if(!LIVE)throw Error('File uploads require the live app.');
    validateDrillFiles(files);
    let completed=0;
    let fileIndex=0;
    for(const file of files){
      const ext=file.name.split('.').pop().toLowerCase();
      const safeName=file.name.replace(/[^A-Za-z0-9._-]/g,'_').slice(-95);
      const path=`${drillId}/${id()}-${safeName}`;
      const {error:uploadError}=await supabase.storage.from(DRILL_BUCKET)
        .upload(path,file,{contentType:DRILL_FILE_TYPES[ext],upsert:false});
      if(uploadError)throw Error('Could not upload '+file.name+': '+uploadError.message);
      try {
        await saveRow('drill_attachments',{
          drill_id:drillId,storage_path:path,file_name:file.name,
          mime_type:DRILL_FILE_TYPES[ext],file_size:file.size,uploaded_by:userId()
        });
      }catch(error){
        await supabase.storage.from(DRILL_BUCKET).remove([path]);
        throw Error('Could not link '+file.name+' to the drill: '+(error.message||error));
      }
      completed++;
    }
    return completed;
  }
  function drillAttachmentView(d){
    const files=attachmentsForDrill(d.id);
    const images=files.filter(a=>String(a.mime_type||'').startsWith('image/'));
    return `<div class="drill-attachments"><div class="row between" style="flex-wrap:wrap">`+
      `<div class="section-label">SETUP DIAGRAMS &amp; FILES (${files.length})</div>`+
      `${isCoach()?`<button class="btn ghost slim" data-action="addDrillFiles" data-id="${attr(d.id)}">+ Add files</button>`:''}</div>`+
      `${images.length?`<div class="drill-image-grid">${images.map(a=>`<div class="drill-image-tile">`+
        `<img class="drill-preview" data-drill-preview="${attr(a.id)}" alt="${attr(a.file_name)}" hidden/>`+
        `<div class="subtle drill-preview-loading">Opening preview…</div>`+
        `<button type="button" class="btn ghost slim" data-action="openDrillFile" data-id="${attr(a.id)}">${esc(a.file_name)}</button>`+
        `</div>`).join('')}</div>`:''}`+
      `${files.length?`<div class="drill-file-list">${files.map(a=>`<div class="drill-file-row">`+
        `<div class="drill-file-icon">${String(a.mime_type||'').startsWith('image/')?'▧':'▤'}</div>`+
        `<div class="drill-file-label"><b>${esc(a.file_name)}</b><small>${(Number(a.file_size||0)/1024/1024).toFixed(2)} MB</small></div>`+
        `<button type="button" class="btn ghost slim" data-action="openDrillFile" data-id="${attr(a.id)}">Open</button>`+
        `${isCoach()?`<button type="button" class="btn dangerbtn slim" data-action="removeDrillFile" data-id="${attr(a.id)}">Remove</button>`:''}`+
        `</div>`).join('')}</div>`:'<p class="subtle">No setup diagrams or supporting files uploaded yet.</p>'}</div>`;
  }
  async function loadDrillPreviews(){
    if(!LIVE||!supabase)return;
    const images=[...ROOT.querySelectorAll('img[data-drill-preview]')];
    await Promise.all(images.map(async node=>{
      const a=records('drill_attachments').find(x=>x.id===node.dataset.drillPreview);
      if(!a)return;
      const {data,error}=await supabase.storage.from(DRILL_BUCKET).createSignedUrl(a.storage_path,300);
      if(error||!data?.signedUrl){const placeholder=node.parentElement?.querySelector('.drill-preview-loading');if(placeholder)placeholder.textContent='Preview unavailable. Ask a coach to check this attachment.';return}if(!node.isConnected)return;
      node.onerror=()=>{node.hidden=true;const placeholder=node.parentElement?.querySelector('.drill-preview-loading');if(placeholder){placeholder.hidden=false;placeholder.textContent='Image file unavailable. Coach: check the storage path and upload.'}};node.src=data.signedUrl;node.hidden=false;
      const placeholder=node.parentElement?.querySelector('.drill-preview-loading');
      if(placeholder)placeholder.hidden=true;
    }));
  }

  async function initialize(){
    if(!LIVE){state.loading=false;state.data=loadDemo();for(const table of ['practices','drills','assignments'])for(const row of records(table))row.team_scope||='varsity';syncDemoPracticeChallenges();render();return}
    try{
      const mod=await import('https://esm.sh/@supabase/supabase-js@2');
      supabase=mod.createClient(config.supabaseUrl,config.supabasePublishableKey,{db:{schema:'sas_basketball'}});
      const {data:{session},error}=await supabase.auth.getSession(); if(error)throw error;
      if(session)await loadUser(session.user.id); else{state.loading=false;render()}
      supabase.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){state.profile=null;state.role=null;state.authScreen='entry';state.loading=false;render()}});
    }catch(error){state.loading=false;state.loadError=error.message||String(error);render()}
  }
  async function loadUser(uid){
    state.loading=true;render();
    const {data:profile,error}=await supabase.from('profiles').select('id,display_name,role,team_id,roster_name').eq('id',uid).single();
    if(error || !profile || !['coach','player','observer'].includes(profile.role)){await supabase.auth.signOut();state.profile=null;state.role=null;state.loading=false;state.loadError='This account is not on the authorized team roster. Ask the administrator to provision it.';render();return}
    state.profile=profile;state.role=profile.role;state.page='dashboard';state.loadError='';if(profile.role==='player'&&profile.display_name==='New Player')state.authScreen='nickname';await refreshLive();
  }
  async function refreshLive(){
    try{
      const tables=['profiles','practices','practice_notes','drills','assignments','assignment_responses','goals','reflections','challenges','challenge_results','practice_challenges','challenge_assignees','coaching_notes','resources','drill_attachments','resource_reviews','training_plans','training_sessions','training_evidence','feedback_requests','feedback_messages','games','game_player_stats','game_media','assignment_media','tournaments'];
      const loaded=await Promise.all(tables.map(table=>supabase.from(table).select('*')));
      loaded.forEach((r,i)=>{if(r.error)throw Error(tables[i]+': '+r.error.message)});
      state.data=Object.fromEntries(tables.map((t,i)=>[t,loaded[i].data||[]]));
      state.loading=false;render();
    }catch(error){state.loading=false;state.loadError='Cannot load team data: '+error.message;render()}
  }
  async function saveRow(table,row,kind='insert',match='id'){
    if(!LIVE){
      const arr=records(table);
      if(kind==='delete'){state.data[table]=arr.filter(x=>x[match]!==row[match]);persistDemo();return}
      if(kind==='update'){const found=arr.findIndex(x=>x[match]===row[match]);if(found>=0)arr[found]={...arr[found],...row};else arr.push({...row});persistDemo();return}
      arr.unshift({...row,id:row.id||id()});persistDemo();return
    }
    let q;
    if(kind==='update'){const {[match]:key,...values}=row;q=supabase.from(table).update(values).eq(match,key)}
    else if(kind==='delete')q=supabase.from(table).delete().eq(match,row[match]);
    else q=supabase.from(table).insert(row);
    const {error}=await q;if(error)throw error;
  }
  async function perform(fn,message='Saved successfully'){
    if(state.busy)return;
    try{state.busy=true;await fn();if(LIVE)await refreshLive();else render();notice(message)}
    catch(error){notice('Could not save: '+(error.message||error),true)}finally{state.busy=false}
  }
  function notice(message,err=false){const existing=document.querySelector('.toast');if(existing)existing.remove();const t=document.createElement('div');t.className='toast';t.textContent=message;if(err)t.style.background='#8f1b21';document.body.appendChild(t);if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.remove(),4500)}
  function openModal(type,obj=null){state.modal={type,obj};render()}
  function closeModal(){state.modal=null;render()}
  function go(page){state.modal=null;state.page=page;state.search='';state.filter='All';render();window.scrollTo({top:0,behavior:'instant'})}
  function title(text,desc='',action=''){return `<div class="pagehead"><div><div class="eyebrow">SAS PUXI · 2026–27 SEASON</div><h1>${esc(text)}</h1>${desc?`<p>${esc(desc)}</p>`:''}</div>${action}</div>`}
  function pill(status){const variant=status==='Proven'||status==='Completed'||status==='completed'||status==='Done'?'greenpill':status==='In progress'||status==='Tested'?'redpill':'';return `<span class="pill ${variant}">${esc(status)}</span>`}
  function dateBox(d){const parts=(d||today()).split('-');let date=new Date((d||today())+'T12:00:00');return `<div class="datebox"><small>${date.toLocaleDateString(undefined,{month:'short'}).toUpperCase()}</small><big>${esc(Number(parts[2]))}</big></div>`}
  function navButton([page,label,icon]){return `<button class="side-button ${state.page===page?'active':''}" data-action="go" data-page="${page}"><span class="ico">${icon}</span><span>${label}</span></button>`}
  function mobileNavButton([page,label,icon]){return `<button class="${state.page===page?'active':''}" data-action="go" data-page="${page}"><span class="ico">${icon}</span><span>${label}</span></button>`}
  function shell(){const nav=NAV[state.role];const page=state.page;const labels={practiceView:'PRACTICE PLAN',practiceEditor:'EDIT PRACTICE',dashboard:isStaff()?'COACHES’ HUB':'PLAYERS’ HUB',practices:'PRACTICE PLANNER',drills:'DRILL LIBRARY',development:'PLAYER DEVELOPMENT',settings:'SETTINGS',goals:'MY GOALS',assignments:'ASSIGNMENTS',reflections:'REFLECTIONS',resources:'RESOURCE LIBRARY',games:'GAME CENTER',challenges:'CHALLENGES',notebook:'COACHING NOTEBOOK',schedule:'PRACTICE SCHEDULE',account:'PLAYER ACCOUNT'};
    return `<div class="shell"><aside class="sidebar"><div class="side-brand"><img src="${LOGO}" alt="SAS eagle emblem"/><div><strong>SAS<br/>BASKETBALL</strong><small>PUXI EAGLES</small></div></div><div class="side-group">YOUR WORKSPACE</div>${nav.map(navButton).join('')}<div class="side-foot"><div class="profile-badge"><span class="avatar">${esc(initials(state.profile?.display_name))}</span><div class="profile-info"><strong>${esc(state.profile?.display_name)}</strong><small>${isCoach()?'Coaching Staff':state.role==='observer'?'Program Reviewer':`${teamName(state.profile?.team_id)} Player`}</small></div></div>${isStaff()?`<button class="side-signout" data-action="changePassword">Change password</button>`:''}<button class="side-signout" data-action="signOut">${LIVE?'Sign out':'Return to demo entrance'}</button></div></aside><section class="main"><header class="topbar"><div class="mobilebar"><img src="${LOGO}" alt=""/><strong>SAS BASKETBALL</strong></div><span class="top-title">${esc(labels[page]||'SAS BASKETBALL')}</span><div class="top-right">${!LIVE?`<span class="pill redpill">DEMO DATA</span>`:''}<span class="role">${isCoach()?'Coach access':state.role==='observer'?'Reviewer access':'Player access'}</span><img src="${LOGO}" alt="SAS eagle"/></div></header><main class="content">${isStaff()?teamSwitcher():''}${mainContent()}</main></section><nav class="mobile-nav" aria-label="Main navigation">${nav.map(mobileNavButton).join('')}</nav></div>${state.modal?modal():''}`;
  }
  function entry(){return `<div class="entry"><div class="entry-inner"><section class="entry-brand"><img class="eagle" src="${LOGO}" alt="SAS eagle logo"/><div class="schoolname">SHANGHAI AMERICAN SCHOOL · PUXI</div><div class="massive">SAS <span>HOOPS.</span></div><p class="strap">PLAY HARD. PLAY SMART. PLAY TOGETHER.</p><p class="substrap">One team. One standard. One platform for everything we teach, practice, and develop.</p></section><section class="entry-panel">${!LIVE?`<div class="demo-ribbon" style="color:#9f2026;border-color:#e5b9bb;background:#fff2f2">INTERACTIVE PROTOTYPE · SAMPLE DATA</div>`:''}${state.authScreen==='login'?signInForm():`<div class="eyebrow">WELCOME TO THE PROGRAM</div><h2 class="panel-title" style="margin:8px 0 4px">Choose your workspace.</h2><p class="subtle">${LIVE?'Players: personal PIN. Coaches: authorized account.':'Explore either view with fictional sample records.'}</p><button class="entry-link" data-action="enter" data-role="player"><span class="entry-icon">♙</span><span class="spacer"><div class="entry-title">PLAYERS’ HUB</div><div class="entry-desc">My goals · Assignments · Reflections · Resources</div></span><span>→</span></button><button class="entry-link coach" data-action="enter" data-role="coach"><span class="entry-icon">▣</span><span class="spacer"><div class="entry-title">COACHES’ HUB</div><div class="entry-desc">Practice planning · Drills · Team development</div></span><span>→</span></button><div class="entry-footer">${LIVE?'Access is restricted to approved SAS Basketball accounts.':'Demo mode stores sample changes only in this browser. Do not enter real student information.'}</div>`}${state.loadError?`<div class="error" style="margin-top:13px">${esc(state.loadError)}</div>`:''}</section></div></div>`}
  function signInForm(){
    const player=state.desiredRole==='player';
    return `<button class="btn lightbtn slim" data-action="backEntry" style="margin-bottom:15px">← Back</button><div class="eyebrow">${player?'YOUR INDIVIDUAL ACCESS':'COACHING STAFF ACCESS'}</div><h2 class="panel-title" style="margin:9px 0 15px">${player?'Enter your team PIN':'Coach sign in'}</h2><form class="signin" data-form="${player?'pinSignin':'signin'}">${player?`<div class="field"><label>Six-digit player PIN</label><input name="pin" type="password" inputmode="numeric" pattern="[0-9]{6}" minlength="6" maxlength="6" autocomplete="off" required placeholder="••••••" aria-label="Six digit player PIN"/></div><p class="subtle">Enter the six-digit code given to you by your coach. No email or registration required.</p>`:`<div class="field"><label>Coach email address</label><input required type="email" name="email" autocomplete="username" placeholder="name@school.org"/></div><div class="field"><label>Password</label><input required type="password" name="password" autocomplete="current-password"/></div>`}<button class="btn redbtn wide" type="submit">${player?'Open my Players’ Hub':'Sign in to Coaches’ Hub'} →</button></form>`
  }
  function mainContent(){if(state.page==='practiceView')return practiceViewer();if(state.page==='practiceEditor'&&isCoach())return practiceEditor(state.editing);if(isCoach())return ({dashboard:coachHome,practices:practicePage,drills:drillPage,development:coachDevelopment,challenges:challengesPage,resources:resourceLibrary,games:gameCenter,notebook:notebookPage,settings:settingsPage}[state.page]||coachHome)();if(state.role==='observer')return ({dashboard:reviewerHome,practices:reviewerPractices,drills:drillPage,challenges:challengesPage,resources:resourceLibrary,games:gameCenter}[state.page]||reviewerHome)();return ({dashboard:playerHome,schedule:playerSchedulePage,account:playerAccountPage,goals:goalsPage,assignments:assignmentsPage,reflections:reflectionsPage,resources:resourcesPage,games:gameCenter,challenges:challengesPage}[state.page]||playerHome)()}
  function hero(coach){return `<div class="hero"><img class="hero-logo" src="${LOGO}" alt=""/><div class="eyebrow">${coach?'THE COACHES’ HUB':'THE PLAYERS’ HUB'} · 2026–27</div><h2>${coach?'BUILD THE STANDARD.':'OWN YOUR DEVELOPMENT.'}</h2><p>${coach?'Plan deliberately. Teach with purpose. Reflect on what transfers to live basketball.':'Understand the game. Recognize the situation. Make the next right decision.'}</p><button class="btn redbtn" data-action="go" data-page="${coach?'practices':'goals'}">${coach?'Open practice planner':'Review my goals'} →</button></div>`}
  function metric(label,num,tag=''){return `<div class="card stat"><small>${esc(label)}</small><b class="tabular">${esc(num)}</b>${tag?`<span class="tag">${esc(tag)}</span>`:''}</div>`}
  function practiceItem(p,buttonLabel='View'){return `<div class="list-card">${dateBox(p.practice_date)}<div class="body"><strong>${esc(p.title)}</strong><p>${esc(fullDate(p.practice_date))} · <strong>${esc(practiceTimeLabel(p))}</strong> · ${esc(practiceGymLabel(p))} · ${esc(teamName(p.team_scope))} · ${p.status==='completed'?'Completed':'Planned'}</p><div class="meta">${pill(p.status)}${p.published?`<span class="pill">Shared with players</span>`:''}</div></div><button class="btn ghost slim" data-action="viewPractice" data-id="${attr(p.id)}">${esc(buttonLabel==='Plan'?'View Plan':buttonLabel)} →</button></div>`}
  function benchmark(){const challenges=teamFilter(records('challenges')).filter(x=>x.active&&isTeamChallenge(x));return `<div class="card"><div class="row between"><div class="section-heading">Team Challenges</div><button class="btn ghost slim" data-action="go" data-page="challenges">View all →</button></div>${challenges.length?challenges.slice(0,4).map(c=>`<div class="note-row"><div class="row between"><b>${esc(c.name)}</b><span class="pill">${esc(teamName(c.team_scope))}</span></div><p class="subtle">${benchmarkSummary(c)}</p></div>`).join(''):`<div class="empty">Create an editable challenge for JV or Varsity.</div>`}</div>`}
  function coachHome(){const practices=visiblePractices();const completed=practices.filter(x=>x.status==='completed');const upcoming=practices.filter(x=>x.practice_date>=today()).sort((a,b)=>a.practice_date.localeCompare(b.practice_date)||String(a.start_time||'').localeCompare(String(b.start_time||'')));const priorities={};completed.forEach(p=>p.primary_priorities?.forEach(x=>{priorities[x]=(priorities[x]||0)+1}));const most=Object.entries(priorities).sort((a,b)=>b[1]-a[1]).slice(0,3);
    return `<div class="stack">${title('Coaches’ Hub','The home base for purposeful, collaborative coaching.',`<button class="btn redbtn" data-action="newPractice">+ New practice</button>`)}${hero(true)}${gameDashboardSnippet()}<div class="grid4 stat-grid">${metric('Completed practices',completed.length)}${metric('Planned sessions',practices.filter(x=>x.status==='planned').length)}${metric('Library drills',visibleDrills().length)}${metric('Players with goals',new Set(records('goals').filter(g=>playerFilter(records('profiles')).some(p=>p.id===g.player_id)).map(g=>g.player_id)).size)}</div><div class="grid2"><div class="card"><div class="row between"><div class="section-heading">Upcoming practices</div><button class="btn lightbtn slim" data-action="go" data-page="practices">See all</button></div>${upcoming.length?upcoming.slice(0,3).map(p=>practiceItem(p,'Plan')).join(''):`<div class="empty">No upcoming practices planned.<br/>Create the next session.</div>`}</div>${benchmark()}</div><div class="grid2"><div class="card"><div class="section-heading">Primary Priority Frequency</div><p class="subtle">Counts completed practices where the competency was a Primary Priority, not minutes spent.</p>${most.length?most.map(([name,n])=>`<div class="barrow" style="grid-template-columns:150px 1fr 30px"><span>${esc(name)}</span><div class="progress"><div style="width:${n/Math.max(...most.map(x=>x[1]))*100}%"></div></div><span>${n}</span></div>`).join(''):`<div class="empty">Complete practices to begin tracking priorities.</div>`}</div><div class="card"><div class="section-heading">Quick actions</div><div class="responsive-stack"><button class="action-card" data-action="newPractice"><span class="icon-square">▣</span><span><b>Create a practice</b><small>Set priorities and game-based activities</small></span></button><button class="action-card" data-action="newDrill"><span class="icon-square">⬡</span><span><b>Add to Drill Library</b><small>Share a competitive teaching activity</small></span></button><button class="action-card" data-action="go" data-page="development"><span class="icon-square">◎</span><span><b>Review player development</b><small>Goals, reflections, and assignments</small></span></button></div></div></div></div>`}
  function playerSchedulePanel(){
    const upcoming=visiblePractices().filter(p=>p.published && p.practice_date>=today()).sort((a,b)=>a.practice_date.localeCompare(b.practice_date)||String(a.start_time||'').localeCompare(String(b.start_time||'')));
    return `<div class="card"><div class="row between"><div class="section-heading">Upcoming Team Practices</div><span class="pill">${upcoming.length} scheduled</span></div><p class="subtle" style="margin-bottom:12px">Date, start and end time, and gym for your team. Times are Shanghai local time.</p>${upcoming.length?upcoming.map(p=>practiceItem(p,'Details')).join(''):'<div class="empty">No upcoming practices have been published.</div>'}</div>`;
  }
  function playerSchedulePage(){
    const all=visiblePractices().filter(p=>p.published).sort((a,b)=>a.practice_date.localeCompare(b.practice_date)||String(a.start_time||'').localeCompare(String(b.start_time||'')));
    const next=all.filter(p=>p.practice_date>=today()),past=all.filter(p=>p.practice_date<today()).reverse();
    return `<div class="stack">${title('My Practice Schedule','Dates, times and gym locations for your team. All times are Shanghai local time.')}<div class="card"><div class="section-heading">Upcoming practices</div>${next.length?next.map(p=>practiceItem(p,'View plan')).join(''):'<div class="empty">No upcoming practices published yet.</div>'}</div><div class="card"><div class="section-heading">Previous practices</div>${past.length?past.slice(0,12).map(p=>practiceItem(p,'Review')).join(''):'<p class="subtle">No past practices published yet.</p>'}</div></div>`;
  }
  function playerAccountPage(){
    return `<div class="stack">${title('My Account','Player access and team information.')}<div class="card"><div class="section-heading">Player profile</div><p><strong>${esc(state.profile?.display_name||'Player')}</strong></p><p class="subtle">${esc(teamName(state.profile?.team_id))} team</p><p class="subtle" style="margin-top:12px">Your six-digit PIN is your personal team login. Contact a coach if you need it reset.</p><button class="btn ghost" data-action="signOut" style="margin-top:18px;min-height:48px">Sign out of Players’ Hub</button></div></div>`;
  }
  function playerHome(){const published=visiblePractices().filter(x=>x.practice_date>=today()).sort((a,b)=>a.practice_date.localeCompare(b.practice_date)||String(a.start_time||'').localeCompare(String(b.start_time||'')));const assignments=visibleAssignments();const completed=records('assignment_responses').filter(r=>r.player_id===userId());const open=assignments.filter(a=>!completed.some(x=>x.assignment_id===a.id));const goals=mine('goals');const name=(state.profile?.display_name||'Player').split(' ')[0];
    return `<div class="stack">${title('My Basketball Hub',`Welcome, ${name}. Your development starts with your decisions.`)}${playerSchedulePanel()}${hero(false)}${gameDashboardSnippet()}<div class="grid4 stat-grid">${metric('My active goals',goals.filter(g=>g.status!=='Completed').length)}${metric('Assignments due',open.length)}${metric('My reflections',mine('reflections').length)}${metric('Team practices',visiblePractices().length)}</div><div class="grid2"><div class="card"><div class="row between"><div class="section-heading">Up next</div><span class="pill redpill">TEAM PRACTICE</span></div>${published.length?practiceItem(published[0],'View'):`<div class="empty">No upcoming practice has been published.</div>`}${published[0]?`<div class="divider"></div><div class="section-label" style="margin-bottom:9px">PRACTICE FOCUS</div>${published[0].primary_priorities?.map((p,i)=>`<div class="priority" style="margin-top:6px"><i>${i+1}.</i>${esc(p)}</div>`).join('')}`:''}</div><div class="card"><div class="row between"><div class="section-heading">My next steps</div><button class="btn lightbtn slim" data-action="go" data-page="assignments">View all</button></div>${open.length?open.slice(0,3).map(a=>`<div class="list-card"><span class="icon-square" style="width:38px;height:38px;flex-basis:38px">☑</span><div class="body"><strong>${esc(a.title)}</strong><p>Due ${esc(fullDate(a.due_date))}</p></div><button class="btn ghost slim" data-action="respondAssignment" data-id="${attr(a.id)}">Open</button></div>`).join(''):`<div class="empty">All current assignments are complete.</div>`}<div class="divider"></div><button class="action-card" data-action="newReflection"><span class="icon-square">✎</span><span><b>Reflection check-in</b><small>What did you recognize and improve?</small></span></button></div></div><div class="grid2"><div class="card"><div class="section-heading">My goals</div>${goals.length?goals.slice(0,3).map(g=>`<div class="note-row"><div class="row between"><b style="font-size:12px">${esc(g.title)}</b>${pill(g.status)}</div><p class="subtle" style="margin-top:5px">${esc(g.target||'')}</p></div>`).join(''):`<div class="empty">No personal goals yet.</div>`}<button class="btn ghost slim" data-action="go" data-page="goals" style="margin-top:15px">See development goals →</button></div><div class="card"><div class="section-heading">Our identity</div><div class="notices"><b>PLAY HARD.</b> Compete every possession.<br/><b>PLAY SMART.</b> See the advantage and make the right read.<br/><b>PLAY TOGETHER.</b> Communicate and stay connected.</div><img class="logo-stamp" style="margin-top:24px" src="${SCHOOL}" alt="Shanghai American School"/></div></div>${playerChallengePanel()}</div>`}
  function practiceManagementRow(p,archived=false){return `<div class="list-card">${dateBox(p.practice_date)}<div class="body"><strong>${esc(p.title)}</strong><p>${esc(fullDate(p.practice_date))} · <strong>${esc(practiceTimeLabel(p))}</strong> · ${esc(practiceGymLabel(p))} · ${esc(teamName(p.team_scope))}</p><div class="meta">${pill(archived?'Archived':p.status)}${p.published?'<span class="pill">Player-visible</span>':''}</div></div><div class="column" style="gap:6px"><button class="btn ghost slim" data-action="viewPractice" data-id="${attr(p.id)}">View plan</button>${archived?`<button class="btn ghost slim" data-action="restorePractice" data-id="${attr(p.id)}">Restore</button>`:`<button class="btn ghost slim" data-action="editPractice" data-id="${attr(p.id)}">Edit</button><button class="btn redbtn slim" data-action="logPractice" data-id="${attr(p.id)}">Check-in</button><button class="btn ghost slim" data-action="practiceBenchmarks" data-id="${attr(p.id)}">Benchmarks</button><button class="btn ghost slim" data-action="archivePractice" data-id="${attr(p.id)}">Archive</button>`}<button class="btn dangerbtn slim" data-action="deletePractice" data-id="${attr(p.id)}">Delete</button></div></div>`}

  // A dedicated read-only practice session page for courtside use by all authorized staff
  // and for published team plans visible to players. Private practice_notes never render for players.
  function practiceViewer(){
    const p=records('practices').find(x=>x.id===state.viewingPracticeId);
    const permitted=Boolean(p&&(isCoach()||(p.published&&!p.archived&&scopeVisible(p))));
    const backPage=isStaff()?'practices':'dashboard';
    if(!permitted)return `<div class="stack">${title('Practice not available','The plan may have been removed, archived, unpublished, or assigned to another team.')}<button class="btn ghost" data-action="go" data-page="${backPage}">← Back</button></div>`;
    const primary=Array.isArray(p.primary_priorities)?p.primary_priorities:[];
    const peripheral=Array.isArray(p.peripheral_priorities)?p.peripheral_priorities:[];
    const activities=Array.isArray(p.activities)?p.activities:[];
    const linkedChallenges=recurringForPractice(p).filter(c=>isCoach()||c.published);
    const privateNotes=isCoach()?records('practice_notes').find(n=>n.practice_id===p.id):null;
    const priorityRows=(items,kind)=>items.length?items.map((v,i)=>`<div class="pv-priority"><span class="pv-priority-index ${kind==='secondary'?'pv-secondary':''}">${kind==='secondary'?'○':i+1}</span><span>${esc(v)}</span></div>`).join(''):'<p class="subtle">No priorities recorded.</p>';
    const activityRows=activities.length?activities.map((a,i)=>{
      const d=records('drills').find(x=>x.id===a.drill_id);
      const detailsVisible=Boolean(a.description||a.situation||a.coaching_cues||d);
      return `<div class="pv-activity"><span class="pv-step">${i+1}</span><div class="pv-activity-body"><strong>${esc(a.name||d?.name||'Untitled activity')}</strong>${a.situation||d?.situation?`<p class="subtle">${esc(a.situation||d?.situation)}</p>`:''}${a.completed?'<span class="pill greenpill">Completed</span>':''}</div>${detailsVisible?`<button class="btn ghost slim" data-action="practiceActivityDetails" data-index="${i}">Instructions &amp; diagrams →</button>`:''}</div>`;
    }).join(''):'<div class="empty">No drills in this sequence yet. Use Edit Practice to add activities.</div>';
    const topActions=`<div class="row wrap"><button class="btn ghost" data-action="go" data-page="${backPage}">← ${isStaff()?'Practice Library':'My Hub'}</button>${isCoach()?`<button class="btn lightbtn" data-action="editPractice" data-id="${attr(p.id)}">Edit plan</button><button class="btn redbtn" data-action="logPractice" data-id="${attr(p.id)}">Post-Practice Check-In</button>`:''}</div>`;
    return `<div class="stack pv-page">
      ${title(p.title,'Full practice plan · '+teamName(p.team_scope),topActions)}
      <div class="pv-schedule" aria-label="Practice schedule"><div><span>DATE</span><b>${esc(fullDate(p.practice_date))}</b></div><div><span>TIME · SHANGHAI</span><b>${esc(practiceTimeLabel(p))}</b></div><div><span>GYM</span><b>${esc(practiceGymLabel(p))}</b></div><div><span>TEAM</span><b>${esc(teamName(p.team_scope))}</b></div></div>
      <div class="row wrap">${pill(p.archived?'Archived':p.status||'Planned')}${p.published?pill('Shared with players'):pill('Coaches only')}<span class="subtle">Saved plan · Read-only view</span></div>
      <div class="grid2 pv-priority-panels"><div class="card"><div class="section-heading">01 · Primary priorities</div>${priorityRows(primary,'primary')}</div><div class="card"><div class="section-heading">02 · Peripheral priorities</div>${priorityRows(peripheral,'secondary')}</div></div>
      <div class="card pv-plan-activities"><div class="row between"><div><div class="section-heading">03 · Practice sequence</div><p class="subtle">Run the activities in this order. Select a drill to see its full instructions, coaching cues, and diagrams.</p></div><span class="pill">${activities.length} activities</span></div><div class="pv-sequence">${activityRows}</div></div>
      <div class="card"><div class="section-heading">04 · Competitive application</div><p class="pv-note-text">${esc(p.live_application||'No live-application notes provided yet.')}</p></div>
      <div class="card"><div class="section-heading">05 · Recurring team challenges</div>${linkedChallenges.length?linkedChallenges.map(c=>challengeStatusLine(c,p)).join(''):'<p class="subtle">No team benchmarks assigned to this practice.</p>'}</div>
      ${isCoach()?`<div class="card pv-private"><div class="section-heading">Private coaching check-in</div><p class="subtle">Only coaches can see these notes. Shared challenge observations are displayed above.</p>${privateNotes?.notes?`<p class="pv-note-text">${esc(privateNotes.notes)}</p>`:'<p class="subtle">No post-practice coaching reflection recorded yet.</p>'}${privateNotes?.next_focus?`<p class="pv-note-text"><b>Next practice focus:</b> ${esc(privateNotes.next_focus)}</p>`:''}<button class="btn lightbtn slim" data-action="logPractice" data-id="${attr(p.id)}">${privateNotes?'Update check-in':'Add post-practice check-in'}</button></div>`:''}
      <div class="pv-footer">${topActions}</div>
    </div>`;
  }

  function practicePage(){const ps=visiblePractices();const archived=records('practices').filter(p=>p.archived&&scopeVisible(p)).sort((a,b)=>b.practice_date.localeCompare(a.practice_date));return `<div class="stack">${title('Practice Planner','Primary Priorities. Peripheral Priorities. Competitive application.',`<button class="btn redbtn" data-action="newPractice">+ New practice</button>`)}<div class="notices"><b>Coaching standard:</b> Teach the read, reproduce the situation, compete, then evaluate the transfer. Practice sequences stay flexible; no forced drill timestamps.</div><div class="grid2"><div class="card"><div class="section-heading">Active practices</div>${ps.length?ps.map(p=>practiceManagementRow(p)).join(''):`<div class="empty">Your first practice will appear here.</div>`}</div>${benchmark()}</div>${ps.length?practiceBenchmarkSection(ps[0]):''}<div class="card"><div class="row between"><div class="section-heading">Archived practices</div><span class="pill">${archived.length} archived</span></div><p class="subtle">Archived practices are hidden from active schedules and from players. Restoring one leaves it unpublished until a coach edits and republishes it.</p>${archived.length?archived.map(p=>practiceManagementRow(p,true)).join(''):'<div class="empty">No archived practices.</div>'}</div></div>`}
  // Custom practice priorities are stored directly in the existing text[] columns.
  // Nothing new is required from the database and previously saved custom values remain editable.
  function prioritySelect(name,value='',allowCustom=false){
    const isCustom=allowCustom&&Boolean(value)&&!COMPETENCIES.includes(value);
    const selected=isCustom?'__custom__':value;
    return `<div class="priority-select-wrap"><select name="${attr(name)}" required ${allowCustom?'data-change="customPriority"':''}><option value="">Select competency...</option>${COMPETENCIES.map(x=>`<option value="${attr(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('')}${allowCustom?`<option value="__custom__" ${isCustom?'selected':''}>Other (write your own)</option>`:''}</select>${allowCustom?`<input class="priority-other-input" name="${attr(name)}_other" data-priority-custom type="text" maxlength="100" placeholder="Enter a specific instructional priority" aria-label="Custom ${attr(name.replace('_',' '))} priority" value="${attr(isCustom?value:'')}" ${isCustom?'required':'hidden disabled'} />`:''}</div>`;
  }
  function practiceEditor(p){const editing=Boolean(p);const primary=p?.primary_priorities||[];const peripheral=p?.peripheral_priorities||[];const activities=state.draftActivities;return `<div class="stack">${title(editing?'Edit Practice':'Create Practice','A clear plan for teaching and transfer.',`<button class="btn ghost" data-action="go" data-page="practices">← Back to practices</button>`)}<form id="practice-form" data-form="practice" class="stack form-panel"><div class="card"><div class="section-heading">01 · Session details</div><div class="field"><label>Team</label>${teamChooser(p?.team_scope|| (state.teamView==='both'?'varsity':state.teamView))}</div><div class="form-grid"><div class="field"><label>Practice date</label><input type="date" name="practice_date" required value="${attr(p?.practice_date||today())}"/></div><div class="field"><label>Practice time (Shanghai local time)</label><select name="practice_time_slot" required><option value="">Select start and end time…</option>${PRACTICE_TIME_SLOTS.map(slot=>`<option value="${attr(slot.value)}" ${practiceSlot(p)===slot.value?'selected':''}>${esc(slot.label)}</option>`).join('')}${practiceSlot(p)&&!PRACTICE_TIME_SLOTS.some(slot=>slot.value===practiceSlot(p))?`<option value="${attr(practiceSlot(p))}" selected>${esc(practiceTimeLabel(p))} (existing schedule)</option>`:''}</select></div><div class="field"><label>Gym location</label><select name="location" required><option value="">Select gym…</option>${PRACTICE_GYMS.map(g=>`<option value="${attr(g.value)}" ${(p?.location||'HS Gym')===g.value?'selected':''}>${esc(g.label)}</option>`).join('')}${p?.location&&!PRACTICE_GYMS.some(g=>g.value===p.location)?`<option value="${attr(p.location)}" selected>${esc(p.location)} (existing location)</option>`:''}</select></div></div><p class="subtle" style="margin-top:9px">Practice time and gym appear on the Players' Hub after the practice is published. Existing plans without a time must be updated before players can see a confirmed start time.</p><div class="field" style="margin-top:13px"><label>Practice title</label><input name="title" required maxlength="100" value="${attr(p?.title||'')}" placeholder="e.g., Press into Transition"/></div></div><div class="card"><div class="section-heading">02 · Instructional priorities</div><div class="section-label" style="margin:8px 0">THREE PRIMARY PRIORITIES</div><div class="form-grid">${[0,1,2].map(i=>`<div class="field"><label>Primary ${i+1}</label>${prioritySelect('primary_'+i,primary[i],true)}</div>`).join('')}</div><div class="section-label" style="margin:20px 0 8px">TWO PERIPHERAL PRIORITIES</div><div class="form-grid">${[0,1].map(i=>`<div class="field"><label>Peripheral ${i+1}</label>${prioritySelect('peripheral_'+i,peripheral[i],true)}</div>`).join('')}</div></div><div class="card"><div class="section-heading">03 · Activity sequence</div><p class="subtle" style="margin:7px 0 12px">Choose an existing library drill or create an activity here without adding it to the shared library.</p><div class="practice-drill-actions"><button class="btn ghost" type="button" data-action="addActivity">Choose from Drill Library</button><button class="btn redbtn" type="button" data-action="newPracticeDrill">+ Create drill in this plan</button></div>${activities.length?activities.map((x,i)=>`<div class="activity practice-activity"><span class="index">${i+1}</span><span class="name">${esc(x.name)}<small class="subtle">${x.temp_id?(x.save_to_library?'New · save to library':'New · practice only'):(x.library_saved===false?'Practice only':'Saved drill')}</small></span><button type="button" class="btn ghost slim" data-action="previewDraftActivity" data-index="${i}">Details</button><button type="button" class="micro" data-action="moveActivity" data-index="${i}" data-dir="-1" aria-label="Move up">↑</button><button type="button" class="micro" data-action="moveActivity" data-index="${i}" data-dir="1" aria-label="Move down">↓</button><button type="button" class="micro" data-action="removeActivity" data-index="${i}" aria-label="Remove drill">×</button></div>`).join(''):'<div class="empty">No activities added yet. Choose a library drill or create one above.</div>'}<p class="subtle" style="margin-top:13px">Drag-free ordering: use the up and down controls. Drill setup notes are preserved with each saved practice.</p></div><div class="card"><div class="section-heading">04 · Recurring team benchmarks</div><p class="subtle">Recurring benchmarks will be attached automatically to this practice. Mark any as skipped for this session; a skipped result is not a zero.</p>${records('challenges').filter(c=>c.active&&isTeamChallenge(c)&&c.recurrence==='every_practice').map(c=>{const defaultTeam=p?.team_scope||(state.teamView==='both'?'varsity':state.teamView);const applicable=c.team_scope==='both'||c.team_scope===defaultTeam;const linked=p?challengePracticeRow(c,p):null;return `<label class="choice v041-recurring-option" data-team-scope="${attr(c.team_scope)}" style="${applicable?'':'display:none'}"><input type="checkbox" name="skip_benchmark" value="${attr(c.id)}" ${linked?.status==='skipped'?'checked':''}/> Skip ${esc(c.name)} <span class="subtle">(${esc(teamName(c.team_scope))})</span></label>`}).join('')||'<p class="subtle">No recurring challenges have been defined yet.</p>'}</div><div class="card"><div class="section-heading">05 · Competitive application</div><div class="field"><label>How will today's priorities transfer to live basketball?</label><textarea name="live_application" placeholder="e.g., 5v5 stops only count after a secured rebound">${esc(p?.live_application||'')}</textarea></div><label class="check-label" style="margin-top:15px"><input type="checkbox" name="published" ${p?.published?'checked':''}/> Share this plan with players</label><p class="subtle" style="margin-top:7px">Coach-only reflections remain in a completely separate private record.</p></div><div class="row wrap"><button class="btn redbtn" type="submit">${editing?'Save changes':'Create practice'} →</button><button class="btn ghost" type="button" data-action="go" data-page="practices">Cancel</button></div></form></div>`}
  function drillPage(){const drills=visibleDrills().filter(d=>(state.filter==='All'||d.status===state.filter)&&[d.name,d.competency,d.description].join(' ').toLowerCase().includes(state.search.toLowerCase()));return `<div class="stack">${title('Shared Drill Library','Build a bank of competitive, transferable teaching activities.',isCoach()?`<button class="btn redbtn" data-action="newDrill">+ New drill</button>`:'')}<div class="controlbar"><input class="search" id="drill-search" placeholder="Search drills and competencies..." value="${attr(state.search)}" aria-label="Search drills"/><div class="filterrow">${['All','Proposed','Tested','Proven'].map(f=>`<button class="filterbtn ${state.filter===f?'selected':''}" data-action="filter" data-filter="${f}">${f}</button>`).join('')}</div></div><div class="grid3">${drills.length?drills.map(d=>`<div class="card drill-card"><div><div class="drill-top">${pill(d.status)}${d.published?`<span class="pill">Player resource</span>`:''}${attachmentsForDrill(d.id).length?`<span class="pill">${attachmentsForDrill(d.id).length} file(s)</span>`:''}</div><h3 style="margin:12px 0 8px">${esc(d.name)}</h3><span class="tagline">${esc(d.competency)}</span><p style="margin-top:10px">${esc(d.description)}</p></div><footer><span class="subtle">${esc(d.situation||'Competitive teaching activity')}</span><button class="btn ghost slim" data-action="drillDetails" data-id="${attr(d.id)}">View →</button></footer></div>`).join(''):`<div class="empty">No drills match the current search.</div>`}</div></div>`}
  function legacyCoachDevelopment(){const players=playerFilter(records('profiles'));return `<div class="stack">${title('Player Development','Track individual goals, reflections, and learning assignments.',`<div class="row"><button class="btn lightbtn" data-action="newPlayer">+ Player access PIN</button><button class="btn redbtn" data-action="newAssignment">+ New assignment</button></div>`)}<div class="grid2"><div class="card"><div class="row between"><div class="section-heading">Learning assignments</div><span class="pill">${visibleAssignments().length} total</span></div>${visibleAssignments().map(a=>{const submissions=records('assignment_responses').filter(r=>r.assignment_id===a.id).length;return `<div class="note-row"><div class="row between"><strong style="font-size:12px">${esc(a.title)}</strong>${pill(a.published?'Published':'Draft')}</div><div class="subtle">Due ${esc(fullDate(a.due_date))} · ${submissions} response${submissions===1?'':'s'} · ${assignmentMediaFor(a.id).length} attached materials</div><button class="btn ghost slim" data-action="manageAssignmentMedia" data-id="${attr(a.id)}">Manage assignment media</button></div>`}).join('')||`<div class="empty">Create the first learning assignment.</div>`}</div><div class="card"><div class="section-heading">Team roster</div><p class="subtle">Roster identity stays visible to coaches even if a player selects a nickname.</p>${players.map(p=>`<div class="list-card"><div class="avatar-sm">${esc(initials(p.display_name))}</div><div class="body"><strong>${esc(p.roster_name||p.display_name)}</strong>${p.roster_name&&p.display_name!=='New Player'?`<p class="subtle">Goes by ${esc(p.display_name)}</p>`:''}<p>${esc(teamName(p.team_id))} · ${records('goals').filter(x=>x.player_id===p.id).length} goals · ${records('reflections').filter(x=>x.player_id===p.id).length} reflections</p></div><div class="column" style="gap:5px"><button class="btn ghost slim" data-action="playerDetails" data-id="${attr(p.id)}">Review</button>${LIVE?`<button class="btn lightbtn slim" data-action="resetPlayerPin" data-id="${attr(p.id)}">Reset PIN</button>${isHeadCoach()?`<button class="btn dangerbtn slim" data-action="deletePlayer" data-id="${attr(p.id)}">Delete player</button>`:''}`:``}</div></div>`).join('')||`<div class="empty">No player accounts are provisioned yet.</div>`}</div></div><div class="card"><div class="section-heading">Recent reflections & submissions</div>${records('reflections').filter(r=>players.some(p=>p.id===r.player_id)).slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).slice(0,5).map(r=>`<div class="note-row"><b style="font-size:12px">${esc(playerName(r.player_id))}</b><p class="subtle">${esc(r.prompt)}</p><p style="font-size:12px;line-height:1.65;margin-top:4px">${esc(r.response)}</p><button class="btn ghost slim" data-action="reviewAssignmentEvidence" data-id="${attr(r.id)}">Review evidence (${assignmentMediaFor(r.assignment_id,r.player_id).length})</button></div>`).join('')||`<div class="empty">No player reflections submitted.</div>`}${records('assignment_responses').filter(r=>players.some(p=>p.id===r.player_id)).map(r=>`<div class="note-row"><b style="font-size:12px">${esc(playerName(r.player_id))} · ${esc(records('assignments').find(a=>a.id===r.assignment_id)?.title)}</b><p style="font-size:12px;line-height:1.65;margin-top:4px">${esc(r.response)}</p><button class="btn ghost slim" data-action="reviewAssignmentEvidence" data-id="${attr(r.id)}">Review evidence (${assignmentMediaFor(r.assignment_id,r.player_id).length})</button></div>`).join('')}</div></div>`}
  function legacyGoalsPage(){const goals=mine('goals');return `<div class="stack">${title('My Goals','Make development measurable and intentional.',`<button class="btn redbtn" data-action="newGoal">+ Add goal</button>`)}<div class="notices">A useful goal names a basketball decision or execution skill, identifies when it matters, and explains what progress looks like.</div><div class="grid2">${goals.map(g=>`<div class="card"><div class="row between"><span class="eyebrow">DEVELOPMENT TARGET</span>${pill(g.status)}</div><h3 style="margin:13px 0">${esc(g.title)}</h3><p class="subtle">${esc(g.target)}</p><div class="divider"></div><label class="field"><label>Update progress</label><select data-change="goalStatus" data-id="${attr(g.id)}"><option ${g.status==='Not started'?'selected':''}>Not started</option><option ${g.status==='In progress'?'selected':''}>In progress</option><option ${g.status==='Completed'?'selected':''}>Completed</option></select></label></div>`).join('')||`<div class="empty">You haven't set a goal yet. Add one to begin tracking progress.</div>`}</div></div>`}
  function assignmentsPage(){const completed=mine('assignment_responses');return `<div class="stack">${title('Assignments','Learn the concept. Make the read. Apply it in live play.')}<div class="grid2">${visibleAssignments().map(a=>{const response=completed.find(r=>r.assignment_id===a.id);return `<div class="card"><div class="row between"><span class="eyebrow">PLAYER DEVELOPMENT</span>${pill(response?'Completed':'To do')}</div><h3 style="margin:12px 0">${esc(a.title)}</h3><p class="subtle" style="min-height:48px">${esc(a.description)}</p>${assignmentMediaFor(a.id).length?`<p class="v045-attachment-count">▧ ${assignmentMediaFor(a.id).length} instructional attachment(s)</p>`:''}<div class="divider"></div><div class="row between"><span class="small muted">Due ${esc(fullDate(a.due_date))}</span><button class="btn ${response?'ghost':'redbtn'} slim" data-action="respondAssignment" data-id="${attr(a.id)}">${response?'Review response':'Open assignment'} →</button></div></div>`}).join('')||`<div class="empty">No published assignments currently.</div>`}</div></div>`}
  function reflectionsPage(){return `<div class="stack">${title('My Reflections','Recognize your decisions, then identify your next improvement.',`<button class="btn redbtn" data-action="newReflection">+ New reflection</button>`)}<div class="grid2"><div class="card"><div class="section-heading">Reflection prompts</div><div class="notices"><b>Recognition:</b> What did you notice more quickly?<br/><b>Decision:</b> What choice did you make?<br/><b>Transfer:</b> What will you do in the next live situation?</div><button class="btn darkbtn" data-action="newReflection" style="margin-top:16px">Write a reflection →</button></div><div class="card"><div class="section-heading">My reflection log</div>${mine('reflections').slice().reverse().map(r=>`<div class="note-row"><b style="font-size:12px">${esc(r.prompt)}</b><p class="subtle">${esc(shortDate(String(r.created_at).slice(0,10)))}</p><p style="font-size:12px;line-height:1.65;margin-top:5px">${esc(r.response)}</p></div>`).join('')||`<div class="empty">Your reflections will appear here.</div>`}</div></div></div>`}
  function legacyResourcesPage(){return `<div class="stack">${title('Skill Resources','Coach-approved drills and team concepts.')}<div class="notices">Team resources and deliberately published drills appear here. Private coaching notes remain in the Coaches’ Hub.</div><div class="grid3">${teamFilter(records('resources')).filter(r=>r.published&&!r.staff_only).map(readableResource).join('')}${visibleDrills().map(d=>`<div class="card drill-card"><div><span class="tagline">${esc(d.competency)}</span><h3 style="margin:12px 0">${esc(d.name)}</h3><p>${esc(d.description)}</p></div><button class="btn ghost slim" data-action="drillDetails" data-id="${attr(d.id)}">Study the drill →</button></div>`).join('')||`<div class="empty">No coach-approved resources available yet.</div>`}</div></div>`}
  function readableResource(r){return `<div class="card drill-card"><div><span class="tagline">${esc(teamName(r.team_scope))} · ${r.resource_type==='file'?'FILE':'LINK'}${r.staff_only?' · COACHES':''}</span><h3 style="margin:12px 0">${esc(r.title)}</h3><p>${esc(r.description)}</p>${!r.published?'<span class="pill">Draft</span>':''}</div><div class="row wrap"><button class="btn ghost slim" data-action="openResource" data-id="${attr(r.id)}">Open →</button>${isCoach()?`<button class="btn lightbtn slim" data-action="deleteResource" data-id="${attr(r.id)}">Remove</button>`:''}</div></div>`}
  function legacyResourceLibrary(){const arr=teamFilter(records('resources'));return `<div class="stack">${title('Resource Library','Team manuals, handbooks, videos, links, and shared teaching files.',isCoach()?`<button class="btn redbtn" data-action="newResource">+ Add resource</button>`:'')}<div class="notices">Upload PDFs, team handbooks, Word documents, PowerPoints, or images (up to 20 MB per file). Link to longer videos instead. Choose JV, Varsity, or Both, and publish when ready.</div><div class="grid3">${arr.map(readableResource).join('')||'<div class="empty">No team resources uploaded yet.</div>'}</div></div>`}
  function coachDevelopment(){return `<div class="stack">${v044CoachDevelopment()}${legacyCoachDevelopment()}</div>`}
  function goalsPage(){return `<div class="stack">${v044PlayerPlans()}${legacyGoalsPage()}</div>`}
  function resourcesPage(){return v044Resources()}
  function resourceLibrary(){return v044Resources()}
  function challengesPage(){const items=teamFilter(records('challenges')).filter(c=>(isStaff()||c.published)&& (isStaff()||challengeAllowsPlayer(c)));return `<div class="stack">${title('Challenges','Recurring team benchmarks and individual skill targets.',isCoach()?`<button class="btn redbtn" data-action="newChallenge">+ New challenge</button>`:'')}<div class="notices"><b>Shared development:</b> Team results, coaching observations, and next-practice emphasis are visible to players after the associated practice and challenge are published. Private evaluations remain in the Coaching Notebook.</div><div class="grid2">${items.map(c=>{const team=isTeamChallenge(c);const attempts=team?practiceChallengeResults(c).filter(r=>r.status==='completed'):records('challenge_results').filter(a=>a.challenge_id===c.id);const myAttempts=attempts.filter(a=>a.player_id===userId());return `<div class="card"><div class="row between"><span class="eyebrow">${esc(teamName(c.team_scope))} · ${team?'TEAM':'INDIVIDUAL'}</span>${pill(c.active?'Active':'Archived')}</div><h3 style="margin:12px 0">${esc(c.name)}</h3><p class="subtle">${esc(c.description)}</p><p class="subtle">${team?(c.recurrence==='every_practice'?'Automatically included every practice':'Coach selects practice when logging'):(c.assignment_mode==='selected'?'Assigned players':'All players on selected team')}</p><div class="divider"></div><p><strong>Target: ${numberFormat(c.target_value)} ${esc(c.metric_unit)}</strong>${c.time_limit_minutes?` · ${esc(c.time_limit_minutes)} min`:''}</p><p class="subtle">${team?benchmarkSummary(c):`${isStaff()?attempts.length:myAttempts.length} personal results recorded`}</p><div class="row wrap" style="margin-top:13px">${isCoach()?`<button class="btn ghost slim" data-action="editChallenge" data-id="${attr(c.id)}">Edit challenge</button>`:''}${team?`${isCoach()?`<button class="btn redbtn slim" data-action="recordTeamChallenge" data-id="${attr(c.id)}">Log / edit result</button>`:''}<button class="btn ghost slim" data-action="challengeResults" data-id="${attr(c.id)}">View progress</button>`:(!isStaff()||isCoach())?`<button class="btn redbtn slim" data-action="recordChallenge" data-id="${attr(c.id)}">Record attempt</button><button class="btn ghost slim" data-action="challengeResults" data-id="${attr(c.id)}">View progress</button>`:''}</div>${team?challengeTrend(c):''}</div>`}).join('')||'<div class="empty">No challenges available for this team.</div>'}</div></div>`}
  function notebookPage(){const notes=teamFilter(records('coaching_notes'));return `<div class="stack">${title('Private Coaching Notebook','Player observations, opponent scouting, and coaching reflections.',`<button class="btn redbtn" data-action="newNotebookNote">+ New note</button>`)}<div class="notices">Coach-only material. Players and program reviewers cannot open this page or retrieve these notes through the database.</div><div class="grid2">${notes.slice().sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at))).map(n=>`<div class="card"><span class="tagline">${esc(n.category.toUpperCase())} · ${esc(teamName(n.team_scope))}</span><h3 style="margin:10px 0">${esc(n.title)}</h3><p class="subtle">${esc(n.note)}</p>${n.player_id?`<p class="subtle">Player: ${esc(playerName(n.player_id))}</p>`:''}${n.opponent?`<p class="subtle">Opponent: ${esc(n.opponent)}</p>`:''}<button class="btn lightbtn slim" data-action="deleteNote" data-id="${attr(n.id)}">Remove note</button></div>`).join('')||'<div class="empty">No private coaching notes yet.</div>'}</div></div>`}
  function reviewerHome(){return `<div class="stack">${title('Program Overview','Read-only view for JV and Varsity program review.')}${hero(true)}<div class="grid4">${metric('Published practices',visiblePractices().filter(p=>p.published).length)}${metric('Published drills',visibleDrills().filter(d=>d.published).length)}${metric('Published challenges',teamFilter(records('challenges')).filter(c=>c.published).length)}${metric('Published resources',teamFilter(records('resources')).filter(r=>r.published).length)}</div><div class="card"><div class="section-heading">Upcoming published practices</div>${visiblePractices().filter(p=>p.published&&p.practice_date>=today()).map(p=>practiceItem(p)).join('')||'<div class="empty">No published practices yet.</div>'}</div></div>`}
  function reviewerPractices(){return `<div class="stack">${title('Practice Overview','Published JV and Varsity practices; reviewer access is read-only.')}<div class="card">${visiblePractices().filter(p=>p.published).map(p=>practiceItem(p)).join('')||'<div class="empty">No published practices.</div>'}</div></div>`}
  function settingsPage(){return `<div class="stack">${title('Program Settings','Season information and access configuration.')}<div class="grid2"><div class="card"><div class="section-heading">Program identity</div><div class="row start"><img src="${LOGO}" style="width:95px;height:95px;object-fit:contain" alt="SAS eagle"/><div><h3>SAS Puxi Girls Basketball</h3><p class="subtle">Junior Varsity + Varsity</p><p class="subtle">Season 2026–27</p><p class="subtle" style="margin-top:13px">Play hard. Play smart. Play together.</p></div></div></div><div class="card"><div class="section-heading">Account access</div><p class="subtle">${LIVE?'Signed in with Supabase Auth. Authorization is enforced by database-level Row Level Security.':'This is demo mode. Hub switching is for preview only and does not protect information. Do not use demo mode with real student records.'}</p><button class="btn ghost" style="margin-top:16px" data-action="signOut">${LIVE?'Sign out':'Exit demo'}</button>${!LIVE?`<button class="btn lightbtn" style="margin:16px 0 0 8px" data-action="resetDemo">Reset sample data</button>`:''}</div></div><div class="card"><div class="section-heading">Staff tools</div><p class="subtle">All coaches can work across JV and Varsity. Player evaluations and scouting are visible only to coaching staff.</p><div class="responsive-stack"><button class="btn ghost" data-action="go" data-page="notebook">Open private Coaching Notebook</button><button class="btn ghost" data-action="go" data-page="resources">Open Resource Library</button>${LIVE&&state.profile?.display_name==='Coach Stanley'?`<button class="btn redbtn" data-action="inviteStaff">Provision four beta staff</button>`:''}</div>${state.staffInviteResult?`<div class="notices" style="margin-top:12px"><p><strong>Staff setup results</strong></p><p>Temporary passwords are shown only in this session. Copy each one privately before leaving this page.</p>${state.staffInviteResult.map((x,i)=>`<div class="note-row"><strong>${esc(x.name)}</strong><p>${esc(x.status)}</p>${x.temporaryPassword?`<p style="word-break:break-all">Temporary password: <code>${esc(x.temporaryPassword)}</code></p><button class="btn lightbtn slim" data-action="copyStaffPassword" data-index="${i}">Copy temporary password</button>`:''}</div>`).join('')}</div>`:''}</div></div>`}
  function drillOptions(selected){return visibleDrills().map(d=>`<option value="${attr(d.id)}" ${d.id===selected?'selected':''}>${esc(d.name)}</option>`).join('')}
  function modal(){const {type,obj}=state.modal;let heading='',body='',footer='';if(['manageGameMedia','manageAssignmentMedia','reviewAssignmentEvidence'].includes(type))return v045Modal(type,obj);if(type==='newTournament'||type==='editTournament')return tournamentModal(obj);if(type==='tournamentResult')return tournamentResultModal(obj);if(['newTrainingPlan','logTraining','planHistory','requestFeedback','feedbackThread','playerPortfolio','newGame','editGame','gameStats','gameStatsView','addDrillToPractice'].includes(type))return v044Modal(type,obj);
    if(type==='newPlayer'){heading='Generate Player PIN';body=`<form id="modal-form" data-form="newPlayer" class="stack"><p class="subtle">Enter the player’s actual roster name. The app generates a unique six-digit PIN and shows it to you once.</p><div class="field"><label>Roster name</label><input name="roster_name" required maxlength="80" placeholder="Player’s name" /></div><div class="field"><label>Team</label>${teamChooser((state.teamView==='jv'?'jv':'varsity'))}</div></form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">Generate access code</button>`}
    else if(type==='newDrill'){heading=obj?'Create Drill from Resource':'Add a Drill';body=`<form id="modal-form" data-form="drill" class="stack"><div class="field"><label>Drill name</label><input name="name" required maxlength="90" value="${attr(obj?.title||'')}"/></div><div class="field"><label>Primary competency</label>${prioritySelect('competency','',true)}</div><div class="field"><label>Basketball situation</label><input name="situation" placeholder="What game situation does it reproduce?" required/></div><div class="field"><label>Execution instructions</label><textarea name="description" required>${esc(obj?`Adapted from resource: ${obj.description||obj.title}. Source: ${obj.external_url||obj.title}. Add court setup, player actions, scoring, and reads.`:'')}</textarea></div><div class="field"><label>Coaching cues</label><textarea name="coaching_cues" placeholder="What should players recognize and decide?"></textarea></div><div class="form-grid"><div class="field"><label>Evidence status</label><select name="status"><option>Proposed</option><option>Tested</option><option>Proven</option></select></div><div class="field"><label>Team access</label>${teamChooser(state.teamView==='both'?'both':state.teamView,true)}</div><div class="field"><label>Player visibility</label><select name="published"><option value="false">Coaches only</option><option value="true">Publish to players</option></select></div></div>${obj?`<input type="hidden" name="source_resource_id" value="${attr(obj.id)}"/><p class="subtle">The original resource will remain connected to this drill.</p>`:''}${drillFileInput()}</form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">Save drill</button>`}
    else if(type==='newPracticeDrill'){
      heading='Create Drill in Practice';
      body=`<form id="modal-form" data-form="practiceDrill" class="stack"><p class="subtle">Create a drill without leaving this practice. Choose explicitly whether it should also appear in the shared Drill Library.</p><div class="field"><label>Drill name</label><input name="name" required maxlength="90" placeholder="e.g., Sixteen (16)"/></div><div class="field"><label>Primary competency</label>${prioritySelect('competency','',true)}</div><div class="field"><label>Basketball situation</label><input name="situation" required maxlength="250" placeholder="What game situation does it reproduce?"/></div><div class="field"><label>Execution instructions</label><textarea name="description" required placeholder="Setup, player actions, rotations and scoring"></textarea></div><div class="field"><label>Coaching cues</label><textarea name="coaching_cues" placeholder="What should players recognize and decide?"></textarea></div>${drillFileInput('practice_drill_files')}<label class="choice"><input type="checkbox" name="save_to_library"/> Also save this drill to the shared Drill Library</label><p class="subtle">Unchecked keeps it attached only to this practice. Both choices support diagrams and teaching files; published plans show their drills to assigned players.</p></form>`;
      footer=`<button class="btn redbtn" type="submit" form="modal-form">Add drill to sequence</button>`;
    }
    else if(type==='practiceActivityDetails'||type==='previewDraftActivity'){
      const a=obj.activity||{};const d=records('drills').find(x=>x.id===a.drill_id);const data={name:a.name||d?.name,competency:a.competency||d?.competency,situation:a.situation||d?.situation,description:a.description||d?.description,coaching_cues:a.coaching_cues||d?.coaching_cues};
      heading=data.name||'Drill details';
      const pending=(a.temp_id&&state.draftDrillFiles[a.temp_id])||[];
      const permittedFiles=d&&(isCoach()||(d.published&&scopeVisible(d)));
      body=`<div class="stack"><div class="row wrap">${d?pill(d.status||'Proposed'):pill('Practice drill')}<span class="tagline">${esc(data.competency||'Custom competency')}</span></div><div><div class="section-label">GAME SITUATION</div><p class="pv-note-text">${esc(data.situation||'Not specified')}</p></div><div><div class="section-label">EXECUTION INSTRUCTIONS</div><p class="pv-note-text">${esc(data.description||'No instructions recorded.')}</p></div><div><div class="section-label">COACHING CUES</div><p class="pv-note-text">${esc(data.coaching_cues||'No cues recorded.')}</p></div>${pending.length?`<div><div class="section-label">PENDING FILES (${pending.length})</div>${pending.map(f=>`<p class="subtle">${esc(f.name)}</p>`).join('')}</div>`:''}${permittedFiles?drillAttachmentView(d):''}${d&&isCoach()&&d.in_library===false?`<button class="btn ghost" data-action="promotePracticeDrill" data-id="${attr(d.id)}">Add to shared Drill Library</button>`:''}</div>`;
    }
    else if(type==='confirmDeletePlayer'){const name=obj.roster_name||obj.display_name;heading='Permanently Delete Player';body=`<form id="modal-form" data-form="deletePlayer" class="stack"><div class="notices"><b>Permanent account deletion.</b> This revokes the six-digit PIN and removes the basketball player profile, goals, reflections, submissions, and individual challenge attempts. Existing team-wide results remain as team history.</div><p><b>${esc(name)}</b> · ${esc(teamName(obj.team_id))}</p><div class="field"><label>Type the exact roster name to confirm</label><input name="confirm_roster_name" required autocomplete="off" spellcheck="false" placeholder="${attr(name)}"/></div><p class="subtle">Staff accounts cannot be deleted using this tool.</p></form>`;footer=`<button class="btn dangerbtn" type="submit" form="modal-form">Permanently delete player</button>`}
    else if(type==='confirmDeletePractice'){const linked=records('practice_challenges').filter(r=>r.practice_id===obj.id).length;const personal=records('challenge_results').filter(r=>r.practice_id===obj.id).length;heading='Permanently Delete Practice';body=`<form id="modal-form" data-form="deletePractice" class="stack"><div class="notices"><b>This cannot be undone.</b> Deleting the practice also deletes its private practice notes, ${linked} team benchmark record(s), and ${personal} practice-linked individual attempt(s). The shared Drill Library is unaffected.</div><p><b>${esc(obj.title)}</b><br/><span class="subtle">${esc(fullDate(obj.practice_date))} · ${esc(teamName(obj.team_scope))}</span></p><div class="field"><label>Type the exact practice title to confirm</label><input name="confirm_title" required autocomplete="off" spellcheck="false" placeholder="${attr(obj.title)}"/></div></form>`;footer=`<button class="btn dangerbtn" type="submit" form="modal-form">Permanently delete practice</button>`}
    else if(type==='confirmClearTeamResult'){const c=records('challenges').find(x=>x.id===obj.challenge_id),p=practiceForResult(obj);heading='Clear Challenge Result';body=`<form id="modal-form" data-form="clearTeamResult" class="stack"><div class="notices"><b>Clear only this practice's result.</b> The benchmark remains assigned to the practice, but its score, shared observations, and next-practice emphasis will be reset to Pending. Other dates and the challenge definition are unchanged.</div><p><b>${esc(c?.name||'Challenge')}</b><br/><span class="subtle">${esc(fullDate(p?.practice_date))} · ${esc(p?.title||'Practice')}</span></p><label class="choice"><input type="checkbox" name="confirmed" required/> I understand this practice's result and shared notes will be erased.</label></form>`;footer=`<button class="btn dangerbtn" type="submit" form="modal-form">Clear this result</button>`}
    else if(type==='confirmDeleteIndividualResult'){const c=records('challenges').find(x=>x.id===obj.challenge_id);heading='Delete Individual Attempt';body=`<form id="modal-form" data-form="deleteIndividualResult" class="stack"><div class="notices">Only this player's individual attempt will be deleted. The challenge and the player's profile remain intact.</div><p><b>${esc(c?.name||'Challenge')}</b><br/><span class="subtle">${esc(playerName(obj.player_id))} · ${numberFormat(obj.result_value)} ${esc(obj.metric_unit_snapshot||c?.metric_unit||'reps')}</span></p><label class="choice"><input type="checkbox" name="confirmed" required/> Permanently remove this attempt.</label></form>`;footer=`<button class="btn dangerbtn" type="submit" form="modal-form">Delete attempt</button>`}
    else if(type==='confirmPinReset'){heading='Reset Player PIN';body=`<form id="modal-form" data-form="resetPlayerPin"><p>This generates a new six-digit PIN for <b>${esc(obj.roster_name||obj.display_name)}</b>. Their previous PIN will stop working.</p></form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">Reset PIN</button>`}
    else if(type==='pinCreated'){heading='Player access code generated';body=`<div class="stack"><p>Assign this code privately to <b>${esc(obj.roster_name)}</b>.</p><div class="eyebrow">SIX-DIGIT CODE</div><div style="font-size:36px;letter-spacing:9px;font-weight:900;text-align:center">${esc(obj.pin)}</div><p class="subtle">This code will not be displayed here again. Write it down before closing.</p></div>`}
    else if(type==='drillDetails'){const d=obj;heading=d.name;body=`<div class="stack"><div class="row">${pill(d.status)}<span class="tagline">${esc(d.competency)}</span></div><div><div class="section-label">GAME SITUATION</div><p class="subtle" style="margin-top:6px">${esc(d.situation)}</p></div><div><div class="section-label">HOW IT WORKS</div><p style="font-size:13px;line-height:1.7;margin-top:6px">${esc(d.description)}</p></div><div><div class="section-label">COACHING CUES</div><p style="font-size:13px;line-height:1.7;margin-top:6px">${esc(d.coaching_cues||'No additional cues recorded.')}</p></div>${d.source_resource_id && records('resources').some(r=>r.id===d.source_resource_id)?`<button class="btn ghost slim" data-action="openResource" data-id="${attr(d.source_resource_id)}">View original Skill Library resource ↗</button>`:''}${drillAttachmentView(d)}${isCoach()?`<button class="btn redbtn slim" data-action="addDrillToPractice" data-id="${attr(d.id)}">Add to practice</button>`:''}</div>`}
    else if(type==='addDrillFiles'){heading='Add Setup Diagrams · '+obj.name;body=`<form id="modal-form" data-form="addDrillFiles" class="stack"><p class="subtle">Files are linked to <b>${esc(obj.name)}</b>. Players see them only if the drill is published for their team.</p>${drillFileInput()}</form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">Upload files</button>`}
    else if(type==='addActivity'){heading='Add a drill to practice';body=`<form id="modal-form" data-form="addActivity" class="stack"><div class="field"><label>Choose drill</label><select name="drill_id" required>${drillOptions('')}</select></div><p class="subtle">Drills can be reordered after adding them.</p></form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">Add activity</button>`}
    else if(type==='practiceDetails'){const p=obj;heading=p.title;body=`<div class="stack"><span class="eyebrow">${esc(fullDate(p.practice_date))} · ${esc(practiceTimeLabel(p))} · ${esc(practiceGymLabel(p))} (Shanghai time)</span><div class="section-label">THREE PRIMARY PRIORITIES</div>${p.primary_priorities.map(x=>`<div class="priority"><i>●</i>${esc(x)}</div>`).join('')}<div class="section-label">TWO PERIPHERAL PRIORITIES</div>${p.peripheral_priorities.map(x=>`<div class="priority"><i>○</i>${esc(x)}</div>`).join('')}<div class="section-label">COMPETITIVE APPLICATION</div><p class="subtle">${esc(p.live_application||'To be announced')}</p><div class="section-label">PRACTICE ACTIVITIES</div>${p.activities?.map(x=>`<div class="priority">${esc(x.name)}</div>`).join('')||'<p class="subtle">No additional activities published.</p>'}<div class="section-label">TEAM CHALLENGE RESULTS</div>${recurringForPractice(p).filter(c=>c.published||isCoach()).map(c=>challengeStatusLine(c,p)).join('')||'<p class="subtle">No recurring challenge results yet.</p>'}</div>`}
    else if(type==='logPractice'){const p=obj;const n=records('practice_notes').find(x=>x.practice_id===p.id);heading='Post-Practice Check-In';body=`<form id="modal-form" data-form="logPractice" class="stack"><div class="notices"><b>${esc(p.title)}</b><br/>Record what actually happened, not what was planned.</div><div class="form-grid"><div class="field"><label>Practice status</label><select name="status"><option value="completed" ${p.status==='completed'?'selected':''}>Completed</option><option value="planned" ${p.status==='planned'?'selected':''}>Planned</option></select></div></div><div class="section-label">ACTIVITIES ACTUALLY COMPLETED</div>${(p.activities||[]).length?p.activities.map((a,i)=>`<label class="choice"><input type="checkbox" name="activity_${i}" ${a.completed?'checked':''}/> ${esc(a.name)}</label>`).join(''):`<p class="subtle">No additional drills listed.</p>`}<div class="field"><label>Private coach reflection (NOT player-visible)</label><textarea name="notes" placeholder="What worked? What needs improvement?">${esc(n?.notes||'')}</textarea></div><div class="field"><label>Next practice emphasis</label><input name="next_focus" value="${attr(n?.next_focus||'')}" placeholder="What will we reinforce next?"/></div><div class="divider"></div><div class="section-heading">Team challenge results (shared with players)</div>${recurringForPractice(p).map(c=>{const r=challengePracticeRow(c,p);const key=attr(c.id);return `<div class="v041-checkin-benchmark"><b>${esc(c.name)}</b><p class="subtle">Target: ${numberFormat(r?.target_snapshot??c.target_value)} ${esc(c.metric_unit)}. One record for this practice.</p><div class="field"><label>Status</label><select name="challenge_status_${key}"><option value="pending" ${!r||r.status==='pending'?'selected':''}>Pending</option><option value="completed" ${r?.status==='completed'?'selected':''}>Completed</option><option value="skipped" ${r?.status==='skipped'?'selected':''}>Skipped</option></select></div><div class="field"><label>Team result</label><input name="challenge_result_${key}" type="number" min="0" step="any" value="${attr(r?.result_value??'')}" placeholder="e.g., 83"></div><div class="field"><label>Shared coaching observations</label><textarea name="challenge_notes_${key}" placeholder="Passing, communication, conditioning...">${esc(r?.notes||'')}</textarea></div><div class="field"><label>Next practice emphasis (shared)</label><input name="challenge_focus_${key}" value="${attr(r?.next_focus||'')}"></div></div>`}).join('')||'<p class="subtle">No recurring challenges attached.</p>'}</form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">Save check-in</button>`}
    else if(type==='newAssignment'){heading='Create Learning Assignment';body=`<form id="modal-form" data-form="assignment" class="stack"><div class="field"><label>Team</label>${teamChooser(state.teamView==='both'?'both':state.teamView,true)}</div><div class="field"><label>Assignment title</label><input name="title" required/></div><div class="field"><label>Instructions / basketball learning target</label><textarea name="description" required></textarea></div><div class="field"><label>Due date</label><input type="date" name="due_date" value="${dayOffset(7)}" required/></div><div class="field"><label>Instructional images, PDFs, or short videos (optional)</label><input type="file" name="media_files" accept=".png,.jpg,.jpeg,.webp,.pdf,.mp4,.mov" multiple/><p class="subtle">Maximum 5 files, 20 MB each. You can attach more after creating the assignment.</p></div><div class="field"><label>Instructional link or video (optional)</label><input name="external_url" type="url" placeholder="https://…" /></div><div class="field"><label>Attachment caption (optional)</label><input name="caption" maxlength="200" placeholder="What should players look for?" /></div><label class="check-label"><input type="checkbox" name="published" checked/> Publish to players</label></form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">Create assignment</button>`}
    else if(type==='respondAssignment'){const a=obj;const existing=mine('assignment_responses').find(r=>r.assignment_id===a.id);heading=a.title;body=`<form id="modal-form" data-form="response" class="stack"><div class="notices">${esc(a.description)}</div><div class="section-label">COACH INSTRUCTIONAL MATERIALS</div>${assignmentMediaList(a)}<div class="field"><label>My response</label><textarea name="response" required minlength="8" placeholder="Describe your read, decision, and application...">${esc(existing?.response||'')}</textarea></div><div class="section-label">MY EVIDENCE (OPTIONAL)</div>${assignmentMediaList(a,userId())}<div class="field"><label>Add photos, PDF or short video evidence (optional)</label><input type="file" name="media_files" accept=".png,.jpg,.jpeg,.webp,.pdf,.mp4,.mov" multiple/><p class="subtle">Only you and authorized coaches can view this evidence. Maximum 5 files at a time, 20 MB each.</p></div><div class="field"><label>Video or evidence link (optional)</label><input type="url" name="external_url" placeholder="https://…"/></div><div class="field"><label>What does this evidence show? (optional)</label><input name="caption" maxlength="200" placeholder="Explain the skill or decision demonstrated"/></div><p class="subtle">Due ${esc(fullDate(a.due_date))}. Your response and evidence are private to you and authorized coaches.</p></form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">${existing?'Update response':'Submit response'}</button>`}
    else if(type==='newGoal'){heading='Set a Development Goal';body=`<form id="modal-form" data-form="goal" class="stack"><div class="field"><label>Development goal</label><input name="title" required placeholder="e.g., Recognize driving angles"/></div><div class="field"><label>What will progress look like in a game?</label><textarea name="target" required placeholder="Name an observable action or decision."></textarea></div></form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">Save goal</button>`}
    else if(type==='newReflection'){heading='Player Reflection';body=`<form id="modal-form" data-form="reflection" class="stack"><div class="field"><label>Reflection prompt</label><select name="prompt"><option>What did you recognize faster this week?</option><option>What basketball decision do you want to improve?</option><option>When did you help the team communicate better?</option><option>What did you learn from a challenging possession?</option></select></div><div class="field"><label>My reflection</label><textarea name="response" minlength="8" required placeholder="Explain the situation, your decision, and what you will try next."></textarea></div></form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">Submit reflection</button>`}
    else if(type==='playerDetails'){const p=obj;heading=p.roster_name||p.display_name;const goals=records('goals').filter(x=>x.player_id===p.id);const reflections=records('reflections').filter(x=>x.player_id===p.id);const submissions=records('assignment_responses').filter(x=>x.player_id===p.id);body=`<div class="stack"><p class="subtle">Player display name: ${esc(p.display_name)}</p><div class="section-label">GOALS</div>${goals.map(g=>`<div class="note-row"><div class="row between"><b>${esc(g.title)}</b>${pill(g.status)}</div><p class="subtle">${esc(g.target)}</p></div>`).join('')||'<p class="subtle">No goals on record.</p>'}<div class="section-label">REFLECTIONS</div>${reflections.map(r=>`<div class="note-row"><b class="small">${esc(r.prompt)}</b><p class="subtle">${esc(r.response)}</p></div>`).join('')||'<p class="subtle">No reflections on record.</p>'}<div class="section-label">ASSIGNMENT RESPONSES</div>${submissions.map(r=>`<div class="note-row"><b class="small">${esc(records('assignments').find(a=>a.id===r.assignment_id)?.title||'Assignment')}</b><p class="subtle">${esc(r.response)}</p></div>`).join('')||'<p class="subtle">No responses on record.</p>'}</div>`}
    else if(type==='changePassword'){heading='Change Staff Password';body=`<form id="modal-form" data-form="changePassword" class="stack"><p class="subtle">Use at least 12 characters. Your new password will work for this Supabase account.</p><div class="field"><label>New password</label><input name="password" type="password" minlength="12" required autocomplete="new-password"></div><div class="field"><label>Confirm password</label><input name="confirm_password" type="password" minlength="12" required autocomplete="new-password"></div></form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">Update password</button>`}
    else if(type==='newResource'){const player=state.role==='player';const section=player?'skill':state.resourceSection;heading=player?'Submit a Skill Resource':'Add Resource';body=`<form id="modal-form" data-form="resource" class="stack"><p class="subtle">${player?'Player resources are available to both teams after a coach approves them. Submit an instructional link and describe what it teaches.':'Coaches can publish Team Essentials immediately or add links and files to the shared Skill Library.'}</p><div class="field"><label>Resource title</label><input name="title" required maxlength="150"/></div><div class="field"><label>How will this help our players?</label><textarea name="description"></textarea></div><div class="field"><label>Library section</label><select name="library_section" ${player?'disabled':''}><option value="essentials" ${section==='essentials'?'selected':''}>Team Essentials</option><option value="skill" ${section==='skill'?'selected':''}>Skill Library</option></select></div><div class="field"><label>Skill category</label><select name="skill_category">${categoryOptions()}</select></div>${player?'':`<div class="field"><label>Team</label>${teamChooser('both',true)}</div><div class="field"><label>Type</label><select name="resource_type"><option value="link">External link</option><option value="file">Upload a file</option></select></div><div class="field"><label>Upload (PDF, DOCX, PPTX, image; max 20 MB)</label><input type="file" name="resource_file" accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.txt"/></div>`}<div class="field"><label>Video or learning link</label><input type="url" name="external_url" placeholder="https://..." ${player?'required':''}/></div>${player?'':`<label class="choice"><input type="checkbox" name="required_review"/> Required review for players (Team Essentials)</label><label class="choice"><input type="checkbox" name="staff_only"/> Coaches only</label><label class="choice"><input type="checkbox" name="published" checked/> Publish resource</label>`}</form>`;footer=`<button class="btn redbtn" type="submit" form="modal-form">${player?'Submit for Coach Approval':'Add resource'}</button>`}
    else if(type==='newChallenge'||type==='editChallenge'){const c=obj||{};heading=obj?'Edit Challenge':'Create Challenge';const team=isTeamChallenge(c),assigned=records('challenge_assignees').filter(a=>a.challenge_id===c.id).map(a=>a.player_id);body=`<form id="modal-form" data-form="challenge" class="stack"><div class="field"><label>Challenge name</label><input name="name" required maxlength="100" value="${attr(c.name||'')}"/></div><div class="field"><label>Instructions</label><textarea name="description">${esc(c.description||'')}</textarea></div><div class="form-grid"><div class="field"><label>Participant type</label><select name="participant_type"><option value="team" ${team?'selected':''}>Whole team</option><option value="individual" ${!team?'selected':''}>Individual players</option></select></div><div class="field"><label>Assigned team</label>${teamChooser(c.team_scope||(state.teamView==='both'?'varsity':state.teamView),true)}</div></div><div class="form-grid"><div class="field"><label>Target</label><input type="number" min="0" step="any" name="target_value" value="${attr(c.target_value??100)}" required></div><div class="field"><label>Unit (makes, reps, seconds)</label><input name="metric_unit" maxlength="32" value="${attr(c.metric_unit||'makes')}" required></div></div><div class="field"><label>Time limit in minutes (optional)</label><input type="number" min="0.01" step="any" name="time_limit_minutes" value="${attr(c.time_limit_minutes??'')}"></div><div class="field"><label>Recurrence (team benchmarks only)</label><select name="recurrence"><option value="manual" ${c.recurrence!=='every_practice'?'selected':''}>Manually log on a selected practice</option><option value="every_practice" ${c.recurrence==='every_practice'?'selected':''}>Automatically attach to every team practice</option></select></div><div class="field"><label>Individual assignment (individual type only)</label><select name="assignment_mode"><option value="all" ${c.assignment_mode!=='selected'?'selected':''}>All players on assigned team</option><option value="selected" ${c.assignment_mode==='selected'?'selected':''}>Selected player(s) below</option></select></div><div class="field"><label>Choose individual players if needed (select one or more)</label><div class="v041-player-picks">${records('profiles').filter(p=>p.role==='player').map(p=>`<label class="choice"><input type="checkbox" name="assignee_ids" value="${attr(p.id)}" ${assigned.includes(p.id)?'checked':''}/> ${esc(p.roster_name||p.display_name)} · ${esc(teamName(p.team_id))}</label>`).join('')||'<p class="subtle">No players on the roster yet.</p>'}</div></div><label class="choice"><input type="checkbox" name="published" ${c.published?'checked':''}/> Publish to players</label><label class="choice"><input type="checkbox" name="active" ${!obj||c.active?'checked':''}/> Active benchmark</label></form>`;footer=`<button class="btn redbtn" form="modal-form" type="submit">${obj?'Save changes':'Create challenge'}</button>`}
    else if(type==='recordTeamResult'){const c=records('challenges').find(x=>x.id===obj.challengeId);if(!c){heading='Challenge not found';body='<p class="error">Please reopen Challenges.</p>';}else{const ps=practicesForChallenge(c);const p=ps.find(x=>x.id===obj.practiceId)||ps[0];const r=p?challengePracticeRow(c,p):null;const selectedStatus=r?.status==='skipped'?'skipped':'completed';heading=c.name+' · Practice Result';body=ps.length?`<form id="modal-form" data-form="teamChallengeResult" class="stack"><p class="subtle">One team-wide result per practice. Scores and observations are shared with players when published.</p><div class="field"><label>Linked practice</label><select name="practice_id" data-change="chooseChallengePractice">${ps.map(x=>`<option value="${attr(x.id)}" ${x.id===p.id?'selected':''}>${esc(fullDate(x.practice_date))} · ${esc(x.title)} · ${esc(teamName(x.team_scope))}</option>`).join('')}</select></div><div class="field"><label>Challenge status</label><select name="status" data-change="challengeStatus"><option value="pending" ${selectedStatus==='pending'?'selected':''}>Pending: not yet recorded</option><option value="completed" ${selectedStatus==='completed'?'selected':''}>Completed: enter score</option><option value="skipped" ${selectedStatus==='skipped'?'selected':''}>Skipped: not attempted (not zero)</option></select></div><div class="field"><label>Completed ${esc(r?.metric_unit_snapshot||c.metric_unit)} (target ${numberFormat(r?.target_snapshot??c.target_value)})</label><input type="number" name="result_value" min="0" step="any" value="${attr(r?.result_value??'')}" placeholder="e.g., 83" ${selectedStatus==='completed'?'required':''}></div><div class="field"><label>Coach observations (shared with players)</label><textarea name="notes" placeholder="What affected execution? Passing, communication, transition, effort...">${esc(r?.notes||'')}</textarea></div><div class="field"><label>Next practice emphasis (shared with players)</label><textarea name="next_focus" placeholder="Specific correction to reinforce next practice">${esc(r?.next_focus||'')}</textarea></div><p class="subtle">Historical target is frozen when the challenge attaches to this practice.</p></form>`:`<p class="subtle">Create a ${esc(teamName(c.team_scope))} practice plan first, then return here to record a result.</p>`;footer=ps.length?`<button class="btn redbtn" type="submit" form="modal-form">Save practice result</button>`:''}}
    else if(type==='recordChallenge'){const c=obj;const players=playerFilter(records('profiles'));heading='Log Individual Challenge Result';body=`<form id="modal-form" data-form="challengeResult" class="stack"><p><b>${esc(c.name)}</b> · Target ${esc(c.target_value)} ${esc(c.metric_unit)}</p>${isCoach()?`<div class="field"><label>Player</label><select name="player_id" required>${players.filter(p=>c.assignment_mode!=='selected'||records('challenge_assignees').some(a=>a.challenge_id===c.id&&a.player_id===p.id)).map(p=>`<option value="${attr(p.id)}">${esc(p.roster_name||p.display_name)}</option>`).join('')}</select></div>`:''}<div class="field"><label>Practice (optional)</label><select name="practice_id"><option value="">Not associated with a practice</option>${practicesForChallenge(c).map(p=>`<option value="${attr(p.id)}">${esc(fullDate(p.practice_date))} · ${esc(p.title)}</option>`).join('')}</select></div><div class="field"><label>Result in ${esc(c.metric_unit)}</label><input name="result_value" type="number" min="0" step="any" required></div><div class="field"><label>Observation (visible to the assigned player and coaches)</label><textarea name="notes"></textarea></div><div class="field"><label>Next practice emphasis</label><textarea name="next_focus"></textarea></div></form>`;footer=`<button class="btn redbtn" form="modal-form" type="submit">Save attempt</button>`}
    else if(type==='challengeResults'){const c=obj;heading=c.name+' · Results';if(isTeamChallenge(c)){const rows=practiceChallengeResults(c).filter(r=>isCoach()||r.status!=='pending');body=`<div class="stack">${trendChart(rows.filter(r=>r.status==='completed').slice().reverse().map(r=>({label:shortDate(practiceForResult(r)?.practice_date),value:r.result_value})),c.target_value,c.metric_unit)}${rows.length?rows.map(r=>{const p=practiceForResult(r);return `<div class="note-row"><div class="row between"><b>${esc(fullDate(p.practice_date))} · ${esc(p.title)}</b>${pill(r.status)}</div><p class="subtle">${r.status==='completed'?`${numberFormat(r.result_value)} / ${numberFormat(r.target_snapshot)} ${esc(r.metric_unit_snapshot)}`:r.status==='skipped'?'Not attempted':`Awaiting result · Target ${numberFormat(r.target_snapshot)}`}</p>${r.notes&&r.status!=='pending'?`<p class="subtle"><b>Coach observations:</b> ${esc(r.notes)}</p>`:''}${r.next_focus&&r.status!=='pending'?`<p class="subtle"><b>Next practice emphasis:</b> ${esc(r.next_focus)}</p>`:''}${isCoach()?`<button class="btn ghost slim" data-action="recordTeamPractice" data-challenge="${attr(c.id)}" data-practice="${attr(p.id)}">Edit this practice →</button>${r.status!=='pending'?`<button class="btn dangerbtn slim" data-action="clearTeamResult" data-id="${attr(r.id)}">Clear result</button>`:''}`:''}</div>`}).join(''):'<p class="subtle">No results yet. Each completed practice will build this history.</p>'}</div>`}else{const rows=records('challenge_results').filter(x=>x.challenge_id===c.id&&(isStaff()||x.player_id===userId())).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));body=`<div class="stack">${isCoach()?Array.from(new Set(rows.map(x=>x.player_id))).map(pid=>`<div class="section-label">${esc(playerName(pid))} · Individual Progress</div>${trendChart(rows.filter(x=>x.player_id===pid).slice().reverse().map(x=>({value:x.result_value,label:shortDate(x.practice_id?practiceForResult(x)?.practice_date:dateOf(x.created_at))})),c.target_value,c.metric_unit)}`).join(''):trendChart(rows.slice().reverse().filter(x=>x.player_id===userId()).map(x=>({value:x.result_value,label:shortDate(x.practice_id?practiceForResult(x)?.practice_date:dateOf(x.created_at))})),c.target_value,c.metric_unit)}${rows.map(r=>`<div class="note-row"><b>${esc(playerName(r.player_id))}: ${numberFormat(r.result_value)} ${esc(r.metric_unit_snapshot||c.metric_unit)}</b><p class="subtle">${esc(r.practice_id?fullDate(practiceForResult(r)?.practice_date):String(r.created_at).slice(0,10))}</p>${r.notes?`<p class="subtle">${esc(r.notes)}</p>`:''}${r.next_focus?`<p class="subtle"><b>Next practice:</b> ${esc(r.next_focus)}</p>`:''}${isCoach()?`<button class="btn dangerbtn slim" data-action="deleteIndividualResult" data-id="${attr(r.id)}">Delete attempt</button>`:''}</div>`).join('')||'<p class="subtle">No individual attempts logged yet.</p>'}</div>`}}
    else if(type==='practiceBenchmarks'){const p=obj;heading='Practice benchmarks · '+fullDate(p.practice_date);const cs=recurringForPractice(p);body=`<div class="stack">${cs.map(c=>challengeStatusLine(c,p)).join('')||'<p class="subtle">No recurring team challenges for this practice.</p>'}</div>`}
    else if(type==='newNotebookNote'){heading='Private Coaching Note';body=`<form id="modal-form" data-form="notebook" class="stack"><div class="field"><label>Team</label>${teamChooser(state.teamView==='both'?'varsity':state.teamView)}</div><div class="field"><label>Category</label><select name="category"><option value="general">General coaching</option><option value="player">Player evaluation</option><option value="scouting">Opponent scouting</option></select></div><div class="field"><label>Title</label><input name="title" maxlength="150" required></div><div class="field"><label>Player (optional)</label><select name="player_id"><option value="">Not player-specific</option>${records('profiles').filter(x=>x.role==='player').map(p=>`<option value="${attr(p.id)}">${esc(p.roster_name||p.display_name)}</option>`).join('')}</select></div><div class="field"><label>Opponent (optional)</label><input name="opponent"></div><div class="field"><label>Coach observation / report</label><textarea name="note" required></textarea></div></form>`;footer=`<button class="btn redbtn" form="modal-form" type="submit">Save private note</button>`}
    return `<div class="overlay" data-action="closeBackdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${attr(heading)}"><div class="modal-header"><h2>${esc(heading)}</h2><button class="btn iconbtn lightbtn" data-action="closeModal" aria-label="Close dialog">×</button></div><div class="modal-body">${body}</div><div class="modal-footer"><button class="btn ghost" data-action="closeModal">Close</button>${footer}</div></section></div>`;
  }
  // -----------------------------------------------------------------------
  // v0.4.4: Connected basketball learning, practice, evidence and competition.
  // -----------------------------------------------------------------------
  const SKILL_CATEGORIES=['All','Defense','Ball Handling','Shooting','Finishing','Rebounding','Passing','Post Play','Transition','Team Offense','Conditioning','Basketball IQ','General'];
  const EVIDENCE_BUCKET='sas-basketball-evidence';

  // -----------------------------------------------------------------------
  // v0.4.5 | Coach-managed Game Day media and private assignment attachments.
  // -----------------------------------------------------------------------
  const GAME_MEDIA_BUCKET='sas-basketball-game-media';
  const ASSIGNMENT_MEDIA_BUCKET='sas-basketball-assignment-media';
  const GAME_IMAGE_TYPES={'jpg':'image/jpeg','jpeg':'image/jpeg','png':'image/png','webp':'image/webp'};
  const ASSIGNMENT_MEDIA_TYPES={...GAME_IMAGE_TYPES,'pdf':'application/pdf','mp4':'video/mp4','mov':'video/quicktime'};
  function mediaForGame(gameId){return records('game_media').filter(m=>m.game_id===gameId).sort((a,b)=>Number(b.featured)-Number(a.featured)||String(a.created_at||'').localeCompare(String(b.created_at||'')))}
  function gameHeroPoster(g){return mediaForGame(g?.id).find(m=>m.media_kind==='image'&&m.media_phase==='preview'&&(isCoach()||m.published));}
  function assignmentMediaFor(assignmentId,playerId=null){return records('assignment_media').filter(m=>m.assignment_id===assignmentId && (playerId===null?m.player_id===null:m.player_id===playerId)).sort((a,b)=>String(a.created_at||'').localeCompare(String(b.created_at||'')))}
  function sanitizeMediaFiles(files,types,maxBytes,maxFiles){
    if(files.length>maxFiles)throw Error(`Select no more than ${maxFiles} files at a time.`);
    for(const file of files){const ext=file.name.split('.').pop().toLowerCase();if(!types[ext])throw Error('Unsupported file: '+file.name);
      if(file.size<1||file.size>maxBytes)throw Error(`File must be 1 byte to ${Math.round(maxBytes/1048576)} MB: ${file.name}`)}
  }
  function gameMediaItem(m){
    if(m.media_kind==='video_link'){const url=safeHttpUrl(m.external_url);return url?`<a class="v045-media-link" href="${attr(url)}" target="_blank" rel="noopener noreferrer">▶ ${esc(m.caption||m.file_name||'Watch video')} ↗</a>`:''}
    return `<div class="v045-image-tile"><div class="v045-image-frame"><img data-v045-bucket="game" data-v045-media="${attr(m.id)}" alt="${attr(m.caption||m.file_name||'Game poster')}" loading="lazy" hidden/><div class="v045-image-status">Loading game image…</div></div><p class="subtle">${esc(m.caption||m.file_name||'Game image')}</p><button class="btn ghost slim" data-action="openGameMedia" data-id="${attr(m.id)}">View image</button></div>`;
  }
  function gameMediaGallery(g){const items=mediaForGame(g.id).filter(m=>isCoach()||m.published);return items.length?`<div class="v045-media-gallery">${items.map(gameMediaItem).join('')}</div>`:''}
  function gamePosterHero(g){const poster=gameHeroPoster(g);return poster?`<div class="v045-featured-poster"><img data-v045-bucket="game" data-v045-media="${attr(poster.id)}" alt="${attr(poster.caption||'Game matchup poster')}" hidden/><div class="v045-image-status">Loading matchup graphic…</div></div>`:'';}
  function assignmentMediaItem(m){if(m.media_kind==='link'){const url=safeHttpUrl(m.external_url);return url?`<a class="v045-media-link" href="${attr(url)}" target="_blank" rel="noopener noreferrer">↗ ${esc(m.caption||m.file_name||'Open instructional link')}</a>`:''}
    return `<div class="v045-attachment-row">${m.media_kind==='image'?`<div class="v045-attachment-preview"><img data-v045-bucket="assignment" data-v045-media="${attr(m.id)}" alt="${attr(m.caption||m.file_name)}" hidden/><span class="v045-image-status">Image preview…</span></div>`:`<span class="v045-file-mark">${m.media_kind==='video'?'▶':'▤'}</span>`}<div class="v045-attachment-details"><strong>${esc(m.caption||m.file_name)}</strong><span class="subtle">${esc(m.file_name||m.media_kind)}</span></div><button class="btn ghost slim" data-action="openAssignmentMedia" data-id="${attr(m.id)}">Open</button></div>`;
  }
  function assignmentMediaList(a,playerId=null){const media=assignmentMediaFor(a.id,playerId);return `<div class="v045-attachment-list">${media.length?media.map(m=>`<div class="v045-attachment-item">${assignmentMediaItem(m)}${(isCoach() || (m.player_id===userId() && state.role==='player'))?`<button class="btn dangerbtn slim" data-action="removeAssignmentMedia" data-id="${attr(m.id)}">Remove</button>`:''}</div>`).join(''):'<p class="subtle">No attachments yet.</p>'}</div>`;}
  function newMediaForm(title,formType,accept,extra=''){return `<form id="modal-form" data-form="${formType}" class="stack"><p class="subtle">${esc(title)}</p>${extra}<div class="field"><label>Upload files (optional)</label><input type="file" name="media_files" accept="${attr(accept)}" multiple/><small class="subtle">${formType==='gameMedia'?'JPG, PNG or WebP only, maximum 10 MB per image. Use external links for videos.':'Images, PDFs or short MP4/MOV videos, maximum 20 MB per file. Share larger videos through links.'}</small></div><div class="field"><label>Video or resource link (optional)</label><input type="url" name="external_url" placeholder="https://…"/></div><div class="field"><label>Caption / what to look for (optional)</label><input name="caption" maxlength="200" placeholder="What should players notice?"/></div></form>`}
  async function saveUploadedMedia(bucket,table,foreignKey,foreignId,files,types,maxBytes,ownerId=null,options={}){
    if(!files.length)return;
    if(!LIVE)throw Error('Uploading local files requires the live app. Links work in the demo.');
    sanitizeMediaFiles(files,types,maxBytes,5);
    let fileIndex=0;
    for(const file of files){
      const ext=file.name.split('.').pop().toLowerCase();const name=file.name.replace(/[^A-Za-z0-9._-]/g,'_').slice(-90);
      const path=bucket===GAME_MEDIA_BUCKET?`${foreignId}/${id()}-${name}`:`${ownerId?'players/'+ownerId:'coaches'}/${foreignId}/${id()}-${name}`;
      const mime=types[ext];const {error:uploadError}=await supabase.storage.from(bucket).upload(path,file,{contentType:mime,upsert:false});
      if(uploadError)throw Error(`Cannot upload ${file.name}: ${uploadError.message}`);
      const mediaKind=bucket===GAME_MEDIA_BUCKET?'image':(mime.startsWith('image/')?'image':mime.startsWith('video/')?'video':'document');
      const row={id:id(),[foreignKey]:foreignId,media_kind:mediaKind,storage_path:path,external_url:null,file_name:file.name,mime_type:mime,file_size:file.size,caption:options.caption||'',uploaded_by:userId()};
      if(bucket===GAME_MEDIA_BUCKET){row.media_phase=options.phase||'preview';row.featured=Boolean(options.featured)&&fileIndex===0;row.published=true}
      else row.player_id=ownerId;
      try{await saveRow(table,row);fileIndex++}catch(error){await supabase.storage.from(bucket).remove([path]);throw Error(`Cannot save the file record: ${error.message||error}`)}
    }
  }
  async function createMediaLink(table,foreignKey,foreignId,url,caption,ownerId=null,options={}){
    const valid=safeHttpUrl(url);if(!valid)throw Error('Enter a valid HTTP(S) link.');
    const row={id:id(),[foreignKey]:foreignId,media_kind:table==='game_media'?'video_link':'link',storage_path:null,external_url:valid,file_name:caption||'External link',caption:caption||'',uploaded_by:userId()};
    if(table==='game_media')Object.assign(row,{media_phase:options.phase||'preview',featured:false,published:true});
    else row.player_id=ownerId;
    await saveRow(table,row);
  }
  async function loadV045Previews(){
    if(!LIVE || !supabase)return;
    const nodes=[...ROOT.querySelectorAll('img[data-v045-media]')];
    const cache=new Map();
    await Promise.all(nodes.map(async node=>{
      const type=node.dataset.v045Bucket,table=type==='game'?'game_media':'assignment_media',bucket=type==='game'?GAME_MEDIA_BUCKET:ASSIGNMENT_MEDIA_BUCKET;
      const m=records(table).find(x=>x.id===node.dataset.v045Media);if(!m?.storage_path)return;
      let signed=cache.get(bucket+'/'+m.storage_path);
      if(!signed){const {data,error}=await supabase.storage.from(bucket).createSignedUrl(m.storage_path,240);
        if(error||!data?.signedUrl){if(node.isConnected){const st=node.parentElement?.querySelector('.v045-image-status');if(st)st.textContent='Preview unavailable. Open the file or contact a coach.'}return;}
        signed=data.signedUrl;cache.set(bucket+'/'+m.storage_path,signed);
      }
      if(!node.isConnected)return;
      node.onload=()=>{if(!node.isConnected)return;node.hidden=false;const st=node.parentElement?.querySelector('.v045-image-status');if(st)st.hidden=true};
      node.onerror=()=>{node.hidden=true;const st=node.parentElement?.querySelector('.v045-image-status');if(st){st.hidden=false;st.textContent='Image unavailable';}};
      node.src=signed;
    }));
  }
  function v045Modal(type,obj){let heading='',body='',footer='';
    if(type==='manageGameMedia'){
      const g=obj;heading=`Game Media · ${g.opponent}`;
      const files=mediaForGame(g.id);
      body=`<div class="stack"><p class="subtle">Upload matchup posters and postgame graphics from your camera roll or computer, or add a video link. Only coaches may publish or remove game media.</p>${files.map(m=>`<div class="note-row"><div class="row between"><b>${esc(m.caption||m.file_name||m.media_kind)}</b>${pill(m.media_phase)}</div><p class="subtle">${esc(m.media_kind)}</p><button class="btn dangerbtn slim" data-action="removeGameMedia" data-id="${attr(m.id)}">Remove media</button></div>`).join('')||'<p class="subtle">No media for this game yet.</p>'}${newMediaForm('Add game media','gameMedia','.png,.jpg,.jpeg,.webp',`<div class="field"><label>Display as</label><select name="media_phase"><option value="preview">Matchup preview / upcoming game</option><option value="recap">Postgame recap</option></select></div><label class="choice"><input type="checkbox" name="featured" checked/> Feature this image on the next-game panel</label>`)}</div>`;
      footer=`<button class="btn redbtn" form="modal-form" type="submit">Add game media</button>`;
    }else if(type==='manageAssignmentMedia'){
      const a=obj;heading='Assignment Materials · '+a.title;
      body=`<div class="stack"><p class="subtle">Instructional materials are visible to players when this assignment is published to their team.</p>${assignmentMediaList(a)}${newMediaForm('Add instructor images, PDFs, short clips, or a reference link','assignmentCoachMedia','.png,.jpg,.jpeg,.webp,.pdf,.mp4,.mov')}</div>`;
      footer=`<button class="btn redbtn" form="modal-form" type="submit">Add materials</button>`;
    }else if(type==='reviewAssignmentEvidence'){
      const r=obj;const a=records('assignments').find(x=>x.id===r.assignment_id);heading='Student Submission · '+(a?.title||'Assignment');
      body=`<div class="stack"><p><b>${esc(playerName(r.player_id))}</b> · ${esc(a?.title||'')}</p><div class="notices">${esc(r.response)}</div><div class="section-label">PLAYER EVIDENCE</div>${a?assignmentMediaList(a,r.player_id):''}</div>`;
    }else return '';
    return `<div class="overlay" data-action="closeBackdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${attr(heading)}"><div class="modal-header"><h2>${esc(heading)}</h2><button class="btn iconbtn lightbtn" data-action="closeModal" aria-label="Close dialog">×</button></div><div class="modal-body">${body}</div><div class="modal-footer"><button class="btn ghost" data-action="closeModal">Close</button>${footer}</div></section></div>`;
  }

  function safeHttpUrl(value){try{const u=new URL(String(value||'').trim());return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
  function categoryOptions(selected='General'){return SKILL_CATEGORIES.filter(c=>c!=='All').map(c=>`<option ${selected===c?'selected':''}>${esc(c)}</option>`).join('')}
  function dateOf(timestamp){return String(timestamp||'').slice(0,10)}
  function playerPlanRows(playerId){return records('training_plans').filter(p=>p.player_id===playerId && !p.archived).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)))}
  function planSessions(planId){return records('training_sessions').filter(s=>s.plan_id===planId).sort((a,b)=>String(a.session_date).localeCompare(String(b.session_date))||String(a.created_at).localeCompare(String(b.created_at)))}
  function planResultText(plan){const sessions=planSessions(plan.id);return sessions.length?`${numberFormat(sessions.at(-1).result_value)} ${esc(plan.metric_unit)} latest · ${sessions.length} sessions`:'No sessions logged yet'}
  function trainingEvidenceFor(sessionId){return records('training_evidence').filter(e=>e.session_id===sessionId)}
  function isMyTrainingPlan(plan){return state.role==='player' && plan?.player_id===userId()}
  function trendChart(rows,target,unit,direction='higher'){
    const items=rows.filter(r=>Number.isFinite(Number(r.value)) && r.value!==null && r.value!==undefined).slice(-15);
    if(!items.length)return '<div class="empty">Log a result to start your progress graph.</div>';
    const nums=items.map(r=>Number(r.value)),max=Math.max(1,Number(target)||0,...nums),min=Math.min(0,...nums);
    const height=94,plotY=v=>118-((v-min)/(max-min||1))*height;
    const cx=i=>items.length===1?245:36+(418*i/(items.length-1));
    const coords=items.map((r,i)=>`${cx(i)},${plotY(Number(r.value))}`).join(' ');
    const desired=Number(target),hasTarget=target!==null&&target!==undefined&&Number.isFinite(desired);
    const targetY=hasTarget?plotY(desired):null;
    return `<div class="v044-chart" role="region" aria-label="Performance history"><div class="row between"><b>Progress over time</b><span class="subtle">${esc(direction==='lower'?'Lower is better':'Higher is better')}</span></div>
    <svg viewBox="0 0 490 150" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Results chart with ${items.length} recorded session(s)">
    <line x1="36" y1="118" x2="454" y2="118" stroke="currentColor" stroke-opacity=".25"/>
    ${hasTarget?`<line x1="36" y1="${targetY}" x2="454" y2="${targetY}" stroke="#7f8793" stroke-dasharray="5 5"/><text x="452" y="${Math.max(12,targetY-6)}" fill="currentColor" font-size="10" text-anchor="end">TARGET ${esc(numberFormat(target))}</text>`:''}
    ${items.length>1?`<polyline fill="none" stroke="#CE2028" stroke-width="3" points="${coords}"/>`:''}
    ${items.map((r,i)=>`<circle cx="${cx(i)}" cy="${plotY(Number(r.value))}" r="5" fill="#CE2028"><title>${esc(r.label)}: ${numberFormat(r.value)} ${esc(unit)}</title></circle><text x="${cx(i)}" y="${Math.max(12,plotY(Number(r.value))-9)}" fill="currentColor" font-size="10" text-anchor="middle">${esc(numberFormat(r.value))}</text>`).join('')}
    </svg><div class="row between"><small>${esc(items[0].label)}</small><small>${items.length>1?esc(items.at(-1).label):'First recorded result'}</small></div>
    <div class="v044-table-wrap"><table class="v044-table"><thead><tr><th>Date</th><th>Result</th><th>Target</th></tr></thead><tbody>${items.slice().reverse().map(r=>`<tr><td>${esc(r.label)}</td><td>${numberFormat(r.value)} ${esc(unit)}</td><td>${hasTarget?numberFormat(target):'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
  }
  function personalPlanCard(plan,coachView=false){
    const data=planSessions(plan.id);const rows=data.map(s=>({value:s.result_value,label:shortDate(s.session_date)}));
    return `<div class="card v044-plan"><div class="row between"><span class="eyebrow">${esc(plan.category)} · PERSONAL DEVELOPMENT</span><span class="pill">${data.length} session(s)</span></div>
    <h3>${esc(plan.title)}</h3><p class="subtle">${esc(plan.description||'Individual training activity')}</p><p><b>Target: ${numberFormat(plan.target_value)} ${esc(plan.metric_unit)}</b> · ${plan.direction==='lower'?'Lower is better':'Higher is better'}</p>
    ${trendChart(rows,plan.target_value,plan.metric_unit,plan.direction)}
    <div class="row wrap v044-action-row">${!coachView&&isMyTrainingPlan(plan)?`<button class="btn redbtn slim" data-action="logTraining" data-id="${attr(plan.id)}">+ Log workout</button><button class="btn ghost slim" data-action="requestFeedback" data-plan="${attr(plan.id)}">Request feedback</button>`:''}
    <button class="btn lightbtn slim" data-action="planHistory" data-id="${attr(plan.id)}">Workout evidence & history</button></div></div>`;
  }
  function v044PlayerPlans(){const plans=playerPlanRows(userId());return `<div class="v044-section stack"><div class="row between"><div><div class="section-heading">My measurable training</div><p class="subtle">Create activities, log results, and learn from incremental improvement.</p></div><button class="btn redbtn slim" data-action="newTrainingPlan">+ Training activity</button></div>
   <div class="grid2">${plans.map(p=>personalPlanCard(p)).join('')||'<div class="empty">Create a measurable training activity to begin tracking your own progress.</div>'}</div>
   <div class="card"><div class="row between"><div class="section-heading">My coaching conversations</div><button class="btn lightbtn slim" data-action="requestFeedback">Ask a coach</button></div>${feedbackQueue(false)}</div></div>`}
  function v044CoachDevelopment(){const players=playerFilter(records('profiles'));const requests=records('feedback_requests').filter(r=>players.some(p=>p.id===r.player_id));const active=new Set(records('training_sessions').map(s=>s.player_id));
   return `<div class="stack v044-section">${title('Player Development Overview','Registered players, measurable training, and coaching requests in one place.')}<div class="grid4 stat-grid">${metric('Roster accounts',players.length)}${metric('Profiles activated',players.filter(p=>p.display_name!=='New Player').length)}${metric('Players logging workouts',players.filter(p=>active.has(p.id)).length)}${metric('Open feedback requests',requests.filter(r=>r.status==='open').length)}</div>
   <div class="card"><div class="row between"><div class="section-heading">Shared Feedback Queue</div><span class="pill">${requests.filter(r=>r.status==='open').length} awaiting response</span></div><p class="subtle">Any coach may respond. Every coach sees the reply and who provided it. Players see only their own conversations.</p>${feedbackQueue(true)}</div>
   <div class="card"><div class="row between"><div class="section-heading">Roster and recorded development</div><span class="pill">${esc(teamName(state.teamView))}</span></div><p class="subtle">Absence of recorded activity is not evidence that a player isn't training.</p>
    <div class="v044-table-wrap"><table class="v044-table"><thead><tr><th>Player</th><th>Team</th><th>PIN activated</th><th>Training plans</th><th>Sessions logged</th><th>Last recorded workout</th><th></th></tr></thead><tbody>${players.map(p=>{const sessions=records('training_sessions').filter(s=>s.player_id===p.id).sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));return `<tr><td><strong>${esc(p.roster_name||p.display_name)}</strong></td><td>${esc(teamName(p.team_id))}</td><td>${p.display_name==='New Player'?'Not yet':'Yes'}</td><td>${playerPlanRows(p.id).length}</td><td>${sessions.length}</td><td>${sessions.length?esc(shortDate(sessions[0].session_date)):'No result entered'}</td><td><button class="btn ghost slim" data-action="playerPortfolio" data-id="${attr(p.id)}">Portfolio</button></td></tr>`}).join('')}</tbody></table></div></div></div>`;
  }
  function feedbackQueue(coach){const visible=records('feedback_requests').filter(r=>coach?playerFilter(records('profiles')).some(p=>p.id===r.player_id):r.player_id===userId()).sort((a,b)=>(a.status==='open'?0:1)-(b.status==='open'?0:1)||String(b.created_at).localeCompare(String(a.created_at)));
    return `<div class="v044-feedback-list">${visible.map(r=>{const msgs=records('feedback_messages').filter(m=>m.request_id===r.id);const last=msgs.at(-1);return `<div class="note-row"><div class="row between"><b>${coach?esc(playerName(r.player_id))+' · ':''}${esc(r.topic)}</b>${pill(r.status==='open'?'Awaiting feedback':'Responded')}</div><p class="subtle">${esc(r.question)}</p><small>${esc(shortDate(dateOf(r.created_at)))} · ${last?`Latest reply: ${esc(last.author_display_name||'Coach')}`:'No responses yet'}</small><div><button class="btn ghost slim" data-action="feedbackThread" data-id="${attr(r.id)}">Open conversation →</button></div></div>`}).join('')||'<p class="subtle">No feedback requests in this view.</p>'}</div>`;
  }
  function v044Resources(){const player=state.role==='player';const section=state.resourceSection||'essentials';let items=records('resources').filter(r=>r.library_section===section && (isStaff()||r.review_status==='approved'&&r.published||r.uploaded_by===userId()));
    if(section==='skill')items=items.filter(r=>r.team_scope==='both' || isCoach()||r.uploaded_by===userId());
    else items=items.filter(r=>isStaff()||(!r.staff_only&&scopeVisible(r)));
    if(section==='skill'&&state.resourceCategory!=='All')items=items.filter(r=>r.skill_category===state.resourceCategory);
    if(state.search)items=items.filter(r=>[r.title,r.description,r.skill_category].join(' ').toLowerCase().includes(state.search.toLowerCase()));
    items.sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    const queue=isCoach()?records('resources').filter(r=>r.review_status==='pending'&&r.library_section==='skill').length:0;
    return `<div class="stack">${title('Resource Library','Learn together. Turn ideas into drills, practices, and measurable development.',`<button class="btn redbtn" data-action="newResource">${isCoach()?'+ Add resource':'+ Submit a resource'}</button>`)}
    <div class="v044-tabs"><button class="btn ${section==='essentials'?'redbtn':'lightbtn'}" data-action="resourceTab" data-section="essentials">Team Essentials</button><button class="btn ${section==='skill'?'redbtn':'lightbtn'}" data-action="resourceTab" data-section="skill">Skill Library</button></div>
    <p class="subtle">${section==='essentials'?'Official team documents, travel information and required review. Coaches publish these materials.':'Instructional links and resources shared across JV and Varsity. Player submissions require coach approval.'}</p>
    ${section==='skill'?`<div class="v044-category-filter">${SKILL_CATEGORIES.map(c=>`<button class="filterbtn ${state.resourceCategory===c?'selected':''}" data-action="resourceCategory" data-category="${attr(c)}">${esc(c)}</button>`).join('')}</div>`:''}
    <input class="search" data-resource-search value="${attr(state.search||'')}" placeholder="Search resources" aria-label="Search resources"/>
    ${section==='skill'&&queue&&isCoach()?`<div class="notices"><b>${queue} player submission(s) awaiting review</b>. Approve or reject from the resources below.</div>`:''}
    <div class="grid3">${items.map(r=>v044ResourceCard(r)).join('')||'<div class="empty">No resources in this section yet.</div>'}</div>
    ${player&&section==='skill'?'<p class="subtle">Your own submissions remain visible to you while awaiting approval. Approved contributions become available to both teams.</p>':''}</div>`;
  }
  function v044ResourceCard(r){const waiting=r.review_status==='pending';const acknowledged=records('resource_reviews').some(x=>x.resource_id===r.id&&x.player_id===userId());
    return `<div class="card drill-card"><div><div class="row wrap"><span class="pill">${esc(r.library_section==='essentials'?'Team Essentials':'Skill Library')}</span>${r.required_review?'<span class="pill">Required review</span>':''}${waiting?'<span class="pill">Pending approval</span>':''}${r.review_status==='rejected'?'<span class="pill">Not approved</span>':''}</div>
    <h3 style="margin:12px 0 8px">${esc(r.title)}</h3><p class="tagline">${esc(r.skill_category||'General')} · ${r.resource_type==='file'?'DOCUMENT':'LINK'} · ${esc(teamName(r.team_scope))}</p><p>${esc(r.description||'')}</p>
    <p class="subtle">Shared by ${esc(r.contributor_label||'Program member')}</p></div><footer class="row wrap"><button class="btn ghost slim" data-action="openResource" data-id="${attr(r.id)}">Open resource ↗</button>
    ${isCoach()?`<button class="btn ghost slim" data-action="fromResource" data-id="${attr(r.id)}">Create drill</button>${waiting?`<button class="btn redbtn slim" data-action="reviewResource" data-id="${attr(r.id)}" data-decision="approved">Approve</button><button class="btn lightbtn slim" data-action="reviewResource" data-id="${attr(r.id)}" data-decision="rejected">Reject</button>`:''}<button class="btn dangerbtn slim" data-action="deleteResource" data-id="${attr(r.id)}">Remove</button>`:''}
    ${state.role==='player'&&r.library_section==='essentials'&&r.required_review&&!acknowledged?`<button class="btn redbtn slim" data-action="markResourceReviewed" data-id="${attr(r.id)}">Mark reviewed</button>`:''}
    ${state.role==='player'&&acknowledged?'<span class="pill">Reviewed</span>':''}</footer></div>`;
  }

  function visibleTournaments(){return records('tournaments').filter(t=>(isStaff()?state.teamView==='both'||t.team_scope===state.teamView:t.team_scope===state.profile?.team_id)&&(isStaff()||t.published));}
  function tournamentGames(t){return records('games').filter(g=>g.tournament_id===t.id);}
  function tournamentRows(t){return (Array.isArray(t.itinerary)?t.itinerary:[]).slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.time||'').localeCompare(String(b.time||'')));}
  function eventDay(date){return fullDate(date);}
  function tournamentCard(t){
    const days=new Map(),games=tournamentGames(t);
    for(const item of tournamentRows(t)){
      if(!days.has(item.date))days.set(item.date,[]);
      const g=item.kind==='game'?games.find(x=>x.tournament_item_id===item.id):null;
      days.get(item.date).push({item,g});
    }
    const now=today(),label=t.end_date<now?'Past tournament':t.start_date>now?'Upcoming tournament':'Tournament in progress';
    const dayRows=[...days].map(([date,items])=>`<div class="v045-tour-day"><div class="v045-tour-date">${esc(eventDay(date))}</div><div class="v045-tour-dayitems">${items.map(({item,g})=>`<div class="v045-tour-line"><span class="v045-tour-kind ${attr(item.kind)}">${esc(item.kind==='game'?'GAME':item.kind==='travel'?'TRAVEL':'EVENT')}</span><div class="v045-tour-info"><b>${esc(item.time?clockText(String(item.time).slice(0,5))+' · ':'')}${esc(item.kind==='game'?'SAS vs '+(g?.opponent||item.title||'TBA'):item.title||'Team event')}</b>${item.location?`<small>${esc(item.location)}</small>`:''}${item.notes?`<small>${esc(item.notes)}</small>`:''}${g?.status==='completed'?`<small class="v045-tour-score">Final: SAS ${Number(g.sas_score)} - ${Number(g.opponent_score)} ${esc(g.opponent)}</small>`:''}${g&&gameMediaGallery(g)?`<div class="v045-tour-media">${gameMediaGallery(g)}</div>`:''}${g?`<div class="row wrap">${isCoach()?`<button class="btn ghost slim" data-action="tournamentResult" data-id="${attr(g.id)}">Game result/details</button><button class="btn lightbtn slim" data-action="manageGameMedia" data-id="${attr(g.id)}">Game media</button>${g.status==='completed'?`<button class="btn lightbtn slim" data-action="gameStats" data-id="${attr(g.id)}">Enter player stats</button>`:''}`:''}<button class="btn ghost slim" data-action="gameStatsView" data-id="${attr(g.id)}">${isCoach()?'Box scores':'My stats'}</button></div>`:''}</div></div>`).join('')}</div></div>`).join('');
    return `<article class="card v045-tournament-card"><div class="row between wrap"><span class="eyebrow">${esc(teamName(t.team_scope))} · ${esc(label)}</span><span class="pill">${days.size} days · ${games.length} games</span></div><h3>${esc(t.title)}</h3><p class="subtle">${esc(eventDay(t.start_date))} to ${esc(eventDay(t.end_date))}${t.location?' · '+esc(t.location):''}</p>${t.notes?`<p>${esc(t.notes)}</p>`:''}<div class="v045-tour-days">${dayRows||'<p class="subtle">Schedule to be announced.</p>'}</div>${isCoach()?`<div class="row wrap"><button class="btn lightbtn slim" data-action="editTournament" data-id="${attr(t.id)}">Edit tournament / itinerary</button></div>`:''}</article>`;
  }
  function tournamentRowInput(item={}){
    const date=item.date||today(),kind=['travel','game','event'].includes(item.kind)?item.kind:'game',name=item.title||'';
    return `<div class="v045-tournament-item" data-tournament-item><input type="hidden" data-ti-id value="${attr(item.id||id())}"><div class="row between"><b class="small">Schedule item</b><button class="btn dangerbtn slim" type="button" data-action="removeTournamentItem">Remove</button></div><div class="form-grid"><div class="field"><label>Date</label><input data-ti-date type="date" value="${attr(date)}" required/></div><div class="field"><label>Type</label><select data-ti-kind><option value="game" ${kind==='game'?'selected':''}>Game</option><option value="travel" ${kind==='travel'?'selected':''}>Travel day / transfer</option><option value="event" ${kind==='event'?'selected':''}>Meeting / team activity / rest</option></select></div></div><div class="form-grid"><div class="field"><label>Time (optional)</label><input data-ti-time type="time" value="${attr(String(item.time||'').slice(0,5))}"/></div><div class="field"><label>Opponent or activity description</label><input data-ti-title maxlength="150" value="${attr(name)}" placeholder="Opponent TBA / Depart Shanghai"/></div></div><div class="form-grid"><div class="field"><label>Location (optional)</label><input data-ti-location maxlength="180" value="${attr(item.location||'')}"/></div><div class="field"><label>Notes (optional)</label><input data-ti-notes maxlength="300" value="${attr(item.notes||'')}" placeholder="Travel details or game instructions"/></div></div></div>`;
  }
  function tournamentModal(t){
    t=t||{};const edit=Boolean(t.id),items=t.itinerary?.length?t.itinerary:[];
    return `<div class="overlay" data-action="closeBackdrop"><section class="modal v045-tournament-modal" role="dialog" aria-modal="true" aria-label="${edit?'Edit tournament':'Schedule multi-day tournament'}"><div class="modal-header"><h2>${edit?'Edit Tournament':'Schedule Tournament / Multi-day Event'}</h2><button class="btn iconbtn lightbtn" data-action="closeModal">×</button></div><div class="modal-body"><form id="modal-form" data-form="tournament" class="stack"><p class="subtle">One tournament entry covers the full trip. Add any number of games per day and mark travel, rest, and team-activity days. Individual games keep their own results, media, and player stats.</p><div class="form-grid"><div class="field"><label>Team</label>${teamChooser(t.team_scope||(state.teamView==='jv'?'jv':'varsity'))}</div><div class="field"><label>Tournament / event name</label><input required name="title" maxlength="150" value="${attr(t.title||'')}" placeholder="HKIS Invitational"/></div></div><div class="form-grid"><div class="field"><label>First day (including travel)</label><input name="start_date" type="date" required value="${attr(t.start_date||today())}"/></div><div class="field"><label>Last day (including travel)</label><input name="end_date" type="date" required value="${attr(t.end_date||today())}"/></div></div><div class="field"><label>Location / venue</label><input name="location" value="${attr(t.location||'')}" maxlength="180" placeholder="Hong Kong"/></div><div class="field"><label>General trip notes</label><textarea name="notes" placeholder="Tournament format, travel information, expectations">${esc(t.notes||'')}</textarea></div><div class="section-label">DAILY ITINERARY</div><p class="subtle">Use Generate Days to build one editable row for each calendar day. Add another game row when there are two or more games on the same date. Times and opponents can be left TBA.</p><div class="row wrap"><button type="button" class="btn lightbtn slim" data-action="generateTournamentDays">Generate date rows</button><button type="button" class="btn ghost slim" data-action="addTournamentItem">+ Add game / travel / activity</button></div><div data-tournament-items class="v045-tournament-items">${items.map(tournamentRowInput).join('')}</div><label class="choice"><input type="checkbox" name="published" ${!edit||t.published?'checked':''}/> Publish itinerary and games to players</label></form></div><div class="modal-footer"><button class="btn ghost" data-action="closeModal">Close</button><button class="btn redbtn" type="submit" form="modal-form">${edit?'Save tournament changes':'Save entire tournament'}</button></div></section></div>`;
  }
  function tournamentResultModal(g){return `<div class="overlay" data-action="closeBackdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="Tournament game result"><div class="modal-header"><h2>Tournament Game · ${esc(g.opponent)}</h2><button class="btn iconbtn lightbtn" data-action="closeModal">×</button></div><div class="modal-body"><form id="modal-form" data-form="tournamentResult" class="stack"><p class="subtle">${esc(fullDate(g.game_date))} · ${esc(clockText(String(g.tipoff_time||'').slice(0,5))||'Time TBA')}. To change the opponent, date, or tipoff, edit the tournament itinerary.</p><div class="field"><label>Status</label><select name="status"><option value="scheduled" ${g.status==='scheduled'?'selected':''}>Scheduled</option><option value="completed" ${g.status==='completed'?'selected':''}>Completed</option><option value="cancelled" ${g.status==='cancelled'?'selected':''}>Cancelled</option></select></div><div class="form-grid"><div class="field"><label>SAS final score</label><input type="number" min="0" name="sas_score" value="${attr(g.sas_score??'')}" /></div><div class="field"><label>Opponent final score</label><input type="number" min="0" name="opponent_score" value="${attr(g.opponent_score??'')}" /></div></div><div class="field"><label>Player-facing game summary</label><textarea name="summary">${esc(g.summary||'')}</textarea></div></form></div><div class="modal-footer"><button class="btn ghost" data-action="closeModal">Close</button><button class="btn redbtn" form="modal-form" type="submit">Save result</button></div></section></div>`}
  function itineraryFromForm(form){return [...form.querySelectorAll('[data-tournament-item]')].map(node=>({id:node.querySelector('[data-ti-id]').value,date:node.querySelector('[data-ti-date]').value,kind:node.querySelector('[data-ti-kind]').value,time:node.querySelector('[data-ti-time]').value,title:node.querySelector('[data-ti-title]').value.trim(),location:node.querySelector('[data-ti-location]').value.trim(),notes:node.querySelector('[data-ti-notes]').value.trim()}));}
  function teamGames(){return records('games').filter(g=>(isStaff()?state.teamView==='both'||g.team_scope===state.teamView:g.team_scope===state.profile?.team_id) &&(isStaff()||g.published));}
  function gameTimeMillis(g){const date=String(g.game_date||'');const tm=String(g.tipoff_time||'17:00').slice(0,5);return Date.parse(`${date}T${tm}:00+08:00`)}
  function gameCountdown(g){if(!g)return '<div class="empty">The next opponent will appear here when a game is scheduled.</div>';const remaining=Math.max(0,gameTimeMillis(g)-Date.now());const days=Math.floor(remaining/86400000),hours=Math.floor(remaining%86400000/3600000),mins=Math.floor(remaining%3600000/60000);
    return `<div class="v044-next-game">${gamePosterHero(g)}${g.tournament_id?`<p class="v045-tournament-next">Tournament game · ${esc(records('tournaments').find(t=>t.id===g.tournament_id)?.title||g.event_name||'Multi-day event')}</p>`:''}<div class="eyebrow">NEXT OPPONENT · ${esc(teamName(g.team_scope))}</div><h3>SAS Eagles <span>vs</span> ${esc(g.opponent)}</h3><p>${esc(fullDate(g.game_date))} · ${esc(clockText(String(g.tipoff_time||'').slice(0,5))||'Time TBA')} · ${esc(g.location||g.venue)}</p>
    <div class="v044-countdown" aria-label="Countdown to next game"><div><b>${days}</b><small>days</small></div><div><b>${String(hours).padStart(2,'0')}</b><small>hours</small></div><div><b>${String(mins).padStart(2,'0')}</b><small>minutes</small></div></div></div>`;
  }
  function gameCard(g){const complete=g.status==='completed',cancel=g.status==='cancelled';return `<div class="card v044-game-card"><div class="row between"><span class="eyebrow">${esc(teamName(g.team_scope))} · ${esc(g.venue)}</span>${pill(g.status)}</div><h3>${esc(g.opponent)}</h3><p class="subtle">${esc(fullDate(g.game_date))} · ${esc(g.tipoff_time?clockText(String(g.tipoff_time).slice(0,5)):'Time TBA')} · ${esc(g.location||'Venue TBA')}</p>${g.event_name?`<p class="subtle">${esc(g.event_name)}</p>`:''}${gameMediaGallery(g)}
    ${complete?`<h2 class="v044-score">SAS ${g.sas_score} : ${g.opponent_score} Opponent</h2>`:''}${cancel?'<p class="subtle">Game cancelled</p>':''}
    ${g.summary?`<p>${esc(g.summary)}</p>`:''}<div class="row wrap">${isCoach()?`<button class="btn ghost slim" data-action="editGame" data-id="${attr(g.id)}">Edit game</button><button class="btn lightbtn slim" data-action="manageGameMedia" data-id="${attr(g.id)}">Manage media</button>${complete?`<button class="btn lightbtn slim" data-action="gameStats" data-id="${attr(g.id)}">Enter player stats</button>`:''}`:''}<button class="btn ghost slim" data-action="gameStatsView" data-id="${attr(g.id)}">${isCoach()?'Box scores':'My game stats'}</button></div></div>`}
  function seasonStatPanel(playerId){const gamesById=new Map(records('games').map(g=>[g.id,g]));const metric=state.statMetric||'points';const rows=records('game_player_stats').filter(r=>r.player_id===playerId&&gamesById.has(r.game_id)).sort((a,b)=>String(gamesById.get(a.game_id).game_date).localeCompare(String(gamesById.get(b.game_id).game_date))).map(r=>({label:shortDate(gamesById.get(r.game_id).game_date),value:r[metric]}));return `<div class="card"><div class="section-heading">${isCoach()?esc(playerName(playerId))+' · ':''}Individual Game Development</div><p class="subtle">Private to the player and coaching staff. Statistics are manually entered by coaches.</p><div class="v044-category-filter">${[['points','Points'],['rebounds','Rebounds'],['assists','Assists'],['steals','Steals'],['turnovers','Turnovers']].map(([key,label])=>`<button class="filterbtn ${metric===key?'selected':''}" data-action="statMetric" data-metric="${key}">${label}</button>`).join('')}</div>${trendChart(rows,null,metric,metric==='turnovers'?'lower':'higher')}</div>`}
  function gameCenter(){const all=teamGames().sort((a,b)=>a.game_date.localeCompare(b.game_date)||String(a.tipoff_time).localeCompare(String(b.tipoff_time)));const next=all.filter(g=>g.status==='scheduled'&&gameTimeMillis(g)>=Date.now()-3600000)[0];const games=all.filter(g=>!g.tournament_id),up=games.filter(g=>g.status==='scheduled'&&gameTimeMillis(g)>=Date.now()-3600000),past=games.filter(g=>g.status!=='scheduled'||gameTimeMillis(g)<Date.now()-3600000).reverse();const tournaments=visibleTournaments().sort((a,b)=>b.start_date.localeCompare(a.start_date));
    return `<div class="stack">${title('Game Center','Season schedules, tournament itineraries, next opponents, results and performance.',isCoach()?`<div class="row wrap"><button class="btn redbtn" data-action="newGame">+ Single game</button><button class="btn darkbtn" data-action="newTournament">+ Tournament / multi-day event</button></div>`:'')}
    <div data-next-game>${gameCountdown(next)}</div>${state.role==='player'?seasonStatPanel(userId()):''}<div class="card"><div class="section-heading">Tournaments &amp; multi-day events</div><p class="subtle">One event includes travel days, multiple games on the same day, and daily schedules.</p><div class="v045-tournament-grid">${tournaments.map(tournamentCard).join('')||'<p class="subtle">No tournaments scheduled yet.</p>'}</div></div><div class="card"><div class="section-heading">Upcoming single games</div><div class="grid2">${up.map(gameCard).join('')||'<p class="subtle">No stand-alone games scheduled.</p>'}</div></div><div class="card"><div class="section-heading">Single-game results and history</div><div class="grid2">${past.map(gameCard).join('')||'<p class="subtle">No stand-alone results recorded yet.</p>'}</div></div></div>`;
  }
  function gameDashboardSnippet(){const next=teamGames().filter(g=>g.status==='scheduled'&&gameTimeMillis(g)>=Date.now()-3600000).sort((a,b)=>gameTimeMillis(a)-gameTimeMillis(b))[0];return `<div class="card"><div class="row between"><div class="section-heading">Next Game</div><button class="btn ghost slim" data-action="go" data-page="games">Game Center →</button></div><div data-next-game>${gameCountdown(next)}</div></div>`}
  function v044Modal(type,obj){let heading='',body='',footer='';
    if(type==='newTrainingPlan'){
      heading='Create Measurable Training';body=`<form id="modal-form" data-form="trainingPlan" class="stack"><p class="subtle">Identify a skill, describe how to practice it, and choose a measurement that shows improvement.</p><div class="field"><label>Training activity</label><input name="title" required maxlength="120" placeholder="20 free throws after practice"></div><div class="field"><label>Skill category</label><select name="category">${categoryOptions()}</select></div><div class="field"><label>Connect to an existing goal (optional)</label><select name="goal_id"><option value="">Independent training activity</option>${mine('goals').map(g=>`<option value="${attr(g.id)}">${esc(g.title)}</option>`).join('')}</select></div><div class="field"><label>Execution and context</label><textarea name="description" placeholder="How will you train, and what counts as a successful rep?"></textarea></div><div class="form-grid"><div class="field"><label>Measure (e.g., makes out of 20, seconds)</label><input name="metric_unit" maxlength="32" required placeholder="makes out of 20"/></div><div class="field"><label>Target</label><input name="target_value" type="number" min="0" step="any" required placeholder="16"/></div></div><div class="field"><label>How do you improve?</label><select name="direction"><option value="higher">Higher result is better</option><option value="lower">Lower result is better</option></select></div></form>`;footer=`<button class="btn redbtn" form="modal-form" type="submit">Save training activity</button>`;
    }else if(type==='logTraining'){
      heading=obj.title+' · Log Workout';body=`<form id="modal-form" data-form="trainingSession" class="stack"><p class="subtle">Target ${numberFormat(obj.target_value)} ${esc(obj.metric_unit)}. Use an actual result, not a predicted score.</p><div class="field"><label>Training date</label><input name="session_date" type="date" value="${today()}" required/></div><div class="field"><label>Result (${esc(obj.metric_unit)})</label><input type="number" name="result_value" step="any" min="0" required></div><div class="field"><label>What did you notice?</label><textarea name="notes" placeholder="What changed? What should you repeat?"></textarea></div><div class="field"><label>Optional evidence link</label><input type="url" name="external_url" placeholder="https://..."/></div><div class="field"><label>Optional private photo, short video, or PDF (max 20 MB)</label><input type="file" name="evidence_file" accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.mov,.pdf"/></div><p class="subtle">Evidence is private to you and authorized coaches. It does not enter the shared Skill Library.</p></form>`;footer=`<button class="btn redbtn" form="modal-form" type="submit">Record workout</button>`;
    }else if(type==='planHistory'){
      const sessions=planSessions(obj.id).slice().reverse();heading=obj.title+' · Workout Log';body=`<div class="stack">${trendChart(planSessions(obj.id).map(s=>({label:shortDate(s.session_date),value:s.result_value})),obj.target_value,obj.metric_unit,obj.direction)}${sessions.map(s=>`<div class="note-row"><div class="row between"><b>${esc(fullDate(s.session_date))} · ${numberFormat(s.result_value)} ${esc(obj.metric_unit)}</b><button class="btn ghost slim" data-action="requestFeedback" data-plan="${attr(obj.id)}" data-session="${attr(s.id)}">Request feedback</button></div><p>${esc(s.notes||'')}</p>${trainingEvidenceFor(s.id).map(e=>`<button class="btn lightbtn slim" data-action="openEvidence" data-id="${attr(e.id)}">${esc(e.file_name||'Open evidence')} ↗</button>`).join('')}</div>`).join('')||'<p class="subtle">No workouts logged yet.</p>'}</div>`;
    }else if(type==='requestFeedback'){
      const plan=obj?.plan;heading='Request Coaching Feedback';body=`<form id="modal-form" data-form="feedbackRequest" class="stack"><p class="subtle">Every authorized coach can see and respond to your request. Only you and coaches can see your evidence and conversation.</p><div class="field"><label>What are you working on?</label><input name="topic" maxlength="150" required value="${attr(plan?.title||'')}"/></div><div class="field"><label>What would you like the coaches to look at?</label><textarea name="question" required minlength="5" maxlength="2000" placeholder="Describe your technique, decision or question."></textarea></div><input type="hidden" name="session_id" value="${attr(obj?.session?.id||'')}"/></form>`;footer=`<button class="btn redbtn" form="modal-form" type="submit">Send request to coaching staff</button>`;
    }else if(type==='feedbackThread'){
      const messages=records('feedback_messages').filter(m=>m.request_id===obj.id).sort((a,b)=>String(a.created_at).localeCompare(String(b.created_at)));heading=obj.topic;body=`<div class="stack"><div class="notices"><b>${esc(playerName(obj.player_id))}</b> · ${esc(obj.status==='open'?'Awaiting feedback':'Responded')}</div><p>${esc(obj.question)}</p>${messages.map(m=>`<div class="note-row"><b>${esc(m.author_display_name||'Program member')}</b><span class="subtle"> · ${esc(dateOf(m.created_at))}</span><p>${esc(m.message)}</p></div>`).join('')||'<p class="subtle">No replies yet.</p>'}<form id="modal-form" data-form="feedbackMessage" class="stack"><div class="field"><label>${isCoach()?'Coaching response':'Follow-up question'}</label><textarea name="message" minlength="1" maxlength="4000" required></textarea></div></form></div>`;footer=`<button class="btn redbtn" form="modal-form" type="submit">Send response</button>`;
    }else if(type==='playerPortfolio'){
      const plans=playerPlanRows(obj.id),sessions=records('training_sessions').filter(s=>s.player_id===obj.id);heading=(obj.roster_name||obj.display_name)+' · Development Portfolio';body=`<div class="stack"><p class="subtle">${esc(teamName(obj.team_id))} · ${plans.length} plans · ${sessions.length} recorded workouts</p>${seasonStatPanel(obj.id)}${plans.map(p=>personalPlanCard(p,true)).join('')||'<p class="subtle">No personal training plans yet.</p>'}</div>`;
    }else if(type==='newGame'||type==='editGame'){
      const g=obj||{};heading=obj?'Edit Game':'Schedule Game';body=`<form id="modal-form" data-form="game" class="stack"><div class="form-grid"><div class="field"><label>Team</label>${teamChooser(g.team_scope||(state.teamView==='jv'?'jv':'varsity'))}</div><div class="field"><label>Opponent</label><input name="opponent" maxlength="150" value="${attr(g.opponent||'')}" required></div></div><div class="form-grid"><div class="field"><label>Game date</label><input type="date" name="game_date" value="${attr(g.game_date||today())}" required></div><div class="field"><label>Tipoff (Shanghai / local event time)</label><input type="time" name="tipoff_time" value="${attr(String(g.tipoff_time||'').slice(0,5))}"/></div></div><div class="form-grid"><div class="field"><label>Home / Away / Neutral</label><select name="venue"><option ${g.venue==='home'?'selected':''} value="home">Home</option><option ${g.venue==='away'?'selected':''} value="away">Away</option><option ${g.venue==='neutral'?'selected':''} value="neutral">Neutral</option></select></div><div class="field"><label>Venue / location</label><input name="location" value="${attr(g.location||'')}"/></div></div><div class="field"><label>Tournament or event</label><input name="event_name" value="${attr(g.event_name||'')}"/></div><div class="field"><label>Game status</label><select name="status"><option value="scheduled" ${g.status==='scheduled'?'selected':''}>Scheduled</option><option value="completed" ${g.status==='completed'?'selected':''}>Completed</option><option value="cancelled" ${g.status==='cancelled'?'selected':''}>Cancelled</option></select></div><div class="form-grid"><div class="field"><label>SAS final score</label><input type="number" name="sas_score" min="0" value="${attr(g.sas_score??'')}"/></div><div class="field"><label>Opponent final score</label><input type="number" name="opponent_score" min="0" value="${attr(g.opponent_score??'')}"/></div></div><div class="field"><label>Player-facing game summary</label><textarea name="summary">${esc(g.summary||'')}</textarea></div><label class="choice"><input type="checkbox" name="published" ${!obj||g.published?'checked':''}/> Publish to the team</label></form>`;footer=`<button class="btn redbtn" form="modal-form" type="submit">Save game</button>`;
    }else if(type==='gameStats'){
      const g=obj;heading='Enter Player Stats · '+g.opponent;const players=records('profiles').filter(p=>p.role==='player'&&p.team_id===g.team_scope);body=`<form id="modal-form" data-form="gameStat" class="stack"><p class="subtle">Enter one player's stats at a time. Individual game statistics remain private to the player and coaches.</p><div class="field"><label>Player</label><select name="player_id">${players.map(p=>`<option value="${attr(p.id)}">${esc(p.roster_name||p.display_name)}</option>`).join('')}</select></div><div class="form-grid">${[['points','Points'],['rebounds','Rebounds'],['assists','Assists'],['steals','Steals'],['turnovers','Turnovers'],['fg_made','FG made'],['fg_attempted','FG attempted'],['ft_made','FT made'],['ft_attempted','FT attempted']].map(([k,label])=>`<div class="field"><label>${label}</label><input name="${k}" type="number" min="0" step="1" placeholder="0"/></div>`).join('')}</div></form>`;footer=`<button class="btn redbtn" form="modal-form" type="submit">Save player stats</button>`;
    }else if(type==='addDrillToPractice'){
      heading='Add Drill to Practice';const practices=records('practices').filter(p=>p.team_scope===obj.team_scope||obj.team_scope==='both').sort((a,b)=>String(b.practice_date).localeCompare(String(a.practice_date)));body=`<form id="modal-form" data-form="addDrillToPractice" class="stack"><p class="subtle">${esc(obj.name)} · Select the practice plan this drill should support.</p><div class="field"><label>Practice</label><select name="practice_id" required>${practices.map(p=>`<option value="${attr(p.id)}">${esc(fullDate(p.practice_date))} · ${esc(p.title)} · ${esc(teamName(p.team_scope))}</option>`).join('')}</select></div></form>`;footer=practices.length?`<button class="btn redbtn" form="modal-form" type="submit">Add drill</button>`:'';
    }else if(type==='gameStatsView'){
      const all=records('game_player_stats').filter(s=>s.game_id===obj.id && (isCoach()||s.player_id===userId()));heading=obj.opponent+' · Game Statistics';body=`<div class="v044-table-wrap"><table class="v044-table"><thead><tr><th>Player</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>TO</th><th>FG</th><th>FT</th></tr></thead><tbody>${all.map(s=>`<tr><td>${esc(playerName(s.player_id))}</td>${['points','rebounds','assists','steals','turnovers'].map(k=>`<td>${Number(s[k]||0)}</td>`).join('')}<td>${s.fg_made??'—'}/${s.fg_attempted??'—'}</td><td>${s.ft_made??'—'}/${s.ft_attempted??'—'}</td></tr>`).join('')}</tbody></table>${all.length?'':'<p class="subtle">No player statistics have been recorded for this game.</p>'}</div>`;
    }else return '';
    return `<div class="overlay" data-action="closeBackdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${attr(heading)}"><div class="modal-header"><h2>${esc(heading)}</h2><button class="btn iconbtn lightbtn" data-action="closeModal" aria-label="Close dialog">×</button></div><div class="modal-body">${body}</div><div class="modal-footer"><button class="btn ghost" data-action="closeModal">Close</button>${footer}</div></section></div>`;
  }

  function nicknameSetup(){return `<div class="entry"><div class="entry-inner"><section class="entry-brand"><img class="eagle" src="${LOGO}" alt="SAS eagle logo"/><div class="schoolname">SHANGHAI AMERICAN SCHOOL · PUXI</div><div class="massive">SAS <span>HOOPS.</span></div><p class="strap">PLAY HARD. PLAY SMART. PLAY TOGETHER.</p></section><section class="entry-panel"><div class="eyebrow">YOUR PLAYER PROFILE</div><h2 class="panel-title">What should we call you?</h2><p class="subtle">Choose the name you want to see in your Players’ Hub. Your coaches will still know which roster account belongs to you.</p><form class="signin" data-form="nickname"><div class="field"><label>Display name</label><input name="display_name" required minlength="1" maxlength="40" autocomplete="nickname" placeholder="Your preferred name"/></div><button type="submit" class="btn redbtn wide">Open my hub →</button></form>${state.loadError?`<div class="error">${esc(state.loadError)}</div>`:''}</section></div></div>`}
  function render(){ROOT.innerHTML=state.loading?'<div class="loading">SAS BASKETBALL</div>':(state.role==='player'&&state.authScreen==='nickname'&&LIVE)?nicknameSetup():state.role?shell():entry();const nav=ROOT.querySelector('.mobile-nav'),active=nav?.querySelector('button.active');if(nav&&active)nav.scrollLeft=Math.max(0,active.offsetLeft-(nav.clientWidth-active.clientWidth)/2);if(['drillDetails','practiceActivityDetails'].includes(state.modal?.type)&&LIVE)void loadDrillPreviews();if(LIVE)void loadV045Previews()}
  function demoEnter(role){state.role=role;state.profile=role==='coach'?{id:'coach-demo',display_name:'Coach Demo',role:'coach'}:records('profiles').find(p=>p.id==='player-one');state.page='dashboard';state.authScreen='entry';render()}
  function startPractice(p){state.editing=p||null;state.draftDrillFiles={};state.draftActivities=(p?.activities||[]).map(a=>({...a}));state.page='practiceEditor';state.modal=null;render();window.scrollTo(0,0)}
  document.addEventListener('click',async event=>{
    const el=event.target.closest('[data-action]');if(!el || !ROOT.contains(el))return;
    const action=el.dataset.action;
    if(action==='closeBackdrop' && event.target!==el)return;
    // v0.4.5 media actions. Request access through authenticated private buckets.
    if(action==='newTournament'&&isCoach()){openModal('newTournament');return}
    if(action==='tournamentResult'&&isCoach()){const g=records('games').find(x=>x.id===el.dataset.id&&x.tournament_id);if(g)openModal('tournamentResult',g);return}
    if(action==='editTournament'&&isCoach()){const t=records('tournaments').find(x=>x.id===el.dataset.id);if(t)openModal('editTournament',t);return}
    if(action==='addTournamentItem'&&isCoach()){const holder=ROOT.querySelector('[data-tournament-items]');if(holder){const last=holder.querySelector('[data-tournament-item]:last-child [data-ti-date]');holder.insertAdjacentHTML('beforeend',tournamentRowInput({date:last?.value||ROOT.querySelector('[name="start_date"]')?.value||today(),kind:'game'}));}return}
    if(action==='removeTournamentItem'&&isCoach()){el.closest('[data-tournament-item]')?.remove();return}
    if(action==='generateTournamentDays'&&isCoach()){const form=ROOT.querySelector('form[data-form="tournament"]'),start=form?.querySelector('[name="start_date"]')?.value,end=form?.querySelector('[name="end_date"]')?.value,holder=form?.querySelector('[data-tournament-items]');if(!start||!end||end<start){notice('Choose a valid start and end date.',true);return}const d1=new Date(start+'T12:00:00Z'),d2=new Date(end+'T12:00:00Z'),n=Math.round((d2-d1)/86400000)+1;if(n>21){notice('Events are limited to 21 days. Break longer seasons into separate events.',true);return}if(holder.children.length&&!confirm('Replace the existing draft itinerary with one row per day?'))return;holder.innerHTML=Array.from({length:n},(_,i)=>{const d=new Date(d1.getTime()+i*86400000).toISOString().slice(0,10);return tournamentRowInput({date:d,kind:n>2&&(i===0||i===n-1)?'travel':'game',title:n>2&&(i===0?'Travel / arrival':i===n-1?'Return travel':'')})}).join('');return}
    if(action==='manageGameMedia'&&isCoach()){
      const g=records('games').find(x=>x.id===el.dataset.id);if(g)openModal('manageGameMedia',g);return;
    }
    if(action==='manageAssignmentMedia'&&isCoach()){
      const a=records('assignments').find(x=>x.id===el.dataset.id);if(a)openModal('manageAssignmentMedia',a);return;
    }
    if(action==='reviewAssignmentEvidence'&&isCoach()){
      const r=records('assignment_responses').find(x=>x.id===el.dataset.id);if(r)openModal('reviewAssignmentEvidence',r);return;
    }
    if(action==='openGameMedia'||action==='openAssignmentMedia'){
      const isGame=action==='openGameMedia',table=isGame?'game_media':'assignment_media',bucket=isGame?GAME_MEDIA_BUCKET:ASSIGNMENT_MEDIA_BUCKET;
      const m=records(table).find(x=>x.id===el.dataset.id);if(!m)return;
      if(m.external_url){const url=safeHttpUrl(m.external_url);if(url)window.open(url,'_blank','noopener,noreferrer');return}
      if(!LIVE){notice('Files are available in the live app only.');return}
      const tab=window.open('about:blank','_blank');
      try{const {data,error}=await supabase.storage.from(bucket).createSignedUrl(m.storage_path,240);
        if(error||!data?.signedUrl)throw error||Error('Unable to create file link');
        if(tab)tab.location.replace(data.signedUrl);else window.location.assign(data.signedUrl);
      }catch(e){if(tab)tab.close();notice('Cannot open attachment: '+(e.message||e),true)}return;
    }
    if(action==='removeGameMedia'&&isCoach()){
      const m=records('game_media').find(x=>x.id===el.dataset.id);if(!m||!confirm('Remove this game media?'))return;
      await perform(async()=>{await saveRow('game_media',{id:m.id},'delete');if(LIVE&&m.storage_path){const {error}=await supabase.storage.from(GAME_MEDIA_BUCKET).remove([m.storage_path]);if(error)throw Error('Media record removed, but storage cleanup needs attention: '+error.message)}state.modal={type:'manageGameMedia',obj:records('games').find(g=>g.id===m.game_id)}},'Game media removed');return;
    }
    if(action==='removeAssignmentMedia'){
      const m=records('assignment_media').find(x=>x.id===el.dataset.id);if(!m||!(isCoach()||(state.role==='player'&&m.player_id===userId())))return;
      if(!confirm('Remove this attachment?'))return;
      await perform(async()=>{await saveRow('assignment_media',{id:m.id},'delete');if(LIVE&&m.storage_path){const {error}=await supabase.storage.from(ASSIGNMENT_MEDIA_BUCKET).remove([m.storage_path]);if(error)throw Error('Record removed, but storage cleanup needs attention: '+error.message)}},'Attachment removed');return;
    }
    // v0.4.4 resource sharing and approval, development, feedback, and games.
    if(action==='statMetric'){state.statMetric=el.dataset.metric;render();return}
    if(action==='resourceTab'){state.resourceSection=el.dataset.section;state.search='';state.resourceCategory='All';render();return}
    if(action==='resourceCategory'){state.resourceCategory=el.dataset.category;render();return}
    if(action==='reviewResource'&&isCoach()){
      const r=records('resources').find(x=>x.id===el.dataset.id&&x.library_section==='skill');if(!r)return;
      const approved=el.dataset.decision==='approved';
      if(!confirm(`${approved?'Approve':'Reject'} "${r.title}"?`))return;
      await perform(()=>saveRow('resources',{id:r.id,review_status:approved?'approved':'rejected',published:approved,reviewed_by:userId(),reviewed_at:new Date().toISOString(),team_scope:'both'},'update'),approved?'Resource approved for JV and Varsity':'Submission rejected');return;
    }
    if(action==='markResourceReviewed'&&state.role==='player'){
      const r=records('resources').find(x=>x.id===el.dataset.id&&x.required_review&&x.published&&x.library_section==='essentials');if(!r)return;
      if(records('resource_reviews').some(x=>x.resource_id===r.id&&x.player_id===userId()))return;
      await perform(()=>saveRow('resource_reviews',{resource_id:r.id,player_id:userId()}),'Review acknowledged');return;
    }
    if(action==='fromResource'&&isCoach()){
      const r=records('resources').find(x=>x.id===el.dataset.id);if(!r||r.review_status!=='approved'){notice('Approve the resource before converting it into a drill.',true);return}
      openModal('newDrill',r);return;
    }
    if(action==='addDrillToPractice'&&isCoach()){
      const d=records('drills').find(x=>x.id===el.dataset.id);if(d)openModal('addDrillToPractice',d);return;
    }
    if(action==='newTrainingPlan'&&state.role==='player'){openModal('newTrainingPlan');return}
    if(action==='logTraining'&&state.role==='player'){
      const p=records('training_plans').find(x=>x.id===el.dataset.id&&x.player_id===userId());if(p)openModal('logTraining',p);return;
    }
    if(action==='planHistory'){
      const p=records('training_plans').find(x=>x.id===el.dataset.id&&(isCoach()||x.player_id===userId()));if(p)openModal('planHistory',p);return;
    }
    if(action==='requestFeedback'&&state.role==='player'){
      const p=records('training_plans').find(x=>x.id===el.dataset.plan&&x.player_id===userId());const s=records('training_sessions').find(x=>x.id===el.dataset.session&&x.player_id===userId());
      openModal('requestFeedback',{plan:p||null,session:s||null});return;
    }
    if(action==='feedbackThread'){
      const r=records('feedback_requests').find(x=>x.id===el.dataset.id&&(isCoach()||x.player_id===userId()));if(r)openModal('feedbackThread',r);return;
    }
    if(action==='playerPortfolio'&&isCoach()){
      const p=records('profiles').find(x=>x.id===el.dataset.id&&x.role==='player');if(p)openModal('playerPortfolio',p);return;
    }
    if(action==='openEvidence'){
      const e=records('training_evidence').find(x=>x.id===el.dataset.id&&(isCoach()||x.player_id===userId()));if(!e)return;
      if(e.evidence_type==='link'){const url=safeHttpUrl(e.external_url);if(url)window.open(url,'_blank','noopener,noreferrer');return;}
      const tab=window.open('about:blank','_blank');
      try{const {data,error}=await supabase.storage.from(EVIDENCE_BUCKET).createSignedUrl(e.storage_path,300);if(error||!data?.signedUrl)throw error||Error('Could not open file');if(tab)tab.location.replace(data.signedUrl);else window.location.assign(data.signedUrl)}catch(err){if(tab)tab.close();notice('Cannot open evidence: '+err.message,true)}return;
    }
    if(action==='newGame'&&isCoach()){openModal('newGame');return}
    if(action==='editGame'&&isCoach()){
      const g=records('games').find(x=>x.id===el.dataset.id);if(g)openModal('editGame',g);return;
    }
    if(action==='gameStats'&&isCoach()){
      const g=records('games').find(x=>x.id===el.dataset.id);if(g)openModal('gameStats',g);return;
    }
    if(action==='gameStatsView'){
      const g=records('games').find(x=>x.id===el.dataset.id);if(g)openModal('gameStatsView',g);return;
    }

    if(action==='go'){go(el.dataset.page);return}
    if(action==='enter'){state.desiredRole=el.dataset.role;if(LIVE){state.authScreen='login';render()}else demoEnter(el.dataset.role);return}
    if(action==='backEntry'){state.authScreen='entry';state.loadError='';render();return}
    if(action==='changePassword'&&isStaff()){openModal('changePassword');return}
    if(action==='signOut'){if(LIVE&&supabase)await supabase.auth.signOut();state.role=null;state.profile=null;state.page='dashboard';state.authScreen='entry';render();return}
    if(action==='resetDemo'){if(!LIVE){try{localStorage.removeItem(DEMO_KEY)}catch{}state.data=demoSeed();render();notice('Sample data reset')}return}
    if(action==='teamSwitch'&&isStaff()){state.teamView=el.dataset.team;go('dashboard');return}
    if(action==='newChallenge'&&isCoach()){openModal('newChallenge');return}
    if(action==='editChallenge'&&isCoach()){const c=records('challenges').find(x=>x.id===el.dataset.id);if(c)openModal('editChallenge',c);return}
    if(action==='recordChallenge'){const c=records('challenges').find(x=>x.id===el.dataset.id);if(c&&!isTeamChallenge(c)&&(isCoach()||(!isStaff()&&c.published&&challengeAllowsPlayer(c))))openModal('recordChallenge',c);return}
    if(action==='recordTeamChallenge'&&isCoach()){const c=records('challenges').find(x=>x.id===el.dataset.id);if(c&&isTeamChallenge(c))openModal('recordTeamResult',{challengeId:c.id,practiceId:practicesForChallenge(c)[0]?.id});return}
    if(action==='recordTeamPractice'&&isCoach()){openModal('recordTeamResult',{challengeId:el.dataset.challenge,practiceId:el.dataset.practice});return}
    if(action==='practiceBenchmarks'&&isCoach()){const p=records('practices').find(x=>x.id===el.dataset.id);if(p)openModal('practiceBenchmarks',p);return}
    if(action==='challengeResults'){const c=records('challenges').find(x=>x.id===el.dataset.id);if(c)openModal('challengeResults',c);return}
    if(action==='newResource'&&(isCoach()||state.role==='player')){openModal('newResource');return}
    if(action==='newNotebookNote'&&isCoach()){openModal('newNotebookNote');return}
    if(action==='copyStaffPassword'&&isCoach()){
      const i=Number(el.dataset.index);const password=state.staffInviteResult?.[i]?.temporaryPassword;
      if(!password){notice('That temporary password is no longer available.',true);return}
      try{await navigator.clipboard.writeText(password);notice('Temporary password copied. Share it privately.')}catch(_){notice('Copy was blocked. Select and copy the displayed password manually.',true)}
      return;
    }
    if(action==='inviteStaff'&&isCoach()){

      if(!confirm('Create staff accounts for Nicki, Christian, Jess, and Matt? Temporary passwords will appear only once.'))return;
      try{const result=await coachAdminRequest({action:'provision_beta_staff'});state.staffInviteResult=result.staff||[];render();notice('Staff provisioning processed. Copy any new temporary passwords before leaving this page.')}catch(err){notice(err.message,true)}return;
    }
    if(action==='openResource'){const r=records('resources').find(x=>x.id===el.dataset.id);if(!r)return;
      if(r.resource_type==='link'){const u=new URL(r.external_url);if(!['https:','http:'].includes(u.protocol))throw Error('Unsupported link');window.open(u.href,'_blank','noopener,noreferrer');return}
      // Open a tab before the asynchronous signed-URL request. iOS Safari otherwise blocks delayed popups.
      const tab=window.open('about:blank','_blank');
      try{
        const {data,error}=await supabase.storage.from('sas-basketball-resources').createSignedUrl(r.storage_path,120);
        if(error||!data?.signedUrl)throw error||Error('Could not generate file link');
        if(tab)tab.location.replace(data.signedUrl);else window.location.assign(data.signedUrl);
      }catch(e){if(tab)tab.close();notice('Cannot open file: '+e.message,true)}
      return;
    }
    if(action==='deleteResource'&&isCoach()){
      const r=records('resources').find(x=>x.id===el.dataset.id);if(!r||!confirm('Remove this resource?'))return;
      await perform(async()=>{await saveRow('resources',{id:r.id},'delete');if(r.storage_path)await supabase.storage.from('sas-basketball-resources').remove([r.storage_path])},'Resource removed');return;
    }
    if(action==='deleteNote'&&isCoach()){
      if(!confirm('Delete this private note?'))return;await perform(()=>saveRow('coaching_notes',{id:el.dataset.id},'delete'),'Private note removed');return;
    }
    if(action==='archivePractice'&&isCoach()){
      const p=records('practices').find(x=>x.id===el.dataset.id);if(!p||p.archived)return;
      if(!confirm(`Archive "${p.title}" (${fullDate(p.practice_date)})? It will disappear from active schedules and be unpublished for players.`))return;
      await perform(async()=>{
        await saveRow('practices',{id:p.id,archived:true,published:false},'update');
        for(const a of p.activities||[]){const d=records('drills').find(x=>x.id===a.drill_id&&x.in_library===false);
          if(d)await saveRow('drills',{id:d.id,published:false},'update');}
      },'Practice archived');return;
    }
    if(action==='restorePractice'&&isCoach()){
      const p=records('practices').find(x=>x.id===el.dataset.id);if(!p||!p.archived)return;
      await perform(()=>saveRow('practices',{id:p.id,archived:false,published:false},'update'),'Practice restored as an unpublished draft');return;
    }
    if(action==='deletePractice'&&isCoach()){
      const p=records('practices').find(x=>x.id===el.dataset.id);if(p)openModal('confirmDeletePractice',p);return;
    }
    if(action==='deletePlayer'&&isHeadCoach()&&LIVE){
      const p=records('profiles').find(x=>x.id===el.dataset.id&&x.role==='player');if(p)openModal('confirmDeletePlayer',p);return;
    }
    if(action==='clearTeamResult'&&isCoach()){
      const r=records('practice_challenges').find(x=>x.id===el.dataset.id);if(r&&r.status!=='pending')openModal('confirmClearTeamResult',r);return;
    }
    if(action==='deleteIndividualResult'&&isCoach()){
      const r=records('challenge_results').find(x=>x.id===el.dataset.id);if(r)openModal('confirmDeleteIndividualResult',r);return;
    }
    if(action==='newPractice'&&isCoach()){startPractice(null);return}
    if(action==='newPlayer'&&isCoach()){openModal('newPlayer');return}
    if(action==='resetPlayerPin'&&isCoach()&&LIVE){const p=records('profiles').find(x=>x.id===el.dataset.id&&x.role==='player');if(p)openModal('confirmPinReset',p);return}
    if(action==='viewPractice'){
      const p=records('practices').find(x=>x.id===el.dataset.id);
      if(!p||!(isCoach()||(p.published&&!p.archived&&scopeVisible(p)))){notice('Practice plan is not available to this account.',true);return}
      state.viewingPracticeId=p.id;go('practiceView');return;
    }
    if(action==='editPractice'){startPractice(records('practices').find(x=>x.id===el.dataset.id));return}
    if(action==='openDrillFile'){
      const a=records('drill_attachments').find(x=>x.id===el.dataset.id);
      if(!a||!LIVE)return;
      const tab=window.open('about:blank','_blank');
      try{
        const {data,error}=await supabase.storage.from(DRILL_BUCKET).createSignedUrl(a.storage_path,300);
        if(error||!data?.signedUrl)throw error||Error('Could not generate a file link');
        if(tab)tab.location.replace(data.signedUrl);else window.location.assign(data.signedUrl);
      }catch(e){if(tab)tab.close();notice('Cannot open drill file: '+e.message,true)}return;
    }
    if(action==='addDrillFiles'&&isCoach()){
      const d=records('drills').find(x=>x.id===el.dataset.id);
      if(d)openModal('addDrillFiles',d);return;
    }
    if(action==='removeDrillFile'&&isCoach()){
      const a=records('drill_attachments').find(x=>x.id===el.dataset.id);
      if(!a||!LIVE||!confirm('Remove this file from the drill?'))return;
      const d=records('drills').find(x=>x.id===a.drill_id);
      await perform(async()=>{
        const {error}=await supabase.storage.from(DRILL_BUCKET).remove([a.storage_path]);
        if(error)throw error;
        await saveRow('drill_attachments',{id:a.id},'delete');
        state.modal=d?{type:'drillDetails',obj:d}:null;
      },'Drill file removed');return;
    }
    if(action==='newDrill'&&isCoach()){openModal('newDrill');return}
    if(action==='newAssignment'&&isCoach()){openModal('newAssignment');return}
    if(action==='newGoal'){openModal('newGoal');return}
    if(action==='newReflection'){openModal('newReflection');return}
    if(action==='filter'){state.filter=el.dataset.filter;render();return}
    if(action==='closeModal'||action==='closeBackdrop'){closeModal();return}
    if(action==='newPracticeDrill'&&isCoach()&&state.page==='practiceEditor'){openModal('newPracticeDrill');return}
    if(action==='previewDraftActivity'&&isCoach()&&state.page==='practiceEditor'){
      const a=state.draftActivities[Number(el.dataset.index)];if(a)openModal('previewDraftActivity',{activity:a});return;
    }
    if(action==='practiceActivityDetails'&&state.page==='practiceView'){
      const p=records('practices').find(x=>x.id===state.viewingPracticeId);
      if(!p||!(isCoach()||(p.published&&!p.archived&&scopeVisible(p))))return;
      const a=p.activities?.[Number(el.dataset.index)];if(a)openModal('practiceActivityDetails',{activity:a});return;
    }
    if(action==='promotePracticeDrill'&&isCoach()){
      const d=records('drills').find(x=>x.id===el.dataset.id&&x.in_library===false);if(!d)return;
      await perform(async()=>{await saveRow('drills',{id:d.id,in_library:true},'update');state.modal=null},'Drill added to shared Library');return;
    }
    if(action==='addActivity'){
      if(!visibleDrills().length){notice('The shared Drill Library is empty. Use Create drill in this plan instead.',true);return}
      openModal('addActivity');return;
    }
    if(action==='moveActivity'){const i=Number(el.dataset.index);const j=i+Number(el.dataset.dir);if(j>=0&&j<state.draftActivities.length){[state.draftActivities[i],state.draftActivities[j]]=[state.draftActivities[j],state.draftActivities[i]];render()}return}
    if(action==='removeActivity'){const removed=state.draftActivities.splice(Number(el.dataset.index),1)[0];if(removed?.temp_id)delete state.draftDrillFiles[removed.temp_id];render();return}
    if(action==='logPractice'){openModal('logPractice',records('practices').find(x=>x.id===el.dataset.id));return}
    if(['drillDetails','practiceDetails','respondAssignment','playerDetails'].includes(action)){
      const table={drillDetails:'drills',practiceDetails:'practices',respondAssignment:'assignments',playerDetails:'profiles'}[action];const object=records(table).find(x=>x.id===el.dataset.id);
      if(object)openModal(action,object);return;
    }
  });
  document.addEventListener('input',event=>{
    if(event.target.name?.startsWith('challenge_result_')&&event.target.closest('form[data-form="logPractice"]')){
      const select=event.target.form?.elements?.namedItem(event.target.name.replace('challenge_result_','challenge_status_'));
      if(select&&event.target.value.trim()!=='')select.value='completed';
    }
    if(event.target.hasAttribute('data-resource-search')){state.search=event.target.value;const pos=event.target.selectionStart;render();const target=ROOT.querySelector('[data-resource-search]');if(target){target.focus();target.setSelectionRange(pos,pos)}return;}
    if(event.target.id==='drill-search'){const s=event.target.value;state.search=s;const focus=event.target.selectionStart;render();const next=document.querySelector('#drill-search');if(next){next.focus();next.setSelectionRange(focus,focus)}}});
  document.addEventListener('change',async event=>{const el=event.target;
    if(el.dataset.change==='customPriority'){const custom=el.parentElement?.querySelector('[data-priority-custom]');if(custom){const show=el.value==='__custom__';custom.hidden=!show;custom.disabled=!show;custom.required=show;if(show)custom.focus()}return;}
    if(el.dataset.change==='chooseChallengePractice'&&state.modal?.type==='recordTeamResult'){state.modal.obj.practiceId=el.value;render();return}
    if(el.name==='team_scope'&&el.closest('form[data-form="practice"]')){document.querySelectorAll('.v041-recurring-option').forEach(node=>{node.style.display=(node.dataset.teamScope==='both'||node.dataset.teamScope===el.value)?'':'none'});return}
    if(el.dataset.change==='challengeStatus'){const box=el.closest('form');if(box){const score=box.querySelector('[name="result_value"]');if(score)score.required=el.value==='completed'}return}
    if(el.dataset.change==='goalStatus'&&state.role==='player'){const existing=mine('goals').find(g=>g.id===el.dataset.id);if(existing)await perform(()=>saveRow('goals',{id:existing.id,status:el.value},'update'),'Goal progress updated')}});
  document.addEventListener('submit',async event=>{
    const form=event.target.closest('form[data-form]');if(!form)return;event.preventDefault();
    const f=Object.fromEntries(new FormData(form).entries());const type=form.dataset.form;
    // v0.4.5: use the same authenticated, private storage pattern as drill/evidence files.
    if(type==='gameMedia'&&isCoach()){
      const g=state.modal?.obj;if(!g)return;
      const files=[...form.querySelector('input[name="media_files"]').files];const link=String(f.external_url||'').trim();
      if(!files.length&&!link){notice('Select an image or add a video link.',true);return}
      try{sanitizeMediaFiles(files,GAME_IMAGE_TYPES,10485760,5);if(link&&!safeHttpUrl(link))throw Error('Enter a valid video link.');
        if(files.length&&!LIVE)throw Error('Image uploads require the live app.');}catch(err){notice(err.message,true);return}
      await perform(async()=>{
        if(f.featured && files.length){for(const old of mediaForGame(g.id).filter(m=>m.featured))await saveRow('game_media',{id:old.id,featured:false},'update');}
        if(files.length)await saveUploadedMedia(GAME_MEDIA_BUCKET,'game_media','game_id',g.id,files,GAME_IMAGE_TYPES,10485760,null,{phase:f.media_phase,featured:Boolean(f.featured),caption:String(f.caption||'').trim()});
        if(link)await createMediaLink('game_media','game_id',g.id,link,String(f.caption||'').trim(),null,{phase:f.media_phase});
        state.modal={type:'manageGameMedia',obj:g};
      },'Game media published');return;
    }
    if(type==='assignmentCoachMedia'&&isCoach()){
      const a=state.modal?.obj;if(!a)return;
      const files=[...form.querySelector('input[name="media_files"]').files];const link=String(f.external_url||'').trim();
      if(!files.length&&!link){notice('Select a file or add a link.',true);return}
      try{sanitizeMediaFiles(files,ASSIGNMENT_MEDIA_TYPES,20971520,5);if(link&&!safeHttpUrl(link))throw Error('Enter a valid link.');if(files.length&&!LIVE)throw Error('File uploads require the live app.');}catch(err){notice(err.message,true);return}
      await perform(async()=>{if(files.length)await saveUploadedMedia(ASSIGNMENT_MEDIA_BUCKET,'assignment_media','assignment_id',a.id,files,ASSIGNMENT_MEDIA_TYPES,20971520,null,{caption:String(f.caption||'').trim()});if(link)await createMediaLink('assignment_media','assignment_id',a.id,link,String(f.caption||'').trim());state.modal={type:'manageAssignmentMedia',obj:a}},'Instructional media added');return;
    }
    // v0.4.4 forms
    if(type==='trainingPlan'&&state.role==='player'){
      const target=Number(f.target_value);if(!Number.isFinite(target)||target<0){notice('Enter a valid measurable target.',true);return}
      await perform(async()=>{await saveRow('training_plans',{player_id:userId(),title:String(f.title||'').trim(),category:f.category||'General',description:String(f.description||'').trim(),metric_unit:String(f.metric_unit||'').trim(),target_value:target,direction:f.direction==='lower'?'lower':'higher',goal_id:f.goal_id||null});state.modal=null},'Training activity created');return;
    }
    if(type==='trainingSession'&&state.role==='player'){
      const plan=state.modal?.obj;if(!plan||plan.player_id!==userId())return;const value=Number(f.result_value);
      if(!Number.isFinite(value)||value<0){notice('Enter a valid nonnegative result.',true);return}
      const file=form.querySelector('input[name="evidence_file"]')?.files?.[0],evidenceUrl=String(f.external_url||'').trim();
      if(file && (file.size<1||file.size>20971520||!(/\.(jpg|jpeg|png|webp|mp4|webm|mov|pdf)$/i).test(file.name))){notice('Evidence must be a photo, short MP4/WebM/MOV video, or PDF under 20 MB.',true);return}
      if(evidenceUrl&&!safeHttpUrl(evidenceUrl)){notice('Enter a valid http/https evidence URL.',true);return}
      await perform(async()=>{
        let sessionId;
        const values={plan_id:plan.id,player_id:userId(),session_date:f.session_date,result_value:value,notes:String(f.notes||'').trim()};
        if(LIVE){const {data,error}=await supabase.from('training_sessions').insert(values).select('id').single();if(error)throw error;sessionId=data.id;}
        else{sessionId=id();await saveRow('training_sessions',{...values,id:sessionId})}
        if(evidenceUrl)await saveRow('training_evidence',{session_id:sessionId,player_id:userId(),evidence_type:'link',external_url:safeHttpUrl(evidenceUrl),storage_path:null,file_name:'Training evidence link'});
        if(file){if(!LIVE)throw Error('File upload requires live Supabase.');
          const path=`${userId()}/${id()}-${file.name.replace(/[^A-Za-z0-9._-]/g,'_').slice(-100)}`;
          const {error:uploadErr}=await supabase.storage.from(EVIDENCE_BUCKET).upload(path,file,{contentType:file.type||'application/octet-stream',upsert:false});if(uploadErr)throw uploadErr;
          try{await saveRow('training_evidence',{session_id:sessionId,player_id:userId(),evidence_type:'file',storage_path:path,external_url:null,file_name:file.name,mime_type:file.type||'application/octet-stream'})}catch(err){await supabase.storage.from(EVIDENCE_BUCKET).remove([path]);throw err}
        }
        state.modal=null;
      },'Workout result saved');return;
    }
    if(type==='feedbackRequest'&&state.role==='player'){
      const session=String(f.session_id||'');if(session&&!records('training_sessions').some(s=>s.id===session&&s.player_id===userId())){notice('Workout not found.',true);return}
      await perform(async()=>{await saveRow('feedback_requests',{player_id:userId(),session_id:session||null,topic:String(f.topic||'').trim(),question:String(f.question||'').trim(),status:'open'});state.modal=null},'Feedback request shared with coaches');return;
    }
    if(type==='feedbackMessage'){
      const r=state.modal?.obj;if(!r||!(isCoach()||r.player_id===userId()))return;
      await perform(async()=>{await saveRow('feedback_messages',{request_id:r.id,author_id:userId(),author_display_name:state.profile?.display_name||'Program member',message:String(f.message||'').trim()});if(!LIVE){r.status=isCoach()?'responded':'open'}state.modal={type:'feedbackThread',obj:{...r,status:isCoach()?'responded':'open'}}},'Coaching conversation updated');return;
    }

    if(type==='tournamentResult'&&isCoach()){
      const g=state.modal?.obj;if(!g||!g.tournament_id)return;
      const finished=f.status==='completed',sas=f.sas_score===''?null:Number(f.sas_score),opp=f.opponent_score===''?null:Number(f.opponent_score);
      if(finished&&(!Number.isInteger(sas)||!Number.isInteger(opp)||sas<0||opp<0)){notice('Enter both nonnegative final scores.',true);return}
      await perform(async()=>{await saveRow('games',{id:g.id,status:f.status||'scheduled',sas_score:finished?sas:null,opponent_score:finished?opp:null,summary:String(f.summary||'')},'update');state.modal=null},'Tournament game result saved');return;
    }
    if(type==='tournament'&&isCoach()){
      const old=state.modal?.obj?.id?state.modal.obj:null,items=itineraryFromForm(form),start=f.start_date,end=f.end_date;
      if(!start||!end||end<start){notice('Tournament end date cannot precede the start date.',true);return}
      const days=Math.round((new Date(end+'T12:00:00Z')-new Date(start+'T12:00:00Z'))/86400000)+1;
      if(days>21){notice('Use separate entries for events longer than 21 days.',true);return}
      if(!items.length){notice('Add at least one travel, game, or activity row.',true);return}
      if(items.length>80||items.some(x=>!x.date||x.date<start||x.date>end||!['game','travel','event'].includes(x.kind))){notice('Check itinerary dates. Each must be within the tournament range (80 items maximum).',true);return}
      if(new Set(items.map(x=>x.id)).size!==items.length){notice('Duplicate itinerary IDs detected. Close and reopen the editor.',true);return}
      const newTeam=f.team_scope==='jv'?'jv':'varsity',linked=old?tournamentGames(old):[];
      if(old&&old.team_scope!==newTeam&&linked.some(g=>records('game_player_stats').some(s=>s.game_id===g.id))){notice('Cannot switch tournament team after player statistics have been recorded.',true);return}
      const currentGameIds=new Set(items.filter(x=>x.kind==='game').map(x=>x.id));
      const toDelete=linked.filter(g=>!currentGameIds.has(g.tournament_item_id));
      if(toDelete.some(g=>records('game_player_stats').some(s=>s.game_id===g.id)||records('game_media').some(m=>m.game_id===g.id))){notice('Remove game stats and media before deleting an existing tournament game. To retain history, mark the game as cancelled instead.',true);return}
      const vals={team_scope:newTeam,title:String(f.title||'').trim(),start_date:start,end_date:end,location:String(f.location||'').trim(),notes:String(f.notes||'').trim(),itinerary:items,published:Boolean(f.published)};
      if(!vals.title){notice('Enter a tournament name.',true);return}
      await perform(async()=>{
        let tournamentId=old?.id;
        if(old){await saveRow('tournaments',{id:old.id,...vals},'update')}
        else if(LIVE){const {data,error}=await supabase.from('tournaments').insert(vals).select('id').single();if(error)throw error;tournamentId=data.id}
        else{tournamentId=id();await saveRow('tournaments',{id:tournamentId,...vals})}
        for(const item of items.filter(x=>x.kind==='game')){
          const prior=linked.find(g=>g.tournament_item_id===item.id);
          const game={team_scope:newTeam,tournament_id:tournamentId,tournament_item_id:item.id,opponent:item.title||'TBA',game_date:item.date,tipoff_time:item.time||null,location:item.location||vals.location,venue:'neutral',event_name:vals.title,published:vals.published};
          await saveRow('games',prior?{id:prior.id,...game,status:prior.status,sas_score:prior.sas_score,opponent_score:prior.opponent_score,summary:prior.summary}:{...game,status:'scheduled',sas_score:null,opponent_score:null,summary:''},prior?'update':'insert');
        }
        for(const g of toDelete)await saveRow('games',{id:g.id},'delete');
        state.modal=null;
      },'Tournament itinerary and games saved');return;
    }
    if(type==='game'&&isCoach()){
      const old=state.modal?.obj;
      const finished=f.status==='completed',sas=f.sas_score===''?null:Number(f.sas_score),opp=f.opponent_score===''?null:Number(f.opponent_score);
      if(finished&&(!Number.isInteger(sas)||!Number.isInteger(opp)||sas<0||opp<0)){notice('Completed games require both final scores.',true);return}
      await perform(async()=>{const values={team_scope:f.team_scope==='jv'?'jv':'varsity',opponent:String(f.opponent||'').trim(),game_date:f.game_date,tipoff_time:f.tipoff_time||null,location:f.location||'',venue:f.venue||'home',event_name:f.event_name||'',status:f.status||'scheduled',sas_score:finished?sas:null,opponent_score:finished?opp:null,summary:f.summary||'',published:Boolean(f.published)};await saveRow('games',old?{id:old.id,...values}:values,old?'update':'insert');state.modal=null},'Game saved');return;
    }
    if(type==='gameStat'&&isCoach()){
      const game=state.modal?.obj;if(!game)return;
      const player=records('profiles').find(p=>p.id===f.player_id&&p.role==='player'&&p.team_id===game.team_scope);if(!player){notice('Select a player on the game team.',true);return}
      const keys=['points','rebounds','assists','steals','turnovers','fg_made','fg_attempted','ft_made','ft_attempted'];const row={game_id:game.id,player_id:player.id};
      for(const key of keys){if(f[key]===''){row[key]=['points','rebounds','assists','steals','turnovers'].includes(key)?0:null}else{row[key]=Number(f[key]);if(!Number.isInteger(row[key])||row[key]<0){notice('Game stats must be nonnegative whole numbers.',true);return}}}
      if(row.fg_made!==null&&row.fg_attempted!==null&&row.fg_made>row.fg_attempted||row.ft_made!==null&&row.ft_attempted!==null&&row.ft_made>row.ft_attempted){notice('Made shots cannot exceed attempted shots.',true);return}
      const old=records('game_player_stats').find(s=>s.game_id===game.id&&s.player_id===player.id);
      await perform(async()=>{await saveRow('game_player_stats',old?{id:old.id,...row}:row,old?'update':'insert');state.modal=null},'Player box score saved');return;
    }
    if(type==='addDrillToPractice'&&isCoach()){
      const d=state.modal?.obj,p=records('practices').find(x=>x.id===f.practice_id);
      if(!d||!p){notice('Practice not found.',true);return}
      if(!['both',p.team_scope].includes(d.team_scope)){notice('This drill is not assigned to the selected team.',true);return}
      if((p.activities||[]).some(a=>a.drill_id===d.id)){notice('This drill is already in that practice.',true);return}
      await perform(async()=>{await saveRow('practices',{id:p.id,activities:[...(p.activities||[]),{drill_id:d.id,name:d.name,completed:false}]},'update');state.modal=null},'Drill added to practice');return;
    }

    if(type==='deletePlayer'&&isHeadCoach()&&LIVE){
      const p=state.modal?.obj;if(!p||p.role!=='player')return;
      const rosterName=p.roster_name||p.display_name;
      if(f.confirm_roster_name!==rosterName){notice('Name does not match the roster. Nothing was deleted.',true);return}
      await perform(async()=>{
        await coachAdminRequest({action:'delete_player',player_id:p.id,confirm_roster_name:rosterName,team_id:p.team_id});
        state.modal=null;
      },'Player account and PIN permanently deleted');return;
    }
    if(type==='deletePractice'&&isCoach()){
      const p=state.modal?.obj;if(!p)return;
      if(f.confirm_title!==p.title){notice('Practice title does not match. Nothing was deleted.',true);return}
      await perform(async()=>{
        if(LIVE){const {data,error}=await supabase.from('practices').delete().eq('id',p.id).select('id');if(error)throw error;if(!data?.length)throw Error('The practice was not deleted. Check your permissions.');}
        else{
          for(const table of ['practice_notes','practice_challenges','challenge_results'])state.data[table]=records(table).filter(x=>x.practice_id!==p.id);
          state.data.practices=records('practices').filter(x=>x.id!==p.id);persistDemo();
        }
         // Remove practice-only drill records after the plan is deleted. Shared library drills remain.
         for(const a of (p.activities||[])){
           const d=records('drills').find(x=>x.id===a.drill_id&&x.in_library===false);
           if(!d)continue;
           const alsoUsed=records('practices').some(other=>other.id!==p.id&&(other.activities||[]).some(x=>x.drill_id===d.id));
           if(alsoUsed)continue;
           try{
             if(LIVE){const {data}=await supabase.storage.from(DRILL_BUCKET).list(d.id);
               if(data?.length)await supabase.storage.from(DRILL_BUCKET).remove(data.map(x=>d.id+'/'+x.name));}
             await saveRow('drills',{id:d.id},'delete');
           }catch(_e){/* A failed file cleanup never triggers deletion of shared library drills. */}
         }
         state.modal=null;
         if(state.editing?.id===p.id)state.editing=null;
       },'Practice and related records deleted');return;
    }
    if(type==='clearTeamResult'&&isCoach()){
      const r=state.modal?.obj;if(!r||!f.confirmed)return;
      await perform(async()=>{await saveRow('practice_challenges',{id:r.id,status:'pending',result_value:null,notes:'',next_focus:'',recorded_by:null},'update');state.modal=null},'Challenge result and shared notes cleared');return;
    }
    if(type==='deleteIndividualResult'&&isCoach()){
      const r=state.modal?.obj;if(!r||!f.confirmed)return;
      await perform(async()=>{await saveRow('challenge_results',{id:r.id},'delete');state.modal=null},'Individual challenge attempt deleted');return;
    }
    if(type==='signin'||type==='pinSignin'){
      state.loadError='';try{state.busy=true;
        if(type==='pinSignin'&&!/^[0-9]{6}$/.test(String(f.pin||'')))throw Error('Enter your six-digit PIN.');
        const creds=type==='pinSignin'?playerCredentials(String(f.pin)):{email:f.email,password:f.password};
        const {data,error}=await supabase.auth.signInWithPassword(creds);if(error)throw error;
        await loadUser(data.user.id);
        if(type==='pinSignin' && state.role && state.role!=='player'){await supabase.auth.signOut();throw Error('This PIN is not assigned to a player.');}
      }catch(e){state.loadError=type==='pinSignin'?'That PIN was not recognized. Check with your coach.':e.message;render()}finally{state.busy=false}return;
    }
    if(type==='nickname'&&state.role==='player'&&LIVE){
      try{
        const name=String(f.display_name||'').trim();if(name.length<1||name.length>40)throw Error('Use a display name up to 40 characters.');
        const {error}=await supabase.from('profiles').update({display_name:name}).eq('id',userId());if(error)throw error;
        state.profile.display_name=name;state.authScreen='entry';state.loadError='';await refreshLive();
      }catch(e){state.loadError=e.message;render()}return;
    }
    if(type==='resetPlayerPin'&&isCoach()&&LIVE){
      try{const player=state.modal.obj;const result=await coachAdminRequest({action:'reset',player_id:player.id});state.modal={type:'pinCreated',obj:{...result,roster_name:player.roster_name||player.display_name}};render()}
      catch(e){notice(e.message,true)}return;
    }
    if(type==='newPlayer'&&isCoach()&&LIVE){
      try{
        const result=await coachAdminRequest({action:'create',roster_name:String(f.roster_name||'').trim(),team_id:f.team_scope});
        state.modal={type:'pinCreated',obj:result};await refreshLive();render();
      }catch(e){notice(e.message,true)}return;
    }

    if(type==='changePassword'&&isStaff()){
      if(String(f.password)!==String(f.confirm_password)){notice('Passwords do not match',true);return}
      if(String(f.password).length<12){notice('Use at least 12 characters',true);return}
      try{const {error}=await supabase.auth.updateUser({password:f.password});if(error)throw error;state.modal=null;render();notice('Password updated successfully')}
      catch(e){notice('Password update failed: '+e.message,true)}return;
    }
    if(type==='challenge'&&isCoach()){
      const participantType=f.participant_type==='individual'?'individual':'team';
      const assignmentMode=participantType==='individual'?(f.assignment_mode==='selected'?'selected':'all'):'all';
      const recurring=participantType==='team'&&f.recurrence==='every_practice'?'every_practice':'manual';
      const teamScope=['varsity','jv','both'].includes(f.team_scope)?f.team_scope:'varsity';
      const item={name:String(f.name).trim(),description:f.description||'',team_scope:teamScope,metric_unit:String(f.metric_unit).trim(),target_value:Number(f.target_value),time_limit_minutes:f.time_limit_minutes?Number(f.time_limit_minutes):null,published:Boolean(f.published),active:Boolean(f.active),participant_type:participantType,recurrence:recurring,assignment_mode:assignmentMode};
      if(!item.name||!item.metric_unit||!Number.isFinite(item.target_value)||item.target_value<0){notice('Name, unit, and valid target are required.',true);return}
      const assigned=new FormData(form).getAll('assignee_ids').map(String);
      if(assignmentMode==='selected'&&!assigned.length){notice('Choose at least one player for a selected individual challenge.',true);return}
      if(assignmentMode==='selected'&&assigned.some(pid=>{const p=records('profiles').find(x=>x.id===pid);return !p||p.role!=='player'||(teamScope!=='both'&&p.team_id!==teamScope)})){notice('Assigned players must belong to the selected team.',true);return}
      const old=state.modal.obj;
      if(old){const hasHistory=records('challenge_results').some(r=>r.challenge_id===old.id)||records('practice_challenges').some(r=>r.challenge_id===old.id);const oldType=isTeamChallenge(old)?'team':'individual';if(participantType!==oldType&&hasHistory){notice('Cannot change participant type after results exist. Create a new challenge instead.',true);return}if(isTeamChallenge(old)&&hasHistory&&teamScope!==old.team_scope){notice('Cannot change the team for a challenge with attached practice records. Create another challenge instead.',true);return}}
      await perform(async()=>{
        let challengeId=old?.id;
        if(old)await saveRow('challenges',{...item,id:old.id},'update');
        else if(LIVE){const {data,error}=await supabase.from('challenges').insert({...item,created_by:userId()}).select('id').single();if(error)throw error;challengeId=data.id}
        else{challengeId=id();await saveRow('challenges',{...item,id:challengeId,created_by:userId()})}
        if(LIVE){const {error:delError}=await supabase.from('challenge_assignees').delete().eq('challenge_id',challengeId);if(delError)throw delError;if(assignmentMode==='selected'){const {error:insertError}=await supabase.from('challenge_assignees').insert(assigned.map(player_id=>({challenge_id:challengeId,player_id})));if(insertError)throw insertError}}
        else{state.data.challenge_assignees=records('challenge_assignees').filter(a=>a.challenge_id!==challengeId);if(assignmentMode==='selected')state.data.challenge_assignees.push(...assigned.map(player_id=>({challenge_id:challengeId,player_id})));syncDemoPracticeChallenges()}
        state.modal=null;
      },'Challenge saved');return;
    }
    if(type==='teamChallengeResult'&&isCoach()){
      const c=records('challenges').find(x=>x.id===state.modal?.obj?.challengeId);
      const p=records('practices').find(x=>x.id===f.practice_id);
      if(!c||!p||!matchesChallenge(c,p)){notice('Select a practice belonging to the challenge team.',true);return}
      await perform(async()=>{await persistTeamResult(c,p,f);state.modal=null},'Practice challenge result saved');return;
    }
    if(type==='challengeResult'&&(isCoach()||state.role==='player')){
      const c=state.modal.obj;if(isTeamChallenge(c)){notice('Only coaches log whole-team results. Choose a practice instead.',true);return}
      const value=Number(f.result_value);if(!Number.isFinite(value)||value<0){notice('Enter a valid result.',true);return}
      const pid=isCoach()?f.player_id:userId();
      if(c.assignment_mode==='selected'&&!records('challenge_assignees').some(a=>a.challenge_id===c.id&&a.player_id===pid)){notice('That player is not assigned this challenge.',true);return}
      const practiceId=f.practice_id||null;const prev=practiceId?records('challenge_results').find(r=>r.challenge_id===c.id&&r.player_id===pid&&r.practice_id===practiceId):null;
      if(prev&&!isCoach()){notice('An attempt already exists for that practice. Ask a coach to correct it.',true);return}
      await perform(async()=>{const row={challenge_id:c.id,player_id:pid,practice_id:practiceId,result_value:value,notes:f.notes||'',next_focus:f.next_focus||'',target_snapshot:prev?.target_snapshot??c.target_value,metric_unit_snapshot:prev?.metric_unit_snapshot??c.metric_unit,time_limit_snapshot:prev?.time_limit_snapshot??c.time_limit_minutes};await saveRow('challenge_results',prev?{...row,id:prev.id}:row,prev?'update':'insert');state.modal=null},'Individual challenge result saved');return;
    }
    if(type==='notebook'&&isCoach()){
      await perform(async()=>{await saveRow('coaching_notes',{team_scope:f.team_scope,category:f.category,title:f.title.trim(),note:f.note.trim(),player_id:f.player_id||null,opponent:f.opponent||'',created_by:userId()});state.modal=null},'Private coaching note saved');return;
    }
    if(type==='resource'&&(isCoach()||state.role==='player')){
      await perform(async()=>{
        const player=state.role==='player';const resourceType=player?'link':f.resource_type;const section=player?'skill':f.library_section;let url=null,path=null,mime=null;
        if(resourceType==='link'){
          url=String(f.external_url||'').trim();const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol))throw Error('Only http/https links are supported.');
        }else{
          const file=form.querySelector('[name=resource_file]').files?.[0];
          if(!file||file.size<1)throw Error('Choose a file to upload.');
          if(file.size>20*1024*1024)throw Error('File must be 20MB or smaller.');
          if(!/\.(pdf|doc|docx|ppt|pptx|png|jpe?g|webp|txt)$/i.test(file.name))throw Error('Unsupported file type.');
          path=id()+'/'+file.name.replace(/[^a-zA-Z0-9._-]/g,'_');mime=file.type||'application/octet-stream';
          const {error:uploadError}=await supabase.storage.from('sas-basketball-resources').upload(path,file,{contentType:mime,upsert:false});
          if(uploadError)throw uploadError;
        }
        try{await saveRow('resources',{title:String(f.title).trim(),description:f.description||'',team_scope:player||section==='skill'?'both':f.team_scope,library_section:section,skill_category:f.skill_category||'General',review_status:player?'pending':'approved',required_review:!player&&section==='essentials'&&Boolean(f.required_review),resource_type:resourceType,storage_path:path,external_url:url,mime_type:mime,published:!player&&Boolean(f.published),staff_only:!player&&Boolean(f.staff_only),contributor_label:state.profile?.display_name||'Program member',uploaded_by:userId()});}
        catch(err){if(path)await supabase.storage.from('sas-basketball-resources').remove([path]);throw err}
        state.modal=null;
      },state.role==='player'?'Resource submitted for coach review':'Resource added');return;
    }
    if(type==='practiceDrill'&&isCoach()&&state.page==='practiceEditor'){
      const competency=String(f.competency==='__custom__'?f.competency_other||'':f.competency||'').trim();
      if(!competency||competency.length>100){notice('Choose or type a competency.',true);return}
      const files=Array.from(form.querySelector('input[name="practice_drill_files"]')?.files||[]);
      try{validateDrillFiles(files);if(files.length&&!LIVE)throw Error('File upload requires live Supabase; demo allows drills without attachments.')}catch(e){notice(e.message,true);return}
      const draftId=id();
      state.draftDrillFiles[draftId]=files;
      state.draftActivities.push({temp_id:draftId,drill_id:null,name:String(f.name||'').trim(),competency,situation:String(f.situation||'').trim(),description:String(f.description||'').trim(),coaching_cues:String(f.coaching_cues||'').trim(),status:'Proposed',completed:false,save_to_library:Boolean(f.save_to_library)});
      state.modal=null;render();notice('Drill added to this practice. Save the plan to keep it.');return;
    }
    if(type==='practice'&&isCoach()){
      const resolvePriority=key=>String(f[key]==='__custom__'?f[key+'_other']||'':f[key]||'').trim();
      const pri=[0,1,2].map(i=>resolvePriority('primary_'+i)),per=[0,1].map(i=>resolvePriority('peripheral_'+i));
      const chosen=[...pri,...per];
      if(chosen.some(x=>!x)){notice('Complete all five instructional priorities. If you select Other, type the custom priority.',true);return}
      if(chosen.some(x=>x.length>100)){notice('Each instructional priority must be 100 characters or less.',true);return}
      if(new Set(chosen.map(x=>x.toLocaleLowerCase())).size!==5){notice('Select five distinct priorities so each has a clear purpose.',true);return}
      const timeSlot=String(f.practice_time_slot||'');
      if(!PRACTICE_TIME_SLOTS.some(slot=>slot.value===timeSlot)&& !(state.editing&&practiceSlot(state.editing)===timeSlot)){
        notice('Choose a practice time: 3:00–5:00 PM or 4:30–6:00 PM.',true);return;
      }
      if(!PRACTICE_GYMS.some(gym=>gym.value===f.location)&& !(state.editing&&state.editing.location===f.location)){
        notice('Choose High School, Elementary School, or Middle School Gym.',true);return;
      }
      const [start_time,end_time]=timeSlot.split('-');
       const practice={practice_date:f.practice_date,title:f.title.trim(),location:f.location.trim(),start_time,end_time,primary_priorities:pri,peripheral_priorities:per,activities:[],live_application:f.live_application,published:Boolean(f.published),status:state.editing?.status||'planned',layups_result:state.editing?.layups_result??null,team_scope:f.team_scope};
      const old=state.editing;
      await perform(async()=>{
        let practiceId=old?.id;
        const createdIds=[];
        const activities=state.draftActivities.map(a=>({...a}));
        try{
         for(const a of activities){
           if(!a.temp_id)continue;
           const newId=id();
           const drill={id:newId,name:a.name,competency:a.competency,situation:a.situation,description:a.description,coaching_cues:a.coaching_cues,status:'Proposed',published:Boolean(practice.published),in_library:Boolean(a.save_to_library),team_scope:practice.team_scope,created_by:userId()};
           await saveRow('drills',drill);
           createdIds.push(newId);
           const files=state.draftDrillFiles[a.temp_id]||[];
           if(files.length)await uploadDrillFiles(newId,files);
           a.drill_id=newId;a.library_saved=drill.in_library;
           delete a.temp_id;delete a.save_to_library;
         }
         practice.activities=activities;
         if(old)await saveRow('practices',{...practice,id:old.id},'update');
         else if(LIVE){const {data,error}=await supabase.from('practices').insert(practice).select('id').single();if(error)throw error;practiceId=data.id}
         else{practiceId=id();await saveRow('practices',{...practice,id:practiceId})}
         // Synchronize player visibility for one-practice drills when a saved plan is republished.
         for(const a of activities){
           const linked=records('drills').find(x=>x.id===a.drill_id);
           if(linked?.in_library===false&&(!createdIds.includes(linked.id)))
             await saveRow('drills',{id:linked.id,published:Boolean(practice.published),team_scope:practice.team_scope},'update');
         }
        }catch(error){
         for(const drillId of createdIds.reverse()){
           try{
             if(LIVE){
               const {data}=await supabase.storage.from(DRILL_BUCKET).list(drillId);
               if(data?.length)await supabase.storage.from(DRILL_BUCKET).remove(data.map(x=>drillId+'/'+x.name));
             }
             await saveRow('drills',{id:drillId},'delete');
           }catch(_cleanup){/* Retain original error; any orphan drill is still invisible to the Library. */}
         }
         throw error;
        }
        const skipped=new FormData(form).getAll('skip_benchmark').map(String);
        const relevant=records('challenges').filter(c=>c.active&&isTeamChallenge(c)&&c.recurrence==='every_practice'&&matchesChallenge(c,{team_scope:practice.team_scope}));
        if(LIVE){for(const c of relevant){const {error}=await supabase.from('practice_challenges').update({status:skipped.includes(c.id)?'skipped':'pending',result_value:null}).eq('practice_id',practiceId).eq('challenge_id',c.id).neq('status','completed');if(error)throw error}}
        else{syncDemoPracticeChallenges();for(const c of relevant){const r=records('practice_challenges').find(r=>r.practice_id===practiceId&&r.challenge_id===c.id);if(r&&r.status!=='completed'){r.status=skipped.includes(c.id)?'skipped':'pending';r.result_value=null}}}
        state.editing=null;state.draftDrillFiles={};state.viewingPracticeId=practiceId;state.page='practiceView';
      },old?'Practice updated':'Practice created');return;
    }
    if(type==='drill'&&isCoach()){
      const competency=String(f.competency==='__custom__'?f.competency_other||'':f.competency||'').trim();
      if(!competency || competency.length>100){notice('Enter a primary competency of 1 to 100 characters.',true);return}
      const files=Array.from(form.querySelector('input[name="drill_files"]')?.files||[]);
      try{validateDrillFiles(files);if(files.length&&!LIVE)throw Error('File uploads require the live app.')}catch(e){notice(e.message,true);return}
      let uploadIssue='';
      await perform(async()=>{
        const drillId=id();
        await saveRow('drills',{id:drillId,name:f.name.trim(),competency,situation:f.situation,description:f.description,coaching_cues:f.coaching_cues,status:f.status,published:f.published==='true',team_scope:f.team_scope,source_resource_id:f.source_resource_id||null,created_by:userId()});
        if(files.length)try{await uploadDrillFiles(drillId,files)}catch(e){uploadIssue=e.message}
        state.modal=null;
      },'Drill saved to library');
      if(uploadIssue)notice('Drill saved, but one or more files were not uploaded. Open the drill to retry. '+uploadIssue,true);
      return;
    }
    if(type==='addDrillFiles'&&isCoach()){
      const d=state.modal?.obj;
      const files=Array.from(form.querySelector('input[name="drill_files"]')?.files||[]);
      if(!d||!files.length){notice('Choose at least one file.',true);return}
      try{validateDrillFiles(files);if(!LIVE)throw Error('File uploads require the live app.')}catch(e){notice(e.message,true);return}
      let uploadIssue='';
      await perform(async()=>{
        try{await uploadDrillFiles(d.id,files)}catch(e){uploadIssue=e.message}
        state.modal={type:'drillDetails',obj:d};
      },'Drill attachments updated');
      if(uploadIssue)notice('One or more files were not uploaded. Reopen Add files to retry. '+uploadIssue,true);
      return;
    }
    if(type==='addActivity'&&isCoach()){const d=records('drills').find(x=>x.id===f.drill_id);if(d){state.draftActivities.push({drill_id:d.id,name:d.name,competency:d.competency,situation:d.situation,description:d.description,coaching_cues:d.coaching_cues,completed:false,library_saved:true});closeModal()}return}
    if(type==='logPractice'&&isCoach()){
      const p=state.modal.obj;const note=records('practice_notes').find(x=>x.practice_id===p.id);
      const activities=(p.activities||[]).map((a,i)=>({...a,completed:Boolean(f['activity_'+i])}));
      await perform(async()=>{
        await saveRow('practices',{id:p.id,status:f.status,activities},'update');
        const record={practice_id:p.id,notes:f.notes||'',next_focus:f.next_focus||''};
        if(note)await saveRow('practice_notes',record,'update','practice_id');else await saveRow('practice_notes',record);
        for(const c of recurringForPractice(p)){
          const key=c.id,status=f['challenge_status_'+key]||'pending';
          const existing=challengePracticeRow(c,p);
          const score=f['challenge_result_'+key]||'';
          const sharedNotes=f['challenge_notes_'+key]||'';
          const focus=f['challenge_focus_'+key]||'';
          if(existing?.status===status && (existing?.result_value??'')==score && existing?.notes===sharedNotes && existing?.next_focus===focus)continue;
          await persistTeamResult(c,p,{status,result_value:score,notes:sharedNotes,next_focus:focus});
        }
        state.modal=null;
      },'Practice check-in recorded');return;
    }
    if(type==='assignment'&&isCoach()){
      const files=[...form.querySelector('input[name="media_files"]').files];const link=String(f.external_url||'').trim();
      try{sanitizeMediaFiles(files,ASSIGNMENT_MEDIA_TYPES,20971520,5);if(link&&!safeHttpUrl(link))throw Error('Enter a valid link.');if(files.length&&!LIVE)throw Error('File uploads require the live app.');}catch(err){notice(err.message,true);return}
      await perform(async()=>{
        const aid=id();await saveRow('assignments',{id:aid,title:f.title,description:f.description,due_date:f.due_date,team_scope:f.team_scope,published:Boolean(f.published)});
        if(files.length)await saveUploadedMedia(ASSIGNMENT_MEDIA_BUCKET,'assignment_media','assignment_id',aid,files,ASSIGNMENT_MEDIA_TYPES,20971520,null,{caption:String(f.caption||'').trim()});
        if(link)await createMediaLink('assignment_media','assignment_id',aid,link,String(f.caption||'').trim());state.modal=null;
      },'Assignment created');return;
    }
    if(type==='response'&&state.role==='player'){
      const a=state.modal.obj;if(!a?.published||!scopeVisible(a))return;
      const old=mine('assignment_responses').find(r=>r.assignment_id===a.id);
      const files=[...form.querySelector('input[name="media_files"]').files],link=String(f.external_url||'').trim();
      try{sanitizeMediaFiles(files,ASSIGNMENT_MEDIA_TYPES,20971520,5);if(link&&!safeHttpUrl(link))throw Error('Enter a valid evidence link.');if(files.length&&!LIVE)throw Error('File uploads require the live app.');}catch(err){notice(err.message,true);return}
      await perform(async()=>{
        if(old)await saveRow('assignment_responses',{id:old.id,response:f.response},'update');
        else await saveRow('assignment_responses',{assignment_id:a.id,player_id:userId(),response:f.response});
        if(files.length)await saveUploadedMedia(ASSIGNMENT_MEDIA_BUCKET,'assignment_media','assignment_id',a.id,files,ASSIGNMENT_MEDIA_TYPES,20971520,userId(),{caption:String(f.caption||'').trim()});
        if(link)await createMediaLink('assignment_media','assignment_id',a.id,link,String(f.caption||'').trim(),userId());state.modal=null;
      },'Assignment response and evidence saved');return;
    }
    if(type==='goal'&&!isCoach()){await perform(async()=>{await saveRow('goals',{player_id:userId(),title:f.title,target:f.target,status:'Not started',created_at:new Date().toISOString()});state.modal=null},'Goal added');return}
    if(type==='reflection'&&!isCoach()){await perform(async()=>{await saveRow('reflections',{player_id:userId(),prompt:f.prompt,response:f.response,created_at:new Date().toISOString()});state.modal=null},'Reflection saved');return}
  });
  setInterval(()=>{if(!state.role)return;for(const target of ROOT.querySelectorAll('[data-next-game]')){const next=teamGames().filter(g=>g.status==='scheduled'&&gameTimeMillis(g)>=Date.now()-3600000).sort((a,b)=>gameTimeMillis(a)-gameTimeMillis(b))[0];target.innerHTML=gameCountdown(next)}if(LIVE)void loadV045Previews()},60000);
  initialize();
})();
