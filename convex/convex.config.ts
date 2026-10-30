import { defineApp } from "convex/server";
import actionRetrier from "@convex-dev/action-retrier/convex.config";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import staticHosting from "@convex-dev/static-hosting/convex.config";

const app = defineApp();
app.use(staticHosting);
app.use(rateLimiter);
app.use(actionRetrier);

export default app;
