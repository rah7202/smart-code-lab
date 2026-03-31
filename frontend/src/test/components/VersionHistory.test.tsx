import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import VersionHistory from "../../components/VersionHistory";

vi.mock("axios");
import axios from "axios";
const mockAxios = axios as unknown as { get: ReturnType<typeof vi.fn> };

const mockSnapshots = [
    {
        id: "snap-1",
        code: "print('hello')",
        language: "python",
        createdAt: new Date("2024-01-15T10:30:00Z").toISOString(),
    },
    {
        id: "snap-2",
        code: "console.log('hi')",
        language: "javascript",
        createdAt: new Date("2024-01-15T11:00:00Z").toISOString(),
    },
];

const defaultProps = {
    roomId: "room-123",
    onRestore: vi.fn(),
    refreshTrigger: 0,
};

function renderHistory(props = {}) {
    return render(<VersionHistory {...defaultProps} {...props} />);
}

describe("VersionHistory — rendering", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockAxios.get = vi.fn().mockResolvedValue({ data: mockSnapshots });
    });

    it("renders Version History heading", () => {
        renderHistory();
        expect(screen.getByText("Version History")).toBeInTheDocument();
    });

    it("fetches snapshots for the given roomId on mount", async () => {
        renderHistory();
        await waitFor(() => {
            expect(mockAxios.get).toHaveBeenCalledWith(
                expect.stringContaining("/snapshot/room-123")
            );
        });
    });

    it("displays language for each snapshot", async () => {
        renderHistory();
        await waitFor(() => {
            expect(screen.getByText("python")).toBeInTheDocument();
            expect(screen.getByText("javascript")).toBeInTheDocument();
        });
    });

    it("displays formatted time for each snapshot", async () => {
        renderHistory();
        await waitFor(() => {
            // toLocaleTimeString output is env-dependent — just check something renders
            const items = screen.getAllByText(/\d+:\d+/);
            expect(items.length).toBeGreaterThan(0);
        });
    });

    it("renders empty list when no snapshots returned", async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: [] });
        const { container } = renderHistory();
        await waitFor(() => {
            // No snapshot cards rendered
            expect(container.querySelectorAll(".bg-gray-800")).toHaveLength(0);
        });
    });
});

describe("VersionHistory — restore", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockAxios.get = vi.fn().mockResolvedValue({ data: mockSnapshots });
    });

    it("calls onRestore with full snapshot when a snapshot card is clicked", async () => {
        renderHistory();
        await waitFor(() => {
            expect(screen.getByText("python")).toBeInTheDocument();
        });

        // Click the first snapshot card
        fireEvent.click(screen.getAllByText("python")[0].closest(".cursor-pointer")!);

        expect(defaultProps.onRestore).toHaveBeenCalledWith(mockSnapshots[0]);
    });

    it("calls onRestore with the correct snapshot when second is clicked", async () => {
        renderHistory();
        await waitFor(() => {
            expect(screen.getByText("javascript")).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText("javascript").closest(".cursor-pointer")!);

        expect(defaultProps.onRestore).toHaveBeenCalledWith(mockSnapshots[1]);
    });
});

describe("VersionHistory — refreshTrigger", () => {

    beforeEach(() => vi.clearAllMocks());

    it("refetches when refreshTrigger changes", async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: [] });

        const { rerender } = renderHistory({ refreshTrigger: 0 });
        await waitFor(() => expect(mockAxios.get).toHaveBeenCalledTimes(1));

        rerender(
            <VersionHistory {...defaultProps} refreshTrigger={1} />
        );
        await waitFor(() => expect(mockAxios.get).toHaveBeenCalledTimes(2));
    });

    it("refetches when roomId changes", async () => {
        mockAxios.get = vi.fn().mockResolvedValue({ data: [] });

        const { rerender } = renderHistory({ roomId: "room-a" });
        await waitFor(() => expect(mockAxios.get).toHaveBeenCalledTimes(1));

        rerender(<VersionHistory {...defaultProps} roomId="room-b" />);
        await waitFor(() => expect(mockAxios.get).toHaveBeenCalledTimes(2));
        expect(mockAxios.get).toHaveBeenLastCalledWith(
            expect.stringContaining("/snapshot/room-b")
        );
    });
});