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

진행 중인 **11차 신규 어종**은 [art-review/batch-011/selection.json](art-review/batch-011/selection.json)을 먼저 본다. 6종 모두 대화 ZIP에 개별 RGBA가 있지만 F376·F377은 형태 보완, F378은 합성 이미지 분리본이라 재제작 필요. 11차 GitHub 원화 설치 및 LIVE 등록 0종이다. 실제 PNG는 아직 GitHub 저장소에 없다. 이전 9/10차 실물 이미지를 또 만들지 않는다.
