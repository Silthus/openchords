import { defineSchema } from "convex/server";
import { catalogTables } from "./catalog/schema";

export default defineSchema({
  ...catalogTables,
});
