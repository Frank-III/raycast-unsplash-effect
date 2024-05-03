import { getPreferenceValues, showHUD } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import {Effect as E, Data} from "effect"

interface SaveImageProps {
  url: string;
  id: string;
}

export const saveImage = async ({ url, id }: SaveImageProps) => {
  const { downloadSize } = getPreferenceValues<UnsplashPreferences>();

  try {
    await showHUD("Please select a location to save the image...");

    await runAppleScript(`
      set outputFolder to choose folder with prompt "Please select an output folder:"
      set temp_folder to (POSIX path of outputFolder) & "${id}-${downloadSize}.jpg"
      set q_temp_folder to quoted form of temp_folder

      set cmd to "curl -o " & q_temp_folder & " " & "${url}"
        do shell script cmd
    `);
  } catch (err) {
    console.error(err);
    await showHUD("Couldn't save the image...");
  }
};

export class SaveImgError extends Data.TaggedError("SaveImgError")<{
  readonly error: unknown
}>{}


export const saveImage2 = ({ url, id }: SaveImageProps) => E.gen(function* () {
  const { downloadSize } = getPreferenceValues<UnsplashPreferences>()

  yield* (E.promise(() => showHUD("Please select a location to save the image...")))

  yield* (E.tryPromise(
    () => runAppleScript(`
    set outputFolder to choose folder with prompt "Please select an output folder:"
    set temp_folder to (POSIX path of outputFolder) & "${id}-${downloadSize}.jpg"
    set q_temp_folder to quoted form of temp_folder

    set cmd to "curl -o " & q_temp_folder & " " & "${url}"
      do shell script cmd
    `),
  ).pipe(
    E.catchAll((e_) => E.promise(() => showHUD("Couldn't save the image..."))),
  )
)

})

export default saveImage;
