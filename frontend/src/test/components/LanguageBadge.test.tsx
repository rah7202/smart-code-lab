import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import LanguageBadge from "../../components/LanguageBadge";

describe("LanguageBadge", () => {

    it("renders JavaScript badge with JS label", () => {
        render(<LanguageBadge language="javascript" />);
        expect(screen.getByText("JS")).toBeInTheDocument();
    });

    it("renders Python badge with PY label", () => {
        render(<LanguageBadge language="python" />);
        expect(screen.getByText("PY")).toBeInTheDocument();
    });

    it("renders C++ badge with C++ label", () => {
        render(<LanguageBadge language="cpp" />);
        expect(screen.getByText("C++")).toBeInTheDocument();
    });

    it("renders C badge with C label", () => {
        render(<LanguageBadge language="c" />);
        expect(screen.getByText("C")).toBeInTheDocument();
    });

    it("falls back to first language for unknown language", () => {
        render(<LanguageBadge language="unknown" />);
        // getLanguageByValue falls back to languageOptions[0] which is Python
        expect(screen.getByText("PY")).toBeInTheDocument();
    });

    it("renders a colored dot span", () => {
        const { container } = render(<LanguageBadge language="javascript" />);
        const dot = container.querySelector("span > span");
        expect(dot).toBeInTheDocument();
    });
});