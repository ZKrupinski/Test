"""Build a review-first art queue; never activates species or edits game IDs."""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(name):
    return json.loads((ROOT / name).read_text())

def key(name):
    return ' '.join(name.lower().split())

source = read('fish-production-candidates.json')
known = {}
for row in read('fish-art-batch-001-assignments.json')['records']:
    known[key(row['scientificName'])] = row['artStatus']
for row in read('fish-art-batch-002-queue.json')['candidates']:
    if row['artStatus'] != 'NOT_GENERATED':
        known[key(row['scientificName'])] = row['artStatus']
for row in read('fish-art-batch-004-queue.json')['candidates']:
    known[key(row['scientificName'])] = row['artStatus']
# Include new review batches so continuing work never regenerates them blindly.
for manifest_path in sorted((ROOT / 'art-review').glob('*/review-manifest.json')):
    manifest = json.loads(manifest_path.read_text())
    for row in manifest.get('species', []):
        known[key(row['scientificName'])] = row.get('status', 'ART_REVIEW')
# Resolve completed installations as LIVE even when the older art-review record says ART_REVIEW.
for manifest_name in [
    'assets/fish-expansion/installed-manifest.json',
    'assets/fish-expansion-023/installed-manifest.json',
    'assets/fish-expansion-004/installed-manifest.json',
    'assets/fish-expansion-006/installed-manifest.json',
    'assets/fish-expansion-007/installed-manifest.json',
    'assets/fish-expansion-008/installed-manifest.json',
    'assets/fish-expansion-009/installed-manifest.json',
    'assets/fish-expansion-010/installed-manifest.json',
]:
    path = ROOT / manifest_name
    if not path.is_file():
        continue
    for row in json.loads(path.read_text()).get('species', []):
        known[key(row['scientificName'])] = 'LIVE'

backlog = [r for r in source['candidates'] if key(r['scientificName']) not in known]
selected, used = [], set()
# Two candidates per stage; avoid repeating a family/size in that stage where possible.
for stage, stage_name in enumerate(source['stageNames']):
    pool = [r for r in backlog if r['proposedStage'] == stage]
    families, sizes = set(), set()
    for slot in range(2):
        options = [r for r in pool if r['candidateId'] not in used]
        if not options:
            break
        options.sort(key=lambda r: (
            r['family'] in families,
            r['proposedSizeClass'] in sizes,
            r['sourceMatchStatus'] != 'SOURCE_NO_WARNING',
            r['familyMembersInQueue'], r['candidateId']))
        r = options[0]
        families.add(r['family']); sizes.add(r['proposedSizeClass']); used.add(r['candidateId'])
        selected.append({
            'candidateId': r['candidateId'], 'scientificName': r['scientificName'],
            'proposedStage': stage, 'proposedStageName': stage_name,
            'proposedSizeClass': r['proposedSizeClass'], 'family': r['family'],
            'morphologyGuide': r['morphologyGuide'],
            'status': 'PREFLIGHT_REQUIRED', 'gameId': None,
            'requiredBeforeGeneration': ['accepted_taxon_and_synonym_check',
                'existing_304_and_staged_art_visual_comparison',
                'habitat_and_adult_size_sources', 'two_non_color_shape_differences'],
        })
# The current focus is the first six genuinely unproduced candidates, never old LIVE art.
current = [row['scientificName'] for row in selected[:6]]

# Six assets per production batch, four batches; sequential, not background jobs.
for i, row in enumerate(selected):
    row['reviewOrder'] = i + 1
    row['batch'] = 'REVIEW-%02d' % (i // 6 + 1)
result = {
    'version': '2026-11-09',
    'role': 'Production review order, NOT a list of approved or live fish',
    'sourceCandidateCount': len(source['candidates']),
    'knownArtOrCurrentBatchMatched': len(source['candidates']) - len(backlog),
    'remainingCandidateCount': len(backlog),
    'remainingCountMeaning': 'Candidates without matched production records; not proof every candidate is unique or has no Library art',
    'currentBatch': current,
    'generationBatchSize': 6,
    'regionAssignmentsAreProvisional': True,
    'remainingByProposedStage': dict(Counter(r['proposedStageName'] for r in backlog)),
    'nextReviewCandidates': selected,
}
out = ROOT / 'fish-art-next-work-queue.json'
out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
assert len({key(r['scientificName']) for r in selected}) == len(selected)
assert not ({key(r['scientificName']) for r in selected} & set(known))
assert all(r['gameId'] is None for r in selected)
print(json.dumps({k: result[k] for k in ['sourceCandidateCount', 'knownArtOrCurrentBatchMatched', 'remainingCandidateCount']}, ensure_ascii=False))
print('Next preflight candidates:', len(selected))
