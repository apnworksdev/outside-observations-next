class ScrollContainer extends HTMLElement {

  constructor() {
    super();
    this.handleImageHover = this.handleImageHover.bind(this);
    this.handleImageLeave = this.handleImageLeave.bind(this);
  }
  
  connectedCallback() {
    const itemContainers = this.querySelectorAll('[class*="itemContainer"]');

    itemContainers.forEach(itemContainer => {
      itemContainer.addEventListener('mouseenter', this.handleImageHover);
    });
  }

  disconnectedCallback() {
    const itemContainers = this.querySelectorAll('[class*="itemContainer"]');
    itemContainers.forEach(itemContainer => {
      itemContainer.removeEventListener('mouseenter', this.handleImageHover);
    });
  }

  handleImageHover(event) {
    const itemContainer = event.target;
    const itemPoster = itemContainer.querySelector('[class*="itemPoster"]');
    
    if (!itemPoster) return;
    
    try {
      const itemContainerRect = itemContainer.getBoundingClientRect();
      const itemContainerCenter = itemContainerRect.top + itemContainerRect.height / 2;

      const scrollContainerParent = this.parentElement;
      if (!scrollContainerParent) return;
      
      const scrollContainerParentRect = scrollContainerParent.getBoundingClientRect();
      const viewportCenter = scrollContainerParentRect.top + scrollContainerParentRect.height / 2;
      
      if (itemContainerCenter < viewportCenter) {
        itemPoster.style.top = `calc(100% + 4px)`;
        itemPoster.style.bottom = 'auto';
      } else {
        itemPoster.style.bottom = `calc(100% + 2px)`;
        itemPoster.style.top = 'auto';
      }
    } catch (error) {
      console.warn('Error positioning image:', error);
    }
  }
}

customElements.define('scroll-container', ScrollContainer);