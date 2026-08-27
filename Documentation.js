/**
 * ============================================================
 * TRADING COCKPIT DOCUMENTATION
 * ============================================================
 *
 * Documentation intégrée du Trading Cockpit.
 *
 * Cette feuille explique :
 *
 * - le rôle du Cockpit
 * - le workflow complet
 * - le rôle de Finviz
 * - la traçabilité
 * - le versionnement des stratégies
 * - le rôle de chaque feuille
 * - la signification des champs
 * - le workflow opérationnel quotidien
 *
 * Cette feuille est une projection.
 * Elle peut être entièrement reconstruite.
 */


/**
 * ============================================================
 * REFRESH DOCUMENTATION
 * ============================================================
 */

function refreshDocumentation() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    getOrCreateDocumentationSheet_(
      ss
    );


  // ==========================================================
  // RESET
  // ==========================================================

  sheet
    .getRange(
      1,
      1,
      sheet.getMaxRows(),
      sheet.getMaxColumns()
    )
    .breakApart();

  sheet.clear();

  sheet.clearFormats();

  sheet.clearConditionalFormatRules();


  // ==========================================================
  // PAGE
  // ==========================================================

  let row = 1;


  row =
    writeDocumentationTitle_(
      sheet,
      row
    );


  row =
    writeDocumentationOverview_(
      sheet,
      row
    );


  row =
    writeDocumentationFlow_(
      sheet,
      row
    );


  row =
    writeDocumentationArchitecture_(
      sheet,
      row
    );


  row =
    writeDocumentationConcepts_(
      sheet,
      row
    );


  row =
    writeDocumentationSheets_(
      sheet,
      row
    );


  row =
    writeDocumentationWorkflow_(
      sheet,
      row
    );


  row =
    writeDocumentationStrategyVersioning_(
      sheet,
      row
    );


  row =
    writeDocumentationFooter_(
      sheet,
      row
    );


  // ==========================================================
  // FINAL FORMAT
  // ==========================================================

  formatDocumentationSheet_(
    sheet
  );


  ss.setActiveSheet(
    sheet
  );


  ss.toast(
    'Documentation mise à jour.',
    'Trading Cockpit',
    5
  );
}


/**
 * ============================================================
 * SHEET
 * ============================================================
 */

function getOrCreateDocumentationSheet_(
  ss
) {
  const sheetName =
    'Documentation';


  let sheet =
    ss.getSheetByName(
      sheetName
    );


  if (!sheet) {
    sheet =
      ss.insertSheet(
        sheetName
      );
  }


  return sheet;
}


/**
 * ============================================================
 * TITLE
 * ============================================================
 */

function writeDocumentationTitle_(
  sheet,
  row
) {
  sheet
    .getRange(
      row,
      1,
      1,
      6
    )
    .merge()
    .setValue(
      'TRADING COCKPIT — DOCUMENTATION'
    )
    .setFontSize(
      18
    )
    .setFontWeight(
      'bold'
    )
    .setHorizontalAlignment(
      'center'
    );


  row++;


  sheet
    .getRange(
      row,
      1,
      1,
      6
    )
    .merge()
    .setValue(
      'Manuel fonctionnel, workflow, architecture et dictionnaire des données'
    )
    .setFontStyle(
      'italic'
    )
    .setHorizontalAlignment(
      'center'
    );


  return row + 2;
}


/**
 * ============================================================
 * OVERVIEW
 * ============================================================
 */

function writeDocumentationOverview_(
  sheet,
  row
) {
  row =
    writeDocumentationSection_(
      sheet,
      row,
      '1. OBJECTIF DU TRADING COCKPIT'
    );


  const text =
    'Trading Cockpit est un système d’aide à la décision pour le trading. ' +
    'Il permet de détecter des candidats, analyser les setups, préparer ' +
    'un plan de trade, suivre une position, documenter le résultat et ' +
    'mesurer les performances des stratégies.';


  sheet
    .getRange(
      row,
      1,
      2,
      6
    )
    .merge()
    .setValue(
      text
    )
    .setWrap(
      true
    )
    .setVerticalAlignment(
      'top'
    );


  row += 3;


  sheet
    .getRange(
      row,
      1,
      2,
      6
    )
    .merge()
    .setValue(
      'Le Cockpit n’est pas un robot de trading automatique. ' +
      'Il automatise la collecte, les calculs, la traçabilité et les ' +
      'analyses, mais les décisions de sélection, de planification, ' +
      'd’exécution et de sortie restent humaines.'
    )
    .setWrap(
      true
    );


  return row + 3;
}


/**
 * ============================================================
 * FLOW
 * ============================================================
 */

