"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsChannel = void 0;
const template_engine_1 = require("../template-engine");
const env_1 = require("../../../config/env");
const logger_1 = require("../../../config/logger");
const twilio_1 = require("../../../config/twilio");
class SmsChannel {
    constructor() { }
    async send({ to, template, data }) {
        if (!to) {
            logger_1.logger.warn({ template }, 'SMS skipped — no phone number on user');
            return;
        }
        const body = (0, template_engine_1.renderSms)(template, data);
        await twilio_1.twilioClient.messages.create({
            to,
            from: env_1.config.twilio.fromNumber,
            body,
        });
        logger_1.logger.info({ to, template }, 'SMS sent');
    }
}
exports.SmsChannel = SmsChannel;
//# sourceMappingURL=sms.channel.js.map