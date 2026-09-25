// A scroll renderer for reflowable EPUBs. Foliate's View still owns book
// parsing, CFI navigation, links, progress and annotation creation; this
// renderer supplies the section documents and one shared scroll surface.
// eslint-disable-next-line no-undef -- esbuild injects the scoped custom-element tag.
const TAG = typeof __QBR_CONTINUOUS_TAG__ === "string" ? __QBR_CONTINUOUS_TAG__ : "qbr-continuous-epub";

export function adjacentReadableSection(sections, index, direction) {
    for (let next = index + direction; next >= 0 && next < sections.length; next += direction)
        if (sections[next]?.linear !== "no") return next;
    return null;
}

export function sectionAtOffset(records, offset) {
    return records.find(record => record.element.offsetTop + record.element.offsetHeight > offset)
        ?? records.at(-1) ?? null;
}

export class ContinuousEpubRenderer extends HTMLElement {
    static observedAttributes = ["max-inline-size"];

    #root = this.attachShadow({ mode: "closed" });
    #scroller;
    #flow;
    #book = null;
    #records = new Map();
    #pending = new Map();
    #currentIndex = -1;
    #styles = "";
    #generation = 0;
    #windowPass = 0;
    #scrollTimer = null;
    #resizeObserver = null;
    #settingPosition = false;

