import { defineSchema } from "convex/server";
import { accessTables } from "./access";
import { catalogTables } from "./catalog";

export default defineSchema({
  ...accessTables,
  ...catalogTables,
});
