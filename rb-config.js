// Minimal config for RaftingBar – Reports page addon
window.RB_CONFIG = Object.assign({}, window.RB_CONFIG || {}, {
  GAS_URL: "https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec",
  // Optional: force one policy always from client. Use null to allow toggling with buttons.
  forcePolicy: null, // "FIRST_LAST" or "SUM_PAIRS" or null
  // Save the chosen mode as default on the server (Settings sheet) whenever user toggles
  persistPolicyToServer: true,
  // LocalStorage key for the current report mode
  modeKey: "rb_mode"
});
