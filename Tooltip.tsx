import React, { useRef, useMemo, useCallback } from "react";
import { Line, Circle } from "@visx/shape";
import { Group } from "@visx/group";
import { AppleStock } from "@visx/mock-data/lib/mocks/appleStock";
import {
  Tooltip,
  TooltipWithBounds,
  useTooltip,
  defaultStyles
} from "@visx/tooltip";
import { voronoi, VoronoiPolygon } from "@visx/voronoi";
import { localPoint } from "@visx/event";

import { timeFormat } from "d3-time-format";

// Initialize some variables

export const accentColor = "#fff";
export const accentColorDark = "rgba(53,71,125,0.8)"; //"#75daad";
export const background = "#fff"; //'#584153';
export const background2 = "#1E5EFF";

const tooltipStyles = {
  ...defaultStyles,
  backgroundColor: "rgba(53,71,125,0.8)",
  color: "white",
  fontFamily: "Exo 2, sans-serif",
  // width: 52,
  // height: '1rem',
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
  data: AppleStock[];
  dateScale: any;
  stockScale: any;
  margin:any;
};

function TooltipVoronoi({
  width,
  height,
  dateScale,
  stockScale,
  data,
  margin
}: BrushProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const voronoiLayout = useMemo(
    () =>
      voronoi<PointsRange>({
        x: (d) => dateScale(getDate(d)) ?? 0,
        y: (d) => 0, //stockScale(getStockValue(d)) ?? 0,
        width: width,
        height: height
      })(data),
    [width, height, dateScale, data]
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
    tooltipLeft: width,
    tooltipTop: height / 3
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
      const closest = voronoiLayout.find(point.x-margin.left, 0, neighborRadius);
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

  return (
    <>
      <svg width={width} height={height} ref={svgRef}>
        {/* {
          <Group pointerEvents="none">
            {data.map((point, i) => (
              <Circle
                key={`point-${point[0]}-${i}`}
                className="dot"
                cx={dateScale(getDate(point))}
                cy={stockScale(getStockValue(point))}
                r={5}
                fill={tooltipData === point ? "green" : "#f6c431"}
              />
            ))}
          </Group>
        } */}
        {/* {voronoiLayout.polygons().map((polygon, i) => (
          <VoronoiPolygon
            key={`polygon-${i}`}
            polygon={polygon}
            fill="white"
            stroke="#333"
            strokeWidth={1}
            strokeOpacity={0.2}
            fillOpacity={tooltipData === polygon.data ? 0.5 : 0}
          />
        ))} */}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
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
              to={{ x: tooltipLeft, y: height }}
              stroke={accentColorDark}
              strokeWidth={1}
              pointerEvents="none"
              strokeDasharray="4,4"
            />
            <Line
              from={{ x: 0, y: tooltipTop }}
              to={{ x: width, y: tooltipTop }}
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
      {tooltipData && (
        <div>
          <TooltipWithBounds
            key={Math.random()}
            top={tooltipTop + 4}
            left={tooltipLeft + 4}
            style={tooltipStyles}
          >
            {`$${getStockValue(tooltipData)}`}
          </TooltipWithBounds>
          <Tooltip
            top={height + 14}
            left={tooltipLeft}
            style={{
              ...defaultStyles,
              minWidth: 72,
              textAlign: "center",
              transform: "translateX(-50%)"
            }}
          >
            {formatDate(getDate(tooltipData))}
          </Tooltip>
        </div>
      )}
      </>
  );
}

export default TooltipVoronoi;
