/**
 * ============================================================
 * GENERIC UTILITIES
 * ============================================================
 */


/**
 * Trouve une colonne par son nom exact.
 */
function requireColumn(headers, name) {
  const expected =
    String(name)
      .trim()
      .toLowerCase();

  const index =
    headers.findIndex(header =>
      String(header)
        .trim()
        .toLowerCase() === expected
    );

  if (index === -1) {
    throw new Error(
      `Colonne absente : ${name}`
    );
  }

  return index;
}


/**
 * Trouve une colonne après une position donnée.
 *
 * Utile parce que Signals History contient :
 *
 * - notre Ticker interne
 * - puis le Ticker provenant de Finviz
 *
 * Cela évite les ambiguïtés.
 */
function requireColumnAfter(
  headers,
  name,
  afterIndex
) {
  const expected =
    String(name)
      .trim()
      .toLowerCase();

  for (
    let i = afterIndex + 1;
    i < headers.length;
    i++
  ) {
    if (
      String(headers[i])
        .trim()
        .toLowerCase() === expected
    ) {
      return i;
    }
  }

  throw new Error(
    `Colonne Finviz absente : ${name}`
  );
}


/**
 * Convertit une valeur en nombre.
 *
 * Ex:
 *
 * "3.26" -> 3.26
 * "1,234.56" -> 1234.56
 */
function parseNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value === 'number'
  ) {
    return value;
  }

  const cleaned =
    String(value)
      .replace(/,/g, '')
      .trim();

  const number =
    Number(cleaned);

  return Number.isFinite(number)
    ? number
    : null;
}


/**
 * Convertit une valeur Finviz en décimal.
 *
 * Ex:
 *
 * "-3.38%" -> -0.0338
 * "10.31%" -> 0.1031
 */
function parsePercent(value) {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  if (
    typeof value === 'number'
  ) {
    return value;
  }

  const text =
    String(value).trim();

  if (
    text.endsWith('%')
  ) {
    const number =
      Number(
        text
          .replace('%', '')
          .replace(/,/g, '')
      );

    return Number.isFinite(number)
      ? number / 100
      : null;
  }

  const number =
    Number(
      text.replace(/,/g, '')
    );

  return Number.isFinite(number)
    ? number
    : null;
}


/**
 * Retourne une date yyyy-MM-dd
 * dans le timezone du Google Sheet.
 */
function formatSignalDate(date) {
  const timezone =
    SpreadsheetApp
      .getActiveSpreadsheet()
      .getSpreadsheetTimeZone();

  return Utilities.formatDate(
    date,
    timezone,
    'yyyy-MM-dd'
  );
}


/**
 * Normalise une Signal Date.
 */
function normalizeSignalDate(value) {
  if (!value) {
    return '';
  }

  if (
    value instanceof Date
  ) {
    return formatSignalDate(
      value
    );
  }

  return String(value)
    .trim()
    .substring(0, 10);
}


/**
 * Normalise une date déjà présente
 * dans Signals History.
 */
function normalizeExistingDate(value) {
  if (!value) {
    return '';
  }

  if (
    value instanceof Date
  ) {
    return formatSignalDate(
      value
    );
  }

  return String(value)
    .trim()
    .substring(0, 10);
}

/**
 * Modifie une cellule en utilisant
 * le nom de sa colonne.
 */
function setValueByHeader(
  sheet,
  headers,
  rowNumber,
  headerName,
  value
) {
  const index =
    requireColumn(
      headers,
      headerName
    );

  sheet
    .getRange(
      rowNumber,
      index + 1
    )
    .setValue(value);
}

function styleDashboardCard(
  sheet,
  rangeA1,
  background
) {
  const range =
    sheet.getRange(rangeA1);

  range
    .setBackground(background)
    .setBorder(
      true,
      true,
      true,
      true,
      false,
      false
    );
}


function applyAlternatingRows(
  sheet,
  startRow,
  endRow
) {
  for (
    let row = startRow;
    row <= endRow;
    row++
  ) {

    if (
      (row - startRow) % 2 === 1
    ) {
      sheet
        .getRange(
          row,
          1,
          1,
          9
        )
        .setBackground(
          COCKPIT_THEME.lightGray
        );
    }
  }
}

