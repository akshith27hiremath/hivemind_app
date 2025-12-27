import "@testing-library/jest-dom";
import { beforeAll, afterAll, afterEach, vi } from "vitest";
import { server } from "./mocks/server";

// Mock environment variables
vi.stubEnv("DATABASE_URL", "postgresql://test:test@localhost:5432/test");
vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_mock");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_mock");
vi.stubEnv("STRIPE_PRICE_ID_PRO", "price_mock");
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
vi.stubEnv("CLERK_SECRET_KEY", "sk_test_mock");
vi.stubEnv("CLERK_WEBHOOK_SECRET", "whsec_mock");

// Start MSW server before all tests
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Close server after all tests
afterAll(() => server.close());

// Mock Next.js router
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  SignIn: () => null,
  SignUp: () => null,
  UserButton: () => null,
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      id: "user_test",
      emailAddresses: [{ emailAddress: "test@example.com" }],
      firstName: "Test",
      lastName: "User",
    },
  }),
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    userId: "user_test",
  }),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(() => Promise.resolve({ userId: "user_test" })),
  currentUser: vi.fn(() =>
    Promise.resolve({
      id: "user_test",
      emailAddresses: [{ id: "1", emailAddress: "test@example.com" }],
      firstName: "Test",
      lastName: "User",
      primaryEmailAddressId: "1",
    })
  ),
  clerkMiddleware: vi.fn((handler) => handler),
  createRouteMatcher: vi.fn(() => () => false),
}));
