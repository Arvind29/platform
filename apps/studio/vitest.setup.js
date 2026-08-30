// jsdom implements no layout engine and only partially stubs the scroll APIs. The dialogue
// test components call scrollIntoView() / scrollTo() for their auto-scroll behaviour; make those
// safe no-ops here so component tests can exercise the surrounding logic without hitting a
// "not a function" in environments where jsdom hasn't provided them.
if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
}
if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = () => {};
}
