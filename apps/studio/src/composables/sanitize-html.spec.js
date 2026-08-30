/* @license
 *
 *                Copyright (c) 2023-2026 Fruit Tree Labs (www.fruittreelabs.com)
 *
 *
 *     This material is part of the Dialogue Branch Platform, and is covered by the MIT License
 *                                        as outlined below.
 *
 *                                            ----------
 *
 * Copyright (c) 2023-2026 Fruit Tree Labs (www.fruittreelabs.com)
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute,
 * sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
 * NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
 * DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { describe, it, expect } from 'vitest';
import { sanitizeHtml, statementToHtml } from './sanitize-html.js';

describe('sanitizeHtml', () => {
    it('keeps author-embedded inline formatting', () => {
        expect(sanitizeHtml('<b>bold</b> and <em>emphasis</em>')).toBe('<b>bold</b> and <em>emphasis</em>');
    });

    it('strips executable content', () => {
        const cleaned = sanitizeHtml('hello <script>alert(1)</script> world');
        expect(cleaned).not.toContain('<script>');
        expect(cleaned).toContain('hello');
        expect(cleaned).toContain('world');
    });

    it('strips event-handler attributes (e.g. from a resolved $variable value)', () => {
        expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).not.toContain('onerror');
    });

    it('treats null / undefined as an empty string', () => {
        expect(sanitizeHtml(null)).toBe('');
        expect(sanitizeHtml(undefined)).toBe('');
    });
});

describe('statementToHtml', () => {
    it('wraps a single line in one paragraph', () => {
        expect(statementToHtml('Just one line.')).toBe('<p>Just one line.</p>');
    });

    it('starts a new paragraph on a blank line', () => {
        expect(statementToHtml('First paragraph.\n\nSecond paragraph.'))
            .toBe('<p>First paragraph.</p><p>Second paragraph.</p>');
    });

    it('collapses three or more newlines into a single paragraph break (no empty <p>)', () => {
        expect(statementToHtml('A\n\n\n\nB')).toBe('<p>A</p><p>B</p>');
    });

    it('turns a single newline within a paragraph into a <br>', () => {
        expect(statementToHtml('Line one\nline two')).toBe('<p>Line one<br>line two</p>');
    });

    it('normalises CRLF and CR line endings', () => {
        expect(statementToHtml('A\r\n\r\nB')).toBe('<p>A</p><p>B</p>');
        expect(statementToHtml('A\rB')).toBe('<p>A<br>B</p>');
    });

    it('drops leading, trailing and interior blank lines', () => {
        expect(statementToHtml('\n\n  Middle  \n\n')).toBe('<p>Middle</p>');
    });

    it('returns an empty string for empty / whitespace-only / nullish input', () => {
        expect(statementToHtml('')).toBe('');
        expect(statementToHtml('   \n  \n ')).toBe('');
        expect(statementToHtml(null)).toBe('');
        expect(statementToHtml(undefined)).toBe('');
    });

    it('keeps inline formatting but still strips executable content per paragraph', () => {
        const html = statementToHtml('Safe <b>bold</b>\n\n<script>alert(1)</script>evil');
        expect(html).toContain('<p>Safe <b>bold</b></p>');
        expect(html).not.toContain('<script>');
        expect(html).toContain('evil');
    });
});
