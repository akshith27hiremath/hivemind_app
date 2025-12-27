import { http, HttpResponse } from "msw";

export const handlers = [
  // Health check
  http.get("http://localhost:3000/api/health", () => {
    return HttpResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: 100,
    });
  }),

  // Stripe checkout
  http.post("http://localhost:3000/api/stripe/checkout", () => {
    return HttpResponse.json({
      url: "https://checkout.stripe.com/test",
    });
  }),

  // Stripe portal
  http.post("http://localhost:3000/api/stripe/portal", () => {
    return HttpResponse.json({
      url: "https://billing.stripe.com/test",
    });
  }),

  // Stripe API mocks
  http.post("https://api.stripe.com/v1/checkout/sessions", () => {
    return HttpResponse.json({
      id: "cs_test_123",
      url: "https://checkout.stripe.com/test",
    });
  }),

  http.post("https://api.stripe.com/v1/billing_portal/sessions", () => {
    return HttpResponse.json({
      id: "bps_test_123",
      url: "https://billing.stripe.com/test",
    });
  }),

  http.post("https://api.stripe.com/v1/customers", () => {
    return HttpResponse.json({
      id: "cus_test_123",
      email: "test@example.com",
    });
  }),

  http.get("https://api.stripe.com/v1/subscriptions/:id", () => {
    return HttpResponse.json({
      id: "sub_test_123",
      status: "active",
      current_period_start: Math.floor(Date.now() / 1000),
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      cancel_at_period_end: false,
      items: {
        data: [{ price: { id: "price_test_123" } }],
      },
    });
  }),
];
