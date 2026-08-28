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

function getSheetHeaders(
  sheet
) {
  return sheet
    .getRange(
      1,
      1,
      1,
      sheet.getLastColumn()
    )
    .getValues()[0]
    .map(value =>
      String(value).trim()
    );
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
