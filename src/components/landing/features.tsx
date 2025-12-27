import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  FileSpreadsheet,
  PieChart,
  TrendingUp,
  Wallet,
  LineChart,
} from "lucide-react";

const features = [
  {
    icon: FileSpreadsheet,
    title: "CSV Import",
    description:
      "Import your trades directly from Zerodha. Just upload your CSV and we'll handle the rest.",
  },
  {
    icon: PieChart,
    title: "Portfolio Breakdown",
    description:
      "Visualize your holdings with interactive charts. See allocation by sector, market cap, and more.",
  },
  {
    icon: TrendingUp,
    title: "Performance Tracking",
    description:
      "Track your gains and losses over time. Compare against benchmarks like Nifty 50.",
  },
  {
    icon: Wallet,
    title: "Multiple Portfolios",
    description:
      "Manage separate portfolios for different goals. Long-term, trading, retirement - all in one place.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Get insights into your trading patterns. Understand what's working and what's not.",
  },
  {
    icon: LineChart,
    title: "Historical Data",
    description:
      "View your complete transaction history. Filter by date, symbol, or transaction type.",
  },
];

export function Features() {
  return (
    <section id="features" className="container py-20 md:py-32">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
          Everything you need to track your investments
        </h2>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Powerful features designed for Indian investors. From Zerodha imports to
          advanced analytics.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <feature.icon className="h-10 w-10 text-primary mb-2" />
              <CardTitle>{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-base">
                {feature.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
