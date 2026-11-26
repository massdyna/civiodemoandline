/* forms.js : หน้าต่างเพิ่ม/แก้ไขข้อมูลทั้งหมด
   หมายเหตุสำหรับผู้พัฒนา: ในฟังก์ชันบันทึกให้ค้นหาข้อมูลจาก id ใหม่เสมอ เพราะ db อาจถูกโหลดใหม่จากแท็บอื่น */
'use strict';
const FORMS={};
const done=msg=>{save();const r=runAuto();toast(msg+(r.jobs?` · ระบบลงตารางตรวจเช็กให้ ${r.jobs} งาน`:''));render()};
const byId=(list,id)=>db[list].find(x=>x.id===id);
const serialTaken=(serial,except)=>db.machines.find(x=>x.serial.trim().toLowerCase()===serial.trim().toLowerCase()&&x.id!==except);

/* ---------- ปุ่ม “+ เพิ่ม” รวมทุกอย่าง ---------- */
FORMS.add=()=>{
 const noC=!db.customers.length,noM=!db.machines.length;
 const T=[
  ['customers','plus','ส่งมอบเครื่องใหม่','ลูกค้า + เครื่อง ใน 3 ขั้น','register',''],
  ['machines','machines','เพิ่มเครื่อง','ให้ลูกค้าที่มีอยู่แล้ว','new-machine',noC?'ต้องมีลูกค้าก่อน':''],
  ['customers','customers','เพิ่มลูกค้า','เฉพาะข้อมูลองค์กร','new-customer',''],
  ['book','calendar','นัดหมาย / แจ้งซ่อม','เลือกวันจากตารางงาน','book',noM?'ต้องมีเครื่องก่อน':''],
  ['inspections','check','บันทึกการตรวจเช็ก','ระบบคำนวณรอบถัดไปให้','rec-insp',noM?'ต้องมีเครื่องก่อน':''],
  ['parts','parts','เพิ่มอะไหล่','เข้าคลังอะไหล่','new-part',''],
  ['import','import','เพิ่มรายการขาย','ยอดขายออนไลน์','new-sale',''],
  ['settings','user','เพิ่มผู้ใช้','ทีมงาน หรือบัญชีลูกค้า','new-user',''],
  ['settings','settings','เพิ่มรุ่นเครื่อง','พร้อมระยะประกันของรุ่น','new-model','']].filter(t=>can(t[0]));
 modal('จะเพิ่มอะไร?',`<div class="tiles">${T.map(([,i,t,s,act,why])=>`<button type="button" class="tile" data-act="${act}"${why?' disabled':''}>${ic(i)}<b>${t}</b><span>${why||s}</span></button>`).join('')}</div>`,null,'',{wide:true})};

/* ---------- ช่องกรอกที่ใช้ร่วมกัน ---------- */
const customerFields=c=>`<label><span>ชื่อองค์กร / ลูกค้า ${req}</span><input name="name" required value="${esc(c.name)}" placeholder="เช่น ชื่อโรงเรียน โรงแรม หรือบริษัท"></label>
 <div class="row2"><label>ผู้ติดต่อ<input name="contact" value="${esc(c.contact)}"></label><label>เบอร์โทร<input name="phone" inputmode="tel" value="${esc(c.phone)}"></label></div>
 <details${c.email||c.lineUserId||c.address?' open':''}><summary>ข้อมูลเพิ่มเติม (อีเมล ที่อยู่ LINE) — ใส่ทีหลังได้</summary><div class="f"><label>อีเมล<input name="email" type="email" value="${esc(c.email)}"></label><label>ที่อยู่<textarea name="address" rows="2">${esc(c.address)}</textarea></label><label>LINE User ID <span class="h">ขึ้นต้นด้วย U ใช้ส่งแจ้งเตือนอัตโนมัติ</span><input name="lineUserId" value="${esc(c.lineUserId)}"></label></div></details>`;
const pickCustomer=d=>({name:d.name.trim(),contact:d.contact.trim(),phone:d.phone.trim(),email:d.email.trim(),address:d.address.trim(),lineUserId:d.lineUserId.trim()});
const newMachineDefaults=(cid='')=>{const name=models()[0]||'',def=modelDef(name);return {customerId:cid,model:name,serial:'',deliveryDate:T0(),installDate:T0(),warrantyMonths:def.warranty,inspectMonths:def.inspect,location:'',note:''}};

const machineFields=m=>`${group(`รุ่นเครื่อง ${req}`,models().length?chips('model',models(),m.model,{label:'รุ่นเครื่อง'}):'<div class="note">ยังไม่มีรุ่นเครื่อง ให้ผู้บริหารเพิ่มที่ ตั้งค่า → รุ่นและรายการ</div>',can('settings')?'<a href="#" data-act="goto-models">จัดการรุ่น</a>':'')}
 <label><span>เลขซีเรียล ${req}</span><input name="serial" required value="${esc(m.serial)}" placeholder="ดูจากป้ายข้างเครื่อง" autocomplete="off"></label>
 <div class="row2"><label><span>วันส่งมอบ ${req}</span><input type="date" name="deliveryDate" required value="${m.deliveryDate||''}"></label><label>วันติดตั้ง <span class="h">เริ่มนับประกันจากวันนี้</span><input type="date" name="installDate" value="${m.installDate||''}"></label></div>
 ${months('warrantyMonths',m.warrantyMonths,[6,12,24,36],'ระยะประกัน (เดือน)')}
 ${months('inspectMonths',m.inspectMonths,[1,3,6,12],'ตรวจเช็กทุกกี่เดือน')}
 <label>สถานที่ตั้งเครื่อง<input name="location" value="${esc(m.location)}" placeholder="เช่น หลังครัว ชั้น 1"></label>
 <label>หมายเหตุ<input name="note" value="${esc(m.note)}"></label>`;
