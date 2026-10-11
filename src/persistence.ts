export async function requestPersistence(): Promise<string> {
  const s = navigator.storage;
  if (!s?.persist || !s?.persisted)
    return "此瀏覽器不支援保留儲存要求，請定期匯出備份。";
  try {
    if (await s.persisted())
      return "瀏覽器已授予保留儲存；清除網站資料仍會刪除白板。";
    return (await s.persist())
      ? "瀏覽器已授予保留儲存；這不是永久保存，仍建議備份。"
      : "瀏覽器未授予保留儲存；白板仍可自動儲存，請定期備份。";
  } catch {
    return "無法取得保留儲存權限；請定期匯出備份。";
  }
}
