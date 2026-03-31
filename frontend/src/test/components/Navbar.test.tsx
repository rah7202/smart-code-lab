import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "../../components/Navbar";

// Mock socket
vi.mock("../../socket", () => ({
    socket: { disconnect: vi.fn() },
}));

// Mock react-router navigate
const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
    const actual = await vi.importActual("react-router");
    return { ...actual, useNavigate: () => mockNavigate };
});

const defaultProps = {
    userLang: "javascript",
    setUserLang: vi.fn(),
    userLangId: 63,
    setUserLangId: vi.fn(),
    userTheme: "vs-dark",
    setUserTheme: vi.fn(),
    fontSize: 18,
    setFontSize: vi.fn(),
    handleDownloadCode: vi.fn(),
    handleSaveCode: vi.fn(),
    handleClearEditor: vi.fn(),
};

function renderNavbar(props = {}) {
    return render(
        <MemoryRouter>
            <Navbar {...defaultProps} {...props} />
        </MemoryRouter>
    );
}

describe("Navbar — rendering", () => {

    beforeEach(() => vi.clearAllMocks());

    it("renders the Smart Code Lab heading", () => {
        renderNavbar();
        expect(screen.getByText("Smart Code Lab")).toBeInTheDocument();
    });

    it("renders Clear, Save, Download Code buttons", () => {
        renderNavbar();
        expect(screen.getByText("Clear")).toBeInTheDocument();
        expect(screen.getByText("Save")).toBeInTheDocument();
        expect(screen.getByText("Download Code")).toBeInTheDocument();
    });

    it("renders the Leave Room button", () => {
        renderNavbar();
        expect(screen.getByText("Leave Room")).toBeInTheDocument();
    });

    it("renders the font size slider with correct initial value", () => {
        renderNavbar();
        expect(screen.getByText("18")).toBeInTheDocument();
        const slider = screen.getByRole("slider");
        expect(slider).toHaveValue("18");
    });

    it("renders the current language label (JavaScript)", () => {
        renderNavbar();
        expect(screen.getByText("JavaScript")).toBeInTheDocument();
    });

    it("renders dark mode emoji when theme is vs-dark", () => {
        renderNavbar({ userTheme: "vs-dark" });
        expect(screen.getByText("🌙")).toBeInTheDocument();
    });

    it("renders sun emoji when theme is light", () => {
        renderNavbar({ userTheme: "light" });
        expect(screen.getByText("☀️")).toBeInTheDocument();
    });

    it("shows Dark label when theme is vs-dark", () => {
        renderNavbar({ userTheme: "vs-dark" });
        expect(screen.getByText("Dark")).toBeInTheDocument();
    });

    it("shows Light label when theme is light", () => {
        renderNavbar({ userTheme: "light" });
        expect(screen.getByText("Light")).toBeInTheDocument();
    });
});

describe("Navbar — button actions", () => {

    beforeEach(() => vi.clearAllMocks());

    it("calls handleClearEditor when Clear is clicked", () => {
        renderNavbar();
        fireEvent.click(screen.getByText("Clear"));
        expect(defaultProps.handleClearEditor).toHaveBeenCalledTimes(1);
    });

    it("calls handleSaveCode when Save is clicked", () => {
        renderNavbar();
        fireEvent.click(screen.getByText("Save"));
        expect(defaultProps.handleSaveCode).toHaveBeenCalledTimes(1);
    });

    it("calls handleDownloadCode when Download Code is clicked", () => {
        renderNavbar();
        fireEvent.click(screen.getByText("Download Code"));
        expect(defaultProps.handleDownloadCode).toHaveBeenCalledTimes(1);
    });

    it("disconnects socket and navigates to / when Leave Room is clicked", async () => {
        const { socket } = await import("../../socket");
        renderNavbar();
        fireEvent.click(screen.getByText("Leave Room"));
        expect(socket.disconnect).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith("/");
    });

    it("calls setFontSize with new value when slider changes", () => {
        renderNavbar();
        const slider = screen.getByRole("slider");
        fireEvent.change(slider, { target: { value: "22" } });
        expect(defaultProps.setFontSize).toHaveBeenCalledWith(22);
    });
});

describe("Navbar — language dropdown", () => {

    beforeEach(() => vi.clearAllMocks());

    it("opens language dropdown when language button is clicked", () => {
        renderNavbar();
        // Language button is the trigger next to LanguageBadge
        const langButton = screen.getByText("JavaScript").closest("button")!;
        fireEvent.click(langButton);
        // All languages should now be visible in dropdown
        expect(screen.getByText("Python")).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /C\+\+C\+\+/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^CC$/ })).toBeInTheDocument();
    }); 

    it("calls setUserLang and setUserLangId when a language is selected", () => {
        renderNavbar();
        const langButton = screen.getByText("JavaScript").closest("button")!;
        fireEvent.click(langButton);
        fireEvent.click(screen.getByText("Python"));
        expect(defaultProps.setUserLang).toHaveBeenCalledWith("python");
        expect(defaultProps.setUserLangId).toHaveBeenCalledWith(71); // Python judge0Id
    });

    it("closes language dropdown after selecting a language", () => {
        renderNavbar();
        const langButton = screen.getByText("JavaScript").closest("button")!;
        fireEvent.click(langButton);
        fireEvent.click(screen.getByText("Python"));
        expect(screen.queryByText("C++")).not.toBeInTheDocument();
    });

    it("closes language dropdown on outside click", () => {
        renderNavbar();
        const langButton = screen.getByText("JavaScript").closest("button")!;
        fireEvent.click(langButton);
        expect(screen.getByText("Python")).toBeInTheDocument();
        fireEvent.mouseDown(document.body);
        expect(screen.queryByText("Python")).not.toBeInTheDocument();
    });
});

describe("Navbar — theme dropdown", () => {

    beforeEach(() => vi.clearAllMocks());

    it("opens theme dropdown when theme button is clicked", () => {
        renderNavbar();
        const themeButton = screen.getByText("Dark").closest("button")!;
        fireEvent.click(themeButton);
        // Both options appear in dropdown
        const darkOptions = screen.getAllByText("Dark");
        expect(darkOptions.length).toBeGreaterThan(1);
        expect(screen.getByText("Light")).toBeInTheDocument();
    });

    it("calls setUserTheme with 'light' when Light is selected", () => {
        renderNavbar();
        const themeButton = screen.getByText("Dark").closest("button")!;
        fireEvent.click(themeButton);
        // Click the Light option in the dropdown
        fireEvent.click(screen.getByText("Light"));
        expect(defaultProps.setUserTheme).toHaveBeenCalledWith("light");
    });

    it("calls setUserTheme with 'vs-dark' when Dark is selected", () => {
        renderNavbar({ userTheme: "light" });
        const themeButton = screen.getByText("Light").closest("button")!;
        fireEvent.click(themeButton);
        const darkOptions = screen.getAllByText("Dark");
        // Click the Dark option in the dropdown (not the trigger button)
        fireEvent.click(darkOptions[darkOptions.length - 1]);
        expect(defaultProps.setUserTheme).toHaveBeenCalledWith("vs-dark");
    });

    it("closes theme dropdown on outside click", () => {
        renderNavbar();
        const themeButton = screen.getByText("Dark").closest("button")!;
        fireEvent.click(themeButton);
        fireEvent.mouseDown(document.body);
        // Only one "Dark" text should remain (the trigger button)
        const darkLabels = screen.queryAllByText("Dark");
        expect(darkLabels.length).toBe(1);
    });
});