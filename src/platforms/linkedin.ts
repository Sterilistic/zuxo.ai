import { SaveButton, SavedContent, PlatformAdapter } from './base';
import { createIcon, icons } from '@/lib/icons';
import { cn } from '@/lib/utils';

class LinkedInPostButton extends SaveButton {
  private post: Element;
  private controlMenu: Element;

  constructor(post: Element, controlMenu: Element) {
    super();
    this.post = post;
    this.controlMenu = controlMenu;
    this.createButton();
    this.attachEventListeners();
  }

  private createButton() {
    this.button = document.createElement('button');
    this.button.className = cn(
      'linkedin-save-button',
      'artdeco-button',
      'artdeco-button--circle',
      'artdeco-button--muted',
      'artdeco-button--1',
      'flex items-center justify-center'
    );
    
    const icon = document.createElement('div');
    icon.innerHTML = createIcon(icons.Save, 16);
    this.button.appendChild(icon);
    
    this.button.setAttribute('aria-label', 'Save post');
    
    const hideButton = this.controlMenu.querySelector('.feed-shared-control-menu__hide-post-button');
    if (hideButton) {
      hideButton.parentElement?.insertBefore(this.button, hideButton);
    }
  }

  protected showSaveSuccess() {
    this.button.classList.add('saved');
    this.button.innerHTML = createIcon(icons.Check, 16);
    setTimeout(() => {
      this.button.classList.remove('saved');
      this.button.innerHTML = createIcon(icons.Save, 16);
    }, 2000);
  }

  private getPostContent(): string {
    const postContent = this.post.querySelector('.feed-shared-update-v2__description-text');
    return postContent?.textContent?.trim() || '';
  }

  private attachEventListeners() {
    this.button.addEventListener('click', async () => {
      const postData: SavedContent = {
        url: window.location.href,
        title: 'LinkedIn Post',
        timestamp: Date.now(),
        type: 'post',
        platform: 'linkedin',
        content: this.getPostContent()
      };

      await this.saveContent(postData);
    });
  }
}

export class LinkedInAdapter implements PlatformAdapter {
  private observer!: MutationObserver;

  initialize(): void {
    this.setupObserver();
  }

  cleanup(): void {
    this.observer?.disconnect();
  }

  private setupObserver(): void {
    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) {
            this.processElement(node);
          }
        });
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  private processElement(element: Element): void {
    const controlMenus = element.querySelectorAll('.feed-shared-control-menu');
    controlMenus.forEach((menu) => {
      if (!menu.querySelector('.linkedin-save-button')) {
        const post = menu.closest('.feed-shared-update-v2');
        if (post) {
          new LinkedInPostButton(post, menu);
        }
      }
    });
  }
} 