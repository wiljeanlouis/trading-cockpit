/**
 * ============================================================
 * TRADING WORKFLOW
 * ============================================================
 *
 * Synchronisation des états entre :
 *
 * Watchlist
 *    ↓
 * Trade Plan
 *    ↓
 * Position
 *    ↓
 * Journal
 *
 * Les fonctions métier ne doivent pas connaître
 * la structure physique des autres feuilles.
 */


/**
 * Change le statut d'une entrée Watchlist.
 */
function updateWatchlistStatus(
  watchlistId,
  newStatus
) {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();

  const sheet =
    ss.getSheetByName(
      WATCHLIST_SHEET
    );

  if (!sheet) {
    throw new Error(
      `${WATCHLIST_SHEET} est absent.`
    );
  }


  const headers =
    getSheetHeaders(sheet);


  const idIndex =
    requireColumn(
      headers,
      'Watchlist ID'
    );


  const statusIndex =
    requireColumn(
      headers,
      'Status'
    );


  const lastRow =
    sheet.getLastRow();


  if (lastRow <= 1) {
    throw new Error(
      `Watchlist vide pour ID ${watchlistId}.`
    );
  }


  const data =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getValues();


  for (
    let i = 0;
    i < data.length;
    i++
  ) {
    const rowId =
      String(
        data[i][idIndex] || ''
      ).trim();


    if (
      rowId ===
      String(watchlistId).trim()
    ) {
      sheet
        .getRange(
          i + 2,
          statusIndex + 1
        )
        .setValue(newStatus);

      return;
    }
  }


  throw new Error(
    `Watchlist ID introuvable : ${watchlistId}`
  );
}

/**
 * ============================================================
 * WORKFLOW RECONCILIATION
 * ============================================================
 *
 * Répare le statut des Watchlist à partir des objets
 * situés plus loin dans le workflow.
 *
 * Priorité :
 *
 * CLOSED position
 *      >
 * OPEN position
 *      >
 * active Trade Plan
 *
 */
function reconcileWorkflowStatuses() {
  const ss =
    SpreadsheetApp.getActiveSpreadsheet();


  const watchlist =
    ss.getSheetByName(
      WATCHLIST_SHEET
    );


  if (
    !watchlist ||
    watchlist.getLastRow() <= 1
  ) {
    return;
  }


  const watchHeaders =
    getSheetHeaders(
      watchlist
    );


  const watchIdIndex =
    requireColumn(
      watchHeaders,
      'Watchlist ID'
    );


  const watchStatusIndex =
    requireColumn(
      watchHeaders,
      'Status'
    );


  const watchData =
    watchlist
      .getRange(
        2,
        1,
        watchlist.getLastRow() - 1,
        watchlist.getLastColumn()
      )
      .getValues();


  // ==========================================================
  // POSITIONS
  // ==========================================================

  const positions =
    ss.getSheetByName(
      POSITIONS_SHEET
    );


  const positionStates =
    {};


  if (
    positions &&
    positions.getLastRow() > 1
  ) {
    const headers =
      getSheetHeaders(
        positions
      );


    const watchlistIdIndex =
      requireColumn(
        headers,
        'Watchlist ID'
      );


    const statusIndex =
      requireColumn(
        headers,
        'Status'
      );


    const data =
      positions
        .getRange(
          2,
          1,
          positions.getLastRow() - 1,
          positions.getLastColumn()
        )
        .getValues();


    data.forEach(row => {

      const id =
        String(
          row[watchlistIdIndex] || ''
        ).trim();


      const status =
        String(
          row[statusIndex] || ''
        )
          .trim()
          .toUpperCase();


      if (!id) {
        return;
      }


      /*
       * CLOSED est terminal et prioritaire.
       */

      if (
        status === 'CLOSED' ||
        status === 'STOPPED' ||
        status === 'TARGET HIT'
      ) {
        positionStates[id] =
          'CLOSED';

        return;
      }


      if (
        status === 'OPEN' &&
        positionStates[id] !== 'CLOSED'
      ) {
        positionStates[id] =
          'ENTERED';
      }

    });
  }


  // ==========================================================
  // TRADE PLANS
  // ==========================================================

  const tradePlans =
    ss.getSheetByName(
      TRADE_PLANS_SHEET
    );


  const planStates =
    {};


  if (
    tradePlans &&
    tradePlans.getLastRow() > 1
  ) {
    const headers =
      getSheetHeaders(
        tradePlans
      );


    const watchlistIdIndex =
      requireColumn(
        headers,
        'Watchlist ID'
      );


    const statusIndex =
      requireColumn(
        headers,
        'Status'
      );


    const data =
      tradePlans
        .getRange(
          2,
          1,
          tradePlans.getLastRow() - 1,
          tradePlans.getLastColumn()
        )
        .getValues();


    data.forEach(row => {

      const id =
        String(
          row[watchlistIdIndex] || ''
        ).trim();


      const status =
        String(
          row[statusIndex] || ''
        )
          .trim()
          .toUpperCase();


      if (!id) {
        return;
      }


      if (
        status === 'DRAFT' ||
        status === 'READY'
      ) {
        planStates[id] =
          'PLANNED';
      }

    });
  }


  // ==========================================================
  // RECONCILIATION
  // ==========================================================

  watchData.forEach(
    (row, index) => {

      const watchlistId =
        String(
          row[watchIdIndex] || ''
        ).trim();


      if (!watchlistId) {
        return;
      }


      const currentStatus =
        String(
          row[watchStatusIndex] || ''
        )
          .trim()
          .toUpperCase();


      /*
       * Ne pas ressusciter un setup explicitement rejeté.
       */

      if (
        currentStatus === 'REJECTED'
      ) {
        return;
      }


      let expectedStatus =
        null;


      if (
        positionStates[watchlistId]
      ) {
        expectedStatus =
          positionStates[watchlistId];
      }
      else if (
        planStates[watchlistId]
      ) {
        expectedStatus =
          planStates[watchlistId];
      }


      if (
        expectedStatus &&
        expectedStatus !== currentStatus
      ) {
        watchlist
          .getRange(
            index + 2,
            watchStatusIndex + 1
          )
          .setValue(
            expectedStatus
          );
      }

    }
  );


  ss.toast(
    'Workflow réconcilié.',
    'Trading Cockpit',
    5
  );
}