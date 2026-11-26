/* app.js : สิทธิ์ ปุ่มต่าง ๆ การเปลี่ยนหน้า การเข้าสู่ระบบ และเริ่มทำงาน */
'use strict';
/* สิทธิ์ของแต่ละบทบาท: nav = เมนูที่เห็น · edit = สิ่งที่เพิ่ม/แก้ได้ */
const ROLES={
 exec:{name:'ผู้บริหาร',nav:['dashboard','calendar','repairs','customers','machines','parts','line','bot','analysis','surveys','import','settings'],edit:['settings','line','approve','customers','machines','book','repairs','inspections','parts','import']},
 sales:{name:'ทีมขาย',nav:['dashboard','calendar','customers','machines','repairs','line','bot','import'],edit:['customers','machines','book','import','line','approve']},
 tech:{name:'ทีมบริการ / ช่าง',nav:['dashboard','calendar','repairs','machines','customers','parts','bot'],edit:['book','repairs','inspections','parts']},
 customer:{name:'ลูกค้า (องค์กร)',nav:['my','bot'],edit:['my']}};
const can=k=>!!sess&&ROLES[sess.role].edit.includes(k);
const mkSess=u=>({userId:u.id,role:u.role,customerId:u.customerId||null,name:u.name});
const loadSess=()=>{try{const r=JSON.parse(sessionStorage.getItem(SKEY));const u=r&&db.users.find(x=>x.id===r.userId&&x.status==='active');return u&&ROLES[u.role]?mkSess(u):null}catch(e){return null}};
const saveSess=()=>sessionStorage.setItem(SKEY,JSON.stringify({userId:sess.userId}));
const logout=()=>{sess=null;sessionStorage.removeItem(SKEY);AUTH.done=false;location.hash='';close();render()};

const go=path=>{close();if(location.hash==='#/'+path)render();else location.hash='#/'+path};
const saved=msg=>{save();toast(msg);render()};
const drop=(list,id)=>{db[list]=db[list].filter(x=>x.id!==id)};

