export function installCockpitMenu(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Trading Cockpit')
    .addSubMenu(
      ui
        .createMenu('Setup')
        .addItem('Initialize Trading Cockpit', 'initializeTradingCockpit')
        .addItem('Validate Trading Cockpit', 'validateTradingCockpit')
    )
    .addItem('Refresh Finviz', 'refreshFinviz')
    .addItem('Refresh Momentum Ranking', 'refreshMomentumRanking')
    .addSeparator()
    .addItem('Refresh Dashboard', 'refreshDashboard')
    .addItem('Refresh Analytics', 'refreshAnalytics')
    .addSeparator()
    .addItem('Ajouter à Watchlist', 'addSelectedToWatchlist')
    .addItem('Créer Trade Plan', 'createTradePlanFromSelectedWatchlist')
    .addItem('Exécuter Trade Plan', 'executeSelectedTradePlan')
    .addItem('Fermer Position', 'closeSelectedPosition')
    .addSeparator()
    .addItem('Reconcile Selected Position', 'reconcileSelectedPosition')
    .addSeparator()
    .addItem('Record Initial Funding', 'recordInitialFunding')
    .addItem('Record Deposit', 'recordDeposit')
    .addItem('Record Withdrawal', 'recordWithdrawal')
    .addSeparator()
    .addItem('Configurer le token Finviz', 'configureFinvizToken')
    .addItem('Appliquer thème', 'applyCockpitTheme')
    .addItem('Refresh Documentation', 'refreshDocumentation')
    .addToUi();
}
