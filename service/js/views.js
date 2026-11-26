/* views.js : หน้าจอแต่ละเมนู */
'use strict';
const TITLE={dashboard:'หน้าหลัก',repairs:'งานซ่อมและตรวจเช็ก',customers:'ลูกค้า',machines:'เครื่อง',calendar:'ปฏิทินตารางงาน',line:'แจ้งเตือน LINE',parts:'อะไหล่',surveys:'แบบประเมิน',analysis:'วิเคราะห์ปัญหาซ้ำ',import:'ยอดขาย / รีวิว',settings:'ตั้งค่า',my:'พื้นที่ของฉัน',bot:'แชตบอท LINE'};
const SHORT={dashboard:'หน้าหลัก',repairs:'งาน',customers:'ลูกค้า',machines:'เครื่อง',calendar:'ปฏิทิน',line:'LINE',parts:'อะไหล่',surveys:'ประเมิน',analysis:'ปัญหาซ้ำ',import:'ยอดขาย',settings:'ตั้งค่า',my:'ของฉัน',bot:'แชตบอท'};
const F={rq:'',rs:'',cq:'',mq:'',mm:'',mw:'',cal:null,sel:null,tab:'auto'};
const head=(k,sub,act='')=>`<div class="pg-head"><div><h1>${TITLE[k]||k}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="chips">${act}</div></div>`;
const detailHead=(title,sub,back,act='')=>`<a class="back-link" href="${back}">← กลับ</a><div class="pg-head"><div><h1>${title}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="chips">${act}</div></div>`;
const card=(title,body,extra='')=>`<div class="card"><div class="ch"><h2>${title}</h2>${extra}</div>${body}</div>`;

/* ---------- ตารางรายการ ---------- */
const tRow=x=>`<tr class="link" data-go="ticket/${x.id}"><td class="nowrap"><b>${x.id}</b><br><span class="muted small">${kindName(x)}</span></td><td>${esc(cust(x.customerId).name)}<br><span class="muted small">${esc(mLabel(mach(x.machineId)))}</span></td><td>${esc(x.symptom)}</td><td>${jobBadge(x)}${x.priority!=='ปกติ'?' '+bdg(esc(x.priority),'bad'):''}</td><td class="nowrap">${x.appointment?`${th(x.appointment)} ${esc(x.appointmentTime||'')}<br><span class="muted small">${esc(x.assignee||'ยังไม่ระบุช่าง')}</span>`:'<span class="muted">ยังไม่นัด</span>'}</td></tr>`;
const ticketsTable=(a,empty='ยังไม่มีงาน')=>table(['เลขที่งาน','ลูกค้า / เครื่อง','อาการ / งาน','สถานะ','วันนัด'],a.map(tRow),empty);
const mRow=m=>`<tr class="link" data-go="machine/${m.id}"><td class="nowrap"><b>${esc(m.serial)}</b><br><span class="muted small">${esc(m.model)}</span></td><td>${esc(cust(m.customerId).name)}<br><span class="muted small">${esc(m.location||'')}</span></td><td class="nowrap">${th(m.installDate||m.deliveryDate)}</td><td>${wBadge(m)}</td><td>${iBadge(m)}</td></tr>`;
const machTable=(a,empty)=>table(['เลขซีเรียล / รุ่น','ลูกค้า / สถานที่ตั้ง','วันติดตั้ง','ประกัน','ตรวจเช็กครั้งถัดไป'],a.map(mRow),empty);

const lists={
 repairs(){const q=F.rq.toLowerCase(),s=F.rs;
  const a=db.tickets.filter(x=>(!s||(s==='open'?OPEN(x.status):s==='unsched'?OPEN(x.status)&&!x.appointment:s==='tent'?OPEN(x.status)&&x.tentative:s==='today'?OPEN(x.status)&&x.appointment===T0():x.status===s))&&(!q||[x.id,cust(x.customerId).name,mach(x.machineId).serial,x.symptom,x.desc,x.assignee].join(' ').toLowerCase().includes(q))).sort((a,b)=>OPEN(b.status)-OPEN(a.status)||b.createdAt.localeCompare(a.createdAt));
  return ticketsTable(a,db.tickets.length?'ไม่พบงานตามที่ค้นหา':emptyBox('ยังไม่มีงาน','งานแจ้งซ่อมและตรวจเช็กจะแสดงที่นี่',can('book')?btnAct('+ นัดหมาย / แจ้งซ่อม','book'):''))},
 customers(){const q=F.cq.toLowerCase();
  const a=db.customers.filter(c=>!q||[c.name,c.contact,c.phone].join(' ').toLowerCase().includes(q));
  return table(['ลูกค้า','ผู้ติดต่อ','โทร','LINE','เครื่อง'],a.map(c=>`<tr class="link" data-go="customer/${c.id}"><td><b>${esc(c.name)}</b></td><td>${esc(c.contact)||'-'}</td><td class="nowrap">${esc(c.phone)||'-'}</td><td>${c.lineUserId?bdg('เชื่อมแล้ว','ok'):bdg('ยังไม่เชื่อม')}</td><td class="right">${db.machines.filter(m=>m.customerId===c.id).length}</td></tr>`),db.customers.length?'ไม่พบลูกค้าตามที่ค้นหา':emptyBox('ยังไม่มีลูกค้า','เริ่มจากลงทะเบียนส่งมอบเครื่องแรก ใช้เวลาไม่ถึงนาที',can('customers')?btnAct('+ ส่งมอบเครื่องใหม่','register')+btnAct('เพิ่มลูกค้าอย่างเดียว','new-customer',{},'ghost'):''))},
 machines(){const q=F.mq.toLowerCase();
  const a=db.machines.filter(m=>(!F.mm||m.model===F.mm)&&(!F.mw||wInfo(m).state===F.mw)&&(!q||[m.serial,m.model,cust(m.customerId).name,m.location].join(' ').toLowerCase().includes(q)));
  return machTable(a,db.machines.length?'ไม่พบเครื่องตามที่ค้นหา':emptyBox('ยังไม่มีเครื่อง','ลงทะเบียนทีละเครื่อง หรือนำเข้าหลายเครื่องจากไฟล์ CSV',can('customers')?btnAct('+ ส่งมอบเครื่องใหม่','register'):''))}};

