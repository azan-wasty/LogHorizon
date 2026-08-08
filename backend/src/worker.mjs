import app from "./index.js";
import serverless from "serverless-http";

const handler = serverless(app);

export default {
  fetch: (request, env, ctx) => handler(request, env, ctx)
};