function writeDocumentationFlow_(
  sheet,
  row
) {
  row =
    writeDocumentationSection_(
      sheet,
      row,
      '2. FLUX GLOBAL'
    );


  const flow = [

    [
      'FINVIZ',
      'Détecte des titres correspondant aux critères du screener.'
    ],

    [
      '↓',
      ''
    ],

    [
      'SIGNALS HISTORY',
      'Archive les signaux détectés et leur contexte.'
    ],

    [
      '↓',
      ''
    ],

    [
      'MOMENTUM RANKING',
      'Classe et enrichit les candidats.'
    ],

    [
      '↓',
      'Sélection humaine'
    ],

    [
      'WATCHLIST',
      'Contient les titres réellement surveillés.'
    ],

    [
      '↓',
      'Analyse du setup'
    ],

    [
      'TRADE PLANS',
      'Définit Entry, Stop, Target, risque et taille de position.'
    ],

    [
      '↓',
      'Décision d’exécution'
    ],

    [
      'POSITIONS',
      'Suit les positions réellement ou simulément exécutées.'
    ],

    [
      '↓',
      'Fermeture'
    ],

    [
      'JOURNAL',
      'Conserve l’historique final du trade.'
    ],

    [
      '↓',
      ''
    ],

    [
      'ANALYTICS',
      'Analyse les performances globales et par stratégie.'
    ]
  ];


  flow.forEach(
    item => {

      sheet
        .getRange(
          row,
          1,
          1,
          2
        )
        .merge()
        .setValue(
          item[0]
        )
        .setFontWeight(
          item[0] === '↓'
            ? 'normal'
            : 'bold'
        )
        .setHorizontalAlignment(
          'center'
        );


      sheet
        .getRange(
          row,
          3,
          1,
          4
        )
        .merge()
        .setValue(
          item[1]
        )
        .setWrap(
          true
        );


      row++;
    }
  );


  row++;


  sheet
    .getRange(
      row,
      1,
      2,
      6
    )
    .merge()
    .setValue(
      'DASHBOARD : vue opérationnelle transversale du pipeline. ' +
      'Il montre ce qui demande actuellement de l’attention : ' +
      'Watchlist, Trade Plans actifs, Positions ouvertes, etc.'
    )
    .setWrap(
      true
    );


  return row + 3;
}


/**
 * ============================================================
 * ARCHITECTURE
 * ============================================================
 */

function writeDocumentationArchitecture_(
  sheet,
  row
) {
  row =
    writeDocumentationSection_(
      sheet,
      row,
      '3. FINVIZ ET ARCHITECTURE DE STRATÉGIE'
    );


  const rows = [

    [
      'Concept',
      'Description'
    ],

    [
      'Strategy',
      'Une méthode de trading définie par des règles et une logique métier.'
    ],

    [
      'Strategy Version',
      'Une version précise des règles d’une stratégie.'
    ],

    [
      'Screener',
      'Configuration utilisée pour rechercher des candidats correspondant à certaines règles.'
    ],

    [
      'Finviz',
      'Provider externe de screening. Finviz détecte des candidats mais ne représente pas la stratégie elle-même.'
    ],

    [
      'Google Finance',
      'Provider utilisé dans certaines feuilles pour récupérer un prix courant indicatif.'
    ]
  ];


  sheet
    .getRange(
      row,
      1,
      rows.length,
      6
    )
    .setValues(
      rows.map(
        item => [
          item[0],
          '',
          item[1],
          '',
          '',
          ''
        ]
      )
    );


  for (
    let i = 0;
    i < rows.length;
    i++
  ) {

    sheet
      .getRange(
        row + i,
        1,
        1,
        2
      )
      .merge();


    sheet
      .getRange(
        row + i,
        3,
        1,
        4
      )
      .merge();
  }


  sheet
    .getRange(
      row,
      1,
      1,
      6
    )
    .setFontWeight(
      'bold'
    );


  row +=
    rows.length + 1;


  sheet
    .getRange(
      row,
      1,
      4,
      6
    )
    .merge()
    .setValue(
      'RELATION IMPORTANTE\n\n' +
      'Strategy → Strategy Version → Screener Configuration → Finviz\n\n' +
      'Finviz est une source de détection. Le Cockpit associe les résultats ' +
      'du screener à une Strategy ID et une Strategy Version.'
    )
    .setWrap(
      true
    )
    .setVerticalAlignment(
      'middle'
    );


  return row + 5;
}


/**
 * ============================================================
 * CONCEPTS
 * ============================================================
 */

function writeDocumentationConcepts_(
  sheet,
  row
) {
  row =
    writeDocumentationSection_(
      sheet,
      row,
      '4. CONCEPTS DE TRAÇABILITÉ'
    );


  const concepts = [

    [
      'Strategy ID',
      'Identifiant stable de la stratégie. Exemple : MOMENTUM_BREAKOUT.'
    ],

    [
      'Strategy',
      'Nom lisible de la stratégie. Exemple : Momentum Breakout.'
    ],

    [
      'Strategy Version',
      'Version exacte ayant produit le signal. Exemple : V1.'
    ],

    [
      'Watchlist ID',
      'Identifie une sélection précise placée sous surveillance.'
    ],

    [
      'Trade Plan ID',
      'Identifie le plan créé à partir d’une entrée Watchlist.'
    ],

    [
      'Position ID',
      'Identifie une exécution issue d’un Trade Plan.'
    ],

    [
      'Journal ID',
      'Identifie le résultat final archivé d’un trade terminé.'
    ]
  ];


  row =
    writeDocumentationDictionary_(
      sheet,
      row,
      concepts
    );


  row++;


  sheet
    .getRange(
      row,
      1,
      4,
      6
    )
    .merge()
    .setValue(
      'CHAÎNE DE TRAÇABILITÉ\n\n' +
      'Signal → Watchlist ID → Trade Plan ID → Position ID → Journal ID\n\n' +
      'Strategy ID et Strategy Version sont propagés tout au long du workflow.'
    )
    .setWrap(
      true
    );


  return row + 5;
}


