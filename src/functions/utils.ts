import { Grid, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { join } from "path";
import { homedir } from "os";
import { apiRequest2 } from "@/functions/apiRequest";
import { Effect as E } from "effect";

const preferences = getPreferenceValues<UnsplashPreferences>();

export const getGridItemSize = (): Grid.ItemSize => {
  const { gridItemSize } = preferences;

  if (gridItemSize == "small") return Grid.ItemSize.Small;
  else if (gridItemSize == "large") return Grid.ItemSize.Large;
  else return Grid.ItemSize.Medium;
};

export const showImageTitle = (): boolean => {
  return preferences.showImageTitle;
};

export const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (text: string) => {
    return text.charAt(0).toUpperCase() + text.substring(1).toLowerCase();
  });
};

export const resolveHome = (filepath: string) => {
  if (filepath[0] === "~") {
    return join(homedir(), filepath.slice(1));
  }
  return filepath;
};

export const likeOrDislike2 = (id: number, liked?: boolean) => E.gen(function* () {
  const toast = yield* E.promise(() => showToast(Toast.Style.Animated, "Liking photo...")) 

  yield* apiRequest2(`/photos/${id}/like`, {
    method: liked ? "DELETE" : "POST"
  }).pipe(
    E.tap(() => {
      toast.style = Toast.Style.Success
      toast.title = `Photo ${liked ? "unliked" : "liked"}!`
    }),
    E.catchAll((err) => E.sync(() => {
      toast.style = Toast.Style.Failure
      switch (err._tag) {
        case "AuthError": 
          toast.title = "Auth Error"
          return 
        case "RequestError":
          toast.title = "Request Error"
          return
        case "ResponseError":
          toast.title = "Response Error"
          return
        case "FetchError":
          toast.title = "Fetch Error"
          return
      }
    }))
  )
})