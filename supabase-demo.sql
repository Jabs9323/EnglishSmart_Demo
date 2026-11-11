-- EnglishSmart Demo: public-access multi-device storage.
-- WARNING: No authentication: use fictitious names and non-official grades only.
create table if not exists public.es_demo_cloud_sessions (
 code text primary key,
 level text not null check(level in ('basico','intermedio','avanzado')),
 group_name text not null,
 exam text not null,
 exam_date text not null,
 students jsonb not null,
 created_at timestamptz not null default now(),
 constraint es_demo_student_array check(jsonb_typeof(students)='array')
);
create table if not exists public.es_demo_cloud_results (
 code text not null references public.es_demo_cloud_sessions(code) on delete cascade,
 student_key text not null,
 student_name text not null,
 score integer not null check(score between 0 and 100),
 sections jsonb not null default '{}'::jsonb,
 submitted_at timestamptz not null default now(),
 primary key(code,student_key)
);
alter table public.es_demo_cloud_sessions enable row level security;
alter table public.es_demo_cloud_results enable row level security;
revoke all on public.es_demo_cloud_sessions,public.es_demo_cloud_results from anon,authenticated;
-- The RPC endpoints below are intentionally public. The data is demo-only.
create or replace function public.es_demo_create_session(p_code text,p_level text,p_group text,p_exam text,p_date text,p_students jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if p_code !~ '^ES-(BAS|INT|AVA)-[A-Z0-9]{5}$' or p_level not in ('basico','intermedio','avanzado')
    or length(trim(p_group)) not between 1 and 120 or length(p_exam)>200
    or jsonb_typeof(p_students)<>'array' or jsonb_array_length(p_students) not between 1 and 150
 then raise exception 'Invalid exam session'; end if;
 insert into public.es_demo_cloud_sessions(code,level,group_name,exam,exam_date,students)
 values(p_code,p_level,trim(p_group),p_exam,p_date,p_students);
end $$;
create or replace function public.es_demo_list_sessions()
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('code',code,'level',level,'group',group_name,'exam',exam,'date',exam_date,'students',students,'created',to_char(created_at,'YYYY-MM-DD HH24:MI')) order by created_at desc),'[]'::jsonb)
 from public.es_demo_cloud_sessions;
$$;
create or replace function public.es_demo_get_session(p_code text)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('code',code,'level',level,'group',group_name,'exam',exam,'date',exam_date,'students',students,'created',to_char(created_at,'YYYY-MM-DD HH24:MI'))
 from public.es_demo_cloud_sessions where code=p_code;
$$;
create or replace function public.es_demo_get_results(p_code text)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
 select coalesce(jsonb_agg(jsonb_build_object('name',student_name,'score',score,'sections',sections,'date',to_char(submitted_at,'DD/MM/YYYY HH24:MI'),'demo',false) order by submitted_at desc),'[]'::jsonb)
 from public.es_demo_cloud_results where code=p_code;
$$;
create or replace function public.es_demo_submit_result(p_code text,p_name text,p_score integer,p_sections jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_students jsonb;v_key text;
begin
 select students into v_students from public.es_demo_cloud_sessions where code=p_code;
 if v_students is null then raise exception 'Exam not found'; end if;
 v_key:=lower(trim(p_name));
 if length(v_key) not between 1 and 160 or p_score not between 0 and 100
    or not exists(select 1 from jsonb_array_elements_text(v_students) x where lower(trim(x))=v_key)
 then raise exception 'Invalid student or grade'; end if;
 insert into public.es_demo_cloud_results(code,student_key,student_name,score,sections)
 values(p_code,v_key,trim(p_name),p_score,coalesce(p_sections,'{}'::jsonb));
 -- PRIMARY KEY rejects a second submission from any browser.
end $$;
revoke all on function public.es_demo_create_session(text,text,text,text,text,jsonb) from public;
revoke all on function public.es_demo_list_sessions() from public;
revoke all on function public.es_demo_get_session(text) from public;
revoke all on function public.es_demo_get_results(text) from public;
revoke all on function public.es_demo_submit_result(text,text,integer,jsonb) from public;
grant execute on function public.es_demo_create_session(text,text,text,text,text,jsonb) to anon,authenticated;
grant execute on function public.es_demo_list_sessions() to anon,authenticated;
grant execute on function public.es_demo_get_session(text) to anon,authenticated;
grant execute on function public.es_demo_get_results(text) to anon,authenticated;
grant execute on function public.es_demo_submit_result(text,text,integer,jsonb) to anon,authenticated;
