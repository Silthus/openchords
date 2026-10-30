import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import staticHosting from "@convex-dev/static-hosting/convex.config";

const app = defineApp();
app.use(staticHosting);
app.use(rateLimiter);

export default app;