function bindMachine(f,isNew){
 bindMonths(f);const dl=f.elements.deliveryDate,ins=f.elements.installDate;let linked=ins.value===dl.value;
 ins.addEventListener('input',()=>linked=false);dl.addEventListener('change',()=>{if(linked)ins.value=dl.value});
 $$('[name=model]',f).forEach(r=>r.onchange=()=>{if(!isNew)return;const d=modelDef(r.value);
  [['warrantyMonths',d.warranty],['inspectMonths',d.inspect]].forEach(([n,v])=>{const el=$(`input[type=number][name=${n}]`,f);el.value=v;el.dispatchEvent(new Event('input'))})})}
const pickMachine=d=>({model:d.model,serial:d.serial.trim(),deliveryDate:d.deliveryDate,installDate:d.installDate,warrantyMonths:Math.max(0,+d.warrantyMonths||0),inspectMonths:+d.inspectMonths||db.settings.inspectMonths,location:d.location.trim(),note:d.note.trim()});
function checkMachine(f,d,except){
 if(!d.model)return formError(f,'กรุณาเลือกรุ่นเครื่อง'),false;
 const s=f.elements.serial;if(!s.value.trim())return invalid(f,s);
 const hit=serialTaken(s.value,except);if(hit)return invalid(f,s,`เลขซีเรียลนี้มีในระบบแล้ว (ของ ${cust(hit.customerId).name})`);
 return true}

/* ---------- ลงทะเบียนส่งมอบ: ลูกค้า → เครื่อง → ตรวจสอบและลงปฏิทิน ---------- */
FORMS.register=(cid='')=>{
 const has=db.customers.length>0,mode=cid&&byId('customers',cid)?'old':'new';let step=1;
 const list=db.customers.slice().sort((a,b)=>a.name.localeCompare(b.name,'th'));
 const html=`<ol class="steps"><li>ลูกค้า</li><li>เครื่อง</li><li>ตรวจสอบ</li></ol>
 <section data-step="1">
  ${has?chips('mode',[['new','ลูกค้าใหม่'],['old','ลูกค้าเดิม',`มี ${db.customers.length} ราย`]],mode,{big:true,label:'ประเภทลูกค้า'}):'<input type="hidden" name="mode" value="new">'}
  <div data-m="old" class="f"><input type="search" data-find placeholder="พิมพ์ค้นหาชื่อลูกค้า ผู้ติดต่อ หรือเบอร์โทร" aria-label="ค้นหาลูกค้า"><div class="cards">${list.map(c=>`<label data-k="${esc([c.name,c.contact,c.phone].join(' ').toLowerCase())}"><input type="radio" name="customerId" value="${c.id}"${c.id===cid?' checked':''}><span><b>${esc(c.name)}</b><small>${esc([c.contact,c.phone].filter(Boolean).join(' · ')||'ยังไม่มีผู้ติดต่อ')} · ${db.machines.filter(m=>m.customerId===c.id).length} เครื่อง</small></span></label>`).join('')}</div></div>
  <div data-m="new" class="f">${customerFields({})}</div>
 </section>
 <section data-step="2" hidden>${machineFields(newMachineDefaults(cid))}
  <details><summary>เครื่องใช้งานมาก่อนแล้ว? ใส่วันที่ตรวจเช็กล่าสุด</summary><div class="f"><label>ตรวจเช็กล่าสุดเมื่อ<input type="date" name="lastDate" max="${T0()}"></label>${group('รายการที่ทำแล้วในวันนั้น',checks('lastItems',[GEN,...checkItems().map(i=>i.name)],[GEN]),'ระบบจะนับรอบถัดไปจากวันดังกล่าว')}</div></details>
 </section>
 <section data-step="3" hidden><div data-summary></div>
  <label class="switch"><input type="checkbox" name="bookNow"><span>นัดตรวจเช็กครั้งแรกลงตารางงานเลย</span></label>
  <div data-booknow hidden>${scheduleHTML()}</div>
 </section>`;
 const f=modal('ส่งมอบเครื่องใหม่',html,(d,f)=>{
  if(step===1){
   if(d.mode==='old'){if(!d.customerId)return formError(f,'กรุณาเลือกลูกค้าจากรายการ')}
   else{if(!d.name.trim())return invalid(f,f.elements.name,'กรุณากรอกชื่อองค์กร / ลูกค้า');
    const em=f.elements.email;if(!em.checkValidity())return invalid(f,em)}
   go(2);return false}
  if(step===2){
   if(!checkMachine(f,d))return false;
   for(const n of ['deliveryDate','warrantyMonths','inspectMonths','lastDate']){const el=$(`input[name=${n}]:not([type=radio])`,f);if(!el.checkValidity())return invalid(f,el)}
   go(3);return false}
  if(d.bookNow&&!d.appointment)return formError(f,'เลือกวันนัดจากปฏิทิน หรือปิดตัวเลือก “นัดตรวจเช็กครั้งแรก”');
  if(serialTaken(d.serial))return formError(f,'เลขซีเรียลนี้มีในระบบแล้ว');
  let c=d.mode==='old'?byId('customers',d.customerId):db.customers.find(x=>x.name.trim().toLowerCase()===d.name.trim().toLowerCase());
  if(!c){c=Object.assign({id:'c'+uid()},pickCustomer(d));db.customers.push(c)}
  const m=Object.assign({id:'m'+uid(),customerId:c.id},pickMachine(d));db.machines.push(m);
  if(d.lastDate)new FormData(f).getAll('lastItems').forEach(i=>recordInsp(m.id,i,d.lastDate,'บันทึกย้อนหลัง'));
  if(d.bookNow)createTicket({customerId:c.id,machineId:m.id,symptom:INSP_SYM,kind:'inspection',by:sess.name,appointment:d.appointment,appointmentTime:d.appointmentTime,assignee:d.assignee.trim(),desc:'นัดตรวจเช็กครั้งแรกหลังส่งมอบ'});
  save();runAuto();render();FORMS.registered(m.id);return false},'ถัดไป',{wide:true});
 const okBtn=$('[data-ok]',f),back=document.createElement('button');back.type='button';back.className='btn ghost back';back.textContent='← ย้อนกลับ';$('.m-foot',f).prepend(back);back.onclick=()=>go(step-1);
 const go=n=>{step=n;formError(f,'');
  $$('[data-step]',f).forEach(s=>s.hidden=+s.dataset.step!==n);$$('.steps li',f).forEach((li,i)=>li.className=i+1<n?'done':i+1===n?'on':'');
  back.hidden=n===1;okBtn.textContent=n===3?'บันทึกและลงปฏิทิน':'ถัดไป →';if(n===3)summary();f.scrollTop=0};
 const showMode=()=>{const v=new FormData(f).get('mode');$$('[data-m]',f).forEach(x=>x.hidden=x.dataset.m!==v)};
 const summary=()=>{const d=Object.fromEntries(new FormData(f)),c=d.mode==='old'?byId('customers',d.customerId):pickCustomer(d),m=Object.assign({id:'_new'},pickMachine(d));
  const items=new FormData(f).getAll('lastItems'),from=(name,n)=>addMonths(d.lastDate&&items.includes(name)?d.lastDate:(m.installDate||m.deliveryDate),n);
  const line=[[m.installDate||m.deliveryDate,'เริ่มรับประกัน','a'],[from(GEN,m.inspectMonths),'ตรวจเช็กครั้งถัดไป','d'],...checkItems().map(i=>[from(i.name,i.months),i.name,'d']),[wEnd(m),'หมดประกัน','w']].sort((a,b)=>a[0].localeCompare(b[0]));
  const dup=d.mode==='new'&&db.customers.some(x=>x.name.trim().toLowerCase()===d.name.trim().toLowerCase());
  $('[data-summary]',f).innerHTML=`<div class="sum"><div><small>ลูกค้า</small><b>${esc(c.name)}</b><span>${esc([c.contact,c.phone].filter(Boolean).join(' · '))}</span></div><div><small>เครื่อง</small><b>${esc(mLabel(m))}</b><span>${esc(m.location)||'ไม่ระบุสถานที่'}</span></div></div>${dup?'<div class="note">มีลูกค้าชื่อนี้อยู่แล้ว ระบบจะเพิ่มเครื่องเข้ารายเดิม</div>':''}
  <div class="grp-l">ระบบจะลงปฏิทินให้อัตโนมัติ</div><ul class="plan">${line.map(([dt,l,t])=>`<li class="${t}"><b>${th(dt)}</b><span>${esc(l)}</span><small>${rel(dt)}</small></li>`).join('')}</ul>`};
 $$('[name=mode]',f).forEach(r=>r.onchange=showMode);
 $('[data-find]',f)?.addEventListener('input',e=>{const q=e.target.value.trim().toLowerCase();$$('.cards label',f).forEach(l=>l.hidden=!l.dataset.k.includes(q))});
 f.elements.bookNow.onchange=e=>{$('[data-booknow]',f).hidden=!e.target.checked};
 bindMachine(f,true);bindSchedule(f);showMode();go(mode==='old'?2:1)};

