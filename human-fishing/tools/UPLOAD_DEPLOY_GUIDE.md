# 인간낚시 업로드·배포 기준 — Chat / Work 공통

최종 기록: 2026-11-08 (한국 시간). 대상: `ZKrupinski/Test`, `main`, GitHub Pages.
이 문서는 이번에 실제 성공한 배포 절차를 이후 Chat·Work의 업로드 작업에 재사용하기 위한 기준이다.
작업 시작 시 최신 main과 이 문서를 읽는다. 과거 대화의 완료 문구나 어종 수만으로 현재 상태를 판단하지 않는다.

## 기본 경로: 연결된 GitHub 도구로 직접 설치

연결된 GitHub 도구에 바이너리 blob 생성과 tree/commit/ref 갱신 기능이 있으면 이 경로를 우선한다.
**“Chat에서는 PNG를 못 올린다”, “반드시 사용자가 토큰을 입력해야 한다”라고 단정하지 않는다.**
먼저 현재 세션의 도구와 권한을 확인한다. 기능이 없는 세션에서는 가능하다고 주장하지 않고 아래 ZIP 업로더 경로를 이용한다.
채팅에 GitHub 토큰을 붙여넣도록 요구하지 않는다.

1. 배포할 ZIP의 최신 버전을 확보하고 manifest와 실제 PNG를 읽는다.
2. 최신 main 커밋과 tree를 읽고, 적용할 ID·학명·한글명·지역·크기·희귀도·행동 및 기존 저장과의 충돌을 검사한다.
3. 해당 배치의 설치 workflow에 있는 검증을 동일하게 수행한다. 개수, 파일명, SHA-256, RGBA, 해상도, 투명 여백, 원본 훼손 및 덮어쓰기 여부를 확인한다. 승인 원본을 축소·재생성하지 않는다.
4. PNG 바이트를 base64로 인코딩해 GitHub `create_blob(encoding="base64")`로 올린다. 아래 전송 무결성 규칙을 반드시 따른다.
5. 기존 tree를 `base_tree_sha`로 사용하여 PNG, installed-manifest, 등록 queue, ready.js, 필요한 코드/검사 변경을 **하나의 tree와 commit**으로 묶는다. 다른 파일을 누락한 새 tree로 main을 교체하지 않는다.
6. 로컬 검사를 통과하고 모든 blob의 무결성이 확인된 뒤 `create_commit`을 호출한다. 부모는 확인한 main HEAD이다.
7. `update_ref(branch_name="main", expected_sha=확인한_HEAD, force=false)`로 반영한다. HEAD가 바뀌면 최신 변경을 다시 읽고 그 위에 적용한다. 강제 덮어쓰기는 하지 않는다.
8. GitHub Actions의 게임 QA와 Pages 배포를 해당 커밋 기준으로 각각 확인한다.
9. 실제 Pages의 새 PNG들을 다운로드해 SHA-256이 원본과 같은지 확인하고, ready.js 활성화·새 카탈로그 개수·실제 로딩 경로를 확인한다.
10. 성공한 커밋을 붙인 게임 링크와 실제 완료 범위를 전달한다. 코드 반영, 이미지 설치, QA 통과, 배포 성공은 별개 상태다.

사용하는 GitHub 도구 이름·인자명은 세션에 제공된 실제 스키마를 따른다.
로컬 git/CLI 사용이 가능한 경우에도 같은 검증과 충돌 방지 기준을 유지한다.

## 대용량 PNG 전송 무결성 — 이번 오류의 원인과 해결

이번 실행 환경에서 큰 base64 문자열을 명령 출력으로 한 번에 전달하자 약 1 MiB 부근에서 출력이 잘렸다.
프로세스 exit code가 0이고 출력의 앞·뒤가 정상이어도 중간 데이터가 빠질 수 있었다.
`max_output_tokens`를 크게 지정하거나 오류 문자열이 없는지만 보는 방법은 검증이 아니다.

- 도구 출력으로 바이트를 전달할 때는 base64를 **500,000자 이하의 조각**으로 읽는다. 이는 이번에 검증한 보수적 조각 크기이며 모든 환경의 고정 제한을 뜻하지 않는다.
- 각 조각의 실제 길이가 요청한 길이와 같은지 검사하고, 순서대로 도구 실행 메모리에서 합친다. 원문을 모델에게 출력해 복사·재작성하지 않는다.
- 최종 길이는 `4 * ceil(원본 바이트 수 / 3)`과 일치해야 한다.
- 로컬 원본의 Git blob SHA를 `git hash-object <PNG>`로 계산한다.
- `create_blob`이 반환한 SHA가 그 값과 **정확히 일치할 때만** tree에 넣는다. Git blob SHA와 manifest의 SHA-256은 다른 값이다.
- 하나라도 불일치하면 branch 갱신 전에 중단하고 해당 blob을 재전송한다.
- 게시 후에도 실제 서비스 바이트의 SHA-256을 manifest와 비교한다. HTTP 200이나 파일 존재만으로 성공 처리하지 않는다.