const V={};
/* ---------- หน้าหลัก ---------- */
function startSteps(){
 const S=[
  ['ลงทะเบียนลูกค้าและเครื่องแรก','ใส่ข้อมูล 3 ขั้น ระบบลงปฏิทินให้เอง',db.machines.length>0,can('customers')?btnAct('เริ่มเลย','register',{},'sm'):''],
  ['นัดงานแรกลงตารางงาน','เลือกวันจากปฏิทิน เห็นคิวช่างก่อนนัด',db.tickets.some(t=>t.appointment&&!t.tentative),can('book')&&db.machines.length?btnAct('นัดหมาย','book',{},'sm'):''],
  ['สร้างบัญชีทีมงานจริง','ก่อนใช้จริงควรปิดบัญชีทดลอง',db.users.some(u=>!u.demo&&u.role!=='customer'),can('settings')?btnAct('เพิ่มผู้ใช้','new-user',{},'sm'):''],
  ['เชื่อม LINE (ไม่บังคับ)','ส่งแจ้งเตือนถึงลูกค้าอัตโนมัติ',!!db.settings.endpoint,can('settings')?btnAct('ตั้งค่า','goto-tab',{tab:'line'},'sm ghost'):'']];
 const n=S.filter(x=>x[2]).length;
 if(db.machines.length&&S[1][2])return '';
 return card('เริ่มต้นใช้งาน',`<ol class="start">${S.map(([t,d,ok,b],i)=>`<li class="${ok?'ok':''}"><i>${ok?'✓':i+1}</i><div><b>${t}</b><span>${d}</span></div>${ok?'':b}</li>`).join('')}</ol>`,bdg(`${n}/${S.length}`,'ok'))}
V.dashboard=()=>{
 const t=T0(),open=db.tickets.filter(x=>OPEN(x.status));
 const soon=db.machines.filter(m=>wInfo(m).state==='soon').sort((a,b)=>wInfo(a).days-wInfo(b).days);
 const overdue=db.machines.filter(m=>diff(t,nextInsp(m))<0);
 const todo=[
  ['นัดวันนี้',jobsOn(t).filter(x=>!x.tentative).length,'info',{rs:'today',p:'repairs'}],
  ['รอยืนยันนัด',open.filter(x=>x.tentative).length,'tent',{rs:'tent',p:'repairs'}],
  ['งานยังไม่จัดวัน',open.filter(x=>!x.appointment).length,'warn',{rs:'unsched',p:'repairs'}],
  ['เกินรอบตรวจเช็ก',overdue.length,'bad',{p:'calendar'}],
  ...(can('parts')?[['อะไหล่ใกล้หมด',db.parts.filter(p=>p.stock<=p.min).length,'bad',{p:'parts'}]]:[]),
  ...(can('line')?[['ข้อความรอส่ง',db.outbox.filter(o=>o.status!=='ส่งแล้ว').length,'warn',{p:'line'}]]:[]),
  ...(can('approve')?[['คำขอสมัครใช้งาน',db.users.filter(u=>u.status==='pending').length,'warn',{p:'customers'}]]:[])];
 const week=Array.from({length:7},(_,i)=>addDays(t,i));
 const quick=[can('customers')&&['register','plus','ส่งมอบเครื่องใหม่'],can('book')&&['book','calendar','นัดหมาย / แจ้งซ่อม'],can('inspections')&&['rec-insp','check','บันทึกตรวจเช็ก'],['add','plus','เพิ่มอย่างอื่น']].filter(Boolean);
 const backupOld=can('settings')&&db.machines.length&&(!db.lastBackup||diff(db.lastBackup,t)>=7);
 return hello({exec:'ภาพรวมบริการหลังการขายของ CiViO',sales:'งานส่งมอบ ลูกค้า และโอกาสต่อประกัน',tech:'ตารางงานและงานซ่อมของทีมช่าง'}[sess.role]||'')+
 `<div class="quick">${quick.map(([a,i,l])=>`<button type="button" class="tile" data-act="${a}">${ic(i)}<b>${l}</b></button>`).join('')}</div>`+
 (backupOld?`<div class="note gap">ยังไม่ได้สำรองข้อมูลใน 7 วันนี้ ข้อมูลอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น ${btnAct('สำรองตอนนี้','exp-json',{},'sm')}</div>`:'')+
 startSteps()+
 `<h2 class="sec">สิ่งที่ต้องทำ</h2><div class="kpis">${todo.map(([l,n,c,g])=>`<button type="button" class="kpi ${n?c:'zero'}" data-act="goto" data-p="${g.p}" data-rs="${g.rs||''}"><b>${n}</b><span>${l}</span></button>`).join('')}</div>`+
 card('ตารางงาน 7 วันข้างหน้า',`<div class="week">${week.map(d=>{const j=jobsOn(d);return `<button type="button" class="${d===t?'today':''}${isWorkDay(d)?'':' off'}" data-act="cal-goto" data-d="${d}"><small>${WD[D(d).getDay()]}</small><b>${+d.slice(8)}</b>${j.length?j.slice(0,3).map(x=>`<span class="ev ${x.tentative?'t':'a'}">${x.appointmentTime||''} ${esc(cust(x.customerId).name)}</span>`).join('')+(j.length>3?`<em>+${j.length-3}</em>`:''):'<em>ว่าง</em>'}</button>`}).join('')}</div>`,'<a href="#/calendar">เปิดปฏิทิน →</a>')+
 `<div class="grid2">${card('เครื่องใกล้หมดประกัน (90 วัน)',table(['เครื่อง','ลูกค้า','หมดประกัน'],soon.slice(0,6).map(m=>`<tr class="link" data-go="machine/${m.id}"><td><b>${esc(m.serial)}</b></td><td>${esc(cust(m.customerId).name)}</td><td>${wBadge(m)}</td></tr>`),'ไม่มีเครื่องใกล้หมดประกัน'))}
 ${card('ระบบอัตโนมัติทำอะไรไปบ้าง',db.autoLog.length?`<ul class="tl">${db.autoLog.slice(0,5).map(l=>`<li><span class="muted small">${new Date(l.at).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'})}</span><br>${esc(l.text)}</li>`).join('')}</ul>`:`<div class="empty">${db.settings.autoInsp||db.settings.autoRemind?'ยังไม่มีรายการ เมื่อมีเครื่องใกล้ถึงกำหนด ระบบจะลงตารางและเตรียมข้อความให้':'ปิดระบบอัตโนมัติอยู่'}</div>`,can('settings')?btnAct('ตั้งค่า','goto-tab',{tab:'auto'},'sm ghost'):'')}</div>`+
 (sess.role==='exec'&&db.tickets.length?(()=>{const sym={};db.tickets.filter(x=>x.kind==='repair').forEach(x=>sym[x.symptom]=(sym[x.symptom]||0)+1);const rep=repeatMachines(),avg=avgRating(db.tickets);
  return `<h2 class="sec">ภาพรวมผู้บริหาร</h2><div class="kpis"><div class="kpi"><b>${db.customers.length}</b><span>ลูกค้า</span></div><div class="kpi"><b>${db.machines.length}</b><span>เครื่องที่ดูแล</span></div><div class="kpi info"><b>${open.length}</b><span>งานค้าง</span></div><div class="kpi bad"><b>${rep.length}</b><span>เครื่องเสียซ้ำ (180 วัน)</span></div><div class="kpi"><b>${avg?avg.toFixed(1):'-'}</b><span>คะแนนเฉลี่ย</span></div></div><div class="grid2">${card('ปัญหาที่พบบ่อย',bars(Object.entries(sym).sort((a,b)=>b[1]-a[1]).slice(0,6)),'<a href="#/analysis">ดูทั้งหมด →</a>')}${card('งานค้างล่าสุด',ticketsTable(open.slice(0,5),'ไม่มีงานค้าง'))}</div>`})():'')};

