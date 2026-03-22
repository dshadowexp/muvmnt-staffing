"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailChannel = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const template_engine_1 = require("../template-engine");
const env_1 = require("../../../config/env");
const logger_1 = require("../../../config/logger");
class EmailChannel {
    transporter;
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: env_1.config.smtp.host,
            port: env_1.config.smtp.port,
            secure: env_1.config.smtp.secure,
            auth: {
                user: env_1.config.smtp.user,
                pass: env_1.config.smtp.pass,
            },
        });
    }
    async send({ to, subject, template, data }) {
        const html = (0, template_engine_1.renderEmail)(template, data);
        await this.transporter.sendMail({
            from: `"${env_1.config.smtp.fromName}" <${env_1.config.smtp.fromAddress}>`,
            to,
            subject,
            html,
        });
        logger_1.logger.info({ to, template }, 'Email sent');
    }
}
exports.EmailChannel = EmailChannel;
//# sourceMappingURL=email.channel.js.map