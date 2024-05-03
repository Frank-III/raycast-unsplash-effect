import { showToast, Toast, environment, getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { existsSync } from "fs";
import { resolveHome } from "./utils";
import { runtime } from "../service"
import {Effect as E, Option as O, Ref} from "effect"

interface SetWallpaperProps {
  url: string;
  id: string;
  every?: boolean;
  useHud?: boolean;
  isBackground?: boolean;
}

const displayMessage = async (msg: string, type: "hud" | "toast") => {
  if (type === "hud") await showHUD(msg);
  else return await showToast(Toast.Style.Animated, msg);
};

export const setWallpaper = async ({ url, id, every, useHud = false, isBackground = false }: SetWallpaperProps) => {
  const { downloadSize, wallpaperPath } = getPreferenceValues<UnsplashPreferences>();
  const selectedPath = resolveHome(wallpaperPath || environment.supportPath);

  let toast;

  if (!isBackground) {
    if (existsSync(selectedPath)) {
      toast = await displayMessage("Downloading and setting wallpaper...", useHud ? "hud" : "toast");
    } else {
      toast = await displayMessage(
        "The selected path does not exist. Please select a valid path.",
        useHud ? "hud" : "toast"
      );
    }
  }

  const fixedPathName = selectedPath.endsWith("/")
    ? `${selectedPath}${id}-${downloadSize}.jpg`
    : `${selectedPath}/${id}-${downloadSize}.jpg`;

  try {
    const actualPath = fixedPathName;

    const command = !existsSync(actualPath)
      ? `set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd`
      : "";

    const result = await runAppleScript(`
      set temp_folder to (POSIX path of "${actualPath}")
      set q_temp_folder to quoted form of temp_folder

      ${command}

      set x to alias (POSIX file temp_folder)

      try
        tell application "System Events"
          tell ${every ? "every" : "current"} desktop
            set picture to (x as text)
            return "ok"
          end tell
        end tell
      on error
        set dialogTitle to "Error Setting Wallpaper"
        set dialogText to "Please make sure you have given Raycast the required permission. To make sure, click the button below and grant Raycast the 'System Events' permission."

        display alert dialogTitle message dialogText buttons {"Cancel", "Open Preferences"} default button 2 as informational
          if button returned of result is "Open Preferences" then
            do shell script "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation'"
          end if

        return "error"
      end try
    `);

    if (result !== "ok") throw new Error("Error setting wallpaper.");
    else if (useHud) {
      !isBackground && (await showHUD("Wallpaper set!"));
    } else if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = "Wallpaper set!";
    }
    return true;
  } catch (err) {
    console.error(err);

    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Something went wrong.";
      toast.message = "Try with another image or check your internet connection.";
    }
    return false;
  }
};


const displayMessage2 = (msg: string, type: "hud" | "toast") => E.gen(function* () {
  switch (type) {
    case "hud":
      return yield* E.promise(() => showHUD(msg));
    case "toast":
      return yield* E.promise(() => showToast(Toast.Style.Animated, msg));
  }
})

export const setWallpaper2 = ({ url, id, every, useHud = false, isBackground = false }: SetWallpaperProps) => E.gen(function* () {
  const { downloadSize, wallpaperPath } = getPreferenceValues<UnsplashPreferences>();
  const selectedPath = resolveHome(wallpaperPath || environment.supportPath);

  const toast = yield* Ref.make(O.none<Toast>())
  
  if (!isBackground) {
    E.if(!existsSync(selectedPath), {
      onTrue: () => displayMessage2("Downloading and setting wallpaper...", useHud ? "hud" : "toast"),
      onFalse: () => displayMessage2("The selected path does not exist. Please select a valid path.",useHud ? "hud" : "toast")
    }).pipe(E.map((maybeToast) => maybeToast ? O.some(maybeToast) : O.none()), E.tap((maybeToast) => Ref.set(toast, maybeToast)))
  }

  const fixedPathName = selectedPath.endsWith("/")
    ? `${selectedPath}${id}-${downloadSize}.jpg`
    : `${selectedPath}/${id}-${downloadSize}.jpg`;

  const actualPath = fixedPathName;

  const command = !existsSync(actualPath)
    ? `set cmd to "curl -o " & q_temp_folder & " " & "${url}"
      do shell script cmd`
    : "";

  return yield* E.tryPromise(
    () => runAppleScript(`
      set temp_folder to (POSIX path of "${actualPath}")
      set q_temp_folder to quoted form of temp_folder

      ${command}

      set x to alias (POSIX file temp_folder)

      try
        tell application "System Events"
          tell ${every ? "every" : "current"} desktop
            set picture to (x as text)
            return "ok"
          end tell
        end tell
      on error
        set dialogTitle to "Error Setting Wallpaper"
        set dialogText to "Please make sure you have given Raycast the required permission. To make sure, click the button below and grant Raycast the 'System Events' permission."

        display alert dialogTitle message dialogText buttons {"Cancel", "Open Preferences"} default button 2 as informational
          if button returned of result is "Open Preferences" then
            do shell script "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Automation'"
          end if

        return "error"
      end try
    `),
  ).pipe(
    E.flatMap((result) => {
      if (result !== "ok") {
        return E.fail(new Error("Error setting wallpaper."))
      } else if (useHud) {
        !isBackground && E.promise(() => showHUD("Wallpaper set!"))
      } else {
        Ref.get(toast).pipe(E.flatMap((maybeToast) => maybeToast.pipe(
          E.map((t) => {
            t.style = Toast.Style.Success,
            t.title = "Wallpaper set!"
            return t
          }),
          E.tap((t) => Ref.set(toast, O.some(t)))
        )))
      }
      return E.succeed(true)
    }),
    E.catchAll((err) => {
      Ref.get(toast).pipe(E.flatMap((maybeToast) => maybeToast.pipe(
        E.map((t) => {
          t.style = Toast.Style.Failure,
          t.title = "Something went wrong."
          t.message = "Try with another image or check your internet connection."
          return t
        }),
        E.tap((t) => Ref.set(toast, O.some(t)))
      )))
      return E.succeed(false)
    })
  )
})


export default setWallpaper;
// O.match({
//           onNone: () => E.void,
//           onSome: (t) => t.pipe(
//             E.map(t => {
//             t.style = Toast.Style.Success,
//             t.title = "Wallpaper set!"
//             return t
//           }),
//           E.tap((t) => Ref.set(toast, O.some(t))))
//         })