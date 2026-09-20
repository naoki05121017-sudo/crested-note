"use client";

import { createContext, useContext } from "react";

export const MutationBusyContext = createContext(false);

export function useMutationBusy() {
  return useContext(MutationBusyContext);
}