Git blob SHA는 파일 내용만의 단순 SHA-1이 아니라 Git 헤더를 포함한 해시다. 직접 재구현보다 `git hash-object`를 사용한다.

## 등록·중복 제거·캐시 기준

- 이전 중복/색상 변형 물고기의 ID 범위와 새 원본 ID가 겹칠 수 있다.
- 중복 제거 검사에서 F305–F904 같은 범위를 무조건 금지하면 검증된 새 원본도 거부한다.
- 새 원본은 설치 manifest의 ID 및 SHA-256과 실제 파일이 일치하는 경우에만 허용한다. 검사 자체를 삭제하거나 옛 변형을 일괄 허용하지 않는다.
- ready.js는 이미지와 등록 데이터가 모두 검증된 커밋에서 활성화한다. 일부만 올린 상태에서 먼저 true로 바꾸지 않는다.
- installed-manifest와 queue의 LIVE 상태는 실제 설치 결과와 일치시킨다. 제작 후보를 도감 수에 더하지 않는다.
- 퇴역 ID를 재사용할 때는 이미지 URL의 버전도 바꿔 브라우저의 옛 색상 변형 캐시를 피한다.
- 현재 새 원본 경로는 `assets/fish/individual/Fxxx.png?v=20261108-original-expansion`이다. 같은 ID의 그림을 다시 교체하면 버전을 갱신한다.
- 원래 승인된 리소스 및 저장 호환성을 유지하고 Cloudflare로 배포하지 않는다.

## 대체 경로: 기존 웹 ZIP 업로더

[통합 업로더](https://zkrupinski.github.io/Test/human-fishing/tools/fish-bitmap-uploader.html)는 사용자가 직접 ZIP을 올릴 때 계속 사용한다.
브라우저는 토큰을 GitHub API로 직접 보내며 채팅에 공유하거나 영구 저장하지 않는다.

| ZIP 이름 | 설치 workflow |
| --- | --- |
| fish-art-import.zip | install-human-fish-art.yml |
| fish-art-import-batch-001.zip | install-fish-art-batch001.yml |
| fish-art-import-batch-023.zip | install-fish-art-batch023.yml |
| fish-art-import-batch-004.zip | install-fish-art-batch004.yml |
| fish-art-import-batch-011.zip | install-fish-art-batch011.yml (11차 F373–F378 6종, 최종 승인 F378 반영) |
| special-creature-import.zip | install-special-creature-art.yml |

ZIP은 `human-fishing/`에 정확한 이름으로 업로드한다.
ZIP 전송 완료는 설치 완료가 아니다. 설치 workflow, 생성된 이미지/ready 상태, 후속 QA와 Pages 배포를 확인한다.
이미 직접 설치한 배치를 다시 ZIP 설치하지 않는다. 기존 설치기가 덮어쓰기를 거부할 수 있으므로 먼저 현재 상태를 읽는다.
설치 workflow의 bot 커밋 후 후속 workflow가 자동 실행됐다고 가정하지 말고 실제 실행 기록으로 확인한다.

## 성공 사례: 4차 5종

- 원본: `fish-art-import-batch-004.zip`
- 설치 ID: F329–F333
- 어종: 롱노즈가아, 아프리카보니텅, 거친머리그레나디어, 돌묵상어, 유니콘쥐치
- 당시 활성 도감: 291 → 296종. 향후에는 최신 실행 카탈로그로 다시 계산한다.
- 최종 성공 커밋: [de256e0127ec1b1b1176b8aa8ae45f6f99f0f4d9](https://github.com/ZKrupinski/Test/commit/de256e0127ec1b1b1176b8aa8ae45f6f99f0f4d9)
- [게임 QA 성공](https://github.com/ZKrupinski/Test/actions/runs/42451109132)
- [Pages 배포 성공](https://github.com/ZKrupinski/Test/actions/runs/42451108406)
- 서비스 PNG 5장 모두 원본 SHA-256 일치 및 `HumanFishingFishExpansion004Ready=true` 확인.
- 초기 전송의 잘린 PNG 3장을 발견해 재전송했으며, 최종 성공 기준은 위 커밋이다.

## Chat 인계

사용자가 “업로드”, “게임에 적용”, “이어서 마무리”를 요청하면 이 문서와 최신 저장소 상태를 함께 확인한다.
이 문서는 모든 Chat 세션에 자동 주입되는 전역 설정이 아니다. 저장소를 읽을 수 있는 세션에서
`human-fishing/AGENTS.md`, README 및 업로더의 링크를 통해 같은 기준을 찾도록 한다.
