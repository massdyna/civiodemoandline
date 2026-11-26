/* CiViO บริการหลังการขาย — core.js : ข้อมูล กฎการคำนวณ ระบบอัตโนมัติ และแจ้งเตือน LINE
   ข้อมูลเก็บในเบราว์เซอร์ (localStorage) ผ่าน load()/save() เท่านั้น
   เมื่อมีเซิร์ฟเวอร์/ฐานข้อมูลจริง ให้เปลี่ยนเฉพาะสองฟังก์ชันนี้ */
'use strict';
const KEY='civio_service_v2', SKEY='civio_service_session_v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Math.random().toString(36).slice(2,9);
const pad=n=>String(n).padStart(2,'0');
const fmt=d=>{d=new Date(d);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
const T0=()=>fmt(new Date());
const D=s=>new Date(s+'T00:00:00');
const addDays=(s,n)=>{const d=D(s);d.setDate(d.getDate()+n);return fmt(d)};
const addMonths=(s,n)=>{const d=D(s),day=d.getDate();d.setMonth(d.getMonth()+n);if(d.getDate()!==day)d.setDate(0);return fmt(d)};
const diff=(a,b)=>Math.round((D(b)-D(a))/864e5);
const th=s=>s?D(s.slice(0,10)).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}):'-';
const thDay=s=>D(s).toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long'});
const thMonth=(y,m)=>new Date(y,m,1).toLocaleDateString('th-TH',{month:'long',year:'numeric'});
const rel=s=>{const d=diff(T0(),s);return d===0?'วันนี้':d===1?'พรุ่งนี้':d===-1?'เมื่อวาน':d>0?`อีก ${d} วัน`:`เลยมา ${-d} วัน`};

/* ---------- รหัสผ่าน (SHA-256 + salt) ---------- */
function sha256(str){const K=[],H=[];let isP=n=>{for(let i=2;i*i<=n;i++)if(n%i==0)return false;return true};const fr=x=>((x-Math.floor(x))*4294967296)|0;
 for(let n=2,c=0;c<64;n++)if(isP(n)){if(c<8)H[c]=fr(Math.pow(n,.5));K[c++]=fr(Math.pow(n,1/3))}
 const b=unescape(encodeURIComponent(str)),w=[],L=b.length*8;for(let i=0;i<b.length;i++)w[i>>2]|=b.charCodeAt(i)<<(24-(i%4)*8);
 w[L>>5]|=0x80<<(24-L%32);w[(((L+64)>>9)<<4)+15]=L;
 for(let j=0;j<w.length;j+=16){const x=w.slice(j,j+16),h=H.slice(0),r=(v,n)=>(v>>>n)|(v<<(32-n));
  for(let i=0;i<64;i++){if(i>=16){const a=x[i-15],c=x[i-2];x[i]=(x[i-16]+(r(a,7)^r(a,18)^(a>>>3))+x[i-7]+(r(c,17)^r(c,19)^(c>>>10)))|0}
   const t1=(h[7]+(r(h[4],6)^r(h[4],11)^r(h[4],25))+((h[4]&h[5])^(~h[4]&h[6]))+K[i]+x[i])|0,t2=((r(h[0],2)^r(h[0],13)^r(h[0],22))+((h[0]&h[1])^(h[0]&h[2])^(h[1]&h[2])))|0;
   h.pop();h.unshift((t1+t2)|0);h[4]=(h[4]+t1)|0}
  for(let i=0;i<8;i++)H[i]=(H[i]+h[i])|0}
 return H.map(v=>('00000000'+(v>>>0).toString(16)).slice(-8)).join('')}
const hashPw=(salt,pw)=>{let h=pw;for(let i=0;i<2000;i++)h=sha256(salt+h);return h};
const mkUser=(username,name,role,pw,extra={})=>{const salt=uid()+uid();return Object.assign({id:'u'+uid(),username:username.toLowerCase(),name,role,customerId:null,status:'active',salt,hash:hashPw(salt,pw),createdAt:new Date().toISOString()},extra)};

