import type { FinvizHttpResponse, FinvizTransport } from './finviz-market-signal-source';

export class AppsScriptFinvizTransport implements FinvizTransport {
  fetch(url: string): FinvizHttpResponse {
    const response = UrlFetchApp.fetch(url, {
      method: 'get',
      followRedirects: true,
      muteHttpExceptions: true
    });
    const headers = response.getAllHeaders();
    const contentTypeEntry = Object.entries(headers).find(
      ([name]) => name.toLowerCase() === 'content-type'
    );
    return {
      status: response.getResponseCode(),
      content: response.getContentText(),
      contentType: contentTypeEntry ? String(contentTypeEntry[1]) : undefined
    };
  }

  parseCsv(csv: string): unknown[][] {
    return Utilities.parseCsv(csv);
  }
}