function writeActionSummary(
  sheet,
  row,
  label,
  count,
  background
) {
  sheet
    .getRange(
      row,
      10,
      1,
      3
    )
    .merge()
    .setValue(label)
    .setBackground(background)
    .setFontWeight('bold');


  sheet
    .getRange(
      row,
      13
    )
    .setValue(count)
    .setBackground(background)
    .setFontWeight('bold')
    .setHorizontalAlignment(
      'center'
    );
}


function writeActionSection(
  sheet,
  row,
  title
) {
  sheet
    .getRange(
      row,
      10,
      1,
      4
    )
    .merge()
    .setValue(title)
    .setBackground(
      COCKPIT_THEME.blue
    )
    .setFontColor(
      COCKPIT_THEME.white
    )
    .setFontWeight('bold');
}


function writeNoAction(
  sheet,
  row,
  message
) {
  sheet
    .getRange(
      row,
      10,
      1,
      4
    )
    .merge()
    .setValue(message)
    .setFontColor(
      COCKPIT_THEME.gray
    )
    .setFontStyle(
      'italic'
    );
}

function sumValues(values) {
  return values.reduce(
    (sum, value) =>
      sum +
      (
        Number(value) || 0
      ),
    0
  );
}


function averageValues(values) {
  if (
    !values ||
    values.length === 0
  ) {
    return 0;
  }

  return (
    sumValues(values) /
    values.length
  );
}


function writeAnalyticsSection(
  sheet,
  row,
  title
) {
  sheet
    .getRange(
      row,
      1,
      1,
      8
    )
    .merge()
    .setValue(title);
}


function writeAnalyticsMetric(
  sheet,
  labelCell,
  valueCell,
  label,
  value,
  numberFormat
) {
  sheet
    .getRange(labelCell)
    .setValue(label)
    .setFontWeight('bold');


  const range =
    sheet.getRange(
      valueCell
    );


  /*
   * Profit Factor peut être null lorsque
   * nous n'avons encore aucune perte.
   */

  if (
    value === null ||
    value === undefined
  ) {
    range.setValue('—');
    return;
  }


  range
    .setValue(value)
    .setFontWeight('bold')
    .setFontSize(12);


  if (numberFormat) {
    range.setNumberFormat(
      numberFormat
    );
  }
  else {
    range.setNumberFormat(
      '0'
    );
  }
}


function writeStrategyAnalytics(
  sheet,
  startRow,
  strategies
) {
  const headers = [
    'Strategy',
    'Trades',
    'Wins',
    'Win Rate',
    'Total P&L',
    'Average R',
    'Total R'
  ];


  sheet
    .getRange(
      startRow,
      1,
      1,
      headers.length
    )
    .setValues([
      headers
    ]);


  if (
    !strategies ||
    strategies.length === 0
  ) {
    return;
  }


  const values =
    strategies.map(
      strategy => [
        strategy.strategy,
        strategy.trades,
        strategy.wins,
        strategy.winRate,
        strategy.totalPnl,
        strategy.averageR,
        strategy.totalR
      ]
    );


  sheet
    .getRange(
      startRow + 1,
      1,
      values.length,
      headers.length
    )
    .setValues(values);


  sheet
    .getRange(
      startRow + 1,
      4,
      values.length,
      1
    )
    .setNumberFormat(
      '0.00%'
    );


  sheet
    .getRange(
      startRow + 1,
      5,
      values.length,
      1
    )
    .setNumberFormat(
      '$#,##0.00'
    );


  sheet
    .getRange(
      startRow + 1,
      6,
      values.length,
      2
    )
    .setNumberFormat(
      '0.00'
    );
}

/**
 * Retourne la valeur d'une ligne à partir du nom de colonne.
 *
 * @param {string[]} headers
 * @param {Array} row
 * @param {string} headerName
 * @return {*}
 */
function getValueByHeader(
  headers,
  row,
  headerName
) {
  const index =
    requireColumn(
      headers,
      headerName
    );

  return row[index];
}