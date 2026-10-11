import {
  clone,
  id,
  makeBoard,
  makeItem,
  rootId,
  type Board,
  type Point,
} from "./model";
import { validateBoard } from "./storage";
export interface CanvasTemplate {
  id: string;
  name: string;
  description: string;
  document: Board;
}
export function captureTemplate(
  board: Board,
  selected: string[],
  name: string,
): CanvasTemplate {
  const chosen = new Set(selected),
    document = makeBoard(name.trim());
  document.treeStyle = clone(board.treeStyle);
  document.nodes = clone(board.nodes.filter((n) => chosen.has(n.id)));
  if (!document.nodes.length || !name.trim())
    throw new Error("請選取物件並輸入範本名稱");
  const x = Math.min(...document.nodes.map((n) => n.position.x)),
    y = Math.min(...document.nodes.map((n) => n.position.y));
  document.nodes.forEach((n) => {
    n.position.x -= x;
    n.position.y -= y;
    if (n.parentId && !chosen.has(n.parentId)) n.parentId = null;
    delete n.floating;
    delete n.closed;
    delete n.floatPosition;
    if (n.kind === "mind" && !n.parentId && !n.treeStyle)
      n.treeStyle = clone(
        board.nodes.find((p) => p.id === rootId(board, n.id))?.treeStyle ||
          board.treeStyle,
      );
  });
  document.relations = clone(
    board.relations.filter((r) => chosen.has(r.source) && chosen.has(r.target)),
  );
  document.relations.forEach((r) =>
    r.waypoints?.forEach((p) => {
      p.x -= x;
      p.y -= y;
    }),
  );
  validateBoard(document);
  return {
    id: id(),
    name: name.trim().slice(0, 80),
    description: `${document.nodes.length} 個物件 · ${document.relations.length} 條關聯`,
    document,
  };
}
export function instantiateTemplate(t: CanvasTemplate, position: Point): Board {
  const b = clone(t.document),
    ids = new Map(b.nodes.map((n) => [n.id, id()]));
  b.boardId = id();
  delete b.guide;
  b.nodes.forEach((n) => {
    n.id = ids.get(n.id)!;
    n.parentId = n.parentId ? ids.get(n.parentId) || null : null;
    n.position.x += position.x;
    n.position.y += position.y;
    delete n.floating;
    delete n.closed;
  });
  b.relations.forEach((r) => {
    r.id = id();
    r.source = ids.get(r.source)!;
    r.target = ids.get(r.target)!;
    r.waypoints?.forEach((p) => {
      p.x += position.x;
      p.y += position.y;
    });
  });
  return b;
}
export function validateTemplates(raw: unknown): CanvasTemplate[] {
  if (!Array.isArray(raw) || raw.length > 100)
    throw new Error("範本資料無效或超過100個");
  const ids = new Set<string>();
  return raw.map((t) => {
    if (
      !t ||
      typeof t !== "object" ||
      typeof t.id !== "string" ||
      !t.id ||
      t.id.length > 100 ||
      ids.has(t.id) ||
      typeof t.name !== "string" ||
      !t.name.trim() ||
      t.name.length > 80 ||
      typeof t.description !== "string" ||
      t.description.length > 500
    )
      throw new Error("範本名稱或ID無效");
    ids.add(t.id);
    const document = validateBoard(t.document);
    if (!document.nodes.length) throw new Error("範本不能是空白畫布");
    delete document.guide;
    return { id: t.id, name: t.name, description: t.description, document };
  });
}
function framework(
  name: string,
  description: string,
  cards: string[],
  tree = false,
): CanvasTemplate {
  const b = makeBoard(name),
    root = makeItem(tree ? "mind" : "text", { x: 0, y: 0 }, name);
  Object.assign(root, {
    width: 280,
    height: 80,
    maxWidth: 280,
    autoSize: false,
    fontSize: 26,
    bold: true,
  });
  b.nodes.push(root);
  cards.forEach((text, i) => {
    const n = makeItem(
      tree ? "mind" : "sticky",
      {
        x: tree ? 360 : (i % 2) * 380,
        y: tree ? i * 175 : 140 + Math.floor(i / 2) * 230,
      },
      text,
    );
    Object.assign(n, {
      width: 320,
      height: tree ? 145 : 185,
      maxWidth: 320,
      autoSize: false,
      background: i % 2 ? "#eaf2ff" : "#fff1bf",
      fontSize: 17,
    });
    if (tree) {
      n.parentId = root.id;
      n.order = i;
      n.mode = "Auto";
    } else {
      b.relations.push({
        id: id(),
        source: root.id,
        target: n.id,
        color: "#3b82f6",
        width: 2,
        dashed: false,
      });
    }
    b.nodes.push(n);
  });
  return { id: `official-${name}`, name, description, document: b };
}
export const officialTemplates: CanvasTemplate[] = [
  framework("SWOT 分析", "從內外部條件，推導下一步行動", [
    "S 優勢\n小團隊決策快，已有忠實使用者。\n如何把優勢放大？",
    "W 劣勢\n開發資源有限，缺少行銷通路。\n優先補上哪個缺口？",
    "O 機會\n市場需要簡單、可離線的工具。\n本月試驗：訪談5位使用者。",
    "T 威脅\n替代工具眾多，使用習慣難改。\n對策：降低第一次使用成本。",
  ]),
  framework("5W1H 分析", "把模糊的活動想法變成可執行的方案", [
    "Why 為什麼\n讓新同事更快了解團隊工作。",
    "Who 誰參與\n新同事、帶領者與一位協作夥伴。",
    "What 做什麼\n90分鐘入門工作坊＋實作練習。",
    "When 何時\n下週三14:00，前一天確認材料。",
    "Where 在哪裡\n小會議室；另提供視訊連結。",
    "How 如何做\n示範20分鐘 → 練習40分鐘 → 回饋30分鐘。",
  ]),
  framework("決策矩陣", "先訂權重，再比較方案；分數不是唯一答案", [
    "準則與權重\n成本40%／易用性35%／擴充性25%\n各項1–5分，總分＝加權相加。",
    "方案A｜自行開發\n成本2／易用性4／擴充性5\n加權：2×0.4+4×0.35+5×0.25＝3.45",
    "方案B｜現成工具\n成本4／易用性5／擴充性2\n加權：4×0.4+5×0.35+2×0.25＝3.85",
    "決策與假設\n先試B兩週，確認資料可匯出。\n若擴充限制阻擋核心需求，再改A。",
  ]),
  framework(
    "專案 WBS 工作拆解",
    "把交付成果拆成可指派、可驗收的工作",
    [
      "1 需求確認\n訪談 → 範圍清單 → 驗收標準\n負責：產品／完成：週二",
      "2 設計與實作\n原型 → 核心功能 → 資料保存\n負責：工程／完成：下週五",
      "3 品質驗證\n核心流程 → 錯誤處理 → 使用者試用\n產出：測試紀錄",
      "4 發布與交接\n部署 → 正式驗收 → 操作文件\n產出：可用網址與維護清單",
    ],
    true,
  ),
  framework(
    "旅行規劃",
    "目的地、節奏、預算與行前準備",
    [
      "目的地與體驗\n兩天一夜：海邊散步、老街與咖啡店。\n各挑一個最想去的點。",
      "時間與交通\n週六09:00出發；週日17:00回程。\n預留交通延誤與休息時間。",
      "預算\n住宿1800＋交通650＋餐飲1000＝3450\n使用計算機調整人數及備用金。",
      "行前清單\n確認訂房、天氣、車票與充電器。\n與同行者確認集合時間。",
    ],
    true,
  ),
  framework("會議紀錄與行動事項", "把討論轉為決議、負責人與期限", [
    "會議目標／參與者\n確認第一版範圍與下週優先順序。\n參與：產品、工程、設計。",
    "討論與決議\n先完成核心流程，延後選配功能。\n依據：使用者回饋與時間限制。",
    "行動事項\n小林：整理驗收清單，週三前。\n小陳：修復阻斷問題，週五前。",
    "待確認／下次追蹤\n是否需要匯出圖片？先詢問需求。\n下次會議：檢查完成項目與阻礙。",
  ]),
];