/* ---------- งาน / ลูกค้า / เครื่อง ---------- */
const search=(key,ph)=>`<input type="search" placeholder="${ph}" value="${esc(F[key])}" data-f="${key}" aria-label="${ph}">`;
const sel=(key,all,items)=>`<select data-f="${key}" aria-label="${all}"><option value="">${all}</option>${opt(items,F[key],x=>x[0],x=>x[1])}</select>`;
const listCard=k=>`<div class="card flush"><div id="lst">${lists[k]()}</div></div>`;
V.repairs=()=>head('repairs','รับเรื่อง นัดหมาย ติดตามสถานะ และประวัติ',can('book')?btnAct('+ นัดหมาย / แจ้งซ่อม','book'):'')+
 `<div class="filters">${search('rq','ค้นหา เลขที่งาน / ลูกค้า / ซีเรียล / ช่าง')}${sel('rs','ทุกสถานะ',[['open','งานค้างทั้งหมด'],['today','นัดวันนี้'],['tent','รอยืนยันนัด'],['unsched','ยังไม่จัดวัน'],...STATUS.map(s=>[s,s])])}</div>`+listCard('repairs');
const pendingCard=()=>{const p=db.users.filter(u=>u.role==='customer'&&u.status==='pending');if(!can('approve')||!p.length)return '';
 return `<div class="card pend"><div class="ch"><h2>คำขอสมัครใช้งานของลูกค้า</h2>${bdg(p.length+' รอตรวจสอบ','warn')}</div>${table(['องค์กร','ผู้ติดต่อ','ซีเรียลที่ระบุ',''],p.map(u=>{const r=u.reg||{};return `<tr><td><b>${esc(r.org)}</b><br><span class="muted small">${esc(u.username)}</span></td><td>${esc(r.contact)}<br><span class="muted small">${esc(r.phone)}</span></td><td>${esc(r.serial)||'-'}</td><td class="right nowrap">${btnAct('ตรวจสอบ/อนุมัติ','approve-req',{id:u.id},'sm')} ${btnAct('ปฏิเสธ','reject-req',{id:u.id},'sm ghost')}</td></tr>`}))}</div>`};
V.customers=()=>head('customers','องค์กรลูกค้าและผู้ติดต่อ',can('customers')?btnAct('+ ส่งมอบเครื่องใหม่','register')+btnAct('+ เพิ่มลูกค้า','new-customer',{},'ghost'):'')+pendingCard()+
 `<div class="filters">${search('cq','ค้นหาลูกค้า / ผู้ติดต่อ / เบอร์โทร')}</div>`+listCard('customers');
V.machines=()=>head('machines','ทะเบียนเครื่อง ประกัน และรอบตรวจเช็ก',can('machines')?btnAct('+ ส่งมอบเครื่องใหม่','register'):'')+
 `<div class="filters">${search('mq','ค้นหาซีเรียล / ลูกค้า / สถานที่')}${sel('mm','ทุกรุ่น',models().map(m=>[m,m]))}${sel('mw','ทุกสถานะประกัน',[['ok','ในประกัน'],['soon','ใกล้หมดประกัน'],['expired','หมดประกัน']])}</div>`+listCard('machines')+
 (can('machines')?`<div class="card import"><div><b>มีหลายเครื่อง? นำเข้าจาก Excel ได้</b><span class="muted small">ดาวน์โหลดไฟล์ตัวอย่าง กรอกแถวละ 1 เครื่อง บันทึกเป็น CSV (UTF-8) แล้วเลือกไฟล์</span></div><div class="chips">${btnAct('① ไฟล์ตัวอย่าง','csv-tpl-m',{},'ghost')}<label class="btn">② เลือกไฟล์ CSV<input type="file" accept=".csv,text/csv" data-act="csv-mach" hidden></label></div></div>`:'');

V.customer=id=>{const c=db.customers.find(x=>x.id===id);if(!c)return emptyBox('ไม่พบลูกค้า');
 const ms=db.machines.filter(m=>m.customerId===id),ts=db.tickets.filter(t=>t.customerId===id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),us=db.users.filter(u=>u.customerId===id);
 const demoFree=db.users.find(u=>u.demo&&u.role==='customer'&&!u.customerId&&u.status==='active');
 return detailHead(esc(c.name),`${ms.length} เครื่อง`,'#/customers',`${can('machines')?btnAct('+ เพิ่มเครื่อง','new-machine',{cid:id}):''}${can('book')&&ms.length?btnAct('+ นัดหมาย','book',{cid:id},'lime'):''}${can('customers')?btnAct('แก้ไข','edit-customer',{id},'ghost')+btnAct('ลบ','del-customer',{id},'ghost red'):''}`)+
 `<div class="card"><dl class="dl"><dt>ผู้ติดต่อ</dt><dd>${esc(c.contact)||'-'}</dd><dt>โทร</dt><dd>${c.phone?`<a href="tel:${esc(c.phone.replace(/[^\d+]/g,''))}">${esc(c.phone)}</a>`:'-'}</dd><dt>อีเมล</dt><dd>${esc(c.email)||'-'}</dd><dt>ที่อยู่</dt><dd>${esc(c.address)||'-'}</dd><dt>LINE User ID</dt><dd>${c.lineUserId?esc(c.lineUserId):'<span class="muted">ยังไม่เชื่อม</span>'}</dd></dl></div>`+
 card('เครื่องของลูกค้า',machTable(ms,emptyBox('ยังไม่มีเครื่อง','',can('machines')?btnAct('+ เพิ่มเครื่อง','new-machine',{cid:id}):'')))+
 card('ประวัติงาน',ticketsTable(ts))+
 (can('approve')?card('บัญชีเข้าใช้งานของลูกค้า',table(['ชื่อ','อีเมล','สถานะ'],us.map(u=>`<tr><td><b>${esc(u.name)}</b></td><td>${esc(u.username)}</td><td>${u.status==='active'?bdg('ใช้งานได้','ok'):bdg('ยังใช้ไม่ได้','warn')}</td></tr>`),'ยังไม่มีบัญชีให้ลูกค้ารายนี้'),`<div class="chips">${demoFree?btnAct('ผูกบัญชีทดลองลูกค้า','link-demo',{cid:id},'sm ghost'):''}${btnAct('+ สร้างบัญชี','new-user',{cid:id,role:'customer'},'sm')}</div>`):'')};