/**
 * ============================================================
 * SHEET DOCUMENTATION
 * ============================================================
 */

function writeDocumentationSheets_(
  sheet,
  row
) {
  row =
    writeDocumentationSection_(
      sheet,
      row,
      '5. DICTIONNAIRE DES FEUILLES ET DES CHAMPS'
    );


  const definitions =
    getDocumentationDefinitions_();


  definitions.forEach(
    definition => {

      row =
        writeDocumentationSheetDefinition_(
          sheet,
          row,
          definition
        );


      row += 2;
    }
  );


  return row;
}


/**
 * ============================================================
 * DOCUMENTATION DEFINITIONS
 * ============================================================
 */

function getDocumentationDefinitions_() {
  return [

    // ========================================================
    // DASHBOARD
    // ========================================================

    {
      name:
        'Dashboard',

      role:
        'Vue opérationnelle du Cockpit. ' +
        'Présente les éléments actifs et ce qui demande une action.',

      source:
        'Projection calculée à partir des autres feuilles.',

      fields: [

        [
          'Watchlist',
          'Nombre de titres actuellement suivis dans le pipeline.'
        ],

        [
          'Trade Plans',
          'Nombre de Trade Plans actifs. Les plans EXECUTED et CANCELLED ne sont pas comptés.'
        ],

        [
          'Open Positions',
          'Nombre de positions actuellement ouvertes.'
        ],

        [
          'Closed Trades',
          'Nombre de trades terminés présents dans le Journal.'
        ],

        [
          'Total P&L',
          'Somme du P&L réalisé des trades terminés.'
        ],

        [
          'Win Rate',
          'Pourcentage des trades terminés avec un résultat positif.'
        ],

        [
          'Average R',
          'R-Multiple moyen des trades terminés.'
        ]
      ]
    },


    // ========================================================
    // STRATEGIES
    // ========================================================

    {
      name:
        'Strategies',

      role:
        'Registre des stratégies connues du Trading Cockpit.',

      source:
        'Configuration métier du Cockpit.',

      fields: [

        [
          'Strategy ID',
          'Identifiant stable et technique de la stratégie. Exemple : MOMENTUM_BREAKOUT.'
        ],

        [
          'Strategy',
          'Nom lisible de la stratégie.'
        ],

        [
          'Strategy Version',
          'Version actuellement définie de la stratégie.'
        ],

        [
          'Status',
          'Indique si la stratégie est active, inactive ou retirée selon la configuration du Cockpit.'
        ],

        [
          'Description',
          'Description fonctionnelle de la stratégie lorsque disponible.'
        ]
      ]
    },


    // ========================================================
    // SIGNALS HISTORY
    // ========================================================

    {
      name:
        'Signals History',

      role:
        'Archive historique des signaux détectés par les screeners.',

      source:
        'Finviz + métadonnées ajoutées par Trading Cockpit.',

      fields: [

        [
          'Signal Date',
          'Date logique à laquelle le signal a été détecté.'
        ],

        [
          'Detected At',
          'Horodatage exact de la détection du signal.'
        ],

        [
          'Strategy ID',
          'Identité stable de la stratégie associée au screener.'
        ],

        [
          'Strategy',
          'Nom lisible de la stratégie.'
        ],

        [
          'Strategy Version',
          'Version de la stratégie au moment de la détection.'
        ],

        [
          'Ticker',
          'Symbole boursier du titre.'
        ],

        [
          'Company',
          'Nom de l’entreprise lorsque fourni par Finviz.'
        ],

        [
          'Sector',
          'Secteur économique de l’entreprise.'
        ],

        [
          'Industry',
          'Industrie ou sous-secteur de l’entreprise.'
        ],

        [
          'Country',
          'Pays associé à l’entreprise.'
        ],

        [
          'Market Cap',
          'Capitalisation boursière estimée de l’entreprise.'
        ],

        [
          'P/E',
          'Price-to-Earnings ratio : prix de l’action relativement au bénéfice par action.'
        ],

        [
          'Price',
          'Prix retourné par Finviz au moment du screening.'
        ],

        [
          'Change',
          'Variation du prix retournée par Finviz.'
        ],

        [
          'Volume',
          'Volume de transactions observé.'
        ],

        [
          'Relative Volume',
          'Volume actuel comparé au volume habituel du titre.'
        ],

        [
          'RSI',
          'Relative Strength Index. Indicateur de momentum généralement exprimé entre 0 et 100.'
        ]
      ]
    },


    // ========================================================
    // MOMENTUM RANKING
    // ========================================================

    {
      name:
        'Momentum Ranking',

      role:
        'Projection des signaux permettant de classer les candidats Momentum Breakout.',

      source:
        'Signals History + calculs du Cockpit.',

      fields: [

        [
          'Strategy ID',
          'Identité stable de la stratégie.'
        ],

        [
          'Strategy',
          'Nom lisible de la stratégie.'
        ],

        [
          'Strategy Version',
          'Version ayant produit le signal.'
        ],

        [
          'Signal Date',
          'Date du signal analysé.'
        ],

        [
          'Ticker',
          'Symbole boursier.'
        ],

        [
          'Price',
          'Prix associé au signal.'
        ],

        [
          'Change',
          'Variation du titre.'
        ],

        [
          'Volume',
          'Volume observé.'
        ],

        [
          'Relative Volume',
          'Volume relatif du titre.'
        ],

        [
          'RSI',
          'Indicateur RSI du titre.'
        ],

        [
          'Momentum Score',
          'Score calculé par le Cockpit pour classer les candidats selon les critères de momentum.'
        ],

        [
          'Rank',
          'Position relative du candidat dans le classement lorsque présente.'
        ]
      ]
    },


    // ========================================================
    // WATCHLIST
    // ========================================================

    {
      name:
        'Watchlist',

      role:
        'Contient les titres sélectionnés pour une surveillance et une analyse plus approfondies.',

      source:
        'Sélection humaine depuis le ranking.',

      lifecycle:
        'WATCHING → READY → PLANNED → ENTERED → CLOSED',

      fields: [

        [
          'Watchlist ID',
          'Identifiant unique de cette entrée Watchlist.'
        ],

        [
          'Strategy ID',
          'Identité stable de la stratégie ayant produit le signal.'
        ],

        [
          'Strategy',
          'Nom lisible de la stratégie.'
        ],

        [
          'Strategy Version',
          'Version ayant produit le signal.'
        ],

        [
          'Signal Date',
          'Date de détection du signal d’origine.'
        ],

        [
          'Ticker',
          'Symbole boursier surveillé.'
        ],

        [
          'Signal Price',
          'Prix du titre au moment du signal.'
        ],

        [
          'Current Price',
          'Prix courant indicatif, généralement récupéré automatiquement.'
        ],

        [
          'Momentum Score',
          'Score du candidat provenant du ranking.'
        ],

        [
          'Setup Status',
          'État qualitatif du setup observé.'
        ],

        [
          'Breakout Level',
          'Niveau de prix dont le franchissement confirmerait le breakout.'
        ],

        [
          'Invalidation Level',
          'Niveau de prix qui invalide l’hypothèse de trade.'
        ],

        [
          'Event Risk',
          'Risque lié à un événement connu, par exemple les résultats financiers.'
        ],

        [
          'Notes',
          'Observations et analyse humaine.'
        ],

        [
          'Status',
          'État de l’entrée Watchlist dans le workflow.'
        ],

        [
          'Added At',
          'Date et heure d’ajout à la Watchlist.'
        ]
      ]
    },


    // ========================================================
    // TRADE PLANS
    // ========================================================

    {
      name:
        'Trade Plans',

      role:
        'Formalise le plan avant l’exécution : entrée, stop, objectif et gestion du risque.',

      source:
        'Watchlist + configuration de risque + décisions humaines.',

      lifecycle:
        'DRAFT → READY → EXECUTED ou CANCELLED',

      fields: [

        [
          'Trade Plan ID',
          'Identifiant unique du plan.'
        ],

        [
          'Watchlist ID',
          'Identifiant de l’entrée Watchlist ayant produit le plan.'
        ],

        [
          'Strategy ID',
          'Identité stable de la stratégie.'
        ],

        [
          'Strategy',
          'Nom lisible de la stratégie.'
        ],

        [
          'Strategy Version',
          'Version de stratégie associée au signal d’origine.'
        ],

        [
          'Signal Date',
          'Date du signal initial.'
        ],

        [
          'Signal Price',
          'Prix observé lors du signal initial.'
        ],

        [
          'Ticker',
          'Symbole boursier.'
        ],

        [
          'Reference Price',
          'Prix observé au moment de la création du plan.'
        ],

        [
          'Momentum Score',
          'Score du candidat au moment de la sélection.'
        ],

        [
          'Setup Status',
          'État du setup hérité de la Watchlist.'
        ],

        [
          'Breakout Level',
          'Niveau associé à la confirmation du breakout.'
        ],

        [
          'Invalidation Level',
          'Niveau qui invalide le setup.'
        ],

        [
          'Event Risk',
          'Risque événementiel connu au moment de la création du plan.'
        ],

        [
          'Created At',
          'Date et heure de création du Trade Plan.'
        ],

        [
          'Entry Type',
          'Méthode prévue d’entrée : BREAKOUT, RETEST ou LIMIT.'
        ],

        [
          'Entry Price',
          'Prix prévu d’entrée dans la position.'
        ],

        [
          'Stop Price',
          'Prix du stop prévu.'
        ],

        [
          'Target Price',
          'Objectif de prix prévu.'
        ],

        [
          'Risk / Share',
          'Risque par action. Calcul : Entry Price - Stop Price.'
        ],

        [
          'Reward / Share',
          'Gain potentiel par action. Calcul : Target Price - Entry Price.'
        ],

        [
          'Risk : Reward',
          'Rapport gain potentiel / risque. Calcul : Reward par action ÷ Risk par action.'
        ],

        [
          'Account Equity',
          'Capital de référence utilisé pour le calcul du risque.'
        ],

        [
          'Risk %',
          'Pourcentage maximal du capital que le plan autorise à risquer.'
        ],

        [
          'Max Risk $',
          'Risque monétaire maximal. Calcul : Account Equity × Risk %.'
        ],

        [
          'Position Size',
          'Nombre d’actions calculé selon le risque maximal et le risque par action.'
        ],

        [
          'Position Value',
          'Valeur théorique de la position. Calcul : Position Size × Entry Price.'
        ],

        [
          'Status',
          'État du plan : DRAFT, READY, EXECUTED ou CANCELLED.'
        ],

        [
          'Notes',
          'Notes complémentaires relatives au plan.'
        ]
      ]
    },


    // ========================================================
    // POSITIONS
    // ========================================================

    {
      name:
        'Positions',

      role:
        'Représente les trades réellement ou simulément exécutés et encore suivis.',

      source:
        'Trade Plans exécutés.',

      lifecycle:
        'OPEN → CLOSED',

      fields: [

        [
          'Position ID',
          'Identifiant unique de la position.'
        ],

        [
          'Trade Plan ID',
          'Plan ayant donné naissance à la position.'
        ],

        [
          'Watchlist ID',
          'Entrée Watchlist à l’origine du trade.'
        ],

        [
          'Strategy ID',
          'Identité stable de la stratégie.'
        ],

        [
          'Strategy',
          'Nom lisible de la stratégie.'
        ],

        [
          'Strategy Version',
          'Version de stratégie ayant produit le trade.'
        ],

        [
          'Ticker',
          'Symbole boursier.'
        ],

        [
          'Opened At',
          'Date et heure d’ouverture.'
        ],

        [
          'Planned Entry',
          'Prix d’entrée prévu dans le Trade Plan.'
        ],

        [
          'Actual Entry',
          'Prix réel ou simulé auquel la position a été ouverte.'
        ],

        [
          'Planned Quantity',
          'Quantité calculée dans le Trade Plan.'
        ],

        [
          'Actual Quantity',
          'Quantité réellement ou simulément exécutée.'
        ],

        [
          'Initial Stop',
          'Stop défini au moment de l’ouverture.'
        ],

        [
          'Current Stop',
          'Stop actuellement utilisé. Il peut évoluer après l’ouverture.'
        ],

        [
          'Target',
          'Objectif de prix.'
        ],

        [
          'Planned Max Risk',
          'Risque maximal prévu par le Trade Plan.'
        ],

        [
          'Planned R:R',
          'Ratio Risk/Reward prévu avant l’exécution.'
        ],

        [
          'Current Price',
          'Prix courant indicatif récupéré automatiquement par Google Finance.'
        ],

        [
          'Unrealized P&L',
          'Profit ou perte non réalisé de la position ouverte.'
        ],

        [
          'Unrealized P&L %',
          'Rendement non réalisé en pourcentage depuis Actual Entry.'
        ],

        [
          'Status',
          'État de la position, notamment OPEN ou CLOSED.'
        ],

        [
          'Closed At',
          'Date et heure de fermeture.'
        ],

        [
          'Exit Price',
          'Prix réel ou simulé de sortie.'
        ],

        [
          'Realized P&L',
          'Profit ou perte réalisé après fermeture.'
        ],

        [
          'Notes',
          'Notes relatives au suivi de la position.'
        ]
      ]
    },


    // ========================================================
    // JOURNAL
    // ========================================================

    {
      name:
        'Journal',

      role:
        'Archive finale des trades terminés et source principale de l’analyse de performance.',

      source:
        'Positions fermées.',

      fields: [

        [
          'Journal ID',
          'Identifiant unique de l’entrée Journal.'
        ],

        [
          'Position ID',
          'Position ayant produit cette entrée.'
        ],

        [
          'Trade Plan ID',
          'Trade Plan à l’origine de la position.'
        ],

        [
          'Watchlist ID',
          'Entrée Watchlist à l’origine du trade.'
        ],

        [
          'Strategy ID',
          'Identité stable de la stratégie.'
        ],

        [
          'Strategy',
          'Nom lisible de la stratégie.'
        ],

        [
          'Strategy Version',
          'Version exacte de la stratégie ayant produit le trade.'
        ],

        [
          'Ticker',
          'Symbole boursier.'
        ],

        [
          'Opened At',
          'Date et heure d’ouverture.'
        ],

        [
          'Closed At',
          'Date et heure de fermeture.'
        ],

        [
          'Planned Entry',
          'Prix d’entrée initialement prévu.'
        ],

        [
          'Actual Entry',
          'Prix réel ou simulé d’entrée.'
        ],

        [
          'Exit Price',
          'Prix réel ou simulé de sortie.'
        ],

        [
          'Quantity',
          'Nombre d’actions exécutées.'
        ],

        [
          'Initial Stop',
          'Stop initial du trade.'
        ],

        [
          'Target',
          'Objectif initial.'
        ],

        [
          'Planned Max Risk',
          'Risque monétaire maximal prévu avant l’exécution.'
        ],

        [
          'Planned R:R',
          'Ratio Risk/Reward prévu.'
        ],

        [
          'Realized P&L',
          'Profit ou perte réellement enregistré.'
        ],

        [
          'Return %',
          'Rendement du trade. Calcul : Exit Price ÷ Actual Entry - 1.'
        ],

        [
          'R-Multiple',
          'Résultat exprimé en unités de risque. Calcul : Realized P&L ÷ Planned Max Risk.'
        ],

        [
          'Outcome',
          'Résultat automatique : WIN, LOSS ou BREAKEVEN.'
        ],

        [
          'Exit Reason',
          'Raison de sortie : TARGET, STOP, TRAILING STOP, MANUAL, SETUP INVALIDATED, TIME EXIT ou OTHER.'
        ],

        [
          'Execution Notes',
          'Observations sur l’exécution réelle du trade.'
        ],

        [
          'Lessons Learned',
          'Leçons tirées du trade pour améliorer le processus.'
        ],

        [
          'Followed Plan?',
          'Indique si le Trade Plan a été respecté : YES, PARTIALLY ou NO.'
        ]
      ]
    },


    // ========================================================
    // ANALYTICS
    // ========================================================

    {
      name:
        'Analytics',

      role:
        'Projection analytique du Journal permettant d’évaluer les performances.',

      source:
        'Journal.',

      fields: [

        [
          'Trades',
          'Nombre total de trades terminés analysés.'
        ],

        [
          'Wins',
          'Nombre de trades avec Realized P&L positif.'
        ],

        [
          'Losses',
          'Nombre de trades avec Realized P&L négatif.'
        ],

        [
          'Breakeven',
          'Nombre de trades avec résultat nul.'
        ],

        [
          'Win Rate',
          'Pourcentage de trades gagnants.'
        ],

        [
          'Total P&L',
          'Somme des profits et pertes réalisés.'
        ],

        [
          'Average P&L',
          'Profit ou perte moyen par trade.'
        ],

        [
          'Gross Profit',
          'Somme des résultats des trades gagnants.'
        ],

        [
          'Gross Loss',
          'Somme des résultats des trades perdants.'
        ],

        [
          'Best Trade',
          'Meilleur P&L individuel.'
        ],

        [
          'Worst Trade',
          'Pire P&L individuel.'
        ],

        [
          'Total R',
          'Somme des R-Multiples.'
        ],

        [
          'Average R',
          'R-Multiple moyen par trade.'
        ],

        [
          'Average Winner',
          'R-Multiple moyen des trades gagnants.'
        ],

        [
          'Average Loser',
          'R-Multiple moyen des trades perdants.'
        ],

        [
          'Expectancy',
          'Espérance moyenne exprimée en R selon la fréquence et la taille des gains et pertes.'
        ],

        [
          'Profit Factor',
          'Gross Profit divisé par la valeur absolue de Gross Loss.'
        ],

        [
          'Performance by Strategy',
          'Regroupe les résultats par Strategy ID, toutes versions confondues.'
        ],

        [
          'Performance by Strategy Version',
          'Sépare les résultats selon Strategy ID + Strategy Version.'
        ]
      ]
    },


    // ========================================================
    // LISTS
    // ========================================================

    {
      name:
        'Lists',

      role:
        'Feuille technique contenant certaines listes utilisées par les validations et menus déroulants.',

      source:
        'Configuration interne du Cockpit.',

      fields: [

        [
          'Values',
          'Valeurs utilisées par certains dropdowns ou configurations du Cockpit.'
        ]
      ]
    }
  ];
}