/* ---------- ค่าคงที่ ---------- */
const DEF_MODELS=['CV15','CV25','CV50','CV100','CV150','CV250','CV500','CV750','CV1000','KAIBIN'];
const DEF_SYMPTOMS=['เครื่องไม่ทำงาน / ไฟไม่เข้า','มีกลิ่นผิดปกติ','เสียงดัง / สั่นผิดปกติ','ใบกวน / มอเตอร์ติด','จอสัมผัส / PLC ขัดข้อง','ฝา / ประตูปิดไม่สนิท','ความร้อนไม่ขึ้น','ไส้กรอง / ระบบระบายอากาศ','อื่น ๆ'];
const INSP_SYM='ตรวจเช็กตามรอบ';
const STATUS=['ใหม่','นัดหมายแล้ว','กำลังดำเนินการ','รออะไหล่','เสร็จสิ้น','ปิดงาน'];
const OPEN=s=>s!=='เสร็จสิ้น'&&s!=='ปิดงาน';
const PRIO=['ปกติ','ด่วน','เร่งด่วนมาก'];
const GEN='ตรวจเช็กทั่วไป';
const DEMO_PW='civio1234';
const DEMO_USERS=[['exec@civio.demo','ผู้บริหาร (ทดลอง)','exec'],['sales@civio.demo','ทีมขาย (ทดลอง)','sales'],['tech@civio.demo','ช่างบริการ (ทดลอง)','tech'],['hotel@demo.th','ลูกค้า (ทดลอง)','customer']];

/* ---------- ที่เก็บข้อมูล ---------- */
let db=null,sess=null;
const defaultSettings=()=>({warnDays:[90,30,7],inspectMonths:3,inspectNotice:14,apptNotice:[3],checkNotice:3,
 checkItems:[{name:'เปลี่ยนไส้กรองกลิ่น',months:6},{name:'ตรวจสายพาน/ใบกวน',months:12}],
 models:DEF_MODELS.map(name=>({name,warranty:12,inspect:3})),symptoms:[...DEF_SYMPTOMS],
 autoInsp:true,autoInspDays:14,autoRemind:true,jobsPerDay:4,workSunday:false,
 lineOA:'',endpoint:'',secret:'',company:'CiViO Thailand',phone:'086-351-7534',demoHints:true});
/* เริ่มต้นแบบว่างเปล่า — ไม่มีลูกค้า เครื่อง งาน หรืออะไหล่ตัวอย่าง มีเฉพาะบัญชีทดลอง (เติมใน normalize) */
const seed=()=>({v:3,users:[],customers:[],machines:[],tickets:[],parts:[],inspections:[],outbox:[],sales:[],settings:defaultSettings(),seq:0,autoSkip:{},autoLog:[]});

