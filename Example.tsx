import React, { useRef, useState, useMemo, useCallback } from "react";
import { scaleTime, scaleLinear, coerceNumber } from "@visx/scale";
import appleStock, { AppleStock } from "@visx/mock-data/lib/mocks/appleStock";
import { Line } from "@visx/shape";
import { Group } from "@visx/group";
import { Brush } from "@visx/brush";
import { Bounds } from "@visx/brush/lib/types";
import BaseBrush, {
  BaseBrushState,
  UpdateBrush
} from "@visx/brush/lib/BaseBrush";
import { PatternLines } from "@visx/pattern";
import { LinearGradient } from "@visx/gradient";
import { min, max, extent } from "d3-array";

import {
  Tooltip,
  TooltipWithBounds,
  useTooltip,
  defaultStyles
} from "@visx/tooltip";
import { voronoi } from "@visx/voronoi";
import { localPoint } from "@visx/event";

import { timeFormat } from "d3-time-format";

import LineChart from "./AreaChart";

// Initialize some variables
const stock = appleStock; //.slice(-1100, -1);
const brushMargin = { top: 0, bottom: 0, left: 50, right: 20 };
const chartSeparation = 30;
const PATTERN_ID = "brush_pattern";

const selectedBrushStyle = {
  fill: `url(#${PATTERN_ID})`,
  stroke: "#ddd"
};

// Initialize some variables
export const accentColor = "#aaa";
export const accentColorDark = "rgba(53,71,125,0.8)";
export const background = "#aaa";
export const background2 = "#aaa";

const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: "rgba(53,71,125,0.8)",
  color: "white",
  fontFamily: "Exo 2, sans-serif",
  fontSize: "clamp(12px, 2.2vw, 15px)",
  fontWeight: 500,
  padding: "0.5rem 0.7rem 0.5rem 0.7rem",
  borderRadius: 10
};
const formatDate = timeFormat("%b %d, %Y");

// accessors
const getDate = (d: AppleStock) => new Date(d.date);
const getStockValue = (d: AppleStock) => d.close;

type TooltipData = { date: any; close: number };
type PointsRange = { date: any; close: number };

let tooltipTimeout: number;

export type BrushProps = {
  width: number;
  height: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  compact?: boolean;
};

