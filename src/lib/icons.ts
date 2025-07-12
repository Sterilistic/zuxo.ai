import { Save as SaveIcon, Check as CheckIcon, LucideIcon } from 'lucide-react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';

export function createIcon(Icon: LucideIcon, size: number): string {
  return renderToString(createElement(Icon, {
    size,
  }));
}

export const icons = {
  Save: SaveIcon,
  Check: CheckIcon
};