FORMS.registered=mid=>{const m=byId('machines',mid);
 modal('บันทึกเรียบร้อย',`<div class="au-done"><div class="au-ok">✓</div><h2>${esc(mLabel(m))}</h2><p>${esc(cust(m.customerId).name)} · ลงปฏิทินแล้ว<br>ตรวจเช็กครั้งถัดไป <b>${th(nextInsp(m))}</b> · หมดประกัน <b>${th(wEnd(m))}</b></p></div><div class="tiles two">
 <button type="button" class="tile" data-act="register" data-cid="${m.customerId}">${ic('plus')}<b>เพิ่มเครื่องถัดไป</b><span>ลูกค้ารายเดิม</span></button>
 <button type="button" class="tile" data-act="cal-goto" data-d="${nextInsp(m)}">${ic('calendar')}<b>ดูในปฏิทิน</b><span>เปิดเดือนที่ต้องตรวจ</span></button>
 <button type="button" class="tile" data-act="open" data-p="machine/${m.id}">${ic('machines')}<b>ดูข้อมูลเครื่อง</b><span>ประวัติและประกัน</span></button>
 <button type="button" class="tile" data-act="close">${ic('check')}<b>เสร็จแล้ว</b><span>ปิดหน้าต่าง</span></button></div>`,null,'',{noFocus:true})};

/* ---------- ลูกค้า / เครื่อง ---------- */
FORMS.customer=id=>modal(id?'แก้ไขลูกค้า':'เพิ่มลูกค้า',customerFields(byId('customers',id)||{}),(d,f)=>{
 const v=pickCustomer(d);if(!v.name)return invalid(f,f.elements.name,'กรุณากรอกชื่อองค์กร / ลูกค้า');
 const same=db.customers.find(x=>x.id!==id&&x.name.trim().toLowerCase()===v.name.toLowerCase());if(same)return invalid(f,f.elements.name,'มีลูกค้าชื่อนี้ในระบบแล้ว');
 if(id){Object.assign(byId('customers',id),v);done('บันทึกแล้ว')}else{const c=Object.assign({id:'c'+uid()},v);db.customers.push(c);done('เพิ่มลูกค้าแล้ว');location.hash='#/customer/'+c.id}});

FORMS.machine=(id,cid)=>{const m=id?byId('machines',id):newMachineDefaults(cid||'');
 const f=modal(id?'แก้ไขเครื่อง':'เพิ่มเครื่อง',`<label><span>ลูกค้า ${req}</span><select name="customerId" required><option value="">— เลือกลูกค้า —</option>${opt(db.customers,m.customerId,c=>c.id,c=>c.name)}</select></label>${machineFields(m)}`,(d,f)=>{
  if(!checkMachine(f,d,id))return false;
  const v=Object.assign({customerId:d.customerId},pickMachine(d));
  if(id){const old=byId('machines',id);dropTentative(id);Object.assign(old,v);db.tickets.forEach(t=>{if(t.machineId===id)t.customerId=v.customerId});done('บันทึกแล้ว คำนวณปฏิทินใหม่ให้แล้ว')}
  else{const n=Object.assign({id:'m'+uid()},v);db.machines.push(n);save();runAuto();render();FORMS.registered(n.id);return false}},'บันทึก',{wide:true});
 bindMachine(f,!id)};

