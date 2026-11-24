type Point = { x: number; y: number };

export function fitSpawn(point: Point, radius: number, width: number, height: number): Point {
  const edge = radius + 4;
  return {
    x: Math.max(edge, Math.min(width - edge, point.x)),
    y: Math.max(edge, Math.min(height - edge, point.y)),
  };
}

export function avoidsPlatforms(point: Point, radius: number, platforms: (Point & { w: number; h: number })[]): boolean {
  return platforms.every(({ x, y, w, h }) =>
    point.x + radius <= x || point.x - radius >= x + w ||
    point.y + radius <= y || point.y - radius >= y + h,
  );
}