/* ล้างข้อมูลสมมติที่รุ่นเก่าเคยใส่ไว้ (ระบุจากข้อความ “ข้อมูลตัวอย่าง” ในที่อยู่ลูกค้า) ไม่แตะข้อมูลที่กรอกเอง */
function purgeSample(d){
 const fake=new Set(d.customers.filter(c=>/^c[1-6]$/.test(c.id)&&String(c.address).includes('(ข้อมูลตัวอย่าง)')).map(c=>c.id));
 if(!fake.size)return;
 const ms=new Set(d.machines.filter(m=>fake.has(m.customerId)&&/^m[1-8]$/.test(m.id)).map(m=>m.id));
 d.machines=d.machines.filter(m=>!ms.has(m.id));
 d.tickets=d.tickets.filter(t=>!ms.has(t.machineId));
 d.inspections=d.inspections.filter(i=>!ms.has(i.machineId));
 const keep=new Set(d.machines.map(m=>m.customerId));
 d.customers=d.customers.filter(c=>!fake.has(c.id)||keep.has(c.id));
 const used=new Set(d.tickets.flatMap(t=>(t.parts||[]).map(p=>p.partId)));
 const sku=['FLT-01','BLT-02','BLD-03','SNS-04','RLY-05','HMI-06','SEL-07','MTR-08'];
 d.parts=d.parts.filter(p=>!(/^p[1-8]$/.test(p.id)&&sku.includes(p.sku)&&!used.has(p.id)));
 const have=new Set(d.customers.map(c=>c.id));
 d.outbox=d.outbox.filter(o=>have.has(o.customerId));
 d.users.forEach(u=>{if(u.customerId&&!have.has(u.customerId))u.customerId=null});
}
/* ทำให้ข้อมูลทุกรุ่น (รวมไฟล์สำรองเก่า) มีโครงสร้างครบ */
function normalize(d){
 const old=!d.settings||!d.settings.models;
 ['users','customers','machines','tickets','parts','inspections','outbox','sales','autoLog'].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[]});
 d.autoSkip=d.autoSkip||{};d.seq=d.seq||0;
 d.sales.forEach(x=>{x.id=x.id||uid()});
 d.settings=Object.assign(defaultSettings(),d.settings||{});
 if(old)purgeSample(d);
 d.machines.forEach(m=>{if(m.model&&!d.settings.models.some(x=>x.name===m.model))d.settings.models.push({name:m.model,warranty:12,inspect:3})});
 d.tickets.forEach(t=>{t.parts=t.parts||[];t.history=t.history||[]});
 if(!d.demoAdded){
  DEMO_USERS.forEach(([e,name,role])=>{const u=d.users.find(x=>x.username===e);
   if(!u)d.users.push(mkUser(e,name,role,DEMO_PW,{demo:true}));
   else if(u.hash===hashPw(u.salt,DEMO_PW))u.demo=true});
  d.settings.demoHints=true;d.demoAdded=true}
 d.v=3;return d}
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}};
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){if(typeof toast==='function')toast('บันทึกข้อมูลในเบราว์เซอร์ไม่สำเร็จ')}};

/* ---------- ตัวช่วยอ่านข้อมูล ---------- */
const cust=id=>db.customers.find(c=>c.id===id)||{name:'(ไม่พบลูกค้า)'};
const mach=id=>db.machines.find(m=>m.id===id)||{model:'-',serial:'-'};
const mLabel=m=>`${m.model} · ${m.serial}`;
const who=c=>c.contact||c.name;
const models=()=>db.settings.models.map(m=>m.name);
const modelDef=n=>db.settings.models.find(m=>m.name===n)||{name:n,warranty:12,inspect:db.settings.inspectMonths};
const symptoms=()=>db.settings.symptoms;
const techs=()=>[...new Set(db.users.filter(u=>u.role==='tech'&&u.status==='active').map(u=>u.name))];

/* ---------- ประกัน / ตรวจเช็ก ---------- */
const wEnd=m=>addMonths(m.installDate||m.deliveryDate,m.warrantyMonths===0?0:(+m.warrantyMonths||12));
function wInfo(m){const end=wEnd(m),d=diff(T0(),end);return {end,days:d,state:d<0?'expired':d<=90?'soon':'ok'}}
const lastInsp=m=>db.inspections.filter(i=>i.machineId===m.id&&(!i.item||i.item===GEN)).sort((a,b)=>b.date.localeCompare(a.date))[0];
function nextInsp(m){const base=(lastInsp(m)||{}).date||m.installDate||m.deliveryDate;return addMonths(base,+m.inspectMonths||db.settings.inspectMonths)}
const checkItems=()=>db.settings.checkItems||[];
function nextCheck(m,it){const r=db.inspections.filter(i=>i.machineId===m.id&&i.item===it.name).sort((a,b)=>b.date.localeCompare(a.date))[0];return addMonths(r?r.date:(m.installDate||m.deliveryDate),+it.months||12)}
/* รายการที่ครบกำหนดภายใน horizon วัน */
const dueItems=(m,horizon)=>[{name:GEN,date:nextInsp(m)},...checkItems().map(it=>({name:it.name,date:nextCheck(m,it)}))].filter(x=>diff(T0(),x.date)<=horizon).sort((a,b)=>a.date.localeCompare(b.date));
const machTickets=id=>db.tickets.filter(t=>t.machineId===id);
const openInspJob=mid=>db.tickets.find(t=>t.machineId===mid&&t.kind==='inspection'&&OPEN(t.status));
const repeatMachines=()=>db.machines.map(m=>({m,n:machTickets(m.id).filter(t=>t.kind==='repair'&&diff(t.createdAt,T0())<=180).length})).filter(x=>x.n>=2).sort((a,b)=>b.n-a.n);
const avgRating=a=>{const r=a.filter(t=>t.rating);return r.length?(r.reduce((s,t)=>s+t.rating.score,0)/r.length):0};

