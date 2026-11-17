// キャラクター「N」の表示。mood: "normal"（ふつう）/ "happy"（よろこび）
// 絵は img/n.png。よろこんでいるときはハートを出して、ぴょんと跳ねます。
function nCharacterHtml(mood = "normal") {
  const happy = mood === "happy";
  const hearts = happy
    ? `<span class="n-heart h1" aria-hidden="true">♥</span>
       <span class="n-heart h2" aria-hidden="true">♥</span>
       <span class="n-heart h3" aria-hidden="true">♥</span>`
    : "";
  return `<div class="n-char${happy ? " happy" : ""}">
    <img src="img/n.png" alt="${happy ? "よろこぶN" : "N"}" width="522" height="900">
    ${hearts}
  </div>`;
}