V.machine=id=>{const m=db.machines.find(x=>x.id===id);if(!m)return emptyBox('ไม่พบเครื่อง');
 const ts=machTickets(id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),ins=db.inspections.filter(i=>i.machineId===id).sort((a,b)=>b.date.localeCompare(a.date));
 return detailHead(esc(mLabel(m)),`<a href="#/customer/${m.customerId}">${esc(cust(m.customerId).name)}</a>`,'#/machines',`${can('book')?btnAct('+ นัดหมาย / แจ้งซ่อม','book',{mid:id}):''}${can('inspections')?btnAct('บันทึกการตรวจเช็ก','rec-insp',{id},'lime'):''}${can('machines')?btnAct('แก้ไข','edit-machine',{id},'ghost')+btnAct('ลบ','del-machine',{id},'ghost red'):''}`)+
 `<div class="grid2">${card('ข้อมูลเครื่อง',`<dl class="dl"><dt>สถานที่ตั้ง</dt><dd>${esc(m.location)||'-'}</dd><dt>วันส่งมอบ</dt><dd>${th(m.deliveryDate)}</dd><dt>วันติดตั้ง</dt><dd>${th(m.installDate)}</dd><dt>ระยะประกัน</dt><dd>${m.warrantyMonths} เดือน</dd>${m.note?`<dt>หมายเหตุ</dt><dd>${esc(m.note)}</dd>`:''}</dl>`)}
 ${card('กำหนดการถัดไป',`<dl class="dl"><dt>ประกัน</dt><dd>${wBadge(m)}</dd><dt>ตรวจเช็ก<small>ทุก ${m.inspectMonths} เดือน</small></dt><dd>${iBadge(m)}</dd>${checkItems().map(it=>`<dt>${esc(it.name)}<small>ทุก ${it.months} เดือน</small></dt><dd>${kBadge(m,it)}</dd>`).join('')}</dl>`)}</div>`+
 card('ประวัติการตรวจเช็ก',table(['วันที่','รายการ','ผู้ตรวจ','บันทึก',''],ins.map(i=>`<tr><td class="nowrap">${th(i.date)}</td><td>${esc(i.item||GEN)}</td><td>${esc(i.by)}</td><td>${esc(i.note)}</td><td class="right">${can('inspections')?btnAct('ลบ','del-insp',{id:i.id},'sm ghost red'):''}</td></tr>`),'ยังไม่เคยบันทึกการตรวจเช็ก'))+
 card('ประวัติงาน',ticketsTable(ts))};

V.ticket=id=>{const x=db.tickets.find(t=>t.id===id),isC=sess.role==='customer';if(!x||(isC&&x.customerId!==sess.customerId))return emptyBox('ไม่พบงาน');
 const m=mach(x.machineId),idx=STATUS.indexOf(x.status),back=isC?'#/my':'#/repairs';
 const used=x.parts.map(p=>{const pt=db.parts.find(q=>q.id===p.partId)||{name:'(ลบแล้ว)'};return `${esc(pt.name)} × ${p.qty}`}).join(', ');
 const acts=`${can('book')&&x.tentative&&OPEN(x.status)?btnAct('ยืนยันนัด','confirm-job',{id},'lime'):''}${can('book')&&OPEN(x.status)?btnAct(x.appointment?'เลื่อนนัด':'จัดวันนัด','schedule',{id},'ghost'):''}${can('repairs')?btnAct('อัปเดตงาน','upd-ticket',{id})+btnAct('ลบ','del-ticket',{id},'ghost red'):''}${isC&&!x.rating&&!OPEN(x.status)?btnAct('ให้คะแนนบริการ','rate',{id},'lime'):''}`;
 return detailHead(`งาน${kindName(x)} ${x.id}`,esc(x.symptom),back,acts)+
 (x.tentative&&OPEN(x.status)?`<div class="note gap">${isC?`ทีมช่างเสนอวันตรวจเช็ก ${th(x.appointment)} (รอยืนยัน)`:`ระบบเสนอวันนัดให้อัตโนมัติ ${th(x.appointment)} · โทรยืนยันกับลูกค้า แล้วกด “ยืนยันนัด” จึงจะส่งเตือนถึงลูกค้า`}</div>`:'')+
 `<div class="card"><div class="stepper">${STATUS.map((s,i)=>`<div class="${i<idx?'done':i===idx?'done cur':''}">${s}</div>`).join('')}</div></div>
 <div class="grid2">${card('รายละเอียด',`<dl class="dl"><dt>สถานะ</dt><dd>${jobBadge(x)} ${x.priority!=='ปกติ'?bdg(esc(x.priority),'bad'):''}</dd><dt>ลูกค้า</dt><dd>${isC?esc(cust(x.customerId).name):`<a href="#/customer/${x.customerId}">${esc(cust(x.customerId).name)}</a>`}</dd><dt>เครื่อง</dt><dd>${isC?esc(mLabel(m)):`<a href="#/machine/${m.id}">${esc(mLabel(m))}</a>`}</dd><dt>ประกัน</dt><dd>${m.id?wBadge(m):'-'}</dd>${x.items?`<dt>รายการตรวจ</dt><dd>${x.items.map(esc).join(', ')}</dd>`:''}<dt>รายละเอียด</dt><dd>${esc(x.desc)||'-'}</dd><dt>วันที่แจ้ง</dt><dd>${th(x.createdAt)}</dd><dt>นัดหมาย</dt><dd>${x.appointment?th(x.appointment)+(x.appointmentTime?' เวลา '+esc(x.appointmentTime)+' น.':'')+(x.tentative?' (รอยืนยัน)':''):'-'}</dd><dt>ผู้รับผิดชอบ</dt><dd>${esc(x.assignee)||'-'}</dd><dt>อะไหล่ที่ใช้</dt><dd>${used||'-'}</dd><dt>คะแนน</dt><dd>${x.rating?stars(x.rating.score)+` <span class="muted small">${esc(x.rating.comment)}</span>`:'<span class="muted">ยังไม่ประเมิน</span>'}</dd></dl>`)}
 ${card('ความคืบหน้า',`<ul class="tl">${[...x.history].reverse().map(h=>`<li><b>${esc(h.status)}</b> <span class="muted small">${th(h.at)} · ${esc(h.by)}</span>${h.note?`<br>${esc(h.note)}`:''}</li>`).join('')}</ul>`)}</div>`};

