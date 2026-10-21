# 열혈강호 – 궁 · Motion & Aim v2 통합 플레이테스트

**자유 조준 + 살아 움직이는 적을 적용한 독립 v2.3 게임 실행본**입니다. 원본 [정식 사이트](https://crimson-bow.blondcarp2.chatgpt.site)와는 별개의 플레이테스트이며 정식 사이트 코드는 변경하지 않았습니다.

## 실행

- [GitHub Pages 실행 링크](https://zkrupinski.github.io/Test/) — Pages가 활성화되고 Actions 배포에 성공한 경우 접속 가능
- [GitHub 소스 저장소](https://github.com/ZKrupinski/Test)
- [단일 HTML 파일](https://github.com/ZKrupinski/Test/blob/main/index.html)은 경량 로더입니다. 단독으로 저장해 오프라인 실행하는 파일이 **아닙니다**. 서버 또는 Pages에서 `chunks/` 폴더와 함께 열어야 합니다.
- 채팅에서 받은 `..._free_aim_motion_v2.html`은 오프라인으로도 실행 가능한 단일 통합 HTML입니다.

## 기능

- 빈 전장 클릭/드래그로 각도와 장력을 조절한 뒤, 조준 유지 / 발사 버튼 사격
- 적 탭의 기존 자동 조준·발사 유지, 키보드 Space 발사
- 일반 적 왕복 이동 / 정예 점프 / 보스 경공 이동
- 단계·턴 진행에 따른 난이도 증가
- 화살 비행 중 적 이동 고정 및 종료 후 재개
- 헤드샷, 시우천하, 지옥파멸시, 산사태, 음향 등 기존 독립 테스트 기능 보존

## 파일 구성

- `index.html`: 원본 HTML과 패치를 불러와 합치는 온라인 로더
- `chunks/source_000.txt` ~ `source_014.txt`: 기존 v2.3 HTML의 **원문을 정확히 분할**한 15개 파일
- `src/crimson_bow_motion_aim_patch_v2.js`: 자유 조준 및 적 이동 패치
- `src/integrate_playtest.py`: 독립 HTML에 패치를 합치는 빌드 스크립트 (통합 시 원본과 같은 디렉터리에 패치 파일을 배치)
- `src/qa_motion_patch.cjs`: 자동 검증 (12개 검사 통과)
- `.github/workflows/pages.yml`: GitHub Pages 자동 배포 작업 정의

## 검수 결과

- GitHub에 업로드된 게임 원문 15개 조각을 다시 읽어 **원본 6,952,384글자와 완전 일치** 확인
- 독립 HTML 통합본 생성 및 `node qa_motion_patch.cjs`: **12 checks PASS**
- 브라우저 실기 구동과 GitHub Pages 배포 성공 여부는 별도 확인 필요

## 주의
서버에 `index.html`만 업로드하면 안 됩니다. `chunks/`와 `src/` 파일도 함께 있어야 합니다. 라이브 정식 사이트 v42의 수정이나 배포가 아닙니다.
