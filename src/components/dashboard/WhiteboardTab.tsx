"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Pencil,
  Eraser,
  Trash2,
  Download,
  Square,
  Circle,
  Minus,
  Type,
  Undo2,
  Redo2,
  Palette,
  MousePointer,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WhiteboardTabProps {
  classroomId: string;
}

type Tool = "pen" | "eraser" | "line" | "rect" | "circle" | "text" | "select";

interface DrawAction {
  type: Tool;
  points?: { x: number; y: number }[];
  color: string;
  lineWidth: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  text?: string;
}

const COLORS = [
  "#FFFFFF",
  "#007BFF",
  "#FFD700",
  "#FF4D6A",
  "#22C55E",
  "#A855F7",
  "#FF8C00",
  "#06B6D4",
];

const LINE_WIDTHS = [2, 4, 6, 8, 12];

export default function WhiteboardTab({ classroomId }: WhiteboardTabProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#FFFFFF");
  const [lineWidth, setLineWidth] = useState(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [actions, setActions] = useState<DrawAction[]>([]);
  const [undoneActions, setUndoneActions] = useState<DrawAction[]>([]);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textPos, setTextPos] = useState<{ x: number; y: number } | null>(null);

  // Resize canvas to fill container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redraw();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Dark background
    ctx.fillStyle = "#1A2B4D";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Replay all actions
    actions.forEach((action) => drawAction(ctx, action));
  }, [actions]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const drawAction = (ctx: CanvasRenderingContext2D, action: DrawAction) => {
    ctx.strokeStyle = action.type === "eraser" ? "#1A2B4D" : action.color;
    ctx.fillStyle = action.color;
    ctx.lineWidth = action.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    switch (action.type) {
      case "pen":
      case "eraser":
        if (action.points && action.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(action.points[0].x, action.points[0].y);
          for (let i = 1; i < action.points.length; i++) {
            ctx.lineTo(action.points[i].x, action.points[i].y);
          }
          ctx.stroke();
        }
        break;
      case "line":
        if (action.startX != null && action.endX != null) {
          ctx.beginPath();
          ctx.moveTo(action.startX, action.startY!);
          ctx.lineTo(action.endX, action.endY!);
          ctx.stroke();
        }
        break;
      case "rect":
        if (action.startX != null && action.endX != null) {
          ctx.beginPath();
          ctx.strokeRect(
            action.startX,
            action.startY!,
            action.endX - action.startX,
            action.endY! - action.startY!
          );
        }
        break;
      case "circle":
        if (action.startX != null && action.endX != null) {
          const rx = (action.endX - action.startX) / 2;
          const ry = (action.endY! - action.startY!) / 2;
          const cx = action.startX + rx;
          const cy = action.startY! + ry;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      case "text":
        if (action.text && action.startX != null) {
          ctx.font = `${action.lineWidth * 4}px Inter, sans-serif`;
          ctx.fillText(action.text, action.startX, action.startY!);
        }
        break;
    }
  };

  const getPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getPos(e);
    if (tool === "text") {
      setTextPos(pos);
      return;
    }
    setIsDrawing(true);
    setUndoneActions([]);
    if (tool === "pen" || tool === "eraser") {
      setCurrentPoints([pos]);
    } else {
      setShapeStart(pos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (tool === "pen" || tool === "eraser") {
      setCurrentPoints((prev) => [...prev, pos]);
      // Draw live
      ctx.strokeStyle = tool === "eraser" ? "#1A2B4D" : color;
      ctx.lineWidth = tool === "eraser" ? lineWidth * 3 : lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const pts = [...currentPoints, pos];
      if (pts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
        ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
        ctx.stroke();
      }
    } else if (shapeStart) {
      // Preview shape
      redraw();
      const previewAction: DrawAction = {
        type: tool,
        color,
        lineWidth,
        startX: shapeStart.x,
        startY: shapeStart.y,
        endX: pos.x,
        endY: pos.y,
      };
      drawAction(ctx, previewAction);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pos = getPos(e);

    if (tool === "pen" || tool === "eraser") {
      const finalPoints = [...currentPoints, pos];
      setActions((prev) => [
        ...prev,
        { type: tool, points: finalPoints, color, lineWidth: tool === "eraser" ? lineWidth * 3 : lineWidth },
      ]);
      setCurrentPoints([]);
    } else if (shapeStart) {
      setActions((prev) => [
        ...prev,
        {
          type: tool,
          color,
          lineWidth,
          startX: shapeStart.x,
          startY: shapeStart.y,
          endX: pos.x,
          endY: pos.y,
        },
      ]);
      setShapeStart(null);
    }
  };

  const handleTextSubmit = () => {
    if (textInput.trim() && textPos) {
      setActions((prev) => [
        ...prev,
        {
          type: "text",
          color,
          lineWidth,
          startX: textPos.x,
          startY: textPos.y,
          text: textInput,
        },
      ]);
      setTextInput("");
      setTextPos(null);
      setUndoneActions([]);
    }
  };

  const undo = () => {
    if (actions.length === 0) return;
    const last = actions[actions.length - 1];
    setActions((prev) => prev.slice(0, -1));
    setUndoneActions((prev) => [...prev, last]);
  };

  const redo = () => {
    if (undoneActions.length === 0) return;
    const last = undoneActions[undoneActions.length - 1];
    setUndoneActions((prev) => prev.slice(0, -1));
    setActions((prev) => [...prev, last]);
  };

  const clearAll = () => {
    setActions([]);
    setUndoneActions([]);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `whiteboard-${classroomId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const tools: { id: Tool; icon: React.ReactNode; label: string }[] = [
    { id: "pen", icon: <Pencil className="h-4 w-4" />, label: "Pen" },
    { id: "eraser", icon: <Eraser className="h-4 w-4" />, label: "Eraser" },
    { id: "line", icon: <Minus className="h-4 w-4" />, label: "Line" },
    { id: "rect", icon: <Square className="h-4 w-4" />, label: "Rectangle" },
    { id: "circle", icon: <Circle className="h-4 w-4" />, label: "Circle" },
    { id: "text", icon: <Type className="h-4 w-4" />, label: "Text" },
  ];

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {/* Toolbar */}
      <div className="glass-strong flex items-center gap-2 rounded-2xl px-4 py-3">
        {/* Tools */}
        <div className="flex items-center gap-1 border-r border-white/10 pr-3">
          {tools.map((t) => (
            <motion.button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={cn(
                "relative rounded-lg p-2 transition-colors",
                tool === t.id
                  ? "text-accent-blue"
                  : "text-white/40 hover:text-white/70"
              )}
              whileTap={{ scale: 0.9 }}
              title={t.label}
            >
              {tool === t.id && (
                <motion.div
                  layoutId="whiteboardTool"
                  className="absolute inset-0 rounded-lg bg-accent-blue/15 border border-accent-blue/20"
                />
              )}
              <span className="relative z-10">{t.icon}</span>
            </motion.button>
          ))}
        </div>

        {/* Colors */}
        <div className="relative flex items-center gap-1 border-r border-white/10 pr-3">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="flex items-center gap-2 rounded-lg p-2 text-white/40 hover:text-white/70"
            title="Color"
          >
            <Palette className="h-4 w-4" />
            <div
              className="h-4 w-4 rounded-full border border-white/20"
              style={{ backgroundColor: color }}
            />
          </button>
          <AnimatePresence>
            {showColorPicker && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="glass-strong absolute left-0 top-full z-20 mt-2 flex gap-2 rounded-xl p-3"
              >
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      setColor(c);
                      setShowColorPicker(false);
                    }}
                    className={cn(
                      "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                      color === c ? "border-accent-gold scale-110" : "border-white/20"
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Line width */}
        <div className="flex items-center gap-1 border-r border-white/10 pr-3">
          {LINE_WIDTHS.map((w) => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                lineWidth === w
                  ? "bg-accent-blue/15 text-accent-blue"
                  : "text-white/40 hover:text-white/70"
              )}
              title={`${w}px`}
            >
              <div
                className="rounded-full bg-current"
                style={{ width: w + 2, height: w + 2 }}
              />
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <motion.button
            onClick={undo}
            disabled={actions.length === 0}
            className="rounded-lg p-2 text-white/40 hover:text-white/70 disabled:opacity-20"
            whileTap={{ scale: 0.9 }}
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </motion.button>
          <motion.button
            onClick={redo}
            disabled={undoneActions.length === 0}
            className="rounded-lg p-2 text-white/40 hover:text-white/70 disabled:opacity-20"
            whileTap={{ scale: 0.9 }}
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </motion.button>
          <motion.button
            onClick={clearAll}
            className="rounded-lg p-2 text-white/40 hover:text-red-400"
            whileTap={{ scale: 0.9 }}
            title="Clear All"
          >
            <Trash2 className="h-4 w-4" />
          </motion.button>
          <motion.button
            onClick={download}
            className="rounded-lg p-2 text-white/40 hover:text-accent-gold"
            whileTap={{ scale: 0.9 }}
            title="Download PNG"
          >
            <Download className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="glass-strong relative flex-1 overflow-hidden rounded-2xl"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            if (isDrawing) handleMouseUp({} as React.MouseEvent<HTMLCanvasElement>);
          }}
          className={cn(
            "absolute inset-0",
            tool === "pen" && "cursor-crosshair",
            tool === "eraser" && "cursor-cell",
            tool === "text" && "cursor-text",
            (tool === "line" || tool === "rect" || tool === "circle") && "cursor-crosshair"
          )}
        />

        {/* Text input overlay */}
        <AnimatePresence>
          {textPos && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute z-10"
              style={{ left: textPos.x, top: textPos.y }}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTextSubmit();
                }}
                className="flex gap-2"
              >
                <input
                  autoFocus
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Type here..."
                  className="rounded-lg border border-white/10 bg-cosmic-dark/90 px-3 py-1.5 text-sm text-white outline-none focus:border-accent-blue/50"
                  style={{ color }}
                />
                <button
                  type="submit"
                  className="rounded-lg bg-accent-blue/20 px-3 py-1.5 text-xs text-accent-blue hover:bg-accent-blue/30"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTextPos(null);
                    setTextInput("");
                  }}
                  className="rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/40 hover:text-white/70"
                >
                  Cancel
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {actions.length === 0 && !isDrawing && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Pencil className="mx-auto mb-2 h-8 w-8 text-white/10" />
              <p className="text-sm text-white/20">
                Start drawing — pick a tool and go!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
