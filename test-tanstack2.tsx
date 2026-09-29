import React from 'react';
import { Chart } from '@tanstack/react-charts';
import { areaX } from '@tanstack/charts';

export function TestChart() {
  return <Chart definition={{
    marks: [
      areaX({
        data: [{x: 1, y: 2}],
        x: d => d.x,
        y: d => d.y
      })
    ]
  }} />;
}
