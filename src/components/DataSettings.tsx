import { X, Download, Upload, ShieldCheck } from "lucide-react";
import { requestPersistence } from "../persistence";
type Props = {
  close: () => void;
  backup: (whole?: boolean) => unknown;
  restore: () => void;
  status: string;
  error: string;
  lastSaved: number;
  lastBackup: number;
  name: string;
  notify: (s: string) => void;
  help: () => void;
  reset?: () => void;
};
export default function DataSettings(p: Props) {
  const date = (t: number) =>
    t ? new Date(t).toLocaleString("zh-TW") : "尚無紀錄";
  return (
    <div className="modal-backdrop" onClick={p.close}>
      <section
        role="dialog"
        aria-label="設定"
        className="modal data-settings"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" aria-label="關閉設定" onClick={p.close}>
          <X size={22} />
        </button>
        <h2>設定</h2>
        <h3>資料與備份</h3>
        <p>
          你的白板保存在目前瀏覽器的
          IndexedDB，沒有上傳或跨裝置同步。清除網站資料、無痕模式與更換裝置可能造成資料遺失；共用瀏覽器設定檔會共用白板。
        </p>
        <dl>
          <dt>目前白板</dt>
          <dd>{p.name}</dd>
          <dt>儲存狀態</dt>
          <dd>{p.error || p.status}</dd>
          <dt>最後成功儲存</dt>
          <dd>{date(p.lastSaved)}</dd>
          <dt>上次發起 JSON 匯出</dt>
          <dd>
            {date(p.lastBackup)}
            <small>
              請另外確認下載檔案已保存。此時間不代表檔案已完成下載。
            </small>
          </dd>
        </dl>
        <div className="data-actions">
          <button onClick={() => void p.backup()}>
            <Download size={22} />
            匯出本白板
          </button>
          <button onClick={() => void p.backup(true)}>
            <Download size={22} />
            全部備份
          </button>
          <button
            onClick={() => {
              p.close();
              p.restore();
            }}
          >
            <Upload size={22} />
            匯入專案
          </button>
        </div>
        <p>
          匯入 JSON
          會建立新白板，不覆寫既有資料。備份包含節點、連線、樣式、視角與計算機；全部備份也包含我的範本。側欄分類需在新裝置重新設定。本機與正式網址的儲存空間各自獨立，搬移時請匯出再匯入。
        </p>
        <button onClick={() => void requestPersistence().then(p.notify)}>
          <ShieldCheck size={22} />
          保留本機儲存
        </button>
        <small>
          瀏覽器可能拒絕保留；即使同意也不是永久保存，仍需定期備份。
        </small>
        <div className="settings-secondary">
          <button
            onClick={() => {
              p.close();
              p.help();
            }}
          >
            操作說明
          </button>
          {p.reset && (
            <button
              onClick={() => {
                p.close();
                p.reset?.();
              }}
            >
              重設指南
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