    constructor() {
        super();
        const style = this.ownerDocument.createElement("style");
        style.textContent = `
            :host { display:block; width:100%; height:100%; min-width:0; min-height:0; }
            #scroller { width:100%; height:100%; overflow:auto; overscroll-behavior:contain;
                overflow-anchor:none; box-sizing:border-box; }
            #flow { position:relative; min-height:100%; }
            .section { position:relative; width:100%; min-height:1px; box-sizing:border-box; }
            iframe { display:block; width:100%; min-height:1px; border:0; overflow:hidden; }
        `;
        this.#scroller = this.ownerDocument.createElement("div");
        this.#scroller.id = "scroller";
        this.#scroller.setAttribute("part", "container");
        this.#flow = this.ownerDocument.createElement("div");
        this.#flow.id = "flow";
        this.#scroller.append(this.#flow);
        this.#root.append(style, this.#scroller);
        this.#scroller.addEventListener("scroll", () => {
            this.dispatchEvent(new Event("scroll"));
            if (this.#settingPosition) return;
            if (this.#scrollTimer !== null) return;
            this.#scrollTimer = this.ownerDocument.defaultView?.setTimeout(() => {
                this.#scrollTimer = null;
                this.#relocate("scroll");
                void this.#maintainWindow();
            }, 100);
        }, { passive: true });
        const Resize = this.ownerDocument.defaultView?.ResizeObserver;
        if (Resize) {
            this.#resizeObserver = new Resize(() => {
                for (const record of this.#records.values()) this.#measure(record);
                this.#relocate("resize");
            });
            this.#resizeObserver.observe(this);
        }
    }

    attributeChangedCallback() {
        const anchor = this.captureAnchor();
        for (const record of this.#records.values()) {
            if (record.doc) this.#styleDocument(record.doc);
            this.#measure(record);
        }
        this.restoreAnchor(anchor);
    }

    open(book) { this.#book = book; }

    get scrolled() { return true; }
    get atStart() { return this.#currentIndex >= 0
        && adjacentReadableSection(this.#book?.sections ?? [], this.#currentIndex, -1) === null
        && this.#scroller.scrollTop <= 1; }
    get atEnd() { return this.#currentIndex >= 0
        && adjacentReadableSection(this.#book?.sections ?? [], this.#currentIndex, 1) === null
        && this.#scroller.scrollTop + this.#scroller.clientHeight >= this.#scroller.scrollHeight - 2; }

    #orderedRecords() {
        return [...this.#records.values()].sort((a, b) => a.index - b.index);
    }

    async #ensure(index) {
        if (this.#records.has(index)) return this.#pending.get(index) ?? this.#records.get(index);
        const section = this.#book?.sections[index];
        if (!section) throw new Error(`Missing EPUB section ${index}`);
        const generation = this.#generation;
        const element = this.ownerDocument.createElement("section");
        element.className = "section";
        element.dataset.index = String(index);
        const frame = this.ownerDocument.createElement("iframe");
        frame.setAttribute("part", "filter");
        frame.setAttribute("scrolling", "no");
        frame.setAttribute("sandbox", "allow-same-origin allow-scripts");
        element.append(frame);
        const next = [...this.#flow.children].find(node => Number(node.dataset.index) > index);
        const before = this.#scroller.scrollHeight;
        if (next) this.#flow.insertBefore(element, next);
        else this.#flow.append(element);
        if (next) this.#scroller.scrollTop += this.#scroller.scrollHeight - before;
        const record = { index, element, frame, doc: null, overlayer: null, observer: null };
        this.#records.set(index, record);
        const loading = (async () => {
            let src;
            try {
                src = await section.load();
                if (generation !== this.#generation || !this.#records.has(index)) return null;
                await new Promise((resolve, reject) => {
                    frame.addEventListener("load", resolve, { once: true });
                    frame.addEventListener("error", () => reject(new Error(`Could not load EPUB section ${index}`)), { once: true });
                    frame.src = src;
                });
                if (generation !== this.#generation || !this.#records.has(index)) return null;
                const doc = frame.contentDocument;
                if (!doc?.body) throw new Error(`EPUB section ${index} has no document`);
                record.doc = doc;
                this.#styleDocument(doc);
                this.#forwardInput(doc);
                this.dispatchEvent(new CustomEvent("load", { detail: { doc, index } }));
                this.dispatchEvent(new CustomEvent("create-overlayer", {
                    detail: { doc, index, attach: overlayer => {
                        record.overlayer = overlayer;
                        element.append(overlayer.element);
                    } },
                }));
                this.#measure(record);
                const Resize = this.ownerDocument.defaultView?.ResizeObserver;
                if (Resize) {
                    record.observer = new Resize(() => this.#measure(record));
                    record.observer.observe(doc.documentElement);
                    record.observer.observe(doc.body);
                }
                doc.fonts?.ready?.then(() => this.#measure(record));
                doc.addEventListener("load", () => this.#measure(record), true);
                return record;
            } catch (error) {
                if (this.#records.get(index) === record) this.#drop(index);
                throw error;
            } finally { if (this.#pending.get(index) === loading) this.#pending.delete(index); }
        })();
        this.#pending.set(index, loading);
        return loading;
    }

    #styleDocument(doc) {
        const html = doc.documentElement;
        const body = doc.body;
        if (!html || !body) return;
        const width = Math.max(1, parseInt(this.getAttribute("max-inline-size"), 10) || 720);
        let style = doc.querySelector("style[data-qbr-continuous]");
        if (!style) {
            style = doc.createElement("style");
            style.setAttribute("data-qbr-continuous", "");
            (doc.head || html).append(style);
        }
        style.textContent = `${this.#styles}\n`
            + `html{box-sizing:border-box!important;width:100%!important;height:auto!important;`
            + `min-height:0!important;overflow:hidden!important;padding:28px 20px!important}`
            + `body{box-sizing:border-box!important;max-width:${width}px!important;`
            + `margin:0 auto!important;overflow-wrap:break-word!important}`
            + `body img,body svg,body video{max-width:100%!important;`
            + `max-height:${Math.max(120, this.#scroller.clientHeight - 56)}px!important;object-fit:contain!important}`;
    }

    #forwardInput(doc) {
        // A full-height iframe has no internal scroll range. Forward gestures
        // explicitly so wheel and touch keep moving the shared outer scroller.
        doc.addEventListener("wheel", event => {
            if (event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
            const scale = event.deltaMode === 1 ? 40 : event.deltaMode === 2
                ? this.#scroller.clientHeight : 1;
            const delta = event.deltaY * scale;
            for (let el = event.target; el && el !== doc.body; el = el.parentElement) {
                const room = el.scrollHeight - el.clientHeight;
                if (room > 1 && (delta > 0 ? el.scrollTop < room - 1 : el.scrollTop > 1)) return;
            }
            event.preventDefault();
            void this.#scrollDistance(delta, false).catch(error => console.warn("Qiaomu Reader: wheel scroll failed", error));
        }, { passive: false });
        let lastY = null;
        doc.addEventListener("touchstart", event => {
            lastY = event.touches.length === 1 ? event.touches[0].clientY : null;
        }, { passive: true });
        doc.addEventListener("touchmove", event => {
            if (lastY === null || event.touches.length !== 1) return;
            const selection = doc.getSelection?.();
            if (selection && !selection.isCollapsed) { lastY = null; return; }
            const y = event.touches[0].clientY;
            const delta = lastY - y;
            lastY = y;
            if (Math.abs(delta) < 1) return;
            event.preventDefault();
            void this.#scrollDistance(delta, false).catch(error => console.warn("Qiaomu Reader: touch scroll failed", error));
        }, { passive: false });
        doc.addEventListener("touchend", () => { lastY = null; }, { passive: true });
        doc.addEventListener("touchcancel", () => { lastY = null; }, { passive: true });
        doc.addEventListener("keydown", event => {
            if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey
                || event.target?.closest?.("input,textarea,select,[contenteditable=true]")) return;
            const direction = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1
                : event.key === " " ? (event.shiftKey ? -1 : 1) : 0;
            if (!direction) return;
            event.preventDefault();
            void this.#scrollDistance(direction * (event.key === " "
                ? this.#scroller.clientHeight * .85 : 48), false).catch(error => console.warn("Qiaomu Reader: key scroll failed", error));
        });
    }

    #measure(record) {
        if (!record?.doc || !record.element.isConnected) return;
        const { doc, frame, element } = record;
        const before = element.offsetHeight;
        const above = record.index < this.#currentIndex
            || element.getBoundingClientRect().bottom <= this.#scroller.getBoundingClientRect().top;
        const bodyBottom = doc.body.getBoundingClientRect().bottom;
        const height = Math.max(1, Math.ceil(Math.max(
            doc.body.scrollHeight + 56, bodyBottom + 28,
        )));
        if (Math.abs(before - height) < 1) return;
        frame.style.height = `${height}px`;
        element.style.height = `${height}px`;
        if (record.overlayer) {
            record.overlayer.element.style.height = `${height}px`;
            record.overlayer.redraw();
        }
        if (above) this.#scroller.scrollTop += height - before;
    }

    #drop(index) {
        const record = this.#records.get(index);
        if (!record) return;
        const pending = this.#pending.get(index);
        this.#records.delete(index);
        record.observer?.disconnect();
        if (record.doc) this.dispatchEvent(new CustomEvent("unload", { detail: { doc: record.doc, index } }));
        const above = record.element.getBoundingClientRect().bottom <= this.#scroller.getBoundingClientRect().top;
        const height = record.element.offsetHeight;
        record.element.remove();
        if (above) this.#scroller.scrollTop -= height;
        const section = this.#book?.sections[index];
        const unload = () => { try { section?.unload?.(); } catch { /* book may be closing */ } };
        if (pending) void pending.then(unload, unload);
        else unload();
    }

    #clear() {
        this.#generation++;
        for (const index of this.#records.keys()) this.#drop(index);
        this.#pending.clear();
        this.#currentIndex = -1;
    }

    async goTo(target) {
        const resolved = await target;
        const index = resolved?.index;
        if (!Number.isInteger(index) || index < 0 || index >= (this.#book?.sections.length ?? 0)) return;
        ++this.#windowPass;
        if (this.#records.size && !this.#records.has(index)) this.#clear();
        const record = await this.#ensure(index);
        if (!record) return;
        await this.#positionAt(record, resolved.anchor);
        this.#currentIndex = index;
        this.#relocate("navigation");
        void this.#maintainWindow();
    }

    async #positionAt(record, anchor) {
        const { doc, element } = record;
        if (typeof anchor === "function") anchor = anchor(doc);
        let offset = 0;
        if (typeof anchor === "number") offset = anchor * element.offsetHeight;
        else if (anchor?.getClientRects) {
            const rects = anchor.getClientRects();
            offset = rects[0]?.top ?? anchor.getBoundingClientRect?.().top ?? 0;
        } else if (anchor?.getBoundingClientRect) offset = anchor.getBoundingClientRect().top;
        this.#settingPosition = true;
        this.#scroller.scrollTop = Math.max(0, element.offsetTop + offset);
        this.#settingPosition = false;
    }

    async #maintainWindow() {
        if (!this.#book || !this.#records.size) return;
        const pass = ++this.#windowPass;
        const active = sectionAtOffset(this.#orderedRecords(), this.#scroller.scrollTop + 28);
        if (!active?.doc) return;
        const previous = adjacentReadableSection(this.#book.sections, active.index, -1);
        const next = adjacentReadableSection(this.#book.sections, active.index, 1);
        try {
            // Load forward first so the next chapter is present before its edge
            // reaches the viewport. The backward section supports reverse scroll.
            if (next !== null) await this.#ensure(next);
            if (previous !== null) await this.#ensure(previous);
        } catch (error) {
            console.warn("Qiaomu Reader: could not preload an EPUB section", error);
        }
        if (pass !== this.#windowPass) return;
        const keep = new Set([active.index, previous, next]);
        for (const index of this.#records.keys()) if (!keep.has(index)) this.#drop(index);
        this.#relocate("scroll");
    }

    #caretAt(doc, x, y) {
        const direct = doc.caretRangeFromPoint?.(x, y);
        if (direct) return direct;
        const position = doc.caretPositionFromPoint?.(x, y);
        if (position) {
            const range = doc.createRange();
            range.setStart(position.offsetNode, position.offset);
            range.collapse(true);
            return range;
        }
        return null;
    }

    #visibleRange(record) {
        const { doc, element, frame } = record;
        const top = Math.max(0, this.#scroller.scrollTop - element.offsetTop);
        const bottom = Math.min(element.offsetHeight, top + this.#scroller.clientHeight);
        const x = frame.clientWidth / 2;
        const from = this.#caretAt(doc, x, Math.min(bottom, top + 20));
        const to = this.#caretAt(doc, x, Math.max(top, bottom - 20));
        if (from) {
            if (to) try {
                const range = doc.createRange();
                range.setStart(from.startContainer, from.startOffset);
                range.setEnd(to.startContainer, to.startOffset);
                return range;
            } catch { /* use the first visible caret */ }
            return from;
        }
        const range = doc.createRange();
        range.selectNodeContents(doc.body);
        range.collapse(true);
        return range;
    }

    #relocate(reason) {
        const record = sectionAtOffset(this.#orderedRecords(), this.#scroller.scrollTop + 28);
        if (!record?.doc) return;
        this.#currentIndex = record.index;
        const range = this.#visibleRange(record);
        const fraction = Math.max(0, Math.min(1,
            (this.#scroller.scrollTop - record.element.offsetTop) / Math.max(1, record.element.offsetHeight),
        ));
        this.dispatchEvent(new CustomEvent("relocate", {
            detail: { reason, range, index: record.index, fraction },
        }));
    }

    async #scrollDistance(distance, report = true) {
        const direction = Math.sign(distance);
        let remaining = Math.abs(distance);
        const generation = this.#generation;
        const sections = this.#book?.sections ?? [];
        for (let loaded = 0; remaining > .001 && loaded <= sections.length; loaded++) {
            const before = this.#scroller.scrollTop;
            this.#scroller.scrollTop += direction * remaining;
            remaining -= Math.abs(this.#scroller.scrollTop - before);
            if (remaining <= .001) break;
            const records = this.#orderedRecords().filter(record => record.doc);
            const edge = direction > 0 ? records.at(-1) : records[0];
            const adjacent = edge && adjacentReadableSection(sections, edge.index, direction);
            if (adjacent === null || adjacent === undefined) break;
            const record = await this.#ensure(adjacent);
            if (!record || generation !== this.#generation) return;
        }
        if (report) {
            this.#relocate("scroll");
            void this.#maintainWindow();
        }
    }

    async next(distance) {
        if (!this.#records.size) {
            const first = this.#book?.sections.findIndex(section => section?.linear !== "no") ?? -1;
            if (first >= 0) await this.goTo({ index: first, anchor: 0 });
            return;
        }
        await this.#scrollDistance(distance ?? this.#scroller.clientHeight * .85);
    }

    async prev(distance) {
        if (!this.#records.size) return;
        await this.#scrollDistance(-(distance ?? this.#scroller.clientHeight * .85));
    }

    async scrollBy(dx, dy) {
        if (!Number.isFinite(dy) || dy === 0) return;
        if (dy > 0) await this.next(dy);
        else await this.prev(-dy);
    }

    async scrollToAnchor(anchor) {
        const record = this.#records.get(this.#currentIndex);
        if (!record) return;
        await this.#positionAt(record, anchor);
        this.#relocate("navigation");
    }

    getContents() {
        return this.#orderedRecords().filter(record => record.doc)
            .map(({ index, doc, overlayer }) => ({ index, doc, overlayer }));
    }

    setStyles(styles) {
        this.#styles = Array.isArray(styles) ? styles.join("\n") : String(styles || "");
        for (const record of this.#records.values()) if (record.doc) {
            this.#styleDocument(record.doc);
            this.#measure(record);
        }
    }

    captureAnchor() {
        const record = sectionAtOffset(this.#orderedRecords(), this.#scroller.scrollTop + 28);
        if (!record?.doc) return null;
        const range = this.#visibleRange(record);
        const first = range.getClientRects?.()[0];
        if (!first) return null;
        return {
            index: record.index, range,
            top: record.element.offsetTop + first.top - this.#scroller.scrollTop,
        };
    }

    restoreAnchor(anchor) {
        if (!anchor) return;
        const record = this.#records.get(anchor.index);
        const first = anchor.range.getClientRects?.()[0];
        if (!record || !first) return;
        this.#settingPosition = true;
        this.#scroller.scrollTop = record.element.offsetTop + first.top - anchor.top;
        this.#settingPosition = false;
        this.#relocate("resize");
    }

    focusView() { this.#records.get(this.#currentIndex)?.doc?.defaultView?.focus(); }

    destroy() {
        this.ownerDocument.defaultView?.clearTimeout(this.#scrollTimer);
        this.#resizeObserver?.disconnect();
        this.#clear();
        this.#book = null;
    }
}

if (!customElements.get(TAG)) customElements.define(TAG, ContinuousEpubRenderer);
