/* Presentation-only enhancements. No changes to exam state, keys, audio or Supabase. */
(()=>{
'use strict';
function ready(){
 const landing=document.getElementById('landing');
 if(landing){
  const h=landing.querySelector('h1');
  if(h)h.textContent='A better way to assess English.';
  const sub=landing.querySelector('.sub');
  if(sub)sub.textContent='A clear, interactive assessment experience for teachers and students.';
  const choices=[...landing.querySelectorAll('.choice')];
  choices.forEach((choice,i)=>{
   const symbol=choice.querySelector('.symbol');if(symbol)symbol.setAttribute('aria-hidden','true');
   const title=choice.querySelector('h2');
   if(title)title.textContent=i===0?'Teacher workspace':'Student assessment';
   const desc=choice.querySelector('p');
   if(desc)desc.textContent=i===0?'Review the assessment experience and explore shared results in one place.':'Choose your level, complete the assessment, and review your score.';
   // Replace the visual call-to-action wording without replacing clickable card.
   const nodes=[...choice.querySelectorAll('*')].filter(el=>el.children.length===0&&el.textContent.trim().startsWith('Enter'));
   nodes.forEach(el=>{el.textContent='Explore  →';el.classList.add('enter')});
   choice.setAttribute('role','button');
   choice.setAttribute('tabindex','0');
   choice.addEventListener('keydown',ev=>{if(ev.key==='Enter'||ev.key===' '){ev.preventDefault();choice.click()}});
  });
  const footer=landing.querySelector('.footer');
  if(footer)footer.textContent='Interactive demonstration · Demo responses are stored in Supabase';
 }
 // Replace emoji-only decorations in visible controls without removing functional text.
 const replacements=[
  ['🎧',''],['📖',''],['✏️',''],['📄',''],['👁',''],['🔗',''],['📊',''],['⬇',''],
  ['🎓',''],['👩‍🏫',''],['👨‍🏫',''],['✅',''],['✓','✓']
 ];
 const roots=['teacherPortal','studentPortal'];
 function cleanDecorations(root){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node;while((node=walker.nextNode())){
   if(!node.parentElement||['SCRIPT','STYLE','TEXTAREA','OPTION'].includes(node.parentElement.tagName))continue;
   let val=node.nodeValue;for(const [a,b] of replacements)val=val.split(a).join(b);
   if(val!==node.nodeValue)node.nodeValue=val;
  }
 }
 roots.forEach(id=>{
  const root=document.getElementById(id);if(!root)return;
  cleanDecorations(root);
  const observer=new MutationObserver(mutations=>{
   if(mutations.some(m=>m.type==='childList'))cleanDecorations(root);
  });
  observer.observe(root,{childList:true,subtree:true});
 });
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
})();
