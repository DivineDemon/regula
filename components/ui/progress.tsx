"use client";

import { cn } from "@/lib/utils";

interface ProgressProps extends React.ComponentProps<"div"> {
  value: number;
}

function Progress({ className, value, ...props }: ProgressProps) {
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
        className,
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export { Progress };
