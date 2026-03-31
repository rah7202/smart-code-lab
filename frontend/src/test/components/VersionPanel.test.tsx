import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VersionPanel from "../../components/VersionPanel";

// Mock VersionHistory so we don't need axios in these tests
vi.mock("../../components/VersionHistory", () => ({
    default: ({ roomId, onRestore }: { roomId: string; onRestore: (s: any) => void }) => (
        <div data-testid="version-history" data-room={roomId}>
            <button onClick={() => onRestore({ code: "restored", language: "python" })}>
                Restore Snapshot
            </button>
        </div>
    ),
}));

const defaultProps = {
    roomId: "room-abc",
    refreshHistory: 0,
    onRestore: vi.fn(),
};

function renderPanel(props = {}) {
    return render(<VersionPanel {...defaultProps} {...props} />);
}

describe("VersionPanel — closed state (default)", () => {

    beforeEach(() => vi.clearAllMocks());

    it("renders Open Version Panel button by default", () => {
        renderPanel();
        expect(screen.getByText("Open Version Panel")).toBeInTheDocument();
    });

    it("does NOT show VersionHistory when closed", () => {
        renderPanel();
        expect(screen.queryByTestId("version-history")).not.toBeInTheDocument();
    });

    it("does NOT show Close Version Panel button when closed", () => {
        renderPanel();
        expect(screen.queryByText("Close Version Panel")).not.toBeInTheDocument();
    });
});

describe("VersionPanel — opening", () => {

    beforeEach(() => vi.clearAllMocks());

    it("shows VersionHistory after clicking Open", () => {
        renderPanel();
        fireEvent.click(screen.getByText("Open Version Panel"));
        expect(screen.getByTestId("version-history")).toBeInTheDocument();
    });

    it("shows Close Version Panel button after opening", () => {
        renderPanel();
        fireEvent.click(screen.getByText("Open Version Panel"));
        expect(screen.getByText("Close Version Panel")).toBeInTheDocument();
    });

    it("hides Open Version Panel button after opening", () => {
        renderPanel();
        fireEvent.click(screen.getByText("Open Version Panel"));
        expect(screen.queryByText("Open Version Panel")).not.toBeInTheDocument();
    });

    it("passes correct roomId to VersionHistory", () => {
        renderPanel({ roomId: "my-room-id" });
        fireEvent.click(screen.getByText("Open Version Panel"));
        expect(screen.getByTestId("version-history")).toHaveAttribute("data-room", "my-room-id");
    });
});

describe("VersionPanel — closing", () => {

    beforeEach(() => vi.clearAllMocks());

    it("returns to closed state after clicking Close", () => {
        renderPanel();
        fireEvent.click(screen.getByText("Open Version Panel"));
        fireEvent.click(screen.getByText("Close Version Panel"));
        expect(screen.getByText("Open Version Panel")).toBeInTheDocument();
        expect(screen.queryByTestId("version-history")).not.toBeInTheDocument();
    });

    it("can be toggled open and closed multiple times", () => {
        renderPanel();
        fireEvent.click(screen.getByText("Open Version Panel"));
        expect(screen.getByTestId("version-history")).toBeInTheDocument();

        fireEvent.click(screen.getByText("Close Version Panel"));
        expect(screen.queryByTestId("version-history")).not.toBeInTheDocument();

        fireEvent.click(screen.getByText("Open Version Panel"));
        expect(screen.getByTestId("version-history")).toBeInTheDocument();
    });
});

describe("VersionPanel — restore callback", () => {

    beforeEach(() => vi.clearAllMocks());

    it("calls onRestore with snapshot when VersionHistory triggers restore", async () => {
        renderPanel();
        fireEvent.click(screen.getByText("Open Version Panel"));
        fireEvent.click(screen.getByText("Restore Snapshot"));

        await waitFor(() => {
            expect(defaultProps.onRestore).toHaveBeenCalledWith({
                code: "restored",
                language: "python",
            });
        });
    });
});