// キャラクター「N」の表示。mood: "normal"（ふつう）/ "happy"（よろこび）
// 絵は img/n.webp。よろこんでいるときはハートを出して、ぴょんと跳ねます。
function nCharacterHtml(mood = "normal") {
  const happy = mood === "happy";
  const hearts = happy
    ? `<span class="n-heart h1" aria-hidden="true">♥</span>
       <span class="n-heart h2" aria-hidden="true">♥</span>
       <span class="n-heart h3" aria-hidden="true">♥</span>`
    : "";
  return `<div class="n-char${happy ? " happy" : ""}">
    <img src="img/n.webp" alt="${happy ? "よろこぶN" : "N"}" width="410" height="707">
    ${hearts}
  </div>`;
}
