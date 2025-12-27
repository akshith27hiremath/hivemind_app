"use client";

import { Button } from "@/components/ui/button";

interface Holding {
  id: string;
  symbol: string;
  exchange: string | null;
  quantity: string;
  averagePrice: string;
  currentPrice: string | null;
  currency: string | null;
}

interface HoldingsTableProps {
  holdings: Holding[];
  onDelete?: (holdingId: string) => void;
  deletingId?: string | null;
}

export function HoldingsTable({ holdings, onDelete, deletingId }: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
        <p className="text-gray-500">No holdings yet. Add your first stock!</p>
      </div>
    );
  }

  const formatCurrency = (value: string | null, currency: string | null) => {
    if (!value) return "-";
    const num = parseFloat(value);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(num);
  };

  const formatQuantity = (value: string) => {
    const num = parseFloat(value);
    return num.toLocaleString("en-US", { maximumFractionDigits: 6 });
  };

  const calculateValue = (quantity: string, price: string | null) => {
    if (!price) return null;
    return parseFloat(quantity) * parseFloat(price);
  };

  const calculateGainLoss = (holding: Holding) => {
    if (!holding.currentPrice) return null;
    const current = parseFloat(holding.currentPrice);
    const avg = parseFloat(holding.averagePrice);
    const qty = parseFloat(holding.quantity);
    return (current - avg) * qty;
  };

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Symbol
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Quantity
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Avg Price
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Current
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Value
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Gain/Loss
            </th>
            {onDelete && (
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {holdings.map((holding) => {
            const value = calculateValue(holding.quantity, holding.currentPrice || holding.averagePrice);
            const gainLoss = calculateGainLoss(holding);

            return (
              <tr key={holding.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="font-medium text-gray-900">{holding.symbol}</div>
                  {holding.exchange && (
                    <div className="text-xs text-gray-500">{holding.exchange}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-gray-900">
                  {formatQuantity(holding.quantity)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-gray-900">
                  {formatCurrency(holding.averagePrice, holding.currency)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right text-gray-900">
                  {formatCurrency(holding.currentPrice, holding.currency)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-gray-900">
                  {value ? formatCurrency(value.toString(), holding.currency) : "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {gainLoss !== null ? (
                    <span
                      className={`font-medium ${
                        gainLoss >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {gainLoss >= 0 ? "+" : ""}
                      {formatCurrency(gainLoss.toString(), holding.currency)}
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                {onDelete && (
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(holding.id)}
                      disabled={deletingId === holding.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deletingId === holding.id ? "..." : "Remove"}
                    </Button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
