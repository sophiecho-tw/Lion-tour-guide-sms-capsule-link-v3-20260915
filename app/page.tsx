'use client';
import {useRef,useState} from 'react';
import InlineEditor,{promoteParts,shortLabel,type Part} from './InlineEditor';
type ValidationError={text:string;url?:string};
const START='雄獅貴賓您好，我是本次行程領隊李小明，提醒您明天 07:00 於桃園機場第一航廈集合。\n請加入本次行程群組，謝謝。';
const LINE_EXAMPLE='https://line.me/R/ti/g/demo2026';
const COMPANY_SHORT_EXAMPLE='https://lion.tours/5fKa1PKa';
const EVENT_EXAMPLE='https://event.liontravel.com/zh-tw/season/autumntravel/taiwan';
const REGISTERED_NAMES=['日華','雄獅','旅天下'];
const people=[['王大明','0912-345-678'],['陳美玲','0928-661-205'],['林志偉','0988-013-720'],['張雅婷','0936-500-189']];

function isLineInvite(value:string){return /^https:\/\/line\.me\/(?:R\/)?ti\/g\/[A-Za-z0-9_-]+$/i.test(value.trim());}
function isApprovedUrl(value:string){
 try{const url=new URL(value.trim());const host=url.hostname.toLowerCase();if(url.protocol!=='https:')return false;if(isLineInvite(value))return true;if(host==='lion.tours')return url.pathname.length>1;return host==='liontravel.com'||host.endsWith('.liontravel.com');}catch{return false;}
}
function isCompleteUrl(value:string){try{const url=new URL(value.trim());return Boolean(url.hostname&&url.hostname.includes('.'));}catch{return false;}}
function hasRegisteredName(value:string){return REGISTERED_NAMES.some(name=>value.includes(name));}
function hasSuspiciousTail(value:string){return /[\u3400-\u9fff，。！？；：、;,!?]$/.test(value);}
function hasUnconvertedUrl(value:string){return /(?:https?:\/\/|www\.)[^\s\u3000]+/i.test(value);}
function rawContent(parts:Part[]){return parts.map(part=>part.value).join('');}
function visibleLength(value:string){return Array.from(value).length;}
function sendContent(parts:Part[]){return parts.reduce((output,part,index)=>{
 if(part.type==='text')return output+part.value;
 const raw=part.value.trim();const value=isLineInvite(raw)?COMPANY_SHORT_EXAMPLE:raw;
 const before=output&&!/[\s\u3000]$/.test(output)?' ':'';const next=parts[index+1]?.value??'';const after=next&&!/^[\s\u3000]/.test(next)?' ':'';
 return output+before+value+after;
},'');}

