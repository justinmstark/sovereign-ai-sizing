import React from "react";
import LLMTrainingForm from "./LLMTrainingForm";

export default function LLMTrainingPage() {
  return (
    <LLMTrainingForm
      mode="standalone"
      defaultClient="default"
      defaultEnv="prod"
    />
  );
}