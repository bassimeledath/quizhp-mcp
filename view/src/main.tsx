import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QuizApp } from "./QuizApp";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QuizApp />
  </StrictMode>
);