function BrushChart({
  compact = false,
  width,
  height,
  margin = {
    top: 50,
    left: 50,
    bottom: 20,
    right: 20
  }
}: BrushProps) {
  const brushRef = useRef<BaseBrush | null>(null);
  const [filteredStock, setFilteredStock] = useState(stock);
  const svgRef = useRef<SVGSVGElement>(null);

  const onBrushChange = (domain: Bounds | null) => {
    if (!domain) return;
    const { x0, x1, y0, y1 } = domain;
    const stockCopy = stock.filter((s) => {
      const x = getDate(s).getTime();
      const y = getStockValue(s);
      return x > x0 && x < x1 && y > y0 && y < y1;
    });
    if (stockCopy.length > 1) {
      setFilteredStock(stockCopy);
    }
  };

  const innerHeight = height - margin.top - margin.bottom;
  const topChartBottomMargin = compact
    ? chartSeparation / 2
    : chartSeparation + 10;
  const topChartHeight = 0.8 * innerHeight - topChartBottomMargin;
  const bottomChartHeight = innerHeight - topChartHeight - chartSeparation;

  // bounds
  const xMax = Math.max(width - margin.left - margin.right, 0);
  const yMax = Math.max(topChartHeight, 0);
  const xBrushMax = Math.max(width - brushMargin.left - brushMargin.right, 0);
  const yBrushMax = Math.max(
    bottomChartHeight - brushMargin.top - brushMargin.bottom,
    0
  );

  const getMinMax = (vals: (number | { valueOf(): number })[]) => {
    const numericVals = vals.map(coerceNumber);
    return [Math.min(...numericVals), Math.max(...numericVals)];
  };

  // scales
  const dateScale = useMemo(
    () =>
      scaleTime<number>({
        range: [0, xMax],
        domain: extent(filteredStock, getDate) as [Date, Date]
      }),
    [xMax, filteredStock]
  );
  const stockScale = useMemo(
    () =>
      scaleLinear<number>({
        range: [yMax, 0],
        domain: [
          min(filteredStock, getStockValue),
          max(filteredStock, getStockValue) || 0
        ],
        nice: true
      }),
    [yMax, filteredStock]
  );
  const brushDateScale = useMemo(
    () =>
      scaleTime<number>({
        range: [0, xBrushMax],
        domain: extent(stock, getDate) as [Date, Date]
      }),
    [xBrushMax]
  );
  const brushStockScale = useMemo(
    () =>
      scaleLinear({
        range: [yBrushMax, 0],
        domain: [min(stock, getStockValue), max(stock, getStockValue) || 0],
        nice: true
      }),
    [yBrushMax]
  );

  const initialBrushPosition = useMemo(
    () => ({
      start: { x: brushDateScale(getDate(stock[0])) },
      end: { x: brushDateScale(getDate(stock[10])) }
    }),
    [brushDateScale]
  );

  const voronoiLayout = useMemo(
    () =>
      voronoi<PointsRange>({
        x: (d) => dateScale(getDate(d)) ?? 0,
        y: (d) => 0,
        width: xMax,
        height: yMax
      })(filteredStock),
    [xMax, yMax, dateScale, filteredStock]
  );

  const {
    showTooltip,
    hideTooltip,
    tooltipOpen,
    tooltipData,
    tooltipLeft = 0,
    tooltipTop = 0
  } = useTooltip<TooltipData>({
    // initial tooltip state
    tooltipOpen: false,
    tooltipLeft: xMax,
    tooltipTop: yMax / 3
  });

  // event handlers

  const handleMouseMove = useCallback(
    (event: React.MouseEvent | React.TouchEvent) => {
      if (tooltipTimeout) clearTimeout(tooltipTimeout);

      if (!svgRef.current) return;

      // find the nearest polygon to the current mouse position
      const point = localPoint(svgRef.current, event);
      if (!point) return;
      const neighborRadius = 200;
      const closest = voronoiLayout.find(
        point.x - margin.left,
        0,
        neighborRadius
      );
      if (closest) {
        showTooltip({
          tooltipLeft: dateScale(getDate(closest.data)),
          tooltipTop: stockScale(getStockValue(closest.data)),
          tooltipData: closest.data
        });
      }
    },
    [dateScale, stockScale, showTooltip, voronoiLayout, margin]
  );

  const handleMouseLeave = useCallback(() => {
    tooltipTimeout = window.setTimeout(() => {
      hideTooltip();
    }, 300);
  }, [hideTooltip]);

  const handleClearClick = () => {
    if (brushRef?.current) {
      setFilteredStock(stock);
      brushRef.current.reset();
    }
  };

  const handleResetClick = () => {
    if (brushRef?.current) {
      const updater: UpdateBrush = (prevBrush) => {
        const newExtent = brushRef.current!.getExtent(
          initialBrushPosition.start,
          initialBrushPosition.end
        );

        const newState: BaseBrushState = {
          ...prevBrush,
          start: { y: newExtent.y0, x: newExtent.x0 },
          end: { y: newExtent.y1, x: newExtent.x1 },
          extent: newExtent
        };

        return newState;
      };
      brushRef.current.updateBrush(updater);
    }
  };

  return (
    <div style={{ userSelect: "none" }}>
      <svg width={width} height={height}>
        <LinearGradient id="area-background" from={"blue"} to={"#aaa"} />
        <LineChart
          hideBottomAxis={compact}
          data={filteredStock}
          width={width}
          margin={{ ...margin, bottom: topChartBottomMargin }}
          yMax={yMax}
          xScale={dateScale}
          yScale={stockScale}
          gradientColor={background2}
        />

        <LineChart
          hideBottomAxis
          hideLeftAxis
          data={stock}
          width={width}
          yMax={yBrushMax}
          xScale={brushDateScale}
          yScale={brushStockScale}
          margin={brushMargin}
          top={topChartHeight + topChartBottomMargin + margin.top}
          gradientColor={background2}
        >
          <PatternLines
            id={PATTERN_ID}
            height={8}
            width={8}
            stroke={accentColor}
            strokeWidth={1}
            orientation={["diagonal"]}
          />
          <Brush
            xScale={brushDateScale}
            yScale={brushStockScale}
            width={xBrushMax}
            height={yBrushMax}
            margin={brushMargin}
            handleSize={8}
            innerRef={brushRef}
            resizeTriggerAreas={["left", "right"]}
            brushDirection="horizontal"
            //initialBrushPosition={initialBrushPosition}
            onChange={onBrushChange}
            onClick={() => setFilteredStock(stock)}
            selectedBoxStyle={selectedBrushStyle}
          />
        </LineChart>
        <Group left={margin.left} top={margin.top}>
          <svg width={width} height={height} ref={svgRef}>
            <rect
              x={0}
              y={0}
              width={xMax}
              height={yMax}
              rx={5}
              fill="transparent"
              stroke="transparent"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseLeave}
            />
            {tooltipData && (
              <g>
                <Line
                  from={{ x: tooltipLeft, y: 0 }}
                  to={{ x: tooltipLeft, y: yMax }}
                  stroke={accentColorDark}
                  strokeWidth={1}
                  pointerEvents="none"
                  strokeDasharray="4,4"
                />
                <Line
                  from={{ x: 0, y: tooltipTop }}
                  to={{ x: xMax, y: tooltipTop }}
                  stroke={accentColorDark}
                  strokeWidth={1}
                  pointerEvents="none"
                  strokeDasharray="4,4"
                />
                <circle
                  cx={tooltipLeft}
                  cy={tooltipTop}
                  r={10}
                  fill="accentColorDark"
                  fillOpacity={0.1}
                  stroke="black"
                  strokeOpacity={0.1}
                  strokeWidth={2}
                  pointerEvents="none"
                />
                <circle
                  cx={tooltipLeft}
                  cy={tooltipTop}
                  r={4}
                  fill={accentColorDark}
                  stroke="white"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              </g>
            )}
          </svg>
        </Group>
      </svg>
      {tooltipData && (
        <>
          <TooltipWithBounds
            key={Math.random()}
            top={tooltipTop + margin.top + 4}
            left={tooltipLeft + margin.left + 4}
            style={tooltipStyles}
          >
            {`${getStockValue(tooltipData)}`}
          </TooltipWithBounds>
          <Tooltip
            top={yMax + margin.top + 20}
            left={tooltipLeft + margin.left}
            style={{
              ...defaultStyles,
              minWidth: 72,
              textAlign: "center",
              transform: "translateX(-50%)"
            }}
          >
            {formatDate(getDate(tooltipData))}
          </Tooltip>
        </>
      )}
      {/* <button onClick={handleClearClick}>Clear</button>&nbsp;
      <button onClick={handleResetClick}>Reset</button> */}
    </div>
  );
}

export default BrushChart;
