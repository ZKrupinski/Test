#!/usr/bin/env python3
"""Recover source-exact painted pixels deleted from *enclosed* sprite alpha holes.

Only the 17 new male 4x2 swimmers; never modify outside transparency,
originally transparent pixels, existing opaque art, anatomy, or frame geometry.
"""
import hashlib
import io
import json
import math
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

BASELINE='b29b280f570d0f1fdf8b258f122c7149b9c7f9e6'
ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'assets/humans/male-concepts'
MANIFEST=ASSETS/'installed-manifest.json'
EXPECTED_IDS=[2,3,4,6,7,9,10,11,12,13,14,15,16,19,20,21,23]

def sha256(b):return hashlib.sha256(b).hexdigest()
def git_blob(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()
def jsround(n):return math.floor(n+.5)
def bounds(f):
 c,r=f%4,f//4
 return jsround(c*1774/4),jsround((c+1)*1774/4),jsround(r*887/2),jsround((r+1)*887/2)

def restore(out,original):
 recovered=[]
 for frame in range(8):
  x0,x1,y0,y1=bounds(frame)
  current=out[y0:y1,x0:x1]
  source=original[y0:y1,x0:x1]
  count=0
  for _ in range(3):
   foreground=current[:,:,3]>=48
   enclosed=ndi.binary_fill_holes(foreground)&~foreground
   lost=enclosed&(source[:,:,3]>16)&(current[:,:,3]<source[:,:,3])
   if not np.any(lost):break
   count+=int(np.count_nonzero(lost))
   current[lost]=source[lost]
  recovered.append(count)
 return recovered

def patch_code():
 renderer=ROOT/'human-sprites.js'
 old=("'./assets/humans/male-concepts/baby_swim_boy_'+maleSwimBoyById[id]+'_8f.png?v='+\n"
      "   (maleSwimBoyById[id]==='dragon_knight'?'20261112-dragon-alpha-repair-v2':'20261112-male17-swim-v1'):")
 new="'./assets/humans/male-concepts/baby_swim_boy_'+maleSwimBoyById[id]+'_8f.png?v=20261112-male17-alpha-holes-v3':"
 content=renderer.read_text('utf8')
 assert content.count(old)==1,'Unexpected renderer source changed'
 renderer.write_text(content.replace(old,new),encoding='utf8')
 for relative in ['index.html','qa-human-sprites.cjs','qa-male-baby-scale.cjs']:
  path=ROOT/relative
  content=path.read_text('utf8')
  assert '20261112-male17-world125-v3' in content,'Missing cache key '+relative
  path.write_text(content.replace('20261112-male17-world125-v3','20261112-male17-alpha-holes-v4'),encoding='utf8')
 qa=ROOT/'qa-male-baby-scale.cjs'
 tests=qa.read_text('utf8')
 old_test="assert(actual.imageFor(23,'swim').src.includes('20261112-dragon-alpha-repair-v2'),'Dragon-only fresh cache URL');"
 new_test="for(const id of ids)assert(actual.imageFor(id,'swim').src.includes('20261112-male17-alpha-holes-v3'),'New male repaired alpha cache URL: '+id);"
 assert tests.count(old_test)==1,'Missing original dragon-only QA assertion'
 qa.write_text(tests.replace(old_test,new_test),encoding='utf8')

def main():
 manifest=json.loads(MANIFEST.read_text('utf8'))
 assert manifest['count']==17 and manifest['grid']==[4,2]
 assert [e['id'] for e in manifest['actors']]==EXPECTED_IDS
 results=[]
 for entry in manifest['actors']:
  key=entry['key']; path=ASSETS/('baby_swim_boy_'+key+'_8f.png')
  raw=path.read_bytes()
  assert sha256(raw)==entry['sha256'],'Current asset changed: '+key
  original_raw=subprocess.check_output(['git','show',f'{BASELINE}:human-fishing/assets/humans/male-staging/{key}.png'])
  assert sha256(original_raw)==entry['sourceSha256'],'Archived original changed: '+key
  source=np.asarray(Image.open(io.BytesIO(original_raw)).convert('RGBA'))
  prior=np.asarray(Image.open(io.BytesIO(raw)).convert('RGBA'))
  assert source.shape==prior.shape==(887,1774,4),'Invalid sprite sheet '+key
  repaired=prior.copy()
  per_frame=restore(repaired,source)
  count=sum(per_frame)
  if count:
   changed=np.any(repaired!=prior,axis=2)
   assert np.count_nonzero(changed)==count
   assert np.array_equal(repaired[changed],source[changed]),'Pixels not source-exact: '+key
   assert np.array_equal(repaired[~changed],prior[~changed]),'Outside hole was altered: '+key
   assert not any(restore(repaired.copy(),source)),'Residual internal lost alpha: '+key
   buffer=io.BytesIO()
   Image.fromarray(repaired,'RGBA').save(buffer,format='PNG',optimize=True)
   output=buffer.getvalue()
   path.write_bytes(output)
   entry.update(sha256=sha256(output),pixelSha256=sha256(repaired.tobytes()),gitBlob=git_blob(output))
  results.append({'id':entry['id'],'key':key,'recovered':count,'frames':per_frame,'originalSha':sha256(raw),'newSha':entry['sha256']})
  print(key,entry['id'],'restored',count,'px by frame',per_frame)
 total=sum(e['recovered'] for e in results)
 assert total>1000,'Expected erroneous holes were not found; abort'
 manifest.setdefault('patchHistory',[]).append({
  'date':'2026-11-12',
  'operation':'Exact original pixel restoration of enclosed accidental alpha holes across all 17 new male swimmer sheets. Preserve exterior transparency and all protected art.',
  'sourceCommit':BASELINE,'repairedPixels':total,'repairedIds':[e['id'] for e in results if e['recovered']]
 })
 MANIFEST.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 report=ROOT/'art-review/male-alpha-hole-repair.json'
 report.parent.mkdir(parents=True,exist_ok=True)
 report.write_text(json.dumps({'sourceCommit':BASELINE,'repairedPixels':total,'results':results},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 patch_code()
 print('PASS: restored',total,'original painted pixels without changing exterior alpha, scale, or animation layout.')

if __name__=='__main__':main()
