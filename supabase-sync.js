/* EnglishSmart demo shared synchronization. Uses published Supabase RPC, not localStorage for results.
   IMPORTANT: anonymous demo only; results are NOT tamper-proof and teacher lists are public. */
(() => {
 'use strict';
 const cfg=window.ENGLISHSMART_SUPABASE;
 if(!cfg){console.error('Missing supabase-config.js');return;}
 const root=cfg.url.replace(/\/$/,'');
 async function rpc(name,payload){
   const res=await fetch(root+'/rest/v1/rpc/'+name,{
     method:'POST',headers:{'apikey':cfg.publishableKey,'Authorization':'Bearer '+cfg.publishableKey,'Content-Type':'application/json'},
     body:JSON.stringify(payload)
   });
   if(!res.ok){let detail=await res.text();throw Error(detail.slice(0,350));}
   const txt=await res.text();return txt?JSON.parse(txt):null;
 }
 function sessionFromDb(x){return {code:x.code,level:x.level,group:x.group_name,exam:x.exam_name,date:x.exam_date,students:x.students,created:x.created_at};}
 const sharedGrades=new Map();
 const nameKey=s=>String(s).trim().toLocaleLowerCase('es');
 const oldOpenPortal=window.openPortal;
 window.getResults=function(code){return sharedGrades.get(code)||[]};
 window.saveResult=function(){throw Error('Use remote submission, not local storage');};
 window.mockResults=function(){toast('Sample grades are disabled in the shared demo. Submit an exam from Student Exam.');};
 window.clearHistory=function(){toast('Shared records are not deleted from the browser. Manage them in Supabase.');};
 window.shareUrl=function(code){return location.origin+location.pathname+'#exam='+encodeURIComponent(code)};
 window.acceptInvitation=async function(){
   const params=new URLSearchParams(location.hash.slice(1));
   const code=params.get('exam');
   if(!code)return;
   try {
     const data=await rpc('es_demo_get_session',{p_code:code});
     if(!data?.length)throw Error('Invalid code');
     const obj=sessionFromDb(data[0]);
     sessions=[obj,...sessions.filter(s=>s.code!==obj.code)];
     oldOpenPortal('student');$('studentCode').value=code;
     toast('Exam loaded. Enter your name.');
   }catch(e){console.error(e);toast('Unable to load invitation');}
 };
 window.createSession=async function(){
   let group=$('group').value.trim(),date=$('date').value;
   if(!group||!date||!students.length){toast('Enter group, date and students');return;}
   const code='ES-'+({basico:'BAS',intermedio:'INT',avanzado:'AVA'}[level])+'-'+Math.random().toString(36).slice(2,10).toUpperCase();
   const s={code,level,group,date,exam:$('exam').value,students:[...students],created:new Date().toISOString()};
   try {
     await rpc('es_demo_create_session',{p_code:code,p_level:level,p_group:group,p_exam:s.exam,p_date:date,p_students:s.students});
     sessions.unshift(s);
     let el=$('result');el.classList.remove('hidden');
     el.innerHTML='<div class="success"><b>✓ Shared exam created in Supabase</b><p class="code">'+code+'</p><div class="actions"><button class="btn secondary" onclick="copyCode(\''+code+'\')">Copy code</button><button class="btn secondary" onclick="copyStudentLink(\''+code+'\')">Copy student link</button><button class="btn primary" onclick="testAsStudent(\''+code+'\')">Test student access</button></div><p class="help" id="linkPreview">Students can use this link from other devices.</p></div>';
     toast('Saved in Supabase');
   }catch(e){console.error(e);toast('Supabase error: could not save session');}
 };
 window.studentEnter=async function(){
   const name=$('studentName').value.trim(),code=$('studentCode').value.trim().toUpperCase();
   if(!name||!code){toast('Enter your name and exam code');return;}
   try{
     let items=await rpc('es_demo_get_session',{p_code:code});
     if(!items?.length){toast('Exam code not found');return;}
     let s=sessionFromDb(items[0]);
     if(!s.students.some(x=>nameKey(x)===nameKey(name))){toast('This name is not enrolled');return;}
     const rows=await rpc('es_demo_get_results',{p_code:code});
     if(rows?.some(r=>nameKey(r.student_name)===nameKey(name))){toast('This exam has already been submitted');return;}
     sessions=[s,...sessions.filter(x=>x.code!==code)];
     activeStudent=name;studentSession=s;chooseLevel(s.level);
     $('studentLogin').classList.add('hidden');$('studentIntro').classList.remove('hidden');
     $('welcomeName').textContent='Welcome, '+name;$('introLevel').textContent=levels[s.level].name;
     $('introExam').textContent=s.exam;$('introGroup').textContent=s.group;
   }catch(e){console.error(e);toast('Unable to connect to Supabase');}
 };
 window.startStudentExam=async function(){
   try {
     const rows=await rpc('es_demo_get_results',{p_code:studentSession.code});
     if(rows?.some(r=>nameKey(r.student_name)===nameKey(activeStudent))){toast('Already submitted');return;}
     studentAnswers={};activeSection=0;listeningStarted=false;
     $('studentIntro').classList.add('hidden');$('studentResults').classList.add('hidden');$('studentExam').classList.remove('hidden');
     $('studentExamName').textContent=activeStudent+' · '+studentSession.group;
     $('studentExamTag').textContent=levels[studentSession.level].name+' · '+studentSession.exam;
     renderStudentSection();
   }catch(e){console.error(e);toast('Connection error');}
 };
 const originalFinish=window.finishStudent;
 window.finishStudent=async function(){
   const qs=currentQuestions();
   if(Object.keys(studentAnswers).length<qs.length&&!confirm('Some questions are unanswered. Submit anyway?'))return;
   const total=qs.reduce((n,q,i)=>n+(isCorrect(q,studentAnswers[i])?1:0),0);
   const score=Math.round(total/qs.length*100);
   const sections={};
   ['Listening','Reading','Grammar'].forEach(sec=>sections[sec]=qs.reduce((n,q,i)=>n+(q.section===sec&&isCorrect(q,studentAnswers[i])?1:0),0));
   try{
     await rpc('es_demo_submit_result',{p_code:studentSession.code,p_student:activeStudent,p_score:score,p_sections:sections,p_answers:studentAnswers});
     // Draw original result screen, but bypass the original local result save.
     const originalCode=studentSession.code;
     studentSession.code='ENG-108'; // original code path skips local result storage
     try{originalFinish();}finally{studentSession.code=originalCode;}
     toast('Result saved in Supabase');
   }catch(e){console.error(e);toast('Submission not saved. Check connection or duplicate attempt.');}
 };
 async function refreshHistory(){
   try{
     const list=await rpc('es_demo_list_sessions',{});
     sessions=(list||[]).map(sessionFromDb);
     for(const s of sessions){
       const rows=await rpc('es_demo_get_results',{p_code:s.code});
       sharedGrades.set(s.code,(rows||[]).map(r=>({name:r.student_name,score:r.score,sections:r.sections,date:new Date(r.submitted_at).toLocaleString('es-MX'),demo:false})));
     }
     renderHistory();
   }catch(e){console.error(e);toast('Could not load shared grades');}
 }
 window.showTab=function(v){
   $('new').classList.toggle('hidden',v!=='new');$('history').classList.toggle('hidden',v!=='history');
   $('tnew').classList.toggle('active',v==='new');$('thistory').classList.toggle('active',v==='history');
   if(v==='history')refreshHistory();
 };
 window.showResults=function(code){return (async()=>{try{
   const rows=await rpc('es_demo_get_results',{p_code:code});
   sharedGrades.set(code,(rows||[]).map(r=>({name:r.student_name,score:r.score,sections:r.sections,date:new Date(r.submitted_at).toLocaleString('es-MX'),demo:false})));
   const el=$('results_'+code);el.classList.remove('hidden');
   const data=allStudentRows(code);
   el.innerHTML='<div class="tablewrap"><table><thead><tr><th>Student</th><th>Status</th><th>Grade</th><th>Date</th></tr></thead><tbody>'+data.map(r=>'<tr><td>'+escapeHtml(r.name)+'</td><td>'+(r.score===undefined?'Pending':'Submitted')+'</td><td>'+(r.score===undefined?'—':r.score+'/100')+'</td><td>'+escapeHtml(r.date||'—')+'</td></tr>').join('')+'</tbody></table></div>';
 }catch(e){console.error(e);toast('Grades unavailable');}})();};
 window.exportResults=async function(code){
   try{
     const rows=await rpc('es_demo_get_results',{p_code:code});
     sharedGrades.set(code,(rows||[]).map(r=>({name:r.student_name,score:r.score,sections:r.sections,date:new Date(r.submitted_at).toLocaleString('es-MX'),demo:false})));
     const s=sessions.find(x=>x.code===code);if(!s)return;
     const cols=['Group','Level','Exam','Code','Student','Status','Grade','Submission Date'];
     const csv=[cols,...allStudentRows(code).map(r=>[s.group,levels[s.level].name,s.exam,code,r.name,r.score===undefined?'Pending':'Submitted',r.score??'',r.date||''])]
       .map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
     download(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),'EnglishSmart_Calificaciones_'+code+'.csv');
   }catch(e){console.error(e);toast('Export unavailable');}
 };
 document.addEventListener('DOMContentLoaded',()=>{if(location.hash.startsWith('#exam='))window.acceptInvitation();});
})();
