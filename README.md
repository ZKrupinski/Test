# 열혈강호 – 궁 (Crimson Bow) — 플레이테스트

이 저장소는 기존 채팅 프로젝트 "열혈강호 – 궁"의 **독립 v2.3 사운드 플레이테스트**를 기반으로 제작한 자유 조준·적 실시간 이동 적용본입니다. **원래 게시된 crimson-bow.blondcarp2.chatgpt.site v42 코드가 아닙니다.**

## 실행
- [index.html](./index.html) 다운로드 후 브라우저에서 실행 (이미지/사운드 데이터 내장, 오프라인 가능).
- GitHub Pages를 저장소 설정에서 main / (root)로 활성화하면 웹 실행 URL을 사용할 수 있습니다.

## 조작
- 빈 전장 클릭/드래그: 각도와 장력 조준 후 유지
- 발사 버튼 또는 Space: 화살 발사 (비행 중 적 이동 멈춤)
- 적 탭: 기존 자동 조준·발사
- 일반 적: 느린 왕복 이동 / 정예: 점프 / 보스: 경공 이동
- 진행 턴·스테이지에 따라 이동 난이도 상승

## 파일
- `index.html`: 통합된 독립 실행형 게임 (v2.3 playtest + motion aim patch v2)
- `src/crimson_bow_motion_aim_patch_v2.js`: 비파괴 오버레이 패치
- `src/integrate_playtest.py`: 재통합 스크립트
- `src/qa_motion_patch.cjs`: 시뮬레이션 QA

### 주의
정식 게임 원본과 연결하지 않았으므로, 이 버전을 정식 서비스 업데이트라고 주장하지 않습니다.
원본 HTML에 포함된 이미지와 효과음은 별도 이용 조건 확인이 필요할 수 있습니다.
