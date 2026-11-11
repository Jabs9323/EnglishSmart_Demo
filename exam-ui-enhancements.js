/* EnglishSmart exercise display enhancements. */
(()=>{
const css=document.createElement('style');
css.textContent='.es-bank{padding:18px;background:#f7faff;border:1px solid #cbd9ee;border-radius:16px;margin:16px 0}.es-bank-items,.es-options{display:flex;flex-wrap:wrap;gap:9px;margin-top:10px}.es-word{padding:8px 14px;background:white;border:1px solid #ccd6e2;border-radius:9px;font-weight:700}.es-option{padding:12px 18px;border:2px solid #d6deea;border-radius:12px;background:white;color:#25334a;font-weight:700;cursor:pointer}.es-option[aria-pressed="true"]{border-color:var(--accent);background:var(--light);box-shadow:0 0 0 2px var(--accent)}.es-option:focus-visible{outline:3px solid var(--accent);outline-offset:2px}.question{background:white;border:1px solid #e5eaf0;border-radius:14px;margin:12px 0;padding:18px}';
document.head.appendChild(css);
const oldPartHeader=window.partHeader;
window.partHeader=function(l,p){
 const raw=oldPartHeader(l,p),meta=partMetadata[l]?.[p];
 if(!meta)return raw;
 const m=meta[0].match(/(?:words|verbs) in the box:\s*(.+?)(?:\.$|$)/i);
 if(!m)return raw;
 const words=m[1].replace(/\.$/,'').split(/,\s*/);
 const title=meta[0].slice(0,m.index).trim().replace(/[.:]$/,'')+'.';
 return raw.replace(escapeHtml(meta[0]),escapeHtml(title))+'<div class="es-bank"><b>WORD BANK</b><div class="es-bank-items">'+words.map(w=>'<span class="es-word">'+escapeHtml(w)+'</span>').join('')+'</div></div>';
};
const oldAnswer=window.renderAnswer;
window.renderAnswer=function(q){
 let vals=null,kind='';
 if(q.type!=='text'&&Array.isArray(q.options)){vals=q.options;kind='choice'}
 else if(q.type==='text'){const m=q.q.match(/\(([^()]+\s*\/\s*[^()]+)\)/);if(m){vals=m[1].split(/\s*\/\s*/).map(x=>x.trim());kind='word'}}
 if(!vals)return oldAnswer(q);
 return '<div class="es-options" role="group" aria-label="Select answer">'+vals.map((v,j)=>'<button type="button" class="es-option" aria-pressed="'+(studentAnswers[q.i]===(kind==='choice'?j:v))+'" onclick="esSelectOption('+q.i+','+j+',\''+kind+'\')">'+escapeHtml(v)+'</button>').join('')+'</div>';
};
window.esSelectOption=function(i,j,kind){
 if(kind==='choice')answerStudent(i,j);
 else {const m=examQuestions()[i].q.match(/\(([^()]+\s*\/\s*[^()]+)\)/);answerStudentText(i,m[1].split(/\s*\/\s*/)[j].trim());}
 renderStudentSection();
};
})();
