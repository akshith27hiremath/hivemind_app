import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "../card";

describe("Card Components", () => {
  describe("Card", () => {
    it("should render with children", () => {
      render(<Card>Card content</Card>);

      expect(screen.getByText("Card content")).toBeInTheDocument();
    });

    it("should apply default styles", () => {
      render(<Card data-testid="card">Content</Card>);

      const card = screen.getByTestId("card");
      expect(card).toHaveClass("rounded-lg");
      expect(card).toHaveClass("border");
      expect(card).toHaveClass("bg-card");
      expect(card).toHaveClass("shadow-sm");
    });

    it("should apply custom className", () => {
      render(
        <Card data-testid="card" className="custom-card">
          Content
        </Card>
      );

      expect(screen.getByTestId("card")).toHaveClass("custom-card");
    });
  });

  describe("CardHeader", () => {
    it("should render with children", () => {
      render(<CardHeader>Header content</CardHeader>);

      expect(screen.getByText("Header content")).toBeInTheDocument();
    });

    it("should apply flex styles", () => {
      render(<CardHeader data-testid="header">Header</CardHeader>);

      const header = screen.getByTestId("header");
      expect(header).toHaveClass("flex");
      expect(header).toHaveClass("flex-col");
      expect(header).toHaveClass("p-6");
    });
  });

  describe("CardTitle", () => {
    it("should render as h3", () => {
      render(<CardTitle>Title</CardTitle>);

      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
        "Title"
      );
    });

    it("should apply font styles", () => {
      render(<CardTitle data-testid="title">Title</CardTitle>);

      const title = screen.getByTestId("title");
      expect(title).toHaveClass("font-semibold");
      expect(title).toHaveClass("tracking-tight");
    });
  });

  describe("CardDescription", () => {
    it("should render with text", () => {
      render(<CardDescription>Description text</CardDescription>);

      expect(screen.getByText("Description text")).toBeInTheDocument();
    });

    it("should apply muted text style", () => {
      render(
        <CardDescription data-testid="desc">Description</CardDescription>
      );

      expect(screen.getByTestId("desc")).toHaveClass("text-muted-foreground");
    });
  });

  describe("CardContent", () => {
    it("should render with children", () => {
      render(<CardContent>Main content</CardContent>);

      expect(screen.getByText("Main content")).toBeInTheDocument();
    });

    it("should apply padding", () => {
      render(<CardContent data-testid="content">Content</CardContent>);

      expect(screen.getByTestId("content")).toHaveClass("p-6");
    });
  });

  describe("CardFooter", () => {
    it("should render with children", () => {
      render(<CardFooter>Footer content</CardFooter>);

      expect(screen.getByText("Footer content")).toBeInTheDocument();
    });

    it("should apply flex styles", () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>);

      const footer = screen.getByTestId("footer");
      expect(footer).toHaveClass("flex");
      expect(footer).toHaveClass("items-center");
    });
  });

  describe("Full Card", () => {
    it("should render complete card structure", () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>Card Content</CardContent>
          <CardFooter>Card Footer</CardFooter>
        </Card>
      );

      expect(
        screen.getByRole("heading", { name: "Card Title" })
      ).toBeInTheDocument();
      expect(screen.getByText("Card Description")).toBeInTheDocument();
      expect(screen.getByText("Card Content")).toBeInTheDocument();
      expect(screen.getByText("Card Footer")).toBeInTheDocument();
    });
  });
});
