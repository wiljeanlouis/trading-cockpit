import type { FinvizHttpResponse, FinvizTransport } from './finviz-market-signal-source';

export class AppsScriptFinvizTransport implements FinvizTransport {
  fetch(url: string): FinvizHttpResponse {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      followRedirects: true,
      muteHttpExceptions: true
    });
    return { status: response.getResponseCode(), content: response.getContentText() };
  }

  parseCsv(csv: string): unknown[][] {
    return Utilities.parseCsv(csv);
  }
}
