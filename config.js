// Runtime config for Mini Fabrika static site.
// In production, set window.__MF_CONFIG before this file if needed.
(function(){
  var cfg=window.__MF_CONFIG||{};
  window.__MF_CONFIG={
    transferLogEndpoint: cfg.transferLogEndpoint||'',
    minFormFillMs: typeof cfg.minFormFillMs==='number'?cfg.minFormFillMs:3000,
    requireUserInteraction: cfg.requireUserInteraction!==false,
    trustedAppOrigins: cfg.trustedAppOrigins||['https://nebridex.github.io'],
    allowedSiteOrigins: cfg.allowedSiteOrigins||['https://minifabrika.com','https://www.minifabrika.com']
  };
  // Backward compatibility with previous global hook.
  if(!window.__MF_TRANSFER_LOG_ENDPOINT && window.__MF_CONFIG.transferLogEndpoint){
    window.__MF_TRANSFER_LOG_ENDPOINT=window.__MF_CONFIG.transferLogEndpoint;
  }
})();
