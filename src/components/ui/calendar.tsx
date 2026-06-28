import { DayPicker } from "react-day-picker";
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";
import "react-day-picker/style.css";

export function Calendar({ className, ...props }: ComponentProps<typeof DayPicker>) {
  return <DayPicker className={cn("calendar", className)} {...props} />;
}
