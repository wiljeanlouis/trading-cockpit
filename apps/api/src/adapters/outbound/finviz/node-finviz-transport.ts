export interface FinvizHttpResponse {
  status: number;
  content: string;
  contentType?: string;
}

export interface FinvizTransport {
  fetch(url: string): Promise<FinvizHttpResponse>;
  parseCsv(csv: string): unknown[][];
}

export class NodeFinvizTransport implements FinvizTransport {
  async fetch(url: string): Promise<FinvizHttpResponse> {
    const response = await fetch(url, { method: 'GET', redirect: 'follow' });
    return {
      status: response.status,
      content: await response.text(),
      contentType: response.headers.get('content-type') ?? undefined
    };
  }

  parseCsv(csv: string): unknown[][] {
    return parseCsv(csv);
  }
}

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}