/* ---------- ตารางงาน ---------- */
const isWorkDay=ds=>db.settings.workSunday||D(ds).getDay()!==0;
const jobsOn=(ds,except)=>db.tickets.filter(t=>t.appointment===ds&&OPEN(t.status)&&t.id!==except).sort((a,b)=>(a.appointmentTime||'99').localeCompare(b.appointmentTime||'99'));
const loadOf=(tech,ds,except)=>jobsOn(ds,except).filter(t=>t.assignee===tech).length;
const dayFull=(ds,tech,except)=>{const cap=+db.settings.jobsPerDay||4;return tech?loadOf(tech,ds,except)>=cap:jobsOn(ds,except).length>=cap*Math.max(1,techs().length)};
/* ช่างที่งานน้อยที่สุดในวันนั้น (เสมอกันเลือกคนที่งานค้างรวมน้อยกว่า) */
function pickTech(ds){const all=t=>db.tickets.filter(x=>OPEN(x.status)&&x.assignee===t).length;
 return techs().sort((a,b)=>loadOf(a,ds)-loadOf(b,ds)||all(a)-all(b))[0]||''}
function freeDay(from,tech,except){let d=from;for(let i=0;i<120;i++,d=addDays(d,1))if(isWorkDay(d)&&!dayFull(d,tech,except))return d;return from}
/* วันที่เสนอสำหรับงานตรวจเช็ก: ให้ทันกำหนดก่อน ถ้าเลยกำหนดแล้วเอาวันว่างที่ใกล้สุด */
function suggestDay(due){const first=addDays(T0(),1);for(let d=due;d>=first;d=addDays(d,-1))if(isWorkDay(d)&&!dayFull(d))return d;return freeDay(first)}

/* ---------- งาน / การตรวจเช็ก ---------- */
function nextTicketId(){const t=T0(),pre='RP-'+t.slice(2,4)+t.slice(5,7)+'-';let id;do{db.seq=(db.seq||0)+1;id=pre+pad(db.seq)}while(db.tickets.some(x=>x.id===id));return id}
function createTicket({customerId,machineId,symptom,desc='',priority='ปกติ',kind,by,appointment='',appointmentTime='',assignee='',tentative=false,auto=false,items,autoKeys,silent=false}){
 const t=T0(),k=kind||(symptom===INSP_SYM?'inspection':'repair');
 const x={id:nextTicketId(),customerId,machineId,symptom,desc,priority,status:appointment&&!tentative?'นัดหมายแล้ว':'ใหม่',assignee,appointment,appointmentTime:appointment?appointmentTime:'',createdAt:t,history:[{at:t,status:'ใหม่',note:auto?'ระบบสร้างให้อัตโนมัติ':'รับเรื่อง',by}],parts:[],rating:null,kind:k};
 if(k==='inspection')x.items=items&&items.length?items:[GEN];
 if(auto)Object.assign(x,{auto:true,autoKeys});
 if(tentative)x.tentative=true;
 if(x.status!=='ใหม่')x.history.push({at:t,status:x.status,note:`นัดวันที่ ${th(appointment)}${appointmentTime?' เวลา '+appointmentTime+' น.':''}`,by});
 db.tickets.unshift(x);save();
 if(!silent){const c=cust(customerId),what=k==='inspection'?'นัดตรวจเช็ก':'แจ้งซ่อม';
  queue('รับเรื่อง'+what,customerId,`เรียนคุณ${who(c)}\nCiViO ได้รับเรื่อง${what} ${x.id}${k==='repair'?` (${symptom})`:''} แล้ว ${appointment?`นัดวันที่ ${th(appointment)}${appointmentTime?' เวลา '+appointmentTime+' น.':''}`:'ทีมช่างจะติดต่อกลับเพื่อนัดหมายครับ'}`)}
 return x}