/* ---------- ปุ่ม (data-act) ---------- */
const A={
 close:()=>closeSoft(),logout,pw:()=>FORMS.pw(),open:a=>go(a.dataset.p),
 'auth-tab':a=>{AUTH.tab=a.dataset.v;AUTH.mode='login';AUTH.done=false;renderAuth()},
 'auth-mode':a=>{AUTH.mode=a.dataset.v;AUTH.done=false;renderAuth()},
 'demo-login':a=>{const u=db.users.find(x=>x.id===a.dataset.id&&x.demo&&x.status==='active');if(u&&db.settings.demoHints)enter(u)},
 /* เพิ่มข้อมูล */
 add:()=>FORMS.add(),register:a=>FORMS.register(a.dataset.cid),
 'new-customer':()=>FORMS.customer(),'edit-customer':a=>FORMS.customer(a.dataset.id),
 'new-machine':a=>FORMS.machine(null,a.dataset.cid),'edit-machine':a=>FORMS.machine(a.dataset.id),
 book:a=>{const d=a.dataset;FORMS.book({mid:d.mid,cid:d.cid,date:d.date,kind:d.kind})},
 schedule:a=>FORMS.schedule(a.dataset.id),'upd-ticket':a=>FORMS.update(a.dataset.id),rate:a=>FORMS.rate(a.dataset.id),'rec-insp':a=>FORMS.insp(a.dataset.id),
 'confirm-job':a=>{const t=db.tickets.find(x=>x.id===a.dataset.id);if(!t)return;if(!t.appointment||t.appointment<T0())return FORMS.schedule(t.id);
  applyAppointment(t.id,{appointment:t.appointment,time:t.appointmentTime,assignee:t.assignee});saved(`ยืนยันนัด ${t.id} วันที่ ${th(t.appointment)} แล้ว`)},
 'new-part':()=>FORMS.part(),'edit-part':a=>FORMS.part(a.dataset.id),
 'stock-in':a=>{const p=db.parts.find(x=>x.id===a.dataset.id);modal('รับอะไหล่เข้าคลัง',`<p><b>${esc(p.name)}</b> คงเหลือ ${p.stock} ${esc(p.unit)}</p><label>จำนวนที่รับเข้า<input type="number" min="1" name="n" required value="1"></label>`,d=>{db.parts.find(x=>x.id===p.id).stock+=+d.n;saved('รับเข้าคลังแล้ว')},'รับเข้า')},
 'new-sale':()=>FORMS.sale(),
 'new-model':()=>FORMS.model(),'edit-model':a=>FORMS.model(a.dataset.id),'new-check':()=>FORMS.checkItem(),'edit-check':a=>FORMS.checkItem(a.dataset.id),'new-symptom':()=>FORMS.symptom(),
 'new-user':a=>FORMS.user(null,{cid:a.dataset.cid,role:a.dataset.role}),'edit-user':a=>FORMS.user(a.dataset.id),'reset-pw':a=>FORMS.resetPw(a.dataset.id),
 /* ลบ */
 'del-customer':a=>{const id=a.dataset.id,n=db.machines.filter(m=>m.customerId===id).length;if(n)return alert(`ลบไม่ได้: ลูกค้ารายนี้ยังมีเครื่อง ${n} เครื่อง\nให้ลบหรือย้ายเครื่องไปลูกค้ารายอื่นก่อน (ปุ่ม “แก้ไข” ที่หน้าเครื่อง)`);
  if(!confirm(`ลบลูกค้า “${cust(id).name}” ?`))return;drop('customers',id);db.users.forEach(u=>{if(u.customerId===id)u.customerId=null});db.outbox=db.outbox.filter(o=>o.customerId!==id);save();toast('ลบแล้ว');go('customers')},
 'del-machine':a=>{const id=a.dataset.id,m=mach(id),real=machTickets(id).filter(t=>!(t.auto&&t.tentative));if(real.length)return alert(`ลบไม่ได้: เครื่องนี้มีประวัติงาน ${real.length} รายการ\nถ้าลงทะเบียนผิดจริง ให้ลบงานเหล่านั้นก่อน`);
  if(!confirm(`ลบเครื่อง ${mLabel(m)} และประวัติการตรวจเช็กของเครื่องนี้?`))return;drop('machines',id);db.tickets=db.tickets.filter(t=>t.machineId!==id);db.inspections=db.inspections.filter(i=>i.machineId!==id);save();toast('ลบแล้ว');go('machines')},
 'del-ticket':a=>{const t=db.tickets.find(x=>x.id===a.dataset.id);if(!t||!confirm(`ลบงาน ${t.id} ?${t.parts.length?'\nอะไหล่ที่ใช้ในงานนี้จะถูกคืนเข้าคลัง':''}`))return;
  t.parts.forEach(p=>{const k=db.parts.find(x=>x.id===p.partId);if(k)k.stock+=p.qty});
  (t.autoKeys||[]).forEach(k=>db.autoSkip[k]=true);const m=db.machines.find(x=>x.id===t.machineId);
  if(m&&t.kind==='inspection'&&OPEN(t.status))dueItems(m,+db.settings.autoInspDays||0).forEach(x=>db.autoSkip[`${m.id}|${x.name}|${x.date}`]=true);
  drop('tickets',t.id);save();toast('ลบงานแล้ว');go('repairs')},
 'del-insp':a=>{if(confirm('ลบบันทึกการตรวจเช็กนี้? วันครบกำหนดรอบถัดไปจะคำนวณใหม่')){drop('inspections',a.dataset.id);saved('ลบแล้ว')}},
 'del-part':a=>{const id=a.dataset.id,n=db.tickets.filter(t=>t.parts.some(p=>p.partId===id)).length;if(n)return alert(`ลบไม่ได้: อะไหล่นี้ถูกใช้ในงาน ${n} รายการ (ตั้งคงเหลือเป็น 0 แทนได้)`);if(confirm('ลบอะไหล่นี้?')){drop('parts',id);saved('ลบแล้ว')}},
 'del-sale':a=>{if(confirm('ลบรายการขายนี้?')){drop('sales',a.dataset.id);saved('ลบแล้ว')}},
 'csv-clear':()=>{if(confirm('ล้างข้อมูลยอดขายทั้งหมด?')){db.sales=[];saved('ล้างแล้ว')}},
 'del-model':a=>{const n=db.machines.filter(m=>m.model===a.dataset.id).length;if(n)return alert(`ลบไม่ได้: มีเครื่องรุ่นนี้ ${n} เครื่อง`);if(confirm(`ลบรุ่น ${a.dataset.id} ?`)){db.settings.models=db.settings.models.filter(m=>m.name!==a.dataset.id);saved('ลบแล้ว')}},
 'del-check':a=>{if(!confirm(`ลบรายการ “${a.dataset.id}” ? (ประวัติที่บันทึกไว้ยังอยู่)`))return;db.settings.checkItems=checkItems().filter(i=>i.name!==a.dataset.id);db.tickets=db.tickets.filter(t=>!(t.auto&&t.tentative));save();runAuto();toast('ลบแล้ว');render()},
 'del-symptom':a=>{if(symptoms().length<2)return alert('ต้องมีอาการอย่างน้อย 1 รายการ');if(confirm(`ลบอาการ “${a.dataset.id}” ?`)){db.settings.symptoms=symptoms().filter(s=>s!==a.dataset.id);saved('ลบแล้ว')}},
 /* ผู้ใช้ */
 'approve-req':a=>FORMS.approve(a.dataset.id),
 'reject-req':a=>{if(confirm('ปฏิเสธและลบคำขอสมัครนี้?')){drop('users',a.dataset.id);saved('ลบคำขอแล้ว')}},
 'toggle-user':a=>{const u=db.users.find(x=>x.id===a.dataset.id);if(u.id===sess.userId)return toast('ปิดบัญชีของตัวเองไม่ได้');if(lastAdmin(u))return alert('ต้องมีผู้บริหารที่ใช้งานได้อย่างน้อย 1 บัญชี');u.status=u.status==='disabled'?'active':'disabled';saved('บันทึกแล้ว')},
 'del-user':a=>{const u=db.users.find(x=>x.id===a.dataset.id);if(u.id===sess.userId)return toast('ลบบัญชีของตัวเองไม่ได้');if(lastAdmin(u))return alert('ต้องมีผู้บริหารที่ใช้งานได้อย่างน้อย 1 บัญชี');if(confirm(`ลบบัญชี ${u.username} ?`)){drop('users',u.id);saved('ลบแล้ว')}},
 'demo-off':()=>{const me=db.users.find(x=>x.id===sess.userId);if(me.demo)return alert('ขั้นตอน:\n1. กด “+ เพิ่มผู้ใช้” สร้างบัญชีผู้บริหารของคุณ\n2. ออกจากระบบ แล้วเข้าด้วยบัญชีใหม่\n3. กลับมากดปุ่มนี้อีกครั้ง');
  if(confirm('ปิดบัญชีทดลองทั้งหมด?')){db.users.forEach(u=>{if(u.demo)u.status='disabled'});db.settings.demoHints=false;saved('ปิดบัญชีทดลองแล้ว')}},
 'link-demo':a=>{const u=db.users.find(x=>x.demo&&x.role==='customer'&&!x.customerId);if(u){u.customerId=a.dataset.cid;saved('ผูกบัญชีทดลองลูกค้าแล้ว ออกจากระบบแล้วลองเข้าด้วยบัญชีลูกค้าได้เลย')}},
 /* อัตโนมัติ / LINE */
 'run-auto':()=>{const jobs=runAutoJobs(),msgs=genReminders();if(jobs||msgs){db.autoLog.unshift({at:new Date().toISOString(),text:`สั่งรันเอง: ลงตาราง ${jobs} งาน · ข้อความ ${msgs} รายการ`});save()}toast(jobs||msgs?`ลงตาราง ${jobs} งาน · เตรียมข้อความ ${msgs} รายการ`:'ไม่มีรายการใหม่');render()},
 gen:()=>{const n=genReminders();toast(n?`สร้างข้อความใหม่ ${n} รายการ`:'ไม่มีรายการใหม่ที่ต้องแจ้งเตือน');render()},
 'view-msg':a=>FORMS.message(a.dataset.id),
 copy:a=>{const o=db.outbox.find(x=>x.id===a.dataset.id);navigator.clipboard?.writeText(o.text).then(()=>toast('คัดลอกแล้ว'),()=>toast('คัดลอกไม่ได้'))},
 mark:a=>{db.outbox.find(x=>x.id===a.dataset.id).status='ส่งแล้ว';close();saved('บันทึกแล้ว')},
 'del-msg':a=>{drop('outbox',a.dataset.id);close();saved('ลบแล้ว')},
 /* หน้าจอ */
 tab:a=>{F.tab=a.dataset.v;render()},'goto-tab':a=>{F.tab=a.dataset.tab;go('settings')},'goto-models':()=>{if(!dirty||confirm('ออกจากหน้าต่างนี้? ข้อมูลที่กรอกจะหายไป')){F.tab='models';go('settings')}},
 goto:a=>{F.rs=a.dataset.rs||'';F.rq='';go(a.dataset.p)},
 'cal-prev':()=>{shiftMonth(F.cal,-1);render()},'cal-next':()=>{shiftMonth(F.cal,1);render()},
 'cal-today':()=>{F.sel=T0();F.cal=monthOf(F.sel);render()},
 'cal-day':a=>{F.sel=a.dataset.d;render();if(matchMedia('(max-width:860px)').matches)$('#dayPanel')?.scrollIntoView({behavior:'smooth',block:'start'})},
 'cal-goto':a=>{F.sel=a.dataset.d;F.cal=monthOf(F.sel);CAL.view='month';go('calendar')},
 'cal-view':a=>{CAL.view=a.dataset.v;render()},'cal-filter':a=>{CAL.show[a.dataset.v]=!CAL.show[a.dataset.v];render()},
 ics:()=>{const r=icsText();if(!r.n)return toast('ยังไม่มีนัดที่ยืนยันแล้ว');download('civio-นัดหมาย.ics',r.text,'text/calendar');toast(`ดาวน์โหลด ${r.n} นัด — เปิดไฟล์เพื่อเพิ่มลงปฏิทินในมือถือหรือ Google Calendar`)},
 /* ข้อมูล */
 'exp-json':()=>{db.lastBackup=T0();save();download('civio-service-backup-'+T0()+'.json',JSON.stringify(db,null,1),'application/json');render()},
 'exp-csv':()=>download('civio-repairs-'+T0()+'.csv',['เลขที่งาน,ลูกค้า,ซีเรียล,รุ่น,อาการ,สถานะ,วันที่แจ้ง,วันนัด,ผู้รับผิดชอบ,คะแนน'].concat(db.tickets.map(t=>[t.id,cust(t.customerId).name,mach(t.machineId).serial,mach(t.machineId).model,t.symptom,t.status,t.createdAt,t.appointment,t.assignee,t.rating?t.rating.score:''].map(csvEsc).join(','))).join('\n'),'text/csv'),
 'reset-data':()=>{if(!confirm('ล้างลูกค้า เครื่อง งาน อะไหล่ ข้อความ และยอดขายทั้งหมด? (บัญชีผู้ใช้และการตั้งค่ายังอยู่)'))return;
  ['customers','machines','tickets','parts','inspections','outbox','sales','autoLog'].forEach(k=>db[k]=[]);db.autoSkip={};db.seq=0;db.users.forEach(u=>u.customerId=null);saved('ล้างข้อมูลงานแล้ว')},
 reset:()=>{if(confirm('ล้างข้อมูลทั้งหมดในเบราว์เซอร์นี้ รวมบัญชีผู้ใช้ด้วย? (ควรกด “สำรองข้อมูล” ไว้ก่อน)')){db=normalize(seed());save();toast('ล้างข้อมูลแล้ว');logout()}},
 'csv-tpl':()=>download('ตัวอย่างนำเข้ายอดขาย.csv','วันที่,แพลตฟอร์ม,สินค้า,เลขที่ออเดอร์,จำนวน,ยอดขาย,คะแนน,รีวิว\n','text/csv'),
 'csv-tpl-m':()=>download('แบบฟอร์มนำเข้าลูกค้าและเครื่อง.csv',MCSV_HEAD+'\n','text/csv')};

