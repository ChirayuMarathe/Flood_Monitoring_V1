import React from 'react';
import { Chart } from '@tanstack/react-charts';
import { areaX } from '@tanstack/charts';
import { scaleLinear } from '@tanstack/charts/scales/linear';
import { scaleBand } from '@tanstack/charts/scales/band';

export function TestChart() {
  const data = [{x: 1, y: 2}];
  return <Chart ariaLabel="Test" definition={{
    x: { scale: scaleBand() },
    y: { scale: scaleLinear() },
    marks: [
      areaX(data, {
        x: d => String(d.x),
        y: d => d.y
      })
    ]
  }} />;
}