V.calendar=()=>calendarPage();

V.line=()=>{const s=db.settings,rows=db.outbox.map(o=>`<tr><td class="nowrap">${new Date(o.at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'short'})}</td><td>${bdg(esc(o.type),'info')}</td><td>${esc(cust(o.customerId).name)}</td><td>${bdg(esc(o.status),o.status==='ส่งแล้ว'?'ok':o.status==='ส่งไม่สำเร็จ'?'bad':'warn')}</td><td class="right nowrap">${btnAct('เปิด','view-msg',{id:o.id},'sm ghost')}</td></tr>`);
 return head('line','ใกล้หมดประกัน ถึงรอบตรวจเช็ก เตือนนัดหมาย และสถานะงาน',can('line')?btnAct('ตรวจหาข้อความใหม่ตอนนี้','gen'):'')+
 `<div class="note gap">${s.autoRemind?'<b>อัตโนมัติ: เปิด</b> — ระบบเตรียมข้อความให้เองเมื่อเปิดหน้านี้ใช้งาน และตรวจซ้ำทุกชั่วโมง':'<b>อัตโนมัติ: ปิด</b> — กดปุ่มด้านบนเพื่อสร้างข้อความ'}<br>${s.endpoint?'เชื่อมประตูส่ง LINE แล้ว ข้อความของลูกค้าที่มี LINE User ID จะถูกส่งทันที':'ยังไม่ได้เชื่อม LINE — ข้อความจะเข้าคิว กด “เปิด” เพื่อส่งผ่านแอป LINE เอง'}</div>`+
 card(`คิวข้อความ (${db.outbox.length})`,table(['เวลา','ประเภท','ลูกค้า','สถานะ',''],rows,'ยังไม่มีข้อความ'))};

V.parts=()=>{const use={};db.tickets.forEach(t=>t.parts.forEach(p=>use[p.partId]=(use[p.partId]||0)+p.qty));
 const rows=db.parts.map(p=>`<tr><td><b>${esc(p.name)}</b><br><span class="muted small">${esc(p.sku)}</span></td><td class="right nowrap">${p.stock} ${esc(p.unit)}</td><td>${p.stock<=p.min?bdg('ใกล้หมด','bad'):bdg('ปกติ','ok')}</td><td class="right">${use[p.id]||0}</td><td class="right nowrap">${can('parts')?btnAct('+ รับเข้า','stock-in',{id:p.id},'sm lime')+' '+btnAct('แก้ไข','edit-part',{id:p.id},'sm ghost')+' '+btnAct('ลบ','del-part',{id:p.id},'sm ghost red'):''}</td></tr>`);
 const top=db.parts.map(p=>[p.name,use[p.id]||0]).filter(x=>x[1]).sort((a,b)=>b[1]-a[1]).slice(0,6);
 return head('parts','คลังอะไหล่ ตัดสต็อกอัตโนมัติเมื่อบันทึกในงานซ่อม',can('parts')?btnAct('+ เพิ่มอะไหล่','new-part'):'')+
 card('คลังอะไหล่',table(['อะไหล่','คงเหลือ','สถานะ','ใช้แล้ว',''],rows,emptyBox('ยังไม่มีอะไหล่','',can('parts')?btnAct('+ เพิ่มอะไหล่','new-part'):'')))+(top.length?card('ใช้บ่อยที่สุด',bars(top)):'')};

V.bot=()=>{const oa=(db.settings.lineOA||'').trim(),add=oa?`https://line.me/R/ti/p/${encodeURIComponent(oa)}`:'';
 const cust=sess.role==='customer';
 return head('bot',cust?'ลองคุยกับผู้ช่วยบริการของ CiViO — เช็กประกัน แจ้งซ่อม ติดตามงาน':'ตัวอย่างแชตบอทที่ลูกค้าจะใช้ใน LINE และการ์ดแจ้งเตือนที่ระบบส่งให้',add?`<a class="btn" target="_blank" rel="noopener" href="${add}">เพิ่มเพื่อน LINE</a>`:'')+
 `<div class="grid2" style="grid-template-columns:minmax(0,460px) minmax(0,1fr);align-items:start">
  <div class="card" style="padding:0;overflow:hidden"><iframe src="line-gateway/demo.html" title="ตัวอย่างแชตบอท LINE" style="display:block;width:100%;height:min(680px,calc(100vh - 190px));min-height:520px;border:0" loading="lazy"></iframe></div>
  <div class="card"><h2>บอททำอะไรได้</h2>
   <p class="muted small" style="margin-top:0">หน้าตัวอย่างนี้อ่านลูกค้าและเครื่องจริงในระบบมาแสดง ปุ่มในแชตไม่บันทึกข้อมูลและไม่ส่งข้อความออกจริง</p>
   <ul style="padding-left:18px;margin:10px 0;line-height:1.9"><li>เช็กวันหมดประกันและรอบตรวจเช็กของแต่ละเครื่อง</li><li>แจ้งซ่อม/นัดตรวจเช็กได้เองในแชต เลือกเครื่อง → อาการ → ยืนยัน</li><li>ติดตามสถานะงานเป็นแถบความคืบหน้า และให้คะแนนหลังปิดงาน</li><li>รับแจ้งเตือนอัตโนมัติ: ใกล้หมดประกัน ถึงรอบตรวจเช็ก อัปเดตสถานะงานซ่อม</li></ul>
   ${cust?'':`<div class="note"><b>สถานะการเชื่อมต่อ:</b> ${db.settings.endpoint?'ตั้งค่าประตูส่ง LINE แล้ว':'ยังไม่ได้เชื่อม LINE จริง'} · ติดตั้งตามขั้นตอนใน <code>service/line-gateway/README-th.md</code> (ตั้ง LINE OA ID และ URL ประตูส่งที่ ตั้งค่า → LINE)</div>`}
  </div></div>`};
