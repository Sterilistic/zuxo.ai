export interface SavedContent {
  url: string;
  title: string;
  timestamp: number;
  type: string;
  content?: string;
  platform: string;
}

export interface PlatformAdapter {
  initialize(): void;
  cleanup?(): void;
}

export abstract class SaveButton {
  protected button!: HTMLButtonElement;

  protected async saveContent(data: SavedContent) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_CONTENT',
        data
      });

      if (response.success) {
        this.showSaveSuccess();
      }
    } catch (error) {
      console.error('Failed to save content:', error);
    }
  }

  protected showSaveSuccess() {
    this.button.classList.add('saved');
    this.button.innerHTML = '✓';
    setTimeout(() => {
      this.button.classList.remove('saved');
      this.button.innerHTML = '💾';
    }, 2000);
  }
} 