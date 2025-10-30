class MaskScroll extends HTMLElement {
  constructor() {
    super();
    this._onScroll = this._onScroll.bind(this);
    this._onResize = this._onResize.bind(this);
  }

  connectedCallback() {
    // Initial update after layout
    requestAnimationFrame(() => this._update());
    this.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize);
  }

  disconnectedCallback() {
    this.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('resize', this._onResize);
  }

  _onScroll() {
    this._update();
  }

  _onResize() {
    this._update();
  }

  _update() {
    const EPSILON = 1; // tolerate sub-pixel rounding
    const atTop = this.scrollTop <= EPSILON;
    const atBottom = this.scrollHeight - this.clientHeight - this.scrollTop <= EPSILON;
    this.classList.toggle('isAtTop', atTop);
    this.classList.toggle('isAtBottom', atBottom);
  }
}

customElements.define('mask-scroll', MaskScroll);