function recordInsp(machineId,item,date,by,note=''){db.inspections.push({id:uid(),machineId,item,date,by,note})}
/* ตัดรายการที่ตรวจแล้วออกจากงานที่ระบบเสนอไว้ (ยังไม่ยืนยัน) ถ้าไม่เหลือรายการก็ลบงานนั้น */
function settleTentative(machineId,done){db.tickets=db.tickets.filter(t=>{if(!(t.machineId===machineId&&t.auto&&t.tentative&&OPEN(t.status)))return true;t.items=(t.items||[]).filter(i=>!done.includes(i));return t.items.length>0})}
const dropTentative=machineId=>{db.tickets=db.tickets.filter(t=>!(t.machineId===machineId&&t.auto&&t.tentative))};

/* ---------- ระบบอัตโนมัติ ---------- */
function runAutoJobs(){
 let n=0;db.machines.forEach(m=>{
  if(!db.customers.some(c=>c.id===m.customerId)||openInspJob(m.id))return;
  const due=dueItems(m,+db.settings.autoInspDays||0).filter(x=>!db.autoSkip[`${m.id}|${x.name}|${x.date}`]);
  if(!due.length)return;
  const date=suggestDay(due[0].date);
  createTicket({customerId:m.customerId,machineId:m.id,symptom:INSP_SYM,kind:'inspection',by:'ระบบ',silent:true,auto:true,tentative:true,
   appointment:date,assignee:pickTech(date),items:due.map(x=>x.name),autoKeys:due.map(x=>`${m.id}|${x.name}|${x.date}`),
   desc:due.map(x=>`${x.name} ครบกำหนด ${th(x.date)}`).join(' · ')});n++});
 return n}
function runAuto(){
 const jobs=db.settings.autoInsp?runAutoJobs():0,msgs=db.settings.autoRemind?genReminders():0;
 if(jobs||msgs){const text=[jobs&&`สร้างงานตรวจเช็กลงตารางรอยืนยัน ${jobs} งาน`,msgs&&`เตรียมข้อความแจ้งเตือน ${msgs} ข้อความ`].filter(Boolean).join(' · ');
  db.autoLog.unshift({at:new Date().toISOString(),text});db.autoLog=db.autoLog.slice(0,20);save()}
 return {jobs,msgs}}

/* ---------- แจ้งเตือน LINE ---------- */
const sign=()=>`\n— ${db.settings.company} โทร ${db.settings.phone}`;
function queue(type,customerId,text,key,card){
 if(key&&db.outbox.some(o=>o.key===key))return false;
 const o={id:uid(),at:new Date().toISOString(),type,customerId,text:text+sign(),key:key||'',card:card||null,status:'รอส่ง'};
 db.outbox.unshift(o);save();autoSend(o);return true}
function autoSend(o){
 const s=db.settings,c=db.customers.find(x=>x.id===o.customerId);
 if(!s.endpoint||!c||!c.lineUserId)return;
 fetch(s.endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({to:c.lineUserId,text:o.text,card:o.card||undefined,secret:s.secret})})
  .then(r=>{o.status=r.ok?'ส่งแล้ว':'ส่งไม่สำเร็จ';save();if(typeof render==='function'&&location.hash.startsWith('#/line'))render()}).catch(()=>{o.status='ส่งไม่สำเร็จ';save()})}
