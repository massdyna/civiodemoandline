/* calendar.js : หน้าปฏิทินตารางงาน และตัวเลือกวันนัดในฟอร์ม */
'use strict';
const WD=['อา','จ','อ','พ','พฤ','ศ','ส'];
const TIMES=['09:00','10:30','13:00','15:00'];
const EV_NAME={a:'นัดแล้ว',t:'รอยืนยัน',d:'ถึงกำหนดตรวจ',w:'หมดประกัน'};

/* รวมเหตุการณ์ทั้งหมดเป็น {วันที่: [รายการ]} */
function eventMap(tech=''){
 const ev={},add=(d,x)=>{(ev[d]=ev[d]||[]).push(x)};
 db.tickets.filter(t=>t.appointment&&OPEN(t.status)&&(!tech||t.assignee===tech)).forEach(t=>add(t.appointment,{type:t.tentative?'t':'a',time:t.appointmentTime||'',title:cust(t.customerId).name,sub:`${kindName(t)} ${mLabel(mach(t.machineId))}${t.assignee?' · '+t.assignee:' · ยังไม่ระบุช่าง'}`,ticket:t.id,go:'ticket/'+t.id}));
 if(!tech)db.machines.forEach(m=>{
  const name=cust(m.customerId).name;
  add(wEnd(m),{type:'w',time:'',title:name,sub:`หมดประกัน ${mLabel(m)}`,go:'machine/'+m.id});
  if(openInspJob(m.id))return; /* มีงานตรวจเช็กเปิดอยู่แล้ว ไม่แสดงซ้ำ */
  [{name:GEN,date:nextInsp(m)},...checkItems().map(it=>({name:it.name,date:nextCheck(m,it)}))].forEach(x=>add(x.date,{type:'d',time:'',title:name,sub:`${x.name} · ${mLabel(m)}`,mid:m.id,go:'machine/'+m.id}))});
 Object.values(ev).forEach(a=>a.sort((x,y)=>'atdw'.indexOf(x.type)-'atdw'.indexOf(y.type)||x.time.localeCompare(y.time)));
 return ev}

function monthCells(y,m,cell){
 const start=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
 let h=WD.map(d=>`<div class="dh">${d}</div>`).join('')+'<div class="d out"></div>'.repeat(start);
 for(let d=1;d<=days;d++)h+=cell(`${y}-${pad(m+1)}-${pad(d)}`,d);
 return h}
const shiftMonth=(c,n)=>{const d=new Date(c.y,c.m+n,1);c.y=d.getFullYear();c.m=d.getMonth()};
const monthOf=ds=>({y:+ds.slice(0,4),m:+ds.slice(5,7)-1});

function dayItem(d,x,showDate){
 const t=x.ticket&&db.tickets.find(k=>k.id===x.ticket);
 const acts=x.type==='t'&&can('book')?btnAct('ยืนยันนัด','confirm-job',{id:x.ticket},'sm lime')+btnAct('เปลี่ยนวัน','schedule',{id:x.ticket},'sm ghost')
  :x.type==='a'&&can('book')?btnAct('เลื่อนนัด','schedule',{id:x.ticket},'sm ghost')
  :x.type==='d'&&can('book')?btnAct('จัดนัด','book',{mid:x.mid,kind:'inspection',date:d<T0()?'':d},'sm'):'';
 return `<li class="ag ${x.type}"><div class="ag-t">${showDate?`<small>${th(d)}</small>`:''}<b>${x.time||(x.type==='a'||x.type==='t'?'ไม่ระบุเวลา':'ทั้งวัน')}</b></div><div class="ag-b"><a href="#/${x.go}">${esc(x.title)}</a><span>${esc(x.sub)}</span><div class="chips">${bdg(EV_NAME[x.type],{a:'info',t:'tent',d:'ok',w:'bad'}[x.type])}${t&&t.priority!=='ปกติ'?bdg(esc(t.priority),'bad'):''}${acts}</div></div></li>`}

