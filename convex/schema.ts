import { defineSchema } from "convex/server";
import { catalogTables } from "./catalog";

export default defineSchema({
  ...catalogTables,
});