/**
 * ============================================================
 * WRITE SHEET DEFINITION
 * ============================================================
 */

function writeDocumentationSheetDefinition_(
  sheet,
  row,
  definition
) {
  sheet
    .getRange(
      row,
      1,
      1,
      6
    )
    .merge()
    .setValue(
      definition.name.toUpperCase()
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      13
    );


  row++;


  sheet
    .getRange(
      row,
      1
    )
    .setValue(
      'Rôle'
    )
    .setFontWeight(
      'bold'
    );


  sheet
    .getRange(
      row,
      2,
      1,
      5
    )
    .merge()
    .setValue(
      definition.role
    )
    .setWrap(
      true
    );


  row++;


  sheet
    .getRange(
      row,
      1
    )
    .setValue(
      'Source'
    )
    .setFontWeight(
      'bold'
    );


  sheet
    .getRange(
      row,
      2,
      1,
      5
    )
    .merge()
    .setValue(
      definition.source || ''
    )
    .setWrap(
      true
    );


  row++;


  if (
    definition.lifecycle
  ) {
    sheet
      .getRange(
        row,
        1
      )
      .setValue(
        'Cycle'
      )
      .setFontWeight(
        'bold'
      );


    sheet
      .getRange(
        row,
        2,
        1,
        5
      )
      .merge()
      .setValue(
        definition.lifecycle
      );


    row++;
  }


  row++;


  sheet
    .getRange(
      row,
      1,
      1,
      2
    )
    .merge()
    .setValue(
      'Champ'
    )
    .setFontWeight(
      'bold'
    );


  sheet
    .getRange(
      row,
      3,
      1,
      4
    )
    .merge()
    .setValue(
      'Description'
    )
    .setFontWeight(
      'bold'
    );


  row++;


  definition.fields.forEach(
    field => {

      sheet
        .getRange(
          row,
          1,
          1,
          2
        )
        .merge()
        .setValue(
          field[0]
        );


      sheet
        .getRange(
          row,
          3,
          1,
          4
        )
        .merge()
        .setValue(
          field[1]
        )
        .setWrap(
          true
        );


      row++;
    }
  );


  return row;
}