const CAL={view:'month',tech:'',show:{a:true,t:true,d:true,w:true}};
function calendarPage(){
 const today=T0();if(!F.cal){F.cal=monthOf(today);F.sel=today}
 const {y,m}=F.cal,all=eventMap(CAL.tech),ev={};
 Object.keys(all).forEach(d=>{const a=all[d].filter(x=>CAL.show[x.type]);if(a.length)ev[d]=a});
 const waiting=db.tickets.filter(t=>OPEN(t.status)&&!t.appointment),tent=db.tickets.filter(t=>OPEN(t.status)&&t.tentative).sort((a,b)=>a.appointment.localeCompare(b.appointment));
 const overdue=Object.keys(ev).filter(d=>d<today).flatMap(d=>ev[d].filter(x=>x.type==='d'||x.type==='a').map(x=>[d,x])).sort((a,b)=>a[0].localeCompare(b[0]));
 const filt=`<div class="cal-tools"><div class="seg">${[['month','ปฏิทินเดือน'],['list','รายการ 60 วัน']].map(([v,l])=>`<button type="button" class="${CAL.view===v?'on':''}" data-act="cal-view" data-v="${v}">${l}</button>`).join('')}</div>
  <div class="fchips">${Object.entries(EV_NAME).map(([k,l])=>`<button type="button" class="fc ${k}${CAL.show[k]?' on':''}" aria-pressed="${CAL.show[k]}" data-act="cal-filter" data-v="${k}">${l}</button>`).join('')}</div>
  <select data-cal-tech aria-label="เลือกช่าง"><option value="">ช่างทุกคน</option>${opt([...new Set([...techs(),...db.tickets.map(t=>t.assignee).filter(Boolean)])],CAL.tech)}</select></div>`;
 let main;
 if(CAL.view==='list'){const L=Object.keys(ev).filter(d=>d>=today&&d<=addDays(today,60)).sort();
  main=`<div class="card">${L.length?L.map(d=>`<h3 class="ag-day">${thDay(d)} <span>${rel(d)}</span></h3><ul class="agenda">${ev[d].map(x=>dayItem(d,x)).join('')}</ul>`).join(''):emptyBox('ยังไม่มีรายการใน 60 วันข้างหน้า')}</div>`}
 else{
  const cells=monthCells(y,m,(ds,d)=>{const e=ev[ds]||[];
   return `<button type="button" class="d${ds===today?' today':''}${F.sel===ds?' sel':''}${isWorkDay(ds)?'':' off'}" data-act="cal-day" data-d="${ds}" aria-label="${thDay(ds)} ${e.length} รายการ"><b>${d}</b>${e.slice(0,3).map(x=>`<span class="ev ${x.type}">${x.time?x.time+' ':''}${esc(x.title)}</span>`).join('')}${e.length>3?`<em>+${e.length-3} รายการ</em>`:''}${e.length?`<i class="dots">${e.slice(0,4).map(x=>`<s class="${x.type}"></s>`).join('')}</i>`:''}</button>`});
  const sel=F.sel||today,list=ev[sel]||[];
  main=`<div class="cal-wrap"><div class="card"><div class="cal-h"><button type="button" class="btn sm ghost" data-act="cal-prev" aria-label="เดือนก่อนหน้า">‹</button><h2>${thMonth(y,m)}</h2><div class="chips"><button type="button" class="btn sm ghost" data-act="cal-today">วันนี้</button><button type="button" class="btn sm ghost" data-act="cal-next" aria-label="เดือนถัดไป">›</button></div></div><div class="cal">${cells}</div><p class="muted small cal-tip">กดที่วันเพื่อดูตารางงานของวันนั้น หรือเพิ่มนัดใหม่</p></div>
  <div class="card day-panel" id="dayPanel"><h2>${thDay(sel)}</h2><p class="muted small">${rel(sel)} · ${list.length?list.length+' รายการ':'ว่าง'}</p>${can('book')&&sel>=today?btnAct(sel===today?'+ นัดงานวันนี้':'+ นัดงานวันที่เลือก','book',{date:sel},'wfull'):''}<ul class="agenda">${list.map(x=>dayItem(sel,x)).join('')}</ul></div></div>`}
 const queueCard=(title,items,none)=>`<div class="card"><h2>${title}</h2>${items.length?`<ul class="agenda">${items.join('')}</ul>`:`<div class="empty">${none}</div>`}</div>`;
 return head('calendar','นัดหมาย รอบตรวจเช็ก และวันหมดประกันขึ้นที่นี่อัตโนมัติ',`${can('book')?btnAct('+ นัดหมายใหม่','book'):''}${btnAct('ส่งเข้าปฏิทินมือถือ (.ics)','ics',{},'ghost')}`)+filt+main+
  `<div class="grid3">
  ${queueCard(`รอยืนยันนัด ${bdg(tent.length,'tent')}`,tent.slice(0,8).map(t=>dayItem(t.appointment,{type:'t',time:t.appointmentTime||'',title:cust(t.customerId).name,sub:`${kindName(t)} ${mLabel(mach(t.machineId))}${t.assignee?' · '+t.assignee:''}`,ticket:t.id,go:'ticket/'+t.id},true)),'ไม่มีนัดที่รอยืนยัน')}
  ${queueCard(`ยังไม่ได้จัดวัน ${bdg(waiting.length,'warn')}`,waiting.slice(0,8).map(t=>`<li class="ag a"><div class="ag-t"><small>แจ้ง</small><b>${th(t.createdAt)}</b></div><div class="ag-b"><a href="#/ticket/${t.id}">${esc(cust(t.customerId).name)}</a><span>${t.id} · ${esc(t.symptom)}</span><div class="chips">${can('book')?btnAct('จัดวันนัด','schedule',{id:t.id},'sm'):''}</div></div></li>`),'ทุกงานมีวันนัดแล้ว')}
  ${queueCard(`เลยกำหนด ${bdg(overdue.length,'bad')}`,overdue.slice(0,8).map(([d,x])=>dayItem(d,x,true)),'ไม่มีรายการเลยกำหนด')}
  </div>`}

