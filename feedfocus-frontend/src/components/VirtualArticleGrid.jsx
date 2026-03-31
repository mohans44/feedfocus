import { useEffect, useMemo, useRef, useState } from "react";

const getColumns = (width) => {
  if (width >= 1280) return 3;
  if (width >= 768) return 2;
  return 1;
};

const getRowHeight = (width) => {
  if (width >= 1280) return 380;
  if (width >= 768) return 360;
  return 360;
};

const VirtualArticleGrid = ({
  items,
  renderItem,
  gap = 12,
  overscan = 3,
  className = "",
}) => {
  const containerRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window === "undefined" ? 1280 : window.innerWidth,
  );
  const [viewportHeight, setViewportHeight] = useState(
    typeof window === "undefined" ? 800 : window.innerHeight,
  );
  const [scrollY, setScrollY] = useState(
    typeof window === "undefined" ? 0 : window.scrollY,
  );
  const [containerTop, setContainerTop] = useState(0);

  useEffect(() => {
    const updateMetrics = () => {
      setViewportWidth(window.innerWidth);
      setViewportHeight(window.innerHeight);
      setScrollY(window.scrollY);
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerTop(rect.top + window.scrollY);
      }
    };
    updateMetrics();
    window.addEventListener("resize", updateMetrics);
    window.addEventListener("scroll", updateMetrics, { passive: true });
    return () => {
      window.removeEventListener("resize", updateMetrics);
      window.removeEventListener("scroll", updateMetrics);
    };
  }, [items.length]);

  const columns = getColumns(viewportWidth);
  const rowHeight = getRowHeight(viewportWidth);
  const rowCount = Math.ceil(items.length / columns);
  const totalHeight = rowCount * rowHeight + Math.max(0, rowCount - 1) * gap;

  const [startRow, endRow] = useMemo(() => {
    if (!rowCount) return [0, -1];
    const offset = Math.max(0, scrollY - containerTop);
    const viewportBottom = offset + viewportHeight;
    const rowExtent = rowHeight + gap;
    const start = Math.max(0, Math.floor(offset / rowExtent) - overscan);
    const end = Math.min(
      rowCount - 1,
      Math.ceil(viewportBottom / rowExtent) + overscan,
    );
    return [start, end];
  }, [
    scrollY,
    containerTop,
    viewportHeight,
    rowHeight,
    gap,
    overscan,
    rowCount,
  ]);

  const rows = [];
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const startIndex = rowIndex * columns;
    const rowItems = items.slice(startIndex, startIndex + columns);
    const offset = rowIndex * (rowHeight + gap);
    rows.push({ rowIndex, rowItems, offset });
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", height: totalHeight }}
    >
      {rows.map((row) => (
        <div
          key={`row-${row.rowIndex}`}
          style={{
            position: "absolute",
            top: row.offset,
            left: 0,
            right: 0,
          }}
        >
          <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              gap,
            }}
          >
            {row.rowItems.map((item, index) =>
              renderItem(item, row.rowIndex * columns + index),
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VirtualArticleGrid;
