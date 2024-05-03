import { useRandom2 } from "@/hooks/useRandom";
import { environment, LaunchType, getPreferenceValues, LocalStorage } from "@raycast/api";
import {Effect as E} from "effect"

const setRandomWallpaper2 = E.gen(function* () {
  const nowDate = new Date()
  const { updateTime } = getPreferenceValues<UnsplashPreferences>();
  const lastTime = yield* E.promise(() => LocalStorage.getItem<string>("last-time"))

  if (environment.launchType === LaunchType.Background) {
    if (updateTime !== "none" && lastTime !== undefined) {
      const lastDate = new Date(lastTime);
      const dateTimeSplit = updateTime.split(" ");

      switch (dateTimeSplit[1]) {
        case "minute":
          lastDate.setMinutes(lastDate.getMinutes() + Number(dateTimeSplit[0]));
          break;
        case "hour":
          lastDate.setHours(lastDate.getHours() + Number(dateTimeSplit[0]));
          break;
        case "day":
          lastDate.setDate(lastDate.getDate() + Number(dateTimeSplit[0]));
          break;
      }

      lastDate.setSeconds(lastDate.getSeconds() - 10);

      if (lastDate <= nowDate) {
        yield* useRandom2(nowDate.getTime());
      }
    }
  } else {
    yield* useRandom2(nowDate.getTime());
  }

})


export default setRandomWallpaper2;