/* ---------- นัดหมาย / แจ้งซ่อม ---------- */
FORMS.book=(o={})=>{
 const isCust=sess.role==='customer';
 const pool=isCust?db.machines.filter(m=>m.customerId===sess.customerId):db.machines;
 if(!pool.length)return modal('ยังไม่มีเครื่องในระบบ',emptyBox(isCust?'บัญชีนี้ยังไม่มีเครื่อง':'ต้องลงทะเบียนเครื่องก่อน จึงจะนัดหมายได้',isCust?'กรุณาติดต่อทีมงาน CiViO':'',!isCust&&can('customers')?btnAct('+ ลงทะเบียนเครื่อง','register'):''),null,'',{noFocus:true});
 const pre=pool.find(m=>m.id===o.mid),cid=pre?pre.customerId:(o.cid||'');
 const custs=db.customers.filter(c=>pool.some(m=>m.customerId===c.id));
 const kind=o.kind||'repair';
 const html=`${chips('kind',[['repair','แจ้งซ่อม','เครื่องมีปัญหา'],['inspection','ตรวจเช็ก','บำรุงรักษาตามรอบ']],kind,{big:true,label:'ประเภทงาน'})}
 ${isCust?'':`<label><span>ลูกค้า ${req}</span><select name="customerId" required><option value="">— เลือกลูกค้า —</option>${opt(custs,cid||(custs.length===1?custs[0].id:''),c=>c.id,c=>c.name)}</select></label>`}
 <label><span>เครื่อง ${req}</span><select name="machineId" required></select></label><div data-dupe></div>
 <div data-k="repair" class="f"><label>อาการ<select name="symptom">${opt(symptoms(),'')}</select></label></div>
 <div data-k="inspection" class="f"><div data-items></div></div>
 ${group('ความเร่งด่วน',chips('priority',PRIO,'ปกติ',{label:'ความเร่งด่วน'}))}
 <label>รายละเอียด<textarea name="desc" rows="2" placeholder="${isCust?'อธิบายอาการ และวันเวลาที่สะดวกให้เข้าตรวจ':'บันทึกเพิ่มเติมถึงช่าง'}"></textarea></label>
 ${isCust?'':scheduleHTML({appointment:o.date||''})}`;
 const f=modal(isCust?'แจ้งซ่อม / ขอนัดตรวจเช็ก':'นัดหมาย / แจ้งซ่อม',html,(d,f)=>{
  const m=byId('machines',d.machineId);if(!m)return formError(f,'กรุณาเลือกเครื่อง');
  const insp=d.kind==='inspection',items=new FormData(f).getAll('items');
  if(insp&&!items.length)return formError(f,'เลือกรายการที่จะตรวจเช็กอย่างน้อย 1 รายการ');
  if(isCust&&insp&&openInspJob(m.id)&&!openInspJob(m.id).tentative){return formError(f,`เครื่องนี้มีงานตรวจเช็ก ${openInspJob(m.id).id} เปิดอยู่แล้ว`)}
  if(insp)db.tickets=db.tickets.filter(t=>!(t.machineId===m.id&&t.auto&&t.tentative&&OPEN(t.status)));
  const x=createTicket({customerId:m.customerId,machineId:m.id,kind:d.kind,symptom:insp?INSP_SYM:d.symptom,items:insp?items:undefined,desc:d.desc.trim(),priority:d.priority,by:isCust?'ลูกค้า':sess.name,appointment:d.appointment||'',appointmentTime:d.appointmentTime||'',assignee:(d.assignee||'').trim()});
  if(x.appointment){F.sel=x.appointment;F.cal=monthOf(x.appointment)}
  done(x.appointment?`ลงตารางแล้ว ${x.id} · ${th(x.appointment)}`:`เปิดงาน ${x.id} แล้ว`)},isCust?'ส่งเรื่อง':'บันทึกงาน',{wide:!isCust});
 const ms=f.elements.machineId,cs=f.elements.customerId;
 const fill=()=>{const c=isCust?sess.customerId:cs.value,a=pool.filter(m=>m.customerId===c);
  ms.innerHTML=(a.length===1?'':`<option value="">${c?'— เลือกเครื่อง —':'— เลือกลูกค้าก่อน —'}</option>`)+opt(a,o.mid,m=>m.id,m=>mLabel(m)+(m.location?' · '+m.location:''));info()};
 const info=()=>{const m=byId('machines',ms.value),k=new FormData(f).get('kind'),job=m&&openInspJob(m.id);
  $$('[data-k]',f).forEach(x=>x.hidden=x.dataset.k!==k);
  const due=m?dueItems(m,30).map(x=>x.name):[];
  $('[data-items]',f).innerHTML=group('รายการที่จะตรวจ',checks('items',[GEN,...checkItems().map(i=>i.name)],due.length?due:[GEN]));
  $('[data-dupe]',f).innerHTML=m?`<div class="mini">${wBadge(m)} <span class="muted small">ตรวจเช็กถัดไป ${th(nextInsp(m))}</span></div>${k==='inspection'&&job?`<div class="note">${job.tentative?`ระบบเสนอนัด ${job.id} ไว้วันที่ ${th(job.appointment)} — เมื่อบันทึก นัดนี้จะถูกแทนที่`:`มีงานตรวจเช็ก <b>${job.id}</b> เปิดอยู่แล้ว ตรวจสอบก่อนสร้างซ้ำ`}</div>`:''}`:''};
 if(cs)cs.onchange=()=>{o.mid='';fill()};ms.onchange=info;$$('[name=kind]',f).forEach(r=>r.onchange=info);fill();bindSchedule(f)};

