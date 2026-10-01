// Database security tests: runs the migrations in PGlite (Postgres in WebAssembly, no Docker needed)
// with minimal stand-ins for Supabase's auth schema, then checks who can see and change what.
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'

const db = new PGlite()
const migration = fs.readFileSync(new URL('../supabase/migrations/20260930000000_init.sql', import.meta.url), 'utf8')

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  create publication supabase_realtime;
`)
await db.exec(migration)

const A = '00000000-0000-0000-0000-00000000000a', C = '00000000-0000-0000-0000-00000000000c', D = '00000000-0000-0000-0000-00000000000d'
await db.exec(`insert into auth.users values ('${A}'), ('${C}'), ('${D}')`)

let pass = 0, fail = 0
const check = (name, ok, detail = '') => { if (ok) pass++; else fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`) }

async function as(uid, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'};`)
  try { return await fn() } finally { await db.exec('reset role') }
}
const q = (sql, params) => db.query(sql, params).then((r) => r.rows)
async function fails(sql, params) { try { await q(sql, params); return null } catch (e) { return e.message } }

// 1. A creates a band with two people and is the first one.
const band = await as(A, () => q(`select public.create_band('Test Band', '[{"name":"Alice","role":"keys"},{"name":"Bo"}]'::jsonb, 0) as id`))
const bandId = band[0].id
check('create_band returns an id', !!bandId)
const lineup = await as(A, () => q(`select id, name, user_id from members order by created_at`))
check('lineup created with A on it', lineup.length === 2 && lineup[0].user_id === A && lineup[1].user_id === null, JSON.stringify(lineup.map((m) => m.name)))
const alice = lineup[0].id, bo = lineup[1].id
const code = (await as(A, () => q(`select invite_code from bands`)))[0].invite_code
check('invite code is 12 hex chars', /^[a-f0-9]{12}$/.test(code), code)

// 2. A proposes a date and votes.
const date = await as(A, () => q(`insert into dates (band_id, day, kind) values ($1, '2030-01-05', 'Rehearsal') returning id`, [bandId]))
const dateId = date[0].id
check('A can vote as Alice', (await as(A, () => fails(`insert into votes values ($1, $2, $3, 'yes')`, [dateId, alice, bandId]))) === null)
check('A cannot vote as Bo', (await as(A, () => fails(`insert into votes values ($1, $2, $3, 'no')`, [dateId, bo, bandId]))) !== null)

// 3. C is an outsider.
check('outsider sees no bands', (await as(C, () => q(`select * from bands`))).length === 0)
check('outsider sees no dates', (await as(C, () => q(`select * from dates`))).length === 0)
check('outsider sees no members', (await as(C, () => q(`select * from members`))).length === 0)
check('outsider cannot add a date', (await as(C, () => fails(`insert into dates (band_id, day) values ($1, '2030-01-06')`, [bandId]))) !== null)
check('outsider cannot rename the band', (await as(C, () => q(`update bands set name = 'Hacked' where id = $1 returning id`, [bandId]))).length === 0)

// 4. C opens the invite and claims Bo.
const preview = await as(C, () => q(`select * from public.band_preview($1)`, [code]))
check('invite preview shows band and lineup', preview.length === 2 && preview[0].band_name === 'Test Band' && preview[1].claimed === false)
check('bad invite code shows nothing', (await as(C, () => q(`select * from public.band_preview('nope')`))).length === 0)
const joined = await as(C, () => q(`select public.join_band($1, $2::uuid) as id`, [code, bo]))
check('C joins as Bo', joined[0].id === bandId)
check('C now sees the date', (await as(C, () => q(`select * from dates`))).length === 1)
check('C can vote as Bo', (await as(C, () => fails(`insert into votes values ($1, $2, $3, 'maybe')`, [dateId, bo, bandId]))) === null)
check('C can change own vote', (await as(C, () => q(`update votes set vote = 'yes' where member_id = $1 returning vote`, [bo]))).length === 1)
check("C cannot change Alice's vote", (await as(C, () => q(`update votes set vote = 'no' where member_id = $1 returning vote`, [alice]))).length === 0)

// 5. D tries to claim Bo too, then joins as a new person.
check('D cannot claim a taken spot', /already/.test((await as(D, () => fails(`select public.join_band($1, $2::uuid)`, [code, bo]))) ?? ''))
await as(D, () => q(`select public.join_band($1, null, 'Dee')`, [code]))
check('D joins as a new person', (await as(A, () => q(`select * from members where name = 'Dee'`))).length === 1)
check('joining twice is a no-op', (await as(D, () => q(`select public.join_band($1, null, 'Dee again') as id`, [code])))[0].id === bandId
  && (await as(A, () => q(`select count(*)::int as n from members`)))[0].n === 3)

// 6. Signed-out visitors can't call anything.
check('anon cannot create a band', (await as(null, () => fails(`select public.create_band('X', '[{"name":"x"}]'::jsonb, 0)`))) !== null)
check('anon cannot preview invites', (await as(null, () => fails(`select * from public.band_preview($1)`, [code]))) !== null)
check('anon sees no dates', (await as(null, () => q(`select * from dates`))).length === 0)

// 7. Validation and cascades.
check('create_band rejects empty lineup', /at least one/.test((await as(A, () => fails(`select public.create_band('X', '[]'::jsonb, 0)`))) ?? ''))
check('create_band rejects bad "me"', /which one/.test((await as(A, () => fails(`select public.create_band('X', '[{"name":"x"}]'::jsonb, 3)`))) ?? ''))
await as(A, () => q(`delete from dates where id = $1`, [dateId]))
check('deleting a date removes its votes', (await as(A, () => q(`select * from votes`))).length === 0)
const pubTables = await q(`select count(*)::int as n from pg_publication_tables where pubname = 'supabase_realtime'`)
check('all 10 tables publish realtime changes', pubTables[0].n === 10, String(pubTables[0].n))

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
