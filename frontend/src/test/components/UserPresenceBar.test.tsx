import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import UserPresenceBar from "../../components/UserPresenceBar";

const mockUsers = [
    { username: "rahul", color: "#FF6B6B", socketId: "socket-1" },
    { username: "akash", color: "#4ECDC4", socketId: "socket-2" },
];

describe("UserPresenceBar", () => {

    it("renders nothing when users array is empty", () => {
        const { container } = render(<UserPresenceBar users={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it("renders all users when users are present", () => {
        render(<UserPresenceBar users={mockUsers} />);
        expect(screen.getByText("rahul")).toBeInTheDocument();
        expect(screen.getByText("akash")).toBeInTheDocument();
    });

    it("renders IN ROOM label when users are present", () => {
        render(<UserPresenceBar users={mockUsers} />);
        expect(screen.getByText("In Room")).toBeInTheDocument();
    });

    it("applies correct background color to each user badge", () => {
        render(<UserPresenceBar users={mockUsers} />);
        const rahulBadge = screen.getByTitle("rahul");
        const akashBadge = screen.getByTitle("akash");
        expect(rahulBadge).toHaveStyle({ backgroundColor: "#FF6B6B" });
        expect(akashBadge).toHaveStyle({ backgroundColor: "#4ECDC4" });
    });

    it("uses fallback color when color is empty", () => {
        const usersWithNoColor = [
            { username: "guest", color: "", socketId: "socket-3" }
        ];
        render(<UserPresenceBar users={usersWithNoColor} />);
        const badge = screen.getByTitle("guest");
        expect(badge).toHaveStyle({ backgroundColor: "#4ECDC4" });
    });

    it("renders single user correctly", () => {
        render(<UserPresenceBar users={[mockUsers[0]]} />);
        expect(screen.getByText("rahul")).toBeInTheDocument();
        expect(screen.queryByText("akash")).not.toBeInTheDocument();
    });
});