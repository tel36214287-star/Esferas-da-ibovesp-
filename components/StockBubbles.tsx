import React, { useEffect, useRef, useState, useCallback } from 'react';
import { StockData, PhysicsCircle } from '../types';
import { PHYSICS } from '../constants';

interface StockBubblesProps {
  data: StockData[];
}

const StockBubbles: React.FC<StockBubblesProps> = ({ data }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const circlesRef = useRef<PhysicsCircle[]>([]);
  const requestRef = useRef<number | null>(null);
  
  // Dragging State Refs
  const dragRef = useRef<{
    isDragging: boolean;
    targetCircle: PhysicsCircle | null;
    offsetX: number;
    offsetY: number;
    prevMouseX: number;
    prevMouseY: number;
    lastVelocity: { x: number; y: number };
    lastTime: number;
  }>({
    isDragging: false,
    targetCircle: null,
    offsetX: 0,
    offsetY: 0,
    prevMouseX: 0,
    prevMouseY: 0,
    lastVelocity: { x: 0, y: 0 },
    lastTime: 0
  });

  // Tooltip State
  const [hoveredStock, setHoveredStock] = useState<StockData | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Initialize Circles
  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;
    
    const { width, height } = containerRef.current.getBoundingClientRect();
    
    // Create physics objects
    circlesRef.current = data.map((stock) => {
      // Scale radius roughly by price log
      const radius = PHYSICS.RADIUS_BASE + Math.log(stock.price + 10) * 8; 
      
      return {
        id: stock.ticker,
        x: Math.random() * (width - radius * 2) + radius,
        y: Math.random() * (height - radius * 2) + radius,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4,
        r: radius,
        mass: radius,
        data: stock,
        element: null,
        pulse: 0 // Initial animation state
      };
    });

  }, [data]);

  // Physics Engine Loop
  const animate = useCallback(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const circles = circlesRef.current;
    const dragging = dragRef.current.targetCircle;

    for (let i = 0; i < circles.length; i++) {
      const a = circles[i];
      
      // 1. Movement
      if (a === dragging) {
        a.vx = 0;
        a.vy = 0;
      } else {
        a.x += a.vx;
        a.y += a.vy;

        // Apply Velocity Limits
        a.vx = Math.max(-PHYSICS.VELOCITY_LIMIT, Math.min(PHYSICS.VELOCITY_LIMIT, a.vx));
        a.vy = Math.max(-PHYSICS.VELOCITY_LIMIT, Math.min(PHYSICS.VELOCITY_LIMIT, a.vy));
      }

      // Decay Pulse
      if (a.pulse > 0) {
        a.pulse -= 0.05; // Decay speed
        if (a.pulse < 0) a.pulse = 0;
      }

      // 2. Wall Collisions
      const wallImpactThreshold = 2.0;

      if (a.x - a.r < 0) { 
          a.x = a.r; 
          if (Math.abs(a.vx) > wallImpactThreshold) a.pulse = 1;
          a.vx *= -1; 
      }
      if (a.x + a.r > W) { 
          a.x = W - a.r; 
          if (Math.abs(a.vx) > wallImpactThreshold) a.pulse = 1;
          a.vx *= -1; 
      }
      if (a.y - a.r < 0) { 
          a.y = a.r; 
          if (Math.abs(a.vy) > wallImpactThreshold) a.pulse = 1;
          a.vy *= -1; 
      }
      if (a.y + a.r > H) { 
          a.y = H - a.r; 
          if (Math.abs(a.vy) > wallImpactThreshold) a.pulse = 1;
          a.vy *= -1; 
      }

      // 3. Circle Collisions
      for (let j = i + 1; j < circles.length; j++) {
        const b = circles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy;
        const minDist = a.r + b.r;

        if (distSq < minDist * minDist) {
          const dist = Math.sqrt(distSq);
          const nx = dx / dist;
          const ny = dy / dist;

          // Resolve overlap
          const overlap = minDist - dist + PHYSICS.COLLISION_SLACK;
          const separationX = nx * overlap * 0.5;
          const separationY = ny * overlap * 0.5;
          
          if (a !== dragging) { a.x -= separationX; a.y -= separationY; }
          if (b !== dragging) { b.x += separationX; b.y += separationY; }

          // Elastic Collision Response
          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const velAlongNormal = dvx * nx + dvy * ny;

          if (velAlongNormal > 0) continue;

          // Trigger animation on collision
          const impactSpeed = Math.abs(velAlongNormal);
          if (impactSpeed > 1.0) {
            const intensity = Math.min(1, impactSpeed * 0.15);
            a.pulse = Math.max(a.pulse, intensity);
            b.pulse = Math.max(b.pulse, intensity);
          }

          let jVal = -(1 + 1) * velAlongNormal;
          jVal /= (1 / a.mass + 1 / b.mass);

          const impulseX = jVal * nx;
          const impulseY = jVal * ny;

          if (a !== dragging) {
            a.vx -= (1 / a.mass) * impulseX;
            a.vy -= (1 / a.mass) * impulseY;
          }
          if (b !== dragging) {
            b.vx += (1 / b.mass) * impulseX;
            b.vy += (1 / b.mass) * impulseY;
          }
        }
      }

      // 4. Update DOM
      if (a.element) {
        let transform = `translate(${a.x - a.r}px, ${a.y - a.r}px)`;
        
        // Add Scale effect based on pulse
        if (a.pulse > 0.01) {
            const scale = 1 + a.pulse * 0.15;
            transform += ` scale(${scale})`;
            
            // Dynamic Glow
            const isPositive = a.data.changePercent >= 0;
            const color = isPositive ? '74, 222, 128' : '248, 113, 113'; 
            
            a.element.style.boxShadow = `0 0 ${20 + a.pulse * 30}px rgba(${color}, ${0.4 + a.pulse * 0.4})`;
            a.element.style.borderColor = `rgba(${color}, ${0.5 + a.pulse * 0.5})`;
            a.element.style.zIndex = '20'; 
        } else {
            a.element.style.boxShadow = '';
            a.element.style.borderColor = '';
            if (a !== dragging) a.element.style.zIndex = '10';
        }

        a.element.style.transform = transform;
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent, circle: PhysicsCircle) => {
    e.preventDefault();
    e.stopPropagation();

    dragRef.current.isDragging = true;
    dragRef.current.targetCircle = circle;
    dragRef.current.offsetX = e.clientX - circle.x;
    dragRef.current.offsetY = e.clientY - circle.y;
    dragRef.current.prevMouseX = e.clientX;
    dragRef.current.prevMouseY = e.clientY;
    dragRef.current.lastTime = performance.now();
    dragRef.current.lastVelocity = { x: 0, y: 0 };
    
    if (circle.element) circle.element.style.zIndex = '50';
    if (containerRef.current) containerRef.current.style.cursor = 'grabbing';
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Tooltip Logic
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        let found = false;
        for(const c of circlesRef.current) {
            const dx = mouseX - c.x;
            const dy = mouseY - c.y;
            if (dx*dx + dy*dy < c.r*c.r) {
                setHoveredStock(c.data);
                setTooltipPos({ x: e.clientX, y: e.clientY });
                found = true;
                break;
            }
        }
        if (!found) setHoveredStock(null);
    }

    // Drag Logic
    if (dragRef.current.isDragging && dragRef.current.targetCircle) {
      const now = performance.now();
      const dt = now - dragRef.current.lastTime;
      const currentX = e.clientX;
      const currentY = e.clientY;

      dragRef.current.targetCircle.x = currentX - dragRef.current.offsetX;
      dragRef.current.targetCircle.y = currentY - dragRef.current.offsetY;

      if (dt > 0) {
         const vx = (currentX - dragRef.current.prevMouseX) / dt;
         const vy = (currentY - dragRef.current.prevMouseY) / dt;
         dragRef.current.lastVelocity = { x: vx, y: vy };
      }

      dragRef.current.prevMouseX = currentX;
      dragRef.current.prevMouseY = currentY;
      dragRef.current.lastTime = now;
    }
  };

  const handleMouseUp = () => {
    if (dragRef.current.isDragging && dragRef.current.targetCircle) {
       const circle = dragRef.current.targetCircle;
       
       const multiplier = PHYSICS.IMPULSE_MULTIPLIER;
       circle.vx = dragRef.current.lastVelocity.x * multiplier;
       circle.vy = dragRef.current.lastVelocity.y * multiplier;

       circle.vx = Math.max(-PHYSICS.VELOCITY_LIMIT, Math.min(PHYSICS.VELOCITY_LIMIT, circle.vx));
       circle.vy = Math.max(-PHYSICS.VELOCITY_LIMIT, Math.min(PHYSICS.VELOCITY_LIMIT, circle.vy));

       if (circle.element) circle.element.style.zIndex = '10';
    }

    dragRef.current.isDragging = false;
    dragRef.current.targetCircle = null;
    if (containerRef.current) containerRef.current.style.cursor = 'default';
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-black select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {hoveredStock && (
        <div 
            className="absolute z-50 pointer-events-none px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-xl text-white transform -translate-x-1/2 -translate-y-full mt-[-10px] transition-opacity duration-150"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
            <div className="font-bold text-lg">{hoveredStock.ticker}</div>
            <div className="text-sm opacity-90">{hoveredStock.name}</div>
            <div className="text-xl font-mono mt-1">R$ {hoveredStock.price.toFixed(2)}</div>
            <div className={`text-sm font-bold ${hoveredStock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {hoveredStock.changePercent >= 0 ? '▲' : '▼'} {Math.abs(hoveredStock.changePercent).toFixed(2)}%
            </div>
        </div>
      )}

      {circlesRef.current.map((circle, index) => {
        const isPositive = circle.data.changePercent >= 0;
        return (
          <div
            key={circle.id}
            ref={(el) => { if (circlesRef.current[index]) circlesRef.current[index].element = el; }}
            className={`absolute rounded-full flex items-center justify-center text-white shadow-lg cursor-grab active:cursor-grabbing border-2 
              ${isPositive 
                ? 'bg-green-600/30 border-green-400/50 hover:border-green-300 shadow-[0_0_15px_rgba(74,222,128,0.3)]' 
                : 'bg-red-600/30 border-red-400/50 hover:border-red-300 shadow-[0_0_15px_rgba(248,113,113,0.3)]'
              } backdrop-blur-sm transition-colors`}
            style={{
              width: circle.r * 2,
              height: circle.r * 2,
              transform: `translate(${circle.x - circle.r}px, ${circle.y - circle.r}px)`,
              zIndex: 10
            }}
            onMouseDown={(e) => handleMouseDown(e, circle)}
          >
            <div className="text-center pointer-events-none">
                <div className="font-bold text-sm md:text-base">{circle.data.ticker}</div>
                {circle.r > 40 && (
                    <div className="text-xs opacity-80 hidden md:block">R$ {circle.data.price.toFixed(0)}</div>
                )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StockBubbles;