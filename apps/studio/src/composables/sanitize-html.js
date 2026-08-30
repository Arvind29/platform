import DOMPurify from 'dompurify';

// Dialogue authors can intentionally embed simple HTML formatting (e.g. <b>, <i>, <br>) in a
// node's text, which is rendered via v-html. That same text can also contain resolved $variable
// values supplied at runtime (via the Variable Browser, or a free-text INPUT_REPLY captured from
// an end user) — those must never be allowed to inject executable content. Sanitizing here keeps
// author-authored formatting working while closing off that injection path.
export function sanitizeHtml(html) {
    return DOMPurify.sanitize(html ?? '');
}

// Renders a dialogue statement's text as safe HTML for v-html. Authors write paragraph breaks as
// blank lines and soft line breaks as single newlines; both are preserved end-to-end by the
// parser and the web service, but collapse to a single space once injected as HTML. Here a run
// of two or more newlines starts a new <p>, and any remaining single newline becomes a <br>.
// Inline formatting the author embedded (<b>, <em>, ...) is kept; sanitizeHtml strips anything
// executable, including from resolved $variable values spliced into the text at runtime.
export function statementToHtml(text) {
    const paragraphs = (text ?? '')
        .replace(/\r\n?/g, '\n')
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter((paragraph) => paragraph.length > 0)
        .map((paragraph) => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`);
    return sanitizeHtml(paragraphs.join(''));
}