const csvEsc=v=>`"${String(v??'').replace(/"/g,'""')}"`;
function parseCSV(t){const rows=[];let r=[],c='',q=false;t=t.replace(/^\ufeff/,'');for(let i=0;i<t.length;i++){const ch=t[i];if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}else if(ch==='"')q=true;else if(ch===','){r.push(c);c=''}else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&t[i+1]==='\n')i++;r.push(c);c='';if(r.some(x=>x!==''))rows.push(r);r=[]}else c+=ch}r.push(c);if(r.some(x=>x!==''))rows.push(r);return rows}

const MCSV_HEAD='ชื่อองค์กร,ผู้ติดต่อ,โทร,อีเมล,LINE User ID,รุ่น,ซีเรียล,วันส่งมอบ,วันติดตั้ง,ประกัน(เดือน),สถานที่ตั้ง';
function normDate(v){v=String(v||'').trim();if(!v)return '';let y,m,d,a;
 if(a=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)){y=+a[1];m=+a[2];d=+a[3]}else if(a=v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)){d=+a[1];m=+a[2];y=+a[3]}else return null;
 if(y>2400)y-=543;const dt=new Date(y,m-1,d);if(dt.getFullYear()!==y||dt.getMonth()!==m-1||dt.getDate()!==d)return null;return y+'-'+pad(m)+'-'+pad(d)}

