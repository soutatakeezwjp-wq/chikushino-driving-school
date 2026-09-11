/* 学校管理のGA4ストリームと拡張計測OFFを確認後、この1ファイルで有効化する。 */
window.CDS_MEASUREMENT_CONFIG = Object.freeze({
  enabled: false,
  measurementId: "",
  enhancedMeasurementDisabled: false,
  // 個人名等をUTMに混入させない。実施する広告のコードだけ事前登録する。
  campaignCodes: [],
  contentCodes: []
});
