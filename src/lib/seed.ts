import {
  Product,
  Project,
  Speaker,
  GlossaryTerm,
  ContextNote,
  Translation,
  SegmentStatus,
} from "./types";

export interface DB {
  products: Product[];
  projects: Project[];
  speakers: Speaker[];
  glossary: GlossaryTerm[];
  contexts: ContextNote[];
}

const tr = (text: string, status: SegmentStatus): Translation => ({ text, status });

export function seed(): DB {
  const products: Product[] = [
    {
      id: "ember",
      studio: "Superawesome Studio",
      name: "Ember Saga",
      genre: "판타지 RPG",
      sourceLang: "en",
      targetLangs: ["ko", "ja", "zh-CN"],
      engine: "claude",
      model: "claude-opus-4-8",
    },
    {
      id: "neon",
      studio: "Superawesome Studio",
      name: "Neon Drift",
      genre: "사이버펑크 어드벤처",
      sourceLang: "en",
      targetLangs: ["ko", "es"],
      engine: "openai",
      model: "gpt-4o",
    },
  ];

  const speakers: Speaker[] = [
    {
      id: "kaela",
      productId: "ember",
      name: "Kaela",
      role: "관문 수비대장",
      persona: "24세 · 직설적이고 경계심이 강함",
      tones: {
        ko: { tone: "반말 · 단호", register: "반말", sampleLine: "넌 날 못 지나가." },
        ja: { tone: "ぞんざい · 断固", register: "タメ口", sampleLine: "あんたは通さない。" },
        "zh-CN": { tone: "直接 · 强硬", register: "随意", sampleLine: "你过不去。" },
      },
    },
    {
      id: "merchant",
      productId: "ember",
      name: "Old Merchant",
      role: "떠돌이 상인",
      persona: "노년 · 능청스럽고 흥정에 능함",
      tones: {
        ko: { tone: "하게체 · 능청", register: "하게체", sampleLine: "흥정 한번 해보겠나, 나그네?" },
        ja: { tone: "老獪 · 軽妙", register: "丁寧", sampleLine: "ひとつ取引でもどうかね、旅人さん？" },
        "zh-CN": { tone: "圆滑 · 诙谐", register: "客气", sampleLine: "做笔买卖如何，旅人？" },
      },
    },
    {
      id: "lyra",
      productId: "ember",
      name: "Lyra",
      role: "동료 마법사",
      persona: "20세 · 다정하지만 단호한 면이 있음",
      tones: {
        ko: { tone: "존댓말 · 차분", register: "존댓말", sampleLine: "조금만 더 버텨요. 길이 보여요." },
        ja: { tone: "丁寧 · 穏やか", register: "丁寧", sampleLine: "もう少しだけ。道が見えます。" },
        "zh-CN": { tone: "礼貌 · 沉稳", register: "礼貌", sampleLine: "再坚持一下，我看到路了。" },
      },
    },
    {
      id: "narration",
      productId: "ember",
      name: "Narration",
      role: "내레이션",
      persona: "3인칭 서술 · 문어체",
      tones: {
        ko: { tone: "문어체 · 묘사", register: "나레이션" },
        ja: { tone: "文語 · 描写", register: "ナレーション" },
        "zh-CN": { tone: "书面 · 描写", register: "旁白" },
      },
    },
  ];

  const glossary: GlossaryTerm[] = [
    { id: "g1", productId: "ember", source: "Gate", pos: "명사", domain: "지형/구조물", dnt: false, status: "approved", note: "관문의 거대한 출입문", targets: { ko: "성문", ja: "城門", "zh-CN": "城门" } },
    { id: "g2", productId: "ember", source: "Kaela", pos: "고유명사", domain: "인물", dnt: true, status: "approved", targets: { ko: "카엘라", ja: "カエラ", "zh-CN": "凯拉" } },
    { id: "g3", productId: "ember", source: "Lyra", pos: "고유명사", domain: "인물", dnt: true, status: "approved", targets: { ko: "리라", ja: "リラ", "zh-CN": "莉拉" } },
    { id: "g4", productId: "ember", source: "Ember", pos: "고유명사", domain: "세계관", dnt: true, status: "approved", note: "타이틀명 · 음차 고정", targets: { ko: "엠버", ja: "エンバー", "zh-CN": "余烬" } },
    { id: "g5", productId: "ember", source: "Warden", pos: "명사", domain: "직책", dnt: false, status: "approved", targets: { ko: "수호자", ja: "守護者", "zh-CN": "守护者" } },
    { id: "g6", productId: "ember", source: "soulstone", pos: "명사", domain: "아이템", dnt: false, status: "approved", targets: { ko: "혼석", ja: "魂石", "zh-CN": "魂石" } },
    { id: "g7", productId: "ember", source: "the Hollow", pos: "고유명사", domain: "지역", dnt: false, status: "proposed", note: "지역명 · 검토중", targets: { ko: "공허", ja: "うつろ", "zh-CN": "空寂" } },
    { id: "g8", productId: "ember", source: "bargain", pos: "동사/명사", domain: "상거래", dnt: false, status: "approved", targets: { ko: "흥정", ja: "取引", "zh-CN": "交易" } },
  ];

  const contexts: ContextNote[] = [
    {
      id: "c1",
      productId: "ember",
      scene: "act II · sc.3 — 관문",
      arc: "공허 진입",
      note: "일행이 공허로 들어가는 유일한 관문 앞. 카엘라가 길을 막아선다. 긴장감 있고 짧은 대사 위주.",
      guides: { ko: "짧고 단호하게. 카엘라는 반말.", ja: "短く断固として。", "zh-CN": "简短强硬。" },
    },
    {
      id: "c2",
      productId: "ember",
      scene: "act II · sc.4 — 시장",
      arc: "공허 진입",
      note: "공허 변두리 시장. 음울하지만 활기. 상인의 능청스러운 호객.",
      guides: { ko: "능청스럽고 구어적으로.", ja: "軽妙な口調で。", "zh-CN": "诙谐口语化。" },
    },
  ];

  const ember: Project = {
    id: "ember-main",
    productId: "ember",
    name: "Ember Saga — 본편",
    segments: [
      { id: "s1", projectId: "ember-main", key: "#0140", speakerId: "narration", scene: "act II · sc.3 — 관문", contextId: "c1", source: "The gate groaned open.", translations: { ko: tr("성문이 삐걱이며 열렸다.", "approved"), ja: tr("城門がきしみながら開いた。", "approved"), "zh-CN": tr("城门吱呀作响地打开了。", "translated") } },
      { id: "s2", projectId: "ember-main", key: "#0141", speakerId: "kaela", scene: "act II · sc.3 — 관문", contextId: "c1", source: "Halt. No one passes the Warden's gate.", translations: { ko: tr("멈춰. 수호자의 성문은 아무도 못 지나가.", "approved"), ja: tr("止まれ。守護者の城門は誰も通さない。", "in_review"), "zh-CN": tr("", "untranslated") }, charLimits: { ko: 24 } },
      { id: "s3", projectId: "ember-main", key: "#0142", speakerId: "kaela", scene: "act II · sc.3 — 관문", contextId: "c1", source: "You won't get past me.", translations: { ko: tr("넌 날 못 지나가.", "in_review"), ja: tr("あんたは通さない。", "translated"), "zh-CN": tr("", "untranslated") }, charLimits: { ko: 16 } },
      { id: "s4", projectId: "ember-main", key: "#0143", speakerId: "lyra", scene: "act II · sc.3 — 관문", contextId: "c1", source: "We don't want trouble. Let us through.", translations: { ko: tr("", "untranslated"), ja: tr("", "untranslated"), "zh-CN": tr("", "untranslated") } },
      { id: "s5", projectId: "ember-main", key: "#0144", speakerId: "kaela", scene: "act II · sc.3 — 관문", contextId: "c1", source: "Trouble is all anyone brings to the Hollow.", translations: { ko: tr("", "untranslated"), ja: tr("", "untranslated"), "zh-CN": tr("", "untranslated") } },
      { id: "s6", projectId: "ember-main", key: "#0145", speakerId: "merchant", scene: "act II · sc.4 — 시장", contextId: "c2", source: "Care for a bargain, traveler?", translations: { ko: tr("흥정 한번 해보겠나, 나그네?", "translating"), ja: tr("", "untranslated"), "zh-CN": tr("", "untranslated") } },
      { id: "s7", projectId: "ember-main", key: "#0146", speakerId: "merchant", scene: "act II · sc.4 — 시장", contextId: "c2", source: "A soulstone, cheap. Only slightly cursed.", translations: { ko: tr("혼석일세, 싸게 주지. 저주는 아주 약간뿐이야.", "translated"), ja: tr("", "untranslated"), "zh-CN": tr("", "untranslated") } },
      { id: "s8", projectId: "ember-main", key: "#0147", speakerId: "narration", scene: "act II · sc.4 — 시장", contextId: "c2", source: "The market hummed with quiet desperation.", translations: { ko: tr("", "untranslated"), ja: tr("", "untranslated"), "zh-CN": tr("", "untranslated") } },
      { id: "s9", projectId: "ember-main", key: "#0148", speakerId: "lyra", scene: "act II · sc.5 — 야영", source: "Hold on a little longer. I can see the path.", translations: { ko: tr("조금만 더 버텨요. 길이 보여요.", "approved"), ja: tr("もう少しだけ。道が見えます。", "approved"), "zh-CN": tr("再坚持一下，我看到路了。", "approved") } },
      { id: "s10", projectId: "ember-main", key: "#0149", speakerId: "kaela", scene: "act II · sc.5 — 야영", source: "Don't tell me to hold on.", translations: { ko: tr("버티라는 말 따위 하지 마.", "rejected"), ja: tr("", "untranslated"), "zh-CN": tr("", "untranslated") }, charLimits: { ko: 18 } },
    ],
  };

  return { products, projects: [ember], speakers, glossary, contexts };
}