export default function Home(){
 const [parts,setParts]=useState<Part[]>([{type:'text',value:START}]);
 const [checked,setChecked]=useState([true,true,true,true]);
 const [errors,setErrors]=useState<ValidationError[]>([]);
 const [changed,setChanged]=useState(false);
 const [attempted,setAttempted]=useState(false);
 const [invalidUrls,setInvalidUrls]=useState<string[]>([]);
 const [draft,setDraft]=useState('');
 const [urlError,setUrlError]=useState('');
 const [editing,setEditing]=useState<number|null>(null);
 const [receipt,setReceipt]=useState<{count:number;time:string}|null>(null);
 const [listNotice,setListNotice]=useState(false);
 const [sendDate,setSendDate]=useState('');
 const [sendTime,setSendTime]=useState('08:00');
 const [leaderPhone,setLeaderPhone]=useState('');
 const [leaderAdded,setLeaderAdded]=useState(false);
 const [leaderSelected,setLeaderSelected]=useState(true);
 const [leaderPhoneError,setLeaderPhoneError]=useState('');
 const editorDialog=useRef<HTMLDialogElement>(null);const reviewDialog=useRef<HTMLDialogElement>(null);
 const count=checked.filter(Boolean).length+(leaderAdded&&leaderSelected?1:0);
 const typedContent=rawContent(parts);const inputCount=visibleLength(typedContent);const content=sendContent(parts);
 const messageHasError=attempted&&(invalidUrls.length>0||!hasRegisteredName(typedContent)||inputCount>300||parts.some(part=>part.type==='text'&&hasUnconvertedUrl(part.value)));

 function updateParts(next:Part[]){setParts(next);setChanged(true);setErrors([]);setAttempted(false);setInvalidUrls(current=>current.filter(url=>next.some(part=>part.type==='link'&&part.value===url)));}
 function openLink(index:number){setEditing(index);setDraft(parts[index]?.value??'');setUrlError('');editorDialog.current?.showModal();}
 function openErrorUrl(url:string){const index=parts.findIndex(part=>part.type==='link'&&part.value===url);if(index>=0)openLink(index);}
 function addLeader(){
  const digits=leaderPhone.replace(/\D/g,'');
  if(!/^09\d{8}$/.test(digits)){setLeaderPhoneError('請輸入正確的手機號碼，例如 0912-345-678');return;}
  setLeaderPhone(`${digits.slice(0,4)}-${digits.slice(4,7)}-${digits.slice(7)}`);setLeaderAdded(true);setLeaderSelected(true);setLeaderPhoneError('');
 }
 function saveLink(){
  const value=draft.trim();if(/\s/.test(value)){setUrlError('網址中不可包含空格或換行，請確認網址是否完整。');return;}
  if(!isCompleteUrl(value)){setUrlError('請輸入完整網址（以 https:// 開頭），勿加入其他文字。');return;}
  if(editing===null)return;const previous=parts[editing]?.value;setParts(parts.map((part,index)=>index===editing?{type:'link',value}:part));setInvalidUrls(current=>current.filter(url=>url!==previous));setErrors([]);setAttempted(false);setChanged(true);editorDialog.current?.close();
 }
 function removeLink(){
  if(editing===null)return;const output:Part[]=[];
  parts.forEach((part,index)=>{if(index===editing)return;const previous=output.at(-1);if(part.type==='text'&&previous?.type==='text')previous.value+=part.value;else output.push({...part});});
  const removed=parts[editing]?.value;setParts(output.length?output:[{type:'text',value:''}]);setInvalidUrls(current=>current.filter(url=>url!==removed));setErrors([]);setAttempted(false);setChanged(true);editorDialog.current?.close();
 }
 function send(){
  const reviewedParts=promoteParts(parts);const reviewedTypedContent=rawContent(reviewedParts);setParts(reviewedParts);setAttempted(true);const nextErrors:ValidationError[]=[];
  const links=reviewedParts.filter((part):part is Extract<Part,{type:'link'}>=>part.type==='link');
  const rejected=links.filter(part=>!isApprovedUrl(part.value)).map(part=>part.value);
  const suspicious=links.filter(part=>hasSuspiciousTail(part.value)).map(part=>part.value);
  if(reviewedParts.some(part=>part.type==='text'&&hasUnconvertedUrl(part.value)))nextErrors.push({text:'訊息中有尚未完整辨識的網址，請確認網址格式後重新送出'});
  rejected.forEach(url=>nextErrors.push({text:`網址「${shortLabel(url)}」未通過公司網址規範，請移除或更換後重新送出`,url}));
  suspicious.forEach(url=>nextErrors.push({text:`網址「${shortLabel(url)}」結尾可能包含其他文字，請點擊網址膠囊確認`,url}));
  if(!hasRegisteredName(reviewedTypedContent))nextErrors.push({text:'訊息內容需包含「日華」、「雄獅」或「旅天下」'});
  if(visibleLength(reviewedTypedContent)>300)nextErrors.push({text:'簡訊內容超過 300 字，請縮短內容'});
  if(!count)nextErrors.push({text:'請至少選擇一位旅客'});
  setInvalidUrls([...new Set([...rejected,...suspicious])]);setErrors([...new Map(nextErrors.map(error=>[`${error.url??''}\u0000${error.text}`,error])).values()]);setChanged(false);
  if(nextErrors.length){reviewDialog.current?.showModal();return;}
  setReceipt({count,time:new Date().toLocaleString('zh-TW')});window.scrollTo(0,0);
 }
 function reset(){setReceipt(null);setListNotice(false);setParts([{type:'text',value:START}]);setErrors([]);setInvalidUrls([]);setAttempted(false);setChecked([true,true,true,true]);setChanged(false);setSendDate('');setSendTime('08:00');setLeaderPhone('');setLeaderAdded(false);setLeaderSelected(true);setLeaderPhoneError('');}

 if(receipt)return <main><div className="shell completion-shell"><div className="prototype-label">版本三 · 自由輸入與網址膠囊<span>Prototype 示範，不會寄出真實簡訊</span></div><section className="card completion-card application-card"><div className="completion-header result-header"><span className="result-icon">✓</span><h1>已申請送出</h1><p>簡訊發送申請已建立，實際發送狀態請至發送清單查看</p><span className="completion-time">申請時間：{receipt.time}　·　發送人數：{receipt.count} 人</span></div><div className="completion-actions application-actions"><button className="send-button" onClick={()=>setListNotice(true)}>檢視發送清單</button><button className="back-button" onClick={reset}>再發一封</button></div>{listNotice&&<p className="list-link-note" role="status">此 Prototype 將連結至既有的發送清單頁面。</p>}</section></div></main>;

 return <main><div className="shell"><div className="prototype-label">版本三 · 自由輸入與網址膠囊<span>Prototype 示範，不會寄出真實簡訊</span></div>
 <section className="card"><div className="section-title"><h2>Step–1：設定發送時間</h2></div><label className="field-label" htmlFor="send-date">發送時間</label><div className="schedule-fields"><input id="send-date" type="date" aria-label="選擇發送日期" value={sendDate} onChange={event=>setSendDate(event.target.value)}/><select aria-label="選擇發送時間" value={sendTime} onChange={event=>setSendTime(event.target.value)}>{['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00'].map(time=><option key={time}>{time}</option>)}</select></div><p className="schedule-note"><span aria-hidden="true">ⓘ</span> 若日期時間未選，按下發送後簡訊立即送出</p></section>
 <section className="card" id="compose"><div className="section-title"><div><h2>Step–2：選擇範本與輸入簡訊內容</h2></div></div><label className="field-label" htmlFor="template">簡訊範本</label><select id="template" className="template-select" onChange={event=>{setParts([{type:'text',value:event.target.value==='meeting'?START:'旅天下貴賓您好，提醒您攜帶護照並準時抵達集合地點。'}]);setErrors([]);setInvalidUrls([]);setChanged(true);}}><option value="meeting">系統預設｜集合通知</option><option value="reminder">系統預設｜行前提醒</option></select><label className="field-label message-label">簡訊內容</label>
 {messageHasError&&<style>{`.inline-editor{border-color:#d71920!important;box-shadow:0 0 0 1px #d71920}.inline-editor:focus{border-color:#d71920!important;box-shadow:0 0 0 2px #ffd9da}`}</style>}
 <InlineEditor parts={parts} invalidUrls={invalidUrls} onChange={updateParts} onEditLink={openLink}/>
 <div className={`editor-count${inputCount>300?' over':''}`} aria-live="polite"><strong>{inputCount} / 300 字</strong></div>
 {errors.length>0&&<div className="persistent-errors" role="status"><ul>{errors.map(error=><li key={`${error.url??''}-${error.text}`}>{error.url?<button className="error-link-button" onClick={()=>openErrorUrl(error.url!)}><span>{error.text}</span><small>點擊修改網址</small></button>:error.text}</li>)}</ul></div>}
 </section>
 <section className="card"><div className="section-title"><h2>Step–3：確認發送名單</h2><span className="recipient-count">已選 {count} 人</span></div><div className={`leader-phone-panel${leaderPhoneError?' leader-phone-panel--error':''}`}><div className="leader-phone-field"><label htmlFor="leader-phone">領隊手機　李小明</label><input id="leader-phone" type="tel" inputMode="numeric" placeholder="請輸入手機號碼" value={leaderPhone} disabled={leaderAdded} onChange={event=>{setLeaderPhone(event.target.value);setLeaderPhoneError('');}} aria-describedby={leaderPhoneError?'leader-phone-error':undefined}/>{leaderPhoneError&&<p id="leader-phone-error" role="alert">{leaderPhoneError}</p>}</div>{leaderAdded?<button className="remove-leader-button" onClick={()=>{setLeaderAdded(false);setLeaderSelected(true);}}>移除</button>:<button className="outline-button add-leader-button" onClick={addLeader}>加入發送名單</button>}</div><div className="table-wrap"><table><thead><tr><th><input type="checkbox" aria-label="全選旅客" checked={checked.every(Boolean)&&(!leaderAdded||leaderSelected)} onChange={event=>{setChecked(checked.map(()=>event.target.checked));if(leaderAdded)setLeaderSelected(event.target.checked);}}/></th><th>旅客姓名</th><th>手機號碼</th></tr></thead><tbody>{leaderAdded&&<tr className="leader-row"><td><input type="checkbox" aria-label="選擇領隊李小明" checked={leaderSelected} onChange={()=>setLeaderSelected(!leaderSelected)}/></td><td>李小明 <span className="leader-tag">領隊</span></td><td>{leaderPhone}</td></tr>}{people.map((person,index)=><tr key={person[1]}><td><input type="checkbox" aria-label={`選擇 ${person[0]}`} checked={checked[index]} onChange={()=>setChecked(checked.map((selected,i)=>i===index?!selected:selected))}/></td><td>{person[0]}</td><td>{person[1]}</td></tr>)}</tbody></table></div></section>
 <section className="card preview-card"><div className="section-title"><div><h2>Step–4：發送內容預覽</h2></div></div><div className="preview-box"><p>{content||'填寫後在這裡預覽簡訊內容'}</p></div></section>
 <div className="bottom-bar"><button className="send-button" onClick={send}>送出</button></div>
 <details className="prototype-config"><summary>試用情境</summary><p>貼上網址會立即成為膠囊。手動輸入網址後，輸入空格或換行並停止 2 秒，或點擊輸入框外，即會成為膠囊。</p><button className="text-button" onClick={()=>{setParts([{type:'text',value:'雄獅貴賓您好，活動資訊 '},{type:'link',value:EVENT_EXAMPLE},{type:'text',value:'，請加入 '},{type:'link',value:LINE_EXAMPLE},{type:'text',value:' 謝謝。'}]);setInvalidUrls([]);setChanged(true);}}>載入多網址膠囊</button><button className="text-button" onClick={()=>{setParts([{type:'text',value:'日華貴賓您好，請參考 https://event.liontravel.com/zh-tw/season/autumntravel/taiwan'}]);setInvalidUrls([]);setChanged(true);}}>載入手動輸入示範</button></details>
 <dialog ref={editorDialog} className="review-dialog link-editor-dialog" aria-labelledby="link-editor-title"><button className="dialog-close" aria-label="關閉編輯網址視窗" onClick={()=>editorDialog.current?.close()}>×</button><h2 id="link-editor-title">編輯網址</h2><textarea id="edit-url" aria-label="完整網址" autoFocus className="url-input" rows={4} value={draft} onChange={event=>{setDraft(event.target.value);setUrlError('');}} placeholder={LINE_EXAMPLE}/>{urlError&&<p className="inline-error" role="alert">{urlError}</p>}<div className="link-editor-footer"><button className="delete-text-button" onClick={removeLink}>刪除網址</button><button className="send-button" onClick={saveLink}>儲存</button></div></dialog>
 <dialog ref={reviewDialog} className="review-dialog error-dialog" aria-labelledby="error-title"><div className="review-icon" aria-hidden="true"><svg viewBox="0 0 96 84" fill="none"><path d="M41.1 9.9a8 8 0 0 1 13.8 0l33.4 57.8a8 8 0 0 1-6.9 12H14.6a8 8 0 0 1-6.9-12L41.1 9.9Z" stroke="currentColor" strokeWidth="8" strokeLinejoin="round"/><path d="M48 30v22" stroke="currentColor" strokeWidth="8" strokeLinecap="round"/><circle cx="48" cy="65" r="4.5" fill="currentColor"/></svg></div><h2 id="error-title">簡訊尚未送出</h2><p>請修正以下 {errors.length} 項問題後再重新送出</p><ul>{errors.map(error=><li key={`${error.url??''}-${error.text}`}>{error.text}</li>)}</ul><div className="dialog-footer"><button className="send-button" autoFocus onClick={()=>{reviewDialog.current?.close();document.getElementById('compose')?.scrollIntoView({behavior:'smooth'});}}>返回修改</button></div></dialog>
 </div></main>;
}
