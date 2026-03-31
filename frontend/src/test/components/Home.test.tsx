import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../../components/Home";

// Mock socket
vi.mock("../../socket", () => ({
    socket: {
        connect: vi.fn(),
        io: { opts: { query: {} } },
    },
}));

// Mock react-hot-toast
vi.mock("react-hot-toast", () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

// Mock uuid
vi.mock("uuid", () => ({
    v4: () => "test-uuid-1234",
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual("react-router-dom");
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

// Mock Footer
vi.mock("../../components/Footer", () => ({
    default: () => <div data-testid="footer" />,
}));

function renderHome() {
    return render(
        <MemoryRouter>
            <Home />
        </MemoryRouter>
    );
}

describe("Home", () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it("renders the Smart Code Lab heading", () => {
        renderHome();
        expect(screen.getByText("Smart Code Lab")).toBeInTheDocument();
    });

    it("renders Room ID and Username inputs", () => {
        renderHome();
        expect(screen.getByPlaceholderText("Room ID")).toBeInTheDocument();
        expect(screen.getByPlaceholderText("Username")).toBeInTheDocument();
    });

    it("renders JOIN button", () => {
        renderHome();
        expect(screen.getByText("JOIN")).toBeInTheDocument();
    });

    it("renders Create a new room link", () => {
        renderHome();
        expect(screen.getByText("Create a new room")).toBeInTheDocument();
    });

    it("generates a room ID when Create a new room is clicked", async () => {
        renderHome();
        const createLink = screen.getByText("Create a new room");
        fireEvent.click(createLink);

        const roomInput = screen.getByPlaceholderText("Room ID") as HTMLInputElement;
        await waitFor(() => {
            expect(roomInput.value).toBe("test-uuid-1234");
        });
    });

    it("shows error toast when joining with empty fields", async () => {
        const toast = await import("react-hot-toast");
        renderHome();
        fireEvent.click(screen.getByText("JOIN"));
        expect(toast.default.error).toHaveBeenCalledWith("Please enter room ID and username");
    });

    it("shows error when only username is missing", async () => {
        const toast = await import("react-hot-toast");
        renderHome();
        fireEvent.change(screen.getByPlaceholderText("Room ID"), {
            target: { value: "some-room-id" },
        });
        fireEvent.click(screen.getByText("JOIN"));
        expect(toast.default.error).toHaveBeenCalledWith("Please enter room ID and username");
    });

    it("shows error when only room ID is missing", async () => {
        const toast = await import("react-hot-toast");
        renderHome();
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "rahul" },
        });
        fireEvent.click(screen.getByText("JOIN"));
        expect(toast.default.error).toHaveBeenCalledWith("Please enter room ID and username");
    });

    it("saves username to localStorage on successful join", async () => {
        renderHome();
        fireEvent.change(screen.getByPlaceholderText("Room ID"), {
            target: { value: "room-abc" },
        });
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "rahul" },
        });
        fireEvent.click(screen.getByText("JOIN"));
        expect(localStorage.getItem("username")).toBe("rahul");
    });

    it("navigates to editor on successful join", async () => {
        renderHome();
        fireEvent.change(screen.getByPlaceholderText("Room ID"), {
            target: { value: "room-abc" },
        });
        fireEvent.change(screen.getByPlaceholderText("Username"), {
            target: { value: "rahul" },
        });
        fireEvent.click(screen.getByText("JOIN"));
        expect(mockNavigate).toHaveBeenCalledWith("/editor/room-abc", {
            state: { username: "rahul" },
        });
    });

    it("updates room ID input when typed", () => {
        renderHome();
        const input = screen.getByPlaceholderText("Room ID") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "my-room" } });
        expect(input.value).toBe("my-room");
    });

    it("updates username input when typed", () => {
        renderHome();
        const input = screen.getByPlaceholderText("Username") as HTMLInputElement;
        fireEvent.change(input, { target: { value: "testuser" } });
        expect(input.value).toBe("testuser");
    });
});