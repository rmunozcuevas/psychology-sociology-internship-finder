import importlib.util, tempfile, unittest, sqlite3
from pathlib import Path
spec=importlib.util.spec_from_file_location('coverage_db',Path(__file__).resolve().parents[1]/'scripts/coverage-db.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

def payload(date,ids,status='ok'):
    return {'report':{'updatedAt':date,'summary':{'internships':len(ids)},'sources':[{'key':'example','name':'Example','kind':'test','url':'https://example.org','status':status,'checkedAt':date,'scanned':3,'internships':len(ids),'focused':len(ids),'entryLevel':0,'retained':len(ids) if status!='ok' else 0,'error':None}]},'jobs':[{'id':id,'sourceId':'example','title':'Research Intern','org':'Example','url':'https://example.org/'+id,'location':'Charlotte, NC','kind':'internship','lastSeen':'2026-11-08T12:00:00Z'} for id in ids]}

class History(unittest.TestCase):
    def test_baseline_changes_repeat_and_preserved_observation(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'source.sqlite'
            first=module.update(payload('2026-11-08T12:00:00Z',['a','b']),path)
            self.assertTrue(first['changes']['baseline']);self.assertEqual(first['changes']['newSincePrevious'],0)
            second=module.update(payload('2026-11-09T12:00:00Z',['b','c'],'error'),path)
            self.assertEqual(second['changes'],{'baseline':False,'newSincePrevious':1,'noLongerInFeed':1})
            self.assertEqual(module.update(payload('2026-11-09T12:00:00Z',['b','c'],'error'),path),second)
            db=sqlite3.connect(path)
            self.assertEqual(db.execute('SELECT active FROM jobs WHERE id="a"').fetchone()[0],0)
            self.assertEqual(db.execute('SELECT last_observed FROM jobs WHERE id="b"').fetchone()[0],'2026-11-08T12:00:00Z')
            self.assertEqual(db.execute('SELECT count(*) FROM job_observations').fetchone()[0],4)
            db.close()
            with self.assertRaises(ValueError):module.update(payload('2026-11-07T12:00:00Z',[]),path)
    def test_retention_cascades_observations(self):
        with tempfile.TemporaryDirectory() as temp:
            path=Path(temp)/'source.sqlite'
            for day in range(1,39): module.update(payload(f'2027-01-{day:02d}T12:00:00Z',['a']),path)
            db=sqlite3.connect(path)
            self.assertEqual(db.execute('SELECT count(*) FROM runs').fetchone()[0],35)
            self.assertEqual(db.execute('SELECT count(*) FROM source_runs').fetchone()[0],35)
            self.assertEqual(db.execute('SELECT count(*) FROM job_observations').fetchone()[0],35)
            db.close()
if __name__=='__main__':unittest.main()