V.surveys=()=>{const rated=db.tickets.filter(t=>t.rating).sort((a,b)=>b.rating.at.localeCompare(a.rating.at)),dist=[5,4,3,2,1].map(n=>[n+' ดาว',rated.filter(t=>t.rating.score===n).length]);
 const pend=db.tickets.filter(t=>!OPEN(t.status)&&!t.rating).length;
 return head('surveys','ลูกค้าให้คะแนนหลังปิดงาน')+
 `<div class="kpis"><div class="kpi"><b>${avgRating(db.tickets).toFixed(1)}</b><span>คะแนนเฉลี่ย (เต็ม 5)</span></div><div class="kpi info"><b>${rated.length}</b><span>แบบประเมินที่ได้รับ</span></div><div class="kpi warn"><b>${pend}</b><span>งานปิดแล้วที่ยังไม่ประเมิน</span></div></div>
 <div class="grid2" style="grid-template-columns:1fr 1.6fr"><div class="card"><h2>การกระจายคะแนน</h2>${bars(dist)}</div><div class="card"><h2>ความเห็นล่าสุด</h2>${table(['งาน','ลูกค้า','คะแนน','ความเห็น'],rated.map(t=>`<tr class="link" data-go="ticket/${t.id}"><td class="nowrap">${t.id}</td><td>${esc(cust(t.customerId).name)}</td><td>${stars(t.rating.score)}</td><td>${esc(t.rating.comment)||'<span class="muted">-</span>'}</td></tr>`))}</div></div>`};

V.analysis=()=>{const rep=db.tickets.filter(t=>t.kind==='repair'),by={};
 rep.forEach(t=>{const m=mach(t.machineId).model;(by[m]=by[m]||{n:0,s:{},days:[]});by[m].n++;by[m].s[t.symptom]=(by[m].s[t.symptom]||0)+1;if(!OPEN(t.status)){const h=t.history[t.history.length-1];by[m].days.push(Math.max(0,diff(t.createdAt,h.at)))}});
 const models=Object.entries(by).sort((a,b)=>b[1].n-a[1].n);
 const fleet={};db.machines.forEach(m=>fleet[m.model]=(fleet[m.model]||0)+1);
 const rep2=repeatMachines();
 return head('analysis','สรุปอาการที่พบบ่อยตามรุ่นเครื่อง จากข้อมูลงานซ่อมและแบบประเมิน')+
 `<div class="card"><h2>อัตราแจ้งซ่อมตามรุ่น</h2>${table(['รุ่น','เครื่องในระบบ','งานซ่อม','งานต่อเครื่อง','เวลาปิดงานเฉลี่ย','อาการที่พบบ่อยสุด','คะแนนเฉลี่ย'],models.map(([k,v])=>{const top=Object.entries(v.s).sort((a,b)=>b[1]-a[1])[0],avgD=v.days.length?(v.days.reduce((a,b)=>a+b,0)/v.days.length).toFixed(1)+' วัน':'-';return `<tr><td><b>${esc(k)}</b></td><td class="right">${fleet[k]||0}</td><td class="right">${v.n}</td><td class="right">${fleet[k]?(v.n/fleet[k]).toFixed(1):'-'}</td><td class="right">${avgD}</td><td>${esc(top[0])} (${top[1]})</td><td>${stars(avgRating(rep.filter(t=>mach(t.machineId).model===k))||0)}</td></tr>`}),'ยังไม่มีข้อมูลงานซ่อม')}</div>
 <div class="grid2">${models.slice(0,2).map(([k,v])=>`<div class="card"><h2>อาการที่พบบ่อย — ${esc(k)}</h2>${bars(Object.entries(v.s).sort((a,b)=>b[1]-a[1]).slice(0,5))}</div>`).join('')}</div>
 <div class="card" style="margin-top:18px"><h2>เครื่องที่เสียซ้ำ (≥ 2 ครั้งใน 180 วัน)</h2>${table(['เครื่อง','ลูกค้า','จำนวนครั้ง','อาการที่ซ้ำ'],rep2.map(x=>{const s={};machTickets(x.m.id).forEach(t=>s[t.symptom]=(s[t.symptom]||0)+1);const top=Object.entries(s).sort((a,b)=>b[1]-a[1])[0];return `<tr class="link" data-go="machine/${x.m.id}"><td><b>${esc(x.m.serial)}</b></td><td>${esc(cust(x.m.customerId).name)}</td><td class="right"><span class="bd bad">${x.n}</span></td><td>${esc(top[0])}</td></tr>`}),'ไม่มีเครื่องที่เสียซ้ำ')}<p class="muted small" style="margin:12px 0 0">ข้อสังเกตใช้ข้อมูลที่บันทึกในระบบเท่านั้น ควรให้ทีมช่างยืนยันสาเหตุก่อนสรุปเชิงเทคนิค</p></div>`};


V.import=()=>{const s=db.sales,by={};s.forEach(r=>{by[r.platform]=by[r.platform]||{n:0,amt:0,rs:[]};by[r.platform].n+=r.qty;by[r.platform].amt+=r.amount;if(r.rating)by[r.platform].rs.push(r.rating)});
 return head('import','ใช้เมื่อมีการขายออนไลน์ — เพิ่มทีละรายการ หรืออัปโหลดไฟล์',can('import')?btnAct('+ เพิ่มรายการ','new-sale'):'')+
 (can('import')?`<div class="card import"><div><b>อัปโหลดไฟล์จากแพลตฟอร์ม (CSV)</b><span class="muted small">คอลัมน์: วันที่, แพลตฟอร์ม, สินค้า, เลขที่ออเดอร์, จำนวน, ยอดขาย, คะแนน, รีวิว</span></div><div class="chips">${btnAct('① ไฟล์ตัวอย่าง','csv-tpl',{},'ghost')}<label class="btn">② เลือกไฟล์ CSV<input type="file" accept=".csv,text/csv" data-act="csv-file" hidden></label></div></div>`:'')+
 card('สรุปตามแพลตฟอร์ม',table(['แพลตฟอร์ม','จำนวนชิ้น','ยอดขาย (บาท)','คะแนนรีวิวเฉลี่ย'],Object.entries(by).map(([k,v])=>`<tr><td><b>${esc(k)}</b></td><td class="right">${v.n}</td><td class="right">${v.amt.toLocaleString('th-TH')}</td><td>${v.rs.length?(v.rs.reduce((a,b)=>a+b,0)/v.rs.length).toFixed(1):'-'}</td></tr>`),'ยังไม่มีข้อมูลยอดขาย'))+
 card(`รายการล่าสุด (${s.length})`,table(['วันที่','แพลตฟอร์ม','สินค้า','ออเดอร์','จำนวน','ยอดขาย','คะแนน','รีวิว',''],s.slice(0,50).map(r=>`<tr><td class="nowrap">${esc(r.date)}</td><td>${esc(r.platform)}</td><td>${esc(r.product)}</td><td>${esc(r.order)}</td><td class="right">${+r.qty}</td><td class="right">${(+r.amount).toLocaleString('th-TH')}</td><td>${+r.rating||'-'}</td><td>${esc(r.review)}</td><td>${can('import')?btnAct('ลบ','del-sale',{id:r.id||''},'sm ghost red'):''}</td></tr>`),'ยังไม่มีรายการ'),can('import')&&s.length?btnAct('ล้างทั้งหมด','csv-clear',{},'sm danger'):'')};