/* ตั้ง/เลื่อน/ยืนยันนัด ของงานที่มีอยู่ */
function applyAppointment(id,{appointment,time,assignee},note=''){
 const x=byId('tickets',id),before=[x.appointment,x.appointmentTime||''].join('|'),wasTent=x.tentative,prev=x.status;
 Object.assign(x,{appointment,appointmentTime:appointment?time||'':'',assignee,tentative:false});
 if(appointment&&x.status==='ใหม่')x.status='นัดหมายแล้ว';
 if(!appointment&&x.status==='นัดหมายแล้ว')x.status='ใหม่';
 const changed=wasTent||before!==[x.appointment,x.appointmentTime].join('|');
 if(changed||note||x.status!==prev)x.history.push({at:T0(),status:x.status,note:note||(appointment?`นัดวันที่ ${th(appointment)}${x.appointmentTime?' เวลา '+x.appointmentTime+' น.':''}`:'ยกเลิกวันนัด'),by:sess.name});
 if(changed&&appointment)statusMessage(x);return x}
function statusMessage(x){const c=cust(x.customerId),m=mach(x.machineId);
 queue('อัปเดตสถานะงาน',x.customerId,`เรียนคุณ${who(c)}\nงาน${kindName(x)} ${x.id} สถานะล่าสุด: ${x.status}${x.appointment?`\nนัดหมายวันที่ ${th(x.appointment)}${x.appointmentTime?' เวลา '+x.appointmentTime+' น.':''}`:''}${x.status==='เสร็จสิ้น'?'\nรบกวนให้คะแนนบริการได้ที่ระบบลูกค้า ขอบคุณครับ':''}`,'',{kind:'ticket',code:x.id,model:m.model,serial:m.serial,symptom:x.symptom,status:x.status,created_at:x.createdAt,appointment_on:x.appointment||'',assignee:x.assignee||''})}
FORMS.schedule=id=>{const x=byId('tickets',id),m=mach(x.machineId);
 const f=modal(x.appointment?'เลื่อน / ยืนยันนัด':'จัดวันนัด',`<div class="sum"><div><small>${x.id} · ${kindName(x)}</small><b>${esc(cust(x.customerId).name)}</b><span>${esc(mLabel(m))} · ${esc(x.symptom)}</span></div></div>${scheduleHTML(x)}`,d=>{
  applyAppointment(id,{appointment:d.appointment,time:d.appointmentTime,assignee:d.assignee.trim()});if(d.appointment){F.sel=d.appointment;F.cal=monthOf(d.appointment)}done(d.appointment?`ยืนยันนัด ${th(d.appointment)} แล้ว`:'บันทึกแล้ว')},'บันทึกนัด',{wide:true,noFocus:true});
 bindSchedule(f)};

/* ---------- อัปเดตงาน ---------- */
FORMS.update=id=>{const x=byId('tickets',id);
 const partRow=()=>`<div class="prow"><select name="partId" aria-label="อะไหล่"><option value="">— เลือกอะไหล่ —</option>${opt(db.parts,'',p=>p.id,p=>`${p.name} (เหลือ ${p.stock} ${p.unit})`)}</select><input type="number" min="1" name="qty" value="1" aria-label="จำนวน"></div>`;
 const items=x.kind==='inspection'?[...new Set([...(x.items||[GEN]),GEN,...checkItems().map(i=>i.name)])]:[];
 const f=modal('อัปเดตงาน '+id,`${group('สถานะงาน',chips('status',STATUS,x.status,{label:'สถานะงาน'}))}
 ${x.kind==='inspection'&&!x.inspRecorded?`<div data-fin hidden>${group('ตรวจรายการใดแล้ว',checks('items',items,x.items||[GEN]),'บันทึกประวัติและนับรอบถัดไปให้อัตโนมัติ')}</div>`:''}
 <label>บันทึกการทำงาน<textarea name="note" rows="2"></textarea></label>
 ${group('อะไหล่ที่ใช้เพิ่ม',db.parts.length?`<div data-parts>${partRow()}</div><button type="button" class="btn sm ghost" data-addpart>+ อีกรายการ</button>`:'<p class="muted small">ยังไม่มีอะไหล่ในคลัง เพิ่มได้ที่เมนู “อะไหล่”</p>','ตัดสต็อกอัตโนมัติ')}
 <details${x.appointment?'':' open'}><summary>วันนัดและช่าง${x.appointment?` (ปัจจุบัน ${th(x.appointment)} ${x.appointmentTime||''})`:''}</summary>${scheduleHTML(x)}</details>`,(d,f)=>{
  const t=byId('tickets',id),fd=new FormData(f),use={};
  fd.getAll('partId').forEach((p,i)=>{const q=+fd.getAll('qty')[i];if(p&&q>0)use[p]=(use[p]||0)+q});
  for(const p in use){const part=byId('parts',p);if(use[p]>part.stock)return formError(f,`${part.name} คงเหลือ ${part.stock} ${part.unit} ไม่พอ (ต้องการ ${use[p]}) — แก้จำนวนในคลังก่อน`)}
  const status=d.status,finished=!OPEN(status),record=t.kind==='inspection'&&!t.inspRecorded&&finished,did=fd.getAll('items');
  if(record&&!did.length)return formError(f,'เลือกรายการที่ตรวจแล้วอย่างน้อย 1 รายการ');
  if(status==='นัดหมายแล้ว'&&!d.appointment)return formError(f,'สถานะ “นัดหมายแล้ว” ต้องเลือกวันนัดด้วย');
  for(const p in use){byId('parts',p).stock-=use[p];const e=t.parts.find(z=>z.partId===p);e?e.qty+=use[p]:t.parts.push({partId:p,qty:use[p]})}
  const prev=t.status,assignee=d.assignee.trim(),oldA=[t.appointment,t.appointmentTime||''].join('|');
  t.assignee=assignee;t.appointment=d.appointment;t.appointmentTime=d.appointment?d.appointmentTime||'':'';
  const moved=oldA!==[t.appointment,t.appointmentTime].join('|');
  t.status=status;if(status==='ใหม่'&&moved&&t.appointment)t.status='นัดหมายแล้ว';
  if(t.status!=='ใหม่'||moved)t.tentative=false;
  if(t.status!==prev||d.note||moved)t.history.push({at:T0(),status:t.status,note:d.note,by:assignee||sess.name});
  if(record){did.forEach(i=>recordInsp(t.machineId,i,T0(),assignee||sess.name,`จากงาน ${t.id}`));t.inspRecorded=true;t.items=did}
  save();if(t.status!==prev||(moved&&t.appointment))statusMessage(t);
  done(record?'ปิดงานแล้ว บันทึกการตรวจและนับรอบถัดไปให้แล้ว':'อัปเดตแล้ว')},'บันทึก',{wide:true,noFocus:true});
 const fin=$('[data-fin]',f),toggle=()=>{if(fin)fin.hidden=OPEN(new FormData(f).get('status'))};
 $$('[name=status]',f).forEach(r=>r.onchange=toggle);toggle();
 $('[data-addpart]',f)?.addEventListener('click',()=>$('[data-parts]',f).insertAdjacentHTML('beforeend',partRow()));
 bindSchedule(f)};

