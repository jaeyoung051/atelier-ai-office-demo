# Pixffice 로컬 마케팅 MVP 2

기존 승인된 픽셀 사무실 UI에 Node.js/TypeScript, SQLite와 Gemini를 연결한 개인 PC용 앱입니다. React/TypeScript 프론트 원본은 없어 기존 정적 HTML/JavaScript/CSS를 이어 사용합니다.

## 실행

Node.js 22.20.x가 필요합니다. 외부 npm 의존 패키지 설치 없이 실행합니다.

```sh
cp .env.example .env
# .env의 GEMINI_API_KEY에 본인 키 입력
npm run db:init
npm test
npm run app:start
```

기본 주소 http://127.0.0.1:4313/ . 종료는 `npm run app:stop`. Mac은 시작.command / 종료.command / API설정.command도 사용할 수 있습니다. 최초 DB에는 더미 직원 4명과 업무기준 6개만 등록합니다. 마케팅 화면의 '가상 사례 2개 넣기'로 테스트 사례를 생성할 수 있습니다.

## 기능

- 역할지시서·업무기준의 버전별 SQLite 저장
- 사례·사진 저장(JPEG/PNG/WebP, 장당 8MB)
- 사례 기반 Gemini 원고 작성과 채널별 사진·제목·본문·해시태그 편집
- Instagram/블로그/Threads별 승인·반려와 반려 사유 기반 본문 재작성
- 승인본 TXT/사진 포함 ZIP 내보내기, 수동 게시 URL 기록
- DB 확인 화면 `/database`, 전체 백업·복원 `/maintenance`
- DB+사진 전체 ZIP 백업, 새 폴더 검증 복원, 다음 실행 데이터 선택

현재 전체 백업은 250MB 이하의 자체 무압축 ZIP만 지원합니다. API 키는 백업에 포함하지 않습니다. 백업은 암호화되지 않습니다.

## 검증과 범위

자동 테스트 14개 그룹 통과. 실제 Gemini 생성·재작성, 채널별 승인·내보내기, 별도 폴더 복원 실행과 사진 바이트 일치를 확인했습니다. 친구 Mac M1 및 Windows 실기기 검증은 남아 있습니다.

SNS 계정 연결/자동·예약 게시, 사진 AI 분석/크롭/EXIF 제거, 다중 사용자 인증은 아직 없습니다. 공개 루트 UI는 기존 데모이며, 이 앱은 로컬에서만 실행합니다. 키와 고객 DB·사진·백업을 GitHub나 공개 호스팅에 올리지 마세요.

자세한 안내: [친구 PC 시작 안내](친구_PC_시작안내.md), [기능 현황 PDF](../docs/MVP2-guide.pdf).
