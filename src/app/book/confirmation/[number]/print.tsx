"use client";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui";
export function PrintButton() {
  return <Button variant="outline" size="sm" icon={Printer} className="mt-5 w-full" onClick={() => window.print()}>Print receipt</Button>;
}
