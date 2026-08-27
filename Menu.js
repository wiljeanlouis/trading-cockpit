// ============================================================
// MENU
// ============================================================

function onOpen() {
  SpreadsheetApp
    .getUi()
    .createMenu('Trading Cockpit')
    .addItem(
      'Refresh Finviz',
      'refreshFinviz'
    )
    .addItem(
      'Refresh Momentum Ranking',
      'refreshMomentumRanking'
    )
    
    .addSeparator()

    .addItem(
      'Refresh Dashboard',
      'refreshDashboard'
    )
    .addItem(
      'Refresh Analytics',
      'refreshAnalytics'
    )
    .addSeparator()

    .addItem(
      'Ajouter à Watchlist',
      'addSelectedToWatchlist'
    )
    .addItem(
      'Créer Trade Plan',
      'createTradePlanFromSelectedWatchlist'
    )
    .addItem(
      'Exécuter Trade Plan',
      'executeSelectedTradePlan'
    )
    .addItem(
      'Fermer Position',
      'closeSelectedPosition'
    )
    
    .addSeparator()
    .addItem(
      'Setup Momentum Ranking',
      'setupMomentumRanking'
    )

    .addItem(
      'Setup Cockpit Config',
      'setupCockpitConfig'
    )
    .addItem(
      'Setup Strategies',
      'setupStrategies'
    )
    .addItem(
      'Validate Strategies',
      'validateStrategies'
    )

    .addSeparator()

    .addItem(
      'Configurer le token Finviz',
      'configureFinvizToken'
    )
    .addItem(
      'Appliquer thème',
      'applyCockpitTheme'
    )
    .addItem(
      'Refresh Documentation',
      'refreshDocumentation'
    )

    .addToUi();
}