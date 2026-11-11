-- EnglishSmart: OPEN DEMO only. Run in Supabase SQL Editor.
-- IMPORTANT: public anonymous grade viewer, use fictitious names only.
-- Do not use for real students or official grades.
create table if not exists public.es_open_demo_results (
 id uuid primary key default gen_random_uuid(),
 student_name text not null check(length(btrim(student_name)) between 1 and 100),
 level text not null check(level in ('basico','intermedio','avanzado')),
 exam_name text not null check(length(exam_name) between 1 and 180),
 score integer not null check(score between 0 and 100),
 sections jsonb not null default '{}'::jsonb,
 answers jsonb not null default '{}'::jsonb,
 submitted_at timestamptz not null default now()
);
alter table public.es_open_demo_results enable row level security;
revoke all on public.es_open_demo_results from anon, authenticated;
create or replace function public.es_open_demo_submit(
 p_name text,p_level text,p_exam text,p_score integer,p_sections jsonb,p_answers jsonb
) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
 if length(btrim(p_name)) not between 1 and 100
 or p_level not in ('basico','intermedio','avanzado')
 or length(btrim(p_exam)) not between 1 and 180 or p_score not between 0 and 100
 or jsonb_typeof(p_sections) is distinct from 'object'
 or jsonb_typeof(p_answers) is distinct from 'object'
 or pg_column_size(p_answers)>40000
 then raise exception 'Invalid demo response'; end if;
 insert into public.es_open_demo_results(student_name,level,exam_name,score,sections,answers)
 values(btrim(p_name),p_level,btrim(p_exam),p_score,p_sections,p_answers)
 returning id into new_id;
 return new_id;
end $$;
create or replace function public.es_open_demo_grades()
returns table(student_name text,level text,exam_name text,score integer,sections jsonb,submitted_at timestamptz)
language sql security definer set search_path='' as $$
 select r.student_name,r.level,r.exam_name,r.score,r.sections,r.submitted_at
 from public.es_open_demo_results r order by r.submitted_at desc limit 200;
$$;
revoke all on function public.es_open_demo_submit(text,text,text,integer,jsonb,jsonb) from public;
revoke all on function public.es_open_demo_grades() from public;
grant execute on function public.es_open_demo_submit(text,text,text,integer,jsonb,jsonb) to anon, authenticated;
grant execute on function public.es_open_demo_grades() to anon, authenticated;
