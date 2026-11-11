/* EnglishSmart open-flow demo: no sessions or accounts. Fictitious names only. */
(() => {
  'use strict';
  const cfg=window.ENGLISHSMART_SUPABASE;
  if (!cfg) { console.error('Supabase config missing'); return; }
  async function rpc(name, data) {
    const r=await fetch(cfg.url.replace(/\/$/,'')+'/rest/v1/rpc/'+name,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':cfg.publishableKey,'Authorization':'Bearer '+cfg.publishableKey},
      body:JSON.stringify(data)
    });
    const txt=await r.text();
    if(!r.ok)throw Error(txt.slice(0,350));
    return txt?JSON.parse(txt):null;
  }
  function examLabel(v) { return (examCatalog[v]||examCatalog.basico)[0].id; }
  function init() {
    const codeRow=$('studentCode')?.closest('label');
    if(codeRow)codeRow.classList.add('hidden');
    const studentHelp=$('studentLogin')?.querySelector('.notice');
    if(studentHelp)studentHelp.textContent='Open demo: enter a fictitious name, no code or registration is required. Results are shared across devices.';
    // Leave all exam question/audio content untouched.
    const teacherNew=$('new'), teacherHistory=$('history');
    if(teacherNew)teacherNew.innerHTML='<div class="panel"><h2>Open demo</h2><p>No group, session or access code required. Select Student Exam from the main screen to try a level.</p><button class="btn primary" onclick="openPortal(\'student\')">Open Student Exam →</button></div>';
    // Display teacher dashboard as shared grade view.
    window.showTab=function(v){
      if(teacherNew)teacherNew.classList.toggle('hidden',v!=='new');
      if(teacherHistory)teacherHistory.classList.toggle('hidden',v!=='history');
      $('tnew')?.classList.toggle('active',v==='new');
      $('thistory')?.classList.toggle('active',v==='history');
      if(v==='history')loadGrades();
    };
    window.studentEnter=function(){
      const name=$('studentName').value.trim();
      if(!name){toast('Enter your name');return;}
      if(name.length>100){toast('Name is too long');return;}
      activeStudent=name;
      studentSession={level,exam:examLabel(level),group:'Open Demo',code:'ENG-108'};
      $('studentLogin').classList.add('hidden');
      $('studentIntro').classList.remove('hidden');
      $('welcomeName').textContent='Welcome, '+name;
      $('introLevel').textContent=levels[level].name;
      $('introExam').textContent=studentSession.exam;
      $('introGroup').textContent='Open Demo';
    };
    window.startStudentExam=function(){
      studentAnswers={};activeSection=0;listeningStarted=false;
      $('studentIntro').classList.add('hidden');
      $('studentResults').classList.add('hidden');
      $('studentExam').classList.remove('hidden');
      $('studentExamName').textContent=activeStudent+' · Open Demo';
      $('studentExamTag').textContent=levels[level].name+' · '+studentSession.exam;
      renderStudentSection();
    };
    const oldFinish=window.finishStudent;
    window.finishStudent=async function(){
      const questions=currentQuestions();
      if(Object.keys(studentAnswers).length<questions.length &&
         !confirm('Some questions are unanswered. Submit anyway?'))return;
      const score=Math.round(questions.reduce((sum,q,i)=>sum+(isCorrect(q,studentAnswers[i])?1:0),0)/questions.length*100);
      const sec={};
      ['Listening','Reading','Grammar'].forEach(k=>sec[k]=questions.reduce((n,q,i)=>n+(q.section===k&&isCorrect(q,studentAnswers[i])?1:0),0));
      try{
        await rpc('es_open_demo_submit',{p_name:activeStudent,p_level:studentSession.level,p_exam:studentSession.exam,
          p_score:score,p_sections:sec,p_answers:studentAnswers});
        oldFinish(); // ENG-108 path skips original local score persistence
        toast('Result saved in Supabase');
      }catch(err){console.error(err);toast('Could not save to Supabase. Please retry.');}
    };
    async function loadGrades(){
      try{
        const data=await rpc('es_open_demo_grades',{});
        if(!teacherHistory)return;
        const trs=(data||[]).map(r=>'<tr><td>'+escapeHtml(r.student_name)+'</td><td>'+
          escapeHtml(levels[r.level]?.name||r.level)+'</td><td>'+Number(r.score)+'/100</td><td>'+
          escapeHtml(new Date(r.submitted_at).toLocaleString('es-MX'))+'</td></tr>').join('');
        $('historyList').innerHTML='<div class="panel"><h2>Shared demo results</h2><p class="help">Stored in Supabase, shared across devices. Fictitious data only.</p><div class="tablewrap"><table><thead><tr><th>Student</th><th>Level</th><th>Score</th><th>Submitted</th></tr></thead><tbody>'+trs+'</tbody></table></div>'+(data?.length?'':'<p>No submissions yet.</p>')+'</div>';
      }catch(err){console.error(err);toast('Could not load shared results. Run the open demo SQL.');}
    }
    window.renderHistory=loadGrades;
    window.clearHistory=()=>toast('Shared results are managed from Supabase.');
    window.createSession=()=>toast('Sessions are disabled in Open Demo.');
    window.acceptInvitation=()=>{};
    window.mockResults=()=>toast('Use Student Exam to submit a demo result.');
    // Make the selected level available on Student Exam without a teacher session.
    const levelChooser=document.createElement('div');
    levelChooser.className='panel';
    levelChooser.innerHTML='<h2>Exam level</h2><div class="actions">'+
      ['basico','intermedio','avanzado'].map(v=>'<button class="btn outline" data-demo-level="'+v+'">'+levels[v].name+'</button>').join('')+'</div>';
    const login=$('studentLogin');
    if(login){login.prepend(levelChooser);
      levelChooser.addEventListener('click',e=>{let b=e.target.closest('[data-demo-level]');if(b){chooseLevel(b.dataset.demoLevel);toast('Selected '+levels[level].name);}});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
