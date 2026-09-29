import React from 'react';
import { Chart } from '@tanstack/react-charts';
import { areaX, scaleLinear } from '@tanstack/charts';

export function TestChart() {
  const data = [{x: 1, y: 2}];
  return <Chart ariaLabel="Test" definition={{
    x: { scale: scaleLinear() },
    y: { scale: scaleLinear() },
    marks: [
      areaX(data, {
        x: d => d.x,
        y: d => d.y
      })
    ]
  }} />;
}
