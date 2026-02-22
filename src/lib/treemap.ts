import type { Rect } from '../types';

export function buildSliceTreemap(weights: number[], bounds: Rect): Rect[] {
  const sum = weights.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) {
    return weights.map(() => ({ ...bounds }));
  }

  const normalized = weights.map((weight) => weight / sum);
  const layout: Rect[] = [];
  let cursorX = bounds.x;
  let cursorY = bounds.y;
  let remainingWidth = bounds.width;
  let remainingHeight = bounds.height;

  normalized.forEach((ratio, index) => {
    const isLast = index === normalized.length - 1;
    const horizontalSplit = remainingWidth >= remainingHeight;

    if (horizontalSplit) {
      const width = isLast ? remainingWidth : bounds.width * ratio;
      layout.push({ x: cursorX, y: cursorY, width, height: remainingHeight });
      cursorX += width;
      remainingWidth -= width;
      return;
    }

    const height = isLast ? remainingHeight : bounds.height * ratio;
    layout.push({ x: cursorX, y: cursorY, width: remainingWidth, height });
    cursorY += height;
    remainingHeight -= height;
  });

  return layout;
}