const CSV_MACH={
 'csv-mach':el=>{const f=el.files[0];if(!f)return;f.text().then(t=>{el.value='';const r=parseCSV(t);if(r.length&&String(r[0][0]).trim()==='ชื่อองค์กร')r.shift();
  if(!r.length){toast('ไม่พบข้อมูลในไฟล์');return}
  let nc=0,nm=0;const bad=[];
  r.forEach((c,i)=>{const line='แถว '+(i+2),name=(c[0]||'').trim(),model=(c[5]||'').trim().toUpperCase(),serial=(c[6]||'').trim(),dv=normDate(c[7]),ins=normDate(c[8]);
   if(!name||!serial){bad.push(line+': ไม่มีชื่อองค์กรหรือซีเรียล');return}
   const mname=models().find(x=>x.toUpperCase()===model);
   if(!mname){bad.push(line+': ไม่มีรุ่น "'+(c[5]||'')+'" (ใช้: '+models().join(', ')+' หรือเพิ่มรุ่นที่ ตั้งค่า)');return}
   if(!dv){bad.push(line+': วันส่งมอบต้องเป็น ปปปป-ดด-วว เช่น 2026-11-01');return}
   if(ins===null){bad.push(line+': วันติดตั้งรูปแบบไม่ถูกต้อง');return}
   if(serialTaken(serial)){bad.push(line+': ซีเรียล '+serial+' มีในระบบแล้ว');return}
   let cu=db.customers.find(x=>x.name.trim().toLowerCase()===name.toLowerCase());
   if(!cu){cu={id:'c'+uid(),name,contact:(c[1]||'').trim(),phone:(c[2]||'').trim(),email:(c[3]||'').trim(),lineUserId:(c[4]||'').trim(),address:''};db.customers.push(cu);nc++}
   db.machines.push({id:'m'+uid(),customerId:cu.id,model:mname,serial,deliveryDate:dv,installDate:ins||'',warrantyMonths:c[9]===undefined||String(c[9]).trim()===''?modelDef(mname).warranty:(+c[9]||0),inspectMonths:modelDef(mname).inspect,location:(c[10]||'').trim(),note:''});nm++});
  save();runAuto();render();toast(`นำเข้าเครื่อง ${nm} เครื่อง (ลูกค้าใหม่ ${nc} ราย)${bad.length?` · ข้าม ${bad.length} แถว`:''}`);
  if(bad.length)alert('แถวที่ข้าม (แก้ในไฟล์แล้วนำเข้าใหม่ได้ — แถวที่นำเข้าสำเร็จแล้วจะไม่ซ้ำ):\n\n'+bad.slice(0,15).join('\n')+(bad.length>15?'\n… และอีก '+(bad.length-15)+' แถว':''))})}};

