/* ui.js : ชิ้นส่วนหน้าจอที่ใช้ซ้ำ (หน้าต่าง ฟอร์ม ตาราง ป้ายสถานะ) */
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];

const ICONS={
dashboard:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
repairs:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
customers:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6.5 6.5 0 0 1 3.5 6"/>',
machines:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h4M7 14h2"/><circle cx="16" cy="12" r="2"/>',
calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
line:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
parts:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
surveys:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
analysis:'<path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
import:'<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
settings:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
bot:'<rect x="4" y="8" width="16" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16.5h5"/><circle cx="12" cy="3.5" r="1"/>',
plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'};
ICONS.my=ICONS.dashboard;
const ic=n=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||''}</svg>`;

/* ---------- ป้ายสถานะ ---------- */
const bdg=(text,cls='')=>`<span class="bd ${cls}">${text}</span>`;
const wBadge=m=>{const w=wInfo(m);return w.state==='expired'?bdg(`หมดประกัน ${th(w.end)}`,'bad'):w.state==='soon'?bdg(`เหลือ ${w.days} วัน · ${th(w.end)}`,'warn'):bdg(`ในประกัน ถึง ${th(w.end)}`,'ok')};
const dueBadge=(date,notice)=>{const d=diff(T0(),date);return d<0?bdg(`เกินกำหนด ${-d} วัน`,'bad'):d<=notice?bdg(`${d?`อีก ${d} วัน`:'วันนี้'} · ${th(date)}`,'warn'):bdg(th(date))};
const iBadge=m=>dueBadge(nextInsp(m),+db.settings.inspectNotice||0);
const kBadge=(m,it)=>dueBadge(nextCheck(m,it),+db.settings.checkNotice||0);
const stBadge=s=>bdg(esc(s),s==='ปิดงาน'||s==='เสร็จสิ้น'?'ok':s==='รออะไหล่'?'warn':s==='ใหม่'?'bad':'info');
const jobBadge=t=>t.tentative&&OPEN(t.status)?bdg('รอยืนยันนัด','tent'):stBadge(t.status);
const stars=n=>'<span class="star-s">'+'★'.repeat(Math.round(n))+'<span class="off">'+'★'.repeat(5-Math.round(n))+'</span></span>';
const kindName=t=>t.kind==='inspection'?'ตรวจเช็ก':'ซ่อม';

/* ---------- ข้อความแจ้ง / หน้าต่าง ---------- */
let tt;function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(tt);tt=setTimeout(()=>t.classList.remove('on'),Math.min(5000,Math.max(2600,m.length*60)))}
let dirty=false;
/* onSubmit คืน false = ยังไม่ปิดหน้าต่าง · ถ้าไม่ส่ง onSubmit จะไม่มีปุ่มท้ายหน้าต่าง */
function modal(title,html,onSubmit,ok='บันทึก',o={}){
 const m=$('#modal');dirty=false;
 m.innerHTML=`<div class="m-card${o.wide?' wide':''}" role="dialog" aria-modal="true" aria-labelledby="mTitle"><div class="m-head"><h3 id="mTitle">${title}</h3><button type="button" class="m-x" data-act="close" aria-label="ปิด">×</button></div><form class="m-body f" novalidate>${html}<div class="m-err" role="alert"></div>${onSubmit?`<div class="m-foot"><button type="button" class="btn ghost" data-act="close">ยกเลิก</button><button class="btn" data-ok>${ok}</button></div>`:''}</form></div>`;
 m.hidden=false;document.body.classList.add('m-open');const f=$('form',m);
 f.onsubmit=e=>{e.preventDefault();if(!onSubmit)return;formError(f,'');
  const bad=$$('input,select,textarea',f).find(el=>!el.disabled&&!el.closest('[hidden]')&&!el.checkValidity());
  if(bad){invalid(f,bad);return}
  if(onSubmit(Object.fromEntries(new FormData(f)),f)!==false&&f.isConnected)close()};
 f.addEventListener('input',e=>{dirty=true;e.target.classList.remove('bad');formError(f,'')});
 const first=$('input:not([type=hidden]):not([type=radio]):not([type=checkbox]),select,textarea',f);
 if(first&&!o.noFocus&&matchMedia('(min-width:861px)').matches)first.focus();
 return f}
function formError(f,msg){const e=$('.m-err',f);if(!e)return false;e.textContent=msg;if(msg)e.scrollIntoView({block:'nearest'});return false}
function invalid(f,el,msg){const lab=el.closest('label');const name=lab?(lab.childNodes[0].textContent||'').replace('*','').trim():'';
 el.closest('details')?.setAttribute('open','');
 el.classList.add('bad');el.focus();return formError(f,msg||(el.validity.valueMissing?`กรุณากรอก${name||'ช่องที่จำเป็น'}`:`${name||'ข้อมูล'}ไม่ถูกต้อง`))}
const close=()=>{const m=$('#modal');m.hidden=true;m.innerHTML='';dirty=false;document.body.classList.remove('m-open')};
const closeSoft=()=>{if(!dirty||confirm('ปิดหน้าต่างนี้โดยไม่บันทึกข้อมูลที่กรอกไว้?'))close()};

/* ---------- ชิ้นส่วนฟอร์ม ---------- */
const opt=(arr,sel,val=x=>x,lab=x=>x)=>arr.map(x=>`<option value="${esc(val(x))}"${String(val(x))===String(sel)?' selected':''}>${esc(lab(x))}</option>`).join('');
const req='<i class="req" aria-hidden="true">*</i>';
/* ปุ่มตัวเลือกแบบกดเลือก (radio) */
const chips=(name,items,sel,o={})=>`<div class="pick${o.big?' big':''}" role="radiogroup" aria-label="${esc(o.label||name)}">${items.map(it=>{const[v,l,s]=Array.isArray(it)?it:[it,it];return `<label><input type="radio" name="${name}" value="${esc(v)}"${String(v)===String(sel)?' checked':''}><span><b>${esc(l)}</b>${s?`<small>${esc(s)}</small>`:''}</span></label>`}).join('')}</div>`;
const checks=(name,items,selected)=>`<div class="pick">${items.map(v=>`<label><input type="checkbox" name="${name}" value="${esc(v)}"${selected.includes(v)?' checked':''}><span><b>${esc(v)}</b></span></label>`).join('')}</div>`;
const group=(label,inner,hint='')=>`<div class="grp"><div class="grp-l">${label}${hint?` <span class="h">${hint}</span>`:''}</div>${inner}</div>`;
/* จำนวนเดือน: ปุ่มค่าที่ใช้บ่อย + กำหนดเอง */
const months=(name,val,list,label,hint='')=>group(label,`<div class="months" data-months><div class="pick">${list.map(n=>`<label><input type="radio" name="${name}_q" value="${n}"${+val===n?' checked':''}><span><b>${n}</b></span></label>`).join('')}</div><input type="number" min="${name==='inspectMonths'?1:0}" max="600" name="${name}" value="${esc(val)}" aria-label="${esc(label)} (เดือน)" required><span class="muted small">เดือน</span></div>`,hint);
function bindMonths(f){$$('[data-months]',f).forEach(box=>{const num=$('input[type=number]',box),qs=$$('input[type=radio]',box);
 qs.forEach(r=>r.onchange=()=>{num.value=r.value});num.oninput=()=>qs.forEach(r=>r.checked=r.value===num.value)})}

/* ---------- ชิ้นส่วนหน้า ---------- */
const bars=(rows,max)=>{max=max||Math.max(1,...rows.map(r=>r[1]));return rows.length?`<div class="bars">${rows.map(([l,v])=>`<div class="bar"><span>${esc(l)}</span><i><s style="width:${Math.max(4,v/max*100)}%"></s></i><em>${v}</em></div>`).join('')}</div>`:'<div class="empty">ยังไม่มีข้อมูล</div>'};
const btnAct=(label,act,data={},cls='')=>`<button type="button" class="btn ${cls}" data-act="${act}"${Object.entries(data).map(([k,v])=>` data-${k}="${esc(v)}"`).join('')}>${label}</button>`;
const emptyBox=(title,text='',actions='')=>`<div class="empty rich"><b>${title}</b>${text?`<span>${text}</span>`:''}${actions?`<div class="chips">${actions}</div>`:''}</div>`;
const table=(cols,rows,empty='ไม่มีรายการ')=>rows.length?`<div class="tbl-wrap"><table><thead><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:empty.startsWith('<')?empty:`<div class="empty">${empty}</div>`;

function download(name,text,type='text/plain'){const a=document.createElement('a');const bom=type==='application/json'||type==='text/calendar'?'':'﻿';a.href=URL.createObjectURL(new Blob([bom+text],{type:type+';charset=utf-8'}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
