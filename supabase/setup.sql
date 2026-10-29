-- «Копилка»: схема базы. Выполнить один раз: Supabase → SQL Editor → New query → Run.
-- Повторный запуск безопасен: таблицы и данные не трогает, только обновляет индексы и правила.
-- Все таблицы с префиксом fin_, каждая строка принадлежит пользователю (user_id),
-- RLS пускает только к своим строкам.

-- Категории ---------------------------------------------------------------------------------------
create table if not exists public.fin_categories (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name        text not null check (char_length(name) between 1 and 40),
    kind        text not null check (kind in ('income', 'expense')),
    essential   boolean not null default false,
    color       text not null default 'blue',
    icon        text not null default 'more',
    archived    boolean not null default false,
    sort        int not null default 0,
    created_at  timestamptz not null default now(),
    unique (user_id, id),
    -- обязательной может быть только категория расходов
    check (kind = 'expense' or not essential)
);
create unique index if not exists fin_categories_unique_name
    on public.fin_categories (user_id, kind, lower(name));

-- Цели --------------------------------------------------------------------------------------------
create table if not exists public.fin_goals (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
    name        text not null check (char_length(name) between 1 and 60),
    emoji       text not null default '🎯' check (char_length(emoji) between 1 and 8),
    target_kop  bigint not null check (target_kop > 0),
    deadline    date not null,
    created_on  date not null default current_date,
    archived    boolean not null default false,
    created_at  timestamptz not null default now(),
    unique (user_id, id),
    check (deadline >= created_on)
);

-- Операции ----------------------------------------------------------------------------------------
-- Составные внешние ключи (user_id, …) не дают сослаться на чужую категорию или цель.
create table if not exists public.fin_transactions (
    id           uuid primary key default gen_random_uuid(),
    user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
    type         text not null check (type in ('income', 'expense', 'saving')),
    amount_kop   bigint not null check (amount_kop <> 0),
    occurred_on  date not null default current_date,
    category_id  uuid,
    goal_id      uuid,
    note         text not null default '' check (char_length(note) <= 200),
    created_at   timestamptz not null default now(),
    foreign key (user_id, category_id) references public.fin_categories (user_id, id)
        on delete set null (category_id),
    -- удаление цели удаляет её переводы: деньги возвращаются в свободные
    foreign key (user_id, goal_id) references public.fin_goals (user_id, id) on delete cascade,
    check (
        (type in ('income', 'expense') and amount_kop > 0 and goal_id is null)
        or (type = 'saving' and goal_id is not null and category_id is null)
    )
);
create index if not exists fin_transactions_user_date
    on public.fin_transactions (user_id, occurred_on desc);

-- Регулярные доходы и обязательные платежи ------------------------------------------------------
create table if not exists public.fin_recurring (
    id            uuid primary key default gen_random_uuid(),
    user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
    kind          text not null check (kind in ('income', 'expense')),
    name          text not null check (char_length(name) between 1 and 60),
    amount_kop    bigint not null check (amount_kop > 0),
    day_of_month  int not null check (day_of_month between 1 and 31),
    category_id   uuid,
    active        boolean not null default true,
    created_at    timestamptz not null default now(),
    foreign key (user_id, category_id) references public.fin_categories (user_id, id)
        on delete set null (category_id)
);

-- Настройки бюджета -------------------------------------------------------------------------------
create table if not exists public.fin_settings (
    user_id          uuid primary key default auth.uid() references auth.users (id) on delete cascade,
    cushion_percent  int not null default 10 check (cushion_percent between 0 and 50),
    forecast_months  int not null default 12 check (forecast_months between 3 and 24),
    updated_at       timestamptz not null default now()
);

-- Доступ: только свои строки ----------------------------------------------------------------------
do $$
declare
    t text;
begin
    foreach t in array array['fin_categories', 'fin_goals', 'fin_transactions', 'fin_recurring', 'fin_settings']
    loop
        execute format('alter table public.%I enable row level security', t);
        execute format('drop policy if exists "%s_own_rows" on public.%I', t, t);
        execute format(
            'create policy "%s_own_rows" on public.%I for all to authenticated
                using (user_id = (select auth.uid()))
                with check (user_id = (select auth.uid()))',
            t, t
        );
        execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    end loop;
end
$$;
