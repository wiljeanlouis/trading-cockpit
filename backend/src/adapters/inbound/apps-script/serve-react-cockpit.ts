export function serveReactCockpit(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createHtmlOutputFromFile('build/CockpitWeb')
    .setTitle('Trading Cockpit')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