/**
 * ============================================================
 * GENERIC DICTIONARY
 * ============================================================
 */

function writeDocumentationDictionary_(
  sheet,
  row,
  values
) {
  sheet
    .getRange(
      row,
      1,
      1,
      2
    )
    .merge()
    .setValue(
      'Concept'
    )
    .setFontWeight(
      'bold'
    );


  sheet
    .getRange(
      row,
      3,
      1,
      4
    )
    .merge()
    .setValue(
      'Description'
    )
    .setFontWeight(
      'bold'
    );


  row++;


  values.forEach(
    value => {

      sheet
        .getRange(
          row,
          1,
          1,
          2
        )
        .merge()
        .setValue(
          value[0]
        )
        .setFontWeight(
          'bold'
        );


      sheet
        .getRange(
          row,
          3,
          1,
          4
        )
        .merge()
        .setValue(
          value[1]
        )
        .setWrap(
          true
        );


      row++;
    }
  );


  return row;
}


/**
 * ============================================================
 * DAILY WORKFLOW
 * ============================================================
 */

function writeDocumentationWorkflow_(
  sheet,
  row
) {
  row =
    writeDocumentationSection_(
      sheet,
      row,
      '6. GUIDE D’UTILISATION'
    );


  const steps = [

    [
      '1',
      'Refresh Finviz',
      'Récupérer les nouveaux candidats correspondant aux screeners actifs.'
    ],

    [
      '2',
      'Momentum Ranking',
      'Examiner les candidats classés par le Cockpit.'
    ],

    [
      '3',
      'Sélection',
      'Choisir les titres méritant une analyse plus approfondie.'
    ],

    [
      '4',
      'Watchlist',
      'Ajouter le candidat à la Watchlist.'
    ],

    [
      '5',
      'Analyse du setup',
      'Définir notamment Breakout Level, Invalidation Level et Event Risk.'
    ],

    [
      '6',
      'Trade Plan',
      'Créer le plan lorsque le setup justifie une préparation de trade.'
    ],

    [
      '7',
      'Entry / Stop / Target',
      'Définir les niveaux prévus.'
    ],

    [
      '8',
      'Risk Management',
      'Vérifier Risk : Reward, Max Risk $, Position Size et Position Value.'
    ],

    [
      '9',
      'Execute',
      'Créer une Position lorsqu’une décision d’exécution est prise.'
    ],

    [
      '10',
      'Position Monitoring',
      'Suivre Current Price, Unrealized P&L, Stop et Target.'
    ],

    [
      '11',
      'Close Position',
      'Enregistrer le prix réel ou simulé de sortie.'
    ],

    [
      '12',
      'Journal',
      'Documenter Exit Reason, Execution Notes, Lessons Learned et Followed Plan?.'
    ],

    [
      '13',
      'Analytics',
      'Évaluer les performances et apprendre des résultats.'
    ]
  ];


  sheet
    .getRange(
      row,
      1
    )
    .setValue(
      '#'
    )
    .setFontWeight(
      'bold'
    );


  sheet
    .getRange(
      row,
      2,
      1,
      2
    )
    .merge()
    .setValue(
      'Étape'
    )
    .setFontWeight(
      'bold'
    );


  sheet
    .getRange(
      row,
      4,
      1,
      3
    )
    .merge()
    .setValue(
      'Action'
    )
    .setFontWeight(
      'bold'
    );


  row++;


  steps.forEach(
    step => {

      sheet
        .getRange(
          row,
          1
        )
        .setValue(
          step[0]
        )
        .setHorizontalAlignment(
          'center'
        );


      sheet
        .getRange(
          row,
          2,
          1,
          2
        )
        .merge()
        .setValue(
          step[1]
        )
        .setFontWeight(
          'bold'
        );


      sheet
        .getRange(
          row,
          4,
          1,
          3
        )
        .merge()
        .setValue(
          step[2]
        )
        .setWrap(
          true
        );


      row++;
    }
  );


  return row + 2;
}


