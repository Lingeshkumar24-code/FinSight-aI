import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, it, expect, beforeEach } from "vitest";
import { LandingPage } from "../pages/LandingPage";
import { OnboardingModal } from "../components/onboarding/OnboardingModal";

describe("LandingPage and OnboardingModal (Cream & Black Business Edition)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders LandingPage with professional cream and black business sections", () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    // Hero title & badge
    expect(
      screen.getByText(/Plain-English Financial Intelligence for Business Owners/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Run your business finances with the clarity of a/i)
    ).toBeInTheDocument();

    // Live dashboard metrics preview
    expect(screen.getByText(/Net Profit Margin/i)).toBeInTheDocument();
    expect(screen.getByText(/Bill Payment Safety/i)).toBeInTheDocument();
    expect(screen.getByText(/Closing Cash Buffer/i)).toBeInTheDocument();
    expect(screen.getByText(/Debt Burden \(EMI\)/i)).toBeInTheDocument();

    // Non-technical feature highlights
    expect(
      screen.getByText(/Spreadsheet & Document Reader/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Your 24\/7 AI Chief Financial Officer/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Test Decisions Before Spending Real Money/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Automatic Fraud & Duplicate Bill Shield/i)
    ).toBeInTheDocument();

    // Guided tour and Sign In CTAs
    expect(screen.getAllByText(/Guided Tour/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Sign In to Portal/i)[0]).toBeInTheDocument();
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
