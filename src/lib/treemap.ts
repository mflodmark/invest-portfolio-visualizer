import type { Rect } from '../types';

export function buildSliceTreemap(weights: number[], bounds: Rect): Rect[] {
  const sum = weights.reduce((acc, value) => acc + value, 0);
  if (sum <= 0) {
    return weights.map(() => ({ ...bounds }));
  }

  const normalized = weights.map((weight, index) => ({
    index,
    weight: Math.max(weight, 0) / sum,
  }));
  const layout: Rect[] = Array.from({ length: weights.length }, () => ({ ...bounds }));
  splitLayout(normalized, bounds, layout);
  return layout;
}

type WeightedIndex = {
  index: number;
  weight: number;
};

function splitLayout(items: WeightedIndex[], rect: Rect, layout: Rect[]): void {
  if (items.length === 0) {
    return;
  }

  if (items.length === 1) {
    layout[items[0].index] = rect;
    return;
  }

  const total = items.reduce((acc, item) => acc + item.weight, 0);
  if (total <= 0) {
    items.forEach((item) => {
      layout[item.index] = rect;
    });
    return;
  }

  const target = total / 2;
  let running = 0;
  let splitAt = 1;
  for (let i = 0; i < items.length; i += 1) {
    running += items[i].weight;
    if (running >= target) {
      splitAt = i + 1;
      break;
    }
  }

  const first = items.slice(0, splitAt);
  const second = items.slice(splitAt);
  if (second.length === 0) {
    const head = first.slice(0, first.length - 1);
    const tail = first.slice(first.length - 1);
    splitLayout(head, rect, layout);
    splitLayout(tail, rect, layout);
    return;
  }

  const firstWeight = first.reduce((acc, item) => acc + item.weight, 0);
  const ratio = firstWeight / total;
  const splitHorizontally = rect.width >= rect.height;

  if (splitHorizontally) {
    const firstWidth = rect.width * ratio;
    splitLayout(first, { x: rect.x, y: rect.y, width: firstWidth, height: rect.height }, layout);
    splitLayout(
      second,
      {
        x: rect.x + firstWidth,
        y: rect.y,
        width: rect.width - firstWidth,
        height: rect.height,
      },
      layout,
    );
    return;
  }

  const firstHeight = rect.height * ratio;
  splitLayout(first, { x: rect.x, y: rect.y, width: rect.width, height: firstHeight }, layout);
  splitLayout(
    second,
    {
      x: rect.x,
      y: rect.y + firstHeight,
      width: rect.width,
      height: rect.height - firstHeight,
    },
    layout,
  );
}
