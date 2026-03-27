import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { User, JoinRoomPayload } from "../types";

const COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
    "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"];

const RoomtoUser = new Map<string, User[]>();
const RoomtoContent = new Map<string, string>();
const SockettoRoom = new Map<string, string>();
const SockettoColor = new Map<string, string>();

export const initSocket = (server: HttpServer) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    // JOIN ROOM
    io.on("connection", (socket) => {
        console.log("User Connected", socket.id);

        socket.on("join", ({ RoomId, username }: JoinRoomPayload) => {

            // assign colour to the socket
            const color = COLORS[(RoomtoUser.get(RoomId)?.length ?? 0) % COLORS.length] ?? "#4ECDC4";
            SockettoColor.set(socket.id, color);

            console.log("Stored content for room: ", RoomtoContent.get(RoomId));
            socket.join(RoomId);

            // store mapping
            SockettoRoom.set(socket.id, RoomId);

            // add user
            const users = RoomtoUser.get(RoomId) || [];

            const alreadyExists = users.find(u => u.socketId === socket.id);
            if (!alreadyExists) {
                users.push({ socketId: socket.id, username, color });
            }

            //users.push({ socketId: socket.id, username, color });
            RoomtoUser.set(RoomId, users);

            // send current code to new user
            socket.emit("code-sync", RoomtoContent.get(RoomId) || "");

            // send updated user list to all users in the room
            io.to(RoomId).emit("users", users);
        });

        // CODE EDITOR
        socket.on("content-edited", ({ code, language }: { code: string, language: string }) => {
            const roomId = SockettoRoom.get(socket.id);
            console.log("Server received content-edited from:", socket.id, "roomId:", roomId, "code:", code);


            if (!roomId) return;

            RoomtoContent.set(roomId, code);

            // send to others only
            socket.to(roomId).emit("content-edited", { code, language });
            console.log("Broadcasted to room:", roomId);
        });

        socket.on("cursor-move", ({ line, column, username, color }: { line: number, column: number, username: string, color: string }) => {
            const roomId = SockettoRoom.get(socket.id);
            if (!roomId) return;

            // broadcast to others in the room
            socket.to(roomId).emit("cursor-move", { line, column, username, color, socketId: socket.id })
        });

        // DISCONNECT
        socket.on("disconnect", () => {

            const roomId = SockettoRoom.get(socket.id);

            if (!roomId) return;

            // remove user
            const users = RoomtoUser.get(roomId) || [];

            const updatedUsers = users.filter((u) => u.socketId !== socket.id);

            // update user list
            RoomtoUser.set(roomId, updatedUsers);

            // remove mapping
            SockettoRoom.delete(socket.id);

            // send updated user list
            io.to(roomId).emit("users", updatedUsers);

            // remove color
            SockettoColor.delete(socket.id);

            console.log("User disconnected");
        });


    });
};