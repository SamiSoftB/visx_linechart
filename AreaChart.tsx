import React from "react";
import { Group } from "@visx/group";
import { LinePath } from "@visx/shape";
import { AxisLeft, AxisBottom, AxisScale, SharedAxisProps } from "@visx/axis";
import { LinearGradient } from "@visx/gradient";
import { curveLinear } from "@visx/curve";
import { GridRows, GridColumns } from "@visx/grid";
import { timeFormat } from "d3-time-format";
import { AppleStock } from "@visx/mock-data/lib/mocks/appleStock";

// Initialize some variables
const axisColor = "rgba(2,2,4,0.7)";
const axisStroke = "#fff";
const axisBottomTickLabelProps = {
  textAnchor: "middle" as const,
  fontFamily: "'Exo 2', sans-serif",
  fontSize: "clamp(12px, 2.2vw, 15px)",
  fontWeight: 500,
  fill: axisColor
};
const axisLeftTickLabelProps = {
  dx: "-0.2em",
  dy: "0.25em",
  textAnchor: "end" as const,
  fill: axisColor,
  fontFamily: "'Exo 2', sans-serif",
  fontSize: "clamp(12px, 2.2vw, 15px)",
  fontWeight: 400
};

// accessors
const getDate = (d: AppleStock) => new Date(d.date);
const getStockValue = (d: AppleStock) => d.close;

export default function LineChart({
  data,
  gradientColor,
  width,
  yMax,
  margin,
  xScale,
  yScale,
  hideBottomAxis = false,
  hideLeftAxis = false,
  top,
  left,
  children
}: {
  data: AppleStock[];
  gradientColor: string;
  xScale: AxisScale<number>;
  yScale: AxisScale<number>;
  width: number;
  yMax: number;
  margin: { top: number; right: number; bottom: number; left: number };
  hideBottomAxis?: boolean;
  hideLeftAxis?: boolean;
  top?: number;
  left?: number;
  children?: React.ReactNode;
}) {
  if (width < 10) return null;

  return (
    <Group left={left || margin.left} top={top || margin.top}>
      <LinearGradient
        id="gradient"
        from={gradientColor}
        fromOpacity={1}
        to={gradientColor}
        toOpacity={0.2}
      />
      {!hideLeftAxis && (
        <GridRows
          scale={yScale}
          width={width - margin.left - margin.right}
          numTicks={5}
          stroke={"black"}
          strokeOpacity={0.1}
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
      {!hideBottomAxis && (
        <GridColumns
          scale={xScale}
          height={yMax}
          width={width - margin.left - margin.right}
          numTicks={4}
          stroke={"black"}
          strokeOpacity={0.1}
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
      <LinePath<AppleStock>
        data={data}
        x={(d) => xScale(getDate(d)) || 0}
        y={(d) => yScale(getStockValue(d)) || 0}
        curve={curveLinear}
        stroke="dodgerblue"
        strokeWidth={2}
        strokeOpacity={0.6}
      />
      <LinePath<AppleStock>
        data={data}
        x={(d) => xScale(getDate(d)) || 0}
        y={(d) => -20 + yScale(getStockValue(d)) || 0}
        curve={curveLinear}
        stroke="green"
        strokeWidth={2}
        strokeOpacity={0.6}
      />
      {!hideBottomAxis && (
        <AxisBottom
          top={yMax}
          scale={xScale}
          hideTicks={true}
          numTicks={Math.ceil(width / 140)}
          stroke={axisStroke}
          tickStroke={axisColor}
          tickLabelProps={() => axisBottomTickLabelProps}
        />
      )}
      {!hideLeftAxis && (
        <AxisLeft
          scale={yScale}
          hideTicks={true}
          numTicks={Math.ceil(yMax / 100)}
          stroke={axisStroke}
          tickStroke={axisColor}
          tickLabelProps={() => axisLeftTickLabelProps}
        />
      )}
      {children}
    </Group>
  );
}
