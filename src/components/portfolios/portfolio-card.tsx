"use client";

import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Portfolio {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean | null;
  createdAt: Date;
  holdingsCount?: number;
}

interface PortfolioCardProps {
  portfolio: Portfolio;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export function PortfolioCard({ portfolio, onDelete, isDeleting }: PortfolioCardProps) {
  return (
    <Card className="bg-white hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{portfolio.name}</CardTitle>
            {portfolio.description && (
              <CardDescription className="mt-1">{portfolio.description}</CardDescription>
            )}
          </div>
          {portfolio.isActive === false && (
            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
              Inactive
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {portfolio.holdingsCount !== undefined
              ? `${portfolio.holdingsCount} holding${portfolio.holdingsCount !== 1 ? "s" : ""}`
              : "View details"}
          </p>
          <div className="flex gap-2">
            {onDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(portfolio.id)}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {isDeleting ? "..." : "Delete"}
              </Button>
            )}
            <Link href={`/dashboard/portfolios/${portfolio.id}`}>
              <Button variant="outline" size="sm">
                View
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
