import { showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { apiRequest2 } from "@/functions/apiRequest";
import { Effect as E, Console } from "effect";
import { URLSearchParams } from "url";
import { runtime } from "@/service";
// import { AbortError } from "@/functions/apiRequest";


export const useSearch = <T extends "collections" | "photos">(
  type: T,
  orientation: "all" | "landscape" | "portrait" | "squarish"
) => {

  const [state, setState] = useState<SearchState<T>>({ results: [], isLoading: true });
  const [lastSearch, setLastSearch] = useState("");
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search("");

    return () => {
      cancelRef.current?.abort();
    };
  }, []);

  const search = (searchText: string) => 
    E.gen(function* () {
      cancelRef.current?.abort();
      cancelRef.current = new AbortController();
      if (searchText === "") {
        setState((oldState) => ({
          ...oldState,
          isLoading: false,
        }));
        return;
      }

      setState((oldState) => ({
        ...oldState,
        isLoading: true,
      }));
    
      const {errors, results} = yield* performSearch({
        signal: cancelRef.current?.signal,
        // Text
        searchText,
        // Options
        options: {
          orientation,
          type: type || "photos",
        },
      }).pipe(
        // catch AbortError
        // E.tap((_) => Console.log(_)),
        // E.catchTag("AbortError", (e) => E.void),
        E.tapError((e) => Console.debug(e)),
        E.tapError((e) => E.promise(() => {
          return showToast(Toast.Style.Failure, "Could not perform search.", String(e));
        }))
      )

      if (errors?.length) {
        showToast(Toast.Style.Failure, `Failed to fetch ${type}.`, errors?.join("\n"));
      }

      setLastSearch(searchText);

      setState((oldState) => ({
        ...oldState,
        isLoading: false,
        results: results as any || [],
      }));
    }).pipe(runtime.runPromise)

    return {
      state, 
      search
    }
    
}

interface PerformSearchProps {
  signal: AbortSignal;
  searchText: string;
  options: {
    orientation: "all" | "landscape" | "portrait" | "squarish";
    type: "photos" | "collections";
  };
}

type SearchOrCollectionResult<T extends PerformSearchProps> = T extends { options: { type: "collections" } }
  ? CollectionResult[]
  : SearchResult[];

export const performSearch = <T extends PerformSearchProps>({
  searchText,
  options,
  signal,
}: PerformSearchProps) => E.gen(function* () {
  const searchParams = new URLSearchParams({
    page: "1",
    query: searchText,
    per_page: "30",
  });

  if (options.orientation !== "all") searchParams.append("orientation", options.orientation);

  return yield* apiRequest2<{ errors?: string[]; results: SearchOrCollectionResult<T> }>(
    `/search/${options.type}?${searchParams.toString()}`,
    {
      signal
    }
  )

})


export default useSearch;
