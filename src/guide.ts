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
  arrangeGuide(b);
  return refreshGreeting(b);
}

/** Non-destructive one-time guide presentation upgrade: retain content and stable IDs. */
export function arrangeGuide(b: Board) {
  if (!b.guide) return;
  if (b.guide.entryId) {
    compactGuideHero(b);
    return;
  }
  const locations: Record<string, [number, number, number, number]> = {
    "歡迎來到 Mind Canvas": [0, 0, 320, 120],
    "01 先動手玩一下": [460, 0, 380, 50],
    "02 讓想法長出分支": [0, 540, 430, 50],
    旅行計畫: [0, 625, 155, 60],
    想去的地方: [230, 600, 200, 60],
    預算與準備: [230, 710, 200, 60],
    "03 把數字也放進思考": [510, 540, 400, 50],
    旅行預算: [510, 600, 340, 450],
    "04 自由串起一個流程": [0, 1110, 400, 50],
    蒐集靈感: [0, 1190, 180, 65],
    安排下一步: [250, 1190, 180, 65],
    動手完成: [500, 1190, 180, 65],
    "05 保存，並留下備份": [0, 1440, 400, 50],
    "06 從生活中的小問題開始": [0, 1930, 430, 50],
  };
  for (const n of b.nodes) {
    const l = locations[n.text];
    if (l) {
      n.position = { x: l[0], y: l[1] };
      n.width = l[2];
      n.height = l[3];
      n.maxWidth = l[2];
    }
    if (n.id === b.guide.greetingId) {
      n.position = { x: 0, y: 130 };
      n.width = 320;
      n.height = 100;
      n.maxWidth = 320;
    }
    if (n.text.startsWith("PD-1 Center 的")) {
      n.position = { x: 0, y: 240 };
      n.width = 320;
      n.height = 95;
    }
    if (n.text.startsWith("試著拖動我")) {
      n.position = { x: 460, y: 75 };
      n.width = 380;
      n.height = 155;
    }
    if (n.text.startsWith("空白處拖曳")) {
      n.position = { x: 460, y: 255 };
      n.width = 380;
      n.height = 210;
    }
    if (n.text.startsWith("選取「旅行計畫」")) {
      n.position = { x: 0, y: 810 };
      n.width = 430;
      n.height = 200;
    }
    if (n.text.startsWith("流程是可編輯")) {
      n.position = { x: 0, y: 1290 };
      n.width = 690;
      n.height = 125;
    }
    if (
      n.text ===
      "左側「新的白板」開始自己的計畫。\n點白板名稱即可切換，自動保存各自內容與視角。\n上方匯出 JSON；匯入會建立新白板，不覆蓋原資料。\n計算機的算式、結果、大小與位置也會備份。"
    ) {
      n.position = { x: 0, y: 1510 };
      n.width = 430;
      n.height = 240;
      n.text =
        "白板會自動保存於目前瀏覽器的 IndexedDB。\n重要修改後、換裝置前，請先備份。\n設定 → 資料與備份 → 匯出本白板／全部備份。\n在另一個瀏覽器用同一處的「匯入專案」還原。\n匯入會建立副本，不覆寫原白板。\n計算機算式、結果、大小與位置也會保存。";
    }
    if (n.text.startsWith("資料保存在目前")) {
      n.position = { x: 510, y: 1510 };
      n.width = 430;
      n.height = 260;
    }
    if (n.text.startsWith("旅行：地點分支")) {
      n.position = { x: 0, y: 2010 };
      n.width = 600;
      n.height = 150;
    }
  }
  for (const n of b.nodes) if (n.position.y >= 540) n.position.y += 140;
  const entry = makeItem(
    "text",
    { x: 0, y: 350 },
    "選一個入口，開始今天的思考。",
  );
  Object.assign(entry, {
    width: 320,
    height: 240,
    maxWidth: 320,
    autoSize: false,
  });
  b.nodes.push(entry);
  b.guide.entryId = entry.id;
  const backup = makeItem(
    "text",
    { x: 0, y: 1940 },
    "需要備份或搬到另一個裝置？",
  );
  Object.assign(backup, {
    width: 430,
    height: 95,
    maxWidth: 430,
    autoSize: false,
  });
  b.nodes.push(backup);
  b.guide.backupId = backup.id;
  b.viewport = { x: 24, y: 24, zoom: 1 };
  compactGuideHero(b);
}

function compactGuideHero(b: Board) {
  const entry = b.nodes.find((n) => n.id === b.guide?.entryId);
  // Upgrade only the untouched standard hero; preserve manually moved entries.
  if (
    !entry ||
    entry.position.x !== 0 ||
    entry.position.y !== 350 ||
    entry.height !== 240
  )
    return;
  entry.position.y = 200;
  entry.height = 220;
  for (const n of b.nodes) {
    if (n.text === "歡迎來到 Mind Canvas") {
      n.height = 105;
      if (n.fontSize === 34) n.fontSize = 30;
    }
    if (n.id === b.guide?.greetingId) {
      n.position.y = 110;
      n.height = 80;
      if (n.fontSize === 20) n.fontSize = 18;
    }
    if (n.text.startsWith("PD-1 Center 的") && n.position.y === 240)
      n.position.y = 440;
  }
}
