import React from "react";
import { GradientTracing } from "./gradient-tracing";

const Demo = () => (
  <GradientTracing
    width={300}
    height={100}
    path="M0,50 L75,25 L150,75 L225,25 L300,50"
  />
);

export { Demo };
