import type { Rect } from '../types';

type Item = {
  index: number;
  area: number;
};

export function buildSliceTreemap(weights: number[], bounds: Rect): Rect[] {
  const total = weights.reduce((sum, weight) => sum + Math.max(weight, 0), 0);
  if (total <= 0) {
    return weights.map(() => ({ ...bounds }));
  }

  const totalArea = bounds.width * bounds.height;
  const items: Item[] = weights
    .map((weight, index) => ({
      index,
      area: (Math.max(weight, 0) / total) * totalArea,
    }))
    .sort((a, b) => b.area - a.area);

  const layout: Rect[] = Array.from({ length: weights.length }, () => ({ ...bounds }));
  squarify(items, [], bounds, layout);
  return layout;
}

function squarify(items: Item[], row: Item[], rect: Rect, layout: Rect[]): void {
  if (items.length === 0) {
    layoutRow(row, rect, layout);
    return;
  }

  const next = items[0];
  const side = Math.min(rect.width, rect.height);

  if (row.length === 0 || worsensAspectRatio(row, next, side) === false) {
    squarify(items.slice(1), [...row, next], rect, layout);
    return;
  }

  const remaining = layoutRow(row, rect, layout);
  squarify(items, [], remaining, layout);
}

function worsensAspectRatio(row: Item[], next: Item, sideLength: number): boolean {
  const withNext = [...row, next];
  return score(withNext, sideLength) > score(row, sideLength);
}

function score(row: Item[], sideLength: number): number {
  if (row.length === 0 || sideLength === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const rowArea = row.reduce((sum, item) => sum + item.area, 0);
  const maxArea = Math.max(...row.map((item) => item.area));
  const minArea = Math.min(...row.map((item) => item.area));
  if (minArea === 0) {
    return Number.POSITIVE_INFINITY;
  }

  const sideSq = sideLength * sideLength;
  const rowAreaSq = rowArea * rowArea;
  return Math.max((sideSq * maxArea) / rowAreaSq, rowAreaSq / (sideSq * minArea));
}

function layoutRow(row: Item[], rect: Rect, layout: Rect[]): Rect {
  if (row.length === 0) {
    return rect;
  }

  const rowArea = row.reduce((sum, item) => sum + item.area, 0);
  const horizontal = rect.width >= rect.height;

  if (horizontal) {
    const rowHeight = rect.width === 0 ? 0 : rowArea / rect.width;
    let cursorX = rect.x;

    row.forEach((item, index) => {
      const isLast = index === row.length - 1;
      const width = isLast ? rect.x + rect.width - cursorX : rowHeight === 0 ? 0 : item.area / rowHeight;
      layout[item.index] = { x: cursorX, y: rect.y, width, height: rowHeight };
      cursorX += width;
    });

    return {
      x: rect.x,
      y: rect.y + rowHeight,
      width: rect.width,
      height: Math.max(0, rect.height - rowHeight),
    };
  }

  const rowWidth = rect.height === 0 ? 0 : rowArea / rect.height;
  let cursorY = rect.y;

  row.forEach((item, index) => {
    const isLast = index === row.length - 1;
    const height = isLast ? rect.y + rect.height - cursorY : rowWidth === 0 ? 0 : item.area / rowWidth;
    layout[item.index] = { x: rect.x, y: cursorY, width: rowWidth, height };
    cursorY += height;
  });

  return {
    x: rect.x + rowWidth,
    y: rect.y,
    width: Math.max(0, rect.width - rowWidth),
    height: rect.height,
  };
}
