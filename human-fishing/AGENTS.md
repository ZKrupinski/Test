# 인간낚시 작업 지침

## 이미지 업로드 및 GitHub Pages 배포
업로드·설치·배포 작업 전에 [tools/UPLOAD_DEPLOY_GUIDE.md](tools/UPLOAD_DEPLOY_GUIDE.md)를 읽고 최신 main 상태를 확인한다.
이 기준은 Chat과 Work에서 공통으로 사용한다.

- 연결된 GitHub 도구가 바이너리 blob/tree/commit/ref 작업을 지원하면 검증된 직접 설치 경로를 우선한다. 토큰 입력이나 수동 업로드가 반드시 필요하다고 단정하지 않는다.
- 도구 출력을 거치는 큰 base64는 조각별 길이와 최종 길이를 검사하고, GitHub blob SHA와 로컬 git hash-object 결과의 일치 여부를 branch 갱신 전에 확인한다.
- 이미지·등록 데이터·ready 상태를 함께 반영하고 expected_sha로 최신 변경을 보호한다.
- 게임 QA, Pages 배포, 서비스 PNG의 원본 SHA-256 일치까지 확인한 뒤 완료를 보고한다.
- 실제 권한이나 기능이 없으면 그 한계를 명확히 설명하고 문서의 기존 ZIP 업로더 경로를 사용한다. 채팅에 토큰을 요구하지 않는다.

## 미제작 어종 원화
추가 어종 제작은 [FISH_ART_PRODUCTION_PLAN.md](FISH_ART_PRODUCTION_PLAN.md)와 [fish-art-next-work-queue.json](fish-art-next-work-queue.json)을 확인한다. 기존 제작/설치 기록과 학명으로 대조하고, 미검증 지역·크기를 확정값으로 사용하지 않는다. art-review의 원화는 검토용이며 LIVE 이미지로 취급하지 않는다.

11차 신규 어종 F373–F378 6종은 원본 검증 후 게임에 설치됨. F376·F377·F378의 해부학적 정확성은 후속 재검토 대상.

## 도감·획득창 원화 방향 (모든 신규 추가분 필수)
- 모든 **물고기·방향성 특수 생물의 머리**는 도감(미획득 실루엣 포함)과 획득창(일반·피버·수족관)에서 왼쪽으로 통일. 월드 수영 애니메이션·원본 PNG는 변경 금지.
- 새 PNG 설치 전 머리의 실제 좌/우/정면을 판정해 `fish-ui-facing-registry.js`에 ID, R/L/N, 원본 SHA-256을 추가. ID 숫자 범위로 방향을 추측하지 않는다.
- `node human-fishing/qa-fish-ui-heading.cjs`가 전체 원화 해시/등록 누락 및 도감·획득창 예외를 검사한다. 추가 작업 시 `tools/UPLOAD_DEPLOY_GUIDE.md`의 머리 방향 표준을 따른다.

## 수면·기포·미끼·피버 이펙트 (공통 비트맵 표준)
- 저채도 8프레임 수면/물보라/해류와 독립 투명 기포 16개는 `assets/water-fx/`와 `water-fx.js`에서 모든 배경에 공통 적용한다.
- 수면은 문어 앞 레이어, 수중 반투명 그라데이션은 수면 아래. 일반 기포는 수면 위로 그리지 않고 수중 전역에 크기를 달리해 분포시킨다.
- 입수·출수·미끼 놓기·포획 실패·조류·피버·탈출마다 별도의 비트맵 물 피드백. 원래 낚시 판정, 물리, 어종/도감 데이터는 변경하지 않는다.
- 추후 벡터 기포/파문으로 되돌리지 않는다. `node human-fishing/qa-water-fx.cjs` 검증 필수.