/* ---------- บันทึกการตรวจเช็ก ---------- */
FORMS.insp=(mid='')=>{
 if(!db.machines.length)return FORMS.book();
 const f=modal('บันทึกการตรวจเช็ก',`<label><span>เครื่อง ${req}</span><select name="machineId" required><option value="">— เลือกเครื่อง —</option>${opt(db.machines,mid,m=>m.id,m=>`${mLabel(m)} · ${cust(m.customerId).name}`)}</select></label><div data-items></div>
 <div class="row2"><label><span>วันที่ตรวจ ${req}</span><input type="date" name="date" required max="${T0()}" value="${T0()}"></label><label><span>ผู้ตรวจ ${req}</span><input name="by" required value="${sess.role==='tech'?esc(sess.name):''}" list="techList2"><datalist id="techList2">${opt(techs(),'')}</datalist></label></div><label>ผลการตรวจ / หมายเหตุ<textarea name="note" rows="2"></textarea></label>`,(d,f)=>{
  const did=new FormData(f).getAll('items');if(!did.length)return formError(f,'เลือกรายการที่ตรวจอย่างน้อย 1 รายการ');
  did.forEach(i=>recordInsp(d.machineId,i,d.date,d.by.trim(),d.note.trim()));settleTentative(d.machineId,did);done('บันทึกแล้ว รอบถัดไปคำนวณใหม่ให้แล้ว')});
 const sel=f.elements.machineId,fill=()=>{const m=byId('machines',sel.value),due=m?dueItems(m,14).map(x=>x.name):[];$('[data-items]',f).innerHTML=group('รายการที่ตรวจ',checks('items',[GEN,...checkItems().map(i=>i.name)],due.length?due:[GEN]),'เลือกได้หลายรายการ')};
 sel.onchange=fill;fill()};

FORMS.rate=id=>modal('ให้คะแนนบริการ',`<div class="stars">${[5,4,3,2,1].map(n=>`<input type="radio" name="score" id="s${n}" value="${n}"><label for="s${n}" title="${n} ดาว">★</label>`).join('')}</div><label>ความเห็นเพิ่มเติม<textarea name="comment"></textarea></label>`,(d,f)=>{
 if(!d.score)return formError(f,'กรุณาเลือกจำนวนดาว');const x=byId('tickets',id);x.rating={score:+d.score,comment:d.comment.trim(),at:T0()};
 if(x.status==='เสร็จสิ้น'){x.history.push({at:T0(),status:'ปิดงาน',note:'ลูกค้าประเมินแล้ว',by:'ระบบ'});x.status='ปิดงาน'}done('ขอบคุณสำหรับคะแนน')},'ส่งคะแนน',{noFocus:true});

/* ---------- อะไหล่ / ยอดขาย ---------- */
FORMS.part=id=>{const p=byId('parts',id)||{name:'',sku:'',stock:0,min:2,unit:'ชิ้น'};
 modal(id?'แก้ไขอะไหล่':'เพิ่มอะไหล่',`<label><span>ชื่ออะไหล่ ${req}</span><input name="name" required value="${esc(p.name)}"></label><div class="row2"><label>รหัส<input name="sku" value="${esc(p.sku)}"></label><label>หน่วย<input name="unit" value="${esc(p.unit)}"></label></div><div class="row2"><label>จำนวนคงเหลือ<input type="number" min="0" name="stock" required value="${p.stock}"></label><label>เตือนเมื่อเหลือไม่เกิน<input type="number" min="0" name="min" required value="${p.min}"></label></div>`,(d,f)=>{
  if(!d.name.trim())return invalid(f,f.elements.name,'กรุณากรอกชื่ออะไหล่');
  const v={name:d.name.trim(),sku:d.sku.trim(),unit:d.unit.trim()||'ชิ้น',stock:+d.stock,min:+d.min};if(id)Object.assign(byId('parts',id),v);else db.parts.push(Object.assign({id:'p'+uid()},v));done('บันทึกแล้ว')})};
