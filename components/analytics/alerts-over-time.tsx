"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

// Severity colors aligned with dashboard: high=red, medium=amber, low=green
const alertsOverTimeConfig = {
  date: { label: "Date" },
  count: { label: "Total", color: "var(--primary)" },
  high: { label: "High", color: "var(--destructive)" },
  medium: {
    label: "Medium",
    color: "oklch(0.72 0.17 85)",
  },
  low: {
    label: "Low",
    color: "oklch(0.55 0.2 145)",
  },
} satisfies ChartConfig;

interface AlertsOverTimeProps {
  data: {
    high: number;
    medium: number;
    low: number;
    shortDate: string;
    date: string;
    count: number;
    openedOrActed: number;
    bySeverity: {
      low: number;
      medium: number;
      high: number;
    };
  }[];
}

export function AlertsOverTime({ data }: AlertsOverTimeProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts over time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={alertsOverTimeConfig} className="w-full h-72">
          <LineChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="shortDate"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_, payload) =>
                    payload?.[0]?.payload?.date
                      ? new Date(payload[0].payload.date).toLocaleDateString()
                      : ""
                  }
                />
              }
            />
            <Line
              type="monotone"
              dataKey="high"
              stroke="var(--color-high)"
              strokeWidth={2}
              dot={false}
              name="High"
            />
            <Line
              type="monotone"
              dataKey="medium"
              stroke="var(--color-medium)"
              strokeWidth={2}
              dot={false}
              name="Medium"
            />
            <Line
              type="monotone"
              dataKey="low"
              stroke="var(--color-low)"
              strokeWidth={2}
              dot={false}
              name="Low"
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              strokeWidth={2}
              dot={false}
              name="Total"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
