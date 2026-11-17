// キャラクター「N」の絵（SVG）。mood: "normal"（ふつう）/ "happy"（よろこび）
const N_COLORS = {
  hair: "#4a2e2a",
  skin: "#ffe3d3",
  top: "#f4a6b8",
  leggings: "#6b4e71",
  scrunchie: "#e86a8f",
  cheek: "#f7a1b5",
};

function nCharacterSvg(mood = "normal") {
  const c = N_COLORS;
  const happy = mood === "happy";

  // 腕：ふつうはバレエの「アン・バ」（下で丸く）、よろこびは「アン・オー」（頭の上で丸く）
  const arms = happy
    ? `<path d="M64 110 Q34 62 70 16" /><path d="M96 110 Q126 62 90 16" />`
    : `<path d="M64 110 Q50 140 72 160" /><path d="M96 110 Q110 140 88 160" />`;

  const eyes = happy
    ? `<path d="M64 67 Q69 61 74 67" fill="none" stroke="${c.hair}" stroke-width="2.6" stroke-linecap="round"/>
       <path d="M86 67 Q91 61 96 67" fill="none" stroke="${c.hair}" stroke-width="2.6" stroke-linecap="round"/>`
    : `<ellipse cx="69" cy="66" rx="3.2" ry="4.2" fill="${c.hair}"/>
       <ellipse cx="91" cy="66" rx="3.2" ry="4.2" fill="${c.hair}"/>
       <circle cx="70.2" cy="64.6" r="1.1" fill="#fff"/><circle cx="92.2" cy="64.6" r="1.1" fill="#fff"/>`;

  const mouth = happy
    ? `<path d="M74 75 Q80 84 86 75 Z" fill="${c.scrunchie}"/>`
    : `<path d="M76 76 Q80 79.5 84 76" fill="none" stroke="${c.hair}" stroke-width="2" stroke-linecap="round"/>`;

  const sparkles = happy
    ? `<g fill="#f2b544">
         <path d="M22 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/>
         <path d="M136 92 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z"/>
         <path d="M132 34 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2z"/>
       </g>`
    : "";

  return `<svg viewBox="0 0 160 240" role="img" aria-label="${happy ? "よろこぶN" : "N"}" xmlns="http://www.w3.org/2000/svg">
    ${sparkles}
    <!-- 足（1番ポジション風につま先を外に） -->
    <rect x="66" y="150" width="12" height="74" rx="6" fill="${c.leggings}"/>
    <rect x="82" y="150" width="12" height="74" rx="6" fill="${c.leggings}"/>
    <ellipse cx="66" cy="226" rx="10" ry="4.5" fill="#fff" stroke="#e9d6dc"/>
    <ellipse cx="94" cy="226" rx="10" ry="4.5" fill="#fff" stroke="#e9d6dc"/>
    <!-- からだ -->
    <path d="M62 110 Q80 101 98 110 L95 152 Q80 156 65 152 Z" fill="${c.top}"/>
    <!-- 腕 -->
    <g fill="none" stroke="${c.skin}" stroke-width="7" stroke-linecap="round">${arms}</g>
    <!-- 長い首 -->
    <rect x="75" y="86" width="10" height="20" rx="4" fill="${c.skin}"/>
    <!-- おだんご -->
    <circle cx="80" cy="25" r="14" fill="${c.hair}"/>
    <ellipse cx="80" cy="37" rx="10" ry="4" fill="${c.scrunchie}"/>
    <!-- 顔 -->
    <circle cx="80" cy="62" r="29" fill="${c.skin}"/>
    <path d="M51 64 C48 38 64 32 80 32 C96 32 112 38 109 64 C104 50 94 45 84 47 C80 52 72 54 62 52 C57 55 53 59 51 64 Z" fill="${c.hair}"/>
    ${eyes}
    <ellipse cx="62" cy="74" rx="5.5" ry="3.2" fill="${c.cheek}" opacity=".55"/>
    <ellipse cx="98" cy="74" rx="5.5" ry="3.2" fill="${c.cheek}" opacity=".55"/>
    ${mouth}
  </svg>`;
}
