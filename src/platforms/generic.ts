import { SaveButton, SavedContent, PlatformAdapter } from './base';
import { createIcon, icons } from '@/lib/icons';
import { cn } from '@/lib/utils';

export class FloatingButton extends SaveButton {
  constructor() {
    super();
    this.createButton();
    this.attachEventListeners();
  }

  private createButton() {
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'fixed right-5 bottom-5 z-50';
    
    const button = document.createElement('button');
    button.className = cn(
      'h-10 w-10 rounded-full',
      'bg-primary text-primary-foreground',
      'hover:bg-primary/90',
      'flex items-center justify-center',
      'shadow-lg transition-all duration-200'
    );
    
    const icon = document.createElement('div');
    icon.innerHTML = createIcon(icons.Save, 20);
    
    button.appendChild(icon);
    buttonContainer.appendChild(button);
    document.body.appendChild(buttonContainer);
    
    this.button = button;
  }

  private attachEventListeners() {
    this.button.addEventListener('click', async () => {
      const pageData: SavedContent = {
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        type: 'page',
        platform: 'generic'
      };

      await this.saveContent(pageData);
    });
  }
}

export class GenericAdapter implements PlatformAdapter {
  initialize(): void {
    new FloatingButton();
  }
} 