/**
 * ============================================================
 * STRATEGY VERSIONING
 * ============================================================
 */

function writeDocumentationStrategyVersioning_(
  sheet,
  row
) {
  row =
    writeDocumentationSection_(
      sheet,
      row,
      '7. VERSIONNEMENT DES STRATÉGIES'
    );


  const text =
    'Une modification significative des règles d’une stratégie doit produire ' +
    'une nouvelle Strategy Version.\n\n' +

    'Exemple :\n\n' +

    'MOMENTUM_BREAKOUT / V1\n' +
    '        ↓\n' +
    'modification des règles\n' +
    '        ↓\n' +
    'MOMENTUM_BREAKOUT / V2\n\n' +

    'Strategy ID reste MOMENTUM_BREAKOUT. Seule la version change.\n\n' +

    'Les anciens signaux, Watchlists, Trade Plans, Positions et entrées Journal ' +
    'conservent leur version historique. Ils ne doivent jamais être convertis ' +
    'automatiquement vers la nouvelle version.';


  sheet
    .getRange(
      row,
      1,
      9,
      6
    )
    .merge()
    .setValue(
      text
    )
    .setWrap(
      true
    )
    .setVerticalAlignment(
      'top'
    );


  row += 10;


  const example = [

    [
      'Strategy ID',
      'Version',
      'Trades',
      'Interprétation'
    ],

    [
      'MOMENTUM_BREAKOUT',
      'V1',
      '31',
      'Ancienne version'
    ],

    [
      'MOMENTUM_BREAKOUT',
      'V2',
      '16',
      'Nouvelle version'
    ]
  ];


  sheet
    .getRange(
      row,
      1,
      example.length,
      4
    )
    .setValues(
      example
    );


  sheet
    .getRange(
      row,
      1,
      1,
      4
    )
    .setFontWeight(
      'bold'
    );


  return row +
    example.length +
    2;
}