FORMS.sale=()=>modal('เพิ่มรายการขาย',`<div class="row2"><label><span>วันที่ ${req}</span><input type="date" name="date" required value="${T0()}"></label><label><span>แพลตฟอร์ม ${req}</span><input name="platform" required list="pfList" placeholder="Shopee, Lazada…"><datalist id="pfList">${opt([...new Set(['Shopee','Lazada','TikTok Shop','Facebook','หน้าร้าน',...db.sales.map(s=>s.platform)])],'')}</datalist></label></div><label><span>สินค้า ${req}</span><input name="product" required></label><div class="row2"><label>เลขที่ออเดอร์<input name="order"></label><label><span>จำนวน ${req}</span><input type="number" min="1" name="qty" required value="1"></label></div><div class="row2"><label><span>ยอดขาย (บาท) ${req}</span><input type="number" min="0" step="0.01" name="amount" required></label><label>คะแนนรีวิว (1–5)<input type="number" min="1" max="5" name="rating"></label></div><label>รีวิว<input name="review"></label>`,d=>{
 db.sales.unshift({id:uid(),date:d.date,platform:d.platform.trim(),product:d.product.trim(),order:d.order.trim(),qty:+d.qty,amount:+d.amount,rating:+d.rating||0,review:d.review.trim()});done('เพิ่มรายการขายแล้ว')});

/* ---------- รุ่นเครื่อง / อาการ / รายการเช็ก ---------- */
FORMS.model=name=>{const m=db.settings.models.find(x=>x.name===name)||{name:'',warranty:12,inspect:db.settings.inspectMonths};
 const f=modal(name?'แก้ไขรุ่นเครื่อง':'เพิ่มรุ่นเครื่อง',`<label><span>ชื่อรุ่น ${req}</span><input name="mname" required maxlength="20" value="${esc(m.name)}"></label>${months('warranty',m.warranty,[6,12,24,36],'ประกันมาตรฐานของรุ่น (เดือน)')}${months('inspectMonths',m.inspect,[1,3,6,12],'รอบตรวจเช็กมาตรฐาน (เดือน)')}<p class="muted small">ค่ามาตรฐานจะเติมให้อัตโนมัติตอนลงทะเบียนเครื่องใหม่ เครื่องเดิมไม่เปลี่ยน</p>`,(d,f)=>{
  const n=d.mname.trim().toUpperCase();if(!n)return invalid(f,f.elements.mname,'กรุณากรอกชื่อรุ่น');
  if(db.settings.models.some(x=>x.name===n&&x.name!==name))return invalid(f,f.elements.mname,'มีรุ่นนี้แล้ว');
  const v={name:n,warranty:+d.warranty,inspect:+d.inspectMonths},i=db.settings.models.findIndex(x=>x.name===name);
  if(i>=0){db.settings.models[i]=v;db.machines.forEach(k=>{if(k.model===name)k.model=n})}else db.settings.models.push(v);done('บันทึกรุ่นเครื่องแล้ว')});
 bindMonths(f)};
FORMS.checkItem=name=>{const it=checkItems().find(x=>x.name===name)||{name:'',months:6};
 const f=modal(name?'แก้ไขรายการเช็ก':'เพิ่มรายการเช็กตามรอบ',`<label><span>ชื่อรายการ ${req}</span><input name="iname" required maxlength="80" value="${esc(it.name)}" placeholder="เช่น เปลี่ยนไส้กรองกลิ่น"></label>${months('inspectMonths',it.months,[1,3,6,12],'ทุกกี่เดือน')}<p class="muted small">นับจากวันที่บันทึกครั้งล่าสุด หรือวันติดตั้ง เครื่องเก่าที่เลยรอบแล้วจะขึ้นเป็นงานถึงกำหนดทันที</p>`,(d,f)=>{
  const n=d.iname.trim();if(!n)return invalid(f,f.elements.iname,'กรุณากรอกชื่อรายการ');
  if(n===GEN||checkItems().some(x=>x.name===n&&x.name!==name))return invalid(f,f.elements.iname,'มีรายการชื่อนี้แล้ว');
  const v={name:n,months:+d.inspectMonths},i=db.settings.checkItems.findIndex(x=>x.name===name);
  if(i>=0){db.settings.checkItems[i]=v;db.inspections.forEach(k=>{if(k.item===name)k.item=n});db.tickets.forEach(t=>{if(t.items)t.items=t.items.map(k=>k===name?n:k)})}else db.settings.checkItems.push(v);
  db.tickets=db.tickets.filter(t=>!(t.auto&&t.tentative));done('บันทึกแล้ว คำนวณปฏิทินใหม่ให้แล้ว')});
 bindMonths(f)};
FORMS.symptom=()=>modal('เพิ่มอาการเสีย',`<label><span>อาการ ${req}</span><input name="s" required maxlength="120"></label>`,(d,f)=>{const s=d.s.trim();if(!s)return invalid(f,f.elements.s,'กรุณากรอกอาการ');if(symptoms().includes(s))return invalid(f,f.elements.s,'มีอาการนี้แล้ว');db.settings.symptoms.push(s);done('เพิ่มอาการแล้ว')});

