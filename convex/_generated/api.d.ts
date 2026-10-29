/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as catalog_index from "../catalog/index.js";
import type * as http from "../http.js";
import type * as sources_builtIn_amazingGrace from "../sources/builtIn/amazingGrace.js";
import type * as sources_builtIn_houseOfTheRisingSun from "../sources/builtIn/houseOfTheRisingSun.js";
import type * as sources_builtIn_index from "../sources/builtIn/index.js";
import type * as sources_builtIn_redRiverValley from "../sources/builtIn/redRiverValley.js";
import type * as sources_builtIn_scarboroughFair from "../sources/builtIn/scarboroughFair.js";
import type * as sources_builtIn_shenandoah from "../sources/builtIn/shenandoah.js";
import type * as sources_builtIn_song from "../sources/builtIn/song.js";
import type * as sources_builtIn_wayfaringStranger from "../sources/builtIn/wayfaringStranger.js";
import type * as sources_index from "../sources/index.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "catalog/index": typeof catalog_index;
  http: typeof http;
  "sources/builtIn/amazingGrace": typeof sources_builtIn_amazingGrace;
  "sources/builtIn/houseOfTheRisingSun": typeof sources_builtIn_houseOfTheRisingSun;
  "sources/builtIn/index": typeof sources_builtIn_index;
  "sources/builtIn/redRiverValley": typeof sources_builtIn_redRiverValley;
  "sources/builtIn/scarboroughFair": typeof sources_builtIn_scarboroughFair;
  "sources/builtIn/shenandoah": typeof sources_builtIn_shenandoah;
  "sources/builtIn/song": typeof sources_builtIn_song;
  "sources/builtIn/wayfaringStranger": typeof sources_builtIn_wayfaringStranger;
  "sources/index": typeof sources_index;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
