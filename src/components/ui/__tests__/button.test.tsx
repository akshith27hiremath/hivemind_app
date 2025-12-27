import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/utils";
import { Button } from "../button";

describe("Button Component", () => {
  it("should render with children", () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("should apply default variant styles", () => {
    render(<Button>Default</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-primary");
  });

  it("should apply destructive variant styles", () => {
    render(<Button variant="destructive">Delete</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive");
  });

  it("should apply outline variant styles", () => {
    render(<Button variant="outline">Outline</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("border");
    expect(button).toHaveClass("border-input");
  });

  it("should apply secondary variant styles", () => {
    render(<Button variant="secondary">Secondary</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-secondary");
  });

  it("should apply ghost variant styles", () => {
    render(<Button variant="ghost">Ghost</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("hover:bg-accent");
  });

  it("should apply link variant styles", () => {
    render(<Button variant="link">Link</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("text-primary");
    expect(button).toHaveClass("underline-offset-4");
  });

  it("should apply small size", () => {
    render(<Button size="sm">Small</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-9");
  });

  it("should apply large size", () => {
    render(<Button size="lg">Large</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-11");
  });

  it("should apply icon size", () => {
    render(<Button size="icon">Icon</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("h-10");
    expect(button).toHaveClass("w-10");
  });

  it("should be disabled when disabled prop is true", () => {
    render(<Button disabled>Disabled</Button>);

    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });

  it("should call onClick handler", async () => {
    const handleClick = vi.fn();
    const { user } = render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByRole("button"));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should not call onClick when disabled", async () => {
    const handleClick = vi.fn();
    const { user } = render(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );

    await user.click(screen.getByRole("button"));

    expect(handleClick).not.toHaveBeenCalled();
  });

  it("should render as child element with asChild", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );

    expect(screen.getByRole("link")).toHaveTextContent("Link Button");
  });

  it("should apply custom className", () => {
    render(<Button className="custom-class">Custom</Button>);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-class");
  });
});
