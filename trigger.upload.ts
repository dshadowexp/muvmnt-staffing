// import { configure, envvars } from "@trigger.dev/sdk";
// import { readFileSync } from "fs";
// import { parse, config } from "dotenv";
// config({ path: ".env.production" });

// // Read and parse your .env file
// const envContent = readFileSync(".env.production", "utf-8");
// const parsed = parse(envContent);

// configure({
//     // this is the default and if the `TRIGGER_SECRET_KEY` environment variable is set, can omit calling configure
//     secretKey: process.env["TRIGGER_SECRET_KEY"],
// });

// // Upload to Trigger.dev (replace with your project ref and environment slug)
// await envvars.upload("proj_csgaittwhahtnolpoifz", "prod", {
//   variables: parsed,
//   override: true, // Set to true to override existing variables
// });