/* ---------- ตั้งค่า ---------- */
const TABS=[['auto','อัตโนมัติและแจ้งเตือน'],['models','รุ่นและรายการ'],['users','ผู้ใช้'],['line','LINE'],['data','ข้อมูล']];
const toggle=(name,on,title,desc)=>`<label class="switch"><input type="checkbox" name="${name}"${on?' checked':''}><span><b>${title}</b><small>${desc}</small></span></label>`;
const num=(name,val,label,min=0,hint='')=>`<label>${label}${hint?` <span class="h">${hint}</span>`:''}<input type="number" min="${min}" name="${name}" value="${esc(val)}"></label>`;
const settingsTab={
 auto:s=>`<form class="card f" data-form="auto"><h2>ระบบอัตโนมัติ</h2>
  ${toggle('autoInsp',s.autoInsp,'ลงตารางงานตรวจเช็กให้อัตโนมัติ','เมื่อเครื่องใกล้ถึงกำหนด ระบบเลือกวันว่างและช่างที่งานน้อยให้ แล้วรอทีมงานกด “ยืนยันนัด”')}
  <div class="row2">${num('autoInspDays',s.autoInspDays,'สร้างงานล่วงหน้า (วัน)')}${num('jobsPerDay',s.jobsPerDay,'ช่าง 1 คนรับได้กี่งานต่อวัน',1)}</div>
  ${toggle('workSunday',s.workSunday,'นัดงานวันอาทิตย์ได้','ถ้าปิด ระบบจะไม่เสนอวันอาทิตย์')}
  ${toggle('autoRemind',s.autoRemind,'เตรียมข้อความแจ้งเตือน LINE อัตโนมัติ','ทำงานเมื่อมีทีมงานเปิดระบบ และตรวจซ้ำทุกชั่วโมง ถ้าเชื่อม LINE แล้วจะส่งถึงลูกค้าทันที')}
  <h2>แจ้งเตือนล่วงหน้ากี่วัน</h2><div class="row2"><label>ก่อนหมดประกัน <span class="h">คั่นด้วยจุลภาค</span><input name="warnDays" value="${esc(s.warnDays.join(','))}"></label><label>ก่อนวันนัด <span class="h">เช่น 3 หรือ 3,1</span><input name="apptNotice" value="${esc(s.apptNotice.join(','))}"></label></div>
  <div class="row2">${num('inspectNotice',s.inspectNotice,'ก่อนถึงรอบตรวจเช็ก')}${num('checkNotice',s.checkNotice,'ก่อนเช็กรายการอื่น')}</div>
  <div class="chips"><button class="btn">บันทึกการตั้งค่า</button>${btnAct('รันระบบอัตโนมัติตอนนี้','run-auto',{},'ghost')}</div></form>`,
 models:s=>card('รุ่นเครื่อง',table(['รุ่น','ประกัน','ตรวจเช็กทุก','ใช้อยู่',''],s.models.map(m=>`<tr><td><b>${esc(m.name)}</b></td><td>${+m.warranty} เดือน</td><td>${+m.inspect} เดือน</td><td>${db.machines.filter(k=>k.model===m.name).length} เครื่อง</td><td class="right nowrap">${btnAct('แก้ไข','edit-model',{id:m.name},'sm ghost')} ${btnAct('ลบ','del-model',{id:m.name},'sm ghost red')}</td></tr>`),'ยังไม่มีรุ่นเครื่อง'),btnAct('+ เพิ่มรุ่น','new-model',{},'sm'))+
  card('รายการเช็กตามรอบ (นอกจากตรวจเช็กทั่วไป)',table(['รายการ','ทุกกี่เดือน',''],s.checkItems.map(i=>`<tr><td><b>${esc(i.name)}</b></td><td>${+i.months} เดือน</td><td class="right nowrap">${btnAct('แก้ไข','edit-check',{id:i.name},'sm ghost')} ${btnAct('ลบ','del-check',{id:i.name},'sm ghost red')}</td></tr>`),'ยังไม่มีรายการ'),btnAct('+ เพิ่มรายการ','new-check',{},'sm'))+
  card('อาการเสีย (ตัวเลือกตอนแจ้งซ่อม)',`<div class="tags">${s.symptoms.map(x=>`<span>${esc(x)}<button type="button" data-act="del-symptom" data-id="${esc(x)}" aria-label="ลบ ${esc(x)}">×</button></span>`).join('')}</div><p class="muted small">รายการนี้ใช้บนหน้าเว็บ ส่วนแชตบอท LINE มีรายการของตัวเองใน line-gateway/webhook.php</p>`,btnAct('+ เพิ่มอาการ','new-symptom',{},'sm')),
 users:s=>{const demo=db.users.filter(u=>u.demo);return card('บัญชีผู้ใช้',table(['ชื่อ','อีเมล','บทบาท','สถานะ',''],db.users.map(u=>`<tr><td><b>${esc(u.name)}</b>${u.demo?' '+bdg('ทดลอง','tent'):''}${u.role==='customer'?`<br><span class="muted small">${u.customerId?esc(cust(u.customerId).name):'ยังไม่ผูกกับลูกค้า'}</span>`:''}</td><td>${esc(u.username)}</td><td>${bdg(ROLE_NAME[u.role]||'-')}</td><td>${u.status==='active'?bdg('ใช้งานได้','ok'):u.status==='pending'?bdg('รออนุมัติ','warn'):bdg('ปิดใช้งาน','bad')}</td><td class="right nowrap">${u.status==='pending'?btnAct('อนุมัติ','approve-req',{id:u.id},'sm'):btnAct('แก้ไข','edit-user',{id:u.id},'sm ghost')+' '+btnAct('รหัสผ่าน','reset-pw',{id:u.id},'sm ghost')+(u.id===sess.userId?'':' '+btnAct(u.status==='disabled'?'เปิดใช้':'ปิดใช้','toggle-user',{id:u.id},'sm ghost')+' '+btnAct('ลบ','del-user',{id:u.id},'sm ghost red'))}</td></tr>`)),btnAct('+ เพิ่มผู้ใช้','new-user',{},'sm'))+
  `<div class="card f"><h2>บัญชีทดลอง</h2><p class="muted small">รหัสผ่านของบัญชีทดลองคือ <b>${DEMO_PW}</b> ซึ่งทุกคนที่เห็นหน้าเว็บรู้ได้ ก่อนใช้กับข้อมูลจริงให้สร้างบัญชีผู้บริหารของตัวเอง แล้วปิดบัญชีทดลอง</p><label class="switch"><input type="checkbox" id="demoHints"${s.demoHints?' checked':''}><span><b>แสดงปุ่มเข้าด้วยบัญชีทดลองในหน้าเข้าสู่ระบบ</b></span></label>${demo.some(u=>u.status==='active')?`<div>${btnAct('ปิดบัญชีทดลองทั้งหมด','demo-off',{},'ghost red')}</div>`:''}</div>`},
 line:s=>`<form class="card f" data-form="line"><h2>เชื่อมต่อ LINE</h2><div class="row2"><label>LINE Official Account ID <span class="h">เช่น @civio</span><input name="lineOA" value="${esc(s.lineOA)}"></label><label>เบอร์ที่แสดงท้ายข้อความ<input name="phone" value="${esc(s.phone)}"></label></div><label>URL ประตูส่ง LINE <span class="h">ดู line-gateway/README-th.md</span><input name="endpoint" value="${esc(s.endpoint)}" placeholder="https://.../service/line-gateway/send.php"></label><label>รหัสลับของประตูส่ง <span class="h">ต้องตรงกับ CIVIO_SHARED_SECRET</span><input type="password" name="secret" value="${esc(s.secret)}" autocomplete="off"></label><div><button class="btn">บันทึก</button></div></form>`,
 data:()=>card('สำรองและกู้คืน',`<p class="muted small">สำรองล่าสุด: ${db.lastBackup?th(db.lastBackup):'ยังไม่เคยสำรอง'}</p><div class="chips">${btnAct('สำรองข้อมูล (JSON)','exp-json')}<label class="btn ghost">กู้คืนจากไฟล์<input type="file" accept=".json" data-act="imp-json" hidden></label>${btnAct('ส่งออกงาน (CSV)','exp-csv',{},'ghost')}</div>`)+
  card('ล้างข้อมูล',`<p class="muted small">ควรสำรองข้อมูลก่อนทุกครั้ง การล้างย้อนกลับไม่ได้</p><div class="chips">${btnAct('ล้างข้อมูลงาน (เก็บบัญชีและการตั้งค่า)','reset-data',{},'ghost red')}${btnAct('ล้างทุกอย่างและเริ่มใหม่','reset',{},'danger')}</div>`)+
  '<div class="note">ข้อมูลตอนนี้เก็บในเบราว์เซอร์ของเครื่องนี้เท่านั้น ยังไม่แชร์ข้ามเครื่องหรือข้ามคน การใช้งานหลายคนต้องย้ายไปฐานข้อมูลกลางตาม database/schema.sql</div>'};
