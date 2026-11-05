/**
 * Turns updater errors into short messages the user can act on. Kept free
 * of Electron so the wording can be unit tested.
 *
 * @module main/update-messages
 */

/**
 * @param {unknown} error Error thrown or emitted by electron-updater.
 * @returns {string} Message in Turkish.
 */
export function describeUpdateError(error) {
  const text = error instanceof Error ? error.message : String(error ?? "");
  if (process.platform === "darwin" && /code signature|signed|codesign/i.test(text)) {
    return "Bu macOS sürümü kendini güncelleyemiyor. Yeni sürümü GitHub Releases sayfasından indirip kurabilirsiniz.";
  }
  if (/\b404\b|Not Found|Unable to find latest version|Cannot find latest|No published versions/i.test(text)) {
    return "Şu anda yayınlanmış bir güncelleme bulunamadı. Daha sonra tekrar deneyebilirsiniz.";
  }
  if (/ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|net::ERR|network|timeout/i.test(text)) {
    return "Güncelleme sunucusuna ulaşılamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.";
  }
  return "Güncelleme denetlenirken bir sorun oluştu. Daha sonra tekrar deneyebilirsiniz.";
}
