/**
 * ============================================================
 * MOMENTUM RANKING
 * ============================================================
 *
 * Responsabilités :
 *
 * - lire Signals History
 * - sélectionner la stratégie MOMENTUM_BREAKOUT
 * - récupérer sa version courante depuis Strategies
 * - trouver le dernier snapshot de cette stratégie/version
 * - calculer les sous-scores Momentum Breakout
 * - classer les candidats
 * - générer Momentum Ranking
 * - propager l'identité de stratégie
 *
 * Les règles de scoring sont dans MomentumScore.gs.
 * Les fonctions génériques sont dans Utils.gs.
 *
 *
 * IMPORTANT
 * ============================================================
 *
 * MOMENTUM_BREAKOUT est l'identité stable de la stratégie.
 *
 * Le nom humain et la version ne sont pas codés en dur ici.
 * Ils proviennent du registre Strategies.
 *
 * Exemple :
 *
 * Strategy ID       = MOMENTUM_BREAKOUT
 * Strategy          = Momentum Breakout
 * Strategy Version  = V1
 */


const MOMENTUM_BREAKOUT_STRATEGY_ID =
  'MOMENTUM_BREAKOUT';


/**
 * ============================================================
 * REFRESH MOMENTUM RANKING
 * ============================================================
 */

function refreshMomentumRanking() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  // ==========================================================
  // STRATEGY
  // ==========================================================

  const strategy =
    getStrategy(
      MOMENTUM_BREAKOUT_STRATEGY_ID
    );


  if (!strategy.enabled) {
    throw new Error(
      `La stratégie ${strategy.id} est désactivée.`
    );
  }


  // ==========================================================
  // SIGNAL HISTORY
  // ==========================================================

  const historySheet =
    ss.getSheetByName(
      SIGNALS_HISTORY_SHEET
    );


  if (!historySheet) {
    throw new Error(
      'Signals History est absent. ' +
      'Lance d’abord Refresh Finviz.'
    );
  }


  const data =
    historySheet
      .getDataRange()
      .getValues();


  if (data.length <= 1) {
    throw new Error(
      'Signals History ne contient aucun signal.'
    );
  }


  const headers =
    data[0].map(
      value =>
        String(value).trim()
    );


  // ==========================================================
  // INTERNAL COLUMNS
  // ==========================================================

  const signalDateIndex =
    requireColumn(
      headers,
      'Signal Date'
    );


  const strategyIdIndex =
    requireColumn(
      headers,
      'Strategy ID'
    );


  const strategyIndex =
    requireColumn(
      headers,
      'Strategy'
    );


  const versionIndex =
    requireColumn(
      headers,
      'Strategy Version'
    );


  /*
   * Signals History contient volontairement notre propre
   * Ticker normalisé avant les colonnes Finviz.
   */

  const internalTickerIndex =
    requireColumn(
      headers,
      'Ticker'
    );


  // ==========================================================
  // FINVIZ COLUMNS
  // ==========================================================

  /*
   * requireColumnAfter() est utilisé parce que Finviz possède
   * lui aussi une colonne Ticker.
   *
   * On cherche donc les colonnes Finviz après notre ticker
   * interne.
   */

  const companyIndex =
    requireColumnAfter(
      headers,
      'Company',
      internalTickerIndex
    );


  const sectorIndex =
    requireColumnAfter(
      headers,
      'Sector',
      internalTickerIndex
    );


  const priceIndex =
    requireColumnAfter(
      headers,
      'Price',
      internalTickerIndex
    );


  const high52Index =
    requireColumnAfter(
      headers,
      '52-Week High',
      internalTickerIndex
    );


  const relativeVolumeIndex =
    requireColumnAfter(
      headers,
      'Relative Volume',
      internalTickerIndex
    );


  const performanceMonthIndex =
    requireColumnAfter(
      headers,
      'Performance (Month)',
      internalTickerIndex
    );


  const rsiIndex =
    requireColumnAfter(
      headers,
      'Relative Strength Index (14)',
      internalTickerIndex
    );


  const sma20Index =
    requireColumnAfter(
      headers,
      '20-Day Simple Moving Average',
      internalTickerIndex
    );


  // ==========================================================
  // STRATEGY FILTER
  // ==========================================================

  /*
   * On filtre désormais par Strategy ID.
   *
   * Le nom humain n'est plus utilisé pour identifier
   * la stratégie.
   *
   * La version provient du registre Strategies.
   */

  const relevantRows =
    data
      .slice(1)
      .filter(row => {

        const rowStrategyId =
          String(
            row[
              strategyIdIndex
            ] || ''
          )
            .trim()
            .toUpperCase();


        const rowVersion =
          String(
            row[
              versionIndex
            ] || ''
          ).trim();


        return (
          rowStrategyId ===
            strategy.id.toUpperCase()
          &&
          rowVersion ===
            strategy.version
        );

      });


  if (
    relevantRows.length === 0
  ) {
    throw new Error(
      `Aucun signal trouvé pour ` +
      `${strategy.id} ${strategy.version}.`
    );
  }


  // ==========================================================
  // LATEST SNAPSHOT
  // ==========================================================

  const latestSignalDate =
    findLatestSignalDate(
      relevantRows,
      signalDateIndex
    );


  const latestRows =
    relevantRows.filter(
      row =>
        normalizeSignalDate(
          row[
            signalDateIndex
          ]
        ) ===
        latestSignalDate
    );


  // ==========================================================
  // RANKING CALCULATION
  // ==========================================================

  const ranked =
    latestRows.map(row => {

      const ticker =
        String(
          row[
            internalTickerIndex
          ] || ''
        )
          .trim()
          .toUpperCase();


      const company =
        row[
          companyIndex
        ] || '';


      const sector =
        row[
          sectorIndex
        ] || '';


      const price =
        parseNumber(
          row[
            priceIndex
          ]
        );


      const high52 =
        parsePercent(
          row[
            high52Index
          ]
        );


      const relativeVolume =
        parseNumber(
          row[
            relativeVolumeIndex
          ]
        );


      const performanceMonth =
        parsePercent(
          row[
            performanceMonthIndex
          ]
        );


      const rsi =
        parseNumber(
          row[
            rsiIndex
          ]
        );


      const sma20 =
        parsePercent(
          row[
            sma20Index
          ]
        );


      // ======================================================
      // SUB-SCORES
      // ======================================================

      const high52Score =
        score52WeekHigh(
          high52
        );


      const relativeVolumeScore =
        scoreRelativeVolume(
          relativeVolume
        );


      const performanceScore =
        scoreMonthlyPerformance(
          performanceMonth
        );


      const rsiScore =
        scoreRsi(
          rsi
        );


      const sma20Score =
        scoreSma20(
          sma20
        );


      const total =
        high52Score +
        relativeVolumeScore +
        performanceScore +
        rsiScore +
        sma20Score;


      /*
       * ======================================================
       * STRATEGY SNAPSHOT
       * ======================================================
       *
       * On transporte l'identité provenant réellement du
       * signal historique.
       *
       * Cela évite de reconstruire cette information plus tard.
       */

      return {
        strategyId:
          String(
            row[
              strategyIdIndex
            ] || strategy.id
          ).trim(),

        strategy:
          String(
            row[
              strategyIndex
            ] || strategy.name
          ).trim(),

        strategyVersion:
          String(
            row[
              versionIndex
            ] || strategy.version
          ).trim(),

        signalDate:
          latestSignalDate,

        ticker,
        company,
        sector,
        price,

        high52,
        high52Score,

        relativeVolume,
        relativeVolumeScore,

        performanceMonth,
        performanceScore,

        rsi,
        rsiScore,

        sma20,
        sma20Score,

        total
      };
    });


  // ==========================================================
  // SORT
  // ==========================================================

  /*
   * Score décroissant.
   *
   * En cas d'égalité :
   * Relative Volume le plus élevé gagne.
   */

  ranked.sort(
    (a, b) => {

      if (
        b.total !==
        a.total
      ) {
        return (
          b.total -
          a.total
        );
      }


      return (
        b.relativeVolume -
        a.relativeVolume
      );
    }
  );


  // ==========================================================
  // OUTPUT
  // ==========================================================

  writeMomentumRanking(
    ranked,
    latestSignalDate,
    strategy
  );


  ss.toast(
    `${ranked.length} candidats classés ` +
    `pour ${latestSignalDate}.`,
    'Momentum Ranking',
    5
  );
}