V.settings=()=>head('settings','ปรับระบบอัตโนมัติ รุ่นเครื่อง ผู้ใช้ และข้อมูล')+
 `<div class="seg tabs">${TABS.map(([k,l])=>`<button type="button" class="${F.tab===k?'on':''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}</div>`+settingsTab[F.tab](db.settings);

/* ---------- ฝั่งลูกค้า ---------- */
V.my=()=>{const c=db.customers.find(x=>x.id===sess.customerId);
 if(!c)return hello('ยินดีต้อนรับสู่บริการหลังการขาย')+emptyBox('บัญชีนี้ยังไม่ได้ผูกกับองค์กรลูกค้า','ให้ทีมงานเปิดหน้าลูกค้ารายที่ต้องการ แล้วกด “ผูกบัญชีทดลองลูกค้า” หรือสร้างบัญชีใหม่ จากนั้นเครื่องและงานจะแสดงที่นี่');
 const ms=db.machines.filter(m=>m.customerId===c.id),ts=db.tickets.filter(t=>t.customerId===c.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),open=ts.filter(t=>OPEN(t.status)),toRate=ts.filter(t=>!OPEN(t.status)&&!t.rating);
 const L=[];open.filter(t=>t.appointment&&!t.tentative&&t.appointment>=T0()).sort((a,b)=>a.appointment.localeCompare(b.appointment)).forEach(t=>L.push(`<li><b>นัด${kindName(t)}</b> ${esc(mLabel(mach(t.machineId)))} — ${th(t.appointment)}${t.appointmentTime?' เวลา '+esc(t.appointmentTime)+' น.':''} <span class="muted small">(<a href="#/ticket/${t.id}">${t.id}</a>)</span></li>`));
 ms.forEach(m=>checkItems().forEach(it=>{const d=diff(T0(),nextCheck(m,it));if(d<=(+db.settings.checkNotice||0))L.push(`<li><b>${esc(it.name)}</b> ${esc(mLabel(m))} — ${rel(nextCheck(m,it))}</li>`)}));
 return hello(esc(c.name))+head('my','เครื่องและงานของท่าน',ms.length?btnAct('แจ้งซ่อม','book'):'')+
 (toRate.length?`<div class="note gap">มี ${toRate.length} งานที่ปิดแล้ว รบกวนให้คะแนนบริการ — <a href="#/ticket/${toRate[0].id}">ให้คะแนนตอนนี้</a></div>`:'')+
 (L.length?`<div class="note gap"><b>เตือนล่วงหน้า</b><ul>${L.join('')}</ul></div>`:'')+
 `<div class="kpis"><div class="kpi"><b>${ms.length}</b><span>เครื่องของท่าน</span></div><div class="kpi info"><b>${open.length}</b><span>งานที่กำลังดำเนินการ</span></div><div class="kpi warn"><b>${ms.filter(m=>wInfo(m).state==='soon').length}</b><span>เครื่องใกล้หมดประกัน</span></div></div>`+
 card('เครื่องของท่าน',table(['เครื่อง','สถานที่ตั้ง','ประกัน','ตรวจเช็กครั้งถัดไป',''],ms.map(m=>`<tr><td><b>${esc(m.serial)}</b><br><span class="muted small">${esc(m.model)}</span></td><td>${esc(m.location)}</td><td>${wBadge(m)}</td><td>${iBadge(m)}</td><td class="right nowrap">${btnAct('แจ้งซ่อม','book',{mid:m.id},'sm')} ${btnAct('ขอนัดตรวจเช็ก','book',{mid:m.id,kind:'inspection'},'sm ghost')}</td></tr>`),'ยังไม่มีเครื่องในระบบ ติดต่อทีมงาน'))+
 card('งานของท่าน',ticketsTable(ts))};

/* ---------- แถบทักทาย ---------- */
const greet=()=>{const h=new Date().getHours();return h<12?'สวัสดีตอนเช้า':h<17?'สวัสดีตอนบ่าย':'สวัสดีตอนเย็น'};
const hello=sub=>`<section class="hello"><div><p>${greet()}</p><h2>${esc(sess.name)}</h2><span>${sub}</span><em>${new Date().toLocaleDateString('th-TH',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</em></div><img src="../assets/images/civio-mascot.png" alt="" aria-hidden="true"></section>`;
