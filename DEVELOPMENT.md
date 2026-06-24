# ATLAS — 최종 개발 계획 (MVP v0.1)

> AI Translation & Localization Assistant — 게임/내러티브 콘텐츠 로컬라이제이션 워크스페이스
> 디자인 확정: **Workstation** (밝은 그래파이트 + 인디고 액센트, 고밀도 정보설계)

## 1. 목표 (이번 MVP 범위)

"일관된 번역을 만들고 확정하는 최소 루프"를 실제로 동작하는 웹앱으로 구현하고 Railway에 배포한다.

| 포함 (MVP) | 제외 (다음 단계) |
|---|---|
| 대시보드 (프로덕트/프로젝트·진척·품질 요약) | 실DB 영속화(현재 시드 데이터) |
| 번역 워크스페이스 (3단 CAT 에디터) | 멤버/RBAC 인증 |
| **AI 번역 API** (용어집·화자 어투·맥락 주입) | 문서 업로드 자동분석 파이프라인 |
| 용어집(Glossary) 뷰 | LQA 이슈 트래킹 워크플로우 |
| 화자(Speaker)·어투 뷰 | TM 의미검색(pgvector) |
| 자동 QA 표시(용어/길이/어투) | 실시간 공동편집 |

## 2. 아키텍처

```
Next.js 14 (App Router, TS)  ──  UI (Workstation 디자인 시스템, Tailwind)
        │
        ├─ /app                 페이지(대시보드/워크스페이스/용어집/화자)
        ├─ /app/api/translate   서버 라우트 → Claude API (claude-opus-4-8)
        └─ /lib                 타입 · 시드 데이터 · Anthropic 클라이언트
```

- **프론트/백엔드**: Next.js 단일 앱 (서버 라우트로 AI 호출 → API 키 노출 없음)
- **AI**: `@anthropic-ai/sdk`, 모델 `claude-opus-4-8`. 컨텍스트(용어집+화자 어투+씬 노트)를 시스템 프롬프트에 주입한 컨텍스트 인지형 번역.
- **데이터**: MVP는 `src/lib/data.ts` 시드 데이터 (배포 안정성 우선). 데이터 접근을 한 곳에 모아 추후 Postgres+Prisma 교체 용이.
- **자동 QA**: 규칙 기반(용어 준수·글자수·존/반말 어미) 클라이언트 검증.

## 3. 데이터 모델 (MVP)

`Product → Project → Document → Segment` + `Speaker`, `GlossaryTerm`.
세그먼트는 화자/씬 태그, 상태(미번역→AI초벌→번역중→번역완료→감수중→승인)를 가진다.

## 4. AI 번역 파이프라인

1. 클라이언트가 원문 + 화자 + 적용 용어 + 씬 노트를 `/api/translate`로 전송
2. 서버가 시스템 프롬프트 조립: 언어쌍, 화자 어투 규칙, 용어집(원어→번역어, DNT), 맥락
3. `claude-opus-4-8` 호출 → 번역 + (옵션) 대안 제안
4. `ANTHROPIC_API_KEY` 미설정 시: 데모용 목업 응답으로 graceful degrade (배포 후에도 동작)

## 5. 배포 (Railway)

- GitHub: `seungkyucha/atlas` 레포에 푸시
- Railway: GitHub 연동 또는 CLI(`railway up`)로 빌드/배포
- 빌드: Nixpacks 자동 감지(Next.js) → `npm run build` → `npm start` ($PORT 바인딩)
- 환경변수: `ANTHROPIC_API_KEY` (선택 — 없으면 데모 모드)

## 6. 실행

```bash
npm install
npm run dev     # http://localhost:3000
npm run build && npm start
```
