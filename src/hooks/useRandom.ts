import { getPreferenceValues, showHUD, environment, LaunchType, LocalStorage } from "@raycast/api";
import {  apiRequest2 } from "@/functions/apiRequest";
import { Effect as E } from "effect";

// Functions
import setWallpaper, { setWallpaper2 } from "@/functions/setWallpaper";
import { catchAll } from "effect/Layer";

const defaultCollections = [
  "4324303", // Vinyl and Covers
  "8647859", // Programming
  "298137", // Remote Work
  "2476111", // Retro Tech
  "1065976", // Walpapers
  "3430431", // Istanbul
  "1114848", // Camping
  "2063295", // Surfing
  "9389477", //Tokyo
  "932210", // Snow
];

export const useRandom2 = (nowTime: number) => E.gen(function*() {

  const { collections, includeDefaults } = getPreferenceValues();

  const customCollections = collections?.split(", ");

  const whichCollections =
    includeDefaults === "yes" && customCollections
      ? [...defaultCollections, ...customCollections]
      : customCollections || defaultCollections;

  //FIXME: how to early exit here --> Fixed
  const response = yield* apiRequest2<SearchResult>(
    `/photos/random?orientation=landscape&collections=${encodeURIComponent(whichCollections.join(","))}`
  ).pipe(
    E.tapError((e) => E.promise(() => showHUD(e.message)).pipe(E.zipRight(E.fail(e))))
  )

  const {urls, id} = response
  const image = urls?.raw || urls?.full || urls?.regular;

  const result = yield* setWallpaper2({
    url: image,
    id: String(id),
    useHud: true,
    every: true,
    isBackground: environment.launchType === LaunchType.Background,
  })

  E.promise(() => LocalStorage.setItem("last-time", nowTime)).pipe(
    E.when(() => result)
  )
})



export default useRandom2;