/**
 * ============================================================
 * WRITE MOMENTUM RANKING
 * ============================================================
 */

function writeMomentumRanking(
  ranked,
  signalDate,
  strategy
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  let sheet =
    ss.getSheetByName(
      MOMENTUM_RANKING_SHEET
    );


  if (!sheet) {
    sheet =
      ss.insertSheet(
        MOMENTUM_RANKING_SHEET
      );
  }


  /*
   * Momentum Ranking est une projection recalculable.
   *
   * Contrairement à Signals History, il est donc normal
   * de l'effacer complètement.
   */

  sheet.clear();
  sheet
    .getRange(
      1,
      1,
      sheet.getMaxRows(),
      sheet.getMaxColumns()
    )
    .clearDataValidations();

  // ==========================================================
  // METADATA
  // ==========================================================

  sheet
    .getRange('A1')
    .setValue(
      `${strategy.name.toUpperCase()} RANKING ${strategy.version}`
    )
    .setFontWeight(
      'bold'
    )
    .setFontSize(
      14
    );


  sheet
    .getRange('A2')
    .setValue(
      `Signal Date: ${signalDate}`
    );


  sheet
    .getRange('A3')
    .setValue(
      'Score de priorisation seulement — pas un signal d’achat.'
    );


  // ==========================================================
  // HEADERS
  // ==========================================================

  const headers = [
    'Rank',

    'Strategy ID',
    'Strategy',
    'Strategy Version',
    'Signal Date',

    'Ticker',
    'Company',
    'Sector',
    'Price',

    '52W High',
    '52W Score',

    'Relative Volume',
    'RelVol Score',

    'Performance Month',
    'Performance Score',

    'RSI',
    'RSI Score',

    'SMA20',
    'SMA20 Score',

    'Momentum Score',

    'Review Status'
  ];


  sheet
    .getRange(
      5,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ])
    .setFontWeight(
      'bold'
    );


  if (
    ranked.length === 0
  ) {
    return;
  }


  // ==========================================================
  // DATA
  // ==========================================================

  const output =
    ranked.map(
      (item, index) => [

        index + 1,

        item.strategyId,
        item.strategy,
        item.strategyVersion,
        item.signalDate,

        item.ticker,
        item.company,
        item.sector,
        item.price,

        item.high52,
        item.high52Score,

        item.relativeVolume,
        item.relativeVolumeScore,

        item.performanceMonth,
        item.performanceScore,

        item.rsi,
        item.rsiScore,

        item.sma20,
        item.sma20Score,

        item.total,

        'REVIEW'
      ]
    );


  sheet
    .getRange(
      6,
      1,
      output.length,
      headers.length
    )
    .setValues(
      output
    );


  // ==========================================================
  // FORMATTING
  // ==========================================================

  /*
   * Signal Date
   */

  sheet
    .getRange(
      6,
      5,
      output.length,
      1
    )
    .setNumberFormat(
      'yyyy-mm-dd'
    );


  /*
   * Price
   */

  sheet
    .getRange(
      6,
      9,
      output.length,
      1
    )
    .setNumberFormat(
      '0.00'
    );


  /*
   * 52W High
   */

  sheet
    .getRange(
      6,
      10,
      output.length,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  /*
   * Performance Month
   */

  sheet
    .getRange(
      6,
      14,
      output.length,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  /*
   * SMA20
   */

  sheet
    .getRange(
      6,
      18,
      output.length,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  /*
   * Momentum Score
   */

  sheet
    .getRange(
      6,
      20,
      output.length,
      1
    )
    .setNumberFormat(
      '0'
    );


  // ==========================================================
  // REVIEW STATUS
  // ==========================================================

  const statusRule =
    SpreadsheetApp
      .newDataValidation()
      .requireValueInList(
        [
          'REVIEW',
          'WATCH',
          'READY',
          'REJECT'
        ],
        true
      )
      .setAllowInvalid(
        false
      )
      .build();


  sheet
    .getRange(
      6,
      21,
      output.length,
      1
    )
    .setDataValidation(
      statusRule
    );


  // ==========================================================
  // PRESENTATION
  // ==========================================================

  sheet.setFrozenRows(
    5
  );


  sheet.autoResizeColumns(
    1,
    headers.length
  );


  /*
   * Notre thème doit être réappliqué parce que sheet.clear()
   * supprime le format précédent.
   */

  themeRanking(
    ss
  );
}


/**
 * ============================================================
 * LATEST SIGNAL DATE
 * ============================================================
 */

function findLatestSignalDate(
  rows,
  dateIndex
) {
  const dates =
    rows
      .map(
        row =>
          normalizeSignalDate(
            row[
              dateIndex
            ]
          )
      )
      .filter(
        Boolean
      );


  if (
    dates.length === 0
  ) {
    throw new Error(
      'Aucune Signal Date valide.'
    );
  }


  /*
   * yyyy-MM-dd est volontairement utilisé :
   * le tri lexical correspond au tri chronologique.
   */

  dates.sort();


  return dates[
    dates.length - 1
  ];
}