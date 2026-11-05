import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { Alert } from "../components/Alert";
import { AvailabilityBadge, QuantityDisplay } from "../components/AvailabilityBadge";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { DetailList } from "../components/DetailList";
import { EmptyState } from "../components/EmptyState";
import { Field } from "../components/Field";
import { ItemCard } from "../components/ItemCard";
import { Loading } from "../components/Loading";
import { Table, Th } from "../components/Table";
import type { Equipment } from "../lib/api";

describe("Button", () => {
  it("renders a primary action and handles clicks", async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(<Button onClick={() => (clicks += 1)}>Sign in</Button>);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(clicks).toBe(1);
  });

  it("loading disables the button and marks it busy (no duplicate submits)", async () => {
    const user = userEvent.setup();
    let clicks = 0;
    render(
      <Button loading onClick={() => (clicks += 1)}>
        Signing in…
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Signing in…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await user.click(button);
    expect(clicks).toBe(0);
  });
});

describe("Field (Input/Label/FieldError)", () => {
  it("links label and input, and links the error via aria-describedby", () => {
    render(<Field label="Username" id="username" error="Username is required." />);
    const input = screen.getByLabelText("Username");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Username is required.");
  });

  it("renders without an error and without aria-invalid", () => {
    render(<Field label="Password" id="password" type="password" />);
    expect(screen.getByLabelText("Password")).not.toHaveAttribute("aria-invalid");
  });
});

describe("AvailabilityBadge (handoff component for #10)", () => {
  it("renders text + color semantics for AVAILABLE (never color alone)", () => {
    render(<AvailabilityBadge availability="AVAILABLE" />);
    expect(screen.getByText("AVAILABLE")).toBeInTheDocument();
  });

  it("renders UNAVAILABLE text for unavailable items", () => {
    render(<AvailabilityBadge availability="UNAVAILABLE" />);
    expect(screen.getByText("UNAVAILABLE")).toBeInTheDocument();
  });
});

describe("QuantityDisplay (handoff component for #10)", () => {
  it("shows available-of-total Quantity Tracking wording with bold available", () => {
    render(<QuantityDisplay available={2} total={5} />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/available of/)).toBeInTheDocument();
    expect(screen.getByText(/5 total/)).toBeInTheDocument();
  });
});

describe("Alert", () => {
  it("failure alert exposes role=alert", () => {
    render(<Alert tone="danger">Something went wrong.</Alert>);
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });

  it("confirmation exposes role=status and shows requestId as muted text", () => {
    render(
      <Alert tone="success" requestId="req-123">
        Request submitted.
      </Alert>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Request submitted.");
    expect(screen.getByText("Request ID: req-123")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("shows a dedicated empty message distinct from errors", () => {
    render(<EmptyState message="The catalog has no items yet." />);
    expect(screen.getByText("The catalog has no items yet.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("Loading", () => {
  it("announces loading via role=status", () => {
    render(<Loading label="Loading catalog…" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading catalog…");
  });
});

describe("Card / DetailList / Table", () => {
  it("Card renders its title", () => {
    render(<Card title="Sign in">content</Card>);
    expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument();
  });

  it("DetailList uses dl/dt/dd semantics", () => {
    render(<DetailList items={[{ term: "Category", value: "Sensors" }]} />);
    expect(screen.getByRole("term")).toHaveTextContent("Category");
    expect(screen.getByRole("definition")).toHaveTextContent("Sensors");
  });

  it("Table header cells use th scope=col", () => {
    render(
      <Table header={<tr><Th>Name</Th></tr>}>
        <tr><td>E-ONE</td></tr>
      </Table>,
    );
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  });
});

describe("ItemCard (mobile list)", () => {
  const item: Equipment = {
    id: "E-ONE",
    name: "Arduino Uno",
    description: "Microcontroller board",
    category: "Electronics",
    quantity_total: 1,
    quantity_available: 1,
    availability: "AVAILABLE",
  };

  it("is a whole-card link with accessible name and key fields", () => {
    render(
      <MemoryRouter>
        <ItemCard item={item} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "View Arduino Uno" })).toBeInTheDocument();
    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("AVAILABLE")).toBeInTheDocument();
  });
});
