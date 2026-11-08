# 6차 신규 어종 원화 — 검토본

6종 개별 PNG 제작 완료. 상태는 ART_REVIEW이며 게임에 설치하지 않았습니다. 원본 크기와 생성 프롬프트, 출처, 미해결 문제는 review-manifest.json에 있습니다.

| 어종 | 학명 | 확인/보류 |
| --- | --- | --- |
| 아나바스 | Anabas testudineus | Full approved/staged artwork comparison and gameplay metadata review required; Visible edge color contamination requires cleanup before installation; Transparent safety margin below 100px |
| 아바아바 | Gymnarchus niloticus | Full approved/staged artwork comparison and gameplay metadata review required; Transparent safety margin below 100px |
| 파티메기 | Luciopimelodus pati | Full approved/staged artwork comparison and gameplay metadata review required; Visible edge color contamination requires cleanup before installation; Transparent safety margin below 100px; No verified matching game habitat assigned |
| 유럽브림 | Abramis brama | Full approved/staged artwork comparison and gameplay metadata review required; Exterior luminous halo remains; background extraction retry did not resolve it; original draft retained; Transparent safety margin below 100px |
| 산호고양이상어 | Atelomycterus marmoratus | Full approved/staged artwork comparison and gameplay metadata review required; Visible edge color contamination requires cleanup before installation; Transparent safety margin below 100px |
| 클레프트벨리전갱이 | Atropus atropos | Full approved/staged artwork comparison and gameplay metadata review required; Exterior luminous halo remains; background extraction retry did not resolve it; original draft retained; Transparent safety margin below 100px; No verified matching game habitat assigned |

브림·전갱이는 배경 제거를 한 번 재시도했으나 외곽 광택이 남아 원본 초안을 보존했습니다. 잘못된 알파를 완성본으로 표시하지 않습니다.

파티메기의 알려진 서식지는 La Plata/Blanco 유역이므로 기존 아마존 스테이지를 자동 배정하지 않습니다. 아바아바는 원본 후보의 소형/열대수조 제안을 아프리카 담수/대형 검토값으로 수정했습니다. 크기 등급은 게임 제안이며 생물학적 분류가 아닙니다.

생성: built-in image_gen. 각 종의 최종 원화 생성 프롬프트는 manifest의 prompt 필드, 실패한 배경 제거 재시도는 editPrompt 필드에 기록했습니다.
