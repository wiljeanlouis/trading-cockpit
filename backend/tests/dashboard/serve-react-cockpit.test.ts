/// <reference types="google-apps-script" />

import { afterEach, describe, expect, it, vi } from 'vitest';
import { serveReactCockpit } from '../../src/adapters/inbound/apps-script/serve-react-cockpit';

afterEach(() => vi.unstubAllGlobals());

describe('serveReactCockpit', () => {
  it('serves the generated inline React artifact with Web App metadata', () => {
    const output = {
      setTitle: vi.fn(),
      addMetaTag: vi.fn()
    };
    output.setTitle.mockReturnValue(output);
    output.addMetaTag.mockReturnValue(output);
    const createHtmlOutputFromFile = vi.fn(() => output);
    vi.stubGlobal('HtmlService', { createHtmlOutputFromFile });

    expect(serveReactCockpit()).toBe(output);
    expect(createHtmlOutputFromFile).toHaveBeenCalledWith('build/CockpitWeb');
    expect(output.setTitle).toHaveBeenCalledWith('Trading Cockpit');
    expect(output.addMetaTag).toHaveBeenCalledWith(
      'viewport',
      'width=device-width, initial-scale=1'
    );
  });
});
