'use client';

import {useLayoutEffect,useRef} from 'react';

export type Part={type:'text'|'link';value:string};

const URL_PATTERN=/(?:https?:\/\/|www\.)[^\s\u3000]+/gi;

function isCompleteUrl(value:string){
 try{const url=new URL(/^www\./i.test(value)?`https://${value}`:value);return Boolean(url.hostname&&url.hostname.includes('.'));}catch{return false;}
}

function splitText(value:string):Part[]{
 const output:Part[]=[];let cursor=0;
 URL_PATTERN.lastIndex=0;
 for(const match of value.matchAll(URL_PATTERN)){
  const start=match.index??0;const candidate=match[0];
  if(!isCompleteUrl(candidate))continue;
  if(start>cursor)output.push({type:'text',value:value.slice(cursor,start)});
  output.push({type:'link',value:candidate});cursor=start+candidate.length;
 }
 if(cursor<value.length)output.push({type:'text',value:value.slice(cursor)});
 return output.length?output:[{type:'text',value}];
}

function compact(parts:Part[]){
 const output:Part[]=[];
 parts.forEach(part=>{
  if(!part.value)return;
  const previous=output.at(-1);
  if(part.type==='text'&&previous?.type==='text')previous.value+=part.value;
  else output.push({...part});
 });
 return output.length?output:[{type:'text',value:''}];
}

export function promoteParts(parts:Part[]){
 return compact(parts.flatMap(part=>part.type==='text'?splitText(part.value):[part]));
}

export function shortLabel(value:string){
 try{
  const url=new URL(/^www\./i.test(value)?`https://${value}`:value);
  let decoded=value;
  try{decoded=decodeURIComponent(value);}catch{}
  const trailingText=decoded.match(/([\u3400-\u9fff]+)([;；,，。！？、]*)$/);
  if(trailingText)return `${url.host}/...${trailingText[1].slice(-4)}${trailingText[2]}`;
  const path=url.pathname.replace(/\/+$/,'');
  const segments=path.split('/').filter(Boolean);
  if(!segments.length)return url.host;
  const tail=segments.at(-1)??'';
  const suffix=`${tail}${url.search}${url.hash}`;
  if(segments.length===1&&`${url.host}/${suffix}`.length<=38)return `${url.host}/${suffix}`;
  return `${url.host}/...${[...suffix].slice(-14).join('')}`;
 }catch{return value.replace(/^https?:\/\//i,'');}
}

function suspiciousTail(value:string){return /[\u3400-\u9fff，。！？；：、;,!?]$/.test(value);}

function globe(){
 const icon=document.createElement('span');icon.className='inline-url-icon';icon.setAttribute('aria-hidden','true');
 icon.innerHTML='<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21M12 3C9.5 5.5 8.2 8.5 8.2 12s1.3 6.5 3.8 9"/></svg>';
 return icon;
}

function link(value:string,invalid=false){
 const element=document.createElement('span');element.dataset.urlValue=value;element.contentEditable='false';element.tabIndex=0;element.setAttribute('role','button');
 element.className=`url-capsule${invalid?' url-capsule--error':suspiciousTail(value)?' url-capsule--warning':''}`;
 element.title=invalid?'此網址未通過公司網址規範，點擊修改':suspiciousTail(value)?'網址結尾可能包含其他文字，點擊確認':'已辨識為網址，將於送出時檢核；點擊查看或修改';
 element.setAttribute('aria-label',`${element.title}：${value}`);
 const label=document.createElement('span');label.className='inline-url-value';label.textContent=shortLabel(value);
 element.append(globe(),label);return element;
}

function read(root:HTMLElement):Part[]{
 const output:Part[]=[];
 function addText(value:string){if(!value)return;const previous=output.at(-1);if(previous?.type==='text')previous.value+=value;else output.push({type:'text',value});}
 function walk(node:Node){
  if(node.nodeType===Node.TEXT_NODE){addText(node.textContent??'');return;}
  if(!(node instanceof HTMLElement))return;
  if(node.dataset.urlValue!==undefined){output.push({type:'link',value:node.dataset.urlValue});return;}
  if(node.tagName==='BR'){addText('\n');return;}
  if((node.tagName==='DIV'||node.tagName==='P')&&output.length)addText('\n');
  node.childNodes.forEach(walk);
 }
 root.childNodes.forEach(walk);return compact(output);
}

function render(parts:Part[],invalid:Set<string>){return parts.map(part=>part.type==='link'?link(part.value,invalid.has(part.value)):document.createTextNode(part.value));}

function modelOffset(root:HTMLElement){
 const selection=window.getSelection();if(!selection?.rangeCount)return null;const range=selection.getRangeAt(0);if(!root.contains(range.startContainer))return null;
 const before=document.createRange();before.selectNodeContents(root);before.setEnd(range.startContainer,range.startOffset);return before.toString().length;
}

function restoreCaret(root:HTMLElement,wanted:number|null){
 if(wanted===null)return;const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node:Node|null;let offset=0;let last:Node|null=null;
 while((node=walker.nextNode())){if((node.parentElement as HTMLElement|null)?.closest('[data-url-value]'))continue;last=node;const length=node.textContent?.length??0;if(wanted<=offset+length){const range=document.createRange();range.setStart(node,Math.max(0,wanted-offset));range.collapse(true);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);return;}offset+=length;}
 if(last){const range=document.createRange();range.selectNodeContents(last);range.collapse(false);const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);}
}