const CHANGE={...CSV_MACH,
 'csv-file':el=>{const f=el.files[0];if(!f)return;f.text().then(t=>{el.value='';const r=parseCSV(t);if(r.length<2){toast('ไม่พบข้อมูลในไฟล์');return}
  const rows=r.slice(1).map(c=>({id:uid(),date:c[0]||'',platform:c[1]||'ไม่ระบุ',product:c[2]||'',order:c[3]||'',qty:+c[4]||0,amount:+String(c[5]).replace(/,/g,'')||0,rating:+c[6]||0,review:c[7]||''}));
  db.sales=rows.concat(db.sales);saved(`นำเข้า ${rows.length} รายการ`)})},
 'imp-json':el=>{const f=el.files[0];if(!f)return;f.text().then(t=>{el.value='';try{const d=JSON.parse(t);if(!Array.isArray(d.customers)||!Array.isArray(d.machines)||!Array.isArray(d.tickets))throw 0;
  if(!confirm('แทนที่ข้อมูลปัจจุบันด้วยข้อมูลจากไฟล์นี้?'))return;db=normalize(d);save();sess=loadSess();toast('กู้คืนข้อมูลแล้ว');render()}catch(e){toast('ไฟล์ไม่ถูกต้อง')}})}};

document.addEventListener('click',e=>{
 const a=e.target.closest('[data-act]');
 if(a&&a.tagName!=='INPUT'){const fn=A[a.dataset.act];if(fn){e.preventDefault();if(!a.disabled)fn(a)}return}
 if(e.target.id==='modal')return closeSoft();
 const g=e.target.closest('[data-go]');if(g&&!e.target.closest('a,button'))location.hash='#/'+g.dataset.go});
