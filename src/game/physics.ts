/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Point, Wall, Door } from './types';

export interface RayHit {
  point: Point;
  distance: number;
}

// Line segment intersection (p1->p2 with p3->p4)
export function getLineIntersection(
  p1: Point,
  p2: Point,
  p3: Point,
  p4: Point
): Point | null {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 0.000001) return null;

  const u = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const v = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;

  if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
    return {
      x: p1.x + u * (p2.x - p1.x),
      y: p1.y + u * (p2.y - p1.y),
    };
  }
  return null;
}

// Convert Wall / Closed Door AABB to 4 border line segments
export function getWallSegments(wall: Wall | Door): { p1: Point; p2: Point }[] {
  const left = wall.x;
  const right = wall.x + wall.w;
  const top = wall.y;
  const bottom = wall.y + wall.h;

  return [
    { p1: { x: left, y: top }, p2: { x: right, y: top } },
    { p1: { x: right, y: top }, p2: { x: right, y: bottom } },
    { p1: { x: right, y: bottom }, p2: { x: left, y: bottom } },
    { p1: { x: left, y: bottom }, p2: { x: left, y: top } },
  ];
}

// Cast a ray from origin in given angle up to maxDistance against blocking obstacles
export function castRay(
  origin: Point,
  angle: number,
  maxDist: number,
  obstacles: (Wall | Door)[]
): RayHit {
  const target: Point = {
    x: origin.x + Math.cos(angle) * maxDist,
    y: origin.y + Math.sin(angle) * maxDist,
  };

  let closestHit: RayHit = {
    point: target,
    distance: maxDist,
  };

  for (const obs of obstacles) {
    // If it's a door and open (> 0.7), rays pass through
    if ('isOpen' in obs && obs.isOpen && obs.openProgress > 0.7) {
      continue;
    }

    const segments = getWallSegments(obs);
    for (const seg of segments) {
      const hit = getLineIntersection(origin, target, seg.p1, seg.p2);
      if (hit) {
        const dist = Math.hypot(hit.x - origin.x, hit.y - origin.y);
        if (dist < closestHit.distance) {
          closestHit = { point: hit, distance: dist };
        }
      }
    }
  }

  return closestHit;
}

// Check if there is an unobstructed line of sight between two points
export function hasLineOfSight(
  p1: Point,
  p2: Point,
  obstacles: (Wall | Door)[]
): boolean {
  for (const obs of obstacles) {
    if ('isOpen' in obs && obs.isOpen && obs.openProgress > 0.7) {
      continue;
    }
    const segments = getWallSegments(obs);
    for (const seg of segments) {
      if (getLineIntersection(p1, p2, seg.p1, seg.p2)) {
        return false;
      }
    }
  }
  return true;
}

// Circle to AABB collision detection & sliding response
export function resolveCircleAABB(
  circle: { x: number; y: number; radius: number },
  box: { x: number; y: number; w: number; h: number }
): { x: number; y: number; collided: boolean } {
  // Find closest point on AABB to circle center
  const closestX = Math.max(box.x, Math.min(circle.x, box.x + box.w));
  const closestY = Math.max(box.y, Math.min(circle.y, box.y + box.h));

  const distX = circle.x - closestX;
  const distY = circle.y - closestY;
  const distanceSquared = distX * distX + distY * distY;

  if (distanceSquared < circle.radius * circle.radius) {
    const dist = Math.sqrt(distanceSquared);
    let normalX = 0;
    let normalY = 0;

    if (dist > 0.0001) {
      normalX = distX / dist;
      normalY = distY / dist;
    } else {
      // Circle center inside box; push out along minimal axis
      const overlapLeft = circle.x - box.x;
      const overlapRight = box.x + box.w - circle.x;
      const overlapTop = circle.y - box.y;
      const overlapBottom = box.y + box.h - circle.y;
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapLeft) normalX = -1;
      else if (minOverlap === overlapRight) normalX = 1;
      else if (minOverlap === overlapTop) normalY = -1;
      else normalY = 1;
    }

    const penetration = circle.radius - dist;
    return {
      x: circle.x + normalX * penetration,
      y: circle.y + normalY * penetration,
      collided: true,
    };
  }

  return { x: circle.x, y: circle.y, collided: false };
}

// Normalize angle to [-PI, PI]
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

// Smoothly interpolate angle
export function lerpAngle(current: number, target: number, t: number): number {
  const diff = normalizeAngle(target - current);
  return current + diff * Math.min(1, Math.max(0, t));
}