/* ---------- ไฟล์ .ics นำเข้า Google Calendar / ปฏิทินมือถือ ---------- */
function icsText(){
 const e=s=>String(s).replace(/\\/g,'\\\\').replace(/[,;]/g,'\\$&').replace(/\r?\n/g,'\\n');
 const stamp=new Date().toISOString().replace(/[-:]|\.\d+/g,'');
 const ev=db.tickets.filter(t=>t.appointment&&!t.tentative&&OPEN(t.status)).map(t=>{const d=t.appointment.replace(/-/g,'');let when;
  if(t.appointmentTime){const[h,mi]=t.appointmentTime.split(':').map(Number),end=Math.min(h+1,23);when=`DTSTART;TZID=Asia/Bangkok:${d}T${pad(h)}${pad(mi)}00\r\nDTEND;TZID=Asia/Bangkok:${d}T${pad(end)}${pad(h===23?59:mi)}00`}
  else when=`DTSTART;VALUE=DATE:${d}\r\nDTEND;VALUE=DATE:${addDays(t.appointment,1).replace(/-/g,'')}`;
  const m=mach(t.machineId),c=cust(t.customerId);
  return `BEGIN:VEVENT\r\nUID:${t.id}@civio-service\r\nDTSTAMP:${stamp}\r\n${when}\r\nSUMMARY:${e(`${kindName(t)} ${c.name} (${t.id})`)}\r\nDESCRIPTION:${e(`เครื่อง ${mLabel(m)}\nช่าง ${t.assignee||'-'}\nติดต่อ ${c.contact||'-'} ${c.phone||''}`)}\r\nLOCATION:${e(m.location||c.address||'')}\r\nEND:VEVENT`});
 return {n:ev.length,text:['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CiViO//Service//TH','BEGIN:VTIMEZONE','TZID:Asia/Bangkok','BEGIN:STANDARD','DTSTART:19700101T000000','TZOFFSETFROM:+0700','TZOFFSETTO:+0700','END:STANDARD','END:VTIMEZONE',...ev,'END:VCALENDAR'].join('\r\n')}}

/* ---------- ตัวเลือกวันนัดในฟอร์ม: เห็นตารางงานก่อนเลือก ---------- */
const scheduleHTML=(v={})=>`<div class="sch" data-sch data-ex="${esc(v.id||'')}">
 <div class="sch-top"><b>เลือกวันนัดจากตารางงาน</b><div class="chips"><button type="button" class="btn sm lime" data-s="suggest">แนะนำวันว่าง</button><button type="button" class="btn sm ghost" data-s="clear">ยังไม่นัด</button></div></div>
 <input type="hidden" name="appointment" value="${esc(v.appointment||'')}">
 <div class="sch-grid"><div class="sch-cal"></div><div class="sch-day" aria-live="polite"></div></div>
 ${group('เวลานัด',`<div class="months"><div class="pick">${TIMES.map(t=>`<label><input type="radio" name="time_q" value="${t}"${v.appointmentTime===t?' checked':''}><span><b>${t}</b></span></label>`).join('')}</div><input type="time" name="appointmentTime" value="${esc(v.appointmentTime||'')}" aria-label="เวลานัด"></div>`,'ไม่ใส่ก็ได้')}
 <label>ช่างผู้รับผิดชอบ<input name="assignee" list="techList" value="${esc(v.assignee||'')}" placeholder="เลือกจากรายชื่อ หรือพิมพ์เอง" autocomplete="off"><datalist id="techList">${opt(techs(),'')}</datalist></label>
 <div class="sch-warn" role="status"></div></div>`;

