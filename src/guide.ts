import { makeBoard, makeItem, id, type Board, type Item } from "./model";
export const greetings = [
  "今天，有什麼想法想整理一下？",
  "從一個念頭開始就好。",
  "今天想規劃什麼？",
  "把腦中的想法，放到這裡吧。",
];
export function refreshGreeting(b: Board): Board {
  if (!b.guide) return b;
  const n = b.nodes.find((n) => n.id === b.guide!.greetingId);
  if (n) {
    const choices = greetings.filter((s) => s !== n.text);
    n.text = choices[Math.floor(Math.random() * choices.length)];
  }
  return b;
}
export function welcomeBoard(): Board {
  const b = makeBoard("歡迎使用 Mind Canvas");
  b.viewport = { x: 70, y: 60, zoom: 0.55 };
  b.treeStyle.color = "#3b82f6";
  const put = (
    kind: Item["kind"],
    x: number,
    y: number,
    text: string,
    width = 300,
    height = 110,
  ) => {
    const n = makeItem(kind, { x, y }, text);
    Object.assign(n, {
      width,
      height,
      maxWidth: width,
      autoSize: false,
      border: kind === "text" ? "transparent" : "#c5d5ef",
      color: "#23344c",
    });
    b.nodes.push(n);
    return n;
  };
  const title = put("text", 0, 0, "歡迎來到 Mind Canvas", 650, 64);
  title.fontSize = 34;
  title.bold = true;
  title.color = "#293b35";
  const greeting = put("text", 0, 65, greetings[0], 650, 44);
  greeting.fontSize = 20;
  greeting.color = "#293b35";
  put(
    "text",
    0,
    118,
    "PD-1 Center 的自由思考工具 · 不必一次想清楚，先放下一個念頭。",
    1000,
    40,
  ).color = "#293b35";
  const section = (x: number, y: number, text: string) => {
    const n = put("text", x, y, text, 330, 45);
    n.bold = true;
    n.fontSize = 22;
    n.color = "#293b35";
  };
  section(0, 205, "01 先動手玩一下");
  put(
    "sticky",
    0,
    260,
    "試著拖動我！\n雙擊文字就能修改。\n選取後拖曳邊角，調整大小。",
    310,
    140,
  );
  put(
    "text",
    0,
    420,
    "空白處拖曳：框選\nShift＋點擊：多選\n滾輪／中鍵或右鍵拖曳：平移\nCtrl＋滾輪：縮放\nCtrl＋Z：復原 · /：快速命令",
    325,
    160,
  ).color = "#293b35";
  section(390, 205, "02 讓想法長出分支");
  const root = put("mind", 390, 290, "旅行計畫", 155, 56);
  root.background = "#eaf2ff";
  root.bold = true;
  ["想去的地方", "預算與準備"].forEach((text, order) => {
    const n = put("mind", 610, 260 + order * 100, text, 180, 56);
    n.parentId = root.id;
    n.order = order;
    n.mode = "Auto";
  });
  put(
    "text",
    390,
    420,
    "選取「旅行計畫」後按 Tab 新增子節點。\nEnter 同層 · Space 收合／展開。\n拖曳會帶著整枝移動。\nAlt＋拖入另一節點才會重新掛載。",
    400,
    140,
  ).color = "#293b35";
  section(880, 205, "03 把數字也放進思考");
  const calc = put("calculator", 880, 265, "旅行預算", 280, 430);
  calc.expression = "(1800+650)*2";
  calc.result = "4900";
  section(0, 645, "04 自由串起一個流程");
  const steps = ["蒐集靈感", "安排下一步", "動手完成"].map((s, i) =>
    put("rectangle", i * 205, 710, s, 170, 60),
  );
  for (let i = 0; i < 2; i++)
    b.relations.push({
      id: id(),
      source: steps[i].id,
      target: steps[i + 1].id,
      color: "#3b82f6",
      width: 2,
      dashed: false,
    });
  put(
    "text",
    0,
    800,
    "流程是可編輯的圖形與關聯線。雙擊修改步驟；\n從底部新增矩形，再拖邊緣圓點連接。\n圖形、便條、文字可以混用，不需要全都變成心智圖。",
    600,
    120,
  ).color = "#293b35";
  section(680, 645, "05 保存，並留下備份");
  put(
    "sticky",
    680,
    710,
    "左側「新的白板」開始自己的計畫。\n點白板名稱即可切換，自動保存各自內容與視角。\n上方匯出 JSON；匯入會建立新白板，不覆蓋原資料。\n計算機的算式、結果、大小與位置也會備份。",
    480,
    165,
  ).background = "#eaf2ff";
  put(
    "text",
    680,
    900,
    "資料保存在目前瀏覽器的 IndexedDB，沒有上傳。\n跨裝置／瀏覽器不自動同步；共用瀏覽器設定檔會共用資料。\n清除網站資料、無痕模式或更換裝置可能遺失白板。\n請定期匯出 JSON；正式網址與本機網址須用 JSON 遷移。",
    480,
    135,
  ).color = "#293b35";
  section(0, 965, "06 從生活中的小問題開始");
  put(
    "text",
    0,
    1025,
    "旅行：地點分支＋旅費計算\n工作：專案心智圖＋步驟流程\n生活理財：支出便條＋計算機\n不必填滿畫布，留一點空白給新的想法。",
    580,
    130,
  ).color = "#293b35";
  b.guide = { version: 1, greetingId: greeting.id };
  // Keep the lower teaching areas clear of the larger, readable calculator.
  for (const n of b.nodes) if (n.position.y >= 645) n.position.y += 100;
  return refreshGreeting(b);
}