function genReminders(){
 let n=0;const days=[...db.settings.warnDays].sort((a,b)=>a-b);
 db.machines.forEach(m=>{const c=db.customers.find(x=>x.id===m.customerId);if(!c)return;
  const w=wInfo(m),t=days.find(x=>w.days>=0&&w.days<=x);
  if(t!==undefined&&queue('ใกล้หมดประกัน',c.id,`เรียนคุณ${c.contact||c.name}\nเครื่อง ${mLabel(m)} จะหมดประกันวันที่ ${th(w.end)} (อีก ${w.days} วัน)\nสนใจต่อประกัน/สัญญาบริการ หรือขอตรวจเช็กก่อนหมดประกัน ตอบกลับข้อความนี้ได้เลยครับ`,`w:${m.id}:${w.end}:${t}`,{kind:'warranty',name:c.contact||c.name,label:mLabel(m),date:th(w.end),days:w.days}))n++;
  checkItems().forEach(it=>{const nk=nextCheck(m,it),dk=diff(T0(),nk);if(dk<=(+db.settings.checkNotice||0)&&queue('ถึงกำหนดเช็กรายการ',c.id,`เรียนคุณ${c.contact||c.name}\nเครื่อง ${mLabel(m)} ถึงกำหนด${it.name}วันที่ ${th(nk)}${dk<0?' (เลยกำหนดแล้ว)':dk===0?' (วันนี้)':` (อีก ${dk} วัน)`}\nกรุณาแจ้งวันเวลาที่สะดวก เพื่อให้ทีมช่างนัดหมายครับ`,`k:${m.id}:${it.name}:${nk}`,{kind:'check',name:c.contact||c.name,label:mLabel(m),item:it.name,date:th(nk),days:dk,machine_id:m.id}))n++});
  const ni=nextInsp(m),d=diff(T0(),ni);
  if(d<=db.settings.inspectNotice&&queue('ถึงรอบตรวจเช็ก',c.id,`เรียนคุณ${c.contact||c.name}\nเครื่อง ${mLabel(m)} ถึงรอบตรวจเช็กวันที่ ${th(ni)}${d<0?' (เลยกำหนดแล้ว)':''}\nกรุณาแจ้งวันเวลาที่สะดวก เพื่อให้ทีมช่างนัดหมายครับ`,`i:${m.id}:${ni}`,{kind:'inspect',name:c.contact||c.name,label:mLabel(m),date:th(ni),days:d}))n++});
  const ad=[...(db.settings.apptNotice||[3])].sort((a,b)=>a-b);
  db.tickets.filter(t=>t.appointment&&!t.tentative&&OPEN(t.status)).forEach(t=>{const c=db.customers.find(x=>x.id===t.customerId),m=mach(t.machineId);if(!c)return;
   const d=diff(T0(),t.appointment),tier=ad.find(x=>d>=0&&d<=x);if(tier===undefined)return;
   const what=t.kind==='inspection'?'ตรวจเช็ก':'ซ่อม',tm=t.appointmentTime||'';
   if(queue('เตือนนัดหมาย',c.id,`เรียนคุณ${c.contact||c.name}\nทีมช่าง CiViO นัดเข้า${what}เครื่อง ${mLabel(m)} ${d===0?'วันนี้':`วันที่ ${th(t.appointment)} (อีก ${d} วัน)`}${tm?` เวลา ${tm} น.`:''}${t.assignee?`\nผู้รับผิดชอบ: ${t.assignee}`:''}\nขอให้เตรียมพื้นที่ให้ช่างเข้าถึงเครื่องได้สะดวก หากต้องการเลื่อนนัดกรุณาแจ้งล่วงหน้าครับ`,`a:${t.id}:${t.appointment}:${tm}:${tier}`,{kind:'appointment',name:c.contact||c.name,label:mLabel(m),what,date:th(t.appointment),time:tm,days:d,assignee:t.assignee||'',code:t.id,machine_id:m.id}))n++});
 return n}
const lineShare=o=>'https://line.me/R/share?text='+encodeURIComponent(o.text);
const lineOA=o=>db.settings.lineOA?`https://line.me/R/oaMessage/${encodeURIComponent(db.settings.lineOA)}/?${encodeURIComponent(o.text)}`:lineShare(o);