function bindSchedule(f){
 const box=$('[data-sch]',f);if(!box)return;
 const ex=box.dataset.ex,date=$('[name=appointment]',box),time=$('[name=appointmentTime]',box),who_=$('[name=assignee]',box),qs=$$('[name=time_q]',box);
 let cur=monthOf(date.value||T0());
 const draw=()=>{
  const today=T0(),sel=date.value,tech=who_.value.trim(),ev=eventMap();
  $('.sch-cal',box).innerHTML=`<div class="cal-h"><button type="button" class="btn sm ghost" data-s="prev" aria-label="เดือนก่อนหน้า">‹</button><b>${thMonth(cur.y,cur.m)}</b><button type="button" class="btn sm ghost" data-s="next" aria-label="เดือนถัดไป">›</button></div><div class="cal mini">${monthCells(cur.y,cur.m,(ds,d)=>{const n=jobsOn(ds,ex).length,full=dayFull(ds,tech,ex),due=(ev[ds]||[]).some(x=>x.type==='d');
    return `<button type="button" class="d${ds===today?' today':''}${ds===sel?' sel':''}${isWorkDay(ds)?'':' off'}${full?' full':n?' busy':''}" data-day="${ds}"${ds<today&&ds!==sel?' disabled':''} aria-label="${thDay(ds)} มีงาน ${n}"><b>${d}</b>${n?`<em>${n} งาน</em>`:''}${due?'<s></s>':''}</button>`})}</div><div class="legend"><span><i class="lg-busy"></i>มีงาน</span><span><i class="lg-full"></i>คิวเต็ม</span><span><i class="lg-due"></i>มีเครื่องถึงกำหนด</span></div>`;
  const jobs=sel?jobsOn(sel,ex):[],other=sel?(ev[sel]||[]).filter(x=>x.type==='d'):[];
  $('.sch-day',box).innerHTML=sel?`<h4>${thDay(sel)}</h4>${jobs.length?`<ul>${jobs.map(t=>`<li class="${t.tentative?'t':''}"><b>${t.appointmentTime||'--:--'}</b><span>${esc(cust(t.customerId).name)}<small>${kindName(t)} · ${esc(t.assignee||'ยังไม่ระบุช่าง')}${t.tentative?' · รอยืนยัน':''}</small></span></li>`).join('')}</ul>`:'<p class="free">ว่างทั้งวัน ยังไม่มีงาน</p>'}${other.length?`<p class="muted small">ถึงกำหนดตรวจวันนี้ ${other.length} รายการ</p>`:''}`:'<h4>ยังไม่ได้เลือกวัน</h4><p class="muted small">กดวันที่ในปฏิทินเพื่อดูว่าวันนั้นมีงานอะไรแล้ว หรือกด “แนะนำวันว่าง” (บันทึกโดยยังไม่นัดก็ได้)</p>';
  const w=[];if(sel){if(!isWorkDay(sel))w.push('วันที่เลือกเป็นวันอาทิตย์');
   if(tech&&time.value&&jobs.some(t=>t.assignee===tech&&t.appointmentTime===time.value))w.push(`${tech} มีนัดเวลา ${time.value} น. อยู่แล้ว`);
   if(dayFull(sel,tech,ex))w.push(tech?`${tech} มีงานครบ ${db.settings.jobsPerDay} งานแล้วในวันนี้`:'คิวงานวันนี้เต็มแล้ว')}
  $('.sch-warn',box).innerHTML=w.length?`<div class="note"><b>ควรตรวจสอบ:</b> ${w.map(esc).join(' · ')} (ยังบันทึกได้)</div>`:''};
 box.addEventListener('click',e=>{const day=e.target.closest('[data-day]'),s=e.target.closest('[data-s]');
  if(day){date.value=day.dataset.day;dirty=true;formError(f,'');draw();return}
  if(!s)return;const a=s.dataset.s;formError(f,'');
  if(a==='prev')shiftMonth(cur,-1);else if(a==='next')shiftMonth(cur,1);
  else if(a==='clear'){date.value='';time.value='';qs.forEach(r=>r.checked=false);dirty=true}
  else{let tech=who_.value.trim();date.value=freeDay(addDays(T0(),1),tech,ex);if(!tech)who_.value=pickTech(date.value);cur=monthOf(date.value);dirty=true;toast(`แนะนำ ${thDay(date.value)}${who_.value?' · '+who_.value:''}`)}
  draw()});
 qs.forEach(r=>r.onchange=()=>{time.value=r.value;draw()});
 time.onchange=()=>{qs.forEach(r=>r.checked=r.value===time.value);draw()};
 who_.oninput=draw;draw()}