document.addEventListener('change',e=>{const el=e.target;
 if(el.id==='demoHints'){db.settings.demoHints=el.checked;save();return toast('บันทึกแล้ว')}
 if(el.matches('[data-cal-tech]')){CAL.tech=el.value;return render()}
 const a=el.dataset.act;if(a&&CHANGE[a])CHANGE[a](el);
 if(el.dataset.f){F[el.dataset.f]=el.value;refreshList()}});
document.addEventListener('input',e=>{if(e.target.dataset.f&&e.target.tagName==='INPUT'){F[e.target.dataset.f]=e.target.value;refreshList()}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').hidden)closeSoft()});
const numList=(v,min,def)=>{const a=String(v).split(',').map(x=>parseInt(x,10)).filter(x=>x>=min).sort((a,b)=>b-a);return a.length?a:def};
document.addEventListener('submit',e=>{const f=e.target;
 if(f.id==='loginForm'){e.preventDefault();return doLogin(f)}
 if(f.id==='regForm'){e.preventDefault();return doRegister(f)}
 const kind=f.dataset&&f.dataset.form;if(!kind)return;e.preventDefault();const d=Object.fromEntries(new FormData(f)),s=db.settings;
 if(kind==='auto'){Object.assign(s,{autoInsp:!!d.autoInsp,autoRemind:!!d.autoRemind,workSunday:!!d.workSunday,autoInspDays:Math.max(0,parseInt(d.autoInspDays,10)||0),jobsPerDay:Math.max(1,parseInt(d.jobsPerDay,10)||4),
   warnDays:numList(d.warnDays,1,[90,30,7]),apptNotice:numList(d.apptNotice,0,[3]),inspectNotice:Math.max(0,parseInt(d.inspectNotice,10)||0),checkNotice:Math.max(0,parseInt(d.checkNotice,10)||0)});
  save();const r=runAuto();toast('บันทึกการตั้งค่าแล้ว'+(r.jobs?` · ลงตารางให้ ${r.jobs} งาน`:''));render()}
 if(kind==='line'){Object.assign(s,{phone:d.phone.trim(),lineOA:d.lineOA.trim(),endpoint:d.endpoint.trim(),secret:d.secret});saved('บันทึกแล้ว')}});
function refreshList(){const p=route().p,el=$('#lst');if(el&&lists[p])el.innerHTML=lists[p]()}

/* ---------- Router ---------- */
const route=()=>{const [p,id]=location.hash.replace(/^#\/?/,'').split('/');return {p:p||'',id:id&&decodeURIComponent(id)}};
const AUTH={tab:'customer',mode:'login',done:false};const FAIL={};let lastRoute='';
function demoBox(){
 if(!db.settings.demoHints)return '';
 const list=db.users.filter(u=>u.demo&&u.status==='active');
 return list.length?`<div class="demo"><b>บัญชีทดลอง</b> <span class="muted small">กดเข้าได้เลย (รหัสผ่าน ${DEMO_PW})</span><div class="demo-list">${list.map(u=>`<button type="button" data-act="demo-login" data-id="${u.id}">${ic('user')}<span><b>${ROLE_NAME[u.role]}</b><small>${esc(u.username)}</small></span></button>`).join('')}</div></div>`:''}
function renderAuth(){
 document.body.classList.add('au-mode');$('#sideNav').style.display='none';
 const t=AUTH.tab,m=AUTH.mode,s=db.settings;let body='';
 if(AUTH.done)body=`<div class="au-done"><div class="au-ok">✓</div><h2>ส่งคำขอสมัครแล้ว</h2><p>ทีมงาน CiViO จะตรวจสอบข้อมูลและอนุมัติบัญชีของท่าน เมื่ออนุมัติแล้วเข้าสู่ระบบได้ด้วยอีเมลและรหัสผ่านที่ตั้งไว้</p><button class="btn" data-act="auth-mode" data-v="login">กลับไปเข้าสู่ระบบ</button></div>`;
 else if(t==='customer'&&m==='register')body=`<h2>สมัครใช้งานสำหรับลูกค้า</h2><p class="muted">สำหรับองค์กรที่ซื้อเครื่องหรือบริการจาก CiViO ทีมงานจะตรวจสอบก่อนเปิดใช้งาน</p><form id="regForm" class="f" novalidate><label>ชื่อองค์กร / หน่วยงาน<input name="org" required></label><div class="row2"><label>ผู้ติดต่อ<input name="contact" required></label><label>เบอร์โทร<input name="phone" required inputmode="tel"></label></div><label>อีเมล (ใช้เข้าสู่ระบบ)<input type="email" name="email" required autocomplete="email"></label><label>เลขซีเรียลเครื่อง <span class="h">ไม่บังคับ — ช่วยให้อนุมัติเร็วขึ้น</span><input name="serial"></label><div class="row2"><label>รหัสผ่าน <span class="h">อย่างน้อย 8 ตัว</span><input type="password" name="p1" required autocomplete="new-password"></label><label>ยืนยันรหัสผ่าน<input type="password" name="p2" required autocomplete="new-password"></label></div><div id="auMsg" class="au-msg" role="alert"></div><button class="btn au-go">ส่งคำขอสมัคร</button></form><p class="au-sw">มีบัญชีแล้ว? <a href="#" data-act="auth-mode" data-v="login">เข้าสู่ระบบ</a></p>`;
 else body=`<h2>${t==='customer'?'เข้าสู่ระบบลูกค้า':'เข้าสู่ระบบทีมงาน'}</h2><p class="muted">${t==='customer'?'ดูสถานะงานซ่อม วันหมดประกัน และรอบตรวจเช็กเครื่องของท่าน':'สำหรับผู้บริหาร ทีมขาย และทีมช่างของ CiViO'}</p><form id="loginForm" class="f" novalidate><label>อีเมล<input type="email" name="email" required autocomplete="username"></label><label>รหัสผ่าน<input type="password" name="password" required autocomplete="current-password"></label><div id="auMsg" class="au-msg" role="alert"></div><button class="btn au-go">เข้าสู่ระบบ</button></form>${t==='customer'?'<p class="au-sw">ยังไม่มีบัญชี? <a href="#" data-act="auth-mode" data-v="register">สมัครใช้งาน</a></p>':'<p class="au-sw muted">บัญชีทีมงานสร้างโดยผู้บริหาร</p>'}
 ${demoBox()}`;
 $('#view').innerHTML=`<div class="au"><aside class="au-art"><div class="au-art-in"><a href="../index.html"><img src="../assets/images/civio-logo-light.png" alt="CiViO Thailand" class="au-logo"></a><h1>บริการหลังการขาย</h1><p>ดูแลเครื่องของคุณอย่างต่อเนื่อง ตั้งแต่รับประกัน ตรวจเช็กตามรอบ ไปจนถึงแจ้งซ่อมและติดตามงานได้ในที่เดียว</p><ul><li>ติดตามสถานะงานซ่อมได้ทุกขั้นตอน</li><li>เตือนก่อนหมดประกันและถึงรอบตรวจเช็ก</li><li>ประวัติเครื่องและอะไหล่ครบถ้วน</li></ul><a class="au-back" href="../index.html">← กลับหน้าเว็บไซต์ CiViO</a></div></aside><section class="au-card"><div class="au-tabs" role="tablist"><button role="tab" aria-selected="${t==='customer'}" class="${t==='customer'?'on':''}" data-act="auth-tab" data-v="customer">ลูกค้า</button><button role="tab" aria-selected="${t==='staff'}" class="${t==='staff'?'on':''}" data-act="auth-tab" data-v="staff">ทีมงาน</button></div>${body}</section></div>`;
 $('#roleBadge').textContent='';$('#addBtn').hidden=true;close();window.scrollTo(0,0)}
function authMsg(t){const e=$('#auMsg');if(e)e.textContent=t}
function doLogin(f){
 const em=f.email.value.trim().toLowerCase(),pw=f.password.value,fl=FAIL[em]||{n:0,t:0};
 if(fl.t&&Date.now()>=fl.t){fl.n=0;fl.t=0}
 if(fl.t)return authMsg(`ลองผิดหลายครั้ง กรุณารอ ${Math.ceil((fl.t-Date.now())/1000)} วินาที`);
 const u=db.users.find(x=>x.username===em);
 if(!u||u.hash!==hashPw(u.salt,pw)){fl.n++;if(fl.n>=5)fl.t=Date.now()+30000;FAIL[em]=fl;return authMsg('อีเมลหรือรหัสผ่านไม่ถูกต้อง')}
 if((AUTH.tab==='customer')!==(u.role==='customer'))return authMsg(u.role==='customer'?'บัญชีนี้เป็นของลูกค้า กรุณาเลือกแท็บ “ลูกค้า”':'บัญชีนี้เป็นของทีมงาน กรุณาเลือกแท็บ “ทีมงาน”');
 if(u.status==='pending')return authMsg('บัญชีของท่านรอทีมงานตรวจสอบและอนุมัติ');
 if(u.status!=='active')return authMsg('บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อทีมงาน');
 FAIL[em]=null;enter(u)}
function enter(u){sess=mkSess(u);saveSess();document.body.classList.remove('au-mode');const next='#/'+ROLES[u.role].nav[0];
 const r=u.role==='customer'?null:runAuto();
 if(location.hash===next)render();else location.hash=next;
 if(r&&(r.jobs||r.msgs))toast(`ระบบอัตโนมัติ: ลงตาราง ${r.jobs} งาน · เตรียมข้อความ ${r.msgs} รายการ`)}
function doRegister(f){
 const d=Object.fromEntries(new FormData(f)),em=d.email.trim().toLowerCase();
 if(!d.org.trim()||!d.contact.trim()||!d.phone.trim())return authMsg('กรุณากรอกข้อมูลให้ครบ');
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em))return authMsg('รูปแบบอีเมลไม่ถูกต้อง');
 if(db.users.some(u=>u.username===em))return authMsg('อีเมลนี้มีบัญชีอยู่แล้ว');
 if(!pwOk(d.p1))return authMsg('รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
 if(d.p1!==d.p2)return authMsg('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
 db.users.push(mkUser(em,d.contact.trim(),'customer',d.p1,{status:'pending',reg:{org:d.org.trim(),contact:d.contact.trim(),phone:d.phone.trim(),serial:d.serial.trim()}}));save();AUTH.done=true;renderAuth()}
function render(){
 if(!sess)return renderAuth();
 document.body.classList.remove('au-mode');
 const R=ROLES[sess.role];let {p,id}=route();const detail=['ticket','machine','customer'].includes(p);
 if(sess.role==='customer'&&(p==='machine'||p==='customer'))p='my';
 if(!(detail&&(sess.role!=='customer'||p==='ticket'))&&!R.nav.includes(p)){if(!(sess.role==='customer'&&p==='my')){location.replace('#/'+R.nav[0]);return}}
 const cur=detail?(p==='ticket'?(sess.role==='customer'?'my':'repairs'):p==='machine'?'machines':'customers'):p;
 $('#roleBadge').textContent=sess.name+' · '+R.name;
 $('#addBtn').hidden=sess.role==='customer';
 const nav=$('#sideNav');nav.style.display='';
 const count=db.tickets.filter(t=>OPEN(t.status)&&t.tentative).length;
 nav.innerHTML=(sess.role==='customer'?'':'<div class="ph">เมนู</div>')+R.nav.map(k=>`<a href="#/${k}" class="${k===cur?'on':''}"${k===cur?' aria-current="page"':''}>${ic(k)}<span class="nl" data-s="${SHORT[k]}">${TITLE[k]}</span>${k==='calendar'&&count?`<em title="รอยืนยันนัด">${count}</em>`:''}</a>`).join('');
 const here=location.hash,same=here===lastRoute,y=window.scrollY;lastRoute=here;
 $('#view').innerHTML=(V[p]||V[R.nav[0]])(id);
 window.scrollTo(0,same?y:0)}
window.addEventListener('hashchange',()=>{close();render()});

/* ---------- เริ่มทำงาน ---------- */
function boot(){
 const raw=load();
 if(!raw&&localStorage.getItem(KEY))localStorage.setItem(KEY+'_broken',localStorage.getItem(KEY));
 db=normalize(raw&&Array.isArray(raw.customers)?raw:seed());save();
 sess=loadSess();
 if(sess&&sess.role!=='customer')runAuto();
 render()}
/* ตรวจระบบอัตโนมัติซ้ำทุกชั่วโมง และเมื่อกลับมาที่แท็บนี้ */
function tick(){if(!sess||sess.role==='customer'||!$('#modal').hidden)return;const r=runAuto();if(r.jobs||r.msgs)render()}
setInterval(tick,3600e3);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick()});
/* แท็บอื่นแก้ข้อมูล → โหลดใหม่ กันการบันทึกทับกัน */
window.addEventListener('storage',e=>{if(e.key!==KEY)return;const d=load();if(!d)return;db=normalize(d);if(sess){sess=loadSess()}if($('#modal').hidden)render()});
boot();
