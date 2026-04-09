import { FastifyInstance } from "fastify";
import { Socket } from "socket.io";

export const startSocketServer = (app: FastifyInstance) => {
    app.ready((err) => {
        if (err) throw err;
      
        app.io.on("connection", (socket: Socket) =>
            console.info("Socket connected!", socket.id),
        );
    });
}