import { Product, Project, Speaker, GlossaryTerm } from "./types";

export const products: Product[] = [
  { id: "ember", studio: "Superawesome Studio", name: "Ember Saga", genre: "판타지 RPG" },
  { id: "neon", studio: "Superawesome Studio", name: "Neon Drift", genre: "사이버펑크 어드벤처" },
];

export const speakers: Speaker[] = [
  {
    id: "kaela",
    name: "Kaela",
    role: "관문 수비대장",
    persona: "24세 · 직설적이고 경계심이 강함",
    tone: "반말 · 단호",
    register: "반말",
    sampleLine: "넌 날 못 지나가.",
  },
  {
    id: "merchant",
    name: "Old Merchant",
    role: "떠돌이 상인",
    persona: "노년 · 능청스럽고 흥정에 능함",
    tone: "하게체 · 능청",
    register: "하게체",
    sampleLine: "흥정 한번 해보겠나, 나그네?",
  },
  {
    id: "lyra",
    name: "Lyra",
    role: "주인공의 동료 마법사",
    persona: "20세 · 다정하지만 단호한 면이 있음",
    tone: "존댓말 · 차분",
    register: "존댓말",
    sampleLine: "조금만 더 버텨요. 길이 보여요.",
  },
  {
    id: "narration",
    name: "Narration",
    role: "내레이션",
    persona: "3인칭 서술 · 문어체",
    tone: "문어체 · 묘사",
    register: "나레이션",
    sampleLine: "성문이 삐걱이며 열렸다.",
  },
];

export const glossary: GlossaryTerm[] = [
  { id: "g1", source: "Gate", target: "성문", pos: "명사", domain: "지형/구조물", dnt: false, status: "approved", note: "관문 챕터의 거대한 출입문" },
  { id: "g2", source: "Kaela", target: "카엘라", pos: "고유명사", domain: "인물", dnt: true, status: "approved" },
  { id: "g3", source: "Lyra", target: "리라", pos: "고유명사", domain: "인물", dnt: true, status: "approved" },
  { id: "g4", source: "Ember", target: "엠버", pos: "고유명사", domain: "세계관", dnt: true, status: "approved", note: "타이틀명 · 음차 고정" },
  { id: "g5", source: "Warden", target: "수호자", pos: "명사", domain: "직책", dnt: false, status: "approved" },
  { id: "g6", source: "soulstone", target: "혼석", pos: "명사", domain: "아이템", dnt: false, status: "approved" },
  { id: "g7", source: "the Hollow", target: "공허", pos: "고유명사", domain: "지역", dnt: false, status: "proposed", note: "지역명 · 검토중" },
  { id: "g8", source: "bargain", target: "흥정", pos: "동사/명사", domain: "상거래", dnt: false, status: "approved" },
];

export const projects: Project[] = [
  {
    id: "ember-ko",
    productId: "ember",
    name: "Ember Saga — 본편",
    sourceLang: "EN",
    targetLang: "KO",
    segments: [
      { id: "s1", key: "#0140", speakerId: "narration", scene: "act II · sc.3 — 관문", source: "The gate groaned open.", target: "성문이 삐걱이며 열렸다.", status: "approved" },
      { id: "s2", key: "#0141", speakerId: "kaela", scene: "act II · sc.3 — 관문", source: "Halt. No one passes the Warden's gate.", target: "멈춰. 수호자의 성문은 아무도 못 지나가.", status: "approved", charLimit: 24 },
      { id: "s3", key: "#0142", speakerId: "kaela", scene: "act II · sc.3 — 관문", source: "You won't get past me.", target: "넌 날 못 지나가.", status: "in_review", charLimit: 16 },
      { id: "s4", key: "#0143", speakerId: "lyra", scene: "act II · sc.3 — 관문", source: "We don't want trouble. Let us through.", target: "", status: "untranslated" },
      { id: "s5", key: "#0144", speakerId: "kaela", scene: "act II · sc.3 — 관문", source: "Trouble is all anyone brings to the Hollow.", target: "", status: "untranslated" },
      { id: "s6", key: "#0145", speakerId: "merchant", scene: "act II · sc.4 — 시장", source: "Care for a bargain, traveler?", target: "흥정 한번 해보겠나, 나그네?", status: "translating" },
      { id: "s7", key: "#0146", speakerId: "merchant", scene: "act II · sc.4 — 시장", source: "A soulstone, cheap. Only slightly cursed.", target: "혼석일세, 싸게 주지. 저주는 아주 약간뿐이야.", status: "translated" },
      { id: "s8", key: "#0147", speakerId: "narration", scene: "act II · sc.4 — 시장", source: "The market hummed with quiet desperation.", target: "", status: "untranslated" },
      { id: "s9", key: "#0148", speakerId: "lyra", scene: "act II · sc.5 — 야영", source: "Hold on a little longer. I can see the path.", target: "조금만 더 버텨요. 길이 보여요.", status: "approved" },
      { id: "s10", key: "#0149", speakerId: "kaela", scene: "act II · sc.5 — 야영", source: "Don't tell me to hold on.", target: "버티라는 말 따위 하지 마.", status: "rejected", charLimit: 18 },
    ],
  },
];

// ---- helpers ----
export const getProject = (id: string) => projects.find((p) => p.id === id);
export const getProduct = (id: string) => products.find((p) => p.id === id);
export const getSpeaker = (id: string | null) =>
  id ? speakers.find((s) => s.id === id) : undefined;
export const approvedGlossary = glossary.filter((g) => g.status === "approved");