export default function InlineEditor({parts,invalidUrls=[],onChange,onEditLink}:{parts:Part[];invalidUrls?:string[];onChange:(parts:Part[])=>void;onEditLink:(index:number)=>void}){
 const rootRef=useRef<HTMLDivElement>(null);const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);const composingRef=useRef(false);const invalid=new Set(invalidUrls);

 useLayoutEffect(()=>{
  const root=rootRef.current;if(!root)return;
  if(JSON.stringify(read(root))!==JSON.stringify(compact(parts)))root.replaceChildren(...render(compact(parts),invalid));
  root.querySelectorAll<HTMLElement>('[data-url-value]').forEach(element=>{
   const value=element.dataset.urlValue??'';const updated=link(value,invalid.has(value));element.replaceWith(updated);
  });
 },[parts,invalidUrls.join('\u0000')]);

 function publish(root:HTMLElement){onChange(read(root));}
 function promote(root:HTMLElement){
  if(timerRef.current)clearTimeout(timerRef.current);
  const current=read(root);const promoted=promoteParts(current);
  if(JSON.stringify(current)===JSON.stringify(promoted))return;
  const caret=modelOffset(root);root.replaceChildren(...render(promoted,invalid));restoreCaret(root,caret);onChange(promoted);
 }
 function schedule(root:HTMLElement){
  if(timerRef.current)clearTimeout(timerRef.current);if(composingRef.current)return;
  const hasBoundary=read(root).some(part=>{
   if(part.type!=='text')return false;const tokens=splitText(part.value);
   return tokens.some((item,index)=>item.type==='link'&&tokens.slice(index+1).some(next=>next.type==='text'&&next.value.length>0));
  });
  if(hasBoundary)timerRef.current=setTimeout(()=>promote(root),2000);
 }
 function editFromTarget(target:EventTarget|null){
  const root=rootRef.current;const capsule=target instanceof Element?target.closest<HTMLElement>('[data-url-value]'):null;if(!root||!capsule)return false;
  const ordinal=[...root.querySelectorAll('[data-url-value]')].indexOf(capsule);let seen=-1;const index=read(root).findIndex(part=>part.type==='link'&&++seen===ordinal);if(index>=0)onEditLink(index);return true;
 }

 return <div ref={rootRef} className="inline-editor" contentEditable suppressContentEditableWarning role="textbox" aria-label="簡訊內容" aria-multiline="true"
  onCompositionStart={()=>{composingRef.current=true;if(timerRef.current)clearTimeout(timerRef.current);}}
  onCompositionEnd={event=>{composingRef.current=false;publish(event.currentTarget);schedule(event.currentTarget);}}
  onInput={event=>{publish(event.currentTarget);schedule(event.currentTarget);}}
  onBlur={event=>{if(!composingRef.current)promote(event.currentTarget);}}
  onClick={event=>{if(editFromTarget(event.target))event.preventDefault();}}
  onKeyDown={event=>{if((event.key==='Enter'||event.key===' ')&&editFromTarget(event.target)){event.preventDefault();}}}
  onPaste={event=>{
   event.preventDefault();if(timerRef.current)clearTimeout(timerRef.current);
   const pasted=event.clipboardData.getData('text/plain');const selection=window.getSelection();if(!selection?.rangeCount)return;const range=selection.getRangeAt(0);if(!event.currentTarget.contains(range.commonAncestorContainer))return;
   range.deleteContents();const fragment=document.createDocumentFragment();splitText(pasted).forEach(part=>fragment.append(part.type==='link'?link(part.value,invalid.has(part.value)):document.createTextNode(part.value)));const marker=document.createTextNode('');fragment.append(marker);range.insertNode(fragment);range.setStartAfter(marker);range.collapse(true);selection.removeAllRanges();selection.addRange(range);publish(event.currentTarget);
  }} />;
}
