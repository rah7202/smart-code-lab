import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Footer from "../../components/Footer";

const TEST_URL = "https://github.com/rah7202/smart-code-lab";

describe("Footer", () => {

    it("renders a footer element", () => {
        const { container } = render(<Footer URL={TEST_URL} size={22} />);
        expect(container.querySelector("footer")).toBeInTheDocument();
    });

    it("renders a link with the correct href", () => {
        render(<Footer URL={TEST_URL} size={22} />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("href", TEST_URL);
    });

    it("opens link in a new tab (target=_blank)", () => {
        render(<Footer URL={TEST_URL} size={22} />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("target", "_blank");
    });

    it("has rel=noopener noreferrer for security", () => {
        render(<Footer URL={TEST_URL} size={22} />);
        const link = screen.getByRole("link");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders the GitHub icon (svg inside the link)", () => {
        const { container } = render(<Footer URL={TEST_URL} size={22} />);
        const svg = container.querySelector("a svg");
        expect(svg).toBeInTheDocument();
    });

    it("renders with a different URL correctly", () => {
        render(<Footer URL="https://github.com/other" size={16} />);
        expect(screen.getByRole("link")).toHaveAttribute("href", "https://github.com/other");
    });
});