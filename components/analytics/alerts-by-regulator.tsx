"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const jurisdictionConfig = {
  count: { label: "Count", color: "var(--primary)" },
  jurisdiction: { label: "Jurisdiction" },
} satisfies ChartConfig;

interface AlertsByRegulatorProps {
  data: {
    jurisdiction: string;
    count: number;
  }[];
}

export function AlertsByRegulator({ data }: AlertsByRegulatorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alerts by Jurisdiction</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={jurisdictionConfig} className="w-full h-72">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="jurisdiction"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={8} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
