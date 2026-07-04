import { isHtmlMediaBuffer, validateMediaBuffer } from './mediaContentValidation';

describe('mediaContentValidation', () => {
  it('detects HTML responses masquerading as media', () => {
    expect(isHtmlMediaBuffer(Buffer.from('<!DOCTYPE html><html></html>', 'utf8'))).toBe(true);
  });

  it('allows binary media headers', () => {
    expect(isHtmlMediaBuffer(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
    expect(isHtmlMediaBuffer(Buffer.from('GIF89a', 'utf8'))).toBe(false);
  });

  it('throws when validating HTML content', () => {
    expect(() => validateMediaBuffer(Buffer.from('<html></html>', 'utf8'))).toThrow(
      'Refusing to save HTML response as media',
    );
  });
});
