"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";

interface JsonHighlighterProps {
  json: string | null;
  className?: string;
}

export function JsonHighlighter({
  json,
  className = "",
}: JsonHighlighterProps) {
  const highlightedJson = useMemo(() => {
    if (!json) return null;

    // Tokenize and highlight JSON, returning React elements
    const highlight = (text: string): ReactNode[] => {
      const elements: ReactNode[] = [];
      let i = 0;
      const len = text.length;
      const contextStack: ("object" | "array")[] = []; // Track if we're in an object or array
      let expectingKey = true; // Track if we're expecting a key (before colon) or value (after colon)
      let keyCounter = 0; // For unique keys in React

      while (i < len) {
        // Match strings (with escaped quotes)
        if (text[i] === '"') {
          const isKey = expectingKey;
          const spanClass = isKey ? "json-key" : "json-string";
          const start = i;
          i++;
          let stringContent = '"';
          while (i < len) {
            if (text[i] === "\\" && i + 1 < len) {
              stringContent += text[i] + text[i + 1];
              i += 2;
            } else if (text[i] === '"') {
              stringContent += '"';
              i++;
              break;
            } else {
              stringContent += text[i];
              i++;
            }
          }
          elements.push(
            <span key={`${start}-${keyCounter++}`} className={spanClass}>
              {stringContent}
            </span>,
          );
        }
        // Match numbers
        else if (/[0-9]/.test(text[i])) {
          const start = i;
          let num = "";
          while (i < len && /[0-9.eE+-]/.test(text[i])) {
            num += text[i];
            i++;
          }
          elements.push(
            <span key={`${start}-${keyCounter++}`} className="json-number">
              {num}
            </span>,
          );
          expectingKey = false;
        }
        // Match booleans and null
        else if (text.substring(i, i + 4) === "true") {
          elements.push(
            <span key={`${i}-${keyCounter++}`} className="json-boolean">
              true
            </span>,
          );
          i += 4;
          expectingKey = false;
        } else if (text.substring(i, i + 5) === "false") {
          elements.push(
            <span key={`${i}-${keyCounter++}`} className="json-boolean">
              false
            </span>,
          );
          i += 5;
          expectingKey = false;
        } else if (text.substring(i, i + 4) === "null") {
          elements.push(
            <span key={`${i}-${keyCounter++}`} className="json-null">
              null
            </span>,
          );
          i += 4;
          expectingKey = false;
        }
        // Match brackets and braces
        else if (text[i] === "{") {
          elements.push(
            <span key={`${i}-${keyCounter++}`} className="json-brace">
              {text[i]}
            </span>,
          );
          i++;
          contextStack.push("object");
          expectingKey = true; // After opening brace, we expect a key
        } else if (text[i] === "}") {
          elements.push(
            <span key={`${i}-${keyCounter++}`} className="json-brace">
              {text[i]}
            </span>,
          );
          i++;
          contextStack.pop();
          expectingKey = false;
        } else if (text[i] === "[") {
          elements.push(
            <span key={`${i}-${keyCounter++}`} className="json-bracket">
              {text[i]}
            </span>,
          );
          i++;
          contextStack.push("array");
          expectingKey = false; // After opening bracket, we expect a value
        } else if (text[i] === "]") {
          elements.push(
            <span key={`${i}-${keyCounter++}`} className="json-bracket">
              {text[i]}
            </span>,
          );
          i++;
          contextStack.pop();
          expectingKey = false;
        }
        // Match colons and commas
        else if (text[i] === ":") {
          elements.push(
            <span key={`${i}-${keyCounter++}`} className="json-colon">
              :
            </span>,
          );
          i++;
          expectingKey = false; // After colon, we expect a value
        } else if (text[i] === ",") {
          elements.push(
            <span key={`${i}-${keyCounter++}`} className="json-comma">
              ,
            </span>,
          );
          i++;
          // After comma, check the current context
          const currentContext = contextStack[contextStack.length - 1];
          expectingKey = currentContext === "object"; // In objects, expect key; in arrays, expect value
        }
        // Match whitespace (preserve formatting)
        else if (/\s/.test(text[i])) {
          elements.push(text[i]);
          i++;
        }
        // Everything else
        else {
          elements.push(text[i]);
          i++;
        }
      }

      return elements;
    };

    return highlight(json);
  }, [json]);

  if (!highlightedJson) return null;

  return <pre className={`json-highlight ${className}`}>{highlightedJson}</pre>;
}
