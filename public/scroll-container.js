class ScrollContainer extends HTMLElement {

  constructor() {
    super();
    this.handleImageHover = this.handleImageHover.bind(this);
    this.handleImageLeave = this.handleImageLeave.bind(this);
    this.updateOverflowClass = this.updateOverflowClass.bind(this);
  }
  
  connectedCallback() {
    // Wait for React to hydrate before setting up listeners
    // This prevents hydration mismatches
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initialize();
      });
    } else {
      // Use requestAnimationFrame to ensure React has hydrated
      requestAnimationFrame(() => {
        this.initialize();
      });
    }
  }

  initialize() {
    // Use MutationObserver to handle dynamically added children
    this.observeChildren();
    // Also set up listeners immediately for existing children
    this.setupListeners();
    // Toggle overflowInitial class based on height vs 50vh
    this.observeHeight();
  }

  observeHeight() {
    this.updateOverflowClass();

    this.resizeObserver = new ResizeObserver(() => {
      this.updateOverflowClass();
    });
    this.resizeObserver.observe(this);

    window.addEventListener('resize', this.updateOverflowClass);
  }

  updateOverflowClass() {
    const threshold = window.innerHeight * 0.5;
    const height = this.getBoundingClientRect().height;
    if (height < threshold) {
      this.classList.add('overflowInitial');
    } else {
      this.classList.remove('overflowInitial');
    }
  }

  observeChildren() {
    // Watch for child elements being added
    this.observer = new MutationObserver(() => {
      this.setupListeners();
    });

    this.observer.observe(this, {
      childList: true,
      subtree: true
    });
  }

  setupListeners() {
    // Find all item containers (using attribute selector to work with CSS modules)
    const itemContainers = this.querySelectorAll('[class*="itemContainer"]');

    itemContainers.forEach(itemContainer => {
      // Remove existing listener to avoid duplicates
      itemContainer.removeEventListener('mouseenter', this.handleImageHover);
      itemContainer.removeEventListener('mouseleave', this.handleImageLeave);
      // Add listeners
      itemContainer.addEventListener('mouseenter', this.handleImageHover);
      itemContainer.addEventListener('mouseleave', this.handleImageLeave);
    });
  }

  disconnectedCallback() {
    // Clean up observers
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    window.removeEventListener('resize', this.updateOverflowClass);

    const itemContainers = this.querySelectorAll('[class*="itemContainer"]');
    itemContainers.forEach(itemContainer => {
      itemContainer.removeEventListener('mouseenter', this.handleImageHover);
      itemContainer.removeEventListener('mouseleave', this.handleImageLeave);
    });
  }

  handleImageHover(event) {
    // Find the closest itemContainer (in case event.target is a child)
    const itemContainer = event.target.closest('[class*="itemContainer"]');
    if (!itemContainer) return;
    
    const itemPoster = itemContainer.querySelector('[class*="itemPoster"]');
    if (!itemPoster) return;
    
    try {
      const itemContainerRect = itemContainer.getBoundingClientRect();
      const itemContainerCenter = itemContainerRect.top + itemContainerRect.height / 2;

      // Use window viewport center (vertical center of the visible window)
      const viewportCenter = window.innerHeight / 2;
      
      // Position poster above or below based on container position
      if (itemContainerCenter < viewportCenter) {
        // Container is in upper half - show poster below
        itemPoster.style.top = `calc(100% + 4px)`;
        itemPoster.style.bottom = 'auto';
      } else {
        // Container is in lower half - show poster above
        itemPoster.style.bottom = `calc(100% + 4px)`;
        itemPoster.style.top = 'auto';
      }
    } catch (error) {
      console.warn('Error positioning image:', error);
    }
  }

  handleImageLeave(event) {
    // Optional: Reset position on leave if needed
    const itemContainer = event.target.closest('[class*="itemContainer"]');
    if (!itemContainer) return;
    
    const itemPoster = itemContainer.querySelector('[class*="itemPoster"]');
    if (itemPoster) {
      // The CSS handles hiding on hover-out, but we can reset position here if needed
    }
  }
}

customElements.define('scroll-container', ScrollContainer);