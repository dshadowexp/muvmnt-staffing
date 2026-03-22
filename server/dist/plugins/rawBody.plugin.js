"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const fastify_raw_body_1 = __importDefault(require("fastify-raw-body"));
exports.default = (0, fastify_plugin_1.default)(async (fastify) => {
    fastify.register(fastify_raw_body_1.default, {
        field: "rawBody", // change the default request.rawBody property name
        global: false, // add the rawBody to every request. **Default true**
        encoding: "utf8", // set it to false to set rawBody as a Buffer **Default utf8**
        runFirst: true, // get the body before any preParsing hook change/uncompress it. **Default false**
        routes: [], // array of routes, **`global`** will be ignored, wildcard routes not supported
    });
});
//# sourceMappingURL=rawBody.plugin.js.map