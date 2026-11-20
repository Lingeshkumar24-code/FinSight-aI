import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { AuthProvider } from "../lib/AuthContext";
import { Landing } from "../pages/Landing";
import { OnboardingModal } from "../components/onboarding/OnboardingModal";

describe("Landing and OnboardingModal from FinesightAI2.0", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders Landing page with exact FinesightAI2.0 theme, typography, hero and companion", () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <Landing />
        </BrowserRouter>
      </AuthProvider>
    );

    // Brand and hero badge
    expect(screen.getAllByText(/FinSight/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/YOUR INTELLIGENT AI CFO/i)).toBeInTheDocument();

    // Headline and subhead
    expect(screen.getByText(/Your entire financial world,/i)).toBeInTheDocument();
    expect(screen.getByText(/One intelligent AI CFO\./i)).toBeInTheDocument();

    // Plain-English verified metrics & decisions
    expect(screen.getByText(/18\.7% Margin/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹23,50,000/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/2\.196x Liquidity/i)).toBeInTheDocument();
    expect(screen.getByText(/Do Not Borrow · Collect Bills First/i)).toBeInTheDocument();
    expect(screen.getByText(/Reliance Industries \(RELIANCE\.NS\)/i)).toBeInTheDocument();

    // Sections
    expect(screen.getByText(/WHAT IS FINSIGHT AI\?/i)).toBeInTheDocument();
    expect(screen.getByText(/EXECUTIVE COMMAND CENTER/i)).toBeInTheDocument();
    expect(screen.getByText(/WHAT CAN IT DO\?/i)).toBeInTheDocument();
    expect(screen.getAllByText(/HOW IT WORKS/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/MEET YOUR AI CFO/i)).toBeInTheDocument();
    expect(screen.getByText(/WHY FINSIGHT AI\?/i)).toBeInTheDocument();

    // Companion avatar
    expect(screen.getByLabelText(/FinSight AI CFO companion/i)).toBeInTheDocument();

    // Navigation and CTAs
    expect(screen.getAllByRole("button", { name: /Guided Tour/i })[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Get Started/i)[0]).toBeInTheDocument();
  });

  it("opens OnboardingModal and steps through all 6 product tour steps", () => {
    render(<OnboardingModal forceOpen={true} />);

    // Step 1: Dashboard
    expect(
      screen.getByText(/Financial Health & Cash Runway Overview/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 1 of 6/i)).toBeInTheDocument();

    // Click Next -> Step 2: Spreadsheet Reader
    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(
      screen.getByText(/Upload Messy Excel Spreadsheets & Invoices/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 6/i)).toBeInTheDocument();

    // Click Next -> Step 3: AI Advisor
    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(
      screen.getByText(/Ask Plain-English Questions & Get Confident Decisions/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 3 of 6/i)).toBeInTheDocument();

    // Click Next -> Step 4: Scenario Sliders
    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(
      screen.getByText(/Test Business Decisions Before Spending Real Money/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 4 of 6/i)).toBeInTheDocument();

    // Click Next -> Step 5: Market Intelligence
    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(
      screen.getByText(/Track Stocks & Grow Surplus Business Cash Safely/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 5 of 6/i)).toBeInTheDocument();

    // Click Next -> Step 6: Fraud Shield & Automations
    fireEvent.click(screen.getByRole("button", { name: /Next →/i }));
    expect(
      screen.getByText(/Automatic Fraud Shield & 24\/7 Cash Alerts/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Step 6 of 6/i)).toBeInTheDocument();

    // Complete tour
    fireEvent.click(screen.getByRole("button", { name: /Get Started 🚀/i }));
    expect(localStorage.getItem("finsight_tour_completed")).toBe("true");
  });
});
