-- EnglishSmart anonymous multi-device DEMO (not for official grading).
-- Run once in Supabase SQL Editor. Existing es_* tables remain unchanged.
create extension if not exists pgcrypto;
create table if not exists public.es_demo_sessions_shared (
 code text primary key check(code ~ '^ES-(BAS|INT|AVA)-[A-Z0-9]{5,10}$'),
 level text not null check(level in ('basico','intermedio','avanzado')),
 group_name text not null check(length(group_name) between 1 and 120),
 exam_name text not null check(length(exam_name) between 1 and 180),
 exam_date date not null,
 students jsonb not null check(jsonb_typeof(students)='array' and jsonb_array_length(students) between 1 and 200),
 created_at timestamptz not null default now()
);
create table if not exists public.es_demo_results_shared (
 code text not null references public.es_demo_sessions_shared(code) on delete cascade,
 student_name text not null,
 name_key text generated always as (lower(btrim(student_name))) stored,
 score integer not null check(score between 0 and 100),
 sections jsonb not null default '{}'::jsonb,
 answers jsonb not null default '{}'::jsonb,
 submitted_at timestamptz not null default now(),
 primary key(code,name_key)
);
alter table public.es_demo_sessions_shared enable row level security;
alter table public.es_demo_results_shared enable row level security;
revoke all on public.es_demo_sessions_shared from anon, authenticated;
revoke all on public.es_demo_results_shared from anon, authenticated;
-- No direct table access. Only narrow public RPCs are granted.
create or replace function public.es_demo_create_session(p_code text,p_level text,p_group text,p_exam text,p_date date,p_students jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
 if p_code !~ '^ES-(BAS|INT|AVA)-[A-Z0-9]{5,10}$' or p_level not in ('basico','intermedio','avanzado')
 or length(btrim(p_group)) not between 1 and 120 or length(p_exam) not between 1 and 180
 or jsonb_typeof(p_students) is distinct from 'array'
 or jsonb_array_length(p_students) not between 1 and 200
 or exists(select 1 from jsonb_array_elements(p_students) x where jsonb_typeof(x) <> 'string' or length(btrim(x #>> '{}')) not between 1 and 120)
 then raise exception 'Invalid session'; end if;
 insert into public.es_demo_sessions_shared(code,level,group_name,exam_name,exam_date,students)
 values (p_code,p_level,btrim(p_group),p_exam,p_date,p_students);
end $$;
create or replace function public.es_demo_get_session(p_code text)
returns table(code text,level text,group_name text,exam_name text,exam_date date,students jsonb,created_at timestamptz)
language sql security definer set search_path='' as $$
 select s.code,s.level,s.group_name,s.exam_name,s.exam_date,s.students,s.created_at
 from public.es_demo_sessions_shared s where s.code=p_code;
$$;
create or replace function public.es_demo_submit_result(p_code text,p_student text,p_score integer,p_sections jsonb,p_answers jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare v_students jsonb;
begin
 select students into v_students from public.es_demo_sessions_shared where code=p_code;
 if v_students is null then raise exception 'Exam not found'; end if;
 if length(btrim(p_student)) not between 1 and 120 or p_score not between 0 and 100
 or jsonb_typeof(p_sections) is distinct from 'object' or jsonb_typeof(p_answers) is distinct from 'object'
 or pg_column_size(p_answers)>40000
 or not exists(select 1 from jsonb_array_elements_text(v_students) x where lower(btrim(x))=lower(btrim(p_student)))
 then raise exception 'Invalid submission'; end if;
 insert into public.es_demo_results_shared(code,student_name,score,sections,answers)
 values(p_code,btrim(p_student),p_score,p_sections,p_answers);
end $$;
create or replace function public.es_demo_get_results(p_code text)
returns table(student_name text,score integer,sections jsonb,submitted_at timestamptz)
language sql security definer set search_path='' as $$
 select r.student_name,r.score,r.sections,r.submitted_at from public.es_demo_results_shared r
 where r.code=p_code order by r.student_name;
$$;
revoke all on function public.es_demo_create_session(text,text,text,text,date,jsonb) from public;
revoke all on function public.es_demo_get_session(text) from public;
revoke all on function public.es_demo_submit_result(text,text,integer,jsonb,jsonb) from public;
revoke all on function public.es_demo_get_results(text) from public;
grant execute on function public.es_demo_create_session(text,text,text,text,date,jsonb) to anon,authenticated;
grant execute on function public.es_demo_get_session(text) to anon,authenticated;
grant execute on function public.es_demo_submit_result(text,text,integer,jsonb,jsonb) to anon,authenticated;
grant execute on function public.es_demo_get_results(text) to anon,authenticated;
-- WARNING: Scores supplied by the public HTML can be forged. Demo only.
