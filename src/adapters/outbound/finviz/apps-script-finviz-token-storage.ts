import type { FinvizTokenStorage } from './finviz-token-service';

const PROPERTY_NAME = 'FINVIZ_TOKEN';

export class AppsScriptFinvizTokenStorage implements FinvizTokenStorage {
  get(): string | null {
    return PropertiesService.getScriptProperties().getProperty(PROPERTY_NAME);
  }

  set(token: string): void {
    PropertiesService.getScriptProperties().setProperty(PROPERTY_NAME, token);
  }

  delete(): void {
    PropertiesService.getScriptProperties().deleteProperty(PROPERTY_NAME);
  }
}
