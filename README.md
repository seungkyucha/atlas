# ATLAS — AI Translation & Localization Assistant

게임/내러티브 콘텐츠 로컬라이제이션 워크스페이스. 용어집·화자 어투·내러티브 맥락을
일관되게 관리하고, Claude를 활용해 컨텍스트 인지형 번역을 수행합니다.

**디자인:** Workstation (밝은 그래파이트 + 인디고, 고밀도 정보설계)
**스택:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · Claude API (`claude-opus-4-8`)

## 기능 (MVP)

- **대시보드** — 프로덕트/프로젝트 진척·품질 요약
- **번역 워크스페이스** — 3단 CAT 에디터(세그먼트 · 에디터 · 컨텍스트), AI 번역, 자동 QA
- **용어집** — 표준 번역어 · DNT · 승인 상태
- **화자 · 어투** — 캐릭터 보이스(존대 등급/말투) — 번역 시 자동 반영

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # (선택) ANTHROPIC_API_KEY 입력
npm run dev                  # http://localhost:3000
```

`ANTHROPIC_API_KEY`가 없어도 데모 모드로 동작합니다(목업 번역).

## 배포 (Railway)

GitHub 레포를 Railway에 연결하면 Nixpacks가 Next.js를 자동 감지합니다.
- 빌드: `npm run build` · 실행: `npm run start` (PORT 자동 바인딩)
- 환경변수: `ANTHROPIC_API_KEY` (선택)

## 다음 단계

Postgres+Prisma 영속화 · 멤버/RBAC · 문서 업로드 자동분석 · TM 의미검색 · LQA 이슈 트래킹.
자세한 계획은 [DEVELOPMENT.md](./DEVELOPMENT.md) 참고.
