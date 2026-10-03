import { Modal, requestUrl } from "obsidian";
import { externalBookSearchUrls, gutenbergSearchUrl, gutenbergDetailUrl, parseGutenbergSearch, parseGutenbergEpub, validGutenbergEpub, safeBookFileName } from "./book-discovery.js";

// Adapted from upstream Qiaomu Reader's BookDiscoveryModal (GPL-3.0-only).
const ANNA_LABEL = "Anna’s Archive ↗";

export class BookDiscoveryModal extends Modal {
  constructor(app, library, translate) {
    super(app);
    this.library = library;
    this.t = translate;
    this.request = 0;
    library._discoveryDownloads ||= new Set();
  }
  onOpen() {
    this.isOpen = true;
    this.modalEl.addClass("qiaomu-reader-book-discovery");
    this.setTitle(this.t("find-books"));
    const root = this.contentEl;
    root.empty();
    root.createDiv({ cls: "qiaomu-reader-discovery-intro", text: this.t("find-books-intro") });
    const form = root.createEl("form", { cls: "qiaomu-reader-discovery-search" });
    const label = form.createEl("label", { text: this.t("book-title-or-author") });
    const field = label.createEl("input", { attr: { type: "search", autocomplete: "off", placeholder: this.t("book-title-or-author") } });
    form.createEl("button", { cls: "mod-cta", attr: { type: "submit" }, text: this.t("search") });
    const catalog = root.createEl("section", { cls: "qiaomu-reader-discovery-catalog" });
    catalog.createEl("h3", { text: this.t("gutenberg-results-note") });
    const status = catalog.createDiv({ cls: "qiaomu-reader-discovery-status", text: this.t("gutenberg-search-hint"), attr: { role: "status" } });
    const results = catalog.createDiv({ cls: "qiaomu-reader-discovery-results" });
    const external = root.createEl("section", { cls: "qiaomu-reader-discovery-external" });
    external.createEl("h3", { text: this.t("browser-book-sources") });
    const links = external.createDiv("qiaomu-reader-discovery-links");
    const anna = links.createEl("a", { text: ANNA_LABEL, href: "https://annas-archive.gl/", attr: { target: "_blank", rel: "noopener noreferrer" } });
    const zlibrary = links.createEl("a", { text: "Z-Library ↗", href: "https://z-library.sk/", attr: { target: "_blank", rel: "noopener noreferrer" } });
    external.createDiv({ cls: "qiaomu-reader-discovery-intro", text: this.t("external-book-source-hint") });
    field.addEventListener("input", () => {
      const urls = externalBookSearchUrls(field.value);
      anna.href = urls?.anna || "https://annas-archive.gl/";
      zlibrary.href = urls?.zlibrary || "https://z-library.sk/";
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!field.value.trim()) { status.setText(this.t("book-search-required")); field.focus(); return; }
      void this.search(field.value, status, results);
    });
    field.focus();
  }
  async search(query, status, results) {
    const request = ++this.request;
    results.empty();
    status.setText(this.t("searching-books"));
    try {
      const response = await requestUrl({ url: gutenbergSearchUrl(query), method: "GET", throw: false });
      if (!this.isOpen || request !== this.request) return;
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      const books = parseGutenbergSearch(response.text, xml => new DOMParser().parseFromString(xml, "application/xml"));
      status.setText(this.t(books.length ? "gutenberg-results-note" : "no-books-found"));
      for (const book of books) {
        const row = results.createDiv("qiaomu-reader-discovery-result");
        const info = row.createDiv("qiaomu-reader-discovery-result-info");
        info.createEl("strong", { text: book.title });
        if (book.author) info.createSpan({ text: book.author });
        const feedback = info.createDiv({ cls: "qiaomu-reader-discovery-status", attr: { role: "status" } });
        row.createEl("a", { text: this.t("book-page"), href: book.pageUrl, attr: { target: "_blank", rel: "noopener noreferrer" } });
        const button = row.createEl("button", { attr: { type: "button" }, text: this.t("download-to-library") });
        if (this.hasBook(book.id)) { button.disabled = true; button.setText(this.t("book-already-in-library")); }
        button.addEventListener("click", () => void this.download(book, button, feedback));
      }
    } catch (error) {
      if (!this.isOpen || request !== this.request) return;
      console.warn("Qiaomu Reader: book search failed", error);
      status.setText(this.t("book-search-failed"));
    }
  }
  hasBook(id) {
    return this.app.vault.getFiles().some(file => file.name.endsWith(`(Gutenberg ${id}).epub`));
  }
  async download(book, button, status) {
    const pending = this.library._discoveryDownloads;
    if (button.disabled || pending.has(book.id)) return;
    if (this.hasBook(book.id)) { button.disabled = true; button.setText(this.t("book-already-in-library")); return; }
    pending.add(book.id);
    button.disabled = true;
    button.setText(this.t("downloading-book"));
    let imported = false;
    try {
      const detail = await requestUrl({ url: gutenbergDetailUrl(book.id), method: "GET", throw: false });
      if (!this.isOpen) return;
      if (detail.status !== 200) throw new Error(`Catalog HTTP ${detail.status}`);
      const epub = parseGutenbergEpub(detail.text, book.id, xml => new DOMParser().parseFromString(xml, "application/xml"));
      if (!epub) throw new Error("No EPUB acquisition link");
      const response = await requestUrl({ url: epub.url, method: "GET", throw: false });
      if (!this.isOpen) return;
      if (response.status !== 200 || !validGutenbergEpub(response.arrayBuffer)) throw new Error("Invalid EPUB response");
      if (this.hasBook(book.id)) { imported = true; return; }
      const count = await this.library._importBooks([{ name: safeBookFileName(book.title, book.id), type: "application/epub+zip", arrayBuffer: async () => response.arrayBuffer }]);
      if (!count) throw new Error("Vault import failed");
      imported = true;
      if (this.isOpen) status.setText(this.t("book-import-finished"));
    } catch (error) {
      console.warn("Qiaomu Reader: book download failed", error);
      if (this.isOpen) status.setText(this.t("book-download-failed"));
    } finally {
      pending.delete(book.id);
      if (this.isOpen) {
        button.disabled = imported;
        button.setText(this.t(imported ? "book-import-finished" : "download-to-library"));
      }
    }
  }
  onClose() { this.isOpen = false; this.request++; this.contentEl.empty(); }
}