/**
 * ============================================================
 * FOOTER
 * ============================================================
 */

function writeDocumentationFooter_(
  sheet,
  row
) {
  row =
    writeDocumentationSection_(
      sheet,
      row,
      '8. PRINCIPE DIRECTEUR'
    );


  sheet
    .getRange(
      row,
      1,
      4,
      6
    )
    .merge()
    .setValue(
      'Le Trading Cockpit doit permettre de reconstruire pourquoi un trade ' +
      'a été pris, selon quelle stratégie et quelle version, comment il a été ' +
      'planifié, comment il a été exécuté et quel résultat il a produit.\n\n' +
      'La qualité de la traçabilité est aussi importante que le résultat du trade.'
    )
    .setWrap(
      true
    )
    .setFontWeight(
      'bold'
    )
    .setVerticalAlignment(
      'middle'
    );


  return row + 5;
}


/**
 * ============================================================
 * SECTION
 * ============================================================
 */

function writeDocumentationSection_(
  sheet,
  row,
  title
) {
  sheet
    .getRange(
      row,
      1,
      1,
      6
    )
    .merge()
    .setValue(
      title
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      14
    );


  return row + 1;
}


/**
 * ============================================================
 * FORMAT
 * ============================================================
 */

function formatDocumentationSheet_(
  sheet
) {
  const lastRow =
    sheet.getLastRow();


  if (
    lastRow <= 0
  ) {
    return;
  }


  // ==========================================================
  // GENERAL
  // ==========================================================

  sheet
    .getRange(
      1,
      1,
      lastRow,
      6
    )
    .setVerticalAlignment(
      'top'
    )
    .setWrap(
      true
    );


  sheet.setFrozenRows(
    2
  );


  // ==========================================================
  // WIDTHS
  // ==========================================================

  sheet.setColumnWidth(
    1,
    120
  );


  sheet.setColumnWidth(
    2,
    140
  );


  sheet.setColumnWidth(
    3,
    180
  );


  sheet.setColumnWidth(
    4,
    180
  );


  sheet.setColumnWidth(
    5,
    180
  );


  sheet.setColumnWidth(
    6,
    180
  );


  // ==========================================================
  // GRID
  // ==========================================================

  sheet
    .getRange(
      1,
      1,
      lastRow,
      6
    )
    .setBorder(
      true,
      true,
      true,
      true,
      true,
      true
    );


  // ==========================================================
  // ROW HEIGHT
  // ==========================================================

  sheet
    .autoResizeRows(
      1,
      lastRow
    );


  /*
   * Limite les lignes trop compactes.
   */

  for (
    let row = 1;
    row <= lastRow;
    row++
  ) {

    if (
      sheet.getRowHeight(
        row
      ) < 24
    ) {
      sheet.setRowHeight(
        row,
        24
      );
    }
  }


  // ==========================================================
  // TAB COLOR
  // ==========================================================

  sheet.setTabColor(
    '#455A64'
  );


  // ==========================================================
  // COLORS
  // ==========================================================

  const values =
    sheet
      .getRange(
        1,
        1,
        lastRow,
        1
      )
      .getDisplayValues();


  for (
    let row = 1;
    row <= lastRow;
    row++
  ) {

    const value =
      String(
        values[
          row - 1
        ][0] || ''
      ).trim();


    /*
     * Grandes sections numérotées.
     */

    if (
      /^[1-8]\./.test(
        value
      )
    ) {
      sheet
        .getRange(
          row,
          1,
          1,
          6
        )
        .setBackground(
          '#1F4E78'
        )
        .setFontColor(
          '#FFFFFF'
        );
    }


    /*
     * Sous-sections représentant une feuille.
     */

    const sheetNames = [

      'DASHBOARD',
      'STRATEGIES',
      'SIGNALS HISTORY',
      'MOMENTUM RANKING',
      'WATCHLIST',
      'TRADE PLANS',
      'POSITIONS',
      'JOURNAL',
      'ANALYTICS',
      'LISTS'
    ];


    if (
      sheetNames.includes(
        value
      )
    ) {
      sheet
        .getRange(
          row,
          1,
          1,
          6
        )
        .setBackground(
          '#D9EAF7'
        )
        .setFontColor(
          '#1F1F1F'
        );
    }


    /*
     * Headers de dictionnaires.
     */

    if (
      value === 'Champ' ||
      value === 'Concept' ||
      value === '#'
    ) {
      sheet
        .getRange(
          row,
          1,
          1,
          6
        )
        .setBackground(
          '#E2E3E5'
        )
        .setFontWeight(
          'bold'
        );
    }
  }


  // ==========================================================
  // MAIN TITLE
  // ==========================================================

  sheet
    .getRange(
      1,
      1,
      1,
      6
    )
    .setBackground(
      '#0B1F33'
    )
    .setFontColor(
      '#FFFFFF'
    );
}