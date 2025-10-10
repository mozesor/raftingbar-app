// rb-config.js
// Sets the Google Apps Script EXEC endpoint for the Rafting Bar app.
// Load this file BEFORE rb-patch.js in index.html.

(function () {
  // >>> Replace with your active deployment EXEC URL if it changes in the future <<<
  var EXEC_URL = 'https://script.google.com/macros/s/AKfycbx_UMxeN_-dYeiR4xQa4HzT9ogZPv8BeYkRuUg0BOeEobOQZJVvj7gZU-2U_5LrxEtK/exec';

  if (!window.RB_GAS_EXEC_URL) {
    window.RB_GAS_EXEC_URL = EXEC_URL;
  }
  console.info('[RB] GAS exec URL:', window.RB_GAS_EXEC_URL);
})();
