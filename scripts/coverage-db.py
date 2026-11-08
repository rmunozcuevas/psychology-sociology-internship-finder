"""Durable, public SQLite history for screened listings and source yield (stdlib only)."""
import json, sqlite3, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent

def update(payload, path):
    report, jobs = payload['report'], payload['jobs']
    db = sqlite3.connect(path)
    db.executescript('''
      PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, summary TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sources(id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL, url TEXT);
      CREATE TABLE IF NOT EXISTS source_runs(run_id TEXT REFERENCES runs(id) ON DELETE CASCADE, source_id TEXT REFERENCES sources(id), status TEXT, checked_at TEXT, scanned INTEGER, internships INTEGER, focused INTEGER, entry_level INTEGER, retained INTEGER, error TEXT, PRIMARY KEY(run_id,source_id));
      CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, source_id TEXT, title TEXT, org TEXT, url TEXT, location TEXT, kind TEXT, first_observed TEXT, last_observed TEXT, active INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS job_observations(run_id TEXT REFERENCES runs(id) ON DELETE CASCADE, job_id TEXT REFERENCES jobs(id), last_seen TEXT, PRIMARY KEY(run_id,job_id));
      CREATE TABLE IF NOT EXISTS changes(run_id TEXT PRIMARY KEY REFERENCES runs(id) ON DELETE CASCADE, added INTEGER, removed INTEGER, baseline INTEGER);
    ''')
    run_id = report['updatedAt']
    newest = db.execute('SELECT max(id) FROM runs').fetchone()[0]
    if newest and run_id < newest:
        raise ValueError('Refusing to replace newer source history with an older snapshot')
    previous = db.execute('SELECT max(id) FROM runs WHERE id < ?', (run_id,)).fetchone()[0]
    active = {r[0] for r in db.execute('SELECT job_id FROM job_observations WHERE run_id=?', (previous,))} if previous else set()
    current = {j['id'] for j in jobs}
    db.execute('INSERT INTO runs VALUES (?,?) ON CONFLICT(id) DO UPDATE SET summary=excluded.summary', (run_id,json.dumps(report['summary'])))
    db.execute('INSERT OR REPLACE INTO changes VALUES (?,?,?,?)', (run_id,len(current-active) if previous else 0,len(active-current) if previous else 0,not bool(previous)))
    db.execute('DELETE FROM job_observations WHERE run_id=?',(run_id,))
    with db:
        for s in report['sources']:
            db.execute('INSERT INTO sources VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, kind=excluded.kind, url=excluded.url',(s['key'],s['name'],s['kind'],s['url']))
            db.execute('INSERT OR REPLACE INTO source_runs VALUES (?,?,?,?,?,?,?,?,?,?)',(run_id,s['key'],s['status'],s['checkedAt'],s['scanned'],s['internships'],s['focused'],s['entryLevel'],s['retained'],s['error']))
        db.execute('UPDATE jobs SET active=0')
        for j in jobs:
            db.execute('''INSERT INTO jobs VALUES (?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET source_id=excluded.source_id,title=excluded.title,org=excluded.org,url=excluded.url,location=excluded.location,kind=excluded.kind,last_observed=excluded.last_observed,active=1''',(j['id'],j['sourceId'],j['title'],j['org'],j['url'],j['location'],j['kind'],run_id,j.get('lastSeen') or run_id))
            db.execute('INSERT OR REPLACE INTO job_observations VALUES (?,?,?)',(run_id,j['id'],j.get('lastSeen')))
        # Keep 35 completed snapshots, preserving first/last observation for every job.
        db.execute('DELETE FROM runs WHERE id NOT IN (SELECT id FROM runs ORDER BY id DESC LIMIT 35)')
    history=[{'updatedAt':r[0],**json.loads(r[1])} for r in db.execute('SELECT id,summary FROM runs ORDER BY id')]
    c=db.execute('SELECT added,removed,baseline FROM changes WHERE run_id=?',(run_id,)).fetchone()
    db.close()
    return {'history':history,'changes':{'newSincePrevious':c[0], 'noLongerInFeed':c[1], 'baseline':bool(c[2])}}

if __name__ == '__main__':
    print(json.dumps(update(json.load(sys.stdin),ROOT/'data'/'source-history.sqlite')))