/* ---------- บัญชีผู้ใช้ ---------- */
const ROLE_NAME={exec:'ผู้บริหาร',sales:'ทีมขาย',tech:'ทีมช่าง',customer:'ลูกค้า'};
const pwOk=p=>typeof p==='string'&&p.length>=8;
const lastAdmin=u=>u.role==='exec'&&u.status==='active'&&!db.users.some(x=>x.id!==u.id&&x.role==='exec'&&x.status==='active');
FORMS.user=(id,preset={})=>{const u=byId('users',id)||{name:'',username:'',role:preset.role||'tech',customerId:preset.cid||''},self=id&&id===sess.userId;
 const roles=can('settings')?Object.entries(ROLE_NAME):[['customer',ROLE_NAME.customer]];
 const f=modal(id?'แก้ไขบัญชี':'เพิ่มบัญชีผู้ใช้',`${self?`<input type="hidden" name="role" value="${u.role}">`:group('บทบาท',chips('role',roles,u.role,{label:'บทบาท'}))}
 <label><span>ชื่อที่แสดง ${req}</span><input name="name" required value="${esc(u.name)}"></label><label><span>อีเมล (ใช้เข้าสู่ระบบ) ${req}</span><input type="email" name="email" required value="${esc(u.username)}"${u.demo?' readonly':''}></label>
 <div data-cust><label><span>เป็นผู้ใช้ของลูกค้า ${req}</span><select name="customerId"><option value="">— ยังไม่ผูกกับลูกค้า —</option>${opt(db.customers,u.customerId,c=>c.id,c=>c.name)}</select></label></div>
 ${id?'':`<label><span>รหัสผ่านเริ่มต้น ${req}</span> <span class="h">อย่างน้อย 8 ตัวอักษร แจ้งให้ผู้ใช้เปลี่ยนเอง</span><input name="pw" required minlength="8" autocomplete="new-password"></label>`}`,(d,f)=>{
  const e=d.email.trim().toLowerCase();if(db.users.some(x=>x.username===e&&x.id!==id))return invalid(f,f.elements.email,'อีเมลนี้มีบัญชีแล้ว');
  if(!id&&!pwOk(d.pw))return invalid(f,f.elements.pw,'รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร');
  if(d.role==='customer'&&!d.customerId&&!(u.demo))return formError(f,'เลือกลูกค้าที่บัญชีนี้สังกัด');
  const v={username:e,name:d.name.trim(),role:d.role,customerId:d.role==='customer'?d.customerId||null:null};
  if(id){const t=byId('users',id);if(d.role!=='exec'&&lastAdmin(t))return formError(f,'ต้องมีผู้บริหารที่ใช้งานได้อย่างน้อย 1 บัญชี');Object.assign(t,v);if(self){sess=mkSess(t)}}
  else db.users.push(mkUser(e,v.name,v.role,d.pw,{customerId:v.customerId}));done('บันทึกบัญชีแล้ว')});
 const box=$('[data-cust]',f),sync=()=>box.hidden=new FormData(f).get('role')!=='customer';$$('[name=role]',f).forEach(r=>r.onchange=sync);sync()};
FORMS.pw=()=>modal('เปลี่ยนรหัสผ่าน','<label>รหัสผ่านปัจจุบัน<input type="password" name="old" required autocomplete="current-password"></label><label>รหัสผ่านใหม่ <span class="h">อย่างน้อย 8 ตัวอักษร</span><input type="password" name="n1" required minlength="8" autocomplete="new-password"></label><label>ยืนยันรหัสผ่านใหม่<input type="password" name="n2" required autocomplete="new-password"></label>',(d,f)=>{const u=byId('users',sess.userId);if(hashPw(u.salt,d.old)!==u.hash)return formError(f,'รหัสผ่านปัจจุบันไม่ถูกต้อง');if(!pwOk(d.n1)||d.n1!==d.n2)return formError(f,'รหัสผ่านใหม่ไม่ตรงกันหรือสั้นเกินไป');u.salt=uid()+uid();u.hash=hashPw(u.salt,d.n1);u.demo=false;save();toast('เปลี่ยนรหัสผ่านแล้ว')});
FORMS.resetPw=id=>modal('ตั้งรหัสผ่านใหม่',`<label>รหัสผ่านใหม่ <span class="h">อย่างน้อย 8 ตัวอักษร</span><input name="pw" required minlength="8"></label>`,(d,f)=>{if(!pwOk(d.pw))return formError(f,'รหัสผ่านสั้นเกินไป');const u=byId('users',id);u.salt=uid()+uid();u.hash=hashPw(u.salt,d.pw);u.demo=false;save();toast('ตั้งรหัสผ่านใหม่แล้ว');render()});
FORMS.approve=id=>{const u=byId('users',id),r=u.reg||{},hit=r.serial&&serialTaken(r.serial);
 modal('อนุมัติคำขอสมัคร',`<dl class="dl"><dt>องค์กร</dt><dd>${esc(r.org)}</dd><dt>ผู้ติดต่อ</dt><dd>${esc(r.contact)} · ${esc(r.phone)}</dd><dt>อีเมล</dt><dd>${esc(u.username)}</dd><dt>ซีเรียลที่ระบุ</dt><dd>${esc(r.serial)||'-'}${hit?` <span class="bd ok">พบในระบบ (${esc(cust(hit.customerId).name)})</span>`:r.serial?' <span class="bd warn">ไม่พบในระบบ</span>':''}</dd></dl><label>ผูกกับองค์กร<select name="link"><option value="new">+ สร้างองค์กรใหม่ “${esc(r.org)}”</option>${opt(db.customers,hit?hit.customerId:'',c=>c.id,c=>c.name)}</select></label><p class="muted small">ตรวจสอบว่าเป็นลูกค้าจริงก่อนอนุมัติ เช่น เทียบกับใบส่งมอบ/เลขซีเรียล เพื่อไม่ให้เห็นข้อมูลของรายอื่น</p>`,d=>{
  let cid=d.link;if(cid==='new'){cid='c'+uid();db.customers.push({id:cid,name:r.org,contact:r.contact,phone:r.phone,email:u.username,lineUserId:'',address:''})}
  const t=byId('users',id);t.customerId=cid;t.status='active';t.name=r.contact||t.name;done('อนุมัติแล้ว')},'อนุมัติ')};

FORMS.message=id=>{const o=byId('outbox',id),c=cust(o.customerId);
 modal('ข้อความถึง '+esc(c.name),`<div class="msg">${esc(o.text)}</div><div class="chips">${btnAct('คัดลอก','copy',{id},'sm')}<a class="btn sm lime" target="_blank" rel="noopener" href="${esc(lineOA(o))}">เปิดใน LINE</a>${btnAct('ทำเครื่องหมายว่าส่งแล้ว','mark',{id},'sm ghost')}${btnAct('ลบ','del-msg',{id},'sm danger')}</div><p class="muted small">${c.lineUserId?'ลูกค้ารายนี้มี LINE User ID — จะส่งอัตโนมัติเมื่อเชื่อมประตูส่งแล้ว':'ลูกค้ารายนี้ยังไม่ได้เชื่อม LINE User ID'}</p>`,null,'',{noFocus:true